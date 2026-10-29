import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, X, ArrowRight, Info } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ponytail: Map menghindari akses objek berkunci variabel (object
// injection Codacy) sekaligus hilangkan lookup ganda per item
const partitionBySubGroup = (items) => {
  const subs = [];
  const byTitle = new Map();
  items.forEach((item) => {
    const gTitle = item.group || "";
    if (!byTitle.has(gTitle)) {
      const group = { title: gTitle, items: [] };
      byTitle.set(gTitle, group);
      subs.push(group);
    }
    byTitle.get(gTitle).items.push(item);
  });
  return subs;
};

const NavigationModal = ({ open, onOpenChange, categories = [], onNavigate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const itemRefs = useRef(new Map());
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const flatItems = useMemo(() => {
    const items = [];
    categories.forEach((cat) => {
      cat.sections?.forEach((section) => {
        section.items?.forEach((item) => {
          items.push({
            ...item,
            categoryTitle: cat.title,
            categoryI18nKey: cat.i18nKey,
            sectionTitle: section.title,
            sectionI18nKey: section.i18nKey,
            sectionSetupHint: section.setupHint
          });
        });
      });
    });
    return items;
  }, [categories]);

  const filtered = useMemo(() => {
    if (!query.trim()) return flatItems;
    const q = query.toLowerCase();
    return flatItems.filter((item) => {
      const label = (t(item.i18nKey) || item.title).toLowerCase();
      return label.includes(q) || item.href?.toLowerCase().includes(q);
    });
  }, [query, flatItems, t]);

  const groupedFiltered = useMemo(() => {
    // ponytail: Map menghindari object injection (Codacy)
    const map = new Map();
    filtered.forEach((item) => {
      const key = item.sectionTitle;
      if (!map.has(key)) {
        map.set(key, {
          title: item.sectionTitle,
          i18nKey: item.sectionI18nKey,
          categoryTitle: item.categoryTitle,
          categoryI18nKey: item.categoryI18nKey,
          sectionSetupHint: item.sectionSetupHint,
          items: []
        });
      }
      map.get(key).items.push(item);
    });
    return [...map.values()];
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (href) => {
      if (!href) return;
      navigate(href);
      onOpenChange(false);
      onNavigate?.();
    },
    [navigate, onOpenChange, onNavigate]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const selected = filtered.at(selectedIndex);
        if (selected) handleSelect(selected.href);
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [filtered, selectedIndex, handleSelect, onOpenChange]
  );

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [open, onOpenChange]);

  const isActive = (href) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  let globalIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        withX={false}
        className="sm:max-w-none w-[80vw] h-[80vh] p-0 gap-0 overflow-hidden border border-border/50 shadow-2xl">
        {/* Search Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Search size={20} className="text-primary" />
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none focus:ring-0 text-base text-foreground placeholder:text-muted-foreground/50 outline-none"
            placeholder={t("commandPalette.placeholder") || "Cari menu..."}
          />
          {query && (
            <button
              type="button"
              aria-label={t("common.clear")}
              onClick={() => setQuery("")}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground bg-background rounded-lg border border-border/50">
            ESC
          </kbd>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {groupedFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Search size={28} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("commandPalette.notFound", { query }) || `Menu "${query}" tidak ditemukan`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedFiltered.map((group) => {
                const subGroups = partitionBySubGroup(group.items);
                return (
                  <div key={group.title}>
                    {/* Setup Hint Banner */}
                    {!query && group.sectionSetupHint && (
                      <div className="mx-2 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Info size={14} className="text-primary" />
                          <span className="text-xs font-semibold text-primary">
                            {group.sectionSetupHint.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {group.sectionSetupHint.steps.map((step, i) => (
                            <span
                              key={i}
                              className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                                {i + 1}
                              </span>
                              <span className="font-medium">{step.label}</span>
                              <span className="hidden sm:inline">— {step.desc}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section Header */}
                    <div className="flex items-center gap-3 px-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                        {t(group.i18nKey) || group.title}
                      </span>
                      <div className="flex-1 border-t border-border/30" />
                    </div>

                    {subGroups.map((sub) => (
                      <React.Fragment key={sub.title || "__all"}>
                        {sub.title && (
                          <div className="px-2 mt-4 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {sub.title}
                            </span>
                          </div>
                        )}

                        {/* Items Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {sub.items.map((item) => {
                            globalIndex++;
                            const idx = globalIndex;
                            const label = t(item.i18nKey) || item.title;
                            const active = isActive(item.href);
                            const isSelected = selectedIndex === idx;

                            return (
                              <button
                                type="button"
                                key={item.href}
                                ref={(el) => {
                                  itemRefs.current.set(idx, el);
                                }}
                                data-index={idx}
                                onClick={() => handleSelect(item.href)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={cn(
                                  "group relative flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200",
                                  active
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                    : isSelected
                                      ? "bg-accent text-foreground border border-border/50 shadow-sm"
                                      : "text-muted-foreground hover:bg-accent/50 border border-transparent"
                                )}>
                                <div
                                  className={cn(
                                    "flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-all duration-200",
                                    active
                                      ? "bg-primary/15 text-primary"
                                      : isSelected
                                        ? "bg-background text-foreground shadow-sm"
                                        : "bg-muted/50 text-muted-foreground group-hover:bg-background group-hover:text-foreground"
                                  )}>
                                  {item.icon && <item.icon size={22} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate block">
                                    {label}
                                  </span>
                                </div>
                                <ArrowRight
                                  size={14}
                                  className={cn(
                                    "shrink-0 transition-all duration-200",
                                    active
                                      ? "text-primary opacity-100"
                                      : isSelected
                                        ? "text-muted-foreground opacity-100"
                                        : "text-muted-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                                  )}
                                />
                                {active && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 font-mono bg-background rounded border border-border/50">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 font-mono bg-background rounded border border-border/50">
                ↓
              </kbd>
              navigasi
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 font-mono bg-background rounded border border-border/50">
                ↵
              </kbd>
              pilih
            </span>
          </div>
          <span>
            {filtered.length} {t("component.navigationModal.ui.menusAvailable")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NavigationModal;

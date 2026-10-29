import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sidebarMenuSuperAdmin,
  sidebarMenuAdmin,
  sidebarMenuCashier,
  sidebarMenuUser
} from "@/utils/sidebar-menu";
import { filterMenuByPermission } from "@/utils/permission";
import { buildPaletteGroups, filterPaletteGroups } from "@/utils/command-palette";
import { isAdminRole, isCashierRole, isSuperAdminRole } from "@/utils/role";
import { useUserSession } from "@/hooks/useUserSession";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

const CommandPalette = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserSession();
  const inputRef = useRef(null);
  const itemRefs = useRef(new Map());
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useBodyScrollLock(open);

  const groups = useMemo(() => {
    const hasAccessMenu =
      user?.accessMenu && Array.isArray(user.accessMenu) && user.accessMenu.length > 0;

    let baseMenu;
    if (hasAccessMenu || isSuperAdminRole(user)) baseMenu = sidebarMenuSuperAdmin;
    else if (isAdminRole(user)) baseMenu = sidebarMenuAdmin;
    else if (isCashierRole(user)) baseMenu = sidebarMenuCashier;
    else baseMenu = sidebarMenuUser;

    return buildPaletteGroups(filterMenuByPermission(baseMenu, user), t);
  }, [user, t]);

  const filteredGroups = useMemo(() => filterPaletteGroups(groups, query), [groups, query]);

  const flatItems = useMemo(() => filteredGroups.flatMap((g) => g.items), [filteredGroups]);

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
    itemRefs.current.get(selectedIndex)?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const item = flatItems.at(selectedIndex);
      if (item) handleSelect(item.path);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [open, onClose]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[90vw] h-[90vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
            placeholder={t("commandPalette.placeholder")}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono text-muted-foreground bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("commandPalette.notFound", { query })}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id}>
                <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-y border-border/50">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const i = runningIndex;
                  const Icon = item.icon;
                  const selected = i === selectedIndex;
                  return (
                    <button
                      type="button"
                      key={item.path}
                      ref={(el) => {
                        itemRefs.current.set(i, el);
                      }}
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors",
                        selected
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-accent"
                      )}>
                      {Icon ? (
                        <Icon size={15} className="shrink-0" />
                      ) : (
                        <ArrowRight size={14} className="shrink-0" />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] hidden sm:inline">
                        {item.path}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

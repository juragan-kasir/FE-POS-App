import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/badge";
import guideData from "./guideData";

const actionConfig = {
  view: {
    icon: Eye,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    labelKey: "guide.action.view"
  },
  add: {
    icon: Plus,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    labelKey: "guide.action.add"
  },
  edit: {
    icon: Pencil,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    labelKey: "guide.action.edit"
  },
  delete: {
    icon: Trash2,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    labelKey: "guide.action.delete"
  },
  import: {
    icon: Download,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    labelKey: "guide.action.import"
  },
  export: {
    icon: Upload,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    labelKey: "guide.action.export"
  },
  approve: {
    icon: CheckCircle2,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    labelKey: "guide.action.approve"
  },
  "edit-access": {
    icon: ShieldCheck,
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    labelKey: "guide.action.editAccess"
  },
  "update-status": {
    icon: RefreshCw,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    labelKey: "guide.action.updateStatus"
  }
};

const GuidePanel = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(() => guideData.map((c) => c.id));

  const toggleCategory = (id) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return guideData;
    const q = search.toLowerCase();
    return guideData
      .map((category) => ({
        ...category,
        pages: category.pages.filter(
          (page) =>
            t(page.titleKey).toLowerCase().includes(q) ||
            t(page.descKey).toLowerCase().includes(q) ||
            page.path.toLowerCase().includes(q) ||
            t(`translation:${page.titleKey}`).toLowerCase().includes(q) ||
            t(`translation:${page.descKey}`).toLowerCase().includes(q)
        )
      }))
      .filter((category) => category.pages.length > 0);
  }, [search, t]);

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70] w-[420px] sm:w-[480px] md:w-[540px]">
      <Card className="shadow-2xl border border-primary/20 overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
          <div>
            <h2 className="font-semibold text-lg text-foreground">{t("guide.panel.title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("guide.panel.subtitle")}</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b">
          <SearchInput value={search} onChange={setSearch} placeholder={t("guide.panel.search")} />
        </div>

        {/* Categories */}
        <div className="max-h-[420px] overflow-y-auto">
          <div className="px-3 py-2 space-y-1">
            {filteredData.map((category) => {
              const isExpanded = expandedCategories.includes(category.id);
              const CatIcon = category.icon;

              return (
                <div key={category.id} className="rounded-lg overflow-hidden">
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <CatIcon size={16} />
                    </div>
                    <span className="flex-1 text-left">{t(category.titleKey)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {category.pages.length}
                    </span>
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {/* Pages list */}
                  {isExpanded && (
                    <div className="overflow-hidden">
                      <div className="pl-11 pr-3 pb-2 space-y-1">
                        {category.pages.map((page) => {
                          const PageIcon = page.icon;
                          return (
                            <button
                              type="button"
                              key={page.path}
                              onClick={() => handleNavigate(page.path)}
                              className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left group">
                              <div className="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5">
                                <PageIcon size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-foreground">
                                    {t(page.titleKey)}
                                  </span>
                                  <ExternalLink
                                    size={12}
                                    className="text-muted-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity shrink-0"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {t(page.descKey)}
                                </p>
                                {page.actions && page.actions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {page.actions.map((action) => {
                                      const config = safeGet(actionConfig, action);
                                      if (!config) return null;
                                      const ActionIcon = config.icon;
                                      return (
                                        <Badge
                                          key={action}
                                          variant="secondary"
                                          className={`text-xs px-1.5 py-0 h-4 gap-0.5 font-normal ${config.color}`}>
                                          <ActionIcon size={10} />
                                          <span>{t(config.labelKey)}</span>
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="text-muted-foreground mb-3" size={32} />
                <p className="text-sm text-muted-foreground">{t("guide.panel.noResults")}</p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-sm text-primary hover:underline mt-1">
                  {t("guide.panel.clearSearch")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("guide.panel.totalPages", {
              count: guideData.reduce((sum, c) => sum + c.pages.length, 0)
            })}
          </span>
          <span className="text-xs text-muted-foreground">{t("guide.panel.clickToNavigate")}</span>
        </div>
      </Card>
    </div>
  );
};

export default GuidePanel;

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, CheckSquare, SearchX } from "lucide-react";
import { safeGet } from "@/lib/safe-lookup";
import { SearchInput } from "@/components/ui/SearchInput";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import {
  actionLabelKeys,
  countGranted,
  filterGroups,
  getVisibleActions,
  isAllSelected
} from "../rolePermissions";

const actionColors = {
  view: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  add: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
  edit: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
  delete: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  import: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
  export: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
  approve: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30",
  print: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
  "edit-points": "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30",
  "edit-access": "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30",
  "reset-password": "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30",
  "update-status": "text-lime-600 dark:text-lime-400 bg-lime-50 dark:bg-lime-950/30"
};

// The role editor's menu × action matrix, with a menu search. "Select all"
// always applies to every menu, not only the filtered ones.
const PermissionMatrix = ({ groups, permissions, onToggle, onSelectAll, footerNote }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const visibleGroups = useMemo(() => filterGroups(groups, query), [groups, query]);
  const granted = countGranted(permissions);
  const actionLabel = (action) => t(safeGet(actionLabelKeys, action)) || action;

  const toggleGroup = (title) =>
    setCollapsedGroups((prev) => ({ ...prev, [title]: !safeGet(prev, title, false) }));

  return (
    <div
      data-tour="role-permissions-matrix"
      className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border flex flex-col gap-4 bg-muted/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-primary" aria-hidden="true" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.role.detail.matrixTitle")}
            </h3>
            <span
              className="text-xs font-medium text-muted-foreground tabular-nums"
              aria-live="polite">
              {t("page.role.matrix.grantedCount", { count: granted })}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={isAllSelected(permissions)}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-muted-foreground/40 bg-white dark:bg-background accent-primary cursor-pointer"
            />
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
              {t("page.role.edit.selectAll")}
            </span>
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("page.role.matrix.searchLabel")}
          </label>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("page.role.matrix.searchPlaceholder")}
            className="w-full md:w-80"
          />
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <SearchX size={28} className="text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{t("page.role.matrix.noMatch")}</p>
          <p className="text-xs text-muted-foreground">{t("page.role.matrix.noMatchHint")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visibleGroups.map((group, idx) => {
            const groupKey = group.parentTitle || `single-${idx}`;
            const visibleActions = getVisibleActions(
              group.items.reduce((acc, item) => {
                (item.actions || []).forEach((a) => {
                  if (!acc.includes(a)) acc.push(a);
                });
                return acc;
              }, [])
            );
            // A search always shows matching rows, even in a collapsed group.
            const isCollapsed = !query && safeGet(collapsedGroups, groupKey, false);

            return (
              <div key={groupKey}>
                {group.parentTitle && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    aria-expanded={!isCollapsed}
                    className="w-full flex items-center gap-2 px-6 py-3 bg-muted/10 hover:bg-muted/20 transition-colors text-left cursor-pointer">
                    {isCollapsed ? (
                      <ChevronRight size={16} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={16} aria-hidden="true" />
                    )}
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {group.parentTitle}
                    </span>
                  </button>
                )}
                {!isCollapsed && (
                  <HorizontalScrollArea>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/10">
                          <th className="px-6 py-3 text-xs font-bold text-foreground uppercase tracking-wider w-56 bg-muted">
                            {t("page.role.detail.menuColumn")}
                          </th>
                          {visibleActions.map((action) => (
                            <th
                              key={action}
                              className={`px-2 py-3 text-xs font-semibold uppercase tracking-wider text-center min-w-[60px] ${safeGet(actionColors, action, "text-muted-foreground")}`}>
                              {actionLabel(action)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.items.map((item) => {
                          const itemActions = getVisibleActions(item.actions || []);
                          return (
                            <tr key={item.href} className="hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  {item.icon && (
                                    <item.icon
                                      size={16}
                                      className="text-muted-foreground shrink-0"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="text-sm text-foreground">{item.title}</span>
                                </div>
                              </td>
                              {itemActions.map((action) => {
                                const val = safeGet(safeGet(permissions, item.href), action);
                                return (
                                  <td key={action} className="px-2 py-3 text-center">
                                    {val === null || val === undefined ? (
                                      <span className="text-muted-foreground/30" aria-hidden="true">
                                        —
                                      </span>
                                    ) : (
                                      <input
                                        type="checkbox"
                                        checked={!!val}
                                        onChange={() => onToggle(item.href, action)}
                                        aria-label={`${item.title} — ${actionLabel(action)}`}
                                        className="w-4 h-4 rounded border-2 border-muted-foreground/40 bg-white dark:bg-background accent-primary cursor-pointer"
                                      />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                )}
              </div>
            );
          })}
        </div>
      )}

      {footerNote && (
        <div className="p-4 bg-muted/20 text-right border-t border-border">
          <p className="text-xs text-muted-foreground italic">{footerNote}</p>
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;

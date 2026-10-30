/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sidebarMenuSuperAdmin } from "@/utils/sidebar-menu";
import { buildAccessMenuPayload, parseAccessMenuToPermissions } from "@/utils/permission";
import { safeGet } from "@/lib/safe-lookup";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const allActions = [
  "view",
  "add",
  "edit",
  "delete",
  "import",
  "export",
  "approve",
  "print",
  "edit-points",
  "edit-access",
  "reset-password",
  "update-status"
];

const actionLabels = {
  view: "Lihat",
  add: "Tambah",
  edit: "Ubah",
  delete: "Hapus",
  import: "Import",
  export: "Ekspor",
  approve: "Setujui",
  print: "Cetak",
  "edit-points": "Edit Poin",
  "edit-access": "Edit Akses",
  "reset-password": "Reset Password",
  "update-status": "Update Status"
};

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

const collectLeaves = (items, depth = 0) => {
  const leaves = [];
  for (const item of items) {
    if (item.href && !item.href.startsWith("#")) {
      leaves.push(item);
    }
    if (item.children && item.children.length > 0) {
      leaves.push(...collectLeaves(item.children, depth + 1));
    }
  }
  return leaves;
};

const getLeafItemsGrouped = () => {
  const groups = [];
  sidebarMenuSuperAdmin.forEach((parent) => {
    if (parent.href && (!parent.children || parent.children.length === 0)) {
      groups.push({
        parentTitle: "",
        parentIcon: null,
        subGroups: [{ title: "", items: [parent] }]
      });
    } else if (parent.children && parent.children.length > 0) {
      const leafChildren = collectLeaves(parent.children);
      if (leafChildren.length > 0) {
        const subGroups = [];
        // ponytail: Map menghindari object injection (Codacy)
        const byTitle = new Map();
        leafChildren.forEach((item) => {
          const gTitle = item.group || "";
          if (!byTitle.has(gTitle)) {
            const group = { title: gTitle, items: [] };
            byTitle.set(gTitle, group);
            subGroups.push(group);
          }
          byTitle.get(gTitle).items.push(item);
        });
        groups.push({ parentTitle: parent.title, parentIcon: parent.icon, subGroups });
      }
    }
  });
  return groups;
};

const buildInitialPermissions = (groups, existingPerms = {}) => {
  // ponytail: kumpulkan entri lalu fromEntries — tanpa penulisan berkunci variabel
  const entries = [];
  groups.forEach((g) => {
    g.subGroups.forEach((sg) => {
      sg.items.forEach((item) => {
        entries.push([
          item.href,
          Object.fromEntries(
            allActions.map((a) => [
              a,
              item.actions?.includes(a)
                ? (safeGet(safeGet(existingPerms, item.href), a) ?? false)
                : null
            ])
          )
        ]);
      });
    });
  });
  return Object.fromEntries(entries);
};

export default function AccessMenuModal({
  open,
  onOpenChange,
  value = "",
  roleAccessMenu,
  onSave
}) {
  const { t } = useTranslation();
  const groups = useMemo(() => getLeafItemsGrouped(), []);
  const [collapsed, setCollapsed] = useState({});

  const initPerms = useCallback(() => {
    // ponytail: rebuild literal + safeGet() — tanpa penulisan objek berkunci
    // variabel (object injection Codacy), data menu berasal dari API
    let rolePerms = {};
    const raw = roleAccessMenu || {};
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        const menu = item.menu;
        if (!menu) return;
        let actions = {};
        allActions.forEach((a) => {
          if (safeGet(item, a) !== undefined) actions = { ...actions, [a]: safeGet(item, a) };
        });
        rolePerms = { ...rolePerms, [menu]: actions };
      });
    } else {
      Object.entries(raw).forEach(([menu, actionList]) => {
        if (Array.isArray(actionList)) {
          let map = {};
          allActions.forEach((a) => {
            map = { ...map, [a]: actionList.includes(a) };
          });
          rolePerms = { ...rolePerms, [menu]: map };
        }
      });
    }
    let employeePerms = {};
    try {
      const parsed = value ? JSON.parse(value) : [];
      employeePerms = Array.isArray(parsed) ? parseAccessMenuToPermissions(parsed) : {};
    } catch (e) {}
    let merged = { ...rolePerms };
    Object.keys(employeePerms).forEach((menu) => {
      merged = { ...merged, [menu]: { ...safeGet(merged, menu), ...safeGet(employeePerms, menu) } };
    });
    return buildInitialPermissions(groups, merged);
  }, [value, roleAccessMenu, groups]);

  const [permissions, setPermissions] = useState(initPerms);

  useEffect(() => {
    setPermissions(initPerms());
  }, [initPerms]);

  const togglePermission = (href, action) => {
    setPermissions((prev) => {
      const current = safeGet(safeGet(prev, href), action);
      if (current === null) return prev;
      return { ...prev, [href]: { ...safeGet(prev, href), [action]: !current } };
    });
  };

  const isAllSelected = () =>
    Object.values(permissions).every((p) =>
      Object.entries(p).every(([, val]) => val === null || val === true)
    );

  const selectAll = (checked) => {
    // ponytail: rebuild literal via reduce — bebas object injection
    const updated = Object.keys(permissions).reduce((acc, key) => {
      const actions = safeGet(permissions, key) ?? {};
      const nextActions = Object.keys(actions).reduce(
        (inner, action) => ({
          ...inner,
          [action]: safeGet(actions, action) === null ? null : checked
        }),
        {}
      );
      return { ...acc, [key]: nextActions };
    }, {});
    setPermissions(updated);
  };

  const [saving, setSaving] = useState(false);

  const getVisibleActions = (itemActions) => allActions.filter((a) => itemActions?.includes(a));

  const handleSave = () => {
    setSaving(true);
    const payload = buildAccessMenuPayload(permissions);
    onSave(JSON.stringify(payload));
    setTimeout(() => {
      setSaving(false);
      onOpenChange(false);
    }, 300);
  };

  const toggleGroup = (idx) => {
    setCollapsed((prev) => ({ ...prev, [idx]: !safeGet(prev, idx, false) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("accessMenu.additionalAccess")}</DialogTitle>
          <DialogDescription>{t("accessMenu.additionalAccessDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <p className="text-xs text-muted-foreground">
            {t("component.accessMenuModal.ui.tickTheActionsToGrant")}
          </p>
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={isAllSelected()}
              onChange={(e) => selectAll(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
              {t("page.role.edit.selectAll")}
            </span>
          </label>
        </div>

        <div className="divide-y divide-border border rounded-lg">
          {groups.map((group, idx) => {
            const visibleActions = getVisibleActions(
              group.subGroups
                .flatMap((sg) => sg.items)
                .reduce((acc, item) => {
                  (item.actions || []).forEach((a) => {
                    if (!acc.includes(a)) acc.push(a);
                  });
                  return acc;
                }, [])
            );
            const isCollapsed = safeGet(collapsed, idx, false);

            return (
              <div key={idx}>
                {group.parentTitle && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(idx)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/10 hover:bg-muted/20 transition-colors text-left">
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
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
                          <th className="px-4 py-2 text-xs font-bold text-foreground uppercase tracking-wider w-48 bg-slate-100 dark:bg-slate-800">
                            {t("page.cashier.menu")}
                          </th>
                          {visibleActions.map((action) => (
                            <th
                              key={action}
                              className={`px-2 py-2 text-xs font-semibold uppercase tracking-wider text-center min-w-[60px] ${safeGet(actionColors, action, "text-muted-foreground")}`}>
                              {safeGet(actionLabels, action) || action}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.subGroups.map((sub, subIdx) => (
                          <React.Fragment key={subIdx}>
                            {sub.title && (
                              <tr className="bg-muted/20">
                                <td colSpan={visibleActions.length + 1} className="px-4 py-1.5">
                                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    {sub.title}
                                  </span>
                                </td>
                              </tr>
                            )}
                            {sub.items.map((item) => {
                              const itemActions = getVisibleActions(item.actions || []);
                              return (
                                <tr key={item.href} className="hover:bg-muted/10 transition-colors">
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      {item.icon && (
                                        <item.icon
                                          size={14}
                                          className="text-muted-foreground shrink-0"
                                        />
                                      )}
                                      <span className="text-sm text-foreground">{item.title}</span>
                                    </div>
                                  </td>
                                  {itemActions.map((action) => {
                                    const val = safeGet(safeGet(permissions, item.href), action);
                                    const isDisabled = val === null;
                                    return (
                                      <td key={action} className="px-2 py-2.5 text-center">
                                        {isDisabled ? (
                                          <span className="text-muted-foreground/30">—</span>
                                        ) : (
                                          <input
                                            type="checkbox"
                                            checked={!!val}
                                            onChange={() => togglePermission(item.href, action)}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                          />
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="success" type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {t("component.accessMenuModal.ui.savePermissions")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

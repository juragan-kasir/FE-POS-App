import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { ChevronDown, ChevronRight, Shield, Edit3, CheckSquare } from "lucide-react";
import { getRoleById } from "@/services/role";
import { sidebarMenuSuperAdmin } from "@/utils/sidebar-menu";
import {
  parseAccessMenuToPermissions,
  findMenuPermission,
  normalizePermissionActions
} from "@/utils/permission";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

// ponytail: action labels map to translation keys. Add new actions here and in id.json/en.json.
const actionLabelKeys = {
  view: "page.role.action.view",
  add: "page.role.action.add",
  edit: "page.role.action.edit",
  delete: "page.role.action.delete",
  import: "page.role.action.import",
  export: "page.role.action.export",
  approve: "page.role.action.approve",
  print: "page.role.action.print",
  "edit-points": "page.role.action.editPoints",
  "edit-access": "page.role.action.editAccess",
  "reset-password": "page.role.action.resetPassword",
  "update-status": "page.role.action.updateStatus"
};

const allActionTypes = [
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

const getLeafItemsGrouped = () => {
  const groups = [];
  sidebarMenuSuperAdmin.forEach((parent) => {
    if (parent.href && (!parent.children || parent.children.length === 0)) {
      groups.push({ parentTitle: "", parentIcon: null, items: [parent] });
    } else if (parent.children && parent.children.length > 0) {
      const leafChildren = parent.children.filter((c) => c.href && !c.href.startsWith("#"));
      if (leafChildren.length > 0) {
        groups.push({
          parentTitle: parent.title,
          parentIcon: parent.icon,
          items: leafChildren
        });
      }
    }
  });
  return groups;
};

const DetailRole = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const groups = useMemo(() => getLeafItemsGrouped(), []);

  const {
    data: roleData,
    isLoading,
    isError,
    refetch
  } = useQuery(["role-by-id", id], () => getRoleById(id), {
    enabled: !!id
  });

  const role = roleData?.data || roleData;
  const permissions = useMemo(() => {
    if (!role?.accessMenu) return {};
    return parseAccessMenuToPermissions(role.accessMenu);
  }, [role]);

  const getVisibleActions = (itemActions) => {
    return allActionTypes.filter((a) => itemActions?.includes(a));
  };

  const toggleGroup = (idx) => {
    setCollapsedGroups((prev) => ({ ...prev, [idx]: !safeGet(prev, idx, false) }));
  };

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-36" />
                </div>
              </div>
              <div className="divide-y divide-border">
                {[0, 1, 2].map((g) => (
                  <div key={g}>
                    <div className="px-6 py-3 bg-muted/10">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <div className="overflow-x-auto p-6">
                      <div className="space-y-3">
                        {[0, 1, 2].map((r) => (
                          <div key={r} className="flex items-center gap-4">
                            <Skeleton className="h-5 w-48" />
                            {[0, 1, 2, 3].map((c) => (
                              <Skeleton key={c} className="h-5 w-8" />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-muted/20 border-t border-border">
                <Skeleton className="h-3 w-64 ml-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="text-center py-16">
        <Shield size={48} className="mx-auto mb-4 text-muted-foreground/40" />
        <p className="text-muted-foreground">{t("page.role.detail.notFound")}</p>
        <Button variant="danger" onClick={() => navigate("/role-management")} className="mt-4">
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.role.detail.breadcrumbParent"),
            href: "/role-management",
            i18nKey: "page.role.detail.breadcrumbParent"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={role.name || "-"}
        description={t("page.role.detail.description")}
        backLink="/role-management"
        dynamicInfo={false}>
        <Button variant="outline" onClick={() => navigate(`/edit-role/${id}`)}>
          <Edit3 size={14} className="mr-1.5" />
          {t("common.edit")}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                {t("page.role.detail.infoTitle")}
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.role.detail.nameLabel")}
                </p>
                <p className="text-sm font-medium text-foreground mt-1">{role.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.role.detail.descLabel")}
                </p>
                <p className="text-sm text-foreground mt-1">{role.description || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.role.detail.typeLabel")}
                </p>
                <p className="mt-1">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      role.roleType === "super_admin"
                        ? "bg-red-100 text-red-700"
                        : role.roleType === "admin"
                          ? "bg-blue-100 text-blue-700"
                          : role.roleType === "kasir"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-muted text-muted-foreground"
                    }`}>
                    {role.roleType}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("common.status")}
                </p>
                <p className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      role.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${role.status === "active" ? "bg-green-700" : "bg-red-700"}`}
                    />
                    {role.status === "active" ? t("common.active") : t("common.inactive")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  {t("page.role.detail.matrixTitle")}
                </h3>
              </div>
            </div>

            <div className="divide-y divide-border">
              {groups.map((group, idx) => {
                const visibleActions = getVisibleActions(
                  group.items.reduce((acc, item) => {
                    (item.actions || []).forEach((a) => {
                      if (!acc.includes(a)) acc.push(a);
                    });
                    return acc;
                  }, [])
                );
                const isCollapsed = safeGet(collapsedGroups, idx, false);

                return (
                  <div key={idx}>
                    {group.parentTitle && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(idx)}
                        className="w-full flex items-center gap-2 px-6 py-3 bg-muted/10 hover:bg-muted/20 transition-colors text-left">
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
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
                              <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-56">
                                {t("page.role.detail.menuColumn")}
                              </th>
                              {visibleActions.map((action) => (
                                <th
                                  key={action}
                                  className="px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center min-w-[60px]">
                                  {t(safeGet(actionLabelKeys, action)) || action}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {group.items.map((item) => {
                              const itemActions = getVisibleActions(item.actions || []);
                              const perm =
                                normalizePermissionActions(
                                  findMenuPermission(permissions, item.href)
                                ) || {};
                              return (
                                <tr key={item.href} className="hover:bg-muted/10 transition-colors">
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                      {item.icon && (
                                        <item.icon
                                          size={16}
                                          className="text-muted-foreground shrink-0"
                                        />
                                      )}
                                      <span className="text-sm text-foreground">{item.title}</span>
                                    </div>
                                  </td>
                                  {itemActions.map((action) => {
                                    const isSuperAdmin = role?.roleType === "super_admin";
                                    const val = isSuperAdmin ? true : safeGet(perm, action);
                                    const isDisabled =
                                      !isSuperAdmin && (val === undefined || val === null);
                                    return (
                                      <td key={action} className="px-2 py-3 text-center">
                                        {isDisabled ? (
                                          <span className="text-muted-foreground/30 text-xs">
                                            —
                                          </span>
                                        ) : val ? (
                                          <span className="text-green-600 text-lg font-bold">
                                            ✓
                                          </span>
                                        ) : (
                                          <span className="text-red-400 text-lg">✗</span>
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

            <div className="p-4 bg-muted/20 text-right border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                {t("page.role.detail.footerNote")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailRole;

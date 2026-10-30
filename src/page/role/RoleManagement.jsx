import React, { useState } from "react";
import { usePageParam, useSearchParam } from "@/hooks/usePageParam";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Shield,
  CheckCircle,
  FileEdit,
  XCircle,
  Lock,
  Users
} from "lucide-react";
import { getAllRoleTable, deleteRole } from "@/services/role";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { SearchInput } from "@/components/ui/SearchInput";
import { Combobox } from "@/components/ui/combobox";
import TableActions from "@/components/ui/TableActions";
import Modal from "@/components/organism/modal";
import { useTranslation } from "react-i18next";
import { canAccess } from "@/utils/permission";
import PageHeader from "@/components/ui/PageHeader";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import NoStore from "@/components/ui/NoStore";
import { roleTypeLabelKey } from "./rolePermissions";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const RoleManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  // D2 (BA DR-12 Q14): built-in roles are changed by the global super admin only.
  const isGlobalSuperAdmin = isSuperAdmin && (user?.store == null || user?.store === "");
  const MENU_KEY = "/role-management";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useSearchParam();
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const PROTECTED_ROLE_NAMES = ["Super Admin", "Admin", "User", "Kasir"];

  // isSystem is the server's flag (delete is refused for it); the legacy
  // name list keeps the default roles marked on older data.
  const isProtected = (role) => {
    return !!role.isSystem || PROTECTED_ROLE_NAMES.includes(role.name || "");
  };

  const storeNameById = new Map((locData?.data || []).map((loc) => [Number(loc.id), loc.name]));
  const scopeLabel = (role) =>
    role.store == null
      ? t("page.role.scope.global")
      : t("page.role.scope.store", {
          name: storeNameById.get(Number(role.store)) || `#${role.store}`
        });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["roles-table", page, limit, search, statusFilter],
    () =>
      getAllRoleTable({
        page,
        limit,
        search: search || undefined,
        statusRole: statusFilter
      }),
    { keepPreviousData: true }
  );

  const isFiltered = search !== "" || statusFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const roles = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const stats = data?.stats || {};
  const activeCount = stats.active ?? roles.filter((r) => r.status === "active").length;
  const draftCount = stats.draft ?? roles.filter((r) => r.status === "draft").length;
  const inactiveCount = stats.inactive ?? roles.filter((r) => r.status === "inactive").length;

  const deleteMutation = useMutation(deleteRole, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.globalSetting.roleManagement.toast.deleteSuccess")
      });
      queryClient.invalidateQueries(["roles-table"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  return (
    <div data-tour="page-roles" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.management") }
        ]}
        title={t("page.globalSetting.roleManagement.title")}
        description={t("page.globalSetting.roleManagement.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button variant="success" data-tour="role-add" onClick={() => navigate("/add-role")}>
            <Plus size={18} className="mr-1" />
            {t("page.globalSetting.roleManagement.button.add")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-4 w-4 rounded" />
                      </div>
                      <Skeleton className="h-8 w-28 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label={t("page.globalSetting.roleManagement.stats.total")}
                    value={stats.total ?? total}
                    icon={Shield}
                    variant="default"
                  />
                  <StatCard
                    label={t("page.globalSetting.roleManagement.stats.active")}
                    value={activeCount}
                    icon={CheckCircle}
                    variant="active"
                  />
                  <StatCard
                    label={t("common.draft")}
                    value={draftCount}
                    icon={FileEdit}
                    variant="draft"
                  />
                  <StatCard
                    label={t("page.globalSetting.roleManagement.stats.inactive")}
                    value={inactiveCount}
                    icon={XCircle}
                    variant="red"
                  />
                </div>
              )}
              <div data-tour="role-table">
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.globalSetting.roleManagement.button.add"),
                          onClick: () => navigate("/add-role")
                        }
                      : undefined
                  }
                  columns={[
                    {
                      header: t("page.globalSetting.roleManagement.table.name"),
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-primary" aria-hidden="true" />
                          <span className="text-sm font-semibold text-foreground">{row.name}</span>
                          {isProtected(row) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                              <Lock size={10} aria-hidden="true" />
                              {row.isSystem ? t("page.role.badge.system") : t("common.default")}
                            </span>
                          )}
                        </div>
                      )
                    },
                    {
                      header: t("page.globalSetting.roleManagement.table.description"),
                      render: (row) => (
                        <span className="text-sm text-muted-foreground">
                          {row.description || "-"}
                        </span>
                      )
                    },
                    {
                      header: t("page.globalSetting.roleManagement.table.type"),
                      render: (row) => (
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                            row.roleType === "super_admin"
                              ? "bg-red-100 text-red-700"
                              : row.roleType === "admin"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-muted text-muted-foreground"
                          }`}>
                          {t(roleTypeLabelKey(row.roleType))}
                        </span>
                      )
                    },
                    {
                      header: t("page.role.scope.label"),
                      render: (row) => (
                        <span className="text-sm text-muted-foreground">{scopeLabel(row)}</span>
                      )
                    },
                    {
                      header: t("page.globalSetting.roleManagement.table.users"),
                      align: "right",
                      render: (row) => (
                        <span className="inline-flex items-center gap-1 text-sm tabular-nums text-foreground">
                          <Users size={14} className="text-muted-foreground" aria-hidden="true" />
                          {row.userCount ?? 0}
                        </span>
                      )
                    },
                    {
                      header: t("common.status"),
                      render: (row) => (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            row.status === "active"
                              ? "bg-green-100 text-green-700"
                              : row.status === "draft"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.status === "active"
                                ? "bg-green-700"
                                : row.status === "draft"
                                  ? "bg-amber-700"
                                  : "bg-red-700"
                            }`}
                          />
                          {row.status === "active"
                            ? t("common.active")
                            : row.status === "draft"
                              ? t("common.draft")
                              : t("common.inactive")}
                        </span>
                      )
                    },
                    {
                      header: t("common.createdBy"),
                      render: (row) => (
                        <span className="text-sm text-muted-foreground">
                          {row.createdByUser?.fullName ||
                            row.createdByUser?.userName ||
                            (isProtected(row) ? t("common.system") : "-")}
                        </span>
                      )
                    },
                    {
                      header: t("common.modifiedBy"),
                      render: (row) => (
                        <span className="text-sm text-muted-foreground">
                          {row.modifiedByUser?.fullName ||
                            row.modifiedByUser?.userName ||
                            (isProtected(row) ? t("common.system") : "-")}
                        </span>
                      )
                    },
                    {
                      header: t("common.createdAt"),
                      render: (row) => (
                        <span className="text-sm font-mono text-muted-foreground">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleDateString(dateLocale(), {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "-"}
                        </span>
                      )
                    },
                    {
                      header: t("common.updatedAt"),
                      render: (row) => (
                        <span className="text-sm font-mono text-muted-foreground">
                          {row.updatedAt
                            ? new Date(row.updatedAt).toLocaleDateString(dateLocale(), {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "-"}
                        </span>
                      )
                    },
                    {
                      header: t("page.globalSetting.roleManagement.table.actions"),
                      align: "right",
                      stickyRight: true,
                      legend: [
                        { icon: Eye, label: t("common.view") },
                        { icon: Edit, label: t("common.edit") },
                        { icon: Trash2, label: t("common.delete") }
                      ],
                      render: (row) => (
                        <TableActions
                          align="right"
                          items={[
                            {
                              label: t("page.globalSetting.roleManagement.tooltip.detail"),
                              icon: Eye,
                              onClick: () => navigate(`/detail-role/${row.id}`),
                              hidden: !canAccess(user, MENU_KEY, "view")
                            },
                            {
                              label: t("common.edit"),
                              icon: Edit,
                              onClick: () => navigate(`/edit-role/${row.id}`),
                              hidden:
                                !canAccess(user, MENU_KEY, "edit") ||
                                (row.isSystem && !isGlobalSuperAdmin)
                            },
                            {
                              label: t("common.delete"),
                              icon: Trash2,
                              danger: true,
                              onClick: () => setDeleteTarget(row),
                              hidden: !canAccess(user, MENU_KEY, "delete") || isProtected(row)
                            }
                          ]}
                        />
                      )
                    }
                  ]}
                  data={roles}
                  isLoading={isFetching}
                  emptyIcon={Shield}
                  emptyMessage={
                    isFiltered
                      ? t("page.role.list.noMatch")
                      : t("page.globalSetting.roleManagement.empty")
                  }
                  toolbar={
                    <TableToolbar
                      title={t("page.globalSetting.roleManagement.table.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="role-management-search"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.search")}
                        </label>
                        <SearchInput
                          id="role-management-search"
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                          }}
                          placeholder={t("page.globalSetting.roleManagement.search")}
                          isLoading={isFetching}
                          className="w-full md:w-60"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="role-management-status"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.status")}
                        </label>
                        <Combobox
                          id="role-management-status"
                          options={[
                            { value: "all", label: t("common.all") },
                            { value: "active", label: t("common.active") },
                            { value: "inactive", label: t("common.inactive") },
                            { value: "draft", label: t("common.draft") }
                          ]}
                          value={statusFilter}
                          onChange={(val) => {
                            setStatusFilter(val || "all");
                            setPage(1);
                          }}
                          placeholder={t("common.all")}
                          searchPlaceholder={t("common.all")}
                        />
                      </div>
                    </TableToolbar>
                  }
                  pagination={{
                    page,
                    totalPages,
                    total,
                    onPageChange: setPage,
                    pageSize: limit,
                    onPageSizeChange: (v) => {
                      setLimit(v);
                      setPage(1);
                    },
                    showingText: t("page.globalSetting.roleManagement.showing", {
                      count: roles.length,
                      total
                    })
                  }}
                />
              </div>
            </>
          )}
        </>
      )}
      {/* D4 (BA DR-12 Q5/Q6): a role still held by users is not deleted;
          the server answers 409 ROLE_IN_USE, so the page says so up front. */}
      <Modal
        type="error"
        open={!!deleteTarget && deleteTarget.userCount > 0}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.role.modal.inUseTitle")}
        description={t("page.role.modal.deleteInUse", {
          name: deleteTarget?.name || "",
          count: deleteTarget?.userCount || 0
        })}
        onConfirm={() => setDeleteTarget(null)}
      />
      <Modal
        type="confirm"
        open={!!deleteTarget && !(deleteTarget.userCount > 0)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.role.modal.deleteTitle")}
        description={t("page.role.modal.deleteDesc", { name: deleteTarget?.name || "" })}
        confirmText={t("page.role.modal.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default RoleManagement;

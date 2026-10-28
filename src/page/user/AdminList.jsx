import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { getAllUsers, changeUserStatus } from "@/services/user";
import ChangeUserStoreModal from "./ChangeUserStoreModal";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Loading } from "@/components/ui/loading";
import {
  Shield,
  CheckCircle,
  FileEdit,
  XCircle,
  ShieldCheck,
  UserPlus,
  Download,
  MapPin,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import Modal from "@/components/organism/modal";
import StatCard from "@/components/ui/StatCard";
import TableActionLegend from "@/components/ui/TableActionLegend";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";
import { toCsv, downloadCsv } from "@/lib/csv";
import { todayDateOnly } from "@/utils/dateOnly";

const getStatus = (user, t) => {
  const statusConfig = {
    active: {
      dot: "bg-green-500",
      bg: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
      label: t("common.active")
    },
    inactive: {
      dot: "bg-muted-foreground",
      bg: "bg-muted text-muted-foreground border border-border",
      label: t("common.inactive")
    },
    disabled: {
      dot: "bg-red-500",
      bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
      label: t("common.disabled") || "Disabled"
    },
    pending: {
      dot: "bg-amber-500",
      bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      label: t("common.pending")
    }
  };

  // AUTH-1: account enablement via disabledAt, presence via status
  // disabled account must not be confused with logged-out (inactive) account
  if (user.disabledAt) return statusConfig.disabled;
  if (user.deletedAt) return statusConfig.inactive;
  if (user.status === "pending" || user.status === "draft" || user.isActive === null) {
    // draft/pending is incomplete record, not yet enabled; treat as pending
    // if account not disabled, show pending
    return statusConfig.pending;
  }
  // isActive derived = !disabledAt && !deletedAt for backwards compat
  const isActive =
    user.isActive !== undefined ? user.isActive : !user.disabledAt && !user.deletedAt;
  if (user.status === "active" && isActive) return statusConfig.active;
  if (user.status === "active") return statusConfig.active;
  return statusConfig.inactive;
};

const roleColors = {
  super_admin:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
  admin:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  supervisor:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  manager: "bg-muted text-foreground text-xs font-medium"
};

const getRoleClass = (role) => {
  return roleColors[role?.toLowerCase()] || "bg-muted text-muted-foreground border border-border";
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const avatarBg = (name) => {
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const AdminList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const MENU_KEY = "/user-list";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const isFiltered = search !== "";

  const resetFilters = () => {
    setSearch("");
    setPage(1);
  };

  const [statusModal, setStatusModal] = useState(null);

  const statusMutation = useMutation(changeUserStatus, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.user.ui.userStatusChanged") });
      refetch();
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message || "Gagal mengubah status user"
      });
    }
  });

  const handleConfirmStatus = () => {
    if (!statusModal) return;
    statusMutation.mutate({ id: statusModal.id, status: statusModal.status });
    setStatusModal(null);
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["admins", page, limit, search],
    () => getAllUsers({ page, limit, search }),
    {}
  );

  // ponytail: GET /auth/get-all-user mengembalikan kolom model mentah
  // (fullName, userName, store = id) — nama toko di-resolve dari daftar lokasi.
  const { data: locData } = useLocations("all");
  const storeNameById = new Map((locData?.data || []).map((loc) => [Number(loc.id), loc.name]));
  const storeNameOf = (u) =>
    (u.store != null && storeNameById.get(Number(u.store))) || u.storeName || u.locationName || "";

  // Same "global" test as RoleManagement: only a super_admin without a store
  // may move users between stores (the BE refuses everyone else with 403).
  const isGlobalSuperAdmin =
    user?.roleType === "super_admin" && (user?.store == null || user?.store === "");
  const [storeTarget, setStoreTarget] = useState(null);
  const storeActions = (u) =>
    isGlobalSuperAdmin && u.roleType !== "super_admin"
      ? [
          {
            label: t("page.user.changeStore.action"),
            iconName: "store",
            onClick: () => setStoreTarget(u)
          }
        ]
      : [];

  const users = data?.data || data?.users || [];
  const total = data?.total || data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1;

  // The list endpoint returns every user, so the export is built from the
  // rows already loaded (same columns as the table).
  const exportUsers = () => {
    const csv = toCsv(users, [
      { header: t("page.user.adminList.tableAdmin"), value: (u) => u.fullName || u.userName },
      { header: "Username", value: (u) => u.userName },
      { header: "Email", value: (u) => u.email },
      { header: t("page.user.adminList.tableStore"), value: (u) => storeNameOf(u) },
      { header: t("page.user.adminList.tableRole"), value: (u) => u.roleType || "admin" },
      { header: t("common.status"), value: (u) => getStatus(u, t).label }
    ]);
    downloadCsv(`users-${todayDateOnly()}.csv`, csv);
  };

  const columns = [
    {
      header: t("page.user.adminList.tableAdmin"),
      render: (u) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${avatarBg(u.fullName || u.userName)} flex items-center justify-center text-sm font-bold`}>
            {getInitials(u.fullName || u.userName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{u.fullName || u.userName}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      )
    },
    {
      header: t("page.user.adminList.tableStore"),
      render: (u) => (
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{storeNameOf(u) || "-"}</span>
        </div>
      )
    },
    {
      header: t("page.user.adminList.tableRole"),
      render: (u) => {
        const role = u.roleType || "admin";
        return (
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleClass(role)}`}>
            {role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
        );
      }
    },
    {
      header: t("common.status"),
      render: (u) => {
        const status = getStatus(u, t);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        );
      }
    },
    {
      header: t("common.actions"),
      align: "right",
      render: (u) =>
        u.status === "pending" || u.isActive === null ? (
          <div className="flex justify-end items-center gap-2">
            <Button
              size="sm"
              onClick={() => setStatusModal({ id: u.id, status: "active" })}
              className="h-8 text-xs gap-1">
              {t("page.user.adminList.activate")}
            </Button>
            <TableActions
              align="right"
              visible={2}
              items={[
                {
                  label: t("common.deactivate"),
                  iconName: "close",
                  danger: true,
                  onClick: () => setStatusModal({ id: u.id, status: "inactive" })
                },
                ...storeActions(u)
              ]}
            />
          </div>
        ) : (
          <div className="flex justify-end">
            <TableActions
              align="right"
              items={[
                // Status-driven toggle through the same confirmation modal:
                // active -> Nonaktifkan, otherwise -> Aktifkan ("active" also
                // re-enables disabled/inactive/draft rows on the BE).
                ...(u.status === "active"
                  ? [
                      {
                        label: t("common.deactivate"),
                        iconName: "close",
                        danger: true,
                        onClick: () => setStatusModal({ id: u.id, status: "inactive" })
                      }
                    ]
                  : [
                      {
                        label: t("common.activate"),
                        iconName: "check",
                        onClick: () => setStatusModal({ id: u.id, status: "active" })
                      }
                    ]),
                ...storeActions(u)
              ]}
            />
          </div>
        )
    }
  ];

  return (
    <div data-tour="page-users" className="space-y-6">
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            { label: t("page.user.adminList.title") }
          ]}
          title={t("page.user.adminList.pageTitle")}
          description={t("page.user.adminList.description")}>
          {canAccess(user, MENU_KEY, "add") && (
            <Button
              variant="success"
              data-tour="user-add"
              onClick={() => navigate("/add-user")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg shadow-sm">
              <UserPlus size={20} className="text-lg" />
              {t("page.user.button.add")}
            </Button>
          )}
        </PageHeader>

        {isError ? (
          <AbortController refetch={refetch} />
        ) : (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                <div className="col-span-1 md:col-span-3 lg:col-span-1 bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                  <Skeleton className="h-8 w-28 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
                {[...Array(3)].map((_, i) => (
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                <StatCard
                  label={t("page.user.adminList.statsTotal")}
                  value={(data?.stats?.total || total || 0).toLocaleString()}
                  icon={Shield}
                  variant="default"
                  subtitle={t("page.user.adminList.statsTotalBadge")}
                  className="col-span-1 md:col-span-3 lg:col-span-1"
                />
                <StatCard
                  label={t("page.user.adminList.statsActive")}
                  value={(data?.stats?.active || 0).toLocaleString()}
                  icon={CheckCircle}
                  variant="active"
                  subtitle={`${total > 0 ? Math.round(((data?.stats?.active || 0) / (data?.stats?.total || total || 1)) * 100) : 0}${t("page.user.adminList.statsActivePercent")}`}
                />
                <StatCard
                  label={t("page.user.adminList.statsPending")}
                  value={(data?.stats?.pending || 0).toLocaleString()}
                  icon={FileEdit}
                  variant="draft"
                  subtitle={t("page.user.adminList.statsPendingBadge")}
                />
                <StatCard
                  label={t("common.inactive")}
                  value={(data?.stats?.inactive || 0).toLocaleString()}
                  icon={XCircle}
                  variant="inactive"
                />
              </div>
            )}

            <div data-tour="user-table">
              <DataTable
                columns={columns}
                data={users}
                isLoading={isLoading || isFetching}
                rowKey={(u) => u.id || u._id}
                emptyIcon={ShieldCheck}
                emptyMessage={t("page.user.adminList.empty")}
                emptyAction={
                  canAccess(user, MENU_KEY, "add")
                    ? { label: t("page.user.button.add"), onClick: () => navigate("/add-user") }
                    : undefined
                }
                toolbar={
                  <TableToolbar
                    title={t("page.user.adminList.tableTitle")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="admin-list-search"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.search")}
                      </label>
                      <SearchInput
                        id="admin-list-search"
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.user.adminList.search")}
                        isLoading={isFetching}
                      />
                    </div>
                    {canAccess(user, MENU_KEY, "export") && (
                      <Button
                        variant="general"
                        size="sm"
                        className="gap-2 h-9"
                        onClick={exportUsers}
                        disabled={users.length === 0}>
                        <Download size={18} className="text-base" />
                        {t("page.user.adminList.exportCsv")}
                      </Button>
                    )}
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
                  }
                }}
              />
            </div>

            <TableActionLegend
              className="mt-4"
              items={[
                { icon: CheckCircle, label: t("common.activate") },
                { icon: XCircle, label: t("common.deactivate") }
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 relative overflow-hidden group">
                <div className="relative z-10 max-w-md">
                  <h5 className="text-xl font-semibold text-foreground mb-3">
                    {t("page.user.adminList.securityTitle")}
                  </h5>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {t("page.user.adminList.securityDesc")}
                  </p>
                  <Button
                    variant="link"
                    className="gap-2 p-0 h-auto text-primary font-semibold"
                    onClick={() => navigate("/support")}>
                    {t("page.user.adminList.learnSecurity")}
                    <ArrowRight size={20} className="text-lg" />
                  </Button>
                </div>
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
                <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:block opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShieldAlert size={120} className="text-[120px] text-primary" />
                </div>
              </div>
              <div className="lg:col-span-2 p-8 rounded-2xl bg-foreground text-background border border-border flex flex-col justify-between">
                <div>
                  <Sparkles size={36} className="text-4xl mb-4 opacity-80" />
                  <h5 className="text-lg font-semibold mb-2">
                    {t("page.user.adminList.quickHelp")}
                  </h5>
                  <p className="text-sm opacity-70 leading-snug">
                    {t("page.user.adminList.quickHelpDesc")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="mt-6 w-full py-3 bg-white/10 text-white hover:bg-white/20 hover:text-white font-semibold"
                  onClick={() => navigate("/support")}>
                  {t("page.user.adminList.contactSuccess")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        type="confirm"
        open={!!statusModal}
        onOpenChange={(v) => {
          if (!v) setStatusModal(null);
        }}
        title={
          statusModal?.status === "active"
            ? t("page.user.adminList.activateConfirmTitle")
            : t("page.user.adminList.deactivateConfirmTitle")
        }
        description={
          statusModal?.status === "active"
            ? t("page.user.adminList.activateConfirmDesc")
            : t("page.user.adminList.deactivateConfirmDesc")
        }
        confirmText={t("common.confirm")}
        loading={statusMutation.isLoading}
        onConfirm={handleConfirmStatus}
      />
      {storeTarget && (
        <ChangeUserStoreModal
          key={storeTarget.id}
          target={storeTarget}
          currentStoreName={storeNameOf(storeTarget)}
          onClose={() => setStoreTarget(null)}
          onChanged={refetch}
        />
      )}
      {statusMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default AdminList;

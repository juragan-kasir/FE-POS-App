import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { Users, Plus, Eye, Edit, Trash2, Truck, Bike, Car, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { getDrivers, deleteDriver } from "@/services/delivery";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import { canAccess } from "@/utils/permission";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }) +
      " " +
      d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      })
    );
  } catch {
    return "-";
  }
};

const statusOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" }
];

const statusBadge = (status) => {
  const map = {
    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
    busy: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    offline:
      "bg-muted text-gray-600 dark:bg-gray-900/30 dark:text-muted-foreground border border-gray-200 dark:border-gray-800",
    inactive:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
    draft:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
  };
  return safeGet(map, status, "bg-muted text-muted-foreground");
};

const vehicleIcon = (type) => {
  if (!type) return <Truck size={14} />;
  const lower = type.toLowerCase();
  if (lower.includes("motor") || lower.includes("bike")) return <Bike size={14} />;
  if (lower.includes("mobil") || lower.includes("car")) return <Car size={14} />;
  return <Truck size={14} />;
};

const DriverList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const user = cookie?.user;
  const MENU_KEY = "/driver-list";

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["drivers", page, limit, storeFilter, search, statusFilter],
    () =>
      getDrivers({
        store: storeFilter === "all" ? "" : storeFilter,
        page,
        limit,
        search,
        status: statusFilter
      }),
    { retry: 1, keepPreviousData: true }
  );

  const isFiltered = search !== "" || statusFilter !== "all" || storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGlobalStoreFilter("all");
    setPage(1);
  };

  const deleteMutation = useMutation(deleteDriver, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.delivery.driver.toast.deleteSuccess")
      });
      queryClient.invalidateQueries(["drivers"]);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || t("page.delivery.driver.toast.deleteFailed")
      });
    }
  });

  const drivers = data?.data || [];
  const stats = data?.stats || { total: 0, active: 0, busy: 0, offline: 0, inactive: 0, draft: 0 };

  const columns = [
    {
      header: t("page.delivery.driver.detail.name"),
      render: (driver) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {driver.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{driver.name}</p>
            <p className="text-xs text-muted-foreground">{driver.phone || "-"}</p>
          </div>
        </div>
      )
    },
    {
      header: t("page.delivery.driver.detail.vehicleType"),
      render: (driver) => (
        <div className="flex items-center gap-2">
          {vehicleIcon(driver.vehicleType)}
          <span className="text-sm text-foreground">{driver.vehicleType || "-"}</span>
        </div>
      )
    },
    {
      header: t("page.delivery.driver.detail.vehiclePlate"),
      render: (driver) => (
        <span className="text-sm font-mono text-foreground">{driver.vehiclePlate || "-"}</span>
      )
    },
    {
      header: t("page.delivery.driver.detail.status"),
      render: (driver) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight ${statusBadge(driver.status)}`}>
          {t(`page.delivery.driver.status.${driver.status}`)}
        </span>
      )
    },
    {
      header: t("common.createdBy"),
      render: (driver) => (
        <span className="text-sm text-muted-foreground">
          {driver.createdByUser?.fullName || driver.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.department.table.createdDate"),
      render: (driver) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(driver.createdAt)}
        </span>
      )
    },
    {
      header: t("common.modifiedBy"),
      render: (driver) => (
        <span className="text-sm text-muted-foreground">
          {driver.modifiedByUser?.fullName || driver.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.department.table.updatedDate"),
      render: (driver) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(driver.updatedAt)}
        </span>
      )
    },
    {
      header: "",
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (driver) => (
        <TableActions
          align="right"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/detail-driver?id=${driver.id}`),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/edit-driver?id=${driver.id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => setDeleteTarget(driver),
              hidden: !canAccess(user, MENU_KEY, "delete")
            }
          ]}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            href:
              user?.roleType === "super_admin"
                ? "/dashboard-super-admin"
                : user?.roleType === "admin"
                  ? "/dashboard-admin"
                  : "/home",
            i18nKey: "breadcrumb.home"
          },
          { i18nKey: "sidebar.driver" }
        ]}
        title={t("page.delivery.driver.list.title")}
        description={t("page.delivery.driver.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button variant="success" onClick={() => navigate("/add-driver")}>
            <Plus size={16} className="mr-1" />
            {t("page.delivery.driver.add.title")}
          </Button>
        )}
      </PageHeader>

      {isFetching || isLoading ? (
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label={t("page.delivery.driver.stats.total")}
              value={stats.total}
              icon={Users}
              variant="default"
            />
            <StatCard
              label={t("page.delivery.driver.stats.active")}
              value={stats.active}
              icon={Truck}
              variant="active"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label={t("page.delivery.driver.stats.busy")}
              value={stats.busy}
              icon={Bike}
              variant="draft"
            />
            <StatCard
              label={t("page.delivery.driver.stats.draft")}
              value={stats.draft || 0}
              icon={FileEdit}
              variant="draft"
            />
            <StatCard
              label={t("page.delivery.driver.stats.offline")}
              value={stats.offline + stats.inactive}
              icon={Car}
              variant="inactive"
            />
          </div>
        </div>
      )}

      <DataTable
        emptyAction={
          canAccess(user, MENU_KEY, "add")
            ? { label: t("page.delivery.driver.add.title"), onClick: () => navigate("/add-driver") }
            : undefined
        }
        columns={columns}
        data={drivers}
        isLoading={isLoading || isFetching}
        isError={isError}
        onRetry={refetch}
        emptyMessage={t("page.delivery.driver.list.empty")}
        emptyIcon={Users}
        toolbar={
          <TableToolbar
            title={t("page.delivery.driver.list.title")}
            onReset={resetFilters}
            isFiltered={isFiltered}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("common.search")}
              </label>
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder={t("page.delivery.driver.list.search")}
                isLoading={isFetching}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("page.delivery.driver.detail.status")}
              </label>
              <Combobox
                options={statusOptions}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
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
          totalPages: data?.pagination?.totalPages || 1,
          total: data?.pagination?.total || 0,
          onPageChange: setPage,
          pageSize: limit,
          onPageSizeChange: (v) => {
            setLimit(v);
            setPage(1);
          }
        }}
      />

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.delivery.driver.modal.deleteTitle")}
        description={t("page.delivery.driver.modal.deleteDescription")}
        confirmText={t("page.delivery.driver.modal.deleteConfirm")}
        loading={deleteMutation?.isLoading}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
      />
    </div>
  );
};

export default DriverList;

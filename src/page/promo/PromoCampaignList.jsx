import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import {
  Megaphone,
  Clock,
  Eye,
  Edit,
  Trash2,
  Plus,
  Power,
  Pause,
  Play,
  Tag,
  Percent,
  Gift,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  getCampaigns,
  getCampaignStats,
  updateCampaignStatus,
  deleteCampaign
} from "@/services/promo";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import TableToolbar from "@/components/ui/TableToolbar";
import { Combobox } from "@/components/ui/combobox";
import Modal from "@/components/organism/modal";
import { canAccess } from "@/utils/permission";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" }
];

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "happy_hour", label: "Happy Hour" },
  { value: "birthday", label: "Birthday" },
  { value: "buy_x_get_y", label: "Buy X Get Y" },
  { value: "spend_get", label: "Spend & Get" },
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" }
];

const statusBadge = (status) => {
  const map = {
    draft:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
    paused:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
    expired:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    cancelled:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
  };
  return safeGet(map, status, "bg-muted text-muted-foreground");
};

const typeIcon = (type) => {
  const map = {
    happy_hour: Clock,
    birthday: Gift,
    buy_x_get_y: Tag,
    spend_get: Percent,
    manual: Megaphone,
    automatic: Power
  };
  return safeGet(map, type, Megaphone);
};

const PromoCampaignList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const isFiltered =
    storeFilter !== "all" || search !== "" || statusFilter !== "all" || typeFilter !== "all";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const user = cookie?.user;
  const MENU_KEY = "/promo-list";

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["promo-campaigns", page, limit, storeFilter, search, statusFilter, typeFilter],
    () =>
      getCampaigns({
        store: storeFilter === "all" ? "" : storeFilter,
        page,
        limit,
        search,
        status: statusFilter,
        type: typeFilter
      }),
    { retry: 1, keepPreviousData: true }
  );

  const { data: statsData } = useQuery(
    ["promo-stats", storeFilter],
    () => getCampaignStats({ store: storeFilter === "all" ? "" : storeFilter }),
    { retry: 1 }
  );

  const statusMutation = useMutation(({ id, status }) => updateCampaignStatus(id, { status }), {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.promo.toast.statusUpdated")
      });
      queryClient.invalidateQueries(["promo-campaigns"]);
      queryClient.invalidateQueries(["promo-stats"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const deleteMutation = useMutation(deleteCampaign, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("common.deleteSuccess")
      });
      queryClient.invalidateQueries(["promo-campaigns"]);
      queryClient.invalidateQueries(["promo-stats"]);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const stats = statsData?.data || {};

  const columns = [
    {
      header: t("page.promo.list.name"),
      accessor: "name",
      stickyLeft: true,
      render: (row) => {
        const Icon = typeIcon(row.type);
        return (
          <div className="flex items-center gap-2">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon size={26} className="text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">{row.name}</div>
              {row.code && (
                <div className="text-xs font-mono text-muted-foreground">{row.code}</div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: t("page.promo.list.type"),
      accessor: "type",
      render: (row) => <span className="text-sm capitalize">{row.type?.replace("_", " ")}</span>
    },
    {
      header: t("page.promo.list.discount"),
      accessor: "discountValue",
      render: (row) => {
        const type = row.discountType;
        const val = row.discountValue;
        if (type === "percentage") return <span className="font-semibold">{val}%</span>;
        if (type === "fixed")
          return <span className="font-semibold">Rp{val?.toLocaleString()}</span>;
        if (type === "free_item")
          return <span className="font-semibold">{t("page.promo.ui.freeItem")}</span>;
        return <span className="font-semibold">{val}</span>;
      }
    },
    {
      header: t("page.promo.list.period"),
      accessor: "startDate",
      render: (row) => (
        <div className="text-xs">
          <div>
            {row.startDate && !isNaN(new Date(row.startDate).getTime())
              ? new Date(row.startDate).toLocaleDateString()
              : "-"}
          </div>
          <div className="text-muted-foreground">
            to{" "}
            {row.endDate && !isNaN(new Date(row.endDate).getTime())
              ? new Date(row.endDate).toLocaleDateString()
              : "-"}
          </div>
        </div>
      )
    },
    {
      header: t("page.promo.list.usage"),
      accessor: "currentUsage",
      render: (row) => (
        <div className="text-sm">
          <span className="font-medium">{row.currentUsage || 0}</span>
          {row.maxUsageTotal && (
            <span className="text-muted-foreground"> / {row.maxUsageTotal}</span>
          )}
        </div>
      )
    },
    {
      header: t("page.promo.list.status"),
      accessor: "status",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.status)}`}>
          {row.status?.toUpperCase()}
        </span>
      )
    },
    {
      header: t("common.createdBy"),
      accessor: "createdByUser",
      render: (row) => <span className="text-xs">{row.createdByUser?.fullName || "-"}</span>
    },
    {
      header: t("common.createdAt"),
      accessor: "createdAt",
      render: (row) => (
        <span className="text-xs">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}
        </span>
      )
    },
    {
      header: t("common.modifiedBy"),
      accessor: "modifiedByUser",
      render: (row) => <span className="text-xs">{row.modifiedByUser?.fullName || "-"}</span>
    },
    {
      header: t("common.updatedAt"),
      accessor: "updatedAt",
      render: (row) => (
        <span className="text-xs">
          {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "-"}
        </span>
      )
    },
    {
      header: t("common.action"),
      accessor: "actions",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Pause, label: t("common.pause") },
        { icon: Play, label: t("common.resume") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => {
        return (
          <TableActions
            align="center"
            items={[
              {
                label: t("common.view"),
                icon: Eye,
                onClick: () => navigate(`/detail-promo?id=${item.id}`)
              },
              {
                label: t("common.edit"),
                icon: Edit,
                onClick: () => navigate(`/edit-promo?id=${item.id}`),
                hidden: !canAccess(user, MENU_KEY, "edit")
              },
              ...(item.status === "active"
                ? [
                    {
                      label: t("common.pause"),
                      icon: Pause,
                      onClick: () =>
                        setStatusTarget({ id: item.id, name: item.name, status: "paused" }),
                      hidden: !canAccess(user, MENU_KEY, "edit")
                    }
                  ]
                : []),
              ...(item.status === "paused"
                ? [
                    {
                      label: t("common.resume"),
                      icon: Play,
                      onClick: () =>
                        setStatusTarget({ id: item.id, name: item.name, status: "active" }),
                      hidden: !canAccess(user, MENU_KEY, "edit")
                    }
                  ]
                : []),
              {
                label: t("common.delete"),
                icon: Trash2,
                danger: true,
                onClick: () => setDeleteTarget(item),
                hidden:
                  !canAccess(user, MENU_KEY, "edit") ||
                  item.status === "cancelled" ||
                  item.status === "expired"
              }
            ]}
          />
        );
      }
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
          { i18nKey: "sidebar.promo" }
        ]}
        title={t("page.promo.list.title")}
        description={t("page.promo.list.description")}>
        {canAccess(user, MENU_KEY, "create") && (
          <Button variant="success" onClick={() => navigate("/add-promo")}>
            <Plus size={16} className="mr-2" />
            {t("page.promo.list.addButton")}
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("page.promo.stats.totalCampaigns")}
          value={stats.totalCampaigns || 0}
          icon={Megaphone}
          isLoading={isLoading}
        />
        <StatCard
          label={t("page.promo.stats.activeCampaigns")}
          value={stats.activeCampaigns || 0}
          icon={CheckCircle}
          isLoading={isLoading}
          className="border-green-200 dark:border-green-800"
        />
        <StatCard
          label={t("page.promo.stats.totalUsage")}
          value={stats.totalUsage || 0}
          icon={Tag}
          isLoading={isLoading}
        />
        <StatCard
          label={t("page.promo.stats.totalDiscount")}
          value={`Rp${(stats.totalDiscountGiven || 0).toLocaleString()}`}
          icon={Percent}
          isLoading={isLoading}
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <DataTable
          emptyAction={
            canAccess(user, MENU_KEY, "create")
              ? { label: t("page.promo.list.addButton"), onClick: () => navigate("/add-promo") }
              : undefined
          }
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading || isFetching}
          isError={isError}
          onRetry={refetch}
          toolbar={
            <TableToolbar
              title={t("page.promo.list.title")}
              onReset={resetFilters}
              isFiltered={isFiltered}>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="promo-campaign-list-filter-status"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("page.promo.ui.filterStatus")}
                </label>
                <Combobox
                  id="promo-campaign-list-filter-status"
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  placeholder={t("page.promo.ui.filterStatus")}
                  searchPlaceholder="Cari status..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="promo-campaign-list-filter-type"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("page.promo.ui.filterType")}
                </label>
                <Combobox
                  id="promo-campaign-list-filter-type"
                  options={typeOptions}
                  value={typeFilter}
                  onChange={(val) => {
                    setTypeFilter(val);
                    setPage(1);
                  }}
                  placeholder={t("page.promo.ui.filterType")}
                  searchPlaceholder="Cari tipe..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="promo-campaign-list-search"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.search")}
                </label>
                <SearchInput
                  id="promo-campaign-list-search"
                  value={search}
                  onChange={(val) => {
                    setSearch(val);
                    setPage(1);
                  }}
                  placeholder={t("page.promo.list.searchPlaceholder")}
                  className="w-full md:w-64"
                />
              </div>
            </TableToolbar>
          }
          pagination={{
            ...data?.pagination,
            pageSize: limit,
            onPageChange: setPage,
            onPageSizeChange: (v) => {
              setLimit(v);
              setPage(1);
            }
          }}
          emptyMessage={t("page.promo.list.empty")}
        />
      </div>

      {/* Delete Modal */}
      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.promo.modal.deleteTitle")}
        description={t("page.promo.modal.deleteDescription", { name: deleteTarget?.name })}
        confirmText={t("common.delete")}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        loading={deleteMutation.isLoading}
      />

      {/* Status Change Modal */}
      <Modal
        type="confirm"
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={
          statusTarget?.status === "paused"
            ? t("page.promo.modal.pauseTitle")
            : t("page.promo.modal.activateTitle")
        }
        description={
          statusTarget?.status === "paused"
            ? t("page.promo.modal.pauseDescription")
            : t("page.promo.modal.activateDescription")
        }
        confirmText={
          statusTarget?.status === "paused"
            ? t("page.promo.modal.confirmPause")
            : t("page.promo.modal.confirmActivate")
        }
        onConfirm={() => {
          statusMutation.mutate({ id: statusTarget?.id, status: statusTarget?.status });
          setStatusTarget(null);
        }}
        loading={statusMutation.isLoading}
      />
    </div>
  );
};

export default PromoCampaignList;

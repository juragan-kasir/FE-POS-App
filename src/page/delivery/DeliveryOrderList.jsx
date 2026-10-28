import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { Truck, Clock, Route, CheckCircle, XCircle, Eye, Package } from "lucide-react";
import { toast } from "sonner";
import { getDeliveryOrders, cancelDeliveryOrder } from "@/services/delivery";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import { canAccess } from "@/utils/permission";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Textarea } from "@/components/ui/textarea";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "picked_up", label: "Picked Up" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
];

const sourceOptions = [
  { value: "all", label: "All" },
  { value: "pos", label: "POS" },
  { value: "qr", label: "QR Order" },
  { value: "manual", label: "Manual" },
  { value: "online", label: "Online" }
];

const statusBadge = (status) => {
  const map = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
    assigned:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    picked_up:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
    in_transit:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
    delivered:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
    cancelled:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
  };
  return safeGet(map, status, "bg-muted text-muted-foreground");
};

const DeliveryOrderList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const user = cookie?.user;
  const MENU_KEY = "/delivery-orders";

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["delivery-orders", page, limit, storeFilter, search, statusFilter, sourceFilter],
    () =>
      getDeliveryOrders({
        store: storeFilter === "all" ? "" : storeFilter,
        page,
        limit,
        search,
        status: statusFilter,
        source: sourceFilter
      }),
    { retry: 1, keepPreviousData: true }
  );

  const isFiltered =
    search !== "" || statusFilter !== "all" || sourceFilter !== "all" || storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setGlobalStoreFilter("all");
    setPage(1);
  };

  const cancelMutation = useMutation(({ id, reason }) => cancelDeliveryOrder(id, reason), {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.delivery.toast.cancelSuccess")
      });
      queryClient.invalidateQueries(["delivery-orders"]);
      setCancelTarget(null);
      setCancelReason("");
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const orders = data?.data || [];
  const stats = data?.stats || { total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0 };

  const columns = [
    {
      header: t("page.delivery.detail.orderNumber"),
      render: (order) => (
        <span className="font-mono text-sm font-semibold text-foreground">{order.orderNumber}</span>
      )
    },
    {
      header: t("page.delivery.detail.customer"),
      render: (order) => (
        <div>
          <p className="text-sm font-medium text-foreground">{order.customerName || "-"}</p>
          <p className="text-xs text-muted-foreground">{order.customerPhone || ""}</p>
        </div>
      )
    },
    {
      header: t("page.delivery.detail.driver"),
      render: (order) => (
        <span className="text-sm text-foreground">
          {order.driverName || (
            <span className="text-muted-foreground italic">
              {t("page.delivery.detail.noDriver")}
            </span>
          )}
        </span>
      )
    },
    {
      header: t("page.delivery.detail.status"),
      render: (order) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight ${statusBadge(order.status)}`}>
          {t(`page.delivery.status.${order.status}`)}
        </span>
      )
    },
    {
      header: t("page.delivery.detail.source"),
      render: (order) => (
        <span className="text-sm text-muted-foreground uppercase">{order.source || "-"}</span>
      )
    },
    {
      header: t("page.delivery.detail.deliveryFee"),
      align: "right",
      render: (order) => (
        <span className="text-sm font-mono text-foreground">
          {order.deliveryFee ? `Rp${Number(order.deliveryFee).toLocaleString("id-ID")}` : "-"}
        </span>
      )
    },
    {
      header: "",
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: XCircle, label: t("common.cancel") }
      ],
      render: (order) => (
        <TableActions
          align="right"
          visible={2}
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              hidden: !canAccess(user, MENU_KEY, "view"),
              onClick: () => navigate(`/detail-delivery-order?id=${order.id}`)
            },
            {
              label: t("common.cancel"),
              icon: XCircle,
              danger: true,
              hidden:
                !canAccess(user, MENU_KEY, "edit") ||
                order.status === "delivered" ||
                order.status === "cancelled",
              onClick: () => setCancelTarget(order)
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
            label: t("breadcrumb.home"),
            href:
              user?.roleType === "super_admin"
                ? "/dashboard-super-admin"
                : user?.roleType === "admin"
                  ? "/dashboard-admin"
                  : "/home",
            i18nKey: "breadcrumb.home"
          },
          { label: t("page.delivery.list.title"), i18nKey: "sidebar.deliveryOrders" }
        ]}
        title={t("page.delivery.list.title")}
        description={t("page.delivery.list.description")}
      />

      {isFetching || isLoading ? (
        <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("page.delivery.stats.total")}
            value={stats.total}
            icon={Truck}
            variant="default"
          />
          <StatCard
            label={t("page.delivery.stats.pending")}
            value={stats.pending}
            icon={Clock}
            variant="draft"
          />
          <StatCard
            label={t("page.delivery.stats.inTransit")}
            value={stats.inTransit}
            icon={Route}
            variant="active"
          />
          <StatCard
            label={t("page.delivery.stats.delivered")}
            value={stats.delivered}
            icon={CheckCircle}
            variant="active"
          />
        </div>
      )}

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading || isFetching}
        isError={isError}
        onRetry={refetch}
        emptyMessage={t("page.delivery.list.empty")}
        emptyIcon={Package}
        toolbar={
          <TableToolbar
            title={t("page.delivery.list.title")}
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
                placeholder={t("page.delivery.list.search")}
                isLoading={isFetching}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="delivery-order-list-source"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("page.delivery.detail.source")}
              </label>
              <Combobox
                id="delivery-order-list-source"
                options={sourceOptions}
                value={sourceFilter}
                onChange={(val) => {
                  setSourceFilter(val);
                  setPage(1);
                }}
                placeholder={t("common.all")}
                searchPlaceholder={t("common.all")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="delivery-order-list-status"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("page.delivery.detail.status")}
              </label>
              <Combobox
                id="delivery-order-list-status"
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
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={t("page.delivery.detail.cancelTitle")}
        description={t("page.delivery.detail.cancelDescription")}
        confirmText={t("page.delivery.detail.cancel")}
        loading={cancelMutation?.isLoading}
        onConfirm={() => {
          if (cancelTarget && cancelReason.trim()) {
            cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason });
          }
        }}>
        <div className="mt-2">
          <label
            htmlFor="delivery-order-list-cancel-reason"
            className="text-sm font-medium text-foreground">
            {t("page.delivery.detail.cancelReason")}
          </label>
          <Textarea
            id="delivery-order-list-cancel-reason"
            unstyled
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="mt-1 w-full h-20 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none resize-none"
            placeholder={t("page.delivery.detail.cancelReason")}
            maxLength={FIELD_LIMITS.DESCRIPTION}
          />
        </div>
      </Modal>
    </div>
  );
};

export default DeliveryOrderList;

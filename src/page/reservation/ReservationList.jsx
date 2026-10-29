import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  Clock,
  Check,
  X,
  Eye,
  CalendarCheck,
  CheckCircle,
  Hourglass,
  XCircle
} from "lucide-react";
import { getReservations, deleteReservation, updateReservation } from "@/services/reservation";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import StatCard from "@/components/ui/StatCard";
import StoreFilter from "@/components/ui/StoreFilter";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const ReservationList = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const STATUS_MAP = {
    pending: {
      label: t("page.reservation.status.pending"),
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    },
    confirmed: {
      label: t("page.reservation.status.confirmed"),
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    },
    cancelled: {
      label: t("page.reservation.status.cancelled"),
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    },
    completed: {
      label: t("page.reservation.status.completed"),
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    },
    no_show: {
      label: t("page.reservation.status.noShow"),
      color: "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
    }
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [dateFilter, setDateFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const isFiltered = storeFilter !== "all" || statusFilter !== "all" || !!dateFilter;

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setStatusFilter("all");
    setDateFilter(undefined);
    setPage(1);
  };

  const { data: locData, isLoading: isLoadingLocations } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const storeMap = Object.fromEntries((locData?.data || []).map((s) => [String(s.id), s.name]));

  const statusMutation = useMutation(({ id, status }) => updateReservation({ id, status }), {
    onSuccess: () => {
      queryClient.invalidateQueries(["reservations"]);
      toast.success(t("common.success"));
    },
    onError: (err) =>
      toast.error(t("common.failed"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["reservations", page, limit, dateFilter, statusFilter, storeFilter],
    () =>
      getReservations({
        page,
        limit,
        date: dateFilter ? format(dateFilter, "yyyy-MM-dd") : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        store: storeFilter !== "all" ? storeFilter : undefined
      }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteReservation, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.reservation.toast.deleteSuccess")
      });
      queryClient.invalidateQueries(["reservations"]);
    },
    onError: (err) =>
      toast.error(t("common.failed"), { description: err?.response?.data?.message || err.message })
  });

  const reservations = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const stats = data?.stats || {};

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d + "T00:00:00").toLocaleDateString(dateLocale(), {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatTime = (t) => t?.slice(0, 5) || "-";

  const columns = [
    {
      header: t("page.reservation.columns.customer"),
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{item.customerName}</span>
          {item.customerPhone && (
            <span className="text-xs text-muted-foreground">{item.customerPhone}</span>
          )}
          {item.customerEmail && (
            <span className="text-xs text-muted-foreground">{item.customerEmail}</span>
          )}
        </div>
      )
    },
    {
      header: t("page.reservation.columns.store"),
      render: (item) => storeMap[String(item.store)] || `Store #${item.store}`
    },
    {
      header: t("page.reservation.columns.table"),
      render: (item) =>
        item.tableId ? `${t("page.reservation.tablePrefix")} ${item.tableId}` : "-"
    },
    {
      header: t("page.reservation.columns.date"),
      render: (item) => formatDate(item.reservationDate)
    },
    {
      header: t("page.reservation.columns.time"),
      render: (item) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock size={14} className="text-muted-foreground" />
          {formatTime(item.startTime)} {item.endTime ? `- ${formatTime(item.endTime)}` : ""}
        </div>
      )
    },
    {
      header: t("page.reservation.columns.guests"),
      render: (item) => (
        <div className="flex items-center gap-1 text-sm">
          <Users size={14} className="text-muted-foreground" />
          {item.guestCount} {t("page.reservation.guestSuffix")}
        </div>
      )
    },
    {
      header: t("page.reservation.columns.notes"),
      render: (item) => (
        <span className="text-sm text-muted-foreground max-w-[150px] truncate block">
          {item.notes || "-"}
        </span>
      )
    },
    {
      header: t("page.reservation.columns.status"),
      render: (item) => {
        const s = STATUS_MAP[item.status] || STATUS_MAP.pending;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
            {s.label}
          </span>
        );
      }
    },
    {
      header: t("common.createdBy"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.createdByUser?.fullName || item.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("common.createdAt"),
      render: (item) => {
        if (!item.createdAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(item.createdAt);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString(dateLocale(), {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}{" "}
            {d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("common.modifiedBy"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.modifiedByUser?.fullName || item.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("common.updatedAt"),
      render: (item) => {
        if (!item.updatedAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(item.updatedAt);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString(dateLocale(), {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}{" "}
            {d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("page.reservation.columns.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Check, label: t("common.confirm") },
        { icon: X, label: t("common.cancel") },
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          items={[
            ...(item.status === "pending"
              ? [
                  {
                    label: t("common.confirm"),
                    icon: Check,
                    disabled: statusMutation.isLoading,
                    onClick: () =>
                      setConfirmTarget({
                        id: item.id,
                        status: "confirmed",
                        customerName: item.customerName
                      })
                  },
                  {
                    label: t("common.cancel"),
                    icon: X,
                    disabled: statusMutation.isLoading,
                    onClick: () =>
                      setConfirmTarget({
                        id: item.id,
                        status: "cancelled",
                        customerName: item.customerName
                      })
                  }
                ]
              : []),
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/reservation/${item.id}`)
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/edit-reservation?id=${item.id}`)
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => setDeleteTarget(item)
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
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("page.reservation.title"), i18nKey: "page.reservation.title" }
        ]}
        title={t("page.reservation.title")}
        description={t("page.reservation.description")}>
        <Button variant="success" onClick={() => navigate("/add-reservation")} className="gap-2">
          <Plus size={18} /> {t("page.reservation.addButton")}
        </Button>
      </PageHeader>

      {isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <>
          {locData && (locData?.data || []).length === 0 ? (
            <NoStore />
          ) : (
            <>
              {isFetching || isLoading ? (
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
                    label={t("page.reservation.stats.total")}
                    value={stats.total ?? total}
                    icon={CalendarCheck}
                    variant="default"
                  />
                  <StatCard
                    label={t("page.reservation.status.confirmed")}
                    value={stats.confirmed ?? 0}
                    icon={CheckCircle}
                    variant="active"
                  />
                  <StatCard
                    label={t("page.reservation.status.pending")}
                    value={stats.pending ?? 0}
                    icon={Hourglass}
                    variant="draft"
                  />
                  <StatCard
                    label={t("page.reservation.status.cancelled")}
                    value={stats.cancelled ?? 0}
                    icon={XCircle}
                    variant="inactive"
                  />
                </div>
              )}
              <div data-tour="reservation-table" className="mt-6">
                <DataTable
                  emptyAction={{
                    label: t("page.reservation.addButton"),
                    onClick: () => navigate("/add-reservation")
                  }}
                  columns={columns}
                  data={reservations}
                  isLoading={isLoading || isFetching}
                  emptyMessage={t("page.reservation.empty")}
                  emptyIcon={Calendar}
                  toolbar={
                    <TableToolbar
                      title={t("page.reservation.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      {isLoadingLocations || isLoading || isFetching
                        ? [
                            <Skeleton key="s1" className="h-9 w-40 rounded-md" />,
                            <Skeleton key="s2" className="h-9 w-40 rounded-md" />,
                            <Skeleton key="s3" className="h-9 w-40 rounded-md" />
                          ]
                        : [
                            <div key="store">
                              <label
                                htmlFor="reservation-list-store-filter"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                {t("page.goodsReceipt.detail.store")}
                              </label>
                              <StoreFilter
                                id="reservation-list-store-filter"
                                locations={locData?.data || []}
                                value={storeFilter}
                                onChange={(v) => {
                                  setGlobalStoreFilter(v);
                                  setPage(1);
                                }}
                                isSuperAdmin={isSuperAdmin}
                                t={t}
                              />
                            </div>,
                            <div key="date">
                              <label
                                htmlFor="reservation-list-date"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                {t("page.reservation.columns.date")}
                              </label>
                              <DatePicker
                                id="reservation-list-date"
                                date={dateFilter}
                                setDate={(date) => {
                                  setDateFilter(date);
                                  setPage(1);
                                }}
                              />
                            </div>,
                            <div key="status">
                              <label
                                htmlFor="reservation-list-status"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                {t("page.reservation.columns.status")}
                              </label>
                              <Combobox
                                id="reservation-list-status"
                                options={[
                                  { value: "all", label: t("page.reservation.filter.allStatus") },
                                  { value: "pending", label: t("page.reservation.status.pending") },
                                  {
                                    value: "confirmed",
                                    label: t("page.reservation.status.confirmed")
                                  },
                                  {
                                    value: "cancelled",
                                    label: t("page.reservation.status.cancelled")
                                  },
                                  {
                                    value: "completed",
                                    label: t("page.reservation.status.completed")
                                  },
                                  { value: "no_show", label: t("page.reservation.status.noShow") }
                                ]}
                                value={statusFilter}
                                onChange={(v) => {
                                  setStatusFilter(v);
                                  setPage(1);
                                }}
                                placeholder={t("page.reservation.filter.allStatus")}
                                searchPlaceholder="Cari..."
                              />
                            </div>
                          ]}
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
            </>
          )}
        </>
      )}

      <Modal
        type="confirm"
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={
          confirmTarget?.status === "confirmed"
            ? t("page.reservation.confirmTitle")
            : t("page.reservation.cancelTitle")
        }
        description={
          confirmTarget?.status === "confirmed"
            ? t("page.reservation.confirmDesc", { name: confirmTarget?.customerName || "" })
            : t("page.reservation.cancelDesc", { name: confirmTarget?.customerName || "" })
        }
        confirmText={t("common.yes")}
        loading={statusMutation.isLoading}
        onConfirm={() => {
          statusMutation.mutate({ id: confirmTarget.id, status: confirmTarget.status });
          setConfirmTarget(null);
        }}
      />

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.reservation.deleteTitle")}
        description={t("page.reservation.deleteDesc", { name: deleteTarget?.customerName || "" })}
        confirmText={t("page.reservation.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default ReservationList;

import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Eye,
  Trash2,
  Play,
  CheckCircle2,
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Factory,
  PlayCircle,
  CalendarClock,
  FileEdit
} from "lucide-react";
import { canAccess } from "@/utils/permission";
import {
  getAllProductionOrder,
  deleteProductionOrder,
  startProduction,
  completeProduction
} from "@/services/production-order";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";

const ProductionOrderList = () => {
  const { t } = useTranslation();
  const statusConfig = {
    draft: {
      label: t("page.productionOrder.status.draft"),
      icon: Clock,
      class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    },
    planned: {
      label: t("page.productionOrder.status.planned"),
      icon: ClipboardList,
      class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    },
    in_progress: {
      label: t("page.productionOrder.status.inProgress"),
      icon: Play,
      class: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
    },
    completed: {
      label: t("page.productionOrder.status.completed"),
      icon: CheckCircle,
      class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    },
    cancelled: {
      label: t("page.productionOrder.status.cancelled"),
      icon: XCircle,
      class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    }
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/production-order";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [startTarget, setStartTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeQty, setCompleteQty] = useState("");

  const isFiltered = search !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["production-orders", page, limit, search, statusFilter],
    () =>
      getAllProductionOrder({
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      }),
    { keepPreviousData: true }
  );

  const items = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const stats = data?.stats || {};

  const deleteMutation = useMutation(deleteProductionOrder, {
    onSuccess: () => {
      toast.success(t("page.productionOrder.list.toastSuccess"), {
        description: t("page.productionOrder.list.toastDeleteDesc")
      });
      queryClient.invalidateQueries(["production-orders"]);
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.productionOrder.list.toastError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const startMutation = useMutation(startProduction, {
    onSuccess: () => {
      toast.success(t("page.productionOrder.list.toastSuccess"), {
        description: t("page.productionOrder.list.toastStartDesc")
      });
      queryClient.invalidateQueries(["production-orders"]);
      setStartTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.productionOrder.list.toastError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const completeMutation = useMutation(
    (payload) =>
      completeProduction(completeTarget, { producedQty: parseInt(payload.producedQty) || 0 }),
    {
      onSuccess: () => {
        toast.success(t("page.productionOrder.list.toastSuccess"), {
          description: t("page.productionOrder.list.toastCompleteDesc")
        });
        queryClient.invalidateQueries(["production-orders"]);
        setCompleteTarget(null);
        setCompleteQty("");
      },
      onError: (err) =>
        toast.error(t("page.productionOrder.list.toastError"), {
          description: err?.response?.data?.message || err.message
        })
    }
  );

  const columns = [
    {
      header: t("page.productionOrder.list.tableNoProduksi"),
      render: (item) => (
        <span className="font-mono text-xs font-bold text-primary">{item.productionNo || "-"}</span>
      )
    },
    {
      header: t("page.productionOrder.list.tableProduk"),
      render: (item) => <span className="text-sm">{item.productData?.nameProduct || "-"}</span>
    },
    {
      header: t("page.productionOrder.list.tableQtyRencana"),
      align: "center",
      render: (item) => <span className="font-mono text-sm">{item.plannedQty}</span>
    },
    {
      header: t("page.productionOrder.list.tableQtyHasil"),
      align: "center",
      render: (item) => <span className="font-mono text-sm">{item.producedQty || 0}</span>
    },
    {
      header: t("page.productionOrder.list.tableTglJadwal"),
      align: "center",
      render: (item) => (
        <span className="text-xs">
          {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString("id") : "-"}
        </span>
      )
    },
    {
      header: t("page.productionOrder.list.tableStore"),
      render: (item) => <span className="text-sm">{item.storeData?.name || "-"}</span>
    },
    {
      header: t("page.productionOrder.list.tableStatus"),
      align: "center",
      render: (item) => {
        const cfg = statusConfig[item.status] || statusConfig.draft;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${cfg.class}`}>
            {cfg.label}
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
            {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}{" "}
            {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
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
            {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}{" "}
            {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("page.productionOrder.list.tableAksi"),
      align: "right",
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Play, label: t("page.productionOrder.list.modalStartConfirm") },
        { icon: CheckCircle2, label: t("page.productionOrder.list.modalCompleteConfirm") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/production-order/detail?id=${item.id}`),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            ...(item.status === "planned"
              ? [
                  {
                    label: t("page.productionOrder.list.modalStartConfirm"),
                    icon: Play,
                    onClick: () => setStartTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "edit")
                  }
                ]
              : []),
            ...(item.status === "in_progress"
              ? [
                  {
                    label: t("page.productionOrder.list.modalCompleteConfirm"),
                    icon: CheckCircle2,
                    onClick: () => {
                      setCompleteTarget(item.id);
                      setCompleteQty(String(item.plannedQty));
                    },
                    hidden: !canAccess(user, MENU_KEY, "edit")
                  }
                ]
              : []),
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => setDeleteTarget(item.id),
              hidden:
                !canAccess(user, MENU_KEY, "delete") ||
                !(item.status === "draft" || item.status === "cancelled")
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
          {
            label: t("page.productionOrder.list.title"),
            i18nKey: "page.productionOrder.list.title"
          }
        ]}
        title={t("page.productionOrder.list.title")}
        description={t("page.productionOrder.list.subtitle")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-production-order")}
            className="shrink-0 gap-2">
            <Plus size={16} /> {t("page.productionOrder.list.addButton")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isFetching || isLoading ? (
            <>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-3 gap-4">
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
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label={t("page.productionOrder.list.statTotal")}
                  value={stats.total ?? total}
                  icon={Factory}
                  variant="default"
                />
                <StatCard
                  label={t("page.productionOrder.list.statCompleted")}
                  value={stats.completed ?? 0}
                  icon={CheckCircle}
                  variant="active"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  label={t("page.productionOrder.list.statInProgress")}
                  value={stats.inProgress ?? 0}
                  icon={PlayCircle}
                  variant="yellow"
                />
                <StatCard
                  label={t("page.productionOrder.list.statPlanned")}
                  value={stats.planned ?? 0}
                  icon={CalendarClock}
                  variant="blue"
                />
                <StatCard
                  label={t("page.productionOrder.list.statDraft")}
                  value={stats.draft ?? 0}
                  icon={FileEdit}
                  variant="gray"
                />
              </div>
            </>
          )}

          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <>
              <div>
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.productionOrder.list.addButton"),
                          onClick: () => navigate("/add-production-order")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={items}
                  isLoading={isLoading || isFetching}
                  emptyMessage={t("page.productionOrder.list.emptyMessage")}
                  emptyIcon={ClipboardList}
                  toolbar={
                    <TableToolbar
                      title={t("page.productionOrder.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="production-order-list-table-status"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("page.productionOrder.list.tableStatus")}
                        </label>
                        <Combobox
                          id="production-order-list-table-status"
                          options={[
                            { value: "all", label: t("page.productionOrder.list.filterAll") },
                            ...Object.entries(statusConfig).map(([k, v]) => ({
                              value: k,
                              label: v.label
                            }))
                          ]}
                          value={statusFilter}
                          onChange={(v) => {
                            setStatusFilter(v);
                            setPage(1);
                          }}
                          placeholder={t("page.productionOrder.list.filterAll")}
                          searchPlaceholder="Cari..."
                        />
                      </div>
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
                          placeholder={t("page.productionOrder.list.searchPlaceholder")}
                          isLoading={isFetching}
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
                    }
                  }}
                />
              </div>

              <Modal
                type="confirm"
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title={t("page.productionOrder.list.modalDeleteTitle")}
                description={t("page.productionOrder.list.modalDeleteDesc")}
                confirmText={t("page.productionOrder.list.modalDeleteConfirm")}
                loading={deleteMutation.isLoading}
                onConfirm={() => deleteMutation.mutate(deleteTarget)}
              />
              {deleteMutation.isLoading && (
                <Loading fullscreen size="lg" label={t("common.loadingData")} />
              )}

              <Modal
                type="confirm"
                open={!!startTarget}
                onOpenChange={(o) => !o && setStartTarget(null)}
                title={t("page.productionOrder.list.modalStartTitle")}
                description={t("page.productionOrder.list.modalStartDesc")}
                confirmText={t("page.productionOrder.list.modalStartConfirm")}
                loading={startMutation.isLoading}
                onConfirm={() => startMutation.mutate(startTarget)}
              />

              <Modal
                type="form"
                open={!!completeTarget}
                onOpenChange={(o) => {
                  if (!o) {
                    setCompleteTarget(null);
                    setCompleteQty("");
                  }
                }}
                title={t("page.productionOrder.list.modalCompleteTitle")}
                description={t("page.productionOrder.list.modalCompleteDesc")}>
                <div className="space-y-3">
                  <label
                    htmlFor="production-order-list-modal-complete-label"
                    className="text-sm font-medium">
                    {t("page.productionOrder.list.modalCompleteLabel")}
                  </label>
                  <Input
                    id="production-order-list-modal-complete-label"
                    type="number"
                    min="1"
                    value={completeQty}
                    onChange={(e) => setCompleteQty(e.target.value)}
                    placeholder={t("page.productionOrder.list.modalCompletePlaceholder")}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="danger"
                    onClick={() => {
                      setCompleteTarget(null);
                      setCompleteQty("");
                    }}>
                    {t("page.productionOrder.list.modalCompleteCancel")}
                  </Button>
                  <Button
                    variant="success"
                    onClick={() =>
                      completeMutation.mutate({ producedQty: parseInt(completeQty) || 0 })
                    }>
                    {t("page.productionOrder.list.modalCompleteConfirm")}
                  </Button>
                </div>
              </Modal>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ProductionOrderList;

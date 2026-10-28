import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  Download,
  Package,
  CheckCircle,
  FileEdit,
  XCircle
} from "lucide-react";
import { canAccess } from "@/utils/permission";
import {
  getAllGoodsReceipt,
  deleteGoodsReceipt,
  exportGoodsReceipt,
  changeGoodsReceiptStatus
} from "@/services/goods-receipt";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import { Combobox } from "@/components/ui/combobox";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import TableActions from "@/components/ui/TableActions";
import { useLocations } from "@/queries/useLocations";

const statusMap = {
  draft: {
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  completed: {
    class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  cancelled: {
    class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
};

const GoodsReceiptList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const MENU_KEY = "/goods-receipt";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const isFiltered = storeFilter !== "all" || statusFilter !== "all" || search !== "";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setStatusFilter("all");
    setSearch("");
    setPage(1);
  };
  const isSuperAdmin = user?.roleType === "super_admin";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["goods-receipts", page, limit, search, statusFilter, storeFilter],
    () =>
      getAllGoodsReceipt({
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        store: storeFilter !== "all" ? storeFilter : undefined
      }),
    { keepPreviousData: true }
  );

  const items = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const stats = data?.stats || {};

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const result = await exportGoodsReceipt({
        status: statusFilter !== "all" ? statusFilter : undefined,
        store: storeFilter !== "all" ? storeFilter : undefined
      });
      const rows = result?.data || [];
      const xlsData = rows.map((r, i) => ({
        [t("page.goodsReceipt.list.export.no")]: i + 1,
        [t("page.goodsReceipt.list.export.receiptNumber")]: r.receiptNumber || "",
        [t("page.goodsReceipt.list.export.poReference")]: r.purchaseOrderData?.orderNumber || "",
        [t("page.goodsReceipt.list.export.receivedDate")]: r.receivedDate
          ? new Date(r.receivedDate).toLocaleDateString("id")
          : "",
        [t("page.goodsReceipt.list.export.store")]: r.storeData?.name || "",
        [t("page.goodsReceipt.list.export.status")]: r.status || "",
        [t("page.goodsReceipt.list.export.itemCount")]: r.items?.length || 0
      }));
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(xlsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t("page.goodsReceipt.list.export.sheetName"));
      XLSX.writeFile(wb, `goods-receipt-${Date.now()}.xlsx`);
      toast.success(t("page.goodsReceipt.list.toast.exportSuccess"), {
        description: t("page.goodsReceipt.list.toast.exportSuccessDesc")
      });
    } catch (err) {
      toast.error(t("page.goodsReceipt.list.toast.exportError"), {
        description: err?.response?.data?.message || err.message
      });
    } finally {
      setExportLoading(false);
    }
  };

  const deleteMutation = useMutation(deleteGoodsReceipt, {
    onSuccess: () => {
      toast.success(t("page.goodsReceipt.list.toast.deleteSuccess"), {
        description: t("page.goodsReceipt.list.toast.deleteSuccessDesc")
      });
      queryClient.invalidateQueries(["goods-receipts"]);
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.goodsReceipt.list.toast.deleteError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const cancelMutation = useMutation((id) => changeGoodsReceiptStatus(id, "cancelled"), {
    onSuccess: () => {
      toast.success(t("page.goodsReceipt.list.toast.cancelSuccess"), {
        description: t("page.goodsReceipt.list.toast.cancelSuccessDesc")
      });
      queryClient.invalidateQueries(["goods-receipts"]);
      setCancelTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.goodsReceipt.list.toast.cancelError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const columns = [
    {
      header: t("page.goodsReceipt.list.table.receiptNumber"),
      stickyLeft: true,
      render: (item) => (
        <span className="font-mono text-xs font-bold text-primary">
          {item.receiptNumber || "-"}
        </span>
      )
    },
    {
      header: t("page.goodsReceipt.list.table.poReference"),
      stickyLeft: true,
      render: (item) => (
        <span className="text-xs">{item.purchaseOrderData?.orderNumber || "-"}</span>
      )
    },
    {
      header: t("page.goodsReceipt.list.table.receivedDate"),
      align: "center",
      render: (item) => (
        <span className="text-xs">
          {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString("id") : "-"}
        </span>
      )
    },
    {
      header: t("page.goodsReceipt.list.table.itemCount"),
      align: "center",
      render: (item) => <span className="font-mono text-sm">{item.items?.length || 0}</span>
    },
    {
      header: t("page.goodsReceipt.list.table.store"),
      render: (item) => <span className="text-sm">{item.storeData?.name || "-"}</span>
    },
    {
      header: t("page.goodsReceipt.list.table.status"),
      align: "center",
      render: (item) => {
        const sc = statusMap[item.status] || statusMap.draft;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sc.class}`}>
            {t(`page.goodsReceipt.list.status.${item.status || "draft"}`)}
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
      header: t("page.goodsReceipt.list.table.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("page.goodsReceipt.list.editTitle") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => (
        <TableActions
          visible={2}
          align="right"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/goods-receipt/detail?id=${item.id}`),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            ...(item.status === "draft"
              ? [
                  {
                    label: t("page.goodsReceipt.list.editTitle"),
                    icon: Edit,
                    onClick: () => navigate(`/edit-goods-receipt?id=${item.id}`)
                  },
                  {
                    label: t("common.delete"),
                    icon: Trash2,
                    danger: true,
                    onClick: () => setDeleteTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "delete")
                  },
                  {
                    label: t("page.goodsReceipt.list.cancelReceipt"),
                    icon: XCircle,
                    danger: true,
                    onClick: () => setCancelTarget(item),
                    hidden: !canAccess(user, MENU_KEY, "delete")
                  }
                ]
              : [])
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
            label: t("breadcrumb.goodsReceipt"),
            i18nKey: "breadcrumb.goodsReceipt"
          }
        ]}
        title={t("page.goodsReceipt.list.title")}
        description={t("page.goodsReceipt.list.description")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportLoading}
            className="gap-1.5">
            <Download size={14} />
            {exportLoading ? "..." : t("common.export")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-goods-receipt")}
            className="shrink-0 gap-2">
            <Plus size={16} /> {t("page.goodsReceipt.list.addButton")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isFetching || isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label={t("page.goodsReceipt.list.stats.total")}
                value={stats.total ?? total}
                icon={Package}
                variant="default"
              />
              <StatCard
                label={t("page.goodsReceipt.list.status.completed")}
                value={stats.completed ?? 0}
                icon={CheckCircle}
                variant="active"
              />
              <StatCard
                label={t("page.goodsReceipt.list.status.draft")}
                value={stats.draft ?? 0}
                icon={FileEdit}
                variant="draft"
              />
              <StatCard
                label={t("page.goodsReceipt.list.status.cancelled")}
                value={stats.cancelled ?? 0}
                icon={XCircle}
                variant="red"
              />
            </div>
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
                          label: t("page.goodsReceipt.list.addButton"),
                          onClick: () => navigate("/add-goods-receipt")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={items}
                  isLoading={isLoading || isFetching}
                  emptyMessage={t("page.goodsReceipt.list.empty")}
                  emptyIcon={FileText}
                  toolbar={
                    <TableToolbar
                      title={t("page.goodsReceipt.list.title")}
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
                          placeholder={t("page.goodsReceipt.list.searchPlaceholder")}
                          isLoading={isFetching}
                        />
                      </div>
                      {isSuperAdmin && (
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="goods-receipt-list-store"
                            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("page.goodsReceipt.detail.store")}
                          </label>
                          <Combobox
                            id="goods-receipt-list-store"
                            options={[
                              {
                                value: "all",
                                label: t("page.goodsReceipt.list.filter.allStores")
                              },
                              ...(locData?.data || []).map((loc) => ({
                                value: loc.id,
                                label: loc.name
                              }))
                            ]}
                            value={storeFilter}
                            onChange={(val) => {
                              setGlobalStoreFilter(val);
                              setPage(1);
                            }}
                            placeholder={t("page.goodsReceipt.list.filter.allStores")}
                            searchPlaceholder={t("common.search")}
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="goods-receipt-list-status"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.status")}
                        </label>
                        <Combobox
                          id="goods-receipt-list-status"
                          options={[
                            {
                              value: "all",
                              label: t("page.goodsReceipt.list.filter.allStatuses")
                            },
                            ...Object.keys(statusMap).map((k) => ({
                              value: k,
                              label: t(`page.goodsReceipt.list.status.${k}`)
                            }))
                          ]}
                          value={statusFilter}
                          onChange={(val) => {
                            setStatusFilter(val);
                            setPage(1);
                          }}
                          placeholder={t("page.goodsReceipt.list.filter.allStatuses")}
                          searchPlaceholder={t("common.search")}
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
                title={t("page.goodsReceipt.list.modal.deleteTitle")}
                description={t("page.goodsReceipt.list.modal.deleteDescription")}
                confirmText={t("page.goodsReceipt.list.modal.confirmDelete")}
                loading={deleteMutation.isLoading}
                onConfirm={() => deleteMutation.mutate(deleteTarget)}
              />
              <Modal
                type="confirm"
                open={!!cancelTarget}
                onOpenChange={(o) => !o && setCancelTarget(null)}
                confirmVariant="destructive"
                title={t("page.goodsReceipt.list.modal.cancelTitle")}
                description={t("page.goodsReceipt.list.modal.cancelDescription", {
                  receiptNumber: cancelTarget?.receiptNumber || ""
                })}
                confirmText={t("page.goodsReceipt.list.cancelConfirm")}
                loading={cancelMutation.isLoading}
                onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
              />
              {deleteMutation.isLoading && (
                <Loading fullscreen size="lg" label={t("common.loadingData")} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default GoodsReceiptList;

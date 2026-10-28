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
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart,
  Check,
  Ban,
  CircleOff
} from "lucide-react";
import { canAccess } from "@/utils/permission";
import {
  getAllGoodsRequest,
  deleteGoodsRequest,
  changeGoodsRequestStatus
} from "@/services/goods-request";
import NoStore from "@/components/ui/NoStore";
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
import { cn } from "@/lib/utils";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const statusMap = {
  pending: {
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  approved: {
    class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  rejected: {
    class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  },
  cancelled: {
    class: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400"
  }
};

const GoodsRequestList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const MENU_KEY = "/goods-request";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
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
    ["goods-requests", page, limit, search, statusFilter, storeFilter],
    () =>
      getAllGoodsRequest({
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

  const deleteMutation = useMutation(deleteGoodsRequest, {
    onSuccess: () => {
      toast.success(t("page.goodsRequest.list.toast.deleteSuccess"), {
        description: t("page.goodsRequest.list.toast.deleteSuccessDesc")
      });
      queryClient.invalidateQueries(["goods-requests"]);
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.goodsRequest.list.toast.deleteError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const statusMutation = useMutation(({ id, status }) => changeGoodsRequestStatus(id, status), {
    onSuccess: (res) => {
      const resStatus = res?.data?.status;
      const isApproved = resStatus === "approved";
      const isCancelled = resStatus === "cancelled";
      const toastKey = isApproved
        ? "page.goodsRequest.list.toast.approveSuccess"
        : isCancelled
          ? "page.goodsRequest.list.toast.cancelSuccess"
          : "page.goodsRequest.list.toast.rejectSuccess";
      const toastDescKey = isApproved
        ? "page.goodsRequest.list.toast.approveSuccessDesc"
        : isCancelled
          ? "page.goodsRequest.list.toast.cancelSuccessDesc"
          : "page.goodsRequest.list.toast.rejectSuccessDesc";
      toast.success(t(toastKey), {
        description: t(toastDescKey)
      });
      queryClient.invalidateQueries(["goods-requests"]);
      queryClient.invalidateQueries(["purchase-orders"]);
      setApproveTarget(null);
      setRejectTarget(null);
      setCancelTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.goodsRequest.list.toast.statusError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const columns = [
    {
      header: t("page.goodsRequest.list.table.requestNumber"),
      stickyLeft: true,
      render: (item) => (
        <span className="font-mono text-xs font-bold text-primary">
          {item.requestNumber || "-"}
        </span>
      )
    },
    {
      header: t("page.goodsRequest.list.table.poReference"),
      stickyLeft: true,
      render: (item) =>
        item.purchaseOrderData?.orderNumber ? (
          <button
            onClick={() => navigate(`/purchase-order/detail?id=${item.purchaseOrderData.id}`)}
            className="font-mono text-xs text-blue-600 hover:underline">
            {item.purchaseOrderData.orderNumber}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
    },
    {
      header: t("page.goodsRequest.list.table.requestedBy"),
      render: (item) => <span className="text-sm">{item.requestedBy || "-"}</span>
    },
    {
      header: t("page.goodsRequest.list.table.itemCount"),
      align: "center",
      render: (item) => (
        <span className="font-mono text-sm">
          {item.totalItems || item.items?.length || 0} items
        </span>
      )
    },
    {
      header: t("page.goodsRequest.list.table.totalQty"),
      align: "center",
      render: (item) => <span className="font-mono text-sm">{item.totalQty || 0}</span>
    },
    {
      header: t("page.goodsRequest.list.table.store"),
      render: (item) => <span className="text-sm">{item.store?.name || "-"}</span>
    },
    {
      header: t("page.goodsRequest.list.table.neededDate"),
      render: (item) => {
        if (!item.neededDate) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(item.neededDate);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        );
      }
    },
    {
      header: t("page.goodsRequest.list.table.status"),
      align: "center",
      render: (item) => {
        const sc = statusMap[item.status] || statusMap.pending;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sc.class}`}>
            {t(`page.goodsRequest.list.status.${item.status || "pending"}`)}
          </span>
        );
      }
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
      header: t("page.goodsRequest.list.table.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Check, label: t("page.goodsRequest.list.approve") },
        { icon: Ban, label: t("page.goodsRequest.list.reject") },
        { icon: CircleOff, label: t("page.goodsRequest.list.cancel") },
        { icon: Edit, label: t("page.goodsRequest.list.editTitle") },
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
              onClick: () => navigate(`/goods-request/detail?id=${item.id}`),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            ...(item.status === "pending"
              ? [
                  {
                    label: t("page.goodsRequest.list.approve"),
                    icon: Check,
                    onClick: () => setApproveTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "update")
                  },
                  {
                    label: t("page.goodsRequest.list.reject"),
                    icon: Ban,
                    onClick: () => setRejectTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "delete")
                  },
                  {
                    label: t("page.goodsRequest.list.editTitle"),
                    icon: Edit,
                    onClick: () => navigate(`/edit-goods-request?id=${item.id}`),
                    hidden: !canAccess(user, MENU_KEY, "update")
                  },
                  {
                    label: t("common.delete"),
                    icon: Trash2,
                    danger: true,
                    onClick: () => setDeleteTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "delete")
                  }
                ]
              : []),
            ...(item.status === "approved"
              ? [
                  {
                    label: t("page.goodsRequest.list.cancel"),
                    icon: CircleOff,
                    onClick: () => setCancelTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "update")
                  },
                  ...(item.purchaseOrderData
                    ? [
                        {
                          label: t("page.goodsRequest.list.viewPO"),
                          icon: ShoppingCart,
                          onClick: () =>
                            navigate(`/purchase-order/detail?id=${item.purchaseOrderData.id}`)
                        }
                      ]
                    : [])
                ]
              : []),
            ...(item.status === "cancelled"
              ? [
                  {
                    label: t("page.goodsRequest.list.editTitle"),
                    icon: Edit,
                    onClick: () => navigate(`/edit-goods-request?id=${item.id}`),
                    hidden: !canAccess(user, MENU_KEY, "update")
                  },
                  {
                    label: t("common.delete"),
                    icon: Trash2,
                    danger: true,
                    onClick: () => setDeleteTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "delete")
                  }
                ]
              : [])
          ]}
        />
      )
    }
  ];

  const renderExpandedItems = (row) => {
    const items = row.items || [];
    const groups = [];
    // ponytail: Map menghindari object injection (Codacy)
    const groupMap = new Map();
    for (const it of items) {
      const sid = it.supplier;
      const key = sid ? String(sid) : "unassigned";
      if (!groupMap.has(key)) {
        const group = {
          supplierId: key,
          supplierName: sid
            ? it.supplierData?.name || `Supplier #${sid}`
            : t("page.goodsRequest.list.unassignedSupplier"),
          items: []
        };
        groupMap.set(key, group);
        groups.push(group);
      }
      groupMap.get(key).items.push(it);
    }

    if (groups.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("page.goodsRequest.list.emptyItems")}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {groups.map((g) => (
          <div
            key={g.supplierId}
            className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b">
              <span className="font-semibold text-foreground">{g.supplierName}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {g.items.length}{" "}
                {g.items.length > 1
                  ? t("page.goodsRequest.list.items")
                  : t("page.goodsRequest.list.item")}
              </span>
            </div>
            <HorizontalScrollArea>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.goodsRequest.list.table.item")}
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.goodsRequest.list.table.qty")}
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.goodsRequest.list.table.unit")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {g.items.map((it, i) => (
                    <tr
                      key={it.id || i}
                      className={cn(
                        "transition-colors",
                        i % 2 === 0
                          ? "bg-white dark:bg-slate-950"
                          : "bg-slate-50/50 dark:bg-slate-900/50",
                        "hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                      )}>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {it.ingredientName || it.productName || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-center font-medium text-foreground">
                        {it.qty || 0}
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">
                        {it.unit || "pcs"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </HorizontalScrollArea>
          </div>
        ))}
      </div>
    );
  };

  const exportData = async () => {
    setExportLoading(true);
    try {
      const xlsData = items.map((r, i) => ({
        [t("page.goodsRequest.list.export.no")]: i + 1,
        [t("page.goodsRequest.list.export.requestNumber")]: r.requestNumber || "",
        [t("page.goodsRequest.list.export.requestedBy")]: r.requestedBy || "",
        [t("page.goodsRequest.list.export.store")]: r.store?.name || "",
        [t("page.goodsRequest.list.export.status")]: r.status || "",
        [t("page.goodsRequest.list.export.itemCount")]: r.totalItems || 0,
        [t("page.goodsRequest.list.export.totalQty")]: r.totalQty || 0,
        [t("page.goodsRequest.list.export.createdAt")]: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("id")
          : ""
      }));
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(xlsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t("page.goodsRequest.list.export.sheetName"));
      XLSX.writeFile(wb, `goods-request-${Date.now()}.xlsx`);
      toast.success(t("page.goodsRequest.list.toast.exportSuccess"), {
        description: t("page.goodsRequest.list.toast.exportSuccessDesc")
      });
    } catch (err) {
      toast.error(t("page.goodsRequest.list.toast.exportError"), {
        description: err?.message
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.dashboard"), href: "/dashboard-super-admin" },
          { label: t("breadcrumb.goodsRequest") }
        ]}
        title={t("page.goodsRequest.list.title")}
        description={t("page.goodsRequest.list.description")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            disabled={exportLoading}
            className="gap-1.5">
            <Download size={14} />
            {exportLoading ? "..." : t("common.export")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-goods-request")}
            className="shrink-0 gap-2">
            <Plus size={16} /> {t("page.goodsRequest.list.addButton")}
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
                label={t("page.goodsRequest.list.stats.total")}
                value={stats.total ?? total}
                icon={ClipboardList}
                variant="default"
              />
              <StatCard
                label={t("page.goodsRequest.list.status.pending")}
                value={stats.pending ?? 0}
                icon={Clock}
                variant="draft"
              />
              <StatCard
                label={t("page.goodsRequest.list.status.approved")}
                value={stats.approved ?? 0}
                icon={CheckCircle}
                variant="active"
              />
              <StatCard
                label={t("page.goodsRequest.list.status.rejected")}
                value={stats.rejected ?? 0}
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
                          label: t("page.goodsRequest.list.addButton"),
                          onClick: () => navigate("/add-goods-request")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={items}
                  isLoading={isLoading || isFetching}
                  emptyMessage={t("page.goodsRequest.list.empty")}
                  emptyIcon={FileText}
                  renderExpandedRow={renderExpandedItems}
                  getRowCanExpand={(row) => (row.items || []).length > 0}
                  toolbar={
                    <TableToolbar
                      title={t("page.goodsRequest.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Cari
                        </label>
                        <SearchInput
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                            setPage(1);
                          }}
                          placeholder={t("page.goodsRequest.list.searchPlaceholder")}
                          isLoading={isFetching}
                        />
                      </div>
                      {isSuperAdmin && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Store
                          </label>
                          <Combobox
                            options={[
                              {
                                value: "all",
                                label: t("page.goodsRequest.list.filter.allStores")
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
                            placeholder={t("page.goodsRequest.list.filter.allStores")}
                            searchPlaceholder={t("common.search")}
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.status")}
                        </label>
                        <Combobox
                          options={[
                            {
                              value: "all",
                              label: t("page.goodsRequest.list.filter.allStatuses")
                            },
                            ...Object.keys(statusMap).map((k) => ({
                              value: k,
                              label: t(`page.goodsRequest.list.status.${k}`)
                            }))
                          ]}
                          value={statusFilter}
                          onChange={(val) => {
                            setStatusFilter(val);
                            setPage(1);
                          }}
                          placeholder={t("page.goodsRequest.list.filter.allStatuses")}
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
                title={t("page.goodsRequest.list.modal.deleteTitle")}
                description={t("page.goodsRequest.list.modal.deleteDescription")}
                confirmText={t("page.goodsRequest.list.modal.confirmDelete")}
                loading={deleteMutation.isLoading}
                onConfirm={() => deleteMutation.mutate(deleteTarget)}
              />
              <Modal
                type="confirm"
                open={!!approveTarget}
                onOpenChange={(o) => !o && setApproveTarget(null)}
                title={t("page.goodsRequest.list.modal.approveTitle")}
                description={t("page.goodsRequest.list.modal.approveDescription")}
                confirmText={t("page.goodsRequest.list.modal.confirmApprove")}
                loading={statusMutation.isLoading}
                onConfirm={() => statusMutation.mutate({ id: approveTarget, status: "approved" })}
              />
              <Modal
                type="confirm"
                open={!!rejectTarget}
                onOpenChange={(o) => !o && setRejectTarget(null)}
                title={t("page.goodsRequest.list.modal.rejectTitle")}
                description={t("page.goodsRequest.list.modal.rejectDescription")}
                confirmText={t("page.goodsRequest.list.modal.confirmReject")}
                loading={statusMutation.isLoading}
                onConfirm={() => statusMutation.mutate({ id: rejectTarget, status: "rejected" })}
              />
              <Modal
                type="confirm"
                open={!!cancelTarget}
                onOpenChange={(o) => !o && setCancelTarget(null)}
                title={t("page.goodsRequest.list.modal.cancelTitle")}
                description={t("page.goodsRequest.list.modal.cancelDescription")}
                confirmText={t("page.goodsRequest.list.modal.confirmCancel")}
                loading={statusMutation.isLoading}
                onConfirm={() => statusMutation.mutate({ id: cancelTarget, status: "cancelled" })}
              />
              {(deleteMutation.isLoading || statusMutation.isLoading) && (
                <Loading fullscreen size="lg" label={t("common.loadingData")} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default GoodsRequestList;

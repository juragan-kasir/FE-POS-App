import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  FileDown,
  ClipboardList,
  X,
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { getStockOpname, deleteStockOpname, exportStockOpnameByIds } from "@/services/stock";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import NoStore from "@/components/ui/NoStore";
import StoreFilter from "@/components/ui/StoreFilter";
import PageHeader from "@/components/ui/PageHeader";
import { Combobox } from "@/components/ui/combobox";
import { useLocations } from "@/queries/useLocations";

const StockOpnameList = () => {
  const { t } = useTranslation();

  const statusColors = {
    completed: {
      bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
      dot: "bg-green-500",
      label: t("page.stockOpname.status.completed")
    },
    draft: {
      bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
      dot: "bg-yellow-500",
      label: t("page.stockOpname.status.draft")
    },
    cancelled: {
      bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
      dot: "bg-red-500",
      label: t("page.stockOpname.status.cancelled")
    }
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/stock-opname";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [noDataModal, setNoDataModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  const isFiltered = search !== "" || storeFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setGlobalStoreFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["stockOpname", page, limit, search, storeFilter, statusFilter],
    () =>
      getStockOpname({
        page,
        limit,
        search: search || undefined,
        location: storeFilter !== "all" ? storeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      }),
    { keepPreviousData: true }
  );

  const items = data?.data || data?.stockOpname || [];
  const total = data?.pagination?.total || data?.total || 0;
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1;

  useEffect(() => {
    setSelectedItems([]);
  }, [page, search, storeFilter, statusFilter]);

  // Remove completed items from selection
  useEffect(() => {
    setSelectedItems((prev) =>
      prev.filter((id) => {
        const item = items.find((it) => (it.id || it._id) === id);
        return item && item.status !== "completed";
      })
    );
  }, [items]);

  const handleExportSelected = useCallback(() => {
    exportStockOpnameByIds(selectedItems)
      .then(() => {
        toast.success(t("common.success"), {
          description: t("page.stockOpname.list.exportSuccess", { count: selectedItems.length })
        });
        setSelectedItems([]);
      })
      .catch((err) => {
        toast.error(t("common.failed"), {
          description:
            err?.response?.data?.message || err.message || t("page.stockOpname.list.exportFailed")
        });
      });
  }, [selectedItems]);

  const deleteMutation = useMutation(deleteStockOpname, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.stockOpname.list.deleteSuccess") });
      queryClient.invalidateQueries(["stockOpname"]);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.failed"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget);
    }
  };

  const toastIdRef = React.useRef(null);

  useEffect(() => {
    if (selectedItems.length > 0) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toastIdRef.current = toast(
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {t("page.stockOpname.list.exportTitle")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("page.stockOpname.list.exportSelected", { count: selectedItems.length })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canAccess(user, MENU_KEY, "export") && (
              <button
                onClick={handleExportSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <FileDown size={14} />
                {t("page.stockOpname.list.export")}
              </button>
            )}
            <button
              onClick={() => {
                setSelectedItems([]);
                if (toastIdRef.current) {
                  toast.dismiss(toastIdRef.current);
                  toastIdRef.current = null;
                }
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>,
        { duration: Infinity, position: "bottom-center" }
      );
    } else {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };
  }, [selectedItems, handleExportSelected]);

  const columns = [
    {
      header: t("page.stockOpname.list.columns.auditDate"),
      align: "center",
      render: (item) => (
        <span className="font-mono text-xs text-foreground">{item.auditDate || "-"}</span>
      )
    },
    {
      header: t("page.stockOpname.list.columns.auditId"),
      align: "center",
      render: (item) => (
        <span className="text-xs font-bold text-primary">{item.opnameNumber || "-"}</span>
      )
    },
    {
      header: t("page.stockOpname.list.columns.warehouse"),
      align: "center",
      render: (item) => (
        <span className="text-sm font-medium text-foreground">{item.store?.name || "-"}</span>
      )
    },
    {
      header: t("page.stockOpname.list.columns.auditor"),
      align: "center",
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-[10px] font-bold">
            {item.auditor
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2) || "NA"}
          </div>
          <span className="text-sm text-foreground">{item.auditor || "-"}</span>
        </div>
      )
    },
    {
      header: t("page.stockOpname.list.columns.totalItems"),
      align: "center",
      render: (item) => (
        <span className="text-sm font-mono text-foreground">{item.stats?.totalItems ?? "-"}</span>
      )
    },
    {
      header: t("page.stockOpname.list.columns.status"),
      align: "center",
      render: (item) => {
        const status = item.status || "draft";
        const statusStyle = safeGet(statusColors, status, statusColors.draft);
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${statusStyle.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} mr-1.5`} />
            {statusStyle.label}
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
      header: t("page.stockOpname.list.columns.actions"),
      align: "right",
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => {
        const isDraft = item.status === "draft";
        return (
          <TableActions
            align="right"
            items={[
              {
                label: t("common.view"),
                icon: Eye,
                onClick: () => navigate(`/stock-opname/detail?id=${item.id || item._id}`),
                hidden: !canAccess(user, MENU_KEY, "view")
              },
              ...(isDraft
                ? [
                    {
                      label: t("common.edit"),
                      icon: Edit,
                      onClick: () => navigate(`/add-stock-opname?id=${item.id || item._id}`),
                      hidden: !canAccess(user, MENU_KEY, "edit")
                    },
                    {
                      label: t("common.delete"),
                      icon: Trash2,
                      danger: true,
                      onClick: () => setDeleteTarget(item.id || item._id),
                      hidden: !canAccess(user, MENU_KEY, "delete")
                    }
                  ]
                : [])
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
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.stockOpname.list.title"),
            i18nKey: "page.stockOpname.list.title"
          }
        ]}
        title={t("page.stockOpname.list.title")}
        description={t("page.stockOpname.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-stock-opname")}
            className="shrink-0 gap-2">
            <Plus size={16} />
            {t("page.stockOpname.list.addButton")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isFetching || isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label={t("page.stockOpname.stats.totalAudit")}
                value={data?.stats?.total ?? total ?? 0}
                icon={ClipboardCheck}
                variant="default"
                subtitle={t("page.stockOpname.stats.trend")}
              />
              <StatCard
                label={t("page.stockOpname.status.completed")}
                value={data?.stats?.completed ?? 0}
                icon={CheckCircle}
                variant="active"
                subtitle={t("page.stockOpname.stats.completedSub")}
              />
              <StatCard
                label={t("page.stockOpname.status.draft")}
                value={data?.stats?.draft ?? 0}
                icon={AlertTriangle}
                variant="draft"
                subtitle={t("page.stockOpname.stats.draftSub")}
              />
              <StatCard
                label={t("page.stockOpname.status.cancelled")}
                value={data?.stats?.cancelled ?? 0}
                icon={XCircle}
                variant="inactive"
                subtitle={t("page.stockOpname.stats.cancelledSub")}
              />
            </div>
          )}

          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div>
              <DataTable
                columns={columns}
                data={items}
                isLoading={isLoading || isFetching}
                emptyMessage={t("page.stockOpname.list.empty")}
                emptyIcon={ClipboardList}
                selectable
                selectedIds={selectedItems}
                onSelectionChange={setSelectedItems}
                isSelectable={(row) => row.status !== "completed"}
                rowClassName={(row) => {
                  const status = row.status || "draft";
                  const classes = [];
                  if (selectedItems.includes(row.id || row._id)) classes.push("bg-primary/5");
                  if (status === "completed") classes.push("bg-green-50/50 dark:bg-green-950/10");
                  if (status === "cancelled") classes.push("bg-red-50/50 dark:bg-red-950/10");
                  return classes.join(" ");
                }}
                toolbar={
                  <TableToolbar
                    title={t("page.stockOpname.list.title")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    {isSuperAdmin && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Store
                        </label>
                        <StoreFilter
                          locations={locData?.data || []}
                          value={storeFilter}
                          onChange={(val) => {
                            setGlobalStoreFilter(val);
                            setPage(1);
                          }}
                          isSuperAdmin={isSuperAdmin}
                          t={t}
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.stockOpname.list.allStatus")}
                      </label>
                      <Combobox
                        options={[
                          { value: "all", label: t("page.stockOpname.list.allStatus") },
                          { value: "draft", label: t("page.stockOpname.status.draft") },
                          { value: "completed", label: t("page.stockOpname.status.completed") },
                          { value: "cancelled", label: t("page.stockOpname.status.cancelled") }
                        ]}
                        value={statusFilter}
                        onChange={(val) => {
                          setStatusFilter(val);
                          setPage(1);
                        }}
                        placeholder={t("page.stockOpname.list.allStatus")}
                        searchPlaceholder={t("common.search")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Cari
                      </label>
                      <SearchInput
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.stockOpname.list.searchPlaceholder")}
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
          )}

          <Modal
            type="confirm"
            open={noDataModal}
            onOpenChange={setNoDataModal}
            title={t("page.stockOpname.list.noDataTitle")}
            description={t("page.stockOpname.list.noDataDesc")}
            confirmText={t("page.stockOpname.list.addButton")}
            onConfirm={() => setTimeout(() => navigate("/add-stock-opname"), 150)}
          />

          <Modal
            type="confirm"
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title={t("page.stockOpname.modal.deleteTitle")}
            description={t("page.stockOpname.modal.deleteDesc")}
            confirmText={t("page.stockOpname.modal.deleteConfirm")}
            loading={deleteMutation.isLoading}
            onConfirm={confirmDelete}
          />
          {deleteMutation.isLoading && (
            <Loading fullscreen size="lg" label={t("common.loadingData")} />
          )}
        </>
      )}
    </div>
  );
};

export default StockOpnameList;

import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NoStore from "@/components/ui/NoStore";
import { AlertTriangle, Package, ShoppingBasket, Store, Zap } from "lucide-react";
import { getLowStockAll, autoGeneratePOFromLowStock } from "@/services/stock";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import AbortController from "@/components/organism/abort-controller";
import { TipsCard } from "@/components/ui/tips-card";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import Modal from "@/components/organism/modal";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";

const LowStockAll = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const sidebarCollapsed = useSidebar();
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState(false);
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: locData, isLoading: isLoadingLocations } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locData?.data || [];

  const isFiltered = search !== "" || storeFilter !== "all" || typeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setGlobalStoreFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const { data, isLoading, isError, refetch } = useQuery(
    ["low-stock-all", page, limit, storeFilter, typeFilter, search],
    () =>
      getLowStockAll({
        page,
        limit,
        store: storeFilter !== "all" ? storeFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        search: search || undefined
      }),
    { keepPreviousData: true }
  );

  const autoGenerateMutation = useMutation(autoGeneratePOFromLowStock, {
    onSuccess: (res) => {
      const data = res?.data;
      toast.success(t("common.success"), {
        description: t("page.lowStock.autoPOSuccess", {
          count: data?.purchaseOrders?.length || 0,
          items: data?.totalItems || 0
        })
      });
      queryClient.invalidateQueries(["low-stock-all"]);
      setConfirmModal(false);
      navigate("/purchase-order");
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
      setConfirmModal(false);
    }
  });

  const items = data?.data?.items || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || 1;
  const stats = data?.data?.stats || {};
  const statCards = [
    {
      label: t("page.lowStockAll.totalLowStock"),
      value: String(stats.totalLowStock ?? 0),
      icon: "inventory_2",
      variant: "default"
    },
    {
      label: t("page.lowStockAll.products"),
      value: String(stats.totalProducts ?? 0),
      icon: "package_2",
      variant: "active"
    },
    {
      label: t("page.lowStockAll.ingredients"),
      value: String(stats.totalIngredients ?? 0),
      icon: "nutrition",
      variant: "draft"
    },
    {
      label: t("page.lowStockAll.storesAffected"),
      value: String(stats.totalStores ?? 0),
      icon: "store",
      variant: "default"
    },
    {
      label: t("page.lowStockAll.outOfStock"),
      value: String(stats.totalOutOfStock ?? 0),
      icon: "block",
      variant: "inactive"
    }
  ];

  const getStockStatus = (stock) => {
    if (stock <= 0) {
      return {
        label: "Habis",
        cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
      };
    }
    return {
      label: "Menipis",
      cls: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
    };
  };

  const columns = [
    {
      header: "No",
      render: (_row, idx) => String((page - 1) * limit + idx + 1),
      align: "center"
    },
    {
      header: "Toko",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Store size={14} className="text-muted-foreground shrink-0" />
          <span className="font-medium">{row.storeName || "Unknown"}</span>
        </div>
      )
    },
    {
      header: "Nama",
      accessor: "name"
    },
    {
      header: "Tipe",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.type === "product" ? (
            <Package size={14} className="text-destructive" />
          ) : (
            <ShoppingBasket size={14} className="text-orange-500" />
          )}
          <span className="text-xs font-medium">{row.type}</span>
        </div>
      )
    },
    {
      header: "Stok",
      render: (row) => (
        <span className="font-semibold font-mono">{Number(row.stock).toLocaleString("id-ID")}</span>
      ),
      align: "right"
    },
    {
      header: "Min. Stok",
      render: (row) => (
        <span className="text-muted-foreground font-mono">
          {Number(row.minStock).toLocaleString("id-ID")}
        </span>
      ),
      align: "right"
    },
    {
      header: "Satuan",
      render: (row) => row.unit || "pcs"
    },
    {
      header: "Status",
      render: (row) => {
        const status = getStockStatus(row.stock);
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.cls}`}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${row.stock <= 0 ? "bg-red-500" : "bg-orange-500"}`}
            />
            {status.label}
          </span>
        );
      }
    }
  ];

  const filters = (
    <TableToolbar title={t("sidebar.lowStockAll")} onReset={resetFilters} isFiltered={isFiltered}>
      {isLoadingLocations || isLoading
        ? [
            <Skeleton key="s1" className="h-9 w-full rounded-md" />,
            <Skeleton key="s2" className="h-9 w-full rounded-md" />,
            <Skeleton key="s3" className="h-9 w-full rounded-md" />
          ]
        : [
            <div key="search" className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cari
              </label>
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Cari nama barang..."
                isLoading={isLoading}
              />
            </div>,
            <div key="store" className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Toko
              </label>
              <Select
                value={storeFilter}
                onValueChange={(v) => {
                  setGlobalStoreFilter(v);
                  setPage(1);
                }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Semua Toko" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Toko</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>,
            <div key="type" className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipe
              </label>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="product">Produk</SelectItem>
                  <SelectItem value="ingredient">Bahan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ]}
    </TableToolbar>
  );

  const hasLowStock = stats.totalIngredients > 0 || stats.totalLowStock > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: isSuperAdmin ? "/dashboard-super-admin" : "/dashboard-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("sidebar.lowStockAll") }
        ]}
        title={t("sidebar.lowStockAll")}
        description={t("page.lowStock.description")}
      />

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {statCards.map((card, i) => (
              <div
                key={i}
                style={{
                  width: `calc((100% - ${sidebarCollapsed ? 4 : 2}rem) / ${sidebarCollapsed ? 5 : 3})`,
                  transition: "width 300ms ease"
                }}>
                <StatCard {...card} />
              </div>
            ))}
          </div>

          <TipsCard
            variant="warning"
            title={t("tips.lowStock")}
            tips={[
              t("page.lowStockAll.tip1"),
              t("page.lowStockAll.tip2"),
              t("page.lowStockAll.tip3"),
              t("page.lowStockAll.tip4")
            ]}
          />

          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div>
              <div>
                {hasLowStock && (
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => setConfirmModal(true)}
                      disabled={autoGenerateMutation.isLoading}
                      className="gap-2">
                      <Zap size={16} />
                      {autoGenerateMutation.isLoading
                        ? t("common.processing")
                        : t("page.lowStock.autoGeneratePO")}
                    </Button>
                  </div>
                )}
                <DataTable
                  columns={columns}
                  data={items}
                  isLoading={isLoading}
                  emptyMessage={t("page.lowStock.empty")}
                  emptyIcon={AlertTriangle}
                  toolbar={filters}
                  pagination={{
                    page,
                    totalPages,
                    total,
                    onPageChange: setPage,
                    showingText: `Menampilkan ${items.length} dari ${total} data`,
                    pageSize: limit,
                    onPageSizeChange: (v) => {
                      setLimit(v);
                      setPage(1);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={confirmModal}
        onOpenChange={setConfirmModal}
        type="confirm"
        title={t("page.lowStock.autoPOConfirmTitle")}
        description={t("page.lowStock.autoPOConfirmDesc")}
        confirmText={t("common.yes")}
        cancelText={t("common.cancel")}
        loading={autoGenerateMutation.isLoading}
        onConfirm={() => autoGenerateMutation.mutate()}
      />
    </div>
  );
};

export default LowStockAll;

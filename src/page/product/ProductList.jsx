import React, { useState, useEffect } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Package,
  Loader2,
  Eye,
  Boxes,
  CheckCircle,
  XCircle,
  FileEdit
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllProductTable,
  deleteProduct,
  downloadProductTemplate,
  downloadProductExcel
} from "@/services/product";
import { getAllCategoryActive } from "@/services/category";
import NoStore from "@/components/ui/NoStore";
import { Button } from "@/components/ui/button";
import StoreFilter from "@/components/ui/StoreFilter";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import PageHeader from "@/components/ui/PageHeader";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import StatCard from "@/components/ui/StatCard";
import { uploadProductExcel } from "@/services/product";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import { canAccess } from "@/utils/permission";
import { Combobox } from "@/components/ui/combobox";
import TableActions from "@/components/ui/TableActions";
import { useLocations } from "@/queries/useLocations";
import { isInventoryItemMode, usesProductStock } from "@/lib/inventory-mode";

const ProductList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [searchParams] = useSearchParams();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(12);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [statusFilter, setStatusFilter] = useState("all");

  const isFiltered =
    storeFilter !== "all" ||
    statusFilter !== "all" ||
    search !== "" ||
    categoryFilter !== "" ||
    sortFilter !== "";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setStatusFilter("all");
    setSearch("");
    setCategoryFilter("");
    setSortFilter("");
    setPage(1);
  };

  const user = cookie?.user;
  const MENU_KEY = "/product-list";
  const role = user?.roleType || "";
  const isSuperAdmin = role === "super_admin";
  const locationParam = searchParams.get("location");
  const effectiveLocation = isSuperAdmin
    ? storeFilter && storeFilter !== "all"
      ? storeFilter
      : ""
    : locationParam || "";

  const { data: locData, isLoading: isLoadingLocations } = useLocations("active", {
    enabled: role === "super_admin"
  });

  useEffect(() => {
    if (role !== "super_admin" || isLoadingLocations) return;
    // if (!locationParam && !storeFilter) {
    //   navigate("/location-list", { replace: true });
    // }
  }, [role, locData, locationParam, storeFilter, isLoadingLocations, navigate]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["products", page, limit, storeFilter, search, categoryFilter, sortFilter, statusFilter],
    () =>
      getAllProductTable({
        location: effectiveLocation,
        page,
        limit,
        statusProduct: statusFilter,
        search,
        category: categoryFilter,
        sort: sortFilter
      }),
    { keepPreviousData: true }
  );

  const { data: categoriesData } = useQuery(
    ["categories-active", storeFilter],
    () => {
      const loc = isSuperAdmin ? (storeFilter === "all" ? "" : storeFilter) : effectiveLocation;
      return getAllCategoryActive({ location: loc });
    },
    {}
  );

  const categories = categoriesData?.data || [];

  const products = data?.data || data?.products || [];
  const total = data?.total || data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1;
  const stats = data?.stats || { total: 0, active: 0, nonActive: 0, draft: 0 };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const deleteMutation = useMutation(deleteProduct, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.product.toast.deleteSuccess") });
      queryClient.invalidateQueries(["products"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), { description: err?.response?.data?.message || err.message });
    }
  });

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget });
      setDeleteTarget(null);
    }
  };

  const getAvailableBadge = (product) => {
    // BRD BR-02/BR-03: a recipe or inventory-item product has no stock of its
    // own (0) — its ingredients or item are checked at the cashier instead.
    if (!usesProductStock(product)) {
      return {
        label: t("page.product.status.available"),
        className:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
      };
    }
    const stock = product.stock || product.quantity || 0;
    if (stock <= 0) {
      return {
        label: t("page.product.status.outOfStock"),
        className: "bg-destructive/10 text-destructive border border-destructive/20"
      };
    }
    const minStock = product.minStock || 10;
    if (stock <= minStock) {
      return {
        label: t("page.product.status.lowStock"),
        className:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
      };
    }
    return {
      label: t("page.product.status.available"),
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
    };
  };

  const getProductStatusBadge = (product) => {
    const status = product.status || (product.isActive ? "active" : "inactive");
    if (status === "draft") {
      return {
        label: t("common.draft"),
        className:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
      };
    }
    if (status === "active") {
      return {
        label: t("common.active"),
        className:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
      };
    }
    return {
      label: t("common.inactive"),
      className:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
    };
  };

  const renderTax = (tax) => {
    if (!tax) return "-";
    try {
      const parsed = typeof tax === "string" ? JSON.parse(tax) : tax;
      return parsed.name || "-";
    } catch {
      return "-";
    }
  };

  const columns = [
    {
      header: t("page.product.table.image"),
      render: (product) => {
        const imageUrl = product.image || product.images?.[0];
        return (
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package size={16} className="text-muted-foreground" />
            )}
          </div>
        );
      }
    },
    {
      header: t("page.product.table.name"),
      render: (product) => (
        <div>
          <p className="font-medium text-foreground text-sm">{product.nameProduct}</p>
          <p className="text-xs text-muted-foreground font-mono">{product.sku || "-"}</p>
        </div>
      )
    },
    {
      header: t("page.product.table.barcode"),
      render: (product) => (
        <span className="text-sm font-mono text-foreground">{product.barcode || "-"}</span>
      )
    },
    {
      header: t("page.product.table.brand"),
      render: (product) => <span className="text-sm text-foreground">{product.brand || "-"}</span>
    },
    {
      header: t("page.product.table.category"),
      render: (product) => (
        <span className="text-sm text-foreground">
          {product.nameCategory || product.category?.name || "-"}
        </span>
      )
    },
    {
      header: t("page.product.table.store"),
      render: (product) => (
        <span className="text-sm text-muted-foreground">
          {Array.isArray(product.storeList) && product.storeList.length > 0
            ? product.storeList.map((s) => s.name || `Store #${s.id}`).join(", ")
            : t("page.product.allStores")}
        </span>
      )
    },
    {
      header: t("page.product.table.productType"),
      render: (product) => (
        <span className="text-sm text-foreground">
          {product.tipeProduk === "bahan_baku"
            ? t("page.product.form.tipeProdukBahanBaku")
            : product.tipeProduk === "menu"
              ? t("page.product.form.tipeProdukMenu")
              : product.tipeProduk || t("page.product.form.tipeProdukMenu")}
        </span>
      )
    },
    {
      header: t("page.product.table.price"),
      align: "right",
      render: (product) => (
        <span className="font-semibold text-foreground text-sm">
          {formatCurrencyRupiah(product.price || product.harga || 0)}
        </span>
      )
    },
    {
      header: t("page.product.table.stock"),
      render: (product) => {
        if (!usesProductStock(product)) {
          return (
            <span className="text-xs text-muted-foreground">
              {t(
                isInventoryItemMode(product.inventoryMode)
                  ? "page.product.table.stockFromItem"
                  : "page.product.table.stockFromRecipe"
              )}
            </span>
          );
        }
        const stock = product.stock || product.quantity || 0;
        return (
          <span
            className={`text-sm font-mono ${stock <= 0 ? "text-destructive font-semibold" : stock <= 10 ? "text-orange-600 font-semibold" : "text-foreground"}`}>
            {stock} {product.unit || ""}
          </span>
        );
      }
    },
    {
      header: t("page.product.table.available"),
      render: (product) => {
        const badge = getAvailableBadge(product);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight ${badge.className}`}>
            {badge.label}
          </span>
        );
      }
    },
    {
      header: t("page.product.table.productAvailable"),
      render: (product) => {
        const available = product.isAvailable !== false;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight ${
              available
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}>
            {available ? t("page.product.form.yes") : t("page.product.form.no")}
          </span>
        );
      }
    },
    {
      header: t("page.product.table.estimationTime"),
      render: (product) => {
        const minutes = product.estimationTime || 0;
        return (
          <span className="text-sm text-foreground">
            {minutes > 0 ? `${minutes} ${t("page.product.form.minutes")}` : "-"}
          </span>
        );
      }
    },
    {
      header: t("page.product.table.tax"),
      render: (product) => <span className="text-sm text-foreground">{renderTax(product.tax)}</span>
    },
    {
      header: t("page.product.table.point"),
      align: "right",
      render: (product) => (
        <span className="text-sm font-mono text-foreground">
          {formatCurrencyRupiah(product.point || 0)}
        </span>
      )
    },
    {
      header: t("page.product.table.redeemPoints"),
      align: "right",
      render: (product) => (
        <span className="text-sm font-mono text-foreground">
          {formatCurrencyRupiah(product.redeemPoints || 0)}
        </span>
      )
    },
    {
      header: t("page.product.table.status"),
      render: (product) => {
        const badge = getProductStatusBadge(product);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight ${badge.className}`}>
            {badge.label}
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
      header: t("page.product.table.createdAt"),
      render: (product) => {
        if (!product.createdAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(product.createdAt);
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
      header: t("page.product.table.updatedAt"),
      render: (product) => {
        if (!product.updatedAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(product.updatedAt);
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
      header: t("common.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (product) => (
        <TableActions
          visible={2}
          align="right"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/detail-product/${product.id || product._id}`),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/edit-product?id=${product.id || product._id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => handleDelete(product.id || product._id),
              hidden: !canAccess(user, MENU_KEY, "delete")
            }
          ]}
        />
      )
    }
  ];

  const renderPageActions = () => (
    <>
      {canAccess(user, MENU_KEY, "export") && (
        <Button
          variant="outline"
          disabled={isDownloadingTemplate}
          onClick={async () => {
            setIsDownloadingTemplate(true);
            try {
              await downloadProductTemplate();
              toast.success(t("common.success"), {
                description: t("page.product.toast.templateSuccess")
              });
            } catch (err) {
              toast.error(t("common.error"), {
                description:
                  err?.response?.data?.message ||
                  err.message ||
                  t("page.product.toast.templateError")
              });
            } finally {
              setIsDownloadingTemplate(false);
            }
          }}>
          {isDownloadingTemplate ? (
            <Loader2 size={16} className="mr-1 animate-spin" />
          ) : (
            <Download size={16} className="mr-1" />
          )}
          {t("page.product.button.downloadTemplate")}
        </Button>
      )}
      {canAccess(user, MENU_KEY, "export") && (
        <Button
          variant="general"
          disabled={isDownloadingData}
          onClick={async () => {
            setIsDownloadingData(true);
            try {
              await downloadProductExcel();
              toast.success(t("common.success"), {
                description: t("page.product.toast.dataSuccess")
              });
            } catch (err) {
              toast.error(t("common.error"), {
                description:
                  err?.response?.data?.message || err.message || t("page.product.toast.dataError")
              });
            } finally {
              setIsDownloadingData(false);
            }
          }}>
          {isDownloadingData ? (
            <Loader2 size={16} className="mr-1 animate-spin" />
          ) : (
            <Download size={16} className="mr-1" />
          )}
          {t("page.product.button.export")}
        </Button>
      )}
      {canAccess(user, MENU_KEY, "import") && <span className="w-px h-7 bg-border mx-1" />}
      {canAccess(user, MENU_KEY, "import") && (
        <Button
          data-tour="product-import"
          variant="import"
          onClick={() => setUploadModalOpen(true)}>
          <Upload size={16} className="mr-1" />
          {t("page.product.button.import")}
        </Button>
      )}
      {canAccess(user, MENU_KEY, "add") && (
        <Button
          variant="success"
          data-tour="product-add"
          onClick={() => navigate("/add-product")}
          className="shadow-md">
          <Plus size={16} className="mr-1" />
          {t("page.product.button.add")}
        </Button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            href:
              role === "super_admin"
                ? "/dashboard-super-admin"
                : role === "admin"
                  ? "/dashboard-admin"
                  : "/home",
            i18nKey: "breadcrumb.home"
          },
          ...(role === "super_admin" && locationParam
            ? [{ href: "/location-list", i18nKey: "sidebar.kelolaToko" }]
            : []),
          { i18nKey: "breadcrumb.product" }
        ]}
        title={t("page.product.list.title")}
        description={t("page.product.list.description")}>
        {renderPageActions()}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <div data-tour="page-products">
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
                label={t("page.product.stats.total")}
                value={stats.total}
                icon={Boxes}
                variant="default"
              />
              <StatCard
                label={t("page.product.stats.active")}
                value={stats.active}
                icon={CheckCircle}
                variant="active"
              />
              <StatCard
                label={t("page.product.stats.nonActive")}
                value={stats.nonActive}
                icon={XCircle}
                variant="inactive"
              />
              <StatCard
                label={t("page.product.stats.draft")}
                value={stats.draft}
                icon={FileEdit}
                variant="draft"
              />
            </div>
          )}

          <div data-tour="product-table" className="mt-6">
            <DataTable
              emptyAction={
                canAccess(user, MENU_KEY, "add")
                  ? { label: t("page.product.button.add"), onClick: () => navigate("/add-product") }
                  : undefined
              }
              columns={columns}
              data={products}
              isLoading={isLoading || isFetching}
              isError={isError}
              onRetry={refetch}
              emptyMessage={t("page.product.list.empty")}
              emptyIcon={Package}
              toolbar={
                <TableToolbar
                  title={t("page.product.list.title")}
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
                      placeholder={t("page.product.list.searchSku")}
                      isLoading={isFetching}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.goodsReceipt.detail.store")}
                    </label>
                    <StoreFilter
                      locations={locData?.data || []}
                      value={storeFilter}
                      onChange={(v) => {
                        setGlobalStoreFilter(v);
                        setPage(1);
                      }}
                      isSuperAdmin={isSuperAdmin}
                      t={t}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.product.table.category")}
                    </label>
                    <Combobox
                      options={[
                        {
                          value: "",
                          label: `${t("common.all")} ${t("page.product.table.category")}`
                        },
                        ...categories.map((cat) => ({ value: cat.name, label: cat.name }))
                      ]}
                      value={categoryFilter}
                      onChange={(v) => {
                        setCategoryFilter(v);
                        setPage(1);
                      }}
                      placeholder={`${t("common.all")} ${t("page.product.table.category")}`}
                      searchPlaceholder="Cari kategori..."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.product.table.status")}
                    </label>
                    <Combobox
                      options={[
                        { value: "all", label: t("common.all") },
                        { value: "active", label: t("common.active") },
                        { value: "inactive", label: t("common.inactive") },
                        { value: "draft", label: t("common.draft") }
                      ]}
                      value={statusFilter}
                      onChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                      }}
                      placeholder={t("common.all")}
                      searchPlaceholder="Cari status..."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.product.list.filter.newest")}
                    </label>
                    <Combobox
                      options={[
                        { value: "", label: t("page.product.list.filter.newest") },
                        { value: "price-asc", label: t("page.product.list.filter.priceLowHigh") },
                        {
                          value: "price-desc",
                          label: t("page.product.list.filter.priceHighLow")
                        },
                        { value: "stock-asc", label: t("page.product.list.filter.stockLow") }
                      ]}
                      value={sortFilter}
                      onChange={(v) => {
                        setSortFilter(v);
                        setPage(1);
                      }}
                      placeholder={t("page.product.list.filter.newest")}
                      searchPlaceholder="Cari..."
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
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title={t("page.product.modal.deleteTitle")}
            description={t("page.product.modal.deleteDesc")}
            confirmText={t("page.product.modal.deleteConfirm")}
            loading={deleteMutation?.isLoading}
            onConfirm={confirmDelete}
          />
          {deleteMutation?.isLoading && (
            <Loading fullscreen size="lg" label={t("common.loadingData")} />
          )}
          <UploadExcelModal
            open={uploadModalOpen}
            onOpenChange={setUploadModalOpen}
            uploadService={uploadProductExcel}
            queryKey={["products"]}
            title={t("page.product.upload.title")}
            subtitle={t("page.product.upload.subtitle") || ""}
          />
        </div>
      )}
    </div>
  );
};

export default ProductList;

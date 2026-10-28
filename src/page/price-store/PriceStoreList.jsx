import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { useStore } from "@/contexts/StoreContext";
import { Store, ArrowLeft, Pencil, Boxes, ChevronRight } from "lucide-react";
import { getProductByOutlet } from "@/services/product";
import { updateProductPriceByStore } from "@/services/price-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Modal from "@/components/organism/modal";
import { toast } from "sonner";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import NoStore from "@/components/ui/NoStore";
import TableActionLegend from "@/components/ui/TableActionLegend";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { SearchInput } from "@/components/ui/SearchInput";
import { useLocations } from "@/queries/useLocations";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const PriceStoreList = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const queryClient = useQueryClient();
  const { setActiveStore } = useStore();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const [selectedStore, setSelectedStore] = useState(
    isSuperAdmin ? "" : String(cookie?.user?.store || "")
  );
  const [editModal, setEditModal] = useState(null);
  const [editPrice, setEditPrice] = useState("");

  const {
    data: locData,
    isLoading,
    isFetching
  } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const stores = useMemo(() => locData?.data || locData || [], [locData]);
  const storeName = useMemo(
    () => stores.find((s) => String(s.id) === selectedStore)?.name || "",
    [stores, selectedStore]
  );

  const {
    data: prodData,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
    isError: isProductsError,
    refetch: refetchProducts
  } = useQuery(
    ["products-for-price", selectedStore],
    () => getProductByOutlet({ location: selectedStore }),
    {
      enabled: !!selectedStore
    }
  );
  const allProducts = useMemo(() => prodData?.data || prodData || [], [prodData]);

  const [search, setSearch] = useState("");
  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter((p) => (p.nameProduct || p.name || "").toLowerCase().includes(q));
  }, [allProducts, search]);

  const saveMutation = useMutation({
    mutationFn: (payload) => updateProductPriceByStore(payload),
    onSuccess: () => {
      toast.success(t("page.priceStore.list.success"));
      queryClient.invalidateQueries(["products-for-price"]);
      setEditModal(null);
      setEditPrice("");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || t("page.priceStore.list.fail"));
    }
  });

  const handleEdit = (product) => {
    setEditModal(product);
    setEditPrice(String(product.price || 0));
  };

  const handleSave = () => {
    if (!editModal || !editPrice || Number(editPrice) < 0) {
      toast.error(t("page.priceStore.list.validation"));
      return;
    }
    saveMutation.mutate({
      productId: editModal.id,
      storePrices: [{ storeId: selectedStore, price: Number(editPrice) }]
    });
  };

  const columns = [
    { header: t("page.priceStore.list.product"), render: (p) => p.nameProduct || p.name },
    {
      header: t("page.priceStore.list.category"),
      render: (p) => (
        <span className="text-muted-foreground">
          {p.categoryData?.name || p.nameCategory || "-"}
        </span>
      )
    },
    {
      header: t("page.priceStore.list.type"),
      render: (p) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
          {p.tipeProduk || "menu"}
        </span>
      )
    },
    {
      header: t("page.priceStore.list.defaultPrice"),
      align: "right",
      render: (p) => <span className="font-medium">{Number(p.price).toLocaleString("id-ID")}</span>
    },
    {
      header: t("page.priceStore.list.costPrice"),
      align: "right",
      render: (p) => (
        <span className="text-muted-foreground">{Number(p.costPrice).toLocaleString("id-ID")}</span>
      )
    },
    { header: t("page.priceStore.list.stock"), align: "right", render: (p) => p.stock },
    {
      header: t("page.priceStore.list.unit"),
      render: (p) => <span className="text-muted-foreground">{p.unit || "-"}</span>
    },
    {
      header: t("page.priceStore.list.edit"),
      align: "right",
      render: (p) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(p)}
          aria-label={t("page.priceStore.list.edit")}>
          <Pencil size={14} />
        </Button>
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
          { label: t("page.priceStore.list.title") }
        ]}
        title={t("page.priceStore.list.title")}
        description={t("page.priceStore.list.desc")}
      />
      <LoadErrorBanner />

      {isLoading || isFetching ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center w-full">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Store size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t("page.priceStore.list.title")}
            </h2>
            <p className="text-muted-foreground mb-8">{t("page.priceStore.list.desc")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card ${
                    i === 1 ? "hidden sm:flex" : i >= 2 ? "hidden lg:flex" : ""
                  }`}>
                  <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-5 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                  <Skeleton className="w-5 h-5 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : !selectedStore ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center w-full">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Store size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t("page.priceStore.list.title")}
            </h2>
            <p className="text-muted-foreground mb-8">{t("page.priceStore.list.desc")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStore(String(s.id));
                    if (isSuperAdmin) {
                      setActiveStore(String(s.id), s.name || "");
                    }
                  }}
                  className="flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all text-left group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15">
                    <Store size={24} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("page.table.form.storePlaceholder")}
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setSelectedStore("")}>
              <ArrowLeft size={18} />
              {t("common.back")}
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Store size={18} className="text-primary" />
              <span className="font-semibold text-lg">{storeName}</span>
            </div>
          </div>

          {isLoading || isFetching || isLoadingProducts || isFetchingProducts ? (
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[160px] bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[160px]">
                <StatCard
                  label={t("page.priceStore.list.totalProducts")}
                  value={products.length}
                  icon={Boxes}
                  variant="default"
                  subtitle={`${new Set(products.map((p) => p.categoryData?.name || p.nameCategory)).size} ${t("page.priceStore.list.totalCategories")}`}
                />
              </div>
            </div>
          )}

          <DataTable
            columns={columns}
            data={products}
            isLoading={isLoadingProducts || isFetchingProducts}
            isError={isProductsError}
            onRetry={refetchProducts}
            rowKey={(p) => p.id}
            emptyIcon={Boxes}
            emptyMessage={t("page.priceStore.list.empty")}
            toolbar={
              <TableToolbar
                title={storeName}
                onReset={() => setSearch("")}
                isFiltered={search !== ""}>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="price-store-list-search"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.search")}
                  </label>
                  <SearchInput
                    id="price-store-list-search"
                    value={search}
                    onChange={setSearch}
                    placeholder={t("page.priceStore.list.searchPlaceholder")}
                  />
                </div>
              </TableToolbar>
            }
          />
        </div>
      )}

      <TableActionLegend
        className="mt-4"
        items={[{ icon: Pencil, label: t("page.priceStore.list.edit") }]}
      />

      {editModal && (
        <Modal
          open={!!editModal}
          onOpenChange={() => {
            setEditModal(null);
            setEditPrice("");
          }}
          title={t("page.priceStore.list.storePrice")}
          description={`${editModal.nameProduct || editModal.name} — ${storeName}`}
          confirmText={t("page.priceStore.list.save")}
          onConfirm={handleSave}
          loading={saveMutation.isLoading}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("page.priceStore.list.defaultPrice")}
              </p>
              <p className="text-lg font-bold">
                {Number(editModal.price || 0).toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <label htmlFor="price-store-list-store-price" className="text-sm font-medium">
                {t("page.priceStore.list.storePrice")} — {storeName}
              </label>
              <Input
                id="price-store-list-store-price"
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder={t("page.priceStore.list.pricePlaceholder")}
                className="mt-1"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PriceStoreList;

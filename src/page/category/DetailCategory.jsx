import React, { useState } from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderTree, Edit3, Calendar, Store, User, Package } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import { getCategoryById, getAllCategory } from "@/services/category";
import { getAllProduct } from "@/services/product";

const statusBadge = (status, t) => {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
        {t("common.active")}
      </span>
    );
  if (status === "draft")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        {t("common.draft")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
      {t("common.inactive")}
    </span>
  );
};

const DetailCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [productModalOpen, setProductModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery(
    ["category", id],
    () => getCategoryById({ id }),
    { enabled: !!id }
  );

  const { data: categoryOptions } = useQuery(["categories-all"], () => getAllCategory(), {
    enabled: !!data
  });
  const allCategories = categoryOptions?.data || categoryOptions?.categories || [];

  const { data: productData, isLoading: productLoading } = useQuery(
    ["category-products", id],
    () => getAllProduct({ category: id, status: "all" }),
    { enabled: productModalOpen }
  );

  const category = data?.data || data;
  const products = productData?.data || [];

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.category.notFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.category.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="danger" onClick={() => navigate("/category-list")}>
          {t("common.back")}
        </Button>
      </div>
    );

  const hasImage = category?.image && !category.image.startsWith("http") === false;

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
            label: t("breadcrumb.category"),
            href: "/category-list",
            i18nKey: "breadcrumb.category"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : category?.name || "-"}
        description={t("page.category.detail.description")}
        backLink="/category-list"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate(`/edit-category?id=${id}`)}>
            <Edit3 size={14} className="mr-1.5" />
            {t("common.edit")}
          </Button>
        )}
      </PageHeader>

      {hasImage && (
        <div className="w-full h-56 rounded-xl overflow-hidden bg-muted/30 border border-border/50">
          <img
            src={category.image}
            alt={category.name || ""}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2 space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="col-span-2 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
              <FolderTree size={16} />
              {t("page.category.form.info")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("page.category.form.name")}</p>
                <p className="font-medium flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: category.color || "#0f172a" }}
                  />
                  {category.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("page.category.value")}</p>
                <p className="font-medium">{category.value || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.category.form.parentCategory")}
                </p>
                <p className="font-medium">
                  {category.parentId
                    ? allCategories.find((c) => String(c.id) === String(category.parentId))?.name ||
                      `#${category.parentId}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.category.form.sortOrder")}
                </p>
                <p className="font-medium">{category.sortOrder ?? "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.category.form.description")}
                </p>
                <p className="font-medium">{category.description || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.category.table.status")}
                </p>
                {statusBadge(category.status, t)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.category.detail.code")}
                </p>
                <p className="font-mono text-sm">#CAT-{String(category.id).padStart(3, "0")}</p>
              </div>
            </div>
            <div className="border-t border-border/50 mt-5 pt-4 grid grid-cols-2 gap-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("common.createdBy")}:{" "}
                  {category.createdByUser?.fullName || category.createdByUser?.userName || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("common.modifiedBy")}:{" "}
                  {category.modifiedByUser?.fullName || category.modifiedByUser?.userName || "-"}
                </span>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card
              className="p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setProductModalOpen(true)}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Package size={20} />
              </div>
              <p className="text-2xl font-bold">{category.productCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Produk</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                <Calendar size={14} />
                {t("page.category.detail.created")}
              </div>
              <p className="text-sm font-medium">
                {category.createdAt
                  ? new Date(category.createdAt).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "-"}
              </p>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                <Store size={13} className="shrink-0" />
                <span>
                  {t("page.category.store")}:{" "}
                  {Array.isArray(category.store) && category.store.length > 0
                    ? category.store.map((s) => s.name || `Store #${s.id}`).join(", ")
                    : t("page.category.form.storeSection.allStores")}
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Modal
        type="custom"
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        title={`Produk dalam kategori "${category?.name || ""}" (${products.length})`}>
        <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
          {productLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada produk</p>
          ) : (
            products.map((p) => {
              const tax = typeof p.tax === "string" ? JSON.parse(p.tax) : p.tax;
              return (
                <div
                  key={p.id}
                  className="group p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {p.nameProduct || p.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.barcode || p.sku || `#${p.id}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-primary">
                        Rp{p.price?.toLocaleString("id-ID") || "0"}
                      </p>
                      {p.costPrice > 0 && (
                        <p className="text-xs text-muted-foreground/70 line-through">
                          Rp{(p.costPrice ?? 0).toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {p.brand && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground/60 w-16 shrink-0">Brand</span>
                        <span className="font-medium text-foreground/80 truncate">{p.brand}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/60 w-16 shrink-0">Stok</span>
                      <span className="font-medium text-foreground/80">
                        {p.stock ?? 0} {p.unit || "pcs"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/60 w-16 shrink-0">Min</span>
                      <span className="font-medium text-foreground/80">{p.minStock ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/60 w-16 shrink-0">Tipe</span>
                      <span className="font-medium text-foreground/80 capitalize">
                        {p.tipeProduk || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/60 w-16 shrink-0">Status</span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                        <span
                          className={`w-1 h-1 rounded-full ${
                            p.status === "active" ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        {p.status === "active" ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </div>
                    {tax?.rate && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground/60 w-16 shrink-0">Pajak</span>
                        <span className="font-medium text-foreground/80">
                          {tax.name} ({tax.rate}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DetailCategory;

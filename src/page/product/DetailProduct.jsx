import React, { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Package,
  Edit3,
  Calendar,
  User,
  ShoppingCart,
  Scale,
  Info,
  Wallet,
  Coins,
  Box,
  Clock,
  Store,
  Layers,
  Tag,
  ImageOff,
  Eye,
  MessageSquare,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getProductById, getProductReviews } from "@/services/product";
import { getBomCosting } from "@/services/bom";
import RecipeHppSummary, { HppStatusBadge } from "@/components/organism/RecipeHppSummary";
import { costRatios, effectiveHpp, pickRecipeCosting } from "@/lib/recipe-costing";
import ProductPreview from "./ProductPreview";
import { safeGet } from "@/lib/safe-lookup";

const formatPrice = (value) => {
  if (value == null || isNaN(value)) return "0";
  return Number(value).toLocaleString("id-ID");
};

const ReviewStars = ({ value, size = 14 }) => {
  const rounded = Math.round(Number(value) || 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < rounded ? "#f59e0b" : "none"}
          stroke={i < rounded ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </div>
  );
};

const formatReviewTime = (value) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

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

const availableBadge = (isAvailable, t) => {
  if (isAvailable)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
        {t("page.product.detail.available")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
      {t("page.product.detail.unavailable")}
    </span>
  );
};

const tipeBadge = (tipe, t) => {
  if (tipe === "menu")
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800">
        {t("page.product.form.tipeProdukMenu")}
      </span>
    );
  if (tipe === "bahan_baku" || tipe === "bahan" || tipe === "bahanBaku")
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800">
        {t("page.product.form.tipeProdukBahanBaku")}
      </span>
    );
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
      {tipe || "-"}
    </span>
  );
};

const stockBadge = (product, t) => {
  const stock = Number(product.stock ?? 0);
  if (stock <= 0)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
        {t("page.product.detail.outOfStock")}
      </span>
    );
  if (product.minStock != null && stock <= Number(product.minStock))
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        {t("page.product.detail.lowStock")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
      {t("page.product.detail.safe")}
    </span>
  );
};

const StatCard = ({ icon, label, value, sub }) => {
  const Icon = icon;
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold truncate">{value}</p>
        {sub && <div className="mt-1">{sub}</div>}
      </div>
    </Card>
  );
};

const DetailProduct = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [reviewSort, setReviewSort] = useState("terbaru");
  const [reviewPage, setReviewPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery(
    ["product", id],
    () => getProductById(id),
    {
      enabled: !!id
    }
  );

  const product = data?.data || data;

  // Live recipe HPP per outlet — the product row's stored hppPerPorsi /
  // marginPersen are a global snapshot from the last recipe save.
  const { data: costing } = useQuery(["bom-costing", id], () => getBomCosting(id), {
    enabled: !!id
  });
  const recipes = costing?.recipes || [];
  const usesRecipe = (product?.inventoryMode || "stocked") !== "stocked";
  const { hpp, status: hppStatus } = effectiveHpp({
    inventoryMode: product?.inventoryMode,
    costPrice: product?.costPrice,
    recipe: pickRecipeCosting(costing, null)
  });
  const { foodCostPercent, marginPercent } = costRatios(hpp, product?.price);
  const costLabel = usesRecipe ? t("page.recipeHpp.hppLabel") : t("page.product.detail.costPrice");
  const costValue = hpp == null ? "-" : `Rp ${formatPrice(hpp)}`;
  const marginValue = marginPercent == null ? "-" : `${marginPercent.toFixed(2)}%`;

  const reviewsQuery = useQuery(["product-reviews", id], () => getProductReviews(id), {
    enabled: !!id
  });

  const reviewResult = reviewsQuery.data || null;
  const reviews = Array.isArray(reviewResult?.reviews) ? reviewResult.reviews : [];
  const averageRating = Number(reviewResult?.averageRating || 0);
  const totalReviews = Number(reviewResult?.totalReviews || 0);

  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    const s = Math.min(Math.max(Math.round(Number(r.rating) || 0), 1), 5);
    ratingCounts[5 - s] += 1;
  });

  const sortedReviews = [...reviews].sort((a, b) => {
    if (reviewSort === "terlama") return new Date(a.createdAt) - new Date(b.createdAt);
    if (reviewSort === "bintang")
      return Number(b.rating) - Number(a.rating) || new Date(b.createdAt) - new Date(a.createdAt);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  useEffect(() => {
    setReviewPage(1);
  }, [reviewSort, id]);

  const REVIEW_PAGE_SIZE = 5;
  const pageCount = Math.max(1, Math.ceil(sortedReviews.length / REVIEW_PAGE_SIZE));
  const safePage = Math.min(reviewPage, pageCount);
  const paginatedReviews = sortedReviews.slice(
    (safePage - 1) * REVIEW_PAGE_SIZE,
    safePage * REVIEW_PAGE_SIZE
  );

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.product.detail.idNotFound")}</p>
      </div>
    );

  if (!product)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.product.detail.notFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.product.detail.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="danger" onClick={() => navigate("/product-list")}>
          {t("common.back")}
        </Button>
      </div>
    );

  const imageUrl = product.image || product.imageProduct || product.photo || null;
  const gallery = Array.isArray(product.images)
    ? product.images.filter((u) => typeof u === "string" && u)
    : [];
  const allImages = gallery.length > 0 ? gallery : imageUrl ? [imageUrl] : [];
  const hasImage = imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("/"));
  const safeIndex = Math.min(activeImage, allImages.length - 1);

  const parseOptions = () => {
    if (product.isOption && Array.isArray(product.options)) return product.options;
    if (Array.isArray(product.variant)) return product.variant;
    return [];
  };
  const options = parseOptions();
  const hasOptions = options.length > 0;

  const parseComposition = () => {
    if (Array.isArray(product.composition)) return product.composition;
    if (typeof product.composition === "string") {
      try {
        return JSON.parse(product.composition);
      } catch {
        return [];
      }
    }
    return [];
  };
  const composition = parseComposition();
  const hasComposition = composition.length > 0;

  const parseTax = () => {
    if (!product.tax) return null;
    if (typeof product.tax === "string") {
      try {
        return JSON.parse(product.tax);
      } catch {
        return null;
      }
    }
    return product.tax;
  };
  const taxObj = parseTax();
  const taxLabel = taxObj?.name || (taxObj?.rate != null ? `${taxObj.rate}%` : null);

  const modifiers = Array.isArray(product.modifiers) ? product.modifiers : [];
  const hasModifiers = Boolean(product.hasModifiers) || modifiers.length > 0;

  const parseStores = () => {
    if (Array.isArray(product.store)) {
      return product.store.map((s) => (typeof s === "string" ? s : s?.name || {})).filter(Boolean);
    }
    if (Array.isArray(product.stores)) {
      return product.stores.map((s) => (typeof s === "string" ? s : s?.name || {})).filter(Boolean);
    }
    return [];
  };
  const stores = parseStores();

  const buildPreviewData = () => {
    const ingredients = composition
      .map((c) => (typeof c.name === "string" && c.name.trim() ? c.name.trim() : null))
      .filter(Boolean);
    const variantGroups =
      Array.isArray(product.options) && product.options.length > 0
        ? product.options
        : Array.isArray(product.variant) && product.variant.length > 0
          ? product.variant
          : [];
    const modifierItems = (Array.isArray(product.modifiers) ? product.modifiers : []).map(
      (m, idx) => ({
        id: m.id ?? m.idModifier ?? String(idx),
        name: m.name || m.nameModifier || "",
        price: Number(m.price ?? m.priceModifier ?? 0)
      })
    );
    return {
      name: product.nameProduct || product.name || "",
      description: product.description || "",
      price: product.price || 0,
      image: imageUrl,
      category: product.nameCategory || product.categoryData?.name || product.category?.name || "",
      categoryIcon:
        product.categoryData?.image ||
        product.categoryData?.icon ||
        product.category?.image ||
        product.category?.icon ||
        "fastfood",
      storeName: stores[0] || "Nama Toko",
      stock: product.stock ?? 0,
      minStock: product.minStock ?? 0,
      estimatedTime: product.estimationTime || 15,
      isOption: Boolean(product.isOption),
      hasModifiers: Boolean(product.hasModifiers),
      isAvailable: product.isAvailable !== false,
      isPromo: Boolean(product.isPromo),
      ingredients,
      variantGroups,
      modifierItems
    };
  };
  const previewData = buildPreviewData();

  const estimation = product.estimationTime;
  const hasEstimation = estimation != null && estimation !== "";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.product"), href: "/product-list", i18nKey: "breadcrumb.product" },
          { label: isLoading ? "..." : product.nameProduct || product.name || "Detail" }
        ]}
        title={isLoading ? t("common.loading") : product.nameProduct || product.name || "-"}
        description={product.sku ? `SKU: ${product.sku}` : t("page.product.detail.description")}
        backLink="/product-list"
        dynamicInfo={false}>
        {!isLoading && (
          <>
            {product.categoryData?.name && (
              <span className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/50">
                {product.categoryData.name}
              </span>
            )}
            <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
              <Eye size={14} />
              {t("page.product.form.preview")}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/edit-product?id=${id}`)}>
              <Edit3 size={14} className="mr-1.5" />
              {t("common.edit")}
            </Button>
          </>
        )}
      </PageHeader>

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
        <>
          {hasImage && allImages.length > 0 ? (
            <div className="space-y-3">
              <div className="relative group w-full aspect-[16/9] sm:aspect-[21/9] max-h-[70vh] rounded-2xl overflow-hidden border border-border/50 bg-muted/30">
                <img
                  src={safeGet(allImages, safeIndex)}
                  alt={product.nameProduct || product.name || ""}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border text-xs font-semibold text-foreground shadow-sm hover:bg-background transition-colors">
                  <Eye size={14} />
                  {t("page.product.form.preview")}
                </button>
                {allImages.length > 1 && (
                  <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-semibold shadow-sm">
                    {safeIndex + 1} / {allImages.length}
                  </span>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`relative w-20 h-14 sm:w-24 sm:h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        i === safeIndex
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border/60 opacity-70 hover:opacity-100"
                      }`}>
                      <img
                        src={src}
                        alt={`${product.nameProduct || product.name || ""} ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-44 rounded-2xl border border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff size={32} />
              <p className="text-sm">{t("page.product.detail.noImage")}</p>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Wallet}
              label={t("page.product.detail.sellingPrice")}
              value={`Rp ${formatPrice(product.price || 0)}`}
            />
            <StatCard
              icon={Coins}
              label={costLabel}
              value={costValue}
              sub={usesRecipe ? <HppStatusBadge status={hppStatus} /> : null}
            />
            <StatCard
              icon={Box}
              label={t("page.product.detail.stockStatus")}
              value={`${product.stock ?? 0} ${product.unit || ""}`.trim()}
              sub={stockBadge(product, t)}
            />
            <StatCard
              icon={Clock}
              label={t("page.product.form.estimationTime")}
              value={hasEstimation ? `${estimation} ${t("page.product.form.minutes")}` : "-"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
                <Package size={16} />
                {t("page.product.detail.productInfo")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.form.name")}
                  </p>
                  <p className="font-medium">{product.nameProduct || product.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SKU</p>
                  <p className="font-mono text-sm">{product.sku || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.category")}
                  </p>
                  <p className="font-medium">
                    {product.nameCategory ||
                      product.categoryData?.name ||
                      product.category?.name ||
                      "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.table.status")}
                  </p>
                  {statusBadge(product.status, t)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.type")}
                  </p>
                  {tipeBadge(product.tipeProduk, t)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.availability")}
                  </p>
                  {availableBadge(product.isAvailableHariIni ?? product.isAvailable ?? true, t)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.stockStatus")}
                  </p>
                  {stockBadge(product, t)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.unit")}
                  </p>
                  <p className="font-medium">{product.unit || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.sellingPrice")}
                  </p>
                  <p className="font-medium text-primary">Rp {formatPrice(product.price || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{costLabel}</p>
                  <p className="font-medium">{costValue}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.stock")}
                  </p>
                  <p className="font-medium">
                    {product.stock ?? 0}
                    {product.unit ? ` ${product.unit}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.minStock")}
                  </p>
                  <p className="font-medium">{product.minStock ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.form.estimationTime")}
                  </p>
                  <p className="font-medium">
                    {hasEstimation ? `${estimation} ${t("page.product.form.minutes")}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.table.tax")}
                  </p>
                  <p className="font-medium">{taxLabel || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.memberPointsTitle")}
                  </p>
                  <p className="font-medium">
                    {product.point > 0 ? formatPrice(product.point) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.detail.redeemPoints")}
                  </p>
                  <p className="font-medium">
                    {product.redeemPoints > 0 ? formatPrice(product.redeemPoints) : "-"}
                  </p>
                </div>
                {product.brand && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("page.product.form.brand")}
                    </p>
                    <p className="font-medium">{product.brand}</p>
                  </div>
                )}
                {product.barcode && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("page.product.form.barcode")}
                    </p>
                    <p className="font-mono text-sm">{product.barcode}</p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.product.form.description")}
                  </p>
                  <p className="font-medium">
                    {product.description ||
                      product.descProduct ||
                      t("page.product.detail.noDescription")}
                  </p>
                </div>
              </div>

              {hasOptions && (
                <div className="border-t border-border/50 mt-5 pt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    <Layers size={16} />
                    {t("page.product.detail.variants")}
                  </div>
                  <div className="space-y-2">
                    {options.map((group, gi) => {
                      const nested = Array.isArray(group.options) && group.options.length > 0;
                      const groupName =
                        group.name || group.nameVariant || group.nameOption || group.label || "-";
                      if (!nested)
                        return (
                          <div
                            key={gi}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                            {group.image && (
                              <div className="w-8 h-8 rounded-md overflow-hidden mr-2">
                                <img
                                  src={group.image}
                                  alt={groupName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <span className="text-sm font-medium">{groupName}</span>
                            <span className="text-sm font-bold">
                              Rp {formatPrice(group.price || group.priceOption || 0)}
                            </span>
                          </div>
                        );
                      return (
                        <div
                          key={gi}
                          className="p-3 rounded-lg bg-muted/30 border border-border/40">
                          <p className="text-sm font-semibold mb-2">{groupName}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.options.map((opt, ci) => (
                              <span
                                key={ci}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border/60 text-sm">
                                <span className="font-medium">
                                  {opt.name || opt.nameOption || opt.label || "-"}
                                </span>
                                <span className="font-bold text-primary">
                                  Rp {formatPrice(opt.price || opt.priceOption || 0)}
                                </span>
                                {opt.stock != null && opt.stock !== "" && (
                                  <span className="text-xs text-muted-foreground">
                                    ({opt.stock})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasModifiers && (
                <div className="border-t border-border/50 mt-5 pt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    <Tag size={16} />
                    {t("page.product.detail.modifiers")}
                  </div>
                  {modifiers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {modifiers.map((m, mi) => (
                        <span
                          key={mi}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-sm">
                          <span className="font-medium">{m.name || m.nameModifier || "-"}</span>
                          <span className="text-xs font-bold text-primary">
                            {Number(m.price ?? m.priceModifier ?? 0) > 0
                              ? `+Rp ${formatPrice(m.price ?? m.priceModifier ?? 0)}`
                              : t("page.product.detail.free")}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("page.product.detail.noModifiers")}
                    </p>
                  )}
                </div>
              )}

              {hasComposition && (
                <div className="border-t border-border/50 mt-5 pt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    <Info size={16} />
                    {t("page.product.detail.composition")}
                  </div>
                  <div className="space-y-2">
                    {composition.map((comp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                        <span className="text-sm font-medium">
                          {comp.name || comp.bahan || comp.ingredient || "-"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {comp.qty || comp.quantity || comp.jumlah || ""}{" "}
                          {comp.unit || comp.satuan || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  {recipes.map((row) => (
                    <RecipeHppSummary
                      key={row.bomId}
                      className="mt-4"
                      costing={row}
                      storeName={recipes.length > 1 ? row.storeName : null}
                    />
                  ))}
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Info size={13} />
                      {t("page.product.detail.marginTips.title")}
                    </div>
                    <p>
                      {t("page.product.detail.marginTips.hpp")} <strong>{costValue}</strong>
                    </p>
                    <p>
                      {t("page.product.detail.marginTips.foodCost", {
                        sellingPrice: formatPrice(product.price || 0),
                        hpp: hpp == null ? "-" : formatPrice(hpp)
                      })}
                      {foodCostPercent != null && ` = ${foodCostPercent.toFixed(2)}%`}
                    </p>
                    <p>
                      {t("page.product.detail.marginTips.margin", {
                        sellingPrice: formatPrice(product.price || 0),
                        hpp: hpp == null ? "-" : formatPrice(hpp),
                        margin: marginValue
                      })}
                    </p>
                  </div>
                </div>
              )}

              {!hasComposition && (
                <div className="border-t border-border/50 mt-5 pt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    <Info size={16} />
                    {t("page.product.detail.composition")}
                  </div>
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("page.product.detail.noComposition")}
                    </p>
                    <Button variant="success" onClick={() => navigate(`/bom/add?productId=${id}`)}>
                      {t("page.product.detail.addComposition")}
                    </Button>
                  </div>
                  <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Info size={13} />
                      {t("page.product.detail.noCompositionTips.title")}
                    </div>
                    <p>{t("page.product.detail.noCompositionTips.desc")}</p>
                    <p>{t("page.product.detail.noCompositionTips.benefit1")}</p>
                    <p>{t("page.product.detail.noCompositionTips.benefit2")}</p>
                  </div>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  <ShoppingCart size={14} />
                  {t("page.product.detail.summary")}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("page.product.detail.stock")}
                    </span>
                    <span className="text-sm font-bold">
                      {product.stock ?? 0}
                      {product.unit ? ` ${product.unit}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">
                      {t("page.product.detail.stockStatus")}
                    </span>
                    {stockBadge(product, t)}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">
                      {t("page.product.detail.sellingPrice")}
                    </span>
                    <span className="text-sm font-bold">Rp {formatPrice(product.price || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">{costLabel}</span>
                    <span className="text-sm font-bold">{costValue}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">
                      {t("page.product.detail.margin")}
                    </span>
                    <span className="text-sm font-bold">{marginValue}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">
                      {t("page.product.form.estimationTime")}
                    </span>
                    <span className="text-sm font-bold">
                      {hasEstimation ? `${estimation} ${t("page.product.form.minutes")}` : "-"}
                    </span>
                  </div>
                  {product.point > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-sm text-muted-foreground">
                        {t("page.product.detail.memberPoints")}
                      </span>
                      <span className="text-sm font-bold">{formatPrice(product.point)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {(product.unit || product.baseUnit) && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    <Scale size={14} />
                    {t("page.product.detail.unit")}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("page.product.detail.baseUnit")}
                      </span>
                      <span className="font-medium">{product.baseUnit || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">{t("page.product.form.unit")}</span>
                      <span className="font-medium">{product.unit || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">
                        {t("page.product.detail.conversionFactor")}
                      </span>
                      <span className="font-medium">{product.conversionFactor || 1}</span>
                    </div>
                    {product.baseUnit &&
                      product.unit &&
                      String(product.baseUnit) !== String(product.unit) && (
                        <p className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
                          1 {product.baseUnit} = {product.conversionFactor || 1} {product.unit}
                        </p>
                      )}
                  </div>
                </Card>
              )}

              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  <Store size={14} />
                  {t("page.product.table.store")}
                </div>
                {stores.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stores.map((store, si) => (
                      <span
                        key={si}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-sm font-medium">
                        {store}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("page.product.allStores")}</p>
                )}
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  <Calendar size={14} />
                  {t("page.product.detail.systemInfo")}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("common.createdAt")}</p>
                    <p className="text-sm font-medium">{formatDate(product.createdAt)}</p>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">{t("common.updatedAt")}</p>
                    <p className="text-sm font-medium">{formatDate(product.updatedAt)}</p>
                  </div>
                  <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                    <User size={13} className="shrink-0 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">{t("common.createdBy")}: </span>
                      <span className="font-medium">
                        {product.createdByUser?.fullName || product.createdByUser?.userName || "-"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={13} className="shrink-0 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">{t("common.modifiedBy")}: </span>
                      <span className="font-medium">
                        {product.modifiedByUser?.fullName ||
                          product.modifiedByUser?.userName ||
                          "-"}
                      </span>
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <MessageSquare size={16} />
                {t("page.product.detail.reviews")}
              </div>
              <div className="relative">
                <select
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value)}
                  aria-label={t("page.product.detail.sortLabel")}
                  className="appearance-none pl-3 pr-8 h-9 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
                  <option value="terbaru">{t("page.product.detail.sortNewest")}</option>
                  <option value="bintang">{t("page.product.detail.sortTopRated")}</option>
                  <option value="terlama">{t("page.product.detail.sortOldest")}</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>

            {reviewsQuery.isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-40 w-full" />
                <div className="lg:col-span-2 space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-5xl font-bold">{averageRating.toFixed(1)}</p>
                  <div className="mt-2">
                    <ReviewStars value={averageRating} size={16} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {t("page.product.detail.reviewsCount", { count: totalReviews })}
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((v) => {
                      const count = ratingCounts[5 - v];
                      const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                      return (
                        <div key={v} className="flex items-center gap-2">
                          <span className="w-4 text-xs text-muted-foreground">{v}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-xs text-muted-foreground">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  {paginatedReviews.map((review) => (
                    <div
                      key={review.id}
                      className="border border-border/60 rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{review.userName || "-"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatReviewTime(review.createdAt)}
                          </p>
                        </div>
                        <ReviewStars value={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                  {sortedReviews.length > REVIEW_PAGE_SIZE && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-muted-foreground">
                        {t("common.showing", {
                          start: (safePage - 1) * REVIEW_PAGE_SIZE + 1,
                          end: Math.min(safePage * REVIEW_PAGE_SIZE, sortedReviews.length),
                          total: sortedReviews.length
                        })}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage === 1}
                          onClick={() => setReviewPage((p) => Math.max(1, p - 1))}>
                          <ChevronLeft size={14} />
                          <span className="hidden sm:inline ml-1">{t("common.prev")}</span>
                        </Button>
                        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pg) => (
                          <Button
                            key={pg}
                            variant={pg === safePage ? "default" : "outline"}
                            size="sm"
                            className="min-w-9 px-0"
                            onClick={() => setReviewPage(pg)}>
                            {pg}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage === pageCount}
                          onClick={() => setReviewPage((p) => Math.min(pageCount, p + 1))}>
                          <span className="hidden sm:inline mr-1">{t("common.next")}</span>
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <MessageSquare size={28} className="text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("page.product.detail.noReviews")}
                </p>
              </div>
            )}
          </Card>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent withX className="sm:max-w-4xl p-3">
              <img
                src={safeGet(allImages, safeIndex)}
                alt={product.nameProduct || product.name || ""}
                className="w-full h-full max-h-[85vh] object-contain rounded-lg"
              />
            </DialogContent>
          </Dialog>
          {showPreview && (
            <ProductPreview
              product={previewData}
              open={showPreview}
              onOpenChange={setShowPreview}
            />
          )}
        </>
      )}
    </div>
  );
};

export default DetailProduct;

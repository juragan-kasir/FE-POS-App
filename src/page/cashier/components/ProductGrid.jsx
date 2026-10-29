import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Search, Barcode, Grid3X3, List, Tag, Package, X, Eye, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { toast } from "sonner";
import { orderList } from "@/state/order-list";
import { getAllCategoryActive } from "@/services/category";
import { optimizeImage } from "@/utils/image";
import { Skeleton } from "@/components/ui/skeleton";
import ScrollRail from "@/components/ui/ScrollRail";
import VariantModal from "./VariantModal";
import ProductDetailModal from "./ProductDetailModal";
import DynamicIcon from "@/components/ui/DynamicIcon";
import { isInventoryItemMode, usesProductStock } from "@/lib/inventory-mode";
import { recipePortionsFor, remainingRecipePortions } from "@/lib/recipe-availability";

const renderCategoryIcon = (cat, className, imgClassName) => {
  const icon = cat?.image || cat?.icon;
  if (!icon) return null;
  return <DynamicIcon icon={icon} size={14} className={className || imgClassName} />;
};

const formatPrice = (value) => {
  if (value == null || isNaN(value)) return "0";
  return Number(value).toLocaleString("id-ID");
};

// F7-02: a stable fallback reference — `categoriesData?.data || categoriesData
// || []` would otherwise mint a brand-new empty array every render while the
// categories query is still loading, which cascades into new callback
// identities (handleShowDetail depends on `categories`) and defeats tile
// memoization for the whole grid on every render.
const EMPTY_ARRAY = [];

// "Sisa N porsi" for a recipe product (BRD BR-05), "Stok N" for a finished
// good sold from its inventory item (BR-02); amber once few are left.
// Tiles get primitives (portions, limiting-ingredient names) so a cart change
// only re-renders the tiles whose numbers actually moved (F7-02).
const LOW_PORTIONS = 5;
const RecipePortionsBadge = ({ portions, limitedBy, linkedItem = false }) => {
  const { t } = useTranslation();
  if (portions == null || portions < 1) return null;
  return (
    <span
      data-testid="recipe-portions"
      title={
        limitedBy && !linkedItem
          ? t("page.cashier.product.limitedBy", { names: limitedBy })
          : undefined
      }
      className={`text-xs font-semibold ${portions <= LOW_PORTIONS ? "text-amber-500" : "text-muted-foreground"}`}>
      {t(linkedItem ? "page.cashier.product.itemStockLeft" : "page.cashier.product.portionsLeft", {
        count: portions
      })}
    </span>
  );
};
RecipePortionsBadge.propTypes = {
  portions: PropTypes.number,
  limitedBy: PropTypes.string,
  linkedItem: PropTypes.bool
};

const outOfStockLabel = (recipePortions, linkedItem = false) =>
  recipePortions != null && !linkedItem
    ? "page.cashier.product.ingredientsOut"
    : "page.cashier.product.outOfStock";

// F7-02: extracted + memoized so a cart mutation that only changes one
// product's `cartCount` doesn't force React to re-diff every tile in a
// large catalog — React.memo lets it bail on every tile whose own props
// (product identity, cartCount) haven't changed. `t` is read via its own
// hook call here rather than passed down as a prop, since react-i18next's
// `t` reference isn't guaranteed stable across the parent's renders and
// would otherwise defeat the memoization for every tile on every render.
const ProductGridTile = React.memo(function ProductGridTile({
  product,
  cartCount,
  onSelect,
  onShowDetail,
  hasChoices,
  outOfStock,
  recipePortions,
  limitedBy,
  linkedItem
}) {
  const { t } = useTranslation();
  const img = product.image || product.imageProduct || product.photo || null;
  const withChoices = hasChoices(product);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect(product)}
        disabled={outOfStock}
        className="group bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl p-3 hover:border-border/80 hover:shadow-sm hover:bg-card transition-all duration-200 text-left active:scale-[0.99] disabled:cursor-not-allowed disabled:hover:border-border/40 disabled:hover:bg-card/80 disabled:hover:shadow-none disabled:active:scale-100 w-full">
        <div className="relative mb-2.5">
          {img ? (
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted/50">
              <img
                src={optimizeImage(img) || "/placeholder.svg"}
                alt={product.nameProduct || product.name || ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.classList.add("flex", "items-center", "justify-center");
                  const fallback = document.createElement("span");
                  fallback.className = "text-2xl font-bold text-muted-foreground/30";
                  fallback.textContent =
                    (product.nameProduct || product.name || "?")[0]?.toUpperCase() || "?";
                  e.target.parentElement.appendChild(fallback);
                }}
              />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-lg bg-muted border border-border/50 flex items-center justify-center relative">
              <Package size={28} className="text-muted-foreground/40" />
            </div>
          )}
          {cartCount > 0 && (
            <div className="absolute -top-1.5 right-8 w-6 h-6 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center z-10">
              <span className="text-primary-foreground text-xs font-bold">{cartCount}</span>
            </div>
          )}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-white bg-destructive/90 px-2 py-1 rounded-md uppercase tracking-wider">
                {t("page.cashier.product.notFound")}
              </span>
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-lg flex items-center justify-center">
              <span
                title={
                  limitedBy ? t("page.cashier.product.limitedBy", { names: limitedBy }) : undefined
                }
                className="text-xs font-bold text-white bg-destructive/90 px-2 py-1 rounded-md uppercase tracking-wider">
                {t(outOfStockLabel(recipePortions, linkedItem))}
              </span>
            </div>
          )}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
            {withChoices && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-sm shadow-sm">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-0.5">
                  <Tag size={10} />
                  {t("page.cashier.variant")}
                </span>
              </span>
            )}
            {product.point > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-violet-500/90 backdrop-blur-sm shadow-sm">
                <span className="text-xs font-bold text-white flex items-center gap-0.5">
                  {product.point} pts
                </span>
              </span>
            )}
            {product.isBundle && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/90 backdrop-blur-sm shadow-sm">
                <span className="text-xs font-bold text-white flex items-center gap-0.5">
                  <Package size={10} />
                  {t("breadcrumb.bundle")}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground leading-tight line-clamp-2 min-h-[2em]">
            {product.nameProduct || product.name || t("page.cashier.unnamedProduct")}
          </p>
          {product.brand && (
            <p className="text-xs text-muted-foreground/60 truncate">{product.brand}</p>
          )}
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-primary">
              Rp {formatPrice(product.price || product.sellPrice || 0)}
            </p>
            {usesProductStock(product) &&
              product.stock !== undefined &&
              Number(product.stock) > 0 &&
              Number(product.stock) <= Number(product.minStock) && (
                <span className="text-xs text-amber-500 font-semibold">
                  {t("page.cashier.stock")} {product.stock}
                </span>
              )}
            <RecipePortionsBadge
              portions={recipePortions}
              limitedBy={limitedBy}
              linkedItem={linkedItem}
            />
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onShowDetail(product);
        }}
        title={t("page.product.form.detail", "Detail Produk")}
        className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg bg-background/80 backdrop-blur-sm border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background transition-colors shadow-sm">
        <Eye size={14} />
      </button>
    </div>
  );
});
ProductGridTile.displayName = "ProductGridTile";
ProductGridTile.propTypes = {
  product: PropTypes.object.isRequired,
  cartCount: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  onShowDetail: PropTypes.func.isRequired,
  hasChoices: PropTypes.func.isRequired,
  outOfStock: PropTypes.bool,
  recipePortions: PropTypes.number,
  limitedBy: PropTypes.string,
  linkedItem: PropTypes.bool
};

// F7-02: list-view counterpart to ProductGridTile — same memoization
// rationale, own `t` hook call for the same reason.
const ProductListTile = React.memo(function ProductListTile({
  product,
  cartCount,
  onSelect,
  onShowDetail,
  hasChoices,
  outOfStock,
  recipePortions,
  limitedBy,
  linkedItem
}) {
  const { t } = useTranslation();
  const img = product.image || product.imageProduct || product.photo || null;
  const withChoices = hasChoices(product);
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => onSelect(product)}
        disabled={outOfStock}
        className="flex-1 min-w-0 group flex items-center gap-3 bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl p-3 hover:border-border/80 hover:shadow-sm hover:bg-card transition-all duration-200 text-left active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border/40 disabled:hover:bg-card/80 disabled:hover:shadow-none disabled:active:scale-100">
        {img ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted/50">
            <img
              src={optimizeImage(img) || "/placeholder.svg"}
              alt={product.nameProduct || product.name || ""}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.classList.add("flex", "items-center", "justify-center");
                const fallback = document.createElement("span");
                fallback.className = "text-lg font-bold text-muted-foreground/30";
                fallback.textContent =
                  (product.nameProduct || product.name || "?")[0]?.toUpperCase() || "?";
                e.target.parentElement.appendChild(fallback);
              }}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted border border-border/50 flex items-center justify-center shrink-0">
            <Package size={20} className="text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">
              {product.nameProduct || product.name || t("page.cashier.unnamedProduct")}
            </p>
            {withChoices && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider shrink-0">
                <Tag size={10} className="inline mr-0.5" />
                {t("page.cashier.variant")}
              </span>
            )}
            {product.isBundle && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-xs font-bold uppercase tracking-wider shrink-0">
                <Package size={10} className="inline mr-0.5" />
                {t("breadcrumb.bundle")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground/60 truncate">
            {product.sku || ""}{" "}
            <RecipePortionsBadge
              portions={recipePortions}
              limitedBy={limitedBy}
              linkedItem={linkedItem}
            />
            {outOfStock && recipePortions != null && (
              <span className="text-xs font-semibold text-destructive">
                {t(outOfStockLabel(recipePortions, linkedItem))}
              </span>
            )}
          </p>
        </div>
        {cartCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-primary shadow-sm flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold">{cartCount}</span>
          </div>
        )}
        <p className="text-sm font-bold text-primary shrink-0">
          Rp {formatPrice(product.price || product.sellPrice || 0)}
        </p>
      </button>
      <button
        type="button"
        onClick={() => onShowDetail(product)}
        title={t("page.product.form.detail", "Detail Produk")}
        className="w-10 shrink-0 rounded-xl bg-card/80 backdrop-blur-sm border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-card hover:border-border/80 transition-colors">
        <Eye size={16} />
      </button>
    </div>
  );
});
ProductListTile.displayName = "ProductListTile";
ProductListTile.propTypes = {
  product: PropTypes.object.isRequired,
  cartCount: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  onShowDetail: PropTypes.func.isRequired,
  hasChoices: PropTypes.func.isRequired,
  outOfStock: PropTypes.bool,
  recipePortions: PropTypes.number,
  limitedBy: PropTypes.string,
  linkedItem: PropTypes.bool
};

const ProductGrid = ({
  products: propProducts,
  allProducts: propAllProducts,
  isLoading,
  search,
  onSearchChange,
  barcode,
  onBarcodeChange,
  categoryId,
  onCategoryChange,
  store,
  refocusSignal,
  onRemoteBarcodeLookup,
  recipeAvailability
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState("grid");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [inputMode, setInputMode] = useState("search");
  const activeInputRef = useRef(null);
  const isFirstRefocus = useRef(true);

  // The cashier shouldn't have to click back into search/barcode after
  // finishing a sale — CashierPage bumps `refocusSignal` once the screen
  // returns to "ready to sell" (New Transaction) so the next scan/search can
  // start immediately. Skipped on mount so the grid doesn't steal focus from
  // wherever the page naturally lands on first render.
  useEffect(() => {
    if (isFirstRefocus.current) {
      isFirstRefocus.current = false;
      return;
    }
    activeInputRef.current?.focus();
  }, [refocusSignal]);
  // F7-02: narrow selectors instead of subscribing to the whole cart store —
  // `addOrder` never changes reference, and `order` is the only piece of
  // cart state this component actually needs (for the per-tile count
  // badges), so a price override or quantity change elsewhere in the cart
  // only invalidates what genuinely depends on `order`.
  const addOrder = orderList((state) => state.addOrder);
  const order = orderList((state) => state.order);

  const { data: categoriesData } = useQuery(
    ["categories-cashier", store],

    () => getAllCategoryActive({ location: store }),

    { enabled: !!store }
  );
  const categories = categoriesData?.data || categoriesData || EMPTY_ARRAY;

  const products = propProducts || [];
  const allProducts = propAllProducts || products;

  const getCatId = useCallback((product) => {
    const raw =
      product.category?.id ??
      product.category?._id ??
      product.category ??
      product.categoryId?.id ??
      product.categoryId?._id ??
      "";
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw).id;
      } catch {
        return raw;
      }
    }
    return raw;
  }, []);

  const productsByCategory = useMemo(() => {
    // ponytail: fromEntries + daftar grup berkunci catId — bebas object injection
    // P20-B3: use Map for O(1) group lookup instead of O(G) array find per product (O(N*G) → O(N+C))
    const catMap = Object.fromEntries((categories || []).map((cat) => [cat.id || cat._id, cat]));
    const groupMap = new Map();
    const groupOrder = [];
    products.forEach((p) => {
      const catId = getCatId(p);
      let group = groupMap.get(catId);
      if (!group) {
        group = { catId, category: safeGet(catMap, catId, null), products: [] };
        groupMap.set(catId, group);
        groupOrder.push(group);
      }
      group.products.push(p);
    });
    const toPublic = ({ category, products }) => ({ category, products });
    if (!categories?.length) return groupOrder.map(toPublic);
    return categories.map((cat) => {
      const catId = cat.id || cat._id;
      const found = groupMap.get(catId);
      return found ? toPublic(found) : { category: cat, products: [] };
    });
  }, [categories, products, getCatId]);

  const hasChoices = useCallback((product) => {
    if (product.variant && Array.isArray(product.variant) && product.variant.length > 0)
      return true;
    if (
      product.isOption &&
      product.options &&
      Array.isArray(product.options) &&
      product.options.length > 0
    )
      return true;
    if (
      product.hasModifiers &&
      product.modifiers &&
      Array.isArray(product.modifiers) &&
      product.modifiers.length > 0
    )
      return true;
    return false;
  }, []);

  // BRD BR-05/BR-06: a recipe product (not 'stocked') is limited by the
  // portions its ingredients still make — after what is already in the cart
  // (FR-11) — not by its own product stock. If availability cannot be
  // loaded the grid does not guess; the server still refuses a short sale
  // (409 INGREDIENT_STOCK_CONFLICT).
  // `recipeAvailability` is GET /product/recipe-availability, loaded by
  // CashierPage (undefined while loading or when it failed).
  const portionsById = useMemo(
    () => remainingRecipePortions(recipeAvailability, order),
    [recipeAvailability, order]
  );
  const recipeFor = useCallback(
    (product) => recipePortionsFor(product, portionsById, !!recipeAvailability),
    [portionsById, recipeAvailability]
  );

  const isOutOfStock = useCallback(
    (product) => {
      if (product.isAvailable === false) return false;
      const recipe = recipeFor(product);
      if (recipe && recipe.portions < 1) return true;
      return usesProductStock(product) && product.stock !== undefined && Number(product.stock) <= 0;
    },
    [recipeFor]
  );

  const tileStockProps = (product) => {
    const recipe = recipeFor(product);
    return {
      outOfStock: isOutOfStock(product),
      recipePortions: recipe ? recipe.portions : null,
      linkedItem: isInventoryItemMode(product.inventoryMode),
      limitedBy: recipe
        ? recipe.limitingIngredients
            .map((i) => i.name)
            .filter(Boolean)
            .join(", ")
        : ""
    };
  };

  // Read through a ref so onSelect keeps one identity across cart changes —
  // otherwise every memoized tile re-renders on each add (F7-02).
  const isOutOfStockRef = useRef(isOutOfStock);
  isOutOfStockRef.current = isOutOfStock;

  const handleProductClick = useCallback(
    (product) => {
      if (isOutOfStockRef.current(product)) return;
      if (hasChoices(product)) {
        setSelectedProduct(product);
        setShowVariantModal(true);
      } else {
        addOrder(product, store);
      }
    },
    [addOrder, store, hasChoices]
  );

  // Scanner input types the code then sends Enter — look up an exact SKU
  // match against the full unfiltered product list (not the search/category
  // -filtered `products` prop, which could hide the scanned item) and add it
  // straight to cart, mirroring the same variant/stock checks a manual tap
  // would go through. Previously this input had no handler at all, so
  // switching to "barcode mode" and scanning silently did nothing.
  const handleBarcodeKeyDown = useCallback(
    async (e) => {
      if (e.key !== "Enter") return;
      // A held-down Enter key (or a stuck scanner trigger) fires repeated
      // keydown events for the same keypress — e.repeat marks every one
      // after the first, so a single physical scan can't add the item
      // twice just because the key auto-repeated before the field cleared.
      if (e.repeat) return;
      const code = barcode.trim();
      if (!code) return;
      const localMatch = allProducts.find(
        (p) => (p.sku || "").toLowerCase() === code.toLowerCase()
      );
      if (localMatch) {
        handleProductClick(localMatch);
        onBarcodeChange("");
        return;
      }
      // `allProducts` is only the store's first catalog page (backend caps a
      // page at 500 rows, F7-02) — a store with more active products than
      // that has real, sellable items this local list never received. Before
      // declaring the code unknown, ask the parent (which owns product
      // fetching) to do one narrowly-scoped live lookup.
      if (!onRemoteBarcodeLookup) {
        toast.error(t("page.cashier.barcodeNotFound"));
        return;
      }
      try {
        const remoteResults = await onRemoteBarcodeLookup(code);
        const remoteMatch = (remoteResults || []).find(
          (p) => (p.sku || "").toLowerCase() === code.toLowerCase()
        );
        if (!remoteMatch) {
          toast.error(t("page.cashier.barcodeNotFound"));
          return;
        }
        handleProductClick(remoteMatch);
        onBarcodeChange("");
      } catch {
        toast.error(t("page.cashier.barcodeNotFound"));
      }
    },
    [barcode, allProducts, handleProductClick, onBarcodeChange, t, onRemoteBarcodeLookup]
  );

  const handleShowDetail = useCallback(
    (product) => {
      const catId = getCatId(product);
      const category = categories.find((cat) => String(cat.id || cat._id) === String(catId));
      setDetailProduct({
        ...product,
        categoryName: category?.nameCategory || category?.name || product.nameCategory || ""
      });
      setShowDetail(true);
    },
    [categories, getCatId]
  );

  const handleAddToCart = useCallback(
    (product, choice = null) => {
      if (choice) {
        const variantProduct = {
          ...product,
          variantName: choice.label || choice.nameVariant || choice.name,
          price: choice.price || product.price,
          totalPrice: choice.price || product.price,
          // W3-4 (K3): the selections the price was built from, kept apart
          // from the product's own options/modifiers definitions.
          selectedOptions: Array.isArray(choice.options) ? choice.options : [],
          selectedModifiers: Array.isArray(choice.modifiers) ? choice.modifiers : [],
          image: choice.image || product.image || product.imageProduct,
          ID: product.ID || product.id,
          idProduct: product.idProduct || product.id
        };
        addOrder(variantProduct, store);
      } else {
        addOrder(product, store);
      }
      setShowVariantModal(false);
      setSelectedProduct(null);
    },
    [addOrder, store]
  );

  // F7-02: a single pass over the cart building a lookup keyed by every
  // idProduct/id value it contains, instead of re-scanning the whole cart
  // with .find() for every product tile on every render (O(products × cart)
  // → O(products + cart)). Matches the original .find() semantics exactly:
  // first cart line to provide a given key wins.
  const cartCountMap = useMemo(() => {
    const counts = new Map();
    order.forEach((item) => {
      const qty = item.count || 0;
      [item.idProduct, item.id].forEach((key) => {
        if (key === undefined || key === null) return;
        if (!counts.has(key)) counts.set(key, qty);
      });
    });
    return counts;
  }, [order]);

  if (isLoading) {
    return (
      <>
        <div className="flex items-center gap-3 px-4 lg:px-6 pt-4 pb-3">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <Skeleton className="flex-1 h-10 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
        </div>
        <div className="flex items-center gap-2 px-4 lg:px-6 pb-2 overflow-hidden">
          <Skeleton className="shrink-0 w-20 h-7 rounded-lg" />
          <Skeleton className="shrink-0 w-16 h-7 rounded-lg" />
          <Skeleton className="shrink-0 w-24 h-7 rounded-lg" />
          <Skeleton className="shrink-0 w-14 h-7 rounded-lg" />
          <Skeleton className="shrink-0 w-20 h-7 rounded-lg" />
        </div>
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="px-4 lg:px-6 py-3">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4 lg:px-6 pt-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-card/80 border border-border/40 rounded-xl p-3 space-y-2.5">
                <Skeleton className="w-full aspect-square rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 lg:px-6 pt-4 pb-3">
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-0.5 border border-border/40">
          <button
            type="button"
            onClick={() => setInputMode("search")}
            aria-pressed={inputMode === "search"}
            aria-label={t("page.cashier.searchPlaceholder")}
            className={`p-1.5 rounded-lg transition-all ${
              inputMode === "search"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Search size={16} />
          </button>
          <button
            type="button"
            onClick={() => setInputMode("barcode")}
            aria-pressed={inputMode === "barcode"}
            aria-label={t("page.cashier.barcodePlaceholder")}
            className={`p-1.5 rounded-lg transition-all ${
              inputMode === "barcode"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Barcode size={16} />
          </button>
        </div>

        <div className="flex-1 relative">
          {inputMode === "search" ? (
            <>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={activeInputRef}
                data-shortcut="search"
                aria-keyshortcuts="F2"
                title="F2"
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t("page.cashier.searchPlaceholder")}
                className="w-full h-10 pl-9 pr-9 text-sm rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label={t("common.clear", "Clear")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </>
          ) : (
            <>
              <Barcode
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={activeInputRef}
                data-shortcut="search"
                aria-keyshortcuts="F2"
                title="F2"
                type="text"
                value={barcode}
                onChange={(e) => onBarcodeChange(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder={t("page.cashier.barcodePlaceholder")}
                autoFocus
                className="w-full h-10 pl-9 pr-9 text-sm rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors font-mono tracking-wider"
              />
              {barcode && (
                <button
                  type="button"
                  onClick={() => onBarcodeChange("")}
                  aria-label={t("common.clear", "Clear")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-0.5 border border-border/40">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            aria-label={t("page.cashier.ui.gridView")}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Grid3X3 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            aria-label={t("page.cashier.ui.listView")}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === "list"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <ScrollRail
          leftLabel={t("page.cashier.scrollLeft")}
          rightLabel={t("page.cashier.scrollRight")}
          railTestId="product-category-rail"
          fadeTestIdPrefix="product-category"
          gutterClassName="flex items-center gap-2 px-4 lg:px-6 pb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCategoryChange("")}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                !categoryId
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              }`}>
              {t("page.cashier.allCategories")}
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id || cat._id}
                onClick={() => onCategoryChange(cat.id || cat._id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  categoryId === (cat.id || cat._id)
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                }`}>
                {renderCategoryIcon(
                  cat,
                  "!text-sm text-current",
                  "w-3.5 h-3.5 rounded object-cover"
                )}
                <span className="truncate">{cat.nameCategory || cat.name}</span>
              </button>
            ))}
          </div>
        </ScrollRail>
      )}

      <div className="flex-1 overflow-y-auto pb-4">
        {!products.length ? (
          <div className="flex items-center justify-center h-full px-4 lg:px-6">
            <div className="text-center">
              {!store ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center mx-auto mb-3">
                    <Package size={32} className="text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-muted-foreground">{t("page.cashier.noStore")}</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {t("page.cashier.noStoreDesc")}
                  </p>
                </>
              ) : search || categoryId ? (
                // Distinct from the "store has no products at all" case below —
                // a cashier who scanned/typed something with zero matches needs
                // to know it's their filter, not an empty catalog, and how to
                // get back to browsing everything.
                <>
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center mx-auto mb-3">
                    <SearchX size={32} className="text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-muted-foreground">
                    {t("page.cashier.noSearchResults", "Tidak ada produk yang cocok")}
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {search
                      ? t("page.cashier.noSearchResultsDesc", {
                          query: search,
                          defaultValue: `Tidak ada hasil untuk "${search}"`
                        })
                      : t("page.cashier.noCategoryResultsDesc", "Tidak ada produk di kategori ini")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange("");
                      onCategoryChange("");
                    }}
                    className="mt-4 text-sm font-medium text-primary hover:underline">
                    {t("page.cashier.clearSearchFilters", "Hapus pencarian & filter")}
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center mx-auto mb-3">
                    <Package size={32} className="text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-muted-foreground">
                    {t("page.cashier.noProducts")}
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {t("page.cashier.noProductsDesc")}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          productsByCategory.map(({ category, products: catProducts }, grpIdx) => (
            <div key={category?.id || category?._id || `uncat-${grpIdx}`} className="mb-6">
              <div className="px-4 lg:px-6 py-3 border-b border-border/40 flex items-center gap-2">
                {category &&
                  renderCategoryIcon(
                    category,
                    "!text-lg text-primary",
                    "w-5 h-5 rounded object-cover"
                  )}
                <h3 className="text-sm font-semibold text-foreground">
                  {category?.nameCategory || category?.name || "Uncategorized"}
                </h3>
              </div>
              {catProducts.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4 lg:px-6 pt-3">
                    {catProducts.map((product, idx) => {
                      const productId =
                        product.id || product.ID || product.idProduct || product._id;
                      const cartCount = cartCountMap.get(productId) || 0;
                      return (
                        <ProductGridTile
                          key={productId || idx}
                          product={product}
                          cartCount={cartCount}
                          onSelect={handleProductClick}
                          onShowDetail={handleShowDetail}
                          hasChoices={hasChoices}
                          {...tileStockProps(product)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 px-4 lg:px-6 pt-3">
                    {catProducts.map((product, idx) => {
                      const productId =
                        product.id || product.ID || product.idProduct || product._id;
                      const cartCount = cartCountMap.get(productId) || 0;
                      return (
                        <ProductListTile
                          key={productId || idx}
                          product={product}
                          cartCount={cartCount}
                          onSelect={handleProductClick}
                          onShowDetail={handleShowDetail}
                          hasChoices={hasChoices}
                          {...tileStockProps(product)}
                        />
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="px-4 lg:px-6 pt-3">
                  <p className="text-sm text-muted-foreground/60 italic">
                    {t("page.cashier.ui.noProductsYet")}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showVariantModal && selectedProduct && (
        <VariantModal
          product={selectedProduct}
          onSelect={(variant) => handleAddToCart(selectedProduct, variant)}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {showDetail && detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          open={showDetail}
          onOpenChange={setShowDetail}
          onAddToCart={(p) => handleProductClick(p)}
        />
      )}
    </>
  );
};

ProductGrid.propTypes = {
  products: PropTypes.array,
  allProducts: PropTypes.array,
  isLoading: PropTypes.bool,
  search: PropTypes.string,
  onSearchChange: PropTypes.func,
  barcode: PropTypes.string,
  onBarcodeChange: PropTypes.func,
  categoryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onCategoryChange: PropTypes.func,
  store: PropTypes.any,
  refocusSignal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onRemoteBarcodeLookup: PropTypes.func,
  recipeAvailability: PropTypes.object
};

// P20-B3: memoize the grid itself so a parent re-render (e.g. CashierPage cart totals)
// with unchanged product props does not re-execute the grouping/cartCount work;
// internal Zustand `order` changes still trigger an update via the selector.
export default React.memo(ProductGrid);

import React from "react";
import PropTypes from "prop-types";
import { X, Package, Tag, Clock, ShoppingCart, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { optimizeImage } from "@/utils/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usesProductStock } from "@/lib/inventory-mode";

const formatPrice = (value) => {
  if (value == null || isNaN(value)) return "0";
  return Number(value).toLocaleString("id-ID");
};

const ProductDetailModal = ({ product, open, onOpenChange, onAddToCart }) => {
  const { t } = useTranslation();
  if (!product) return null;

  const img = product.image || product.imageProduct || product.photo || null;
  const name = product.nameProduct || product.name || "";
  const description = product.description || "";
  const price = product.price || product.sellPrice || 0;
  const category =
    product.categoryName || product.category?.nameCategory || product.category?.name || "";
  // A make_to_order (recipe) product has no meaningful own stock: its
  // ingredients are what the server checks and deducts.
  const stock = usesProductStock(product) ? product.stock : undefined;
  const minStock = product.minStock;
  const isAvailable = product.isAvailable !== false;
  const isOutOfStock = stock !== undefined && Number(stock) <= 0 && isAvailable;
  const isLowStock = stock !== undefined && Number(stock) > 0 && Number(stock) <= Number(minStock);
  const isPromo = Boolean(product.isPromo);
  const isBundle = Boolean(product.isBundle);
  const point = product.point || 0;
  const estimatedTime = product.estimationTime || null;
  const brand = product.brand || "";
  const sku = product.sku || "";

  let variantGroups = [];
  if (Array.isArray(product.options) && product.options.length > 0) {
    variantGroups = product.options;
  } else if (Array.isArray(product.variant) && product.variant.length > 0) {
    variantGroups = product.variant;
  }

  const modifierItems = Array.isArray(product.modifiers)
    ? product.modifiers.map((m, idx) => ({
        id: m.id ?? m.idModifier ?? String(idx),
        name: m.name || m.nameModifier || "",
        price: Number(m.price ?? m.priceModifier ?? 0)
      }))
    : [];

  let composition = [];
  if (Array.isArray(product.composition)) {
    composition = product.composition;
  } else if (typeof product.composition === "string") {
    try {
      composition = JSON.parse(product.composition) || [];
    } catch {
      composition = [];
    }
  }
  const ingredients = composition
    .map((c) => (typeof c.name === "string" && c.name.trim() ? c.name.trim() : null))
    .filter(Boolean);

  const hasVariants = variantGroups.length > 0;
  const hasModifiers = modifierItems.length > 0;
  const hasIngredients = ingredients.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {img ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted/50 shrink-0 border border-border/40">
                  <img
                    src={optimizeImage(img) || "/placeholder.svg"}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-muted border border-border/50 flex items-center justify-center shrink-0">
                  <Package size={28} className="text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-semibold leading-tight line-clamp-2">
                  {name}
                </DialogTitle>
                {brand && <p className="text-xs text-muted-foreground mt-1">{brand}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-lg font-bold text-primary">Rp {formatPrice(price)}</span>
                  {isPromo && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-xs font-bold uppercase">
                      {t("page.cashier.promo", "Promo")}
                    </span>
                  )}
                  {isBundle && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-xs font-bold uppercase">
                      {t("breadcrumb.bundle")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => onOpenChange(false)}
              className="shrink-0 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={16} />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {description && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("page.product.form.description", "Deskripsi")}
              </h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {category && (
              <div className="bg-muted/30 rounded-lg px-3 py-2.5 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.product.form.category", "Kategori")}
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                  <Tag size={12} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{category}</span>
                </p>
              </div>
            )}
            {sku && (
              <div className="bg-muted/30 rounded-lg px-3 py-2.5 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  SKU
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5 font-mono">{sku}</p>
              </div>
            )}
            {stock !== undefined && (
              <div className="bg-muted/30 rounded-lg px-3 py-2.5 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.product.form.stock", "Stok")}
                </p>
                <p
                  className={`text-sm font-medium mt-0.5 ${isOutOfStock ? "text-destructive" : isLowStock ? "text-amber-600" : "text-foreground"}`}>
                  {stock}
                  {minStock != null && minStock > 0 && (
                    <span className="text-muted-foreground text-xs font-normal">
                      {" "}
                      {t("page.cashier.minStockOf", { min: minStock })}
                    </span>
                  )}
                </p>
              </div>
            )}
            {estimatedTime && (
              <div className="bg-muted/30 rounded-lg px-3 py-2.5 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.product.form.estimationTime", "Estimasi")}
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                  <Clock size={12} className="text-muted-foreground shrink-0" />
                  {estimatedTime} {t("page.product.form.minutes", "menit")}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isAvailable ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
              {isAvailable ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {isAvailable
                ? t("page.product.form.available", "Tersedia")
                : t("page.product.form.unavailable", "Tidak Tersedia")}
            </span>
            {point > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-600">
                {t("page.cashier.pointsValue", { value: point })}
              </span>
            )}
          </div>

          {hasVariants && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("page.product.form.variants", "Varian")}
              </h4>
              <div className="space-y-2">
                {variantGroups.map((group, gIdx) => {
                  const groupLabel =
                    group.name || group.nameOption || group.nameVariant || `Group ${gIdx + 1}`;
                  const options = group.options || group.variant || group.items || [];
                  return (
                    <div key={gIdx} className="bg-muted/30 rounded-lg p-3 border border-border/30">
                      <p className="text-xs font-semibold text-foreground mb-1.5">{groupLabel}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((opt, oIdx) => (
                          <span
                            key={oIdx}
                            className="px-2 py-1 rounded-md bg-background border border-border/60 text-xs text-foreground">
                            {opt.name || opt.nameVariant || opt.label || `Option ${oIdx + 1}`}
                            {(opt.price > 0 || opt.priceAdditional > 0) && (
                              <span className="text-primary ml-1">
                                +Rp {formatPrice(opt.price || opt.priceAdditional)}
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
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("page.product.form.modifiers", "Tambahan")}
              </h4>
              <div className="space-y-1.5">
                {modifierItems.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 border border-border/30">
                    <span className="text-sm text-foreground">{mod.name}</span>
                    {mod.price > 0 && (
                      <span className="text-xs font-medium text-primary">
                        +Rp {formatPrice(mod.price)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasIngredients && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("page.product.form.ingredients", "Bahan")}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full bg-muted/50 border border-border/40 text-xs text-foreground/80">
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!description &&
            !category &&
            !hasVariants &&
            !hasModifiers &&
            !hasIngredients &&
            stock == null && (
              <div className="text-center py-6">
                <Package size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground/60">
                  {t("page.product.form.noDetails", "Tidak ada detail tambahan")}
                </p>
              </div>
            )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/40">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t("common.close", "Tutup")}
          </Button>
          {onAddToCart && !isOutOfStock && (
            <Button
              onClick={() => {
                onAddToCart(product);
                onOpenChange(false);
              }}
              className="rounded-xl gap-2">
              <ShoppingCart size={14} />
              {t("page.cashier.addToCart", "Tambah ke Keranjang")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ProductDetailModal.propTypes = {
  product: PropTypes.object,
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onAddToCart: PropTypes.func
};

export default ProductDetailModal;

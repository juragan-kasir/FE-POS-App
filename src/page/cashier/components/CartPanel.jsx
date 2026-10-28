import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { optimizeImage } from "@/utils/image";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  DollarSign,
  Percent,
  Edit3,
  Check,
  X,
  Package,
  PackageX,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

const itemKey = (item) => item.cartKey || item.id || item.ID || item.idProduct || item._id;

const formatPrice = (value) => {
  if (value == null || isNaN(value)) return "0";
  return Number(value).toLocaleString("id-ID");
};

// F9-08: extracted + memoized so a change to one cart line (quantity,
// price override, delete) doesn't force React to re-diff every other
// line — mirrors Phase 8's ProductGridTile pattern. Only genuinely
// narrow, per-row values (booleans/primitives precomputed by the
// parent) and stable callbacks are passed down; everything the row
// types into (quantity input, price input) is local state here, synced
// from the item via effects, so an unrelated row's props truly never
// change on this row's edits. This also relies on order-list.js now
// preserving object references for untouched items on every mutation
// (also part of F9-08), so the default reference-equality check this
// memo uses actually bails for unrelated rows.
const CartLineItem = React.memo(function CartLineItem({
  item,
  canEditPrice,
  isEditing,
  hasError,
  onIncrement,
  onDecrement,
  onRequestDelete,
  onStartEditPrice,
  onCancelEditPrice,
  onSavePrice
}) {
  const { t } = useTranslation();
  const priceInputRef = useRef(null);
  const price = item.price || item.unitPrice || 0;
  const count = item.count || item.qty || 0;
  const lineTotal = item.totalPrice || price * count;
  const img = item.image || item.photo || item.ImageURL || item.imageProduct || item.image_url;

  const [qtyValue, setQtyValue] = useState(count);
  useEffect(() => {
    setQtyValue(count);
  }, [count]);

  const [priceValue, setPriceValue] = useState(String(price));
  useEffect(() => {
    if (isEditing) {
      setPriceValue(String(price));
      const timer = setTimeout(() => priceInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing, price]);

  const commitQtyChange = (newQty) => {
    const target = Number(newQty);
    // F9-24: never let a non-numeric or below-one quantity reach the line.
    // Garbage/empty text resets the field; 0 or negative asks for the
    // explicit delete confirmation instead of silently driving the count
    // to 0/negative.
    if (!Number.isFinite(target) || Number.isNaN(target)) {
      setQtyValue(count);
      return;
    }
    if (target === count) {
      setQtyValue(count);
      return;
    }
    if (target < 1) {
      onRequestDelete(item);
      return;
    }
    const diff = Math.round(target) - count;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) onIncrement(item);
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) onDecrement(item);
    }
  };

  const handleMinusClick = () => {
    if (count <= 1) {
      onRequestDelete(item);
    } else {
      onDecrement(item);
    }
  };

  return (
    <div className="group bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl p-3 hover:border-border/80 hover:shadow-sm transition-all duration-200">
      <div className="flex gap-3">
        {img ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted/50">
            <img
              src={optimizeImage(img) || "/placeholder.svg"}
              alt={item.nameProduct || item.name || ""}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.classList.add("flex", "items-center", "justify-center");
                const fallback = document.createElement("span");
                fallback.className = "text-xl font-bold text-muted-foreground/30";
                fallback.textContent =
                  (item.nameProduct || item.name || "?")[0]?.toUpperCase() || "?";
                e.target.parentElement.appendChild(fallback);
              }}
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-lg bg-muted border border-border/50 flex items-center justify-center shrink-0">
            <Package size={20} className="text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {item.nameProduct || item.name || t("page.cashier.unnamedProduct")}
                {item.variantName && (
                  <span className="text-muted-foreground/70 font-normal ml-1">
                    - {item.variantName}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRequestDelete(item)}
              aria-label={t("page.cashier.deleteTitle")}
              className="opacity-60 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleMinusClick}
                aria-label={t("page.cashier.decreaseQty", "Decrease quantity")}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-90">
                <Minus size={14} />
              </button>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={qtyValue}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    setQtyValue(Number.isNaN(parsed) ? count : parsed);
                  }}
                  onBlur={() => commitQtyChange(qtyValue)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitQtyChange(qtyValue);
                      e.target.blur();
                    }
                  }}
                  className="w-10 text-center text-sm font-semibold bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <button
                type="button"
                onClick={() => onIncrement(item)}
                aria-label={t("page.cashier.increaseQty", "Increase quantity")}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-90">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <span className="text-xs text-muted-foreground absolute left-1.5 top-1/2 -translate-y-1/2">
                      Rp
                    </span>
                    <input
                      ref={priceInputRef}
                      type="number"
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSavePrice(item, priceValue);
                        if (e.key === "Escape") onCancelEditPrice();
                      }}
                      className="w-24 pl-6 pr-2 py-1 text-xs rounded-lg bg-accent border border-border/60 outline-none focus:border-primary/50 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onSavePrice(item, priceValue)}
                    aria-label={t("common.save")}
                    className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-all">
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEditPrice}
                    aria-label={t("common.cancel")}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-all">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-bold text-foreground">
                    Rp {formatPrice(lineTotal)}
                  </span>
                  {canEditPrice && (
                    <button
                      type="button"
                      onClick={() => onStartEditPrice(item)}
                      aria-label={t("page.cashier.editPrice", "Edit price")}
                      className="p-1.5 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all opacity-60 group-hover:opacity-100">
                      <Edit3 size={12} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {hasError && (
            <p className="text-xs text-destructive mt-1">{t("page.cashier.invalidPrice")}</p>
          )}
          {item.discount > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Percent size={10} className="text-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium">
                {t("page.cashier.discountLabel")} {item.discount}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
CartLineItem.displayName = "CartLineItem";
CartLineItem.propTypes = {
  item: PropTypes.object.isRequired,
  canEditPrice: PropTypes.bool,
  isEditing: PropTypes.bool,
  hasError: PropTypes.bool,
  onIncrement: PropTypes.func.isRequired,
  onDecrement: PropTypes.func.isRequired,
  onRequestDelete: PropTypes.func.isRequired,
  onStartEditPrice: PropTypes.func.isRequired,
  onCancelEditPrice: PropTypes.func.isRequired,
  onSavePrice: PropTypes.func.isRequired
};

const CartPanel = ({
  items,
  subtotal,
  taxRate,
  taxAmount,
  onIncrement,
  onDecrement,
  onDelete,
  onCheckout,
  onClearCart,
  onParkCart,
  isParkingCart,
  totalItems,
  onUpdatePrice,
  isLoading,
  expanded = true,
  canEditPrice = false
}) => {
  const { t } = useTranslation();
  const [editingKey, setEditingKey] = useState(null);
  const [priceErrors, setPriceErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // F7-01: a pending, not-yet-committed price override — set once the typed
  // value passes validation, cleared on confirm/cancel. Keeping this separate
  // from `editingKey` is what makes the override a deliberate two-step
  // action instead of committing the moment the cashier hits Enter/Check.
  const [priceConfirm, setPriceConfirm] = useState(null);

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // F9-08: stable across renders (empty/minimal deps) so passing these to
  // every memoized CartLineItem never itself defeats the memoization.
  const requestDelete = useCallback((item) => setDeleteConfirm(item), []);
  const startEditPrice = useCallback((item) => setEditingKey(itemKey(item)), []);
  const cancelEditPrice = useCallback(() => setEditingKey(null), []);
  const savePrice = useCallback((item, rawValue) => {
    const key = itemKey(item);
    const val = parseFloat(rawValue);
    if (isNaN(val) || val < 0 || String(rawValue).trim() === "") {
      setPriceErrors((prev) => ({ ...prev, [key]: true }));
      return;
    }
    // F7-01: a validated value doesn't commit yet — it waits for an explicit
    // confirmation so a price override always takes a deliberate second step.
    setPriceConfirm({ item, newPrice: val, oldPrice: item.price || item.unitPrice || 0 });
  }, []);

  const confirmPriceOverride = () => {
    if (!priceConfirm) return;
    const key = itemKey(priceConfirm.item);
    onUpdatePrice?.(priceConfirm.item, priceConfirm.newPrice);
    setPriceConfirm(null);
    setEditingKey(null);
    setPriceErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const cancelPriceOverride = () => setPriceConfirm(null);

  const isEmpty = !items || items.length === 0;

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${!expanded ? "overflow-hidden" : ""}`}>
      {/* Collapsed state - show only icon */}
      {!expanded && (
        <div className="hidden lg:flex flex-col items-center justify-center h-full gap-3 py-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingBag size={20} className="text-primary" />
          </div>
          <span className="text-xs font-bold text-primary">{totalItems}</span>
        </div>
      )}

      {/* Expanded state - show full content */}
      {expanded && (
        <>
          <div className="hidden lg:flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
            <h2 className="font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("page.cashier.orderCount", { count: totalItems })}
            </h2>
            {!isEmpty && (
              <div className="flex items-center gap-3">
                {onParkCart && (
                  <button
                    type="button"
                    onClick={onParkCart}
                    disabled={isParkingCart}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Archive size={14} />
                    {t("page.cashier.parkCart", "Park Cart")}
                  </button>
                )}
                {onClearCart && (
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors">
                    <PackageX size={14} />
                    {t("page.cashier.clearCart")}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin overscroll-contain min-h-0 px-3 py-3 space-y-2">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center gap-4 h-full">
                <div className="w-20 h-20 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center">
                  <ShoppingBag size={36} className="text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">{t("page.cashier.emptyCart")}</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {t("page.cashier.emptyCartDesc")}
                  </p>
                </div>
              </div>
            ) : (
              items.map((item, idx) => {
                const key = itemKey(item);
                // W3-4 (K3): the server rejects a price override on a bundle
                // line, so bundles keep their authoritative bundlePrice.
                const lineCanEditPrice = canEditPrice && !item.isBundle;
                return (
                  <CartLineItem
                    key={key || idx}
                    item={item}
                    canEditPrice={lineCanEditPrice}
                    isEditing={lineCanEditPrice && editingKey === key}
                    hasError={!!safeGet(priceErrors, key)}
                    onIncrement={onIncrement}
                    onDecrement={onDecrement}
                    onRequestDelete={requestDelete}
                    onStartEditPrice={startEditPrice}
                    onCancelEditPrice={cancelEditPrice}
                    onSavePrice={savePrice}
                  />
                );
              })
            )}
          </div>

          <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm shrink-0 p-4 space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="border-t border-border/30 pt-2 flex items-center justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("page.cashier.subtotal")}</span>
                  <span className="font-medium text-foreground">Rp {formatPrice(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("page.cashier.tax")} ({Math.round(taxRate * 100)}%)
                    </span>
                    <span className="font-medium text-foreground">Rp {formatPrice(taxAmount)}</span>
                  </div>
                )}
                <div className="border-t border-border/30 pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {t("page.cashier.total")}
                  </span>
                  <span className="font-bold text-foreground text-lg">
                    Rp {formatPrice(subtotal + taxAmount)}
                  </span>
                </div>
              </div>
            )}
            <Button
              onClick={onCheckout}
              disabled={isLoading || isEmpty}
              className="w-full h-11 rounded-xl font-semibold text-sm relative overflow-hidden group/btn">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/90 opacity-90 group-hover/btn:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                <DollarSign size={16} />
                {t("page.cashier.checkout")}
              </span>
            </Button>
          </div>
        </>
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("page.cashier.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("page.cashier.deleteDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="danger" onClick={() => setDeleteConfirm(null)}>
              {t("page.cashier.deleteNo")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t("page.cashier.deleteYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* F7-01: price override confirmation — a validated price change never
          commits directly from the input; it always passes through here. */}
      <Dialog open={!!priceConfirm} onOpenChange={(open) => !open && cancelPriceOverride()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("page.cashier.confirmPriceOverrideTitle")}</DialogTitle>
            <DialogDescription>{t("page.cashier.confirmPriceOverrideDesc")}</DialogDescription>
          </DialogHeader>
          {priceConfirm && (
            <div className="flex items-center justify-center gap-2 text-sm py-2">
              <span className="text-muted-foreground line-through">
                Rp {formatPrice(priceConfirm.oldPrice)}
              </span>
              <span className="font-bold text-foreground">
                Rp {formatPrice(priceConfirm.newPrice)}
              </span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="danger" onClick={cancelPriceOverride}>
              {t("page.cashier.confirmPriceOverrideNo")}
            </Button>
            <Button variant="success" onClick={confirmPriceOverride}>
              {t("page.cashier.confirmPriceOverrideYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

CartPanel.propTypes = {
  items: PropTypes.array,
  subtotal: PropTypes.number,
  taxRate: PropTypes.number,
  taxAmount: PropTypes.number,
  onIncrement: PropTypes.func,
  onDecrement: PropTypes.func,
  onDelete: PropTypes.func,
  onCheckout: PropTypes.func,
  onClearCart: PropTypes.func,
  onParkCart: PropTypes.func,
  isParkingCart: PropTypes.bool,
  totalItems: PropTypes.number,
  onUpdatePrice: PropTypes.func,
  canEditPrice: PropTypes.bool,
  isLoading: PropTypes.bool,
  expanded: PropTypes.bool
};

export default CartPanel;

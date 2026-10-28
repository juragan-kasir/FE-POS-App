import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { X, Package, Check, PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { optimizeImage } from "@/utils/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const VariantModal = ({ product, onSelect, onClose }) => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedModifier, setSelectedModifier] = useState(null);

  const hasVariants = product?.variant?.length > 0;
  const hasOptions = product?.isOption && product?.options?.length > 0;
  const hasModifiers = product?.hasModifiers && product?.modifiers?.length > 0;

  const titleKey = hasOptions
    ? "page.cashier.selectOption"
    : hasModifiers
      ? "page.cashier.selectModifier"
      : "page.cashier.selectVariant";

  const formatPrice = (value) => {
    if (value == null || isNaN(value)) return "0";
    return Number(value).toLocaleString("id-ID");
  };

  const productImage = product?.image || product?.imageProduct || product?.photo || null;

  const totalPrice = useMemo(() => {
    const base = Number(product?.price) || 0;
    const optPrice = Number(selectedOption?.price) || 0;
    const modPrice = Number(selectedModifier?.price) || 0;
    return base + optPrice + modPrice;
  }, [product, selectedOption, selectedModifier]);

  const needsOption = hasVariants || hasOptions;
  const canAdd = needsOption ? !!selectedOption : true;

  if (!product) return null;

  return (
    // F9-04: migrated onto the project's accessible Dialog primitive —
    // Escape-to-close was previously a manual window keydown listener
    // (removed) working around the plain overlay div having none of
    // Radix's built-in Escape/focus-trap/focus-return behavior.
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0"
        withX={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-primary" />
            <DialogTitle className="text-lg font-bold">{t(titleKey)}</DialogTitle>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-4 bg-muted/30 rounded-xl p-4 border border-border/40">
            {productImage ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted/50">
                <img
                  src={optimizeImage(productImage) || "/placeholder.svg"}
                  alt={product.nameProduct || product.name || ""}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted border border-border/50 flex items-center justify-center shrink-0">
                <Package size={24} className="text-muted-foreground/40" />
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">
                {product.nameProduct || product.name || t("page.cashier.unnamedProduct")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("page.cashier.chooseVariant")}
              </p>
            </div>
          </div>

          {/* Legacy variants (flat list) */}
          {hasVariants && !hasOptions && !hasModifiers && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t("page.cashier.availableVariants")}
              </p>
              {product.variant
                .filter((v) => v != null && (v.nameVariant || v.name))
                .map((v, idx) => {
                  const isSelected = selectedOption?.label === (v.nameVariant || v.name);
                  const stock = v.stock != null ? Number(v.stock) : null;
                  const outOfStock = stock !== null && stock <= 0;
                  return (
                    <button
                      key={v.nameVariant || idx}
                      onClick={() =>
                        !outOfStock &&
                        setSelectedOption(
                          selectedOption?.label === (v.nameVariant || v.name)
                            ? null
                            : { label: v.nameVariant || v.name, price: v.price, image: v.image }
                        )
                      }
                      disabled={outOfStock}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                        outOfStock
                          ? "border-border/20 bg-muted/30 opacity-50 cursor-not-allowed"
                          : isSelected
                            ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                            : "border-border/40 bg-card/50 hover:border-border/70 hover:bg-accent/50"
                      }`}>
                      {v.image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted/50">
                          <img
                            src={optimizeImage(v.image) || "/placeholder.svg"}
                            alt={v.nameVariant || v.name || ""}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted/50 border border-border/30 flex items-center justify-center shrink-0">
                          <Package size={16} className="text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{v.nameVariant || v.name || "-"}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">Rp {formatPrice(v.price)}</p>
                          {stock !== null && (
                            <p
                              className={`text-xs ${outOfStock ? "text-destructive" : "text-muted-foreground/60"}`}>
                              {t("page.cashier.stock")}: {stock}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check size={12} className="text-primary-foreground" />
                        </div>
                      )}
                      {outOfStock && (
                        <PackageOpen size={16} className="text-destructive/60 shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>
          )}

          {/* Option groups */}
          {hasOptions && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground border-b border-border/30 pb-1">
                {t("page.kitchenDisplay.optionsLabel")}
              </p>
              {product.options.map((group) => (
                <div key={group.id || group.name}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{group.name}</p>
                  <div className="space-y-1.5 pl-2">
                    {group.options
                      ?.filter((o) => o.name)
                      .map((opt, idx) => {
                        const isSelected = selectedOption?.label === `${group.name} - ${opt.name}`;
                        const stock = opt.stock != null ? Number(opt.stock) : null;
                        const outOfStock = stock !== null && stock <= 0;
                        return (
                          <button
                            key={opt.name || idx}
                            onClick={() =>
                              !outOfStock &&
                              setSelectedOption(
                                selectedOption?.label === `${group.name} - ${opt.name}`
                                  ? null
                                  : {
                                      label: `${group.name} - ${opt.name}`,
                                      price: opt.price,
                                      stock: opt.stock
                                    }
                              )
                            }
                            disabled={outOfStock}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                              outOfStock
                                ? "border-border/20 bg-muted/30 opacity-50 cursor-not-allowed"
                                : isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border/30 bg-card/50 hover:border-border/60 hover:bg-accent/50"
                            }`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{opt.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                  +Rp {formatPrice(opt.price)}
                                </p>
                                {stock !== null && (
                                  <p
                                    className={`text-xs ${outOfStock ? "text-destructive" : "text-muted-foreground/60"}`}>
                                    {t("page.cashier.stock")}: {stock}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isSelected && <Check size={14} className="text-primary shrink-0" />}
                            {outOfStock && (
                              <PackageOpen size={14} className="text-destructive/60 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modifiers */}
          {hasModifiers && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground border-b border-border/30 pb-1">
                {t("page.product.detail.modifiers")}
              </p>
              {product.modifiers
                .filter((m) => m.name)
                .map((m, idx) => {
                  const isSelected = selectedModifier?.label === m.name;
                  const stock = m.stock != null ? Number(m.stock) : null;
                  const outOfStock = stock !== null && stock <= 0;
                  return (
                    <button
                      key={m.id || m.name || idx}
                      onClick={() =>
                        !outOfStock &&
                        setSelectedModifier(
                          selectedModifier?.label === m.name
                            ? null
                            : { label: m.name, price: m.price, stock: m.stock }
                        )
                      }
                      disabled={outOfStock}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                        outOfStock
                          ? "border-border/20 bg-muted/30 opacity-50 cursor-not-allowed"
                          : isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border/30 bg-card/50 hover:border-border/60 hover:bg-accent/50"
                      }`}>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}>
                        {isSelected && <Check size={12} className="text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{m.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            +Rp {formatPrice(m.price)}
                          </p>
                          {stock !== null && (
                            <p
                              className={`text-xs ${outOfStock ? "text-destructive" : "text-muted-foreground/60"}`}>
                              {t("page.cashier.stock")}: {stock}
                            </p>
                          )}
                        </div>
                      </div>
                      {outOfStock && (
                        <PackageOpen size={14} className="text-destructive/60 shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>
          )}

          {!hasVariants && !hasOptions && !hasModifiers && (
            <p className="text-sm text-muted-foreground/60 italic text-center py-4">
              {t("page.cashier.noVariants")}
            </p>
          )}
        </div>

        <div className="border-t border-border/50 p-4 shrink-0 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">{t("document.total")}</span>
            <span className="text-lg font-bold text-primary">Rp {formatPrice(totalPrice)}</span>
          </div>
          <Button
            variant="success"
            onClick={() => {
              // W3-4 (K3): option and modifier are kept as separate selections
              // so checkout sends them exactly as the server prices them
              // (base + option markup + modifier markup = totalPrice).
              const choice = {
                label:
                  [selectedOption?.label, selectedModifier?.label].filter(Boolean).join(" + ") ||
                  null,
                price: totalPrice,
                image: selectedOption?.image || null,
                options: selectedOption?.label ? [{ name: selectedOption.label }] : [],
                modifiers: selectedModifier?.label ? [{ name: selectedModifier.label }] : []
              };
              onSelect(choice);
            }}
            disabled={!canAdd}
            className="w-full h-12 rounded-xl font-semibold text-sm relative overflow-hidden group/btn">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/90 opacity-90 group-hover/btn:opacity-100 transition-opacity" />
            <span className="relative flex items-center justify-center gap-2">
              <Package size={16} />
              {t("page.cashier.addToCart")}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

VariantModal.propTypes = {
  product: PropTypes.object,
  onSelect: PropTypes.func,
  onClose: PropTypes.func
};

export default VariantModal;

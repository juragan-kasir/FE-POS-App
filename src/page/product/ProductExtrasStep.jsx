import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Check, GripVertical, Layers, Plus, Tag, Trash2, TrendingUp } from "lucide-react";
import { FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import ProductImageGallery from "@/components/organism/ProductImageGallery";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

// Step 3 of the product form (variants, add-ons, price tiers, images,
// status), shared by Tambah and Edit Produk. Its state and handlers come
// from useProductExtras.
const ProductExtrasStep = ({ form, extras }) => {
  const { t } = useTranslation();
  const {
    variantGroups,
    modifierItems,
    priceTiers,
    productImages,
    handleProductImagesChange,
    addVariantGroup,
    removeVariantGroup,
    updateVariantGroup,
    addVariantOption,
    updateVariantOption,
    removeVariantOption,
    addModifierItem,
    updateModifierItem,
    removeModifierItem,
    addPriceTier,
    updatePriceTier,
    removePriceTier,
    handleToggleOption,
    handleToggleModifier,
    confirmRemove
  } = extras;
  const isOption = form.watch("isOption");
  const hasModifiers = form.watch("hasModifiers");

  return (
    <>
      {/* Varian & Opsi + Modifiers */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
          <Layers size={18} className="text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            {t("page.product.form.variantSection")}
          </h3>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("page.product.form.hasVariant")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("page.product.form.hasVariantDesc")}
              </p>
            </div>
            <Switch
              checked={form.watch("isOption") || variantGroups.length > 0}
              onCheckedChange={handleToggleOption}
            />
          </div>
          {isOption && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              {variantGroups.map((group, groupIdx) => (
                <div key={group.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
                      {groupIdx + 1}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("page.product.form.variantSection")} {groupIdx + 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical size={16} className="text-muted-foreground shrink-0" />
                      <Input
                        placeholder={t("page.product.form.variantNamePlaceholder")}
                        value={group.name}
                        onChange={(e) => updateVariantGroup(group.id, "name", e.target.value)}
                        className="h-9 text-sm flex-1"
                        maxLength={FIELD_LIMITS.SHORT_LABEL}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() =>
                        confirmRemove(() => removeVariantGroup(group.id), variantGroups.length)
                      }>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {group.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground bg-muted rounded px-1 py-0.5 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <Input
                          placeholder={t("page.product.form.optionPlaceholder", {
                            number: idx + 1
                          })}
                          value={opt.name}
                          onChange={(e) =>
                            updateVariantOption(group.id, idx, "name", e.target.value)
                          }
                          className="h-9 text-sm flex-1"
                          maxLength={FIELD_LIMITS.SHORT_LABEL}
                        />
                        <div className="relative w-28 shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={Number(opt.price || 0).toLocaleString("id-ID")}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, "");
                              updateVariantOption(group.id, idx, "price", raw ? Number(raw) : 0);
                            }}
                            className="h-9 text-sm pl-8"
                          />
                        </div>
                        <Input
                          type="number"
                          placeholder={t("page.product.form.variantStockPlaceholder")}
                          value={opt.stock ?? 0}
                          onChange={(e) =>
                            updateVariantOption(group.id, idx, "stock", e.target.value)
                          }
                          className="h-9 text-sm w-20 shrink-0"
                        />
                        {group.options.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0"
                            onClick={() =>
                              confirmRemove(
                                () => removeVariantOption(group.id, idx),
                                group.options.length
                              )
                            }>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={() => addVariantOption(group.id)}
                    className="gap-1 h-8 text-xs">
                    <Plus size={14} /> {t("page.product.form.addOption")}
                  </Button>
                </div>
              ))}
              <Button type="button" variant="success" onClick={addVariantGroup} className="gap-2">
                <Plus size={16} /> {t("page.product.form.addVariantGroup")}
              </Button>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-border my-6" />

        {/* Modifiers */}
        <div>
          <div className="flex items-center gap-2 pb-4 mb-5">
            <Tag size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.product.form.modifierSection")}
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("page.product.form.hasModifier")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("page.product.form.hasModifierDesc")}
              </p>
            </div>
            <Switch
              checked={form.watch("hasModifiers") || modifierItems.length > 0}
              onCheckedChange={handleToggleModifier}
            />
          </div>
          {hasModifiers && (
            <div className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">{t("page.product.form.modifierInfo")}</p>
              {modifierItems.map((mod, modIdx) => (
                <div key={mod.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
                      {modIdx + 1}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("page.product.form.modifierSection")} {modIdx + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder={t("page.product.form.modifierNamePlaceholder")}
                      value={mod.name}
                      onChange={(e) => updateModifierItem(mod.id, "name", e.target.value)}
                      className="h-9 text-sm"
                      maxLength={FIELD_LIMITS.SHORT_LABEL}
                    />
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                          Rp
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={Number(mod.price).toLocaleString("id-ID")}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            updateModifierItem(mod.id, "price", raw ? Number(raw) : 0);
                          }}
                          className="h-9 text-sm pl-10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() =>
                          confirmRemove(() => removeModifierItem(mod.id), modifierItems.length)
                        }>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="success" onClick={addModifierItem} className="gap-2">
                <Plus size={16} /> {t("page.product.form.addModifier")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            {t("page.product.form.tierSection")}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-2 mb-4">
          {t("page.product.form.tierInfo")}
        </p>
        <div className="space-y-3">
          {priceTiers.map((tier, tierIdx) => (
            <div key={tier.id} className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
                  {tierIdx + 1}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {t("page.product.form.tierSection")} {tierIdx + 1}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t("page.product.form.tierNamePlaceholder")}
                  value={tier.name}
                  onChange={(e) => updatePriceTier(tier.id, "name", e.target.value)}
                  className="h-9 text-sm flex-1"
                  maxLength={FIELD_LIMITS.SHORT_LABEL}
                />
                <div className="relative w-40 shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={Number(tier.price).toLocaleString("id-ID")}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      updatePriceTier(tier.id, "price", raw ? Number(raw) : 0);
                    }}
                    className="h-9 text-sm pl-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 text-destructive shrink-0"
                  onClick={() => confirmRemove(() => removePriceTier(tier.id), priceTiers.length)}>
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="success"
            size="sm"
            className="gap-1"
            onClick={addPriceTier}>
            <Plus size={18} />
            {t("page.product.form.addTier")}
          </Button>
          {priceTiers.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("page.product.form.tierEmpty")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Gallery */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <ProductImageGallery images={productImages} onChange={handleProductImagesChange} />
        </div>

        {/* Status */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
            <Tag size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.product.form.statusSection")}
            </h3>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <div
                    className={`pt-2 flex items-center justify-between p-4 rounded-lg ${
                      field.value
                        ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                    }`}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          field.value
                            ? "bg-green-600 text-secondary"
                            : "bg-destructive/10 text-destructive"
                        }`}>
                        {field.value ? (
                          <Check size={20} />
                        ) : (
                          <span className="text-lg font-bold">⏻</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t("page.product.form.statusLabel")}{" "}
                          {field.value
                            ? t("page.product.form.active")
                            : t("page.product.form.inactive")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {field.value
                            ? t("page.product.form.activeDesc")
                            : t("page.product.form.inactiveDesc")}
                        </p>
                      </div>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem>
                  <div
                    className={`pt-2 flex items-center justify-between p-4 rounded-lg ${
                      field.value
                        ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                    }`}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          field.value
                            ? "bg-green-600 text-secondary"
                            : "bg-destructive/10 text-destructive"
                        }`}>
                        {field.value ? (
                          <Check size={20} />
                        ) : (
                          <span className="text-lg font-bold">⏻</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {field.value ? t("page.product.form.yes") : t("page.product.form.no")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {field.value
                            ? t("page.product.form.availableDesc")
                            : t("page.product.form.unavailableDesc")}
                        </p>
                      </div>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
};

ProductExtrasStep.propTypes = {
  form: PropTypes.object.isRequired,
  extras: PropTypes.object.isRequired
};

export default ProductExtrasStep;

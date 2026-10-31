import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormDescription } from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import IdsMultiSelect from "./IdsMultiSelect";
import { CAMPAIGN_TYPE_LABELS } from "./promoForm";

const PromoTargetingTab = ({
  idPrefix,
  form,
  isStoreReady,
  allStores,
  applicableIds,
  onApplicableIdsChange,
  options
}) => {
  const { t } = useTranslation();
  const watchedApplicableTo = form.watch("applicableTo");
  const watchedIsCombinable = form.watch("isCombinable");
  const {
    productOptions,
    productsLoading,
    categoryOptions,
    categoriesLoading,
    tierOptions,
    combinablePromos,
    combinableLoading
  } = options;

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-promo-campaign-applicable-to`}>
            {t("page.promo.form.applicableTo")}
          </Label>
          <Combobox
            id={`${idPrefix}-promo-campaign-applicable-to`}
            options={[
              { value: "all", label: t("page.supplier.comparison.allProducts") },
              { value: "specific_products", label: t("page.promo.ui.specificProducts") },
              {
                value: "specific_categories",
                label: t("page.promo.ui.specificCategories")
              },
              { value: "specific_members", label: t("page.promo.ui.specificMembers") }
            ]}
            value={form.watch("applicableTo")}
            onChange={(v) => {
              onApplicableIdsChange([]);
              form.setValue("applicableTo", v);
            }}
            disabled={!isStoreReady}
            placeholder={
              !isStoreReady
                ? t("page.bom.add.form.selectStoreFirst")
                : t("page.promo.ui.selectScope")
            }
            searchPlaceholder={t("common.search.scope")}
          />
          {!isStoreReady && (
            <p className="text-xs text-muted-foreground">
              {t("page.bundle.form.storeSection.desc")}
            </p>
          )}
        </div>
        {["specific_products", "specific_categories", "specific_members"].includes(
          watchedApplicableTo
        ) &&
          isStoreReady && (
            <div className="p-3 bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg">
              {watchedApplicableTo === "specific_products" && (
                <IdsMultiSelect
                  options={productOptions}
                  value={applicableIds}
                  loading={productsLoading}
                  onChange={onApplicableIdsChange}
                  placeholder={t("page.discount.form.selectProduct")}
                  selectedLabel="produk dipilih"
                  searchPlaceholder={t("common.search.product")}
                  emptyMessage={t("page.cashier.noProducts")}
                />
              )}
              {watchedApplicableTo === "specific_categories" && (
                <IdsMultiSelect
                  options={categoryOptions}
                  value={applicableIds}
                  loading={categoriesLoading}
                  onChange={onApplicableIdsChange}
                  placeholder={t("page.promo.ui.selectCategory")}
                  selectedLabel="kategori dipilih"
                  searchPlaceholder={t("common.search.category")}
                  emptyMessage={t("page.category.notFound")}
                />
              )}
              {watchedApplicableTo === "specific_members" && (
                <IdsMultiSelect
                  options={tierOptions}
                  value={applicableIds}
                  onChange={onApplicableIdsChange}
                  placeholder={t("page.promo.ui.selectMemberTier")}
                  selectedLabel="tier dipilih"
                  searchPlaceholder={t("common.search.tier")}
                  emptyMessage={t("page.promo.ui.tierNotFound")}
                />
              )}
            </div>
          )}
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-promo-campaign-max-usage-total`}>
            {t("page.promo.form.maxUsageTotal")}
          </Label>
          <Input
            id={`${idPrefix}-promo-campaign-max-usage-total`}
            type="number"
            {...form.register("maxUsageTotal", { valueAsNumber: true })}
            placeholder={t("common.unlimited")}
          />
          <FormDescription>{t("common.optionalField")}</FormDescription>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-promo-campaign-max-usage-per-member`}>
            {t("page.promo.form.maxUsagePerMember")}
          </Label>
          <Input
            id={`${idPrefix}-promo-campaign-max-usage-per-member`}
            type="number"
            {...form.register("maxUsagePerMember", { valueAsNumber: true })}
            placeholder={t("common.unlimited")}
          />
          <FormDescription>{t("common.optionalField")}</FormDescription>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-promo-campaign-priority`}>
            {t("page.promo.form.priority")}
          </Label>
          <Input
            id={`${idPrefix}-promo-campaign-priority`}
            type="number"
            {...form.register("priority", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {form.watch("autoActivate") ? t("page.promo.ui.autoActive") : t("common.inactive")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("page.promo.ui.activateAutomaticallyOnTheStart")}
            </p>
          </div>
          <Switch
            checked={!!form.watch("autoActivate")}
            onCheckedChange={(v) => form.setValue("autoActivate", v)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("page.promo.form.isCombinable")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("page.promo.ui.canBeCombinedWithOther")}
            </p>
          </div>
          <Switch
            checked={!!form.watch("isCombinable")}
            onCheckedChange={(v) => form.setValue("isCombinable", v)}
          />
        </div>
        {watchedIsCombinable && (
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-xs font-medium text-foreground">
              {t("page.promo.ui.activePromo")}{" "}
              {allStores ? t("header.allStore") : t("common.ui.selectedStores")}
            </p>
            {combinableLoading ? (
              <p className="text-xs text-muted-foreground">{t("page.promo.ui.loadingPromos")}</p>
            ) : combinablePromos.length === 0 ? (
              <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30 text-center">
                <p className="text-xs text-muted-foreground">
                  {t("page.promo.ui.noActivePromosInThis")}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {combinablePromos.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                    <span className="text-xs font-medium text-foreground truncate">
                      {promo.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                      {CAMPAIGN_TYPE_LABELS[promo.type] || promo.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default PromoTargetingTab;

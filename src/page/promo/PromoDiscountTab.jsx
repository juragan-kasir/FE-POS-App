import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDescription } from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import { formatIDR, parseIDR } from "./promoForm";
import { usePromoTypeFlags } from "./usePromoTypeFlags";

const MONEY_INPUT_CLASS = "h-10 text-right";

const PromoDiscountTab = ({ idPrefix, form, onDiscountTypeChange }) => {
  const { t } = useTranslation();
  const { isBirthday, isFreeItem, isPercentage, isSpendGet, isBuyXGetY, isManual } =
    usePromoTypeFlags(form);
  const showDiscountSettings = !isManual;
  const watchedDiscountValue = form.watch("discountValue");
  const watchedMaxDiscount = form.watch("maxDiscount");
  const watchedMinPurchase = form.watch("minPurchase");

  return (
    <>
      {showDiscountSettings ? (
        <div className="space-y-4">
          {isBirthday && (
            <p className="text-xs text-muted-foreground">
              {t("page.promo.ui.theBirthdayTypeAppliesAn")}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-promo-campaign-discount-type`}>
                {t("page.promo.form.discountType")}
              </Label>
              <Combobox
                id={`${idPrefix}-promo-campaign-discount-type`}
                options={[
                  { value: "percentage", label: t("page.discount.form.percent") },
                  { value: "fixed", label: t("page.promo.ui.fixedAmount") },
                  { value: "free_item", label: t("page.promo.ui.freeItem") }
                ]}
                value={form.watch("discountType")}
                onChange={onDiscountTypeChange}
                disabled={isBirthday}
                placeholder={t("page.discount.form.typePlaceholder")}
                searchPlaceholder={t("common.search.discountType")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-discount-value">{t("page.promo.form.discountValue")}</Label>
              {isFreeItem || isBirthday ? (
                <Input
                  id="promo-discount-value"
                  disabled
                  value="N/A"
                  className={`${MONEY_INPUT_CLASS} bg-muted`}
                />
              ) : isPercentage ? (
                <div className="relative">
                  <Input
                    id="promo-discount-value"
                    type="number"
                    value={watchedDiscountValue ?? ""}
                    onChange={(e) => form.setValue("discountValue", Number(e.target.value) || 0)}
                    className={MONEY_INPUT_CLASS}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              ) : (
                <Input
                  id="promo-discount-value"
                  type="text"
                  inputMode="numeric"
                  value={watchedDiscountValue ? formatIDR(watchedDiscountValue) : ""}
                  onChange={(e) => form.setValue("discountValue", parseIDR(e.target.value))}
                  placeholder="Rp 0"
                  className={MONEY_INPUT_CLASS}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-promo-campaign-max-discount`}>
                {t("page.promo.form.maxDiscount")}
              </Label>
              <Input
                id={`${idPrefix}-promo-campaign-max-discount`}
                type="text"
                inputMode="numeric"
                disabled={!isPercentage}
                value={
                  !isPercentage ? "N/A" : watchedMaxDiscount ? formatIDR(watchedMaxDiscount) : ""
                }
                onChange={(e) =>
                  isPercentage && form.setValue("maxDiscount", parseIDR(e.target.value))
                }
                placeholder={!isPercentage ? "N/A" : "Rp 0"}
                className={`${MONEY_INPUT_CLASS} ${!isPercentage ? "bg-muted cursor-not-allowed" : ""}`}
              />
              {!isPercentage && (
                <p className="text-xs text-muted-foreground">
                  {t("page.promo.ui.onlyAppliesToThePercentage")}
                </p>
              )}
              <FormDescription>{t("common.optionalField")}</FormDescription>
            </div>
            {(isSpendGet || isBuyXGetY) && (
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-promo-campaign-min-purchase`}>
                  {t("page.promo.form.minPurchase")}
                </Label>
                <Input
                  id={`${idPrefix}-promo-campaign-min-purchase`}
                  type="text"
                  inputMode="numeric"
                  value={watchedMinPurchase ? formatIDR(watchedMinPurchase) : ""}
                  onChange={(e) => form.setValue("minPurchase", parseIDR(e.target.value))}
                  placeholder="Rp 0"
                  className={MONEY_INPUT_CLASS}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("page.promo.ui.aManualCampaignNeedsNo")}</p>
      )}
    </>
  );
};

export default PromoDiscountTab;

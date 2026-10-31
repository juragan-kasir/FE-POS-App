import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormDescription } from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const PromoGeneralTab = ({ idPrefix, form, onTypeChange }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor={`${idPrefix}-promo-campaign-name`}>
          {t("page.promo.form.name")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-promo-campaign-name`}
          {...form.register("name")}
          placeholder={t("page.promo.form.namePlaceholder")}
          maxLength={FIELD_LIMITS.BUSINESS_NAME}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div className="md:col-span-2 space-y-2">
        <Label htmlFor={`${idPrefix}-promo-campaign-description`}>
          {t("page.promo.form.description")}
        </Label>
        <Textarea
          id={`${idPrefix}-promo-campaign-description`}
          {...form.register("description")}
          rows={3}
          placeholder={t("page.promo.form.descriptionPlaceholder")}
          maxLength={FIELD_LIMITS.DESCRIPTION}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-promo-campaign-code`}>{t("page.promo.form.code")}</Label>
        <Input
          id={`${idPrefix}-promo-campaign-code`}
          {...form.register("code")}
          className="uppercase"
          placeholder={t("page.promo.form.codePlaceholder")}
          maxLength={FIELD_LIMITS.CODE}
        />
        <FormDescription>{t("common.optionalField")}</FormDescription>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-promo-campaign-type`}>
          {t("page.promo.form.type")} <span className="text-destructive">*</span>
        </Label>
        <Combobox
          id={`${idPrefix}-promo-campaign-type`}
          options={[
            { value: "happy_hour", label: t("page.discount.form.promoType.happyHour") },
            { value: "birthday", label: t("page.promo.ui.birthday") },
            { value: "buy_x_get_y", label: t("page.promo.ui.buyXGetY") },
            { value: "spend_get", label: t("page.promo.ui.spendGet") },
            { value: "manual", label: t("page.backup.triggerManual") },
            { value: "automatic", label: t("page.recipeHpp.status.auto") }
          ]}
          value={form.watch("type")}
          onChange={onTypeChange}
          placeholder={t("page.promo.form.typePlaceholder") || "Pilih tipe campaign"}
          searchPlaceholder={t("common.search.type")}
        />
      </div>
    </div>
  );
};

export default PromoGeneralTab;

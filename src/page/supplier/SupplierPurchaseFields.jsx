import React from "react";
import { useTranslation } from "react-i18next";
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const SupplierPurchaseFields = ({ form }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="paymentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.paymentType", "Tipe Pembayaran")}</FormLabel>
              <Combobox
                options={[
                  {
                    value: "cbd",
                    label: t("page.supplier.ui.cbdCashBeforeDelivery")
                  },
                  {
                    value: "cad",
                    label: t("page.supplier.ui.cadCashAfterDelivery")
                  },
                  {
                    value: "tempo",
                    label: t("page.supplier.ui.paymentTermsCredit")
                  }
                ]}
                value={field.value}
                onChange={field.onChange}
                placeholder={t("page.supplier.ui.selectPaymentType")}
                searchPlaceholder={t("common.search.generic")}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch("paymentType") === "tempo" && (
          <FormField
            control={form.control}
            name="tempoDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("page.supplier.form.tempoDays", "Tempo (Hari)")}</FormLabel>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                />
                <FormDescription>
                  {t("page.supplier.form.tempoDaysDesc", "Jatuh tempo pembayaran dalam hari")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="defaultDiscount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.defaultDiscount", "Diskon Default (%)")}</FormLabel>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0"
                value={field.value || ""}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("page.supplier.form.defaultDescription", "Deskripsi Default")}
              </FormLabel>
              <Textarea
                placeholder={t(
                  "page.supplier.form.defaultDescriptionPlaceholder",
                  "Deskripsi default untuk pembelian"
                )}
                rows={2}
                {...field}
                maxLength={FIELD_LIMITS.DESCRIPTION}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

export default SupplierPurchaseFields;

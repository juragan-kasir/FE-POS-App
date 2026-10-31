import React from "react";
import { useTranslation } from "react-i18next";
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const SupplierTaxFields = ({ form }) => {
  const { t } = useTranslation();

  return (
    <>
      <FormField
        control={form.control}
        name="taxInclude"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <FormLabel>{t("page.supplier.form.taxInclude", "Harga Termasuk Pajak")}</FormLabel>
                <FormDescription>
                  {t("page.supplier.form.taxIncludeDesc", "Jika aktif, harga sudah termasuk PPN")}
                </FormDescription>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="taxType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.taxType", "Jenis Pajak")}</FormLabel>
              <Combobox
                options={[
                  { value: "ppn", label: "PPN" },
                  { value: "pph", label: "PPH" }
                ]}
                value={field.value || ""}
                onChange={field.onChange}
                placeholder={t("page.supplier.ui.selectTaxType")}
                searchPlaceholder={t("common.search.generic")}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taxTransactionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("page.supplier.form.taxTransactionType", "Tipe Transaksi Pajak")}
              </FormLabel>
              <Combobox
                options={[
                  { value: "purchase", label: t("sidebar.section.pembelian") },
                  {
                    value: "service",
                    label: t("page.product.add.productType.service")
                  }
                ]}
                value={field.value || ""}
                onChange={field.onChange}
                placeholder={t("page.supplier.ui.selectTransactionType")}
                searchPlaceholder={t("common.search.generic")}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taxNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.taxNumber", "NPWP")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.taxNumberPlaceholder", "Nomor NPWP")}
                {...field}
                maxLength={FIELD_LIMITS.NPWP}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taxName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.taxName", "Nama NPWP")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.taxNamePlaceholder", "Nama sesuai NPWP")}
                {...field}
                maxLength={FIELD_LIMITS.BUSINESS_NAME}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nitku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.nitku", "NITKU")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.nitkuPlaceholder", "NITKU")}
                {...field}
                maxLength={FIELD_LIMITS.NITKU}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

export default SupplierTaxFields;

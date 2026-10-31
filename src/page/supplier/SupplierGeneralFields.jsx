import React from "react";
import { useTranslation } from "react-i18next";
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const SupplierGeneralFields = ({ form, categoryOptions }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("page.supplier.form.name")} <span className="text-destructive">*</span>
              </FormLabel>
              <Input
                placeholder={t("page.supplier.form.namePlaceholder")}
                {...field}
                maxLength={FIELD_LIMITS.BUSINESS_NAME}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.contactPerson")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.contactPersonPlaceholder")}
                {...field}
                maxLength={FIELD_LIMITS.PERSON_NAME}
              />
              <FormMessage />
              <FormDescription>{t("common.optionalField")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("page.supplier.form.phone")} <span className="text-destructive">*</span>
              </FormLabel>
              <Input
                placeholder={t("page.supplier.form.phonePlaceholder")}
                inputMode="numeric"
                maxLength={FIELD_LIMITS.PHONE}
                {...field}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                  field.onChange(v);
                }}
              />
              <FormMessage />
              <FormDescription>{t("common.phoneHintMin")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.email")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.emailPlaceholder")}
                {...field}
                maxLength={FIELD_LIMITS.EMAIL}
              />
              <FormMessage />
              <FormDescription>{t("common.optionalField")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplierCategory.title", "Kategori Supplier")}</FormLabel>
              <Combobox
                options={categoryOptions}
                value={field.value ? String(field.value) : ""}
                onChange={(v) => field.onChange(v ? Number(v) : null)}
                placeholder={t("page.supplier.categoryPlaceholder", "Pilih kategori...")}
                searchPlaceholder={t("common.search")}
              />
              <FormMessage />
              <FormDescription>{t("common.optionalField")}</FormDescription>
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("page.supplier.form.address")}</FormLabel>
            <Textarea
              placeholder={t("page.supplier.form.addressPlaceholder")}
              rows={3}
              {...field}
              maxLength={FIELD_LIMITS.ADDRESS}
            />
            <FormMessage />
            <FormDescription>{t("common.optionalField")}</FormDescription>
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.mobile", "Mobile")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.mobilePlaceholder", "Nomor HP/WA utama")}
                {...field}
                maxLength={FIELD_LIMITS.PHONE}
              />
              <FormMessage />
              <FormDescription>{t("common.optionalField")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="whatsapp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.whatsapp", "WhatsApp")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.whatsappPlaceholder", "Nomor WhatsApp")}
                {...field}
                maxLength={FIELD_LIMITS.PHONE}
              />
              <FormMessage />
              <FormDescription>{t("common.optionalField")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fax"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.fax", "Fax")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.faxPlaceholder", "Nomor Fax")}
                {...field}
                maxLength={FIELD_LIMITS.PHONE}
              />
              <FormMessage />
              <FormDescription>{t("common.optionalField")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("page.supplier.form.website", "Website")}</FormLabel>
              <Input
                placeholder={t("page.supplier.form.websitePlaceholder", "https://")}
                {...field}
                maxLength={FIELD_LIMITS.URL}
              />
              <FormMessage />
              <FormDescription>{t("common.optionalField")}</FormDescription>
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

export default SupplierGeneralFields;

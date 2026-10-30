import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, Info, Package, Plus } from "lucide-react";
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ConversionFactorField from "@/page/product/ConversionFactorField";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

// Step 1 of the product form (name, category, type, description, optional
// details, units, tax), shared by Tambah and Edit Produk. The recipe card
// differs (a hint before the product exists, the BOM after), so each page
// passes its own as recipeCard.
const ProductInfoStep = ({
  form,
  categories,
  taxOptions,
  isSuperAdmin,
  noStockOpname,
  optionalOpen,
  onOptionalOpenChange,
  recipeCard
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tipeProduk = form.watch("tipeProduk");
  const setOptionalOpen = onOptionalOpenChange;
  const unitOptions = [
    { value: "pcs", label: t("page.product.form.unit.pcs") },
    { value: "item", label: t("page.product.form.unit.item") },
    { value: "unit", label: t("page.product.form.unit.unit") },
    { value: "buah", label: t("page.product.form.unit.buah") },
    { value: "pasang", label: t("page.product.form.unit.pasang") },
    { value: "set", label: t("page.product.form.unit.set") },
    { value: "lusin", label: t("page.product.form.unit.lusin") },
    { value: "pack", label: t("page.product.form.unit.pack") },
    { value: "box", label: t("page.product.form.unit.box") },
    { value: "karton", label: t("page.product.form.unit.karton") },
    { value: "kg", label: t("page.product.form.unit.kg") },
    { value: "gram", label: t("page.product.form.unit.gram") },
    { value: "liter", label: t("page.product.form.unit.liter") },
    { value: "ml", label: t("page.product.form.unit.ml") },
    { value: "meter", label: t("page.product.form.unit.meter") },
    { value: "cm", label: t("page.product.form.unit.cm") },
    { value: "cup", label: t("page.product.form.unit.cup") },
    { value: "gelas", label: t("page.product.form.unit.gelas") },
    { value: "porsi", label: t("page.product.form.unit.porsi") }
  ];

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Informasi Produk */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
          <Info size={18} className="text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            {t("page.product.add.productInfoSection")}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nameProduct"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>
                  {t("page.product.form.nameProduct")} <span className="text-destructive">*</span>
                </FormLabel>
                <Input
                  placeholder={t("page.product.form.namePlaceholder")}
                  {...field}
                  maxLength={FIELD_LIMITS.BUSINESS_NAME}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("page.product.form.category")} <span className="text-destructive">*</span>
                </FormLabel>
                <Combobox
                  options={categories.map((c) => ({
                    value: String(c.id),
                    label: c.name
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("page.product.form.categoryPlaceholder")}
                  searchPlaceholder={t("page.product.form.categorySearch")}
                />
                <FormDescription>{t("page.product.form.categoryHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipeProduk"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("page.product.form.tipeProduk")}</FormLabel>
                <Combobox
                  options={[
                    { value: "menu", label: t("page.product.form.tipeProdukMenu") },
                    {
                      value: "bahan_baku",
                      label: t("page.product.form.tipeProdukBahanBaku")
                    }
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("page.product.form.tipeProduk")}
                  searchPlaceholder={t("common.search.generic")}
                />
                <FormMessage />
                {noStockOpname && (
                  <div className="flex items-start gap-2.5 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900">
                    <AlertTriangle size={18} className="text-amber-600 text-base mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">
                        {t("page.product.form.noStockOpname")}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {t("page.product.form.noStockOpnameWarning")}
                      </p>
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimationTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("page.product.form.estimationTime")}</FormLabel>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={
                      field.value !== undefined && field.value !== ""
                        ? Number(field.value).toLocaleString("id-ID")
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      field.onChange(raw ? Number(raw) : "");
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {t("page.product.form.minutes")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("page.product.form.estimationTimeDesc")}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("page.product.form.description")}</FormLabel>
                <Textarea
                  placeholder={t("page.product.form.descPlaceholder")}
                  rows={3}
                  {...field}
                  maxLength={FIELD_LIMITS.DESCRIPTION}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Collapsible
          open={optionalOpen}
          onOpenChange={setOptionalOpen}
          className="mt-5 border-t pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={18} className="text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("page.product.form.optionalInfo")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("page.product.form.optionalInfoDesc")}
                </p>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${optionalOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.product.form.brand")}</FormLabel>
                    <Input
                      placeholder={t("page.product.form.brandPlaceholder")}
                      {...field}
                      maxLength={FIELD_LIMITS.BUSINESS_NAME}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.product.form.brandOptional")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.product.form.sku")}</FormLabel>
                    <Input
                      placeholder={t("page.product.form.skuPlaceholder2")}
                      {...field}
                      maxLength={FIELD_LIMITS.CODE}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.product.form.skuOptional")}
                    </p>
                    <FormMessage />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.product.form.barcode")}</FormLabel>
                    <Input
                      placeholder={t("page.product.form.barcodePlaceholder")}
                      {...field}
                      maxLength={FIELD_LIMITS.BARCODE}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.product.form.barcodeOptional")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.product.form.unit")}</FormLabel>
                    <Combobox
                      options={unitOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("page.product.form.unitPlaceholder")}
                      searchPlaceholder={t("page.product.form.unitSearch")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.product.form.baseUnit")}</FormLabel>
                    <Combobox
                      options={[
                        { value: "pcs", label: t("page.product.form.baseUnitPcs") },
                        {
                          value: "gram",
                          label: t("page.product.form.baseUnitGram")
                        },
                        { value: "ml", label: t("page.product.form.baseUnitMl") },
                        { value: "cm", label: t("page.product.form.baseUnitCm") },
                        {
                          value: "buah",
                          label: t("page.product.form.baseUnitBuah")
                        },
                        {
                          value: "lembar",
                          label: t("page.product.form.baseUnitLembar")
                        }
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("page.product.form.baseUnitPlaceholder")}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.product.form.baseUnitHelper")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ConversionFactorField form={form} />

              {isSuperAdmin && (
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("page.product.form.tax")}</FormLabel>
                      {taxOptions.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg bg-muted/20">
                          <div className="text-center flex flex-col items-center gap-2">
                            <Package size={28} className="text-muted-foreground/60" />
                            <p className="text-sm font-medium text-foreground">
                              {t("page.product.form.noTax")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("page.product.form.noTaxDesc")}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={() => navigate("/tax-list")}
                            className="gap-2">
                            <Plus size={18} className="text-base" />
                            {t("page.product.form.addTax")}
                          </Button>
                        </div>
                      ) : (
                        <Combobox
                          options={taxOptions.map((tOpt) => ({
                            value: String(tOpt.id),
                            label: `${tOpt.name} (${tOpt.rate}%)`
                          }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("page.product.form.taxPlaceholder")}
                          searchPlaceholder={t("page.product.form.taxSearch")}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {tipeProduk === "menu" && recipeCard}
    </div>
  );
};

ProductInfoStep.propTypes = {
  form: PropTypes.object.isRequired,
  categories: PropTypes.array,
  taxOptions: PropTypes.array,
  isSuperAdmin: PropTypes.bool,
  noStockOpname: PropTypes.bool,
  optionalOpen: PropTypes.bool,
  onOptionalOpenChange: PropTypes.func.isRequired,
  recipeCard: PropTypes.node
};

export default ProductInfoStep;

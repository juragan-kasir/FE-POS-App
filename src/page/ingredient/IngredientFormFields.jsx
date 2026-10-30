import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Check, Package } from "lucide-react";
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { TabsContent } from "@/components/ui/tabs";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import IngredientSourceField from "@/page/ingredient/components/IngredientSourceField";
import { formatQuantity } from "@/utils/quantity";
import { getIngredientStockState } from "@/utils/ingredientStockState";

// The four tabs of the ingredient form (information, conversion, stock,
// status), shared by Tambah and Edit Bahan Baku. Each page keeps its own
// logic (loading the record, the store/supplier/category resets) and passes
// the lists and flags in. With `existing` (the loaded ingredient) the stock
// is read-only: it changes through stock movements, not this form.
const IngredientFormFields = ({
  form,
  existing,
  source,
  changeSource,
  pickFromCatalog,
  suppliers,
  suppliersLoading,
  isSupplierDisabled,
  categories,
  categoriesLoading,
  isCategoryDisabled,
  isNameDisabled,
  productNamesLoading,
  supplierProductOptions,
  allSupplierProductsData,
  allSupplierProductsLoading
}) => {
  const { t } = useTranslation();
  const watchUnit = form.watch("unit");
  const watchBaseUnit = form.watch("baseUnit");
  const watchConversionFactor = form.watch("conversionFactor");
  const watchSupplier = form.watch("supplier");
  const watchName = form.watch("name");

  const unitOptions = [
    { value: "pcs", label: t("page.ingredient.form.unitPcs") },
    { value: "buah", label: t("page.ingredient.form.unitBuah") },
    { value: "kg", label: t("page.ingredient.form.unitKg") },
    { value: "gram", label: t("page.ingredient.form.unitGram") },
    { value: "liter", label: t("page.ingredient.form.unitLiter") },
    { value: "ml", label: t("page.ingredient.form.unitMl") },
    { value: "meter", label: t("page.ingredient.form.unitMeter") },
    { value: "cm", label: t("page.ingredient.form.unitCm") },
    { value: "lusin", label: t("page.ingredient.form.unitLusin") },
    { value: "pack", label: t("page.ingredient.form.unitPack") },
    { value: "box", label: t("page.ingredient.form.unitBox") },
    { value: "karton", label: t("page.ingredient.form.unitKarton") },
    { value: "krat", label: t("page.ingredient.form.unitKrat") }
  ];

  const baseUnitOptions = [
    { value: "pcs", label: t("page.ingredient.form.unitPcs") },
    { value: "gram", label: t("page.ingredient.form.unitGram") },
    { value: "ml", label: t("page.ingredient.form.unitMl") },
    { value: "cm", label: t("page.ingredient.form.unitCm") },
    { value: "buah", label: t("page.ingredient.form.unitBuah") },
    { value: "lembar", label: t("page.ingredient.form.unitLembar") }
  ];

  const convLabel =
    watchUnit === "kg"
      ? t("page.ingredient.form.convKg")
      : watchUnit === "liter"
        ? t("page.ingredient.form.convLiter")
        : watchUnit === "meter"
          ? t("page.ingredient.form.convMeter")
          : watchUnit === "lusin"
            ? t("page.ingredient.form.convLusin")
            : watchUnit === "karton"
              ? t("page.ingredient.form.convKarton")
              : watchUnit === "box"
                ? t("page.ingredient.form.convBox")
                : watchUnit === "pack"
                  ? t("page.ingredient.form.convPack")
                  : t("page.ingredient.form.convNoAuto");

  return (
    <>
      <TabsContent value="informasi" className="mt-0">
        <div className="space-y-6">
          <IngredientSourceField value={source} onChange={changeSource} />
          <div
            className={`grid grid-cols-1 gap-4 ${source === "supplier" ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
            {source === "supplier" && (
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.ingredient.form.supplierLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Combobox
                      options={suppliers
                        .filter((s) => s.status === "active")
                        .map((s) => ({
                          value: String(s.id),
                          label: s.name
                        }))}
                      value={field.value || ""}
                      onChange={(v) => field.onChange(v || null)}
                      placeholder={
                        isSupplierDisabled
                          ? t("page.ingredient.form.supplierDisabledPlaceholder")
                          : t("page.ingredient.form.supplierPlaceholder")
                      }
                      searchPlaceholder={t("page.ingredient.form.supplierSearchPlaceholder")}
                      disabled={isSupplierDisabled}
                      loading={suppliersLoading}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.ingredient.form.categoryLabel")}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <Combobox
                    options={categories
                      .filter((c) => c.status === "active")
                      .map((c) => ({
                        value: String(c.id),
                        label: c.name
                      }))}
                    value={field.value || ""}
                    onChange={(v) => field.onChange(v || null)}
                    placeholder={
                      isCategoryDisabled
                        ? t("page.ingredient.form.categoryDisabledPlaceholder")
                        : t("page.ingredient.form.categoryPlaceholder")
                    }
                    searchPlaceholder={t("page.ingredient.form.categorySearchPlaceholder")}
                    disabled={isCategoryDisabled}
                    loading={categoriesLoading}
                  />
                  <FormDescription>{t("page.ingredient.form.categoryHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.ingredient.form.nameLabel")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  {pickFromCatalog ? (
                    <Combobox
                      options={supplierProductOptions}
                      value={field.value || ""}
                      onChange={(v) => {
                        field.onChange(v || "");
                        if (v && allSupplierProductsData?.data) {
                          const product = allSupplierProductsData.data.find(
                            (p) => p.name?.toLowerCase().trim() === v.toLowerCase().trim()
                          );
                          if (product) {
                            form.setValue("costPrice", Number(product.price) || 0);
                            form.setValue("unit", product.unit || "pcs");
                          }
                        }
                      }}
                      placeholder={
                        isNameDisabled
                          ? t("page.ingredient.form.nameDisabledPlaceholder")
                          : t("page.ingredient.form.namePlaceholder")
                      }
                      searchPlaceholder={t("page.ingredient.form.nameSearchPlaceholder")}
                      disabled={isNameDisabled}
                      loading={productNamesLoading}
                    />
                  ) : (
                    <Input
                      className="h-10"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={t("page.ingredient.form.nameFreePlaceholder")}
                      disabled={isNameDisabled}
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {!!watchSupplier && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <p className="text-sm font-semibold text-foreground">
                  {t("page.supplier.products.title")}
                </p>
              </div>
              <HorizontalScrollArea>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">
                        {t("page.position.table.no")}
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                        {t("page.product.form.name")}
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                        {t("sidebar.section.harga")}
                      </th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                        {t("document.unit")}
                      </th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                        {t("page.supplier.products.table.leadTime")}
                      </th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                        {t("page.supplier.products.table.quality")}
                      </th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                        {t("page.supplier.products.table.minOrder")}
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                        {t("page.bom.detail.notes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSupplierProductsLoading ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                          {t("page.employee.add.loading")}
                        </td>
                      </tr>
                    ) : !allSupplierProductsData?.data?.length ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                          {t("page.ingredient.ui.noProductsAvailable")}
                        </td>
                      </tr>
                    ) : (
                      allSupplierProductsData.data.map((product, idx) => (
                        <tr
                          key={product.id || idx}
                          className={`border-b last:border-b-0 transition-colors ${
                            watchName?.toLowerCase().trim() === product.name?.toLowerCase().trim()
                              ? "bg-primary/5"
                              : "hover:bg-muted/30"
                          }`}>
                          <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-foreground">{product.name}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {product.price?.toLocaleString("id-ID") || "-"}
                          </td>
                          <td className="px-3 py-2 text-center">{product.unit || "-"}</td>
                          <td className="px-3 py-2 text-center">
                            {product.leadTime
                              ? `${product.leadTime} ${product.leadTimeUnit || ""}`
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-center">{product.qualityRating || "-"}</td>
                          <td className="px-3 py-2 text-center">{product.minOrderQty || "-"}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[150px] truncate">
                            {product.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="konversi" className="mt-0">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.ingredient.form.unitLabel")}
                  </FormLabel>
                  <Combobox
                    options={unitOptions}
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    placeholder={t("page.ingredient.ui.selectUnit")}
                    searchPlaceholder={t("common.search.unit")}
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
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.ingredient.form.baseUnitLabel")}
                  </FormLabel>
                  <Combobox
                    options={baseUnitOptions}
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    placeholder={t("page.ingredient.ui.selectBaseUnit")}
                    searchPlaceholder={t("common.search.baseUnit")}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conversionFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.ingredient.form.conversionLabel")}
                  </FormLabel>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)
                    }
                    placeholder={t("page.ingredient.form.conversionPlaceholder")}
                    className="h-12"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <p className="text-sm text-muted-foreground">
              1 <span className="font-semibold text-foreground">{watchUnit}</span> ={" "}
              {watchConversionFactor}{" "}
              <span className="font-semibold text-foreground">{watchBaseUnit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{convLabel}</p>
          </div>
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight size={18} className="text-primary text-base" />
              <span className="text-sm font-semibold text-foreground">
                {t("page.ingredient.form.sidebarKonversi")}
              </span>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                <span className="text-foreground font-medium">
                  {t("page.ingredient.form.sidebarUnitPembelian")}
                </span>{" "}
                {t("page.ingredient.form.sidebarUnitPembelianDesc")}
              </p>
              <p>
                <span className="text-foreground font-medium">
                  {t("page.ingredient.form.sidebarBaseUnit")}
                </span>{" "}
                {t("page.ingredient.form.sidebarBaseUnitDesc")}
              </p>
              <p>
                <span className="text-foreground font-medium">
                  {t("page.ingredient.form.sidebarFaktor")}
                </span>{" "}
                {t("page.ingredient.form.sidebarFaktorDesc")}
              </p>
              <div className="bg-background rounded-lg p-3 border border-border mt-2">
                <p className="text-foreground font-medium mb-1">
                  {t("page.ingredient.form.sidebarContoh")}
                </p>
                <p>
                  {t("page.ingredient.form.sidebarContohKg")}{" "}
                  <span className="text-muted-foreground">
                    ({t("page.ingredient.form.sidebarContohFaktor")}: 1000)
                  </span>
                </p>
                <p>
                  {t("page.ingredient.form.sidebarContohLusin")}{" "}
                  <span className="text-muted-foreground">
                    ({t("page.ingredient.form.sidebarContohFaktor")}: 12)
                  </span>
                </p>
                <p>
                  {t("page.ingredient.form.sidebarContohKarton")}{" "}
                  <span className="text-muted-foreground">
                    ({t("page.ingredient.form.sidebarContohFaktor")}: 50)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="stok" className="mt-0">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {existing ? (
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.ingredient.form.stockLabel")}
                    </FormLabel>
                    <Input
                      type="text"
                      className="h-12 bg-muted/50"
                      value={
                        getIngredientStockState(existing) === "uninitialized"
                          ? t("page.ingredient.stockState.uninitialized")
                          : `${formatQuantity(field.value)} ${existing?.baseUnit || existing?.unit || "pcs"}`
                      }
                      readOnly
                      aria-readonly="true"
                    />
                    {getIngredientStockState(existing) === "unrecorded" && (
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {t("page.ingredient.stockState.unrecorded")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("page.ingredient.form.stockReadOnlyDesc")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.ingredient.form.stockLabel")}
                    </FormLabel>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-12"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("page.ingredient.form.stockDesc")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="minStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.ingredient.form.minStockLabel")}
                  </FormLabel>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className="h-12"
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("page.ingredient.form.minStockDesc")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.ingredient.form.priceLabel")}
                  </FormLabel>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className="h-12"
                    value={field.value ? field.value.toLocaleString("id-ID") : "0"}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-primary text-base" />
              <span className="text-sm font-semibold text-foreground">
                {t("page.ingredient.form.sidebarManajemenStok")}
              </span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                {t("page.ingredient.form.sidebarStokDesc")}{" "}
                <span className="text-foreground font-medium">
                  {t("page.ingredient.form.minStockLabel")}
                </span>{" "}
                {t("page.ingredient.form.sidebarStokDesc2")}
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="status" className="mt-0">
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem>
              <div
                className={`flex items-center justify-between p-4 rounded-lg ${
                  field.value
                    ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                }`}
                onClick={(e) => {
                  if (!e.isTrusted) return;
                  field.onChange(!field.value);
                }}>
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
                      {field.value
                        ? t("page.ingredient.form.statusActive")
                        : t("page.ingredient.form.statusInactive")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {field.value
                        ? t("page.ingredient.form.statusActiveDesc")
                        : t("page.ingredient.form.statusInactiveDesc")}
                    </p>
                  </div>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>
    </>
  );
};

IngredientFormFields.propTypes = {
  form: PropTypes.object.isRequired,
  existing: PropTypes.object,
  source: PropTypes.string,
  changeSource: PropTypes.func,
  pickFromCatalog: PropTypes.bool,
  suppliers: PropTypes.array,
  suppliersLoading: PropTypes.bool,
  isSupplierDisabled: PropTypes.bool,
  categories: PropTypes.array,
  categoriesLoading: PropTypes.bool,
  isCategoryDisabled: PropTypes.bool,
  isNameDisabled: PropTypes.bool,
  productNamesLoading: PropTypes.bool,
  supplierProductOptions: PropTypes.array,
  allSupplierProductsData: PropTypes.any,
  allSupplierProductsLoading: PropTypes.bool
};

export default IngredientFormFields;

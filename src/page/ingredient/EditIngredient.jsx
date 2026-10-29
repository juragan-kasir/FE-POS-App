import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save,
  X,
  Check,
  Info,
  ArrowRightLeft,
  Package,
  ToggleLeft,
  ArrowLeftRight
} from "lucide-react";
import { getIngredientById, editIngredient, getProductNamesByFilters } from "@/services/ingredient";
import { getAllSupplier } from "@/services/supplier";
import { getAllIngredientCategory } from "@/services/ingredientCategory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";

import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { useConfirmSubmit } from "@/hooks/useConfirmSubmit";
import { getMissingFields } from "@/lib/validation";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import IngredientSourceField from "./components/IngredientSourceField";
import { toQuantity, formatQuantity } from "@/utils/quantity";
import { getIngredientStockState } from "@/utils/ingredientStockState";
import { useLocations } from "@/queries/useLocations";
import { useFormExit } from "@/hooks/useLeaveGuard";

const conversionHints = {
  kg: { base: "gram", factor: 1000 },
  liter: { base: "ml", factor: 1000 },
  meter: { base: "cm", factor: 100 },
  lusin: { base: "pcs", factor: 12 },
  karton: { base: "pcs", factor: 50 },
  box: { base: "pcs", factor: 10 },
  pack: { base: "pcs", factor: 5 }
};

const EditIngredient = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const store = user?.store || "";
  const role = user?.roleType || "";
  const isSuperAdmin = role === "super_admin";
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [cancelModal, setCancelModal] = useState(false);
  // "none" (market / in-house) or "supplier"; see IngredientSourceField.
  const [source, setSource] = useState("none");
  const [successModal, setSuccessModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [activeTab, setActiveTab] = useState("informasi");

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

  const ingredientFieldLabels = {
    name: "Nama Bahan Baku",
    supplier: "Supplier",
    store: "Toko",
    category: "Kategori",
    unit: "Satuan",
    baseUnit: "Satuan Dasar",
    conversionFactor: "Faktor Konversi",
    stock: "Stok",
    minStock: "Stok Minimum",
    costPrice: "Harga Beli",
    isActive: "Status"
  };

  const formSchema = z.object({
    name: z.string().min(1, t("page.ingredient.form.nameRequired")),
    supplier: z.string().nullable(),
    category: z.string().nullable(),
    unit: z.string(),
    baseUnit: z.string(),
    conversionFactor: z.coerce.string(),
    stock: z.number(),
    minStock: z.number(),
    costPrice: z.number(),
    isActive: z.boolean(),
    store: z.string().nullable()
  });

  const {
    data: ingredientData,
    isLoading: loadingData,
    isError,
    refetch
  } = useQuery(["ingredient", id], () => getIngredientById(id), { enabled: !!id });

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      unit: "pcs",
      baseUnit: "pcs",
      conversionFactor: "1",
      stock: 0,
      minStock: 0,
      costPrice: 0,
      supplier: null,
      category: null,
      isActive: true,
      store: null
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/ingredient",
    () => setCancelModal(true),
    form
  );

  const watchStore = form.watch("store");
  const watchSupplier = form.watch("supplier");
  const watchCategory = form.watch("category");
  const watchName = form.watch("name");
  const watchUnit = form.watch("unit");
  const watchBaseUnit = form.watch("baseUnit");
  const watchConversionFactor = form.watch("conversionFactor");

  const activeStore = isSuperAdmin ? watchStore : store;

  const allowDropdowns = !!activeStore || !isSuperAdmin || !!ingredientData?.data;

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery(
    ["suppliers-dropdown", activeStore],
    () => getAllSupplier({ limit: 999, store: activeStore || undefined, includeProducts: true }),
    { enabled: allowDropdowns }
  );
  const suppliers = suppliersData?.data || [];

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(
    ["ingredient-categories-dropdown", activeStore],
    () => getAllIngredientCategory(),
    { enabled: allowDropdowns }
  );
  const categories = categoriesData?.data || [];

  const { data: locationsData, isLoading: locationsLoading } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || [];

  const { data: productNamesData, isLoading: productNamesLoading } = useQuery(
    ["ingredient-product-names", activeStore, watchCategory, watchSupplier],
    () =>
      getProductNamesByFilters({
        store: activeStore || undefined,
        category: watchCategory || undefined,
        supplier: watchSupplier || undefined
      }),
    { enabled: allowDropdowns && !!watchSupplier && !!watchCategory }
  );

  const { data: allSupplierProductsData, isLoading: allSupplierProductsLoading } = useQuery(
    ["all-supplier-products", activeStore, watchSupplier],
    () =>
      getProductNamesByFilters({
        store: activeStore || undefined,
        supplier: watchSupplier || undefined
      }),
    { enabled: allowDropdowns && !!watchSupplier }
  );

  const supplierProductOptions = React.useMemo(() => {
    const products = productNamesData?.data || [];
    return products.map((p) => {
      const name = typeof p === "string" ? p : typeof p?.name === "string" ? p.name : "";
      return { value: name, label: name };
    });
  }, [productNamesData]);

  const isSupplierDisabled = isSuperAdmin && !watchStore && !ingredientData?.data;
  const isCategoryDisabled = isSuperAdmin && !watchStore && !ingredientData?.data;
  const changeSource = (next) => {
    setSource(next);
    if (next === "none") form.setValue("supplier", null);
  };

  // Client note 2026-10-24: an ingredient is either bought from a supplier
  // or not (market / in-house). With a supplier that has a catalog, the
  // name is picked from it (and fills price and unit); otherwise it is
  // typed in.
  const pickFromCatalog =
    !!watchSupplier &&
    (allSupplierProductsLoading || (allSupplierProductsData?.data?.length ?? 0) > 0) &&
    !(watchCategory && !productNamesLoading && supplierProductOptions.length === 0);
  const isNameDisabled = pickFromCatalog && !watchCategory;

  useEffect(() => {
    const d = ingredientData?.data;
    if (!d) return;
    hydrateGuard.current = true;
    setSource(d.supplier ? "supplier" : "none");
    form.reset({
      name: d.name || "",
      supplier: d.supplier ? String(d.supplier) : null,
      category: d.category ? String(d.category) : null,
      unit: d.unit || "pcs",
      baseUnit: d.baseUnit || "pcs",
      conversionFactor: String(d.conversionFactor || "1"),
      // DECIMAL string ("400.0000") → number, so the digit-only input below
      // never reads the decimals as extra digits (400 → 4000000).
      stock: toQuantity(d.stock),
      minStock: d.minStock || 0,
      costPrice: d.costPrice ? Number(d.costPrice) : 0,
      isActive: d.status === "active",
      store: d.store ? String(d.store) : null
    });
  }, [ingredientData]);

  const hydrateGuard = React.useRef(true);

  useEffect(() => {
    if (hydrateGuard.current) return;
    form.setValue("supplier", null);
    form.setValue("category", null);
    form.setValue("name", "");
  }, [watchStore]);

  useEffect(() => {
    if (hydrateGuard.current) return;
    if (watchSupplier) form.setValue("name", "");
  }, [watchSupplier]);

  useEffect(() => {
    if (hydrateGuard.current) return;
    if (pickFromCatalog) form.setValue("name", "");
  }, [watchCategory]);

  useEffect(() => {
    const hint = safeGet(conversionHints, watchUnit);
    if (hint) {
      form.setValue("baseUnit", hint.base);
      form.setValue("conversionFactor", String(hint.factor));
    } else {
      form.setValue("baseUnit", watchUnit);
      form.setValue("conversionFactor", "1");
    }
  }, [watchUnit]);

  useEffect(() => {
    hydrateGuard.current = false;
  }, [watchStore, watchSupplier, watchCategory, ingredientData]);

  const mutation = useMutation((payload) => editIngredient(id, payload), {
    onSuccess: () => {
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  // Stock is not sent: the form holds the value read at load time, and
  // saving it would overwrite sales made since. Stock changes go through
  // the audited "Atur Stok" action on the ingredient list.
  const onSubmit = (formValues, saveAsDraft = false) => {
    const values = { ...formValues };
    delete values.stock;
    mutation.mutate({
      ...values,
      supplier: values.supplier ? parseInt(values.supplier) : null,
      category: values.category ? parseInt(values.category) : null,
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive",
      store: saveAsDraft
        ? null
        : values.store
          ? parseInt(values.store)
          : cookie?.user?.store || null
    });
  };

  const { handleSubmit, confirmModal } = useConfirmSubmit(form, (values) => onSubmit(values));

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

  if (isError) return <AbortController refetch={refetch} />;

  if (loadingData)
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
          <PageHeader
            breadcrumbs={[
              {
                label: t("breadcrumb.home"),
                href: "/dashboard-super-admin",
                i18nKey: "breadcrumb.home"
              },
              {
                label: t("page.ingredient.edit.breadcrumbIngredient"),
                href: "/ingredient",
                i18nKey: "page.ingredient.edit.breadcrumbIngredient"
              },
              {
                label: t("page.ingredient.edit.breadcrumbEdit"),
                i18nKey: "page.ingredient.edit.breadcrumbEdit"
              }
            ]}
            title={t("page.ingredient.edit.title")}
            description={t("page.ingredient.edit.loading")}
            backLink="/ingredient">
            <UserGuide guideKey="add-ingredient" mode="edit" />
          </PageHeader>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden space-y-6">
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );

  return (
    <div>
      <div>
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("page.ingredient.edit.breadcrumbIngredient"),
              href: "/ingredient",
              i18nKey: "page.ingredient.edit.breadcrumbIngredient"
            },
            {
              label: t("page.ingredient.edit.breadcrumbEdit"),
              i18nKey: "page.ingredient.edit.breadcrumbEdit"
            }
          ]}
          title={t("page.ingredient.edit.title")}
          description={form.watch("name")}
          backLink="/ingredient"
          onBack={requestLeave}>
          <UserGuide guideKey="add-ingredient" mode="edit" />
        </PageHeader>

        <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}>
              {isSuperAdmin && (
                <FormField
                  control={form.control}
                  name="store"
                  render={({ field }) => (
                    <FormItem className="mb-6 bg-card rounded-xl p-4 border border-border shadow-sm">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("document.store")} <span className="text-destructive">*</span>
                      </FormLabel>
                      <Combobox
                        options={locations.map((l) => ({
                          value: String(l.id),
                          label: l.name
                        }))}
                        value={field.value || ""}
                        onChange={(v) => field.onChange(v || null)}
                        placeholder={t("page.ingredient.edit.selectStorePlaceholder")}
                        searchPlaceholder={t("common.search.store")}
                        loading={locationsLoading}
                      />
                      {!field.value && (
                        <p className="text-xs text-amber-700 dark:text-amber-400" role="note">
                          {t("page.ingredient.form.storeFirstHint")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* ponytail: tab layout pola /add-supplier */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="overflow-x-auto -mx-1 px-1 mb-4">
                  <TabsList className="grid w-full grid-cols-4 min-w-[480px]">
                    <TabsTrigger value="informasi" className="gap-1.5">
                      <Info size={14} />
                      {t("page.ingredient.add.sectionInformasi")}
                    </TabsTrigger>
                    <TabsTrigger value="konversi" className="gap-1.5">
                      <ArrowRightLeft size={14} />
                      {t("page.ingredient.form.sectionKonversi")}
                    </TabsTrigger>
                    <TabsTrigger value="stok" className="gap-1.5">
                      <Package size={14} />
                      {t("page.ingredient.form.sectionStok")}
                    </TabsTrigger>
                    <TabsTrigger value="status" className="gap-1.5">
                      <ToggleLeft size={14} />
                      {t("page.ingredient.form.sectionStatus")}
                    </TabsTrigger>
                  </TabsList>
                </div>

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
                                searchPlaceholder={t(
                                  "page.ingredient.form.supplierSearchPlaceholder"
                                )}
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
                              searchPlaceholder={t(
                                "page.ingredient.form.categorySearchPlaceholder"
                              )}
                              disabled={isCategoryDisabled}
                              loading={categoriesLoading}
                            />
                            <FormDescription>
                              {t("page.ingredient.form.categoryHint")}
                            </FormDescription>
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
                                  <td
                                    colSpan={8}
                                    className="px-3 py-8 text-center text-muted-foreground">
                                    {t("page.employee.add.loading")}
                                  </td>
                                </tr>
                              ) : !allSupplierProductsData?.data?.length ? (
                                <tr>
                                  <td
                                    colSpan={8}
                                    className="px-3 py-8 text-center text-muted-foreground">
                                    {t("page.ingredient.ui.noProductsAvailable")}
                                  </td>
                                </tr>
                              ) : (
                                allSupplierProductsData.data.map((product, idx) => (
                                  <tr
                                    key={product.id || idx}
                                    className={`border-b last:border-b-0 transition-colors ${
                                      watchName?.toLowerCase().trim() ===
                                      product.name?.toLowerCase().trim()
                                        ? "bg-primary/5"
                                        : "hover:bg-muted/30"
                                    }`}>
                                    <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                    <td className="px-3 py-2 font-medium text-foreground">
                                      {product.name}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                      {product.price?.toLocaleString("id-ID") || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-center">{product.unit || "-"}</td>
                                    <td className="px-3 py-2 text-center">
                                      {product.leadTime
                                        ? `${product.leadTime} ${product.leadTimeUnit || ""}`
                                        : "-"}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {product.qualityRating || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {product.minOrderQty || "-"}
                                    </td>
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
                                getIngredientStockState(ingredientData?.data) === "uninitialized"
                                  ? t("page.ingredient.stockState.uninitialized")
                                  : `${formatQuantity(field.value)} ${ingredientData?.data?.baseUnit || ingredientData?.data?.unit || "pcs"}`
                              }
                              readOnly
                              aria-readonly="true"
                            />
                            {getIngredientStockState(ingredientData?.data) === "unrecorded" && (
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
              </Tabs>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 mt-6 border-t">
                <Button
                  type="button"
                  variant="danger"
                  onClick={requestLeave}
                  className="w-full sm:w-auto justify-center">
                  <X size={16} className="mr-1" /> {t("page.ingredient.form.cancelButton")}
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Button
                    type="button"
                    variant="draft"
                    onClick={() => setDraftModal(true)}
                    disabled={mutation.isLoading}
                    className="w-full sm:w-auto justify-center">
                    {t("common.saveAsDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const values = form.getValues();
                      const extraErrors = [
                        ...(isSuperAdmin && !values.store ? [{ name: "store" }] : []),
                        ...(source === "supplier" && !values.supplier ? [{ name: "supplier" }] : [])
                      ];
                      const missing = getMissingFields(
                        values,
                        formSchema,
                        ingredientFieldLabels,
                        extraErrors
                      );
                      if (missing.length > 0) {
                        setMissingFieldsList(missing);
                        setMissingFieldsModal(true);
                        return;
                      }
                      handleSubmit(e);
                    }}
                    disabled={mutation.isLoading}
                    className="w-full sm:w-auto justify-center">
                    <Save size={16} className="mr-1" />{" "}
                    {mutation.isLoading
                      ? t("page.ingredient.form.savingButton")
                      : t("page.ingredient.form.saveButton")}
                  </Button>
                </div>
              </div>

              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={18} className="text-primary text-base" />
                  <span className="text-sm font-semibold text-primary">
                    {t("page.ingredient.form.tipsTitle")}
                  </span>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <p>
                    {t("page.ingredient.form.tipsText1")}{" "}
                    <span className="text-foreground font-medium">
                      &quot;{t("page.ingredient.form.tipsExample")}&quot;
                    </span>{" "}
                    {t("page.ingredient.form.tipsText2")}
                  </p>
                  <p>{t("page.ingredient.form.tipsText3")}</p>
                </div>
              </div>
            </form>
          </Form>
        </div>

        {mutation.isLoading && (
          <Loading fullscreen size="lg" label={t("page.ingredient.form.savingButton")} />
        )}

        <Modal
          type="success"
          open={successModal}
          onOpenChange={(o) => !o && setSuccessModal(false)}
          title={t("page.ingredient.edit.toastSuccess")}
          description={t("page.ingredient.edit.toastEditDesc")}
          confirmText="OK"
          onConfirm={() => {
            setSuccessModal(false);
            queryClient.invalidateQueries(["ingredients"]);
            setTimeout(() => navigate("/ingredient"), 150);
          }}
        />
        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={(o) => !o && setCancelModal(false)}
          title={t("page.ingredient.edit.modalCancelTitle")}
          description={t("page.ingredient.edit.modalCancelDesc")}
          confirmText={t("page.ingredient.edit.modalCancelConfirm")}
          onConfirm={() => {
            setCancelModal(false);
            setTimeout(leave, 150);
          }}
        />
        <Modal
          type="confirm"
          open={draftModal}
          onOpenChange={setDraftModal}
          title={t("common.saveAsDraftTitle")}
          description={t("common.saveAsDraftDesc")}
          confirmText={t("common.yesSaveDraft")}
          onConfirm={() => {
            setDraftModal(false);
            const values = form.getValues();
            onSubmit(values, true);
          }}
        />
        <Modal {...confirmModal()} />
        <Modal
          type="error"
          open={errorModal}
          onOpenChange={setErrorModal}
          title={t("common.error")}
          description={modalMessage}
          onConfirm={() => setErrorModal(false)}
        />
        <MissingFieldsModal
          open={missingFieldsModal}
          onOpenChange={setMissingFieldsModal}
          fields={missingFieldsList}
        />
      </div>
    </div>
  );
};

export default EditIngredient;

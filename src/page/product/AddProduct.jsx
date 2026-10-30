import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Save,
  X,
  Plus,
  Info,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  TriangleAlert
} from "lucide-react";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";

import PageHeader from "@/components/ui/PageHeader";
import { Combobox } from "@/components/ui/combobox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  FormControl
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import { addProduct } from "@/services/product";
import { checkStockOpnameExists } from "@/services/stock";
import { getAllCategoryActive } from "@/services/category";
import { getAllTaxConfig } from "@/services/tax-config";

import UserGuide from "@/components/organism/UserGuide";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { normalizePayload } from "@/lib/payload-normalizer";
import ProductPreview from "./ProductPreview";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ConversionFactorField from "@/page/product/ConversionFactorField";
import ProductExtrasStep from "@/page/product/ProductExtrasStep";
import ProductPricingStep from "@/page/product/ProductPricingStep";
import { useProductExtras } from "@/page/product/useProductExtras";
import { useLinkItems } from "@/page/product/InventoryLinkField";
import { INVENTORY_MODES, initialStockNeedsStore, isInventoryItemMode } from "@/lib/inventory-mode";
import { linkUnitCost, linksPayload, missingLinkStores } from "@/lib/inventory-link";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import { storesForSave } from "@/lib/product-stores";

const AddProduct = () => {
  const { t } = useTranslation();
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

  const productFieldLabels = {
    nameProduct: "Nama Produk",
    category: "Kategori",
    price: "Harga",
    store: "Toko",
    estimationTime: "Estimasi Waktu"
  };

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [cookies] = useCookies();
  const user = cookies?.user;
  const role = user?.roleType || "";

  const [selectedStores, setSelectedStores] = useState(
    searchParams.get("location") ? [searchParams.get("location")] : user?.store ? [user?.store] : []
  );
  const [allStores, setAllStores] = useState(role === "super_admin");
  const [draftModal, setDraftModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [noStockOpname, setNoStockOpname] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [missingFieldsByStep, setMissingFieldsByStep] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  // BRD BR-02: the inventory item per outlet of an "inventory_item" product.
  const [inventoryLinks, setInventoryLinks] = useState([]);
  const [linkError, setLinkError] = useState("");

  const isSuperAdmin = role === "super_admin";

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || locationsData?.locations || [];

  const firstStore = selectedStores[0] || "";
  const { data: categoriesData } = useQuery(
    ["categories-for-product", firstStore],
    () => getAllCategoryActive({ location: firstStore }),
    { enabled: true }
  );
  const categories = categoriesData?.data || categoriesData?.categories || [];

  const { data: taxData } = useQuery(
    ["tax-configs-for-product"],
    () => getAllTaxConfig({ limit: 100 }),
    { enabled: isSuperAdmin }
  );
  const taxOptions = (taxData?.data || []).filter((t) => t.status === "active");

  const formSchema = useMemo(() => {
    return z.object({
      nameProduct: z.string().min(1, t("page.product.form.requiredName")),
      sku: z.string().optional().or(z.literal("")),
      barcode: z.string().optional().or(z.literal("")),
      brand: z.string().optional().or(z.literal("")),
      category: z.string().min(1, t("page.product.form.requiredCategory")),
      tipeProduk: z.string().default("menu"),
      tax: z.string().optional().or(z.literal("")),
      price: z.coerce.number().min(1, t("page.product.form.requiredPrice")),
      costPrice: z.coerce.number().min(0).optional().or(z.literal("")),
      stock: z.coerce.number().min(0).optional().or(z.literal("")),
      minStock: z.coerce.number().min(0).optional().or(z.literal("")),
      inventoryMode: z.enum(INVENTORY_MODES).default("stocked"),
      unit: z.string().default("pcs"),
      baseUnit: z.string().default("pcs"),
      conversionFactor: z.coerce.number().min(1).default(1),
      point: z.coerce.number().min(0).optional().or(z.literal("")),
      redeemPoints: z.coerce.number().min(0).optional().or(z.literal("")),
      estimationTime: z.coerce.number().min(0).optional().or(z.literal("")),
      status: z.boolean().default(true),
      isAvailable: z.boolean().default(true),
      store: z.string().optional()
    });
  }, []);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      nameProduct: "",
      sku: "",
      barcode: "",
      brand: "",
      category: "",
      tipeProduk: "menu",
      tax: "",
      description: "",
      price: "",
      costPrice: "",
      stock: "",
      minStock: "",
      inventoryMode: "stocked",
      unit: "pcs",
      baseUnit: "pcs",
      conversionFactor: 1,
      point: "",
      redeemPoints: "",
      estimationTime: "",
      status: true,
      isAvailable: true,
      store: ""
    }
  });
  const extras = useProductExtras(form, setConfirmAction);
  const { variantGroups, modifierItems, priceTiers, productImages } = extras;
  const { request: requestLeave, leave } = useFormExit(
    "/product-list",
    () => setCancelModal(true),
    form
  );

  useUnsavedChanges(form.formState.isDirty);

  const linksItem = isInventoryItemMode(form.watch("inventoryMode"));
  const linkStores = allStores
    ? []
    : selectedStores.map((id) => ({
        id,
        name:
          locations.find((l) => String(l.id) === String(id))?.name ||
          (String(user?.store) === String(id) ? user?.storeName : "") ||
          ""
      }));
  const firstLink = inventoryLinks.find((l) => String(l.store) === String(firstStore));
  const { items: firstStoreItems } = useLinkItems(linksItem ? firstStore : "");
  const linkedCost = linkUnitCost(
    firstStoreItems.find((i) => String(i.id) === String(firstLink?.ingredientId)),
    firstLink?.qty
  );

  const onSubmit = (values) => handleSave(values, false);

  const isOption = form.watch("isOption");
  const hasModifiers = form.watch("hasModifiers");

  const tipeProduk = form.watch("tipeProduk");

  useEffect(() => {
    if (tipeProduk === "bahan_baku" && selectedStores.length > 0) {
      checkStockOpnameExists(selectedStores[0])
        .then((res) => setNoStockOpname(!res?.data?.exists))
        .catch(() => setNoStockOpname(false));
    } else {
      setNoStockOpname(false);
    }
  }, [tipeProduk, selectedStores]);

  // `categories` are refetched per-store (keyed on `firstStore` above), but
  // the already-picked `category` field value was never cleared when the
  // store changes — so a category id valid for the old store could silently
  // survive and get submitted against the new store. Only reset on an actual
  // store change, not on first mount (prevFirstStoreRef starts equal to the
  // initial firstStore).
  const prevFirstStoreRef = useRef(firstStore);
  useEffect(() => {
    if (prevFirstStoreRef.current !== firstStore) {
      form.setValue("category", "");
      prevFirstStoreRef.current = firstStore;
    }
  }, [firstStore, form]);

  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const createMutation = useMutation(addProduct, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["products"]);
      setIsSubmitting(false);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.product.form.failedAddProduct")
      );
      setErrorModal(true);
      setIsSubmitting(false);
    }
  });

  const canGoNext = () => {
    if (currentStep === 1) {
      const values = form.getValues();
      return !!values.nameProduct && !!values.category;
    }
    if (currentStep === 2) {
      const values = form.getValues();
      return !!values.price;
    }
    return true;
  };

  const handleNext = () => {
    if (!canGoNext()) {
      // const values = form.getValues();
      let msg =
        currentStep === 1
          ? t("page.product.form.requiredStep1")
          : t("page.product.form.requiredStep2");
      toast.error(t("page.product.form.completeData"), { description: msg });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async (values, saveAsDraft = false) => {
    if (!allStores && selectedStores.length === 0 && !saveAsDraft) {
      form.setError("store", { message: t("page.product.form.selectStoreError") });
      return;
    }
    // BA finding #2: per-outlet stock is authoritative — an opening stock on
    // "Semua Toko" would be stranded (every outlet shows 0). Require a
    // specific store, or an empty stock. The API rejects this too.
    if (
      initialStockNeedsStore(
        { stock: values.stock, inventoryMode: values.inventoryMode },
        selectedStores
      )
    ) {
      form.setError("store", { message: t("page.product.form.stockRequiresStore") });
      return;
    }
    form.clearErrors("store");
    // FR-06: a finished good from an inventory item needs specific outlets,
    // each with its item; it has no stock or minimum of its own.
    const linksItemOnSave = isInventoryItemMode(values.inventoryMode);
    if (linksItemOnSave && !saveAsDraft) {
      const message =
        allStores || selectedStores.length === 0
          ? t("page.product.form.inventoryLink.needsStore")
          : missingLinkStores(inventoryLinks, selectedStores).length > 0
            ? t("page.product.form.inventoryLink.required")
            : "";
      if (message) {
        setLinkError(message);
        setCurrentStep(2);
        toast.error(message);
        return;
      }
    }
    setLinkError("");

    setIsSubmitting(true);

    const data = {
      nameProduct: values.nameProduct,
      sku: values.sku,
      barcode: values.barcode,
      brand: values.brand,
      category: values.category,
      tax: values.tax,
      stores: storesForSave({ allStores, selectedStores, locations, userStore: user?.store }),
      price: values.price,
      costPrice: values.costPrice,
      stock: linksItemOnSave ? 0 : values.stock,
      minStock: linksItemOnSave ? 0 : values.minStock,
      inventoryMode: values.inventoryMode || "stocked",
      ...(linksItemOnSave ? { inventoryLinks: linksPayload(inventoryLinks, selectedStores) } : {}),
      unit: values.unit,
      baseUnit: values.baseUnit,
      conversionFactor: values.conversionFactor || 1,
      point: values.point,
      redeemPoints: values.redeemPoints,
      estimationTime: values.estimationTime,
      description: values.description,
      status: saveAsDraft ? "draft" : values.status ? "active" : "inactive",
      tipeProduk: values.tipeProduk,
      isAvailable: values.isAvailable,
      isOption: !!isOption,
      hasModifiers: !!hasModifiers,
      options:
        isOption && variantGroups.length > 0
          ? variantGroups
              .map((g) => ({
                ...g,
                options: (g.options || [])
                  .filter((o) => o.name && o.name.trim())
                  .map((o) => ({ ...o, name: o.name.trim() }))
              }))
              .filter((g) => g.name && g.name.trim() && g.options.length > 0)
          : [],
      modifiers:
        hasModifiers && modifierItems.length > 0
          ? modifierItems
              .filter((m) => m.name && m.name.trim())
              .map((m) => ({ ...m, name: m.name.trim(), price: Number(m.price) || 0 }))
          : [],
      priceTiers: priceTiers.length > 0 ? priceTiers : [],
      createdBy: user?.id
    };

    if (productImages.length > 0) {
      const manifest = [];
      let newIdx = 0;
      productImages.forEach((img) => {
        if (img.isNew) {
          manifest.push(`file:${newIdx}`);
          newIdx += 1;
        } else {
          manifest.push(img.url);
        }
      });
      data.imageOrder = JSON.stringify(manifest);
      const newFiles = productImages.filter((img) => img.isNew).map((img) => img.file);
      if (newFiles.length > 0) data.images = newFiles;
    }

    const payload = normalizePayload(data, {
      isFormData: true,
      jsonFields: ["stores", "options", "modifiers", "priceTiers", "inventoryLinks"]
    });

    createMutation.mutate(payload);
  };

  const steps = [
    {
      num: 1,
      title: t("page.product.step.info"),
      desc: t("page.product.step.infoDesc"),
      mandatory: ["nameProduct", "category"],
      group: ["nameProduct", "category", "store"]
    },
    {
      num: 2,
      title: t("page.product.step.price"),
      desc: t("page.product.step.priceDesc"),
      mandatory: ["price"],
      group: ["price"]
    },
    {
      num: 3,
      title: t("page.product.step.media"),
      desc: t("page.product.step.mediaDesc"),
      mandatory: [],
      group: []
    }
  ];

  // ponytail: watch() tanpa argumen subscribe ke SELURUH form (termasuk
  // variantGroups/modifierItems yang bisa berisi banyak baris), jadi tiap
  // keystroke di field manapun rerender seluruh tree wizard ini hanya demi
  // badge status step. Persempit ke field mandatory saja.
  const mandatoryFieldNames = [...new Set(steps.flatMap((s) => s.mandatory))];
  const watchedMandatory = form.watch(mandatoryFieldNames);
  const watchedValues = Object.fromEntries(
    mandatoryFieldNames.map((f, i) => [f, watchedMandatory[i]])
  );

  const isEmptyValue = (v) =>
    v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v));

  const getStepStatus = (s) => {
    const mandatory = s.mandatory;
    if (mandatory.length === 0) return "complete";
    const empties = mandatory.filter((f) => isEmptyValue(watchedValues[f]));
    if (empties.length === 0) return "complete";
    if (empties.length === mandatory.length) return "untouched";
    return "incomplete";
  };

  const buildMissingByStep = (values, extraErrors = []) => {
    const result = formSchema.safeParse(values);
    const missingNames = [];
    if (!result.success) {
      const seen = new Set();
      result.error.errors.forEach((err) => {
        const name = err.path[0];
        if (!seen.has(name)) {
          seen.add(name);
          missingNames.push(name);
        }
      });
    }
    extraErrors.forEach(({ name }) => {
      if (!missingNames.includes(name)) missingNames.push(name);
    });
    return steps
      .map((s) => ({
        stepNum: s.num,
        title: s.title,
        fields: s.group
          .filter((f) => missingNames.includes(f))
          .map((f) => productFieldLabels[f] || f)
      }))
      .filter((g) => g.fields.length > 0);
  };

  const previewValues = form.getValues();
  const selectedCategory = categories.find((c) => String(c.id) === String(previewValues.category));
  const storeName =
    locations.find((l) => String(l.id) === String(firstStore))?.name || firstStore || "Nama Toko";
  const previewData = {
    name: previewValues.nameProduct || "",
    description: previewValues.description || "",
    price: previewValues.price || 0,
    image: productImages[0]?.url || null,
    category:
      selectedCategory?.nameCategory || selectedCategory?.name || previewValues.category || "",
    categoryIcon: selectedCategory?.image || selectedCategory?.icon || "fastfood",
    storeName,
    stock: previewValues.stock ?? 0,
    minStock: previewValues.minStock ?? 0,
    estimatedTime: previewValues.estimationTime || 15,
    isOption: !!isOption,
    hasModifiers: !!hasModifiers,
    isAvailable: previewValues.isAvailable !== false,
    isPromo: false,
    // BA finding #3: the recipe comes from the BOM, made after saving.
    ingredients: [],
    variantGroups,
    modifierItems
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { i18nKey: "breadcrumb.home", href: "/dashboard-super-admin" },
          { i18nKey: "breadcrumb.product", href: "/product-list" },
          { i18nKey: "breadcrumb.add" }
        ]}
        title={t("page.product.add.title")}
        description={t("page.product.add.description")}
        backLink="/product-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-product" />
      </PageHeader>
      <LoadErrorBanner />

      <div className="bg-muted p-1 rounded-md mb-6">
        <div className="grid grid-cols-3 gap-1">
          {steps.map((s) => {
            const status = getStepStatus(s);
            const isActive = s.num === currentStep;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center justify-center gap-2 py-2 px-4 rounded-sm text-sm font-medium transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                <div
                  className={`w-2 h-2 rounded-full ${
                    status === "complete"
                      ? "bg-green-500"
                      : status === "incomplete"
                        ? "bg-red-500"
                        : "bg-muted-foreground/40"
                  }`}
                />
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-6">
              <FormField
                control={form.control}
                name="store"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <StoreSelectCard
                        locations={locations}
                        selectedStores={selectedStores}
                        onChange={(stores) => {
                          setSelectedStores(stores);
                          form.clearErrors("store");
                        }}
                        isSuperAdmin={isSuperAdmin}
                        user={user}
                        t={t}
                        title={t("page.product.add.storeSection.title")}
                        description={t("page.product.add.storeSection.desc")}
                        noStoreLabel={t("page.product.add.storeSection.noStore")}
                        addStoreLabel={t("page.product.add.storeSection.addStore")}
                        storeInfoLabel={t("page.product.add.storeInfo")}
                        allStores={allStores}
                        onAllStoresChange={(val) => {
                          setAllStores(val);
                          form.clearErrors("store");
                        }}
                        navigate={navigate}
                        mandatory={true}
                        locationsLoading={locsLoading || locsFetching}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentStep === 1 && (
                <div className="grid grid-cols-1 gap-6">
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
                              {t("page.product.form.name")}{" "}
                              <span className="text-destructive">*</span>
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
                              {t("page.product.form.category")}{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <Combobox
                              options={categories.map((c) => ({
                                value: String(c.id),
                                label: c.name
                              }))}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder={t("page.product.form.categoryPlaceholder")}
                              searchPlaceholder={t("page.product.form.categoryPlaceholder") + "..."}
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
                                <TriangleAlert
                                  size={16}
                                  className="text-amber-600 mt-0.5 shrink-0"
                                />
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
                              placeholder={t("page.product.form.descriptionPlaceholder")}
                              className="min-h-[80px] resize-y"
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0">
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
                                <FormDescription>{t("common.optionalField")}</FormDescription>
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
                                  searchPlaceholder={t("page.product.form.unitPlaceholder") + "..."}
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
                                        <Plus size={16} />
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

                  {tipeProduk === "menu" && (
                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                      <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
                        <Package size={18} className="text-primary" />
                        <h3 className="text-base font-semibold text-foreground">
                          {t("page.product.form.composition")}
                        </h3>
                      </div>
                      {/* BA finding #3: the recipe is owned by the BOM (single source);
                          it is set up there once the product exists. */}
                      <p className="text-sm text-muted-foreground">
                        {t("page.product.form.bomHintAddProduct")}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {currentStep === 2 && (
                <ProductPricingStep
                  form={form}
                  linksItem={linksItem}
                  linkStores={linkStores}
                  inventoryLinks={inventoryLinks}
                  onInventoryLinksChange={(links) => {
                    setInventoryLinks(links);
                    setLinkError("");
                  }}
                  linkError={linkError}
                  linkedCost={linkedCost}
                />
              )}
              {currentStep === 3 && <ProductExtrasStep form={form} extras={extras} />}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-card border border-border rounded-xl p-4">
            <Button
              type="button"
              variant="outline"
              onClick={requestLeave}
              className="gap-2 w-full sm:w-auto">
              <X size={18} />
              {t("page.product.form.cancel")}
            </Button>
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrev} className="gap-2">
                  <ChevronLeft size={18} />
                  {t("page.product.form.prev")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="gap-2">
                <Eye size={18} />
                {t("page.product.form.preview")}
              </Button>
              <Button
                type="button"
                variant="draft"
                onClick={() => setDraftModal(true)}
                disabled={isSubmitting}
                className="gap-2">
                <Save size={18} />
                {t("page.product.form.saveDraft")}
              </Button>
              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext} className="gap-2 shadow-md">
                  {t("page.product.form.next")}
                  <ChevronRight size={18} />
                </Button>
              ) : (
                <Button
                  variant="success"
                  type="button"
                  onClick={() => {
                    const values = form.getValues();
                    const extraErrors =
                      !allStores && selectedStores.length === 0 ? [{ name: "store" }] : [];
                    const missing = getMissingFields(
                      values,
                      formSchema,
                      productFieldLabels,
                      extraErrors
                    );
                    if (missing.length > 0) {
                      setMissingFieldsList(missing);
                      setMissingFieldsByStep(buildMissingByStep(values, extraErrors));
                      setMissingFieldsModal(true);
                      return;
                    }
                    setConfirmSaveModal(true);
                  }}
                  disabled={isSubmitting}
                  className="gap-2 shadow-md">
                  <Save size={18} />
                  {t("page.product.form.save")}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      {isSubmitting && <Loading fullscreen size="lg" label={t("page.product.form.saving")} />}

      <Modal
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title={t("page.product.form.saveTitle")}
        description={t("page.product.form.saveDesc")}
        confirmText={t("page.product.form.saveConfirm")}
        onConfirm={() => {
          setConfirmSaveModal(false);
          onSubmit(form.getValues());
        }}
      />
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFieldsList}
        items={missingFieldsByStep}
      />

      <Modal
        type="success"
        open={successModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-product/${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("page.product.form.successAddTitle")}
        description={t("page.product.form.successAddDesc")}
        onConfirm={() => setTimeout(() => navigate("/product-list"), 150)}
      />

      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />

      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.product.form.saveDraftTitle")}
        description={t("page.product.form.saveDraftDesc")}
        confirmText={t("page.product.form.saveDraftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          const values = form.getValues();
          handleSave(values, true);
        }}
      />

      <Modal
        type="confirm"
        open={!!confirmAction}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmText={t("page.product.form.confirmDelete")}
        onConfirm={() => {
          confirmAction?.onConfirm?.();
          setConfirmAction(null);
        }}
      />

      <ProductPreview open={showPreview} onOpenChange={setShowPreview} product={previewData} />
    </div>
  );
};

export default AddProduct;

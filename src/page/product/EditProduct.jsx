import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Save,
  X,
  Plus,
  Package,
  Tag,
  Layers,
  DollarSign,
  Info,
  Trash2,
  GripVertical,
  TrendingUp,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Eye,
  AlertTriangle
} from "lucide-react";
import { useCookies } from "react-cookie";
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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import { getProductById, editProduct } from "@/services/product";
import { normalizePayload } from "@/lib/payload-normalizer";
import { getAllCategoryActive } from "@/services/category";
import { getAllTaxConfig } from "@/services/tax-config";
import { getBomByProduct, getBomCosting } from "@/services/bom";

import { getProductPriceByStore, updateProductPriceByStore } from "@/services/price-store";
import { checkStockOpnameExists } from "@/services/stock";
import { getUnsavedStorePriceRows, buildSavedStorePriceMap } from "@/lib/store-price-guard";
import { useConfirmSubmit } from "@/hooks/useConfirmSubmit";
import UserGuide from "@/components/organism/UserGuide";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import AbortController from "@/components/organism/abort-controller";
import ProductPreview from "./ProductPreview";
import ProductImageGallery from "@/components/organism/ProductImageGallery";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import InventoryModeField from "@/page/product/InventoryModeField";
import ProductPriceCostFields from "@/page/product/ProductPriceCostFields";
import { INVENTORY_MODES } from "@/lib/inventory-mode";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const EditProduct = () => {
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

  // const productFieldLabels = {
  //   nameProduct: "Nama Produk",
  //   category: "Kategori",
  //   price: "Harga",
  //   store: "Toko",
  //   estimationTime: "Estimasi Waktu"
  // };

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [cookies] = useCookies();
  const user = cookies?.user;
  const role = user?.roleType || "";
  const productId = searchParams.get("id");

  const [draftModal, setDraftModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [variantGroups, setVariantGroups] = useState([]);
  const [modifierItems, setModifierItems] = useState([]);
  const [priceTiers, setPriceTiers] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [storePrices, setStorePrices] = useState([]);
  const [savedStorePriceMap, setSavedStorePriceMap] = useState({});
  const [savingStoreId, setSavingStoreId] = useState(null);
  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const [noStockOpname, setNoStockOpname] = useState(false);
  // BA finding #3: read-only recipe snapshot written by the BOM.
  const [composition, setComposition] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const handleProductImagesChange = (updater) => {
    setProductImages(updater);
  };

  const {
    data: productData,
    isLoading: loadingProduct,
    isError,
    refetch
  } = useQuery(["product-edit", productId], () => getProductById(productId), {
    enabled: !!productId,
    refetchOnMount: true
  });
  const product = productData?.data || {};

  // F21 Batch 3 (P2): lets the "Komposisi" section point the merchant at
  // the actual mechanism that drives ingredient stock deduction (BOM) —
  // Komposisi itself stays a display/reference-only field, unchanged.
  const { data: bomData } = useQuery(
    ["bom-for-product", product.id],
    () => getBomByProduct(product.id),
    { enabled: !!product.id }
  );
  const existingBom = bomData?.data || null;

  // Live recipe HPP per outlet (BRD Harga Modal/HPP): the margin and food
  // cost on this form use the same HPP the sale snapshots.
  const { data: bomCosting } = useQuery(
    ["bom-costing", product.id],
    () => getBomCosting(product.id),
    { enabled: !!product.id }
  );

  const productStore = selectedStores[0] || "";
  // One assigned outlet → that outlet's recipe; otherwise every outlet's
  // recipe is listed (a store-bound user only ever gets its own).
  const costingStore = selectedStores.length === 1 ? selectedStores[0] : null;
  const { data: categoriesData } = useQuery(
    ["categories-for-edit", productStore],
    () => getAllCategoryActive({ location: productStore }),
    { enabled: true }
  );
  const categories = categoriesData?.data || categoriesData?.categories || [];

  const isSuperAdmin = role === "super_admin";

  const { data: taxData } = useQuery(
    ["tax-configs-for-edit"],
    () => getAllTaxConfig({ limit: 100 }),
    { enabled: isSuperAdmin }
  );
  const taxOptions = (taxData?.data || []).filter((t) => t.status === "active");

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || locationsData?.locations || [];

  const storeIds = locations.map((l) => l.id);
  const { data: storePricesData } = useQuery(
    ["product-store-prices", productId],
    () => getProductPriceByStore({ productId, storeIds }),
    { enabled: isSuperAdmin && !!productId && storeIds.length > 0 }
  );

  useEffect(() => {
    if (storePricesData?.data) {
      const prices = storePricesData.data.storePrices || storePricesData.data;
      const list = Array.isArray(prices) ? prices : [];
      setStorePrices(list);
      setSavedStorePriceMap(buildSavedStorePriceMap(list));
    }
  }, [storePricesData]);

  const formSchema = useMemo(() => {
    return z.object({
      nameProduct: z.string().min(1, t("page.product.form.requiredName")),
      barcode: z.string().optional().or(z.literal("")),
      brand: z.string().optional().or(z.literal("")),
      sku: z.string().optional().or(z.literal("")),
      category: z.string().min(1, t("page.product.form.requiredCategory")),
      tipeProduk: z.string().default("menu"),
      tax: z.string().optional().or(z.literal("")),
      description: z.string().optional().or(z.literal("")),
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
      isOption: z.boolean().default(false),
      hasModifiers: z.boolean().default(false),
      store: z.string().optional()
    });
  }, []);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nameProduct: "",
      barcode: "",
      brand: "",
      sku: "",
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
      isOption: false,
      hasModifiers: false,
      store: ""
    }
  });

  const parseJsonOrId = (val) => {
    if (!val) return "";
    const t =
      typeof val === "string"
        ? (() => {
            try {
              return JSON.parse(val);
            } catch {
              return val;
            }
          })()
        : val;
    return String(t?.id ?? t);
  };

  // `categories` are refetched per-store (keyed on `productStore`), but the
  // already-loaded `category` field value was never cleared when the store
  // changes on an existing product — so a category id valid only for the old
  // store could silently survive a store switch and get submitted against
  // the new store (the same class of bug fixed in AddProduct via
  // prevFirstStoreRef). Track the store this product hydrated with, and only
  // reset on a genuine post-hydration change, not on the initial load.
  const hydratedRef = useRef(false);
  const prevStoreRef = useRef("");
  const appliedInitialCategoryRef = useRef(false);

  useEffect(() => {
    if (product.id) {
      form.reset({
        nameProduct: product.nameProduct || "",
        barcode: product.barcode || "",
        brand: product.brand || "",
        sku: product.sku || "",
        category: parseJsonOrId(product.category),
        tipeProduk: product.tipeProduk || "menu",
        tax: parseJsonOrId(product.tax),
        description: product.description || "",
        price: product.price || "",
        costPrice: product.costPrice || "",
        stock: product.stock ?? "",
        minStock: product.minStock ?? "",
        inventoryMode: INVENTORY_MODES.includes(product.inventoryMode)
          ? product.inventoryMode
          : "stocked",
        unit: product.unit || "pcs",
        baseUnit: product.baseUnit || product.unit || "pcs",
        conversionFactor: product.conversionFactor ?? 1,
        point: product.point ?? "",
        redeemPoints: product.redeemPoints ?? "",
        estimationTime: product.estimationTime ?? "",
        status: product.status === "active" || product.status === true,
        isAvailable: product.isAvailable ?? true,
        isOption: !!product.isOption,
        hasModifiers: !!product.hasModifiers
      });
      if (product.isOption && product.options) {
        const parsed =
          typeof product.options === "string" ? JSON.parse(product.options) : product.options;
        setVariantGroups(Array.isArray(parsed) ? parsed : []);
      }
      if (product.hasModifiers && product.modifiers) {
        const parsed =
          typeof product.modifiers === "string" ? JSON.parse(product.modifiers) : product.modifiers;
        setModifierItems(Array.isArray(parsed) ? parsed : []);
      }
      if (product.priceTiers) {
        const parsed =
          typeof product.priceTiers === "string"
            ? JSON.parse(product.priceTiers)
            : product.priceTiers;
        setPriceTiers(Array.isArray(parsed) ? parsed : []);
      }
      const existingGallery =
        Array.isArray(product.images) && product.images.length > 0
          ? product.images
          : product.image
            ? [product.image]
            : [];
      setProductImages(existingGallery.map((url) => ({ url, isNew: false })));
      let hydratedFirstStore = "";
      if (product.store !== undefined) {
        const storeArr = Array.isArray(product.store) ? product.store : [];
        if (storeArr.length === 0) {
          setAllStores(true);
          setSelectedStores([]);
        } else {
          const ids = storeArr.map((s) => (typeof s === "object" ? s.id : s));
          setAllStores(false);
          setSelectedStores(ids);
          hydratedFirstStore = ids[0] || "";
        }
      }
      prevStoreRef.current = String(hydratedFirstStore);
      hydratedRef.current = true;
      appliedInitialCategoryRef.current = false;
    }
  }, [product, form]);

  // Only reapplies the product's originally-loaded category once, right
  // after it hydrates (categories for its store may still be loading at
  // that point). Without the guard this effect re-fires on every store
  // switch too (since `categories` is refetched per-store), stomping the
  // reset below with the stale category id.
  useEffect(() => {
    if (
      product.id &&
      categories.length > 0 &&
      product.category &&
      !appliedInitialCategoryRef.current
    ) {
      form.setValue("category", parseJsonOrId(product.category));
      appliedInitialCategoryRef.current = true;
    }
  }, [categories, product.id, product.category, form]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (prevStoreRef.current !== productStore) {
      form.setValue("category", "");
      prevStoreRef.current = productStore;
    }
  }, [productStore, form]);

  useEffect(() => {
    if (product.id && taxOptions.length > 0 && product.tax) {
      const t =
        typeof product.tax === "string"
          ? (() => {
              try {
                return JSON.parse(product.tax);
              } catch {
                return product.tax;
              }
            })()
          : product.tax;
      const id = String(t?.id ?? t);
      form.setValue("tax", id);
    }
  }, [taxOptions, product.id, product.tax, form]);

  const isOption = form.watch("isOption");
  const hasModifiers = form.watch("hasModifiers");
  const tipeProduk = form.watch("tipeProduk");

  useEffect(() => {
    if (tipeProduk === "bahan_baku") {
      const storeId = selectedStores[0] || null;
      if (storeId) {
        checkStockOpnameExists(storeId)
          .then((res) => setNoStockOpname(!res?.data?.exists))
          .catch(() => setNoStockOpname(false));
      }
    } else {
      setNoStockOpname(false);
    }
  }, [tipeProduk, selectedStores]);

  useEffect(() => {
    if (product.id && product.composition) {
      const parsed =
        typeof product.composition === "string"
          ? JSON.parse(product.composition)
          : product.composition;
      setComposition(Array.isArray(parsed) ? parsed : []);
    }
  }, [product]);

  const editMutation = useMutation(editProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["product-detail"]);
      queryClient.invalidateQueries(["product-edit", productId]);
      setIsSubmitting(false);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.product.form.failedEditProduct")
      );
      setErrorModal(true);
      setIsSubmitting(false);
    }
  });

  const updateStorePriceMutation = useMutation(updateProductPriceByStore, {
    onSuccess: (res, variables) => {
      toast.success(t("page.product.form.success"), {
        description: t("page.product.form.storePriceUpdated")
      });
      const storeId = variables?.storePrices?.[0]?.storeId;
      const price = variables?.storePrices?.[0]?.price;
      if (storeId != null) {
        setSavedStorePriceMap((prev) => ({ ...prev, [storeId]: price }));
      }
      queryClient.invalidateQueries(["product-store-prices"]);
      setSavingStoreId(null);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || t("page.product.form.storePriceUpdateFailed")
      );
      setErrorModal(true);
      setSavingStoreId(null);
    }
  });

  const handleSaveStorePrice = (storeId, price) => {
    setSavingStoreId(storeId);
    const payload = {
      productId,
      storePrices: [{ storeId, price: String(price) }]
    };
    updateStorePriceMutation.mutate(payload);
  };

  const addVariantGroup = () => {
    setVariantGroups((prev) => [
      ...prev,
      { id: Date.now(), name: "", options: [{ name: "", price: 0, stock: 0 }] }
    ]);
    form.setValue("isOption", true);
  };

  const removeVariantGroup = (id) => {
    setVariantGroups((prev) => prev.filter((g) => g.id !== id));
    if (variantGroups.length <= 1) form.setValue("isOption", false);
  };

  const updateVariantGroup = (id, field, value) => {
    setVariantGroups((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const addVariantOption = (groupId) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, { name: "", price: 0, stock: 0 }] } : g
      )
    );
  };

  const updateVariantOption = (groupId, index, field, value) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
            }
          : g
      )
    );
  };

  const removeVariantOption = (groupId, index) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: g.options.filter((_, i) => i !== index) } : g
      )
    );
  };

  const addModifierItem = () => {
    setModifierItems((prev) => [...prev, { id: Date.now(), name: "", price: 0 }]);
    form.setValue("hasModifiers", true);
  };

  const updateModifierItem = (id, field, value) => {
    setModifierItems((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const removeModifierItem = (id) => {
    setModifierItems((prev) => prev.filter((m) => m.id !== id));
    if (modifierItems.length <= 1) form.setValue("hasModifiers", false);
  };

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
      let msg =
        currentStep === 1
          ? t("page.product.form.requiredStep1Edit")
          : t("page.product.form.requiredStep2Edit");
      toast.error(t("page.product.form.completeData"), { description: msg });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleToggleOption = (checked) => {
    if (!checked && variantGroups.length > 0) {
      setConfirmAction({
        title: t("page.product.form.confirmDisableVariantTitle"),
        description: t("page.product.form.confirmDisableVariantDesc"),
        onConfirm: () => {
          form.setValue("isOption", false);
          setVariantGroups([]);
        }
      });
      return;
    }
    form.setValue("isOption", checked);
    if (!checked) setVariantGroups([]);
  };

  const handleToggleModifier = (checked) => {
    if (!checked && modifierItems.length > 0) {
      setConfirmAction({
        title: t("page.product.form.confirmDisableModifierTitle"),
        description: t("page.product.form.confirmDisableModifierDesc"),
        onConfirm: () => {
          form.setValue("hasModifiers", false);
          setModifierItems([]);
        }
      });
      return;
    }
    form.setValue("hasModifiers", checked);
    if (!checked) setModifierItems([]);
  };

  const confirmRemove = (onConfirm, count) => {
    if (count > 1) {
      setConfirmAction({
        title: t("page.product.form.confirmDeleteTitle"),
        description: t("page.product.form.confirmDeleteDesc"),
        onConfirm
      });
      return;
    }
    onConfirm();
  };

  const addPriceTier = () => {
    setPriceTiers((prev) => [...prev, { id: Date.now(), name: "", price: 0 }]);
  };

  const updatePriceTier = (id, field, value) => {
    setPriceTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const removePriceTier = (id) => {
    setPriceTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSave = async (values, saveAsDraft = false) => {
    // F9-25: per-store prices are only persisted via each row's own Save
    // button; the main product save must not silently discard pending edits.
    if (!saveAsDraft && isSuperAdmin) {
      const dirtyStorePrices = getUnsavedStorePriceRows(storePrices, savedStorePriceMap);
      if (dirtyStorePrices.length > 0) {
        setModalMessage(
          `${t(
            "page.product.form.unsavedStorePrices",
            "Simpan harga per toko terlebih dahulu"
          )}: ${dirtyStorePrices.map((sp) => sp.storeName || sp.storeId).join(", ")}`
        );
        setErrorModal(true);
        return;
      }
    }
    if (!allStores && selectedStores.length === 0 && !saveAsDraft) {
      form.setError("store", { message: t("page.product.form.selectStoreError") });
      return;
    }
    form.clearErrors("store");
    if (values.tipeProduk === "bahan_baku" && !saveAsDraft) {
      try {
        const storeId = selectedStores[0] || null;
        if (storeId) {
          const res = await checkStockOpnameExists(storeId);
          if (!res?.data?.exists) {
            toast.warning(t("page.product.form.noStockOpname"), {
              description: t("page.product.form.noStockOpnameDesc")
            });
          }
        }
      } catch {
        // silent - non-blocking check
      }
    }

    setIsSubmitting(true);
    const data = {
      id: productId,
      nameProduct: values.nameProduct,
      barcode: values.barcode,
      brand: values.brand,
      sku: values.sku,
      category: values.category,
      tax: values.tax,
      price: values.price,
      costPrice: values.costPrice,
      priceTiers: priceTiers.length > 0 ? priceTiers : [],
      stock: values.stock,
      minStock: values.minStock,
      inventoryMode: values.inventoryMode || "stocked",
      unit: values.unit,
      baseUnit: values.baseUnit,
      conversionFactor: values.conversionFactor || 1,
      point: values.point,
      redeemPoints: values.redeemPoints,
      estimationTime: values.estimationTime,
      description: values.description,
      status: saveAsDraft ? "draft" : values.status ? "active" : "inactive",
      isAvailable: values.isAvailable,
      tipeProduk: values.tipeProduk,
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
      stores: selectedStores,
      createdBy: user?.id,
      modifiedBy: user?.id
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
      jsonFields: ["stores", "options", "modifiers", "priceTiers"]
    });

    editMutation.mutate(payload);
  };

  const onSubmit = (values) => handleSave(values, false);
  const { handleSubmit, confirmModal } = useConfirmSubmit(form, onSubmit);

  if (isError) return <AbortController refetch={refetch} />;

  if (loadingProduct) {
    return (
      <div className="space-y-6">
        <div>
          <PageHeader
            breadcrumbs={[
              {
                label: t("breadcrumb.home"),
                href: "/dashboard-super-admin",
                i18nKey: "breadcrumb.home"
              },
              { label: t("page.product.form.productList"), href: "/product-list" },
              { label: t("page.product.form.editTitle") }
            ]}
            title={t("page.product.form.editTitle")}
            description={t("common.loading")}
            backLink="/product-list"
            onBack={() => setCancelModal(true)}
          />
        </div>
        <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!productId || (!loadingProduct && !product.id)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <Info size={48} className="opacity-30" />
        <p>{t("page.product.detail.notFound")}</p>
        <Button variant="danger" onClick={() => navigate("/product-list")}>
          {t("page.product.form.back")}
        </Button>
      </div>
    );
  }

  const previewValues = form.getValues();
  const selectedCategory = categories.find((c) => String(c.id) === String(previewValues.category));
  const storeName =
    locations.find((l) => String(l.id) === String(productStore))?.name ||
    productStore ||
    "Nama Toko";
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
    ingredients: composition
      .map((c) => (typeof c.name === "string" && c.name.trim() ? c.name.trim() : ""))
      .filter(Boolean),
    variantGroups,
    modifierItems
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.product"), href: "/product-list" },
          { label: product.nameProduct || t("page.product.edit.title") }
        ]}
        title={`${t("page.product.edit.editLabel")} ${product.nameProduct || t("page.product.edit.title")}`}
        description={t("page.product.edit.description")}
        backLink="/product-list"
        onBack={() => setCancelModal(true)}>
        <UserGuide guideKey="add-product" />
      </PageHeader>

      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <div className="bg-muted p-1 rounded-md mb-6">
            <div className="grid grid-cols-3 gap-1">
              {[
                {
                  num: 1,
                  title: t("page.product.step.info")
                },
                {
                  num: 2,
                  title: t("page.product.step.price")
                },
                {
                  num: 3,
                  title: t("page.product.step.media")
                }
              ].map((s) => {
                const isActive = s.num === currentStep;
                // Simplify: using a mock validation state for now as edit view
                // doesn't have the same mandatory field tracking in EditProduct
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
                    <div className={`w-2 h-2 rounded-full bg-muted-foreground/40`} />
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>

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
                              {t("page.product.form.nameProduct")}{" "}
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
                              searchPlaceholder="Cari..."
                            />
                            <FormMessage />
                            {noStockOpname && (
                              <div className="flex items-start gap-2.5 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <AlertTriangle
                                  size={18}
                                  className="text-amber-600 text-base mt-0.5"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-amber-800">
                                    {t("page.product.form.noStockOpname")}
                                  </p>
                                  <p className="text-[11px] text-amber-700 mt-0.5">
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
                            <p className="text-[11px] text-muted-foreground mt-1">
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
                                <p className="text-[11px] text-muted-foreground mt-1">
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
                                <p className="text-[11px] text-muted-foreground mt-1">
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
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  {t("page.product.form.barcodeInfo")}
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

                          <FormField
                            control={form.control}
                            name="conversionFactor"
                            render={({ field }) => {
                              const unit = form.watch("unit");
                              const baseUnit = form.watch("baseUnit");
                              const factor = field.value || 1;
                              const isSameUnit = unit === baseUnit;

                              // Automatically set to 1 if same unit
                              useEffect(() => {
                                if (isSameUnit && field.value !== 1) {
                                  field.onChange(1);
                                }
                              }, [isSameUnit, field.value]);

                              return (
                                <FormItem>
                                  <FormLabel>{t("page.product.form.conversionFactor")}</FormLabel>
                                  <Input
                                    type="number"
                                    min="1"
                                    {...field}
                                    disabled={isSameUnit}
                                    placeholder="1"
                                  />
                                  <p className="text-xs font-medium text-primary mt-1.5 flex items-center gap-1.5 bg-primary/5 p-2 rounded-md border border-primary/10">
                                    <Info size={14} />
                                    {isSameUnit
                                      ? t("page.product.form.sameUnitHelper")
                                      : `1 ${unit || "Satuan"} = ${factor} ${baseUnit || "Satuan Dasar"}`}
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

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

                  {tipeProduk === "menu" && (
                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                      <div className="flex items-center justify-between gap-2 pb-4 border-b border-border mb-5">
                        <div className="flex items-center gap-2">
                          <Package size={18} className="text-primary" />
                          <h3 className="text-base font-semibold text-foreground">
                            {t("page.product.form.composition")}
                          </h3>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 shrink-0"
                          onClick={() =>
                            navigate(
                              existingBom
                                ? `/bom/detail?id=${existingBom.id}`
                                : `/bom/add?productId=${product.id}`
                            )
                          }>
                          <Layers size={14} />
                          {existingBom
                            ? t("page.product.form.manageBom")
                            : t("page.product.form.createBom")}
                        </Button>
                      </div>
                      {/* BA finding #3: the recipe is owned by the BOM (single source)
                          and shown here read-only; it is changed on the BOM page. */}
                      {existingBom && composition.length > 0 ? (
                        <>
                          <p className="text-xs text-muted-foreground -mt-2 mb-3">
                            {t("page.product.form.recipeFromBom")}
                          </p>
                          <ul className="divide-y divide-border rounded-lg border border-border">
                            {composition.map((c, i) => (
                              <li
                                key={c.ingredientId ?? c.id ?? i}
                                className="flex items-center justify-between px-4 py-2.5 text-sm">
                                <span className="text-foreground">{c.name}</span>
                                <span className="font-mono text-muted-foreground">
                                  {c.qty} {c.unit}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("page.product.form.noBomYet")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {currentStep === 2 && (
                <>
                  {/* Harga & Stok */}
                  <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
                      <DollarSign size={18} className="text-primary" />
                      <h3 className="text-base font-semibold text-foreground">
                        {t("page.product.step.price")}
                      </h3>
                    </div>
                    <div className="mb-5">
                      <InventoryModeField
                        value={form.watch("inventoryMode")}
                        productId={product.id}
                        onChange={(mode) =>
                          form.setValue("inventoryMode", mode, { shouldDirty: true })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ProductPriceCostFields
                        form={form}
                        costing={bomCosting}
                        storeId={costingStore}
                      />
                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.product.form.stock")}</FormLabel>
                            {form.watch("inventoryMode") === "make_to_order" && (
                              <p className="text-xs text-muted-foreground">
                                {t("page.product.form.inventoryMode.stockUnused")}
                              </p>
                            )}
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="minStock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.product.form.minStock")}</FormLabel>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="point"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.product.form.point")}</FormLabel>
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
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {t("page.product.form.pointInfo")}
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="redeemPoints"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.product.form.redeemPoints")}</FormLabel>
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
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {t("page.product.form.redeemPointsInfo")}
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Harga per Toko */}
                  {isSuperAdmin && (
                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                      <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
                        <Store size={18} className="text-primary" />
                        <h3 className="text-base font-semibold text-foreground">
                          {t("page.product.form.storePriceSection")}
                        </h3>
                      </div>
                      {locations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("page.product.form.loadingStores")}
                        </p>
                      ) : storePrices.length === 0 && storeIds.length > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("page.product.form.loadingStorePrices")}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {storePrices.map((sp) => (
                            <div key={sp.storeId} className="bg-muted/30 rounded-lg p-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">
                                    {sp.storeName}
                                  </p>
                                </div>
                                <div className="relative w-40 shrink-0">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    Rp
                                  </span>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={sp.price || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setStorePrices((prev) =>
                                        prev.map((p) =>
                                          p.storeId === sp.storeId ? { ...p, price: val } : p
                                        )
                                      );
                                    }}
                                    className="h-9 text-sm pl-8"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="success"
                                  disabled={savingStoreId === sp.storeId}
                                  onClick={() => handleSaveStorePrice(sp.storeId, sp.price)}
                                  className="h-9 shrink-0">
                                  {t("page.product.form.saveStorePrice")}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {currentStep === 3 && (
                <>
                  {/* Varian & Opsi + Modifiers */}
                  <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
                      <Layers size={18} className="text-primary" />
                      <h3 className="text-base font-semibold text-foreground">
                        {t("page.product.form.variantSection")}
                      </h3>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {t("page.product.form.hasVariant")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("page.product.form.hasVariantDesc")}
                          </p>
                        </div>
                        <Switch
                          checked={form.watch("isOption") || variantGroups.length > 0}
                          onCheckedChange={handleToggleOption}
                        />
                      </div>
                      {isOption && (
                        <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                          {variantGroups.map((group, groupIdx) => (
                            <div key={group.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
                                  {groupIdx + 1}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                  {t("page.product.form.variantSection")} {groupIdx + 1}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <GripVertical
                                    size={16}
                                    className="text-muted-foreground shrink-0"
                                  />
                                  <Input
                                    placeholder={t("page.product.form.variantNamePlaceholder")}
                                    value={group.name}
                                    onChange={(e) =>
                                      updateVariantGroup(group.id, "name", e.target.value)
                                    }
                                    className="h-9 text-sm flex-1"
                                    maxLength={FIELD_LIMITS.SHORT_LABEL}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8 text-destructive shrink-0"
                                  onClick={() =>
                                    confirmRemove(
                                      () => removeVariantGroup(group.id),
                                      variantGroups.length
                                    )
                                  }>
                                  <Trash2 size={18} />
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {group.options.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded px-1 py-0.5 shrink-0">
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                    <Input
                                      placeholder={t("page.product.form.optionPlaceholder", {
                                        number: idx + 1
                                      })}
                                      value={opt.name}
                                      onChange={(e) =>
                                        updateVariantOption(group.id, idx, "name", e.target.value)
                                      }
                                      className="h-9 text-sm flex-1"
                                      maxLength={FIELD_LIMITS.SHORT_LABEL}
                                    />
                                    <div className="relative w-28 shrink-0">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                        Rp
                                      </span>
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={Number(opt.price || 0).toLocaleString("id-ID")}
                                        onChange={(e) => {
                                          const raw = e.target.value.replace(/[^0-9]/g, "");
                                          updateVariantOption(
                                            group.id,
                                            idx,
                                            "price",
                                            raw ? Number(raw) : 0
                                          );
                                        }}
                                        className="h-9 text-sm pl-8"
                                      />
                                    </div>
                                    <Input
                                      type="number"
                                      placeholder={t("page.product.form.variantStockPlaceholder")}
                                      value={opt.stock ?? 0}
                                      onChange={(e) =>
                                        updateVariantOption(group.id, idx, "stock", e.target.value)
                                      }
                                      className="h-9 text-sm w-20 shrink-0"
                                    />
                                    {group.options.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8 text-destructive shrink-0"
                                        onClick={() =>
                                          confirmRemove(
                                            () => removeVariantOption(group.id, idx),
                                            group.options.length
                                          )
                                        }>
                                        <Trash2 size={14} />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <Button
                                type="button"
                                variant="success"
                                size="sm"
                                onClick={() => addVariantOption(group.id)}
                                className="gap-1 h-8 text-xs">
                                <Plus size={14} /> {t("page.product.form.addOption")}
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="success"
                            onClick={addVariantGroup}
                            className="gap-2">
                            <Plus size={16} /> {t("page.product.form.addVariantGroup")}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Separator */}
                    <div className="border-t border-border my-6" />

                    {/* Modifiers */}
                    <div>
                      <div className="flex items-center gap-2 pb-4 mb-5">
                        <Tag size={18} className="text-primary" />
                        <h3 className="text-base font-semibold text-foreground">
                          {t("page.product.form.modifierSection")}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {t("page.product.form.hasModifier")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("page.product.form.hasModifierDesc")}
                          </p>
                        </div>
                        <Switch
                          checked={form.watch("hasModifiers") || modifierItems.length > 0}
                          onCheckedChange={handleToggleModifier}
                        />
                      </div>
                      {hasModifiers && (
                        <div className="space-y-3 mt-4">
                          <p className="text-xs text-muted-foreground">
                            {t("page.product.form.modifierInfo")}
                          </p>
                          {modifierItems.map((mod, modIdx) => (
                            <div key={mod.id} className="bg-muted/30 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
                                  {modIdx + 1}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                  {t("page.product.form.modifierSection")} {modIdx + 1}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                  placeholder={t("page.product.form.modifierNamePlaceholder")}
                                  value={mod.name}
                                  onChange={(e) =>
                                    updateModifierItem(mod.id, "name", e.target.value)
                                  }
                                  className="h-9 text-sm"
                                  maxLength={FIELD_LIMITS.SHORT_LABEL}
                                />
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                      Rp
                                    </span>
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="0"
                                      value={Number(mod.price).toLocaleString("id-ID")}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, "");
                                        updateModifierItem(mod.id, "price", raw ? Number(raw) : 0);
                                      }}
                                      className="h-9 text-sm pl-10"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8 text-destructive shrink-0"
                                    onClick={() =>
                                      confirmRemove(
                                        () => removeModifierItem(mod.id),
                                        modifierItems.length
                                      )
                                    }>
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="success"
                            onClick={addModifierItem}
                            className="gap-2">
                            <Plus size={16} /> {t("page.product.form.addModifier")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
                      <TrendingUp size={18} className="text-primary" />
                      <h3 className="text-base font-semibold text-foreground">
                        {t("page.product.form.tierSection")}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2 mb-4">
                      {t("page.product.form.tierInfo")}
                    </p>
                    <div className="space-y-3">
                      {priceTiers.map((tier, tierIdx) => (
                        <div key={tier.id} className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
                              {tierIdx + 1}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {t("page.product.form.tierSection")} {tierIdx + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder={t("page.product.form.tierNamePlaceholder")}
                              value={tier.name}
                              onChange={(e) => updatePriceTier(tier.id, "name", e.target.value)}
                              className="h-9 text-sm flex-1"
                              maxLength={FIELD_LIMITS.SHORT_LABEL}
                            />
                            <div className="relative w-40 shrink-0">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                Rp
                              </span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={Number(tier.price).toLocaleString("id-ID")}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  updatePriceTier(tier.id, "price", raw ? Number(raw) : 0);
                                }}
                                className="h-9 text-sm pl-8"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 text-destructive shrink-0"
                              onClick={() =>
                                confirmRemove(() => removePriceTier(tier.id), priceTiers.length)
                              }>
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="success"
                        size="sm"
                        className="gap-1"
                        onClick={addPriceTier}>
                        <Plus size={18} />
                        {t("page.product.form.addTier")}
                      </Button>
                      {priceTiers.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t("page.product.form.tierEmpty")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Image Gallery */}
                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                      <ProductImageGallery
                        images={productImages}
                        onChange={handleProductImagesChange}
                      />
                    </div>

                    {/* Status */}
                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                      <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
                        <Tag size={18} className="text-primary" />
                        <h3 className="text-base font-semibold text-foreground">
                          {t("page.product.form.statusSection")}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <div
                                className={`pt-2 flex items-center justify-between p-4 rounded-lg ${
                                  field.value
                                    ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                                    : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                                }`}>
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
                                      {t("page.product.form.statusLabel")}{" "}
                                      {field.value
                                        ? t("page.product.form.active")
                                        : t("page.product.form.inactive")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {field.value
                                        ? t("page.product.form.activeDesc")
                                        : t("page.product.form.inactiveDesc")}
                                    </p>
                                  </div>
                                </div>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isAvailable"
                          render={({ field }) => (
                            <FormItem>
                              <div
                                className={`pt-2 flex items-center justify-between p-4 rounded-lg ${
                                  field.value
                                    ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                                    : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                                }`}>
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
                                        ? t("page.product.form.yes")
                                        : t("page.product.form.no")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {field.value
                                        ? t("page.product.form.availableDesc")
                                        : t("page.product.form.unavailableDesc")}
                                    </p>
                                  </div>
                                </div>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-card border border-border rounded-xl p-4">
            <Button
              type="button"
              variant="danger"
              onClick={() => setCancelModal(true)}
              className="gap-2 w-full sm:w-auto">
              <X size={18} /> {t("page.product.form.cancel")}
            </Button>
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrev} className="gap-2">
                  <ChevronLeft size={18} /> {t("page.product.form.prev")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="gap-2">
                <Eye size={18} /> {t("page.product.form.preview")}
              </Button>
              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext} className="gap-2 shadow-md">
                  {t("page.product.form.next")} <ChevronRight size={18} />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="draft"
                    onClick={() => setDraftModal(true)}
                    disabled={isSubmitting}
                    className="gap-2 shadow-md">
                    <Save size={18} />
                    {t("page.product.form.saveDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    onClick={() => {
                      if (!allStores && selectedStores.length === 0) {
                        form.setError("store", {
                          message: t("page.product.form.selectStoreError")
                        });
                        return;
                      }
                      form.clearErrors("store");
                      handleSubmit();
                    }}
                    disabled={isSubmitting}
                    className="gap-2 shadow-md">
                    <Save size={18} />
                    {t("page.product.form.saveEdit")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Form>

      {isSubmitting && <Loading fullscreen size="lg" label={t("page.product.form.savingEdit")} />}
      {savingStoreId && <Loading fullscreen size="lg" label={t("common.saving")} />}

      <Modal type="confirm" {...confirmModal()} />

      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />

      <Modal
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("page.product.form.successEditTitle")}
        description={t("page.product.form.successEditDesc")}
        onConfirm={() => setTimeout(() => navigate("/product-list"), 150)}
      />

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(() => navigate("/product-list"), 150)}
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

      <ProductPreview open={showPreview} onOpenChange={setShowPreview} product={previewData} />
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
    </div>
  );
};

export default EditProduct;

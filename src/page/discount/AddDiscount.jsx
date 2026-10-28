import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useCookies } from "react-cookie";
import { X, Save, Check, PackageOpen, Plus, ChevronsUpDown } from "lucide-react";
import { addDiscount } from "@/services/discount";
import { getAllProduct } from "@/services/product";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
  FormDescription
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Modal from "@/components/organism/modal";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
const PROMO_TYPES = {
  standard: "page.discount.form.promoType.standard",
  bogo: "page.discount.form.promoType.bogo",
  bundling: "page.discount.form.promoType.bundling",
  happyHour: "page.discount.form.promoType.happyHour",
  category: "page.discount.form.promoType.category"
};

const AddDiscount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const role = user?.roleType || "";
  const isSuperAdmin = role === "super_admin";
  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || locationsData?.locations || [];

  const storeId = selectedStores?.[0] || null;

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["products-for-bundling", storeId],
    () => getAllProduct({ location: storeId }),
    { enabled: !!storeId }
  );
  const products = productsData?.data || productsData?.products || productsData || [];

  const formatIDR = (value) => {
    if (!value && value !== 0) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value));
  };

  const baseFields = useMemo(
    () => ({
      name: z.string().min(1, "Nama Diskon tidak boleh kosong"),
      promoType: z.string().default("standard"),
      type: z.string().optional().or(z.literal("")),
      value: z.coerce.number().optional().or(z.literal("")),
      startDate: z.date({ required_error: "Tanggal Mulai harus diisi" }),
      endDate: z.date().nullable().optional(),
      minPurchase: z.coerce.number().min(0).optional().or(z.literal("")),
      description: z.string().optional().or(z.literal("")),
      isActive: z.boolean().default(true),
      code: z.string().optional().or(z.literal("")),
      maxDiscount: z.coerce.number().min(0).optional().or(z.literal("")),
      buyQty: z.coerce.number().optional().or(z.literal("")),
      freeQty: z.coerce.number().optional().or(z.literal("")),
      bundlePrice: z.coerce.number().optional().or(z.literal("")),
      productIds: z.string().optional().or(z.literal("")),
      discountPercent: z.coerce.number().optional().or(z.literal("")),
      startTime: z.string().optional().or(z.literal("")),
      endTime: z.string().optional().or(z.literal("")),
      daysOfWeek: z.string().optional().or(z.literal("")),
      categoryIds: z.string().optional().or(z.literal("")),
      catDiscountPercent: z.coerce.number().optional().or(z.literal("")),
      store: z.string().optional()
    }),
    []
  );

  const draftSchema = useMemo(() => z.object(baseFields), [baseFields]);

  const form = useForm({
    resolver: zodResolver(draftSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      promoType: "standard",
      type: "",
      value: "",
      startDate: undefined,
      endDate: undefined,
      minPurchase: "",
      description: "",
      isActive: true,
      code: "",
      maxDiscount: "",
      buyQty: "",
      freeQty: "",
      bundlePrice: "",
      productIds: "",
      discountPercent: "",
      startTime: "",
      endTime: "",
      daysOfWeek: "",
      categoryIds: "",
      catDiscountPercent: "",
      store: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/discount-list",
    () => setCancelModal(true),
    form
  );

  const promoType = form.watch("promoType");
  const startDate = form.watch("startDate");

  const saveSchema = useMemo(() => {
    const required = (label) => z.string().min(1, label);
    const requiredNum = (label) => z.coerce.number().min(1, label);

    const promoTypeFields = {
      standard: {
        type: required("Tipe Diskon harus diisi"),
        value: requiredNum("Nilai Diskon harus diisi")
      },
      bogo: {
        buyQty: requiredNum("Jumlah Beli harus diisi"),
        freeQty: requiredNum("Jumlah Gratis harus diisi")
      },
      bundling: {
        bundlePrice: requiredNum("Harga Bundling harus diisi"),
        productIds: required("Produk harus dipilih")
      },
      happyHour: {
        discountPercent: requiredNum("Persentase Diskon harus diisi"),
        startTime: required("Jam Mulai harus diisi"),
        endTime: required("Jam Selesai harus diisi")
      },
      category: {
        catDiscountPercent: requiredNum("Persentase Diskon harus diisi"),
        categoryIds: required("Kategori harus dipilih")
      }
    };

    return z.object({
      ...baseFields,
      ...(safeGet(promoTypeFields, promoType) || {})
    });
  }, [baseFields, promoType]);

  const discountFieldLabels = useMemo(
    () => ({
      name: t("page.discount.form.name"),
      store: t("page.discount.form.storeSection.title"),
      startDate: t("page.discount.form.startDateLabel"),
      type: t("page.discount.form.typeLabel"),
      value: t("page.discount.form.value"),
      buyQty: t("page.discount.form.buyQty"),
      freeQty: t("page.discount.form.freeQty"),
      bundlePrice: t("page.discount.form.bundlePriceLabel"),
      productIds: t("page.discount.form.products"),
      discountPercent: t("page.discount.form.discountPercentLabel"),
      startTime: t("page.discount.form.startTimeLabel"),
      endTime: t("page.discount.form.endTimeLabel"),
      catDiscountPercent: t("page.discount.form.discountPercentLabel"),
      categoryIds: t("page.discount.form.categoryIdsLabel")
    }),
    [t]
  );

  const queryClient = useQueryClient();

  const createMutation = useMutation(addDiscount, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["discounts"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.discount.add.toast.errorDescription")
      );
      setErrorModal(true);
    }
  });

  const buildConditions = (values) => {
    switch (values.promoType) {
      case "bogo":
        return {
          promoType: "bogo",
          buyQty: Number(values.buyQty),
          freeQty: Number(values.freeQty)
        };
      case "bundling":
        return {
          promoType: "bundling",
          bundlePrice: Number(values.bundlePrice),
          productIds: Array.isArray(values.productIds)
            ? values.productIds.map(Number)
            : values.productIds
              ? values.productIds.split(",").map(Number)
              : []
        };
      case "happyHour":
        return {
          promoType: "happyHour",
          discountPercent: Number(values.discountPercent),
          startTime: values.startTime,
          endTime: values.endTime,
          daysOfWeek: values.daysOfWeek ? values.daysOfWeek.split(",").map(Number) : []
        };
      case "category":
        return {
          promoType: "category",
          discountPercent: Number(values.catDiscountPercent),
          categoryIds: values.categoryIds ? values.categoryIds.split(",").map(Number) : []
        };
      default:
        return null;
    }
  };

  const submitData = (values, saveAsDraft = false) => {
    const conditions = buildConditions(values);
    const isAdvanced = values.promoType !== "standard";

    const payload = {
      name: values.name,
      type: isAdvanced
        ? "percent"
        : values.type === "Persentase"
          ? "percent"
          : values.type === "Nominal"
            ? "nominal"
            : values.type,
      value: isAdvanced ? 0 : Number(values.value),
      startDate: values.startDate ? format(values.startDate, "yyyy-MM-dd") : "",
      endDate: values.endDate ? format(values.endDate, "yyyy-MM-dd") : null,
      minimumOrder: values.minPurchase || 0,
      maximumDiscount: values.maxDiscount || 0,
      code: values.code || null,
      conditions: conditions || {},
      store: allStores ? null : selectedStores[0] || null,
      description: values.description || null,
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    };
    createMutation.mutate(payload);
  };

  const onSubmit = (values) => {
    if (isSuperAdmin && !allStores && selectedStores.length === 0) {
      form.setError("store", { message: t("page.purchaseOrder.add.validation.store") });
    }

    const extraErrors = [];
    if (isSuperAdmin && !allStores && selectedStores.length === 0) {
      extraErrors.push({ name: "store" });
    }

    const missing = getMissingFields(values, saveSchema, discountFieldLabels, extraErrors);

    const result = saveSchema.safeParse(values);
    if (!result.success) {
      result.error.errors.forEach((err) => {
        form.setError(err.path[0], { message: err.message });
      });
    }

    if (missing.length > 0) {
      setMissingFields(missing);
      setMissingFieldsModal(true);
      return;
    }
    setConfirmSaveModal(true);
  };

  const handleConfirmSave = () => {
    setConfirmSaveModal(false);
    submitData(form.getValues(), false);
  };

  const handleTypeClick = (e) => {
    e.preventDefault();
    onSubmit(form.getValues());
  };

  if (locsLoading || locsFetching) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("page.discount.list.title"),
              href: "/discount-list",
              i18nKey: "page.discount.list.title"
            },
            { label: t("breadcrumb.add"), i18nKey: "breadcrumb.add" }
          ]}
          title={t("breadcrumb.add")}
          description={t("page.discount.add.description")}
          backLink="/discount-list">
          <UserGuide guideKey="add-discount" />
        </PageHeader>
        <LoadErrorBanner />
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("page.discount.list.title"),
              href: "/discount-list",
              i18nKey: "page.discount.list.title"
            },
            { label: t("breadcrumb.add"), i18nKey: "breadcrumb.add" }
          ]}
          title={t("breadcrumb.add")}
          description={t("page.discount.add.description")}
          backLink="/discount-list"
          onBack={requestLeave}>
          <UserGuide guideKey="add-discount" />
        </PageHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(form.getValues());
            }}
            className="space-y-6">
            <div className="grid grid-cols-12">
              <div className="col-span-12">
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
                          title={t("page.discount.form.storeSection.title")}
                          description={t("page.discount.form.storeSection.desc")}
                          noStoreLabel={t("page.discount.form.storeSection.noStore")}
                          addStoreLabel={t("page.discount.form.storeSection.addStore")}
                          storeInfoLabel={t("page.discount.form.storeInfo")}
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
              </div>
            </div>

            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("page.discount.form.name")} <span className="text-destructive">*</span>
                      </FormLabel>
                      <Input
                        placeholder={t("page.discount.form.namePlaceholder")}
                        {...field}
                        maxLength={FIELD_LIMITS.BUSINESS_NAME}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="promoType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("page.discount.form.promoTypeLabel")}{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("page.discount.form.promoTypePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROMO_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {t(label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Standard discount fields */}
              {promoType === "standard" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.typeLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("page.discount.form.typePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Persentase">
                              {t("page.discount.form.percent")}
                            </SelectItem>
                            <SelectItem value="Nominal">
                              {t("page.discount.form.nominal")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.value")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          type="number"
                          placeholder={t("page.discount.form.valuePlaceholder")}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value === "" ? "" : Number(e.target.value));
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* BOGO fields */}
              {promoType === "bogo" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="buyQty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.buyQty")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          type="number"
                          min="1"
                          placeholder={t("page.discount.form.placeholder.buyQty")}
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                        <FormMessage />
                        <FormDescription>{t("common.optionalField")}</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="freeQty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.freeQty")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          type="number"
                          min="1"
                          placeholder={t("page.discount.form.placeholder.freeQty")}
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                        <FormMessage />
                        <FormDescription>{t("common.optionalField")}</FormDescription>
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    {t("page.discount.form.bogoHint")}
                  </p>
                </div>
              )}

              {/* Bundling fields */}
              {promoType === "bundling" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="bundlePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.bundlePriceLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            type="text"
                            className="pl-10"
                            value={
                              field.value ? formatIDR(field.value).replace("Rp", "").trim() : ""
                            }
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              field.onChange(raw ? Number(raw) : "");
                            }}
                          />
                        </div>
                        <FormMessage />
                        <FormDescription>{t("common.optionalField")}</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="productIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.products")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        {!storeId ? (
                          <p className="text-sm text-muted-foreground">
                            {t("page.discount.form.selectStoreFirst")}
                          </p>
                        ) : productsLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-10 w-full rounded-lg" />
                            <div className="flex gap-1.5">
                              <Skeleton className="h-6 w-20 rounded-md" />
                              <Skeleton className="h-6 w-16 rounded-md" />
                              <Skeleton className="h-6 w-24 rounded-md" />
                            </div>
                          </div>
                        ) : Array.isArray(products) && products.length === 0 ? (
                          <div className="flex items-center gap-3 p-3 border border-dashed rounded-lg">
                            <PackageOpen size={18} className="text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">
                                {t("page.discount.form.noProducts")}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="success"
                              className="gap-1 shrink-0"
                              onClick={() => navigate("/add-product")}>
                              <Plus size={14} />
                              {t("page.discount.form.addProduct")}
                            </Button>
                          </div>
                        ) : (
                          <ProductMultiSelect
                            products={Array.isArray(products) ? products : []}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Happy Hour fields */}
              {promoType === "happyHour" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="discountPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.discountPercentLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder={t("page.discount.form.placeholder.discountPercent")}
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.startTimeLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <TimePicker
                          {...field}
                          placeholder={t("page.discount.form.placeholder.startTime")}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.endTimeLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <TimePicker
                          {...field}
                          placeholder={t("page.discount.form.placeholder.endTime")}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="daysOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("page.discount.form.daysOfWeekLabel")}</FormLabel>
                        <Input
                          placeholder={t("page.discount.form.placeholder.daysOfWeek")}
                          {...field}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Category discount fields */}
              {promoType === "category" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="catDiscountPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.discountPercentLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder={t("page.discount.form.placeholder.catDiscountPercent")}
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoryIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.categoryIdsLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          placeholder={t("page.discount.form.placeholder.categoryIds")}
                          {...field}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Common fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("page.discount.form.startDateLabel")}{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("page.discount.form.endDate")}</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                        disabled={!startDate}
                        minDate={startDate || undefined}
                        placeholder={
                          !startDate
                            ? t("page.discount.form.fillStartDateFirst")
                            : t("page.discount.form.endDatePlaceholder")
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {promoType === "standard" && (
                  <>
                    <FormField
                      control={form.control}
                      name="minPurchase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("page.discount.form.minPurchase")}</FormLabel>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value === "" ? "" : Number(e.target.value));
                            }}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxDiscount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("page.discount.form.maxDiscount")}</FormLabel>
                          <Input
                            type="number"
                            placeholder={t("page.discount.form.placeholder.maxDiscount")}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value === "" ? "" : Number(e.target.value));
                            }}
                          />
                          <FormMessage />
                          <FormDescription>{t("common.optionalField")}</FormDescription>
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("page.discount.form.promoCode")}</FormLabel>
                      <Input
                        placeholder={t("page.discount.form.promoCodePlaceholder")}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        maxLength={FIELD_LIMITS.CODE}
                      />
                      <FormMessage />
                      <FormDescription>{t("common.optionalField")}</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.discount.form.description")}</FormLabel>
                    <Textarea
                      placeholder={t("page.discount.form.descriptionPlaceholder")}
                      rows={3}
                      {...field}
                      maxLength={FIELD_LIMITS.DESCRIPTION}
                    />
                    <FormMessage />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <div
                      className={`pt-2 flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
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
                              ? t("page.discount.form.active")
                              : t("page.discount.form.inactive")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {field.value
                              ? t("page.discount.form.activeDescription")
                              : t("page.discount.form.inactiveDescription")}
                          </p>
                        </div>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
                <Button
                  type="button"
                  variant="danger"
                  onClick={requestLeave}
                  className="gap-2 w-full sm:w-auto justify-center">
                  <X size={18} />
                  {t("breadcrumb.back")}
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Button
                    type="button"
                    variant="draft"
                    className="w-full sm:w-auto justify-center"
                    onClick={() => setDraftModal(true)}
                    disabled={createMutation.isLoading}>
                    {t("page.discount.add.saveAsDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    onClick={handleTypeClick}
                    disabled={createMutation.isLoading}
                    className="gap-2 w-full sm:w-auto justify-center">
                    <Save size={18} />
                    {createMutation.isLoading ? t("button.saving") : t("button.save")}
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        </Form>

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
          type="success"
          open={successModal}
          secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
          onSecondary={() => navigate(`/detail-discount?id=${createdRecordId}`)}
          onOpenChange={setSuccessModal}
          title={t("page.discount.add.successTitle")}
          description={t("page.discount.add.successDescription")}
          confirmText={t("page.discount.add.successConfirm")}
          onConfirm={() => setTimeout(() => navigate("/discount-list"), 150)}
        />
        <Modal
          type="confirm"
          open={draftModal}
          onOpenChange={setDraftModal}
          title={t("page.discount.add.draftTitle")}
          description={t("page.discount.add.draftDescription")}
          confirmText={t("page.discount.add.draftConfirm")}
          onConfirm={() => {
            setDraftModal(false);
            submitData(form.getValues(), true);
          }}
        />
        <Modal
          type="confirm"
          open={confirmSaveModal}
          onOpenChange={setConfirmSaveModal}
          title={t("common.confirmSave")}
          description={t("common.confirmSaveDesc")}
          confirmText={t("common.yesSave")}
          onConfirm={handleConfirmSave}
        />
        <MissingFieldsModal
          open={missingFieldsModal}
          onOpenChange={setMissingFieldsModal}
          fields={missingFields}
        />
        {createMutation.isLoading && <Loading fullscreen size="lg" label={t("button.saving")} />}
        <Modal
          type="error"
          open={errorModal}
          onOpenChange={setErrorModal}
          title={t("common.error")}
          description={modalMessage}
          onConfirm={() => setErrorModal(false)}
        />
      </div>
    </div>
  );
};

function ProductMultiSelect({ products, value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selectedIds = value
    ? Array.isArray(value)
      ? value
      : value.split(",").filter(Boolean).map(Number)
    : [];

  const toggleProduct = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next.join(","));
  };

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id || p.productId));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10">
            <span className="truncate text-muted-foreground">
              {selectedIds.length > 0
                ? `${selectedIds.length} ${t("page.discount.form.productSelected")}`
                : t("page.discount.form.selectProduct")}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={t("page.discount.form.searchProduct")} />
            <CommandList>
              <CommandEmpty>{t("page.discount.form.productNotFound")}</CommandEmpty>
              <CommandGroup>
                {products.map((product) => {
                  const id = product.id || product.productId;
                  const name =
                    product.name ||
                    product.productName ||
                    `${t("page.discount.form.productFallback")}${id}`;
                  const isSelected = selectedIds.includes(id);
                  return (
                    <CommandItem
                      key={id}
                      onSelect={() => toggleProduct(id)}
                      className="cursor-pointer">
                      <Check
                        className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      {name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProducts.map((product) => {
            const id = product.id || product.productId;
            const name = product.name || product.productName || `#${id}`;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                {name}
                <button
                  type="button"
                  onClick={() => toggleProduct(id)}
                  className="hover:text-destructive">
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AddDiscount;

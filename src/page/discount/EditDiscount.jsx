import React, { useState, useEffect, useMemo } from "react";
import { safeGet } from "@/lib/safe-lookup";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useCookies } from "react-cookie";
import { X, Save, Check } from "lucide-react";
import { getDiscountById, editDiscount } from "@/services/discount";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
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
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import Modal from "@/components/organism/modal";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
const PROMO_TYPES = {
  standard: "page.discount.form.promoType.standard",
  bogo: "page.discount.form.promoType.bogo",
  bundling: "page.discount.form.promoType.bundling",
  happyHour: "page.discount.form.promoType.happyHour",
  category: "page.discount.form.promoType.category"
};

const EditDiscount = () => {
  const { t } = useTranslation();

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

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [cookie] = useCookies();
  const [draftModal, setDraftModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const { data: locData, isLoading: locsLoading, isFetching: locsFetching } = useLocations();
  const locations = locData?.data || [];

  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState(true);

  const { data, isLoading, isError, refetch } = useQuery(
    ["discount", id],
    () => getDiscountById(id),
    { enabled: !!id }
  );

  const discountItem = data?.data || {};

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

  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const currentPromoType = form.watch("promoType");
  const startDate = form.watch("startDate");

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
      ...(safeGet(promoTypeFields, currentPromoType) ?? {})
    });
  }, [baseFields, currentPromoType]);

  useEffect(() => {
    if (discountItem?.id) {
      const c = discountItem.conditions || {};
      if (discountItem.store) {
        setSelectedStores([discountItem.store]);
        setAllStores(false);
      } else {
        setSelectedStores([]);
        setAllStores(true);
      }
      form.reset({
        name: discountItem.name || "",
        promoType: c.promoType || "standard",
        type:
          discountItem.type === "percent"
            ? "Persentase"
            : discountItem.type === "nominal"
              ? "Nominal"
              : discountItem.type || "",
        value: discountItem.value || "",
        startDate: discountItem.startDate ? new Date(discountItem.startDate) : undefined,
        endDate: discountItem.endDate ? new Date(discountItem.endDate) : undefined,
        minPurchase: discountItem.minimumOrder ?? "",
        description: discountItem.description || "",
        isActive: discountItem.status === "active",
        code: discountItem.code || "",
        maxDiscount: discountItem.maximumDiscount ?? "",
        buyQty: c.buyQty ?? "",
        freeQty: c.freeQty ?? "",
        bundlePrice: c.bundlePrice ?? "",
        productIds: c.productIds ? c.productIds.join(",") : "",
        discountPercent: c.discountPercent ?? "",
        startTime: c.startTime ?? "",
        endTime: c.endTime ?? "",
        daysOfWeek: c.daysOfWeek ? c.daysOfWeek.join(",") : "",
        categoryIds: c.categoryIds ? c.categoryIds.join(",") : "",
        catDiscountPercent: c.discountPercent ?? ""
      });
    }
  }, [discountItem, form]);

  const updateMutation = useMutation(editDiscount, {
    onSuccess: () => {
      queryClient.invalidateQueries(["discounts"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message ||
          err.message ||
          t("page.discount.edit.toast.errorDescription")
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
          productIds: values.productIds ? values.productIds.split(",").map(Number) : []
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
      id,
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
    updateMutation.mutate(payload);
  };

  const onSubmit = (values) => {
    const extraErrors = [];
    if (isSuperAdmin && !allStores && selectedStores.length === 0) {
      form.setError("store", { message: "Toko harus dipilih" });
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

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.discount.edit.idNotFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
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
              href: "/discount",
              i18nKey: "page.discount.list.title"
            },
            { label: t("page.discount.edit.title"), i18nKey: "page.discount.edit.title" }
          ]}
          title={t("page.discount.edit.title")}
          description={t("page.discount.edit.description")}
          backLink="/discount">
          <UserGuide guideKey="add-discount" mode="edit" />
        </PageHeader>
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

  if (!discountItem?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.discount.edit.notFound")}</p>
      </div>
    );
  }

  const handleTypeClick = (e) => {
    e.preventDefault();
    onSubmit(form.getValues());
  };

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
              href: "/discount",
              i18nKey: "page.discount.list.title"
            },
            { label: t("page.discount.edit.title"), i18nKey: "page.discount.edit.title" }
          ]}
          title={t("page.discount.edit.title")}
          description={t("page.discount.edit.description")}
          backLink="/discount"
          onBack={() => setCancelModal(true)}>
          <UserGuide guideKey="add-discount" mode="edit" />
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
              {currentPromoType === "standard" && (
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
              {currentPromoType === "bogo" && (
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
              {currentPromoType === "bundling" && (
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
                        <Input
                          type="number"
                          min="1"
                          placeholder={t("page.discount.form.placeholder.bundlePrice")}
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
                    name="productIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.discount.form.productIdsLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          placeholder={t("page.discount.form.placeholder.productIds")}
                          {...field}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    {t("page.discount.form.bundleProductIdsHint")}
                  </p>
                </div>
              )}

              {/* Happy Hour fields */}
              {currentPromoType === "happyHour" && (
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
              {currentPromoType === "category" && (
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
                {currentPromoType === "standard" && (
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
                  onClick={() => setCancelModal(true)}
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
                    disabled={updateMutation.isLoading}>
                    {t("page.discount.add.saveAsDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    onClick={handleTypeClick}
                    disabled={updateMutation.isLoading}
                    className="gap-2 w-full sm:w-auto justify-center">
                    <Save size={18} />
                    {updateMutation.isLoading ? t("button.saving") : t("button.save")}
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        </Form>

        {updateMutation.isLoading && <Loading fullscreen size="lg" label={t("button.saving")} />}

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

        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={setCancelModal}
          title={t("modal.cancelTitle")}
          description={t("modal.cancelDescription")}
          confirmText={t("modal.yesCancel")}
          onConfirm={() => setTimeout(() => navigate("/discount-list"), 150)}
        />

        <Modal
          type="success"
          open={successModal}
          onOpenChange={setSuccessModal}
          title={t("page.discount.edit.successTitle")}
          description={t("page.discount.edit.successDescription")}
          confirmText={t("page.discount.edit.successConfirm")}
          onConfirm={() => setTimeout(() => navigate("/discount-list"), 150)}
        />

        <Modal
          type="confirm"
          open={draftModal}
          onOpenChange={setDraftModal}
          title={t("page.discount.edit.draftTitle")}
          description={t("page.discount.edit.draftDescription")}
          confirmText={t("page.discount.edit.draftConfirm")}
          onConfirm={() => {
            setDraftModal(false);
            submitData(form.getValues(), true);
          }}
        />
      </div>
    </div>
  );
};

export default EditDiscount;

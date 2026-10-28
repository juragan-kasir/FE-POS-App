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
  Info,
  Plus,
  Trash2,
  X,
  Check,
  ChevronsUpDown,
  Megaphone,
  Percent,
  CalendarClock,
  SlidersHorizontal,
  ListChecks,
  Gift
} from "lucide-react";
import { getCampaignById, updateCampaign, getCampaigns } from "@/services/promo";
import { getAllProduct } from "@/services/product";
import { getAllCategoryActive } from "@/services/category";
import { getAllMemberTier } from "@/services/member-tier";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Form, FormDescription } from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { DateInput } from "@/components/ui/date-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormExit } from "@/hooks/useLeaveGuard";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const SectionHeader = ({ icon: Icon, title, description, gradient }) => (
  <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-white/80 mt-0.5">{description}</p>}
      </div>
    </div>
  </div>
);

const CAMPAIGN_TYPE_LABELS = {
  happy_hour: "Happy Hour",
  birthday: "Birthday",
  buy_x_get_y: "Buy X Get Y",
  spend_get: "Spend & Get",
  manual: "Manual",
  automatic: "Automatic"
};

const EditPromoCampaign = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  // ponytail: tab aktif, pola /add-supplier
  const [activeTab, setActiveTab] = useState("general");
  // ponytail: konfirmasi hapus rule/reward — { type: "rule"|"reward", index }
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [rules, setRules] = useState([]);
  const [rewards, setRewards] = useState([]);

  const promoFieldLabels = {
    name: "Nama Campaign",
    type: "Tipe Campaign",
    startDate: "Tanggal Mulai",
    endDate: "Tanggal Akhir",
    applicableIds: "Pilihan Spesifik (Berlaku Untuk)"
  };

  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const { data: campaign, isLoading } = useQuery(
    ["promo-campaign", id],
    () => getCampaignById(id),
    {
      enabled: !!id
    }
  );

  // ponytail: super_admin bisa pindah toko — produk/payload mengikuti store ini
  const isSuperAdmin = user?.roleType === "super_admin";
  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const effectiveStore = allStores
    ? null
    : selectedStores[0] || campaign?.store || cookie?.activeStore || null;
  // ponytail: Berlaku Untuk terbuka begitu user memutuskan scope toko (Semua Toko ATAU per-toko)
  const storeReady = !isSuperAdmin || allStores || selectedStores.length > 0;

  // ponytail: Berlaku Untuk spesifik — produk/kategori diambil per toko terpilih
  const [applicableIds, setApplicableIds] = useState([]);

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", { enabled: isSuperAdmin });
  const locations = locationsData?.data || [];

  const handleStoreChange = (stores) => {
    setSelectedStores(stores);
    // ponytail: jangan reset allStores kalau ini efek klik kartu Semua Toko (onChange([]))
    if (stores.length > 0) setAllStores(false);
    setApplicableIds([]);
  };

  const handleAllStoresChange = (val) => {
    setAllStores(val);
    if (val) setSelectedStores([]);
    setApplicableIds([]);
  };

  const schema = z.object({
    name: z.string().min(1, t("page.promo.validation.nameRequired")),
    description: z.string().optional(),
    code: z.string().optional(),
    type: z.string().min(1, t("page.promo.validation.typeRequired")),
    discountType: z.string().default("percentage"),
    discountValue: z.number().min(0).default(0),
    maxDiscount: z.number().optional().nullable(),
    minPurchase: z.number().min(0).default(0),
    startDate: z.string().min(1, t("page.promo.validation.startDateRequired")),
    endDate: z.string().min(1, t("page.promo.validation.endDateRequired")),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    applicableTo: z.string().default("all"),
    maxUsageTotal: z.preprocess(
      (v) => (v === "" || v === undefined || Number.isNaN(v) ? null : v),
      z.number().optional().nullable()
    ),
    maxUsagePerMember: z.preprocess(
      (v) => (v === "" || v === undefined || Number.isNaN(v) ? null : v),
      z.number().optional().nullable()
    ),
    priority: z.number().min(0).default(0),
    isCombinable: z.boolean().default(false),
    autoActivate: z.boolean().default(false)
  });

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      code: "",
      type: "happy_hour",
      discountType: "percentage",
      discountValue: 0,
      maxDiscount: null,
      minPurchase: 0,
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      applicableTo: "all",
      maxUsageTotal: null,
      maxUsagePerMember: null,
      priority: 0,
      isCombinable: false,
      autoActivate: false
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/promo-list",
    () => setCancelModalOpen(true),
    form
  );

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name || "",
        description: campaign.description || "",
        code: campaign.code || "",
        type: campaign.type || "happy_hour",
        discountType: campaign.discountType || "percentage",
        discountValue: campaign.discountValue || 0,
        maxDiscount: campaign.maxDiscount || null,
        minPurchase: campaign.minPurchase || 0,
        startDate: campaign.startDate
          ? new Date(campaign.startDate).toISOString().slice(0, 16)
          : "",
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().slice(0, 16) : "",
        startTime: campaign.startTime || "",
        endTime: campaign.endTime || "",
        applicableTo: campaign.applicableTo || "all",
        maxUsageTotal: campaign.maxUsageTotal || null,
        maxUsagePerMember: campaign.maxUsagePerMember || null,
        priority: campaign.priority || 0,
        isCombinable: campaign.isCombinable || false,
        autoActivate: campaign.autoActivate || false
      });
      setRules(campaign.rules || []);
      setRewards(campaign.rewards || []);
      setApplicableIds((campaign.applicableIds || []).map(String));
      // ponytail: inisialisasi pilihan toko dari data campaign
      if (campaign.store) {
        setSelectedStores([campaign.store]);
        setAllStores(false);
      } else if (isSuperAdmin) {
        setSelectedStores([]);
        setAllStores(true);
      }
    }
  }, [campaign, form]);

  const updateMutation = useMutation((data) => updateCampaign(id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries(["promo-campaigns"]);
      queryClient.invalidateQueries(["promo-campaign", id]);
      navigate("/promo-list");
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const handleFormSubmit = (asDraft) => {
    const values = form.getValues();
    const missing = getMissingFields(
      values,
      schema,
      promoFieldLabels,
      ["specific_products", "specific_categories", "specific_members"].includes(
        values.applicableTo
      ) && applicableIds.length === 0
        ? [{ name: "applicableIds" }]
        : []
    );
    if (missing.length > 0) {
      setMissingFieldsList(missing);
      setMissingFieldsModal(true);
      return;
    }
    setPendingDraft(asDraft);
    setConfirmSaveModal(true);
  };

  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(false);

  const onSubmit = () => {
    const data = form.getValues();
    updateMutation.mutate({
      ...data,
      store: effectiveStore,
      applicableIds: ["specific_products", "specific_categories", "specific_members"].includes(
        data.applicableTo
      )
        ? applicableIds.map(Number)
        : null,
      rules,
      rewards,
      status: pendingDraft ? "draft" : "active"
    });
  };

  const addRule = () => {
    setRules([...rules, { ruleType: "time", condition: {}, priority: 0 }]);
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index, field, value) => {
    setRules(rules.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule)));
  };

  const addReward = () => {
    setRewards([
      ...rewards,
      { rewardType: "discount_percentage", rewardValue: 0, quantity: 1, priority: 0 }
    ]);
  };

  const removeReward = (index) => {
    setRewards(rewards.filter((_, i) => i !== index));
  };

  const updateReward = (index, field, value) => {
    setRewards(rewards.map((reward, i) => (i === index ? { ...reward, [field]: value } : reward)));
  };

  const watchedType = form.watch("type");
  const watchedDiscountType = form.watch("discountType");
  const watchedApplicableTo = form.watch("applicableTo");
  const watchedIsCombinable = form.watch("isCombinable");

  // ponytail: promo by store — tampil saat isCombinable aktif sebagai referensi kombinasi
  const { data: combinableData, isLoading: combinableLoading } = useQuery(
    ["promo-edit-combinable-list", effectiveStore],
    () =>
      getCampaigns({
        store: allStores ? undefined : effectiveStore || undefined,
        status: "active",
        limit: 50
      }),
    { enabled: !!watchedIsCombinable && (allStores || !!effectiveStore) }
  );
  const combinablePromos = (combinableData?.data || []).filter((p) => String(p.id) !== String(id));

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["promo-edit-product-options", effectiveStore],
    () => getAllProduct({ location: effectiveStore }),
    {
      enabled: watchedApplicableTo === "specific_products" && (allStores || !!effectiveStore)
    }
  );
  const products = productsData?.data?.items || productsData?.data || [];
  const productOptions = (Array.isArray(products) ? products : []).map((p) => ({
    value: String(p.id),
    label: p.nameProduct || `Produk #${p.id}`
  }));

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(
    ["promo-edit-category-options", effectiveStore],
    () => getAllCategoryActive({ location: effectiveStore }),
    { enabled: watchedApplicableTo === "specific_categories" && (allStores || !!effectiveStore) }
  );
  const categories = categoriesData?.data || categoriesData?.categories || [];
  const categoryOptions = (Array.isArray(categories) ? categories : []).map((c) => ({
    value: String(c.id),
    label: c.nameCategory || c.name || `Kategori #${c.id}`
  }));

  const { data: tiersData } = useQuery(["promo-edit-tier-options"], () => getAllMemberTier(), {
    enabled: watchedApplicableTo === "specific_members"
  });
  const tiers = tiersData?.data || [];
  const tierOptions = (Array.isArray(tiers) ? tiers : []).map((tr) => ({
    value: String(tr.id),
    label: tr.name || tr.nameTier || `Tier #${tr.id}`
  }));

  const isSpendGet = watchedType === "spend_get";
  const isBuyXGetY = watchedType === "buy_x_get_y";
  const isFreeItem = watchedDiscountType === "free_item";
  const isPercentage = watchedDiscountType === "percentage";
  const isHappyHour = watchedType === "happy_hour";
  const isBirthday = watchedType === "birthday";
  const isManual = watchedType === "manual";
  const showDiscountSettings = !isManual;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href:
              user?.roleType === "super_admin"
                ? "/dashboard-super-admin"
                : user?.roleType === "admin"
                  ? "/dashboard-admin"
                  : "/home",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.promo.list.title"),
            href: "/promo-list",
            i18nKey: "sidebar.promo"
          },
          {
            label: t("page.promo.edit.title"),
            i18nKey: "page.promo.edit.title"
          }
        ]}
        title={t("page.promo.edit.title")}
        description={t("page.promo.edit.description")}
        backLink="/promo-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-promo" mode="edit" />
        <Button variant="danger" onClick={requestLeave}>
          {t("common.cancel")}
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Toko — hanya super_admin, pola bundle */}
          {isSuperAdmin && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <SectionHeader
                icon={Megaphone}
                title={t("page.bundle.form.storeSection.title")}
                description={t("page.bundle.form.storeSection.desc")}
                gradient="from-indigo-600/90 to-indigo-700/90"
              />
              <div className="p-6">
                <StoreSelectCard
                  locations={locations}
                  selectedStores={selectedStores}
                  onChange={handleStoreChange}
                  isSuperAdmin={true}
                  user={{ store: null }}
                  t={t}
                  title={t("page.bundle.form.storeSection.title")}
                  description={t("page.bundle.form.storeSection.desc")}
                  noStoreLabel={t("page.bundle.form.storeSection.noStore")}
                  addStoreLabel={t("page.bundle.form.storeSection.addStore")}
                  storeInfoLabel={t("page.bundle.form.storeInfo")}
                  allStores={allStores}
                  onAllStoresChange={handleAllStoresChange}
                  navigate={navigate}
                  mandatory={true}
                  locationsLoading={locsLoading || locsFetching}
                />
              </div>
            </div>
          )}

          {/* Form utama — tab, pola /add-supplier */}
          <div className="bg-card rounded-xl border border-border overflow-hidden p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* ponytail: tab scroll horizontal di layar sempit */}
              <div className="overflow-x-auto -mx-1 px-1 mb-4">
                <TabsList className="grid w-full grid-cols-6 min-w-[640px]">
                  <TabsTrigger value="general" className="gap-1.5">
                    <Megaphone size={14} />
                    {t("page.promo.form.basicInfo")}
                  </TabsTrigger>
                  <TabsTrigger value="discount" className="gap-1.5">
                    <Percent size={14} />
                    {t("page.promo.form.discountSettings")}
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="gap-1.5">
                    <CalendarClock size={14} />
                    {t("page.promo.form.schedule")}
                  </TabsTrigger>
                  <TabsTrigger value="targeting" className="gap-1.5">
                    <SlidersHorizontal size={14} />
                    Target
                  </TabsTrigger>
                  <TabsTrigger value="rules" className="gap-1.5">
                    <ListChecks size={14} />
                    {t("page.promo.form.rules")}
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="gap-1.5">
                    <Gift size={14} />
                    {t("page.promo.form.rewards")}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="general" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.name")} <span className="text-destructive">*</span>
                    </label>
                    <Input
                      unstyled
                      {...form.register("name")}
                      className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                      placeholder={t("page.promo.form.namePlaceholder")}
                      maxLength={FIELD_LIMITS.BUSINESS_NAME}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.description")}
                    </label>
                    <Textarea
                      unstyled
                      {...form.register("description")}
                      className="mt-1 w-full h-20 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none resize-none"
                      placeholder={t("page.promo.form.descriptionPlaceholder")}
                      maxLength={FIELD_LIMITS.DESCRIPTION}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.code")}
                    </label>
                    <Input
                      unstyled
                      {...form.register("code")}
                      className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none uppercase"
                      placeholder={t("page.promo.form.codePlaceholder")}
                      maxLength={FIELD_LIMITS.CODE}
                    />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.type")} <span className="text-destructive">*</span>
                    </label>
                    <Combobox
                      options={[
                        { value: "happy_hour", label: "Happy Hour" },
                        { value: "birthday", label: "Birthday" },
                        { value: "buy_x_get_y", label: "Buy X Get Y" },
                        { value: "spend_get", label: "Spend & Get" },
                        { value: "manual", label: "Manual" },
                        { value: "automatic", label: "Automatic" }
                      ]}
                      value={form.watch("type")}
                      onChange={(v) => form.setValue("type", v)}
                      placeholder={t("page.promo.form.typePlaceholder") || "Pilih tipe campaign"}
                      searchPlaceholder="Cari tipe..."
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="discount" className="mt-0 space-y-4">
                {showDiscountSettings ? (
                  <div className="space-y-4">
                    {isBirthday && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Tipe birthday menggunakan diskon otomatis sesuai rewards
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          {t("page.promo.form.discountType")}
                        </label>
                        <Combobox
                          options={[
                            { value: "percentage", label: "Percentage" },
                            { value: "fixed", label: "Fixed Amount" },
                            { value: "free_item", label: "Free Item" }
                          ]}
                          value={form.watch("discountType")}
                          onChange={(v) => form.setValue("discountType", v)}
                          disabled={isBirthday}
                          placeholder="Pilih tipe diskon"
                          searchPlaceholder="Cari tipe diskon..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          {t("page.promo.form.discountValue")}
                        </label>
                        <input
                          type="number"
                          {...form.register("discountValue", { valueAsNumber: true })}
                          disabled={isFreeItem || isBirthday}
                          className={`mt-1 w-full h-10 px-3 border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none ${
                            isFreeItem || isBirthday
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "bg-background"
                          }`}
                          placeholder={isFreeItem || isBirthday ? "N/A" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          {t("page.promo.form.maxDiscount")}
                        </label>
                        <input
                          type="number"
                          {...form.register("maxDiscount", { valueAsNumber: true })}
                          disabled={!isPercentage}
                          className={`mt-1 w-full h-10 px-3 border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none ${
                            !isPercentage
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "bg-background"
                          }`}
                          placeholder={!isPercentage ? "N/A" : ""}
                        />
                        {!isPercentage && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Hanya berlaku untuk tipe Percentage
                          </p>
                        )}
                        <FormDescription>{t("common.optionalField")}</FormDescription>
                      </div>
                      {(isSpendGet || isBuyXGetY) && (
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            {t("page.promo.form.minPurchase")}
                          </label>
                          <input
                            type="number"
                            {...form.register("minPurchase", { valueAsNumber: true })}
                            className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tipe campaign Manual tidak memerlukan pengaturan diskon.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="schedule" className="mt-0 space-y-4">
                {isHappyHour && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Atur jam mulai dan akhir untuk periode Happy Hour
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.startDate")} <span className="text-destructive">*</span>
                    </label>
                    <DateInput
                      type="datetime-local"
                      {...form.register("startDate")}
                      className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.endDate")} <span className="text-destructive">*</span>
                    </label>
                    <DateInput
                      type="datetime-local"
                      {...form.register("endDate")}
                      className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                    />
                  </div>
                  {isHappyHour && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          {t("page.promo.form.startTime")}
                        </label>
                        <input
                          type="time"
                          {...form.register("startTime")}
                          className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          {t("page.promo.form.endTime")}
                        </label>
                        <input
                          type="time"
                          {...form.register("endTime")}
                          className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rules" className="mt-0 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{t("page.promo.form.rules")}</h3>
                    {isHappyHour && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Aturan waktu sudah ditentukan dari jadwal Happy Hour
                      </p>
                    )}
                    {isBirthday && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Otomas birthday akan aktif otomatis untuk member yang berulang tahun
                      </p>
                    )}
                    {isBuyXGetY && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tambahkan aturan untuk menentukan produk X dan produk Y
                      </p>
                    )}
                    {isSpendGet && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tambahkan aturan untuk menentukan threshold belanja
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="success" size="sm" onClick={addRule}>
                    <Plus size={14} className="mr-1" />
                    {t("page.promo.form.addRule")}
                  </Button>
                </div>
                {rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("page.promo.form.noRules")}</p>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                        <Combobox
                          options={[
                            { value: "time", label: "Time" },
                            { value: "birthday", label: "Birthday" },
                            { value: "buy_x_get_y", label: "Buy X Get Y" },
                            { value: "spend_threshold", label: "Spend Threshold" },
                            { value: "member_tier", label: "Member Tier" },
                            { value: "first_purchase", label: "First Purchase" }
                          ]}
                          value={rule.ruleType}
                          onChange={(v) => updateRule(index, "ruleType", v)}
                          placeholder="Pilih rule"
                          searchPlaceholder="Cari rule..."
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => setDeleteConfirm({ type: "rule", index })}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rewards" className="mt-0 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t("page.promo.form.rewards")}
                    </h3>
                    {isBirthday && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tambahkan reward yang akan diberikan di hari ulang tahun member
                      </p>
                    )}
                    {isFreeItem && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tipe free item, tambahkan produk yang akan diberikan sebagai reward
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="success" size="sm" onClick={addReward}>
                    <Plus size={14} className="mr-1" />
                    {t("page.promo.form.addReward")}
                  </Button>
                </div>
                {rewards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("page.promo.form.noRewards")}</p>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((reward, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                        <Combobox
                          options={[
                            { value: "discount_percentage", label: "Discount %" },
                            { value: "discount_fixed", label: "Discount Fixed" },
                            { value: "free_item", label: "Free Item" },
                            { value: "buy_x_get_y", label: "Buy X Get Y" },
                            { value: "points_multiplier", label: "Points Multiplier" },
                            { value: "cashback", label: "Cashback" }
                          ]}
                          value={reward.rewardType}
                          onChange={(v) => updateReward(index, "rewardType", v)}
                          placeholder="Pilih reward"
                          searchPlaceholder="Cari reward..."
                        />
                        <input
                          type="number"
                          value={reward.rewardValue}
                          onChange={(e) =>
                            updateReward(index, "rewardValue", parseInt(e.target.value) || 0)
                          }
                          className="h-8 w-24 px-2 bg-background border border-input rounded text-sm"
                          placeholder="Value"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => setDeleteConfirm({ type: "reward", index })}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="targeting" className="mt-0 space-y-6">
                {/* Penempatan & Batas */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.applicableTo")}
                    </label>
                    <Combobox
                      options={[
                        { value: "all", label: "All Products" },
                        { value: "specific_products", label: "Specific Products" },
                        { value: "specific_categories", label: "Specific Categories" },
                        { value: "specific_members", label: "Specific Members" }
                      ]}
                      value={form.watch("applicableTo")}
                      onChange={(v) => {
                        setApplicableIds([]);
                        form.setValue("applicableTo", v);
                      }}
                      disabled={!storeReady}
                      placeholder={
                        !storeReady ? t("page.bom.add.form.selectStoreFirst") : "Pilih penerapan"
                      }
                      searchPlaceholder="Cari penerapan..."
                    />
                    {!storeReady && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.bundle.form.storeSection.desc")}
                      </p>
                    )}
                  </div>
                  {watchedApplicableTo === "specific_products" &&
                    (storeReady ? (
                      <IdsMultiSelect
                        options={productOptions}
                        value={applicableIds}
                        loading={productsLoading}
                        onChange={setApplicableIds}
                        placeholder="Pilih produk..."
                        selectedLabel="produk dipilih"
                        searchPlaceholder="Cari produk..."
                        emptyMessage="Produk tidak ditemukan"
                      />
                    ) : null)}
                  {watchedApplicableTo === "specific_categories" &&
                    (storeReady ? (
                      <IdsMultiSelect
                        options={categoryOptions}
                        value={applicableIds}
                        loading={categoriesLoading}
                        onChange={setApplicableIds}
                        placeholder="Pilih kategori..."
                        selectedLabel="kategori dipilih"
                        searchPlaceholder="Cari kategori..."
                        emptyMessage="Kategori tidak ditemukan"
                      />
                    ) : null)}
                  {watchedApplicableTo === "specific_members" && (
                    <IdsMultiSelect
                      options={tierOptions}
                      value={applicableIds}
                      onChange={setApplicableIds}
                      placeholder="Pilih tier member..."
                      selectedLabel="tier dipilih"
                      searchPlaceholder="Cari tier..."
                      emptyMessage="Tier tidak ditemukan"
                    />
                  )}
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.maxUsageTotal")}
                    </label>
                    <input
                      type="number"
                      {...form.register("maxUsageTotal", { valueAsNumber: true })}
                      className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                      placeholder="Unlimited"
                    />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.maxUsagePerMember")}
                    </label>
                    <input
                      type="number"
                      {...form.register("maxUsagePerMember", { valueAsNumber: true })}
                      className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                      placeholder="Unlimited"
                    />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {t("page.promo.form.priority")}
                    </label>
                    <input
                      type="number"
                      {...form.register("priority", { valueAsNumber: true })}
                      className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                    />
                  </div>
                </div>

                {/* Status Kampanye */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {form.watch("autoActivate") ? "Aktif Otomatis" : "Nonaktif"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Aktifkan langsung saat tanggal mulai tercapai
                      </p>
                    </div>
                    <Switch
                      checked={!!form.watch("autoActivate")}
                      onCheckedChange={(v) => form.setValue("autoActivate", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t("page.promo.form.isCombinable")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Boleh digabung dengan diskon/kampanye lain
                      </p>
                    </div>
                    <Switch
                      checked={!!form.watch("isCombinable")}
                      onCheckedChange={(v) => form.setValue("isCombinable", v)}
                    />
                  </div>
                  {!!watchedIsCombinable && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <p className="text-xs font-medium text-foreground">
                        Promo Aktif — {allStores ? t("header.allStore") : "Toko Terpilih"}
                      </p>
                      {combinableLoading ? (
                        <p className="text-xs text-muted-foreground">Memuat promo...</p>
                      ) : combinablePromos.length === 0 ? (
                        <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30 text-center">
                          <p className="text-xs text-muted-foreground">
                            Belum ada promo aktif di toko ini
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {combinablePromos.map((promo) => (
                            <div
                              key={promo.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                              <span className="text-xs font-medium text-foreground truncate">
                                {promo.name}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                                {CAMPAIGN_TYPE_LABELS[promo.type] || promo.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Tips */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                {t("page.promo.form.tipsTitle")}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">{t("page.promo.form.tipsContent")}</p>
          </div>

          {/* Action bar — pola /add-discount */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
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
                onClick={() => handleFormSubmit(true)}
                disabled={updateMutation?.isLoading}>
                {t("page.discount.add.saveAsDraft")}
              </Button>
              <Button
                variant="success"
                type="button"
                onClick={() => handleFormSubmit(false)}
                disabled={updateMutation?.isLoading}
                className="gap-2 w-full sm:w-auto justify-center">
                <Save size={18} />
                {updateMutation?.isLoading ? t("button.saving") : t("button.save")}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <Modal
        type="confirm"
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="confirm"
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
        title={t("modal.deleteTitle")}
        description={t("modal.deleteConfirm")}
        confirmText={t("modal.yesDelete")}
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === "rule") removeRule(deleteConfirm.index);
          else removeReward(deleteConfirm.index);
          setDeleteConfirm(null);
        }}
      />
      <Modal
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title={pendingDraft ? t("page.promo.modal.draftTitle") : t("common.confirmSave")}
        description={
          pendingDraft ? t("page.promo.modal.draftDescription") : t("common.confirmSaveDesc")
        }
        confirmText={pendingDraft ? t("common.yes") : t("common.yesSave")}
        cancelText={t("common.no")}
        loading={updateMutation?.isLoading}
        onConfirm={() => {
          onSubmit();
        }}
      />
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFieldsList}
      />
      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />
    </div>
  );
};

export default EditPromoCampaign;

// ponytail: multi-select id (produk/kategori) — pola ProductMultiSelect /add-discount
function IdsMultiSelect({
  options,
  value,
  onChange,
  loading = false,
  placeholder,
  selectedLabel,
  searchPlaceholder,
  emptyMessage
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const selectedOptions = options.filter((o) => value.includes(o.value));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className="w-full justify-between font-normal h-10 bg-background">
            <span className="truncate text-muted-foreground">
              {loading
                ? "Memuat..."
                : value.length > 0
                  ? `${value.length} ${selectedLabel}`
                  : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const isSelected = value.includes(opt.value);
                  return (
                    <CommandItem key={opt.value} onSelect={() => toggle(opt.value)}>
                      <Check
                        className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
              {opt.label}
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                className="hover:text-destructive">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

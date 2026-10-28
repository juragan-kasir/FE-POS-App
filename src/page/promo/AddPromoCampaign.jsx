import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
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
  ListChecks,
  Gift,
  SlidersHorizontal
} from "lucide-react";
import { createCampaign, getCampaigns } from "@/services/promo";
import { getAllProduct } from "@/services/product";
import { getAllCategoryActive } from "@/services/category";
import { getAllMemberTier } from "@/services/member-tier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Form, FormDescription } from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
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

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const CAMPAIGN_TYPE_LABELS = {
  happy_hour: "Happy Hour",
  birthday: "Birthday",
  buy_x_get_y: "Buy X Get Y",
  spend_get: "Spend & Get",
  manual: "Manual",
  automatic: "Automatic"
};

const AddPromoCampaign = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  // ponytail: konfirmasi hapus rule/reward — { type: "rule"|"reward", index }
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [rules, setRules] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [daysOfWeek, setDaysOfWeek] = useState([]);

  // ponytail: super_admin pilih toko dulu — produk & payload mengikuti store ini
  const isSuperAdmin = user?.roleType === "super_admin";
  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const effectiveStore = allStores ? null : selectedStores[0] || cookie?.activeStore || null;
  // ponytail: Berlaku Untuk terbuka begitu user memutuskan scope toko (Semua Toko ATAU per-toko)
  const storeReady = !isSuperAdmin || allStores || selectedStores.length > 0;

  // ponytail: Berlaku Untuk spesifik — produk/kategori diambil per toko terpilih
  const [applicableIds, setApplicableIds] = useState([]);

  // ponytail: tanggal/jam pakai picker seperti form bundle — disinkronkan ke RHF
  const [startDateD, setStartDateD] = useState(null);
  const [startTimeT, setStartTimeT] = useState("00:00");
  const [endDateD, setEndDateD] = useState(null);
  const [endTimeT, setEndTimeT] = useState("23:59");

  const combineDateTime = (date, time) => {
    if (!date) return null;
    const d = new Date(date);
    const [hours, minutes] = (time || "00:00").split(":");
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  };

  const formatIDR = (num) => {
    if (!num && num !== 0) return "";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };

  const parseIDR = (str) => {
    if (!str) return 0;
    return Number(str.replace(/[^0-9]/g, "")) || 0;
  };

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

  const createMutation = useMutation(createCampaign, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      // ponytail: cukup success modal, tanpa toast — pola bundle
      queryClient.invalidateQueries(["promo-campaigns"]);
      setSuccessModal(true);
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

  const onSubmit = () => {
    const data = form.getValues();
    createMutation.mutate({
      ...data,
      store: effectiveStore,
      applicableIds: ["specific_products", "specific_categories", "specific_members"].includes(
        data.applicableTo
      )
        ? applicableIds.map(Number)
        : null,
      daysOfWeek,
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

  // ponytail: condition default per tipe rule — tanpa ini rule buy_x_get_y /
  // spend_threshold tidak berguna karena BE membaca rule.condition JSONB
  const updateRule = (index, field, value) => {
    setRules(
      rules.map((rule, i) => {
        if (i !== index) return rule;
        if (field === "ruleType") {
          let defaultCondition = {};
          if (value === "buy_x_get_y") {
            defaultCondition = { productIdX: null, qtyX: 1, productIdY: null, qtyY: 1 };
          } else if (value === "spend_threshold") {
            defaultCondition = { minAmount: 0 };
          } else if (value === "member_tier") {
            defaultCondition = { tierId: null };
          } else {
            defaultCondition = {};
          }
          return { ...rule, ruleType: value, condition: defaultCondition };
        }
        if (field.startsWith("condition.")) {
          const key = field.split(".")[1];
          return {
            ...rule,
            condition: { ...rule.condition, [key]: value }
          };
        }
        return { ...rule, [field]: value };
      })
    );
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
  const watchedDiscountValue = form.watch("discountValue");
  const watchedMaxDiscount = form.watch("maxDiscount");
  const watchedMinPurchase = form.watch("minPurchase");
  const watchedIsCombinable = form.watch("isCombinable");

  const isHappyHour = watchedType === "happy_hour";
  const isSpendGet = watchedType === "spend_get";
  const isBuyXGetY = watchedType === "buy_x_get_y";
  const isFreeItem = watchedDiscountType === "free_item";
  const isPercentage = watchedDiscountType === "percentage";
  const isBirthday = watchedType === "birthday";
  const isManual = watchedType === "manual";
  const showDiscountSettings = !isManual;

  useEffect(() => {
    setRules([]);
    setRewards([]);
    if (!isPercentage) form.setValue("maxDiscount", null);
    if (isFreeItem || isBirthday) form.setValue("discountValue", 0);
  }, [watchedType, watchedDiscountType]);

  const needsProducts =
    rules.some((r) => r.ruleType === "buy_x_get_y") ||
    rewards.some((r) => ["free_item", "buy_x_get_y"].includes(r.rewardType));
  const needsTiers = rules.some((r) => r.ruleType === "member_tier");

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

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["promo-product-options", effectiveStore],
    () => getAllProduct({ location: effectiveStore }),
    {
      enabled:
        (needsProducts || watchedApplicableTo === "specific_products") &&
        (allStores || !!effectiveStore)
    }
  );
  const products = productsData?.data?.items || productsData?.data || [];
  const productOptions = (Array.isArray(products) ? products : []).map((p) => ({
    value: String(p.id),
    label: p.nameProduct || `Produk #${p.id}`
  }));

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(
    ["promo-category-options", effectiveStore],
    () => getAllCategoryActive({ location: effectiveStore }),
    { enabled: watchedApplicableTo === "specific_categories" && (allStores || !!effectiveStore) }
  );
  const categories = categoriesData?.data || categoriesData?.categories || [];
  const categoryOptions = (Array.isArray(categories) ? categories : []).map((c) => ({
    value: String(c.id),
    label: c.nameCategory || c.name || `Kategori #${c.id}`
  }));

  const { data: tiersData } = useQuery(["promo-tier-options"], () => getAllMemberTier(), {
    enabled: needsTiers || watchedApplicableTo === "specific_members"
  });
  const tiers = tiersData?.data || [];
  const tierOptions = (Array.isArray(tiers) ? tiers : []).map((tr) => ({
    value: String(tr.id),
    label: tr.name || tr.nameTier || `Tier #${tr.id}`
  }));

  // ponytail: promo by store — tampil saat isCombinable aktif sebagai referensi kombinasi
  const { data: combinableData, isLoading: combinableLoading } = useQuery(
    ["promo-combinable-list", effectiveStore],
    () =>
      getCampaigns({
        store: allStores ? undefined : effectiveStore || undefined,
        status: "active",
        limit: 50
      }),
    { enabled: !!watchedIsCombinable && (allStores || !!effectiveStore) }
  );
  const combinablePromos = combinableData?.data || [];

  const toggleDay = (day) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day).sort() : [...prev, day].sort()
    );
  };

  const moneyInputCls = "h-10 text-right";

  return (
    <div className="space-y-6 pb-4">
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
            label: t("page.promo.add.title"),
            i18nKey: "page.promo.add.title"
          }
        ]}
        title={t("page.promo.add.title")}
        description={t("page.promo.add.description")}
        backLink="/promo-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-promo" />
        <Button variant="outline" onClick={requestLeave}>
          {t("action.back")}
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
                    {t("page.dashboardSuperAdmin.store.col.target")}
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
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="add-promo-campaign-name">
                      {t("page.promo.form.name")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="add-promo-campaign-name"
                      {...form.register("name")}
                      placeholder={t("page.promo.form.namePlaceholder")}
                      maxLength={FIELD_LIMITS.BUSINESS_NAME}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="add-promo-campaign-description">
                      {t("page.promo.form.description")}
                    </Label>
                    <Textarea
                      id="add-promo-campaign-description"
                      {...form.register("description")}
                      rows={3}
                      placeholder={t("page.promo.form.descriptionPlaceholder")}
                      maxLength={FIELD_LIMITS.DESCRIPTION}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-promo-campaign-code">{t("page.promo.form.code")}</Label>
                    <Input
                      id="add-promo-campaign-code"
                      {...form.register("code")}
                      className="uppercase"
                      placeholder={t("page.promo.form.codePlaceholder")}
                      maxLength={FIELD_LIMITS.CODE}
                    />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-promo-campaign-type">
                      {t("page.promo.form.type")} <span className="text-destructive">*</span>
                    </Label>
                    <Combobox
                      id="add-promo-campaign-type"
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

              <TabsContent value="discount" className="mt-0">
                {showDiscountSettings ? (
                  <div className="space-y-4">
                    {isBirthday && (
                      <p className="text-xs text-muted-foreground">
                        {t("page.promo.ui.theBirthdayTypeAppliesAn")}
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-promo-campaign-discount-type">
                          {t("page.promo.form.discountType")}
                        </Label>
                        <Combobox
                          id="add-promo-campaign-discount-type"
                          options={[
                            { value: "percentage", label: "Percentage" },
                            { value: "fixed", label: "Fixed Amount" },
                            { value: "free_item", label: "Free Item" }
                          ]}
                          value={form.watch("discountType")}
                          onChange={(v) => form.setValue("discountType", v)}
                          disabled={isBirthday}
                          placeholder={t("page.discount.form.typePlaceholder")}
                          searchPlaceholder="Cari tipe diskon..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("page.promo.form.discountValue")}</Label>
                        {isFreeItem || isBirthday ? (
                          <Input disabled value="N/A" className={`${moneyInputCls} bg-muted`} />
                        ) : isPercentage ? (
                          <div className="relative">
                            <Input
                              type="number"
                              value={watchedDiscountValue ?? ""}
                              onChange={(e) =>
                                form.setValue("discountValue", Number(e.target.value) || 0)
                              }
                              className={moneyInputCls}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              %
                            </span>
                          </div>
                        ) : (
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={watchedDiscountValue ? formatIDR(watchedDiscountValue) : ""}
                            onChange={(e) =>
                              form.setValue("discountValue", parseIDR(e.target.value))
                            }
                            placeholder="Rp 0"
                            className={moneyInputCls}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-promo-campaign-max-discount">
                          {t("page.promo.form.maxDiscount")}
                        </Label>
                        <Input
                          id="add-promo-campaign-max-discount"
                          type="text"
                          inputMode="numeric"
                          disabled={!isPercentage}
                          value={
                            !isPercentage
                              ? "N/A"
                              : watchedMaxDiscount
                                ? formatIDR(watchedMaxDiscount)
                                : ""
                          }
                          onChange={(e) =>
                            isPercentage && form.setValue("maxDiscount", parseIDR(e.target.value))
                          }
                          placeholder={!isPercentage ? "N/A" : "Rp 0"}
                          className={`${moneyInputCls} ${!isPercentage ? "bg-muted cursor-not-allowed" : ""}`}
                        />
                        {!isPercentage && (
                          <p className="text-xs text-muted-foreground">
                            {t("page.promo.ui.onlyAppliesToThePercentage")}
                          </p>
                        )}
                        <FormDescription>{t("common.optionalField")}</FormDescription>
                      </div>
                      {(isSpendGet || isBuyXGetY) && (
                        <div className="space-y-2">
                          <Label htmlFor="add-promo-campaign-min-purchase">
                            {t("page.promo.form.minPurchase")}
                          </Label>
                          <Input
                            id="add-promo-campaign-min-purchase"
                            type="text"
                            inputMode="numeric"
                            value={watchedMinPurchase ? formatIDR(watchedMinPurchase) : ""}
                            onChange={(e) => form.setValue("minPurchase", parseIDR(e.target.value))}
                            placeholder="Rp 0"
                            className={moneyInputCls}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("page.promo.ui.aManualCampaignNeedsNo")}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="schedule" className="mt-0 space-y-4">
                {isHappyHour && (
                  <p className="text-xs text-muted-foreground">
                    {t("page.promo.ui.setTheStartAndEnd")}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label>
                      {t("page.promo.form.startDate")} <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      date={startDateD}
                      setDate={(d) => {
                        setStartDateD(d);
                        form.setValue(
                          "startDate",
                          combineDateTime(d, startTimeT)?.toISOString() || ""
                        );
                      }}
                      placeholder={t("page.promo.form.startDate")}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <TimePicker
                      value={startTimeT}
                      onChange={(v) => {
                        setStartTimeT(v);
                        if (startDateD)
                          form.setValue(
                            "startDate",
                            combineDateTime(startDateD, v)?.toISOString() || ""
                          );
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>
                      {t("page.promo.form.endDate")} <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      date={endDateD}
                      setDate={(d) => {
                        setEndDateD(d);
                        form.setValue("endDate", combineDateTime(d, endTimeT)?.toISOString() || "");
                      }}
                      minDate={startDateD || undefined}
                      disabled={!startDateD}
                      placeholder={
                        !startDateD
                          ? t("page.bundle.form.validFromFirst")
                          : t("page.promo.form.endDate")
                      }
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <TimePicker
                      value={endTimeT}
                      onChange={(v) => {
                        setEndTimeT(v);
                        if (endDateD)
                          form.setValue(
                            "endDate",
                            combineDateTime(endDateD, v)?.toISOString() || ""
                          );
                      }}
                      disabled={!startDateD}
                    />
                  </div>
                  {isHappyHour && (
                    <>
                      <div className="space-y-2">
                        <Label>{t("page.promo.form.startTime")}</Label>
                        <TimePicker
                          value={form.watch("startTime") || "15:00"}
                          onChange={(v) => form.setValue("startTime", v)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("page.promo.form.endTime")}</Label>
                        <TimePicker
                          value={form.watch("endTime") || "17:00"}
                          onChange={(v) => form.setValue("endTime", v)}
                        />
                      </div>
                    </>
                  )}
                </div>
                {isHappyHour && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="text-xs">{t("page.promo.ui.activeDays")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAY_LABELS.map((label, day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            daysOfWeek.includes(day)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("page.promo.ui.leaveEmptyToApplyEvery")}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rules" className="mt-0 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {isBuyXGetY
                      ? "Tentukan produk X (yang dibeli) dan produk Y (bonusnya)"
                      : isSpendGet
                        ? "Atur minimal belanja untuk memicu kampanye"
                        : isHappyHour
                          ? "Aturan waktu sudah ditentukan dari jadwal Happy Hour"
                          : isBirthday
                            ? "Kampanye birthday aktif otomatis untuk member yang berulang tahun"
                            : "Tambahkan aturan bila diperlukan"}
                  </p>
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
                        className="p-3 bg-background rounded-lg border border-border space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Combobox
                              options={[
                                { value: "time", label: "Waktu" },
                                { value: "birthday", label: "Birthday" },
                                { value: "buy_x_get_y", label: "Buy X Get Y" },
                                { value: "spend_threshold", label: "Minimal Belanja" },
                                { value: "member_tier", label: "Tier Member" },
                                { value: "first_purchase", label: "Pembelian Pertama" }
                              ]}
                              value={rule.ruleType}
                              onChange={(v) => updateRule(index, "ruleType", v)}
                              placeholder={t("page.promo.ui.selectRule")}
                              searchPlaceholder="Cari rule..."
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm({ type: "rule", index })}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        {rule.ruleType === "buy_x_get_y" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">{t("page.promo.ui.productX")}</Label>
                              <Combobox
                                options={productOptions}
                                value={
                                  rule.condition.productIdX ? String(rule.condition.productIdX) : ""
                                }
                                onChange={(v) =>
                                  updateRule(index, "condition.productIdX", Number(v))
                                }
                                placeholder={t("page.promo.ui.selectProductX")}
                                searchPlaceholder="Cari produk..."
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("page.promo.ui.productYBonus")}</Label>
                              <Combobox
                                options={productOptions}
                                value={
                                  rule.condition.productIdY ? String(rule.condition.productIdY) : ""
                                }
                                onChange={(v) =>
                                  updateRule(index, "condition.productIdY", Number(v))
                                }
                                placeholder={t("page.promo.ui.selectBonusProduct")}
                                searchPlaceholder="Cari produk..."
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("page.promo.ui.buyQtyX")}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={rule.condition.qtyX ?? 1}
                                onChange={(e) =>
                                  updateRule(index, "condition.qtyX", parseInt(e.target.value) || 1)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("page.promo.ui.bonusQtyY")}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={rule.condition.qtyY ?? 1}
                                onChange={(e) =>
                                  updateRule(index, "condition.qtyY", parseInt(e.target.value) || 1)
                                }
                              />
                            </div>
                          </div>
                        )}
                        {rule.ruleType === "spend_threshold" && (
                          <div className="space-y-1">
                            <Label className="text-xs">{t("page.discount.form.minPurchase")}</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={
                                rule.condition.minAmount ? formatIDR(rule.condition.minAmount) : ""
                              }
                              onChange={(e) =>
                                updateRule(index, "condition.minAmount", parseIDR(e.target.value))
                              }
                              placeholder="Rp 0"
                              className={moneyInputCls}
                            />
                          </div>
                        )}
                        {rule.ruleType === "member_tier" && (
                          <div className="space-y-1">
                            <Label className="text-xs">{t("guide.tier.s25a")}</Label>
                            <Combobox
                              options={tierOptions}
                              value={rule.condition.tierId ? String(rule.condition.tierId) : ""}
                              onChange={(v) => updateRule(index, "condition.tierId", Number(v))}
                              placeholder={t("page.promo.ui.selectTier")}
                              searchPlaceholder="Cari tier..."
                            />
                          </div>
                        )}
                        {["time", "birthday", "first_purchase"].includes(rule.ruleType) && (
                          <p className="text-xs text-muted-foreground">
                            {t("page.promo.ui.thisRuleNeedsNoAdditional")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rewards" className="mt-0 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {isFreeItem
                      ? "Tipe free item, pilih produk yang akan diberikan sebagai reward"
                      : isBirthday
                        ? "Reward akan diberikan di hari ulang tahun member"
                        : "Tentukan reward yang diberikan saat kampanye terpicu"}
                  </p>
                  <Button type="button" variant="success" size="sm" onClick={addReward}>
                    <Plus size={14} className="mr-1" />
                    {t("page.promo.form.addReward")}
                  </Button>
                </div>
                {rewards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("page.promo.form.noRewards")}</p>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((reward, index) => {
                      const needProduct = ["free_item", "buy_x_get_y"].includes(reward.rewardType);
                      const isPercent = reward.rewardType === "discount_percentage";
                      return (
                        <div
                          key={index}
                          className="p-3 bg-background rounded-lg border border-border space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div className="space-y-1 sm:col-span-5">
                              <Label className="text-xs">{t("page.promo.ui.rewardType")}</Label>
                              <Combobox
                                options={[
                                  { value: "discount_percentage", label: "Diskon %" },
                                  { value: "discount_fixed", label: "Diskon Nominal" },
                                  { value: "free_item", label: "Produk Gratis" },
                                  { value: "buy_x_get_y", label: "Buy X Get Y" },
                                  { value: "points_multiplier", label: "Kelipatan Poin" },
                                  { value: "cashback", label: "Cashback" }
                                ]}
                                value={reward.rewardType}
                                onChange={(v) => updateReward(index, "rewardType", v)}
                                placeholder={t("page.promo.ui.selectReward")}
                                searchPlaceholder="Cari reward..."
                              />
                            </div>
                            {!needProduct && (
                              <div className="space-y-1 sm:col-span-4">
                                <Label className="text-xs">
                                  {isPercent ? "Nilai (%)" : "Nilai"}
                                </Label>
                                {reward.rewardType === "points_multiplier" ? (
                                  <Input
                                    type="number"
                                    min="1"
                                    value={reward.rewardValue ?? 1}
                                    onChange={(e) =>
                                      updateReward(
                                        index,
                                        "rewardValue",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                  />
                                ) : isPercent ? (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      value={reward.rewardValue ?? 0}
                                      onChange={(e) =>
                                        updateReward(
                                          index,
                                          "rewardValue",
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="text-right pr-7"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                      %
                                    </span>
                                  </div>
                                ) : (
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={reward.rewardValue ? formatIDR(reward.rewardValue) : ""}
                                    onChange={(e) =>
                                      updateReward(index, "rewardValue", parseIDR(e.target.value))
                                    }
                                    placeholder="Rp 0"
                                    className="text-right"
                                  />
                                )}
                              </div>
                            )}
                            {needProduct && (
                              <div className="space-y-1 sm:col-span-7">
                                <Label className="text-xs">{t("page.promo.ui.freeProduct")}</Label>
                                <Combobox
                                  options={productOptions}
                                  value={reward.productId ? String(reward.productId) : ""}
                                  onChange={(v) => updateReward(index, "productId", Number(v))}
                                  placeholder={t("page.promo.ui.selectFreeProduct")}
                                  searchPlaceholder="Cari produk..."
                                />
                              </div>
                            )}
                            <div className="space-y-1 sm:col-span-3">
                              <Label className="text-xs">{t("document.qty")}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={reward.quantity ?? 1}
                                onChange={(e) =>
                                  updateReward(index, "quantity", parseInt(e.target.value) || 1)
                                }
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm({ type: "reward", index })}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="targeting" className="mt-0 space-y-6">
                {/* Penempatan & Batas */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-promo-campaign-applicable-to">
                      {t("page.promo.form.applicableTo")}
                    </Label>
                    <Combobox
                      id="add-promo-campaign-applicable-to"
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
                      <p className="text-xs text-muted-foreground">
                        {t("page.bundle.form.storeSection.desc")}
                      </p>
                    )}
                  </div>
                  {["specific_products", "specific_categories", "specific_members"].includes(
                    watchedApplicableTo
                  ) &&
                    storeReady && (
                      <div className="p-3 bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg">
                        {watchedApplicableTo === "specific_products" && (
                          <IdsMultiSelect
                            options={productOptions}
                            value={applicableIds}
                            loading={productsLoading}
                            onChange={setApplicableIds}
                            placeholder={t("page.discount.form.selectProduct")}
                            selectedLabel="produk dipilih"
                            searchPlaceholder="Cari produk..."
                            emptyMessage={t("page.cashier.noProducts")}
                          />
                        )}
                        {watchedApplicableTo === "specific_categories" && (
                          <IdsMultiSelect
                            options={categoryOptions}
                            value={applicableIds}
                            loading={categoriesLoading}
                            onChange={setApplicableIds}
                            placeholder={t("page.promo.ui.selectCategory")}
                            selectedLabel="kategori dipilih"
                            searchPlaceholder="Cari kategori..."
                            emptyMessage={t("page.category.notFound")}
                          />
                        )}
                        {watchedApplicableTo === "specific_members" && (
                          <IdsMultiSelect
                            options={tierOptions}
                            value={applicableIds}
                            onChange={setApplicableIds}
                            placeholder={t("page.promo.ui.selectMemberTier")}
                            selectedLabel="tier dipilih"
                            searchPlaceholder="Cari tier..."
                            emptyMessage={t("page.promo.ui.tierNotFound")}
                          />
                        )}
                      </div>
                    )}
                  <div className="space-y-2">
                    <Label htmlFor="add-promo-campaign-max-usage-total">
                      {t("page.promo.form.maxUsageTotal")}
                    </Label>
                    <Input
                      id="add-promo-campaign-max-usage-total"
                      type="number"
                      {...form.register("maxUsageTotal", { valueAsNumber: true })}
                      placeholder={t("common.unlimited")}
                    />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-promo-campaign-max-usage-per-member">
                      {t("page.promo.form.maxUsagePerMember")}
                    </Label>
                    <Input
                      id="add-promo-campaign-max-usage-per-member"
                      type="number"
                      {...form.register("maxUsagePerMember", { valueAsNumber: true })}
                      placeholder={t("common.unlimited")}
                    />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-promo-campaign-priority">
                      {t("page.promo.form.priority")}
                    </Label>
                    <Input
                      id="add-promo-campaign-priority"
                      type="number"
                      {...form.register("priority", { valueAsNumber: true })}
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
                        {t("page.promo.ui.activateAutomaticallyOnTheStart")}
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
                        {t("page.promo.ui.canBeCombinedWithOther")}
                      </p>
                    </div>
                    <Switch
                      checked={!!form.watch("isCombinable")}
                      onCheckedChange={(v) => form.setValue("isCombinable", v)}
                    />
                  </div>
                  {watchedIsCombinable && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <p className="text-xs font-medium text-foreground">
                        {t("page.promo.ui.activePromo")}{" "}
                        {allStores ? t("header.allStore") : "Toko Terpilih"}
                      </p>
                      {combinableLoading ? (
                        <p className="text-xs text-muted-foreground">
                          {t("page.promo.ui.loadingPromos")}
                        </p>
                      ) : combinablePromos.length === 0 ? (
                        <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30 text-center">
                          <p className="text-xs text-muted-foreground">
                            {t("page.promo.ui.noActivePromosInThis")}
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

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                {t("page.promo.form.tipsTitle")}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">{t("page.promo.form.tipsContent")}</p>
          </div>
        </form>
      </Form>

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
            disabled={createMutation?.isLoading}>
            {t("page.discount.add.saveAsDraft")}
          </Button>
          <Button
            variant="success"
            type="button"
            onClick={() => handleFormSubmit(false)}
            disabled={createMutation?.isLoading}
            className="gap-2 w-full sm:w-auto justify-center">
            <Save size={18} />
            {createMutation?.isLoading ? t("button.saving") : t("button.save")}
          </Button>
        </div>
      </div>

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
        loading={createMutation?.isLoading}
        onConfirm={() => {
          onSubmit();
        }}
      />
      <Modal
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title={pendingDraft ? t("page.promo.modal.draftTitle") : t("page.promo.modal.saveTitle")}
        description={
          pendingDraft
            ? t("page.promo.modal.draftDescription")
            : t("page.promo.modal.saveDescription")
        }
        confirmText={pendingDraft ? t("common.yes") : t("common.save")}
        cancelText={t("common.cancel")}
        loading={createMutation?.isLoading}
        onConfirm={() => {
          onSubmit();
        }}
      />
      <Modal
        type="success"
        open={successModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-promo?id=${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.promo.toast.createSuccess")}
        onConfirm={() => setTimeout(() => navigate("/promo-list"), 150)}
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

export default AddPromoCampaign;

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

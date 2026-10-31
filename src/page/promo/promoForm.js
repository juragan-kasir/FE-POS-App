import { z } from "zod";

export const SPECIFIC_SCOPES = ["specific_products", "specific_categories", "specific_members"];

export const isSpecificScope = (applicableTo) => SPECIFIC_SCOPES.includes(applicableTo);

export const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export const CAMPAIGN_TYPE_LABELS = {
  happy_hour: "Happy Hour",
  birthday: "Birthday",
  buy_x_get_y: "Buy X Get Y",
  spend_get: "Spend & Get",
  manual: "Manual",
  automatic: "Automatic"
};

export const PROMO_FIELD_LABELS = {
  name: "Nama Campaign",
  type: "Tipe Campaign",
  startDate: "Tanggal Mulai",
  endDate: "Tanggal Akhir",
  applicableIds: "Pilihan Spesifik (Berlaku Untuk)"
};

export const DEFAULT_START_TIME = "00:00";
export const DEFAULT_END_TIME = "23:59";

const emptyToNull = (v) => (v === "" || v === undefined || Number.isNaN(v) ? null : v);

export const buildPromoSchema = (t) =>
  z.object({
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
    maxUsageTotal: z.preprocess(emptyToNull, z.number().optional().nullable()),
    maxUsagePerMember: z.preprocess(emptyToNull, z.number().optional().nullable()),
    priority: z.number().min(0).default(0),
    isCombinable: z.boolean().default(false),
    autoActivate: z.boolean().default(false)
  });

export const PROMO_FORM_DEFAULTS = {
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
};

const toIsoOrEmpty = (value) => (value ? new Date(value).toISOString() : "");

export const campaignToFormValues = (campaign) => ({
  name: campaign.name || "",
  description: campaign.description || "",
  code: campaign.code || "",
  type: campaign.type || "happy_hour",
  discountType: campaign.discountType || "percentage",
  discountValue: campaign.discountValue || 0,
  maxDiscount: campaign.maxDiscount || null,
  minPurchase: campaign.minPurchase || 0,
  startDate: toIsoOrEmpty(campaign.startDate),
  endDate: toIsoOrEmpty(campaign.endDate),
  startTime: campaign.startTime || "",
  endTime: campaign.endTime || "",
  applicableTo: campaign.applicableTo || "all",
  maxUsageTotal: campaign.maxUsageTotal || null,
  maxUsagePerMember: campaign.maxUsagePerMember || null,
  priority: campaign.priority || 0,
  isCombinable: campaign.isCombinable || false,
  autoActivate: campaign.autoActivate || false
});

export const combineDateTime = (date, time) => {
  if (!date) return null;
  const combined = new Date(date);
  const [hours, minutes] = (time || DEFAULT_START_TIME).split(":");
  combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return combined;
};

const pad = (n) => String(n).padStart(2, "0");

export const timeOf = (date, fallback) =>
  date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : fallback;

export const formatIDR = (num) => {
  if (!num && num !== 0) return "";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

export const parseIDR = (str) => {
  if (!str) return 0;
  return Number(str.replace(/[^0-9]/g, "")) || 0;
};

export const NEW_RULE = { ruleType: "time", condition: {}, priority: 0 };

export const NEW_REWARD = {
  rewardType: "discount_percentage",
  rewardValue: 0,
  quantity: 1,
  priority: 0
};

const RULE_DEFAULT_CONDITIONS = {
  buy_x_get_y: { productIdX: null, qtyX: 1, productIdY: null, qtyY: 1 },
  spend_threshold: { minAmount: 0 },
  member_tier: { tierId: null }
};

export const defaultConditionFor = (ruleType) => ({ ...(RULE_DEFAULT_CONDITIONS[ruleType] || {}) });

export const buildPromoPayload = ({
  values,
  store,
  applicableIds,
  daysOfWeek,
  rules,
  rewards,
  isDraft
}) => ({
  ...values,
  store,
  applicableIds: isSpecificScope(values.applicableTo) ? applicableIds.map(Number) : null,
  daysOfWeek,
  rules,
  rewards,
  status: isDraft ? "draft" : "active"
});

const HOME_BY_ROLE = {
  super_admin: "/dashboard-super-admin",
  admin: "/dashboard-admin"
};

export const promoHomeHref = (roleType) => HOME_BY_ROLE[roleType] || "/home";

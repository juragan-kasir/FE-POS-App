import { safeGet } from "@/lib/safe-lookup";

export const isCashPayment = (type) => {
  const t = String(type || "").toLowerCase();
  return (
    t.includes("cash") ||
    t.includes("tunai") ||
    t.includes("debit") ||
    t.includes("credit") ||
    t.includes("other") ||
    t.includes("points")
  );
};

export const getPaymentIconKind = (type) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("cash") || t.includes("tunai") || t.includes("banknote")) return "cash";
  if (
    t.includes("qris") ||
    t.includes("e-wallet") ||
    t.includes("ewallet") ||
    t.includes("wallet") ||
    t.includes("gopay") ||
    t.includes("ovo") ||
    t.includes("dana") ||
    t.includes("shopeepay")
  ) {
    return "ewallet";
  }
  if (t.includes("debit") || t.includes("credit") || t.includes("kartu") || t.includes("card")) {
    return "card";
  }
  return "other";
};

export const toPaymentOption = (paymentType) => ({
  key: String(paymentType.id ?? `${paymentType.type}-${paymentType.name}`),
  paymentTypeId: paymentType.id ?? null,
  type: paymentType.type || paymentType.id?.toString() || paymentType.name?.toLowerCase(),
  label: paymentType.name,
  kind: getPaymentIconKind(paymentType.type)
});

export const findPaymentOption = (options, key) =>
  options.find((option) => option.key === key) || null;

export const paymentTypeIdPayload = (option) =>
  option?.paymentTypeId ? { typePaymentId: option.paymentTypeId } : {};

// Display metadata for the canonical payment buckets reported by the API
// (BE api/service/canonicalPayment.js): the seven canonical tenders plus the
// UNRECONCILED reporting bucket for stored tenders that cannot be mapped.
// Codes stay canonical end to end; only the label/color is presentation.
export const PAYMENT_METHOD_META = Object.freeze({
  CASH: { label: "Tunai", color: "#10b981" },
  CARD: { label: "Kartu", color: "#f59e0b" },
  BANK_TRANSFER: { label: "Transfer Bank", color: "#0ea5e9" },
  E_WALLET: { label: "E-Wallet", color: "#6366f1" },
  QRIS: { label: "QRIS", color: "#a855f7" },
  POINTS: { label: "Poin", color: "#ec4899" },
  OTHER: { label: "Lainnya", color: "#94a3b8" },
  UNRECONCILED: { label: "Tidak Terekonsiliasi", color: "#ef4444" }
});

// Unknown (or prototype-like) codes never borrow a real tender's label.
export const paymentMethodMeta = (code) =>
  safeGet(PAYMENT_METHOD_META, code, PAYMENT_METHOD_META.UNRECONCILED);

// Human label of a stored payment method for receipts: canonical codes
// (E_WALLET) and the cashier's lowercase types (e-wallet, debit, transfer)
// both resolve to the same label; an unknown method shows as typed.
const PAYMENT_ALIASES = Object.freeze({
  EWALLET: "E_WALLET",
  DEBIT: "CARD",
  CREDIT: "CARD",
  TRANSFER: "BANK_TRANSFER"
});
const canonicalPaymentCode = (method) => {
  const code = String(method || "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_");
  return safeGet(PAYMENT_ALIASES, code, code);
};
const isKnownPaymentCode = (code) =>
  Object.prototype.hasOwnProperty.call(PAYMENT_METHOD_META, code);

export const paymentMethodLabelKey = (method) => {
  const code = canonicalPaymentCode(method);
  return `page.dashboardSuperAdmin.payment.method.${isKnownPaymentCode(code) ? code : "UNRECONCILED"}`;
};

export const paymentMethodLabel = (method) => {
  if (!method || method === "-") return "";
  const canonical = canonicalPaymentCode(method);
  if (isKnownPaymentCode(canonical)) {
    return PAYMENT_METHOD_META[canonical].label;
  }
  const text = String(method).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// DR-23 §D / §M: the configured payment types whose payment must carry a
// reference — every method but cash and points (BE requiresTenderReference:
// CARD = debit/credit, BANK_TRANSFER, E_WALLET, QRIS, OTHER, where OTHER's
// "reference" is its description). The server refuses a missing or blank
// one (422 REFERENCE_REQUIRED) and a reused one (409 DUPLICATE_REFERENCE);
// this list only decides when the input is shown and confirm is enabled.
export const REFERENCE_REQUIRED_METHODS = Object.freeze([
  "qris",
  "debit",
  "credit",
  "transfer",
  "e-wallet",
  "other"
]);
export const MAX_REFERENCE_LENGTH = 255;

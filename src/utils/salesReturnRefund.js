import { safeGet } from "@/lib/safe-lookup";

export const KNOWN_REFUND_METHODS = Object.freeze(["cash", "debit", "credit", "e-wallet", "other"]);

const REFUND_METHOD_ALIASES = Object.freeze({
  tunai: "cash",
  ewallet: "e-wallet",
  "bank-transfer": "transfer"
});

export const normalizeRefundMethod = (method) => {
  const code = String(method || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  return safeGet(REFUND_METHOD_ALIASES, code, code);
};

export const refundMethodLabel = (method, t) => {
  const code = normalizeRefundMethod(method);
  if (KNOWN_REFUND_METHODS.includes(code)) return t(`page.salesReturn.method.${code}`);
  return method || "-";
};

const collectionRatio = (order) => {
  const subTotal = Number(order?.subTotal) || 0;
  return subTotal > 0 ? (Number(order?.totalPrice) || 0) / subTotal : 0;
};

export const estimateRefund = (items, order) => {
  const itemsTotal = items.reduce((sum, item) => sum + item.unitAmount * item.qty, 0);
  return Math.round(itemsTotal * collectionRatio(order));
};

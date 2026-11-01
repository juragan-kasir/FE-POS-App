let sequence = 0;
export const newIdempotencyKey = () =>
  globalThis?.crypto?.randomUUID?.() ||
  `${Date.now()}-${sequence++}-${Math.random().toString(36).slice(2)}`;

export const newPurchasePaymentKey = newIdempotencyKey;

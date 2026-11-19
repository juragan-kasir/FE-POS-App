// Short label for an order number on cashier screens (queue card, add-round notice).
//
// BE (W3-6, 2026-11-19) numbers documents per outlet per business day:
//   ORD-<storeId>-<YYMMDD>-<seq>   e.g. ORD-12-261119-0001
// The cashier queue only lists one outlet's orders for today, so the sequence alone
// is unique there. Older numbers (timestamp + random) keep the last 5 characters.
const DAILY_COUNTER_NUMBER = /^[A-Z]+-\d+-\d{6}-(\d{4,})$/;

export const shortOrderNumber = (orderNumber, fallback = "") => {
  if (typeof orderNumber !== "string" || !orderNumber) return fallback;
  const daily = DAILY_COUNTER_NUMBER.exec(orderNumber);
  if (daily) return daily[1];
  return orderNumber.slice(-5);
};

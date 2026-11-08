// Retail R1 (owner decision 2026-11-08): quantity price breaks (grosir).
// Mirrors the server rule (BE utils/outletPricing quantityTierPrice): a
// price tier with `minQty` sets the unit price for a line of at least that
// many units; the highest qualifying minQty wins; tiers without minQty
// (named price lists such as "Harga Member") never apply automatically.
// Option/modifier markup is added on top of the break price, as the server
// does. The server stays authoritative: this only keeps the cart, and the
// expectedPrice echo, in step with what checkout will charge.

// [{ minQty, price }] sorted by minQty, from a product's priceTiers.
export const quantityBreaksOf = (priceTiers) => {
  if (!Array.isArray(priceTiers)) return [];
  return priceTiers
    .map((tier) => ({ minQty: Number(tier?.minQty), price: Number(tier?.price) }))
    .filter(
      (tier) =>
        Number.isFinite(tier.minQty) &&
        tier.minQty > 0 &&
        Number.isInteger(tier.price) &&
        tier.price >= 0
    )
    .sort((a, b) => a.minQty - b.minQty);
};

// The break price for this quantity, or null when no break applies.
export const breakPriceFor = (breaks, quantity) => {
  const qty = Number(quantity);
  if (!Array.isArray(breaks) || !Number.isFinite(qty)) return null;
  let price = null;
  for (const tier of breaks) {
    if (tier.minQty <= qty) price = tier.price;
  }
  return price;
};

// A quantity rounded to three decimals (gram / milliliter).
export const roundQty = (value) => Math.round(Number(value) * 1000) / 1000;

// Unit price × quantity, rounded to the nearest Rp1 half up, as the server
// rounds a line (computed on milli-units so 1.005 kg never rounds down).
export const lineTotalOf = (unitPrice, quantity) => {
  const milli = Math.round((Number(quantity) || 0) * 1000);
  const total = (Number(unitPrice) || 0) * milli;
  return Math.sign(total) * Math.floor((Math.abs(total) + 500) / 1000);
};

// Parses a typed quantity ("0,75", "1.5", "2"): whole units unless the line
// sells by weight. Returns null for anything unusable.
export const parseQuantityInput = (text, allowDecimal) => {
  const normalized = String(text ?? "")
    .trim()
    .replace(",", ".");
  if (!/^\d*(\.\d*)?$/.test(normalized) || normalized === "" || normalized === ".") return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return allowDecimal ? roundQty(n) : Math.round(n);
};

// A quantity for display: up to three decimals with a comma ("0,75").
export const formatQuantity = (value) =>
  Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });

// A cart line re-priced for a new count. Overridden lines keep their price;
// otherwise the unit price is the break price (plus markup) when one
// applies, else the line's list price.
export const repriceLine = (line, count) => {
  if (line.priceOverridden || !Array.isArray(line.quantityBreaks) || !line.quantityBreaks.length) {
    return { ...line, count, totalPrice: lineTotalOf(line.price, count) };
  }
  const breakPrice = breakPriceFor(line.quantityBreaks, count);
  const listPrice = Number(line.listPrice ?? line.price);
  const price = breakPrice === null ? listPrice : breakPrice + (Number(line.markup) || 0);
  return { ...line, count, price, totalPrice: lineTotalOf(price, count) };
};

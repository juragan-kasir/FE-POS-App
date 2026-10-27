// BRD Harga Modal/HPP/BOM/Stok BR-01/BR-02 (phase 3): a finished good sold
// as it is (Le Minerale) takes its stock, cost and minimum from ONE
// inventory item (ingredient) per outlet — product inventoryMode
// "inventory_item", BE `inventoryLinks: [{ store, ingredientId, qty }]`,
// where qty = base units of the item one sold unit uses (a pack of 24 = 24).
import { ingredientBaseUnitCost } from "@/lib/recipe-costing";

const roundCost = (value) => Math.round(value * 100) / 100;

// Cost of one sold unit: the item's cost per base unit × qty. null when the
// item has no purchase price yet.
export const linkUnitCost = (item, qty = 1) => {
  const base = ingredientBaseUnitCost(item);
  return base > 0 ? roundCost(base * (Number(qty) || 1)) : null;
};

// Units the item can still sell.
export const linkAvailableUnits = (item, qty = 1) => {
  const per = Number(qty) || 1;
  const stock = Number(item?.stock) || 0;
  return stock > 0 ? Math.floor(stock / per + 1e-9) : 0;
};

const sameStore = (a, b) => String(a) === String(b);

// Outlets among `storeIds` without a chosen item.
export const missingLinkStores = (links = [], storeIds = []) =>
  storeIds.filter((s) => !links.some((l) => sameStore(l.store, s) && l.ingredientId));

// The links to send for the outlets that sell the product.
export const linksPayload = (links = [], storeIds = []) =>
  storeIds
    .map((s) => links.find((l) => sameStore(l.store, s) && l.ingredientId))
    .filter(Boolean)
    .map((l) => ({
      store: Number(l.store),
      ingredientId: Number(l.ingredientId),
      qty: Math.max(parseInt(l.qty, 10) || 1, 1)
    }));

// Form state from GET /product/get-by-id `inventoryLinks`.
export const linksFromProduct = (product) =>
  (product?.inventoryLinks || []).map((l) => ({
    store: String(l.store),
    ingredientId: String(l.ingredientId),
    qty: l.qty || 1
  }));

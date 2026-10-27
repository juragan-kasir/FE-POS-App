// F7 product fulfillment strategy (BE product.inventoryMode):
//   stocked         finished-good stock is deducted (default)
//   make_to_order   the recipe (BOM) ingredients are deducted instead
//   hybrid          both are deducted
//   inventory_item  a finished good whose stock, cost and minimum are its
//                   linked inventory item's, per outlet (BRD BR-02)
export const INVENTORY_MODES = ["stocked", "make_to_order", "hybrid", "inventory_item"];

export const isInventoryItemMode = (mode) => mode === "inventory_item";

// BRD phase 4F: "hybrid" (own stock AND recipe deducted on every sale) is
// retired — kept on the products that already have it, never offered anew.
export const RETIRED_INVENTORY_MODES = ["hybrid"];

// The modes a product can be given; a retired one only when it is the
// product's saved mode.
export const selectableInventoryModes = (savedMode = null) =>
  INVENTORY_MODES.filter((m) => !RETIRED_INVENTORY_MODES.includes(m) || m === savedMode);

// Modes priced and limited by an outlet recipe (not by a linked item).
export const usesRecipeMode = (mode) => mode === "make_to_order" || mode === "hybrid";

// Whether the product's OWN finished-good stock limits selling. A
// make_to_order product is limited by its recipe's ingredients and an
// inventory_item product by its linked item instead (the backend refuses the
// sale with 409 INGREDIENT_STOCK_CONFLICT), so its product stock — usually 0
// — must never mark it out of stock.
export const usesProductStock = (product) =>
  ["stocked", "hybrid"].includes(product?.inventoryMode || "stocked");

// BA finding #2: with per-outlet stock authoritative (DR-14), an initial
// stock with no store assignment ("Semua Toko") has nowhere to live — every
// outlet reads its own product_store_stock row (0 without one), so the outlet
// list shows 0 and the sale is refused while the edit form still shows the
// number. An opening stock therefore requires at least one specific store,
// unless the product does not use its own stock (make_to_order,
// inventory_item).
export const initialStockNeedsStore = (product, stores) =>
  usesProductStock(product) &&
  (Number(product?.stock) || 0) > 0 &&
  (!Array.isArray(stores) || stores.length === 0);

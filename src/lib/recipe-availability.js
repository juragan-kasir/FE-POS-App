// Portions a recipe product can still be sold — BE GET
// /product/recipe-availability (BRD BR-05/FR-09/FR-11). The server gives each
// recipe product's use per portion of every ingredient and each ingredient's
// stock; what is already in the cart is subtracted here from that one
// shared balance, so two menus using the same milk never both promise it.
//
// Returns Map<productId, { portions, limitingIngredients: [{ id, name }] }>.
// A recipe product absent from the server's list has no active recipe at
// this outlet: 0 portions (the sale would be refused).
const round4 = (n) => Math.round(n * 10000) / 10000;

export const remainingRecipePortions = (availability, cart = []) => {
  const result = new Map();
  if (!availability) return result;
  const rows = availability.products || [];
  const stock = new Map((availability.ingredients || []).map((i) => [Number(i.id), i]));
  const left = new Map([...stock].map(([id, i]) => [id, Number(i.stock) || 0]));
  const byProduct = new Map(rows.map((r) => [Number(r.productId), r]));

  for (const item of cart) {
    if (item.isBundle) continue;
    const row = byProduct.get(Number(item.id));
    if (!row) continue;
    for (const req of row.requirements || []) {
      const id = Number(req.ingredientId);
      if (left.has(id)) left.set(id, round4(left.get(id) - req.perPortion * (item.count || 0)));
    }
  }

  for (const row of rows) {
    let portions = row.requirements?.length ? Infinity : 0;
    let limiting = [];
    for (const req of row.requirements || []) {
      const id = Number(req.ingredientId);
      const available = left.get(id) ?? 0;
      const n = req.perPortion > 0 ? Math.max(Math.floor(available / req.perPortion + 1e-9), 0) : 0;
      if (n < portions) {
        portions = n;
        limiting = [id];
      } else if (n === portions) {
        limiting.push(id);
      }
    }
    result.set(Number(row.productId), {
      portions: Number.isFinite(portions) ? portions : 0,
      limitingIngredients: limiting.map((id) => ({ id, name: stock.get(id)?.name ?? null }))
    });
  }
  return result;
};

// The recipe-limited state of one product: null when it is not a recipe
// product (or availability could not be loaded — the server still refuses
// a short sale), otherwise its remaining portions.
export const recipePortionsFor = (product, portionsById, loaded) => {
  if ((product?.inventoryMode || "stocked") === "stocked" || product?.isBundle || !loaded) {
    return null;
  }
  return portionsById.get(Number(product.id)) || { portions: 0, limitingIngredients: [] };
};

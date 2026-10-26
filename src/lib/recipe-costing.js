// HPP of a recipe product — the same rule as BE itemCostService.recipeCosting
// (BRD Harga Modal/HPP §5), so the recipe form previews exactly what the
// server stores and snapshots at sale time:
//   auto         every line has a cost: HPP = Σ(qty × cost per base unit) / yield
//   provisional  the recipe is empty or a line has no cost; the product's
//                estimate (product.costPrice) is used
//   unavailable  neither — no HPP
// Food cost and margin always come from that one HPP.
export const HPP_STATUSES = ["auto", "provisional", "unavailable"];

const roundCost = (value) => Math.round(value * 100) / 100;

// Cost of ONE base unit: costPrice is per purchase unit (e.g. per kg) and
// conversionFactor is how many base units one purchase unit holds.
export const ingredientBaseUnitCost = (ingredient) => {
  const costPrice = Number(ingredient?.costPrice || 0);
  const factor = Number(ingredient?.conversionFactor);
  return factor > 0 ? costPrice / factor : costPrice;
};

// bom_header.totalQty is the recipe yield; older recipes carry 0 = 1 portion.
export const recipeYield = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
};

export const costRatios = (hpp, price) => {
  const sellPrice = Number(price) || 0;
  if (hpp == null || !(sellPrice > 0)) {
    return { foodCostPercent: null, marginPercent: null, grossProfit: null };
  }
  const ratio = hpp / sellPrice;
  return {
    foodCostPercent: roundCost(ratio * 100),
    marginPercent: roundCost((1 - ratio) * 100),
    grossProfit: roundCost(sellPrice - hpp)
  };
};

export const recipeCosting = ({
  lines = [],
  ingredientById = new Map(),
  yieldQty = 1,
  estimate = 0,
  price = 0
}) => {
  const missingCost = [];
  let recipeCost = 0;
  for (const line of lines) {
    const ingredient = ingredientById.get(Number(line.ingredientId));
    const cost = ingredientBaseUnitCost(ingredient);
    if (!(cost > 0)) {
      missingCost.push({ ingredientId: Number(line.ingredientId), name: ingredient?.name ?? null });
      continue;
    }
    recipeCost += cost * Number(line.qty);
  }
  const portions = recipeYield(yieldQty);
  const estimateCost = Number(estimate) > 0 ? roundCost(Number(estimate)) : null;

  let status = "unavailable";
  let hppPerPortion = null;
  if (lines.length > 0 && missingCost.length === 0) {
    status = "auto";
    hppPerPortion = roundCost(recipeCost / portions);
  } else if (estimateCost != null) {
    status = "provisional";
    hppPerPortion = estimateCost;
  }
  return {
    status,
    yieldQty: portions,
    recipeTotalCost: missingCost.length === 0 && lines.length > 0 ? roundCost(recipeCost) : null,
    hppPerPortion,
    ...costRatios(hppPerPortion, price),
    missingCost
  };
};

// The outlet recipe to show from GET /bom/costing: the given store's, else
// the only one. Several outlets without a store pick → null (show the list).
export const pickRecipeCosting = (costing, storeId) => {
  const recipes = costing?.recipes || [];
  if (storeId != null && storeId !== "") {
    return recipes.find((r) => String(r.store) === String(storeId)) || null;
  }
  return recipes.length === 1 ? recipes[0] : null;
};

// HPP behind the product form's margin badge: a product that is not
// 'stocked' costs its outlet recipe (falling back to the estimate while the
// recipe is incomplete); a stocked product costs its Harga Modal.
export const effectiveHpp = ({ inventoryMode, costPrice, recipe }) => {
  const estimate = Number(costPrice) > 0 ? Number(costPrice) : null;
  if ((inventoryMode || "stocked") === "stocked") {
    return { hpp: estimate, status: estimate != null ? "auto" : "unavailable" };
  }
  if (recipe?.status === "auto") return { hpp: Number(recipe.hppPerPortion), status: "auto" };
  if (estimate != null) return { hpp: estimate, status: "provisional" };
  return { hpp: null, status: "unavailable" };
};

import React from "react";
import { useTranslation } from "react-i18next";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import RecipeHppSummary from "@/components/organism/RecipeHppSummary";
import { costRatios, effectiveHpp, pickRecipeCosting } from "@/lib/recipe-costing";

const rupiahInputProps = (field) => ({
  type: "text",
  inputMode: "numeric",
  placeholder: "0",
  className: "pl-10",
  value: field.value ? Number(field.value).toLocaleString("id-ID") : "",
  onChange: (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    field.onChange(raw ? Number(raw) : "");
  }
});

const RupiahPrefix = () => (
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
    Rp
  </span>
);

const Chip = ({ className, children }) => (
  <span
    className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded ${className}`}>
    {children}
  </span>
);

// Selling price + cost of the product form (Add/Edit Produk). BRD Harga
// Modal/HPP: one HPP behind the margin and food cost. A 'stocked' product
// costs its Harga Modal; any other mode costs its outlet recipe, shown
// read-only, and the manual figure is only a provisional estimate used
// until the recipe is complete. `costing` is GET /bom/costing (null for a
// product not saved yet); `storeId` picks the outlet recipe to show.
const ProductPriceCostFields = ({ form, costing = null, storeId = null }) => {
  const { t } = useTranslation();
  const inventoryMode = form.watch("inventoryMode") || "stocked";
  const usesRecipe = inventoryMode !== "stocked";
  const price = form.watch("price");
  const costPrice = form.watch("costPrice");
  const recipes = costing?.recipes || [];
  const recipe = pickRecipeCosting(costing, storeId);
  const { hpp, status } = effectiveHpp({ inventoryMode, costPrice, recipe });
  const { foodCostPercent, marginPercent } = costRatios(hpp, price);
  const estimated = status === "provisional";
  // The live summary for the recipe shown, re-derived from the form's
  // current price and estimate so it moves with what is being typed.
  const liveRecipe = (row) => {
    const rowHpp = effectiveHpp({ inventoryMode, costPrice, recipe: row });
    return {
      ...row,
      status: rowHpp.status,
      hppPerPortion: rowHpp.hpp,
      ...costRatios(rowHpp.hpp, price)
    };
  };

  return (
    <>
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("page.product.form.price")} <span className="text-destructive">*</span>
            </FormLabel>
            <div className="relative">
              <RupiahPrefix />
              <Input {...rupiahInputProps(field)} />
              {marginPercent != null && (
                <Chip className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <span data-testid="price-margin-chip">
                    {t(
                      estimated
                        ? "page.recipeHpp.marginChipEstimated"
                        : "page.recipeHpp.marginChip",
                      {
                        value: Math.round(marginPercent)
                      }
                    )}
                  </span>
                </Chip>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costPrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t(usesRecipe ? "page.recipeHpp.estimateLabel" : "page.product.form.costPrice")}
            </FormLabel>
            <div className="relative">
              <RupiahPrefix />
              <Input {...rupiahInputProps(field)} />
              {foodCostPercent != null && (!usesRecipe || estimated) && (
                <Chip className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <span data-testid="cost-food-cost-chip">
                    {t("page.recipeHpp.foodCostChip", { value: Math.round(foodCostPercent) })}
                  </span>
                </Chip>
              )}
            </div>
            {usesRecipe && (
              <p className="text-xs text-muted-foreground">{t("page.recipeHpp.estimateHint")}</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      {usesRecipe && (
        <div className="md:col-span-2 p-4 rounded-lg border border-border bg-muted/10 space-y-4">
          {!costing && (
            <p className="text-sm text-muted-foreground">{t("page.recipeHpp.afterSave")}</p>
          )}
          {costing && recipes.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("page.recipeHpp.noRecipe")}</p>
          )}
          {recipe ? (
            <RecipeHppSummary costing={liveRecipe(recipe)} />
          ) : (
            recipes.map((row) => (
              <RecipeHppSummary
                key={row.bomId}
                costing={liveRecipe(row)}
                storeName={row.storeName}
              />
            ))
          )}
        </div>
      )}
    </>
  );
};

export default ProductPriceCostFields;

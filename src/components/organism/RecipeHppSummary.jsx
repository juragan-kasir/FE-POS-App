import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

const formatRp = (value) =>
  value == null ? "-" : `Rp ${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
const formatPercent = (value) =>
  value == null ? "-" : `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;

const STATUS_STYLE = {
  auto: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  provisional:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  unavailable: "bg-muted text-muted-foreground border-border"
};

// Badge for an HPP status (auto / provisional / unavailable).
export const HppStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const key = STATUS_STYLE[status] ? status : "unavailable";
  return (
    <span
      data-testid="hpp-status"
      data-status={key}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[key]}`}>
      {t(`page.recipeHpp.status.${key}`)}
    </span>
  );
};

// HPP of one outlet recipe (GET /bom/costing row, or the AddBom preview):
// status, HPP per portion, food cost, margin and gross profit — all from the
// same HPP — plus what is missing for the HPP to be computed automatically.
// `compact` keeps the figures 2 × 2 for a narrow column.
const RecipeHppSummary = ({ costing, storeName, className = "", compact = false }) => {
  const { t } = useTranslation();
  if (!costing) return null;
  const {
    status,
    yieldQty,
    recipeTotalCost,
    hppPerPortion,
    foodCostPercent,
    marginPercent,
    grossProfit
  } = costing;
  const missing = costing.missingCost || [];
  const cells = [
    { key: "hppPerPortion", value: formatRp(hppPerPortion) },
    { key: "foodCost", value: formatPercent(foodCostPercent) },
    { key: "margin", value: formatPercent(marginPercent) },
    { key: "grossProfit", value: formatRp(grossProfit) }
  ];

  return (
    <div className={`space-y-3 ${className}`} data-testid="recipe-hpp-summary">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{t("page.recipeHpp.title")}</span>
        <HppStatusBadge status={status} />
        {storeName && <span className="text-xs text-muted-foreground">· {storeName}</span>}
      </div>
      <div className={`grid grid-cols-2 gap-2 ${compact ? "" : "sm:grid-cols-4"}`}>
        {cells.map((cell) => (
          <div key={cell.key} className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-xs text-muted-foreground">{t(`page.recipeHpp.${cell.key}`)}</p>
            <p className="font-semibold text-sm mt-0.5" data-testid={`recipe-hpp-${cell.key}`}>
              {cell.value}
            </p>
          </div>
        ))}
      </div>
      {recipeTotalCost != null && (
        <p className="text-xs text-muted-foreground">
          {t("page.recipeHpp.recipeTotal", {
            total: formatRp(recipeTotalCost),
            portions: yieldQty || 1
          })}
        </p>
      )}
      {status === "provisional" && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t("page.recipeHpp.provisionalHint")}
        </p>
      )}
      {missing.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {t("page.recipeHpp.missingCost", {
              names: missing.map((m) => m.name || `#${m.ingredientId}`).join(", ")
            })}
          </span>
        </div>
      )}
      {status === "unavailable" && missing.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("page.recipeHpp.addIngredients")}</p>
      )}
    </div>
  );
};

export default RecipeHppSummary;

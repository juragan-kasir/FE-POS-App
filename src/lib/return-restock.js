import { usesRecipeMode } from "@/lib/inventory-mode";

export const NOT_RESTOCKED_REASONS = Object.freeze([
  "damaged",
  "defective",
  "expired",
  "qualityIssue"
]);

export const defaultRestock = (reasonKey, lines = []) =>
  !NOT_RESTOCKED_REASONS.includes(reasonKey) &&
  !lines.some((line) => usesRecipeMode(line.inventoryMode));

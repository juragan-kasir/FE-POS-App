export const selectNetProfit = (figures, legacyKey) =>
  figures?.netProfit ?? figures?.[legacyKey] ?? 0;

export const selectProfitMargin = (figures) => figures?.profitMargin ?? figures?.netMargin ?? 0;

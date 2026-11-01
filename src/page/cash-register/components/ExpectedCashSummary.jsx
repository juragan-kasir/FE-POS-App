import React from "react";
import { useTranslation } from "react-i18next";

const varianceTone = (variance) => {
  if (variance > 0) return "text-green-600";
  if (variance < 0) return "text-destructive";
  return "text-muted-foreground";
};

const signedAmount = (variance, formatAmount) => {
  if (variance === 0) return formatAmount(0);
  return `${variance > 0 ? "+" : ""}${formatAmount(variance)}`;
};

const ExpectedCashSummary = ({
  openingBalance,
  currentSales,
  totalExpenses,
  expectedCash,
  variance,
  formatAmount
}) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg bg-muted/30 p-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          {t("page.cashRegister.current.openingBalance")}
        </span>
        <span className="font-medium">{formatAmount(openingBalance)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("page.cashRegister.current.totalSales")}</span>
        <span className="font-medium text-green-600">+{formatAmount(currentSales)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          {t("page.cashRegister.current.totalExpenses")}
        </span>
        <span className="font-medium text-destructive">-{formatAmount(totalExpenses)}</span>
      </div>
      <div className="border-t pt-2 flex justify-between font-semibold">
        <span>{t("page.cashRegister.current.expectedCash")}</span>
        <span>{formatAmount(expectedCash)}</span>
      </div>
      <div className="flex justify-between text-xs pt-1">
        <span className="text-muted-foreground">{t("page.cashRegister.current.variance")}</span>
        <span className={varianceTone(variance)}>{signedAmount(variance, formatAmount)}</span>
      </div>
    </div>
  );
};

export default ExpectedCashSummary;

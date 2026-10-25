import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/ui/date-input";
import ExportButtons from "@/components/organism/ExportButtons";
import ReportTable from "@/components/organism/ReportTable";
import { useReportData } from "@/queries/useReportData";
import { formatCurrency } from "@/utils/reportUtils";
import { todayDateOnly } from "@/utils/dateOnly";

const ProfitPerProduct = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = todayDateOnly();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // The table and the export use the same params; the cards add up the
  // same rows (every field is there even when its column is hidden).
  const reportParams = { startDate, endDate };
  const { data: report, isLoading } = useReportData("profitPerProduct", reportParams);
  const items = report?.rows || [];
  const sum = (field) => items.reduce((s, i) => s + Number(i[field] || 0), 0);
  const totalSales = sum("totalSales");
  const totalHpp = sum("totalHpp");
  const totalProfit = sum("profit");

  const cards = [
    {
      labelKey: "page.report.profitPerProduct.totalSales",
      value: totalSales,
      tone: "text-foreground"
    },
    { labelKey: "page.report.profitPerProduct.totalHpp", value: totalHpp, tone: "text-foreground" },
    {
      labelKey: "page.report.profitPerProduct.totalProfit",
      value: totalProfit,
      tone: totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
    }
  ];

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => navigate("/dashboard-super-admin")}
          className="hover:text-foreground transition-colors">
          {t("breadcrumb.home")}
        </button>
        <span className="text-xs">/</span>
        <span className="text-primary font-semibold">
          {t("page.report.profitPerProduct.title")}
        </span>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {t("page.report.profitPerProduct.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("page.report.profitPerProduct.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons reportKey="profitPerProduct" buildParams={() => reportParams} />
          <DateInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <DateInput
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="w-40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.labelKey} className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t(card.labelKey)}
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : (
              <p className={`mt-1 text-xl font-bold tabular-nums ${card.tone}`}>
                {formatCurrency(card.value)}
              </p>
            )}
          </Card>
        ))}
      </div>

      <ReportTable
        reportKey="profitPerProduct"
        params={reportParams}
        title={t("page.report.profitPerProduct.title")}
        emptyText={t("page.report.profitPerProduct.noData")}
        signedKeys={["profit", "margin"]}
      />
    </div>
  );
};

export default ProfitPerProduct;

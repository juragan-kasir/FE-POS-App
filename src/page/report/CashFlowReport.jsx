import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { getCashFlow } from "@/services/report";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency } from "@/utils/reportUtils";
import ExportButtons from "@/components/organism/ExportButtons";
import ReportTable from "@/components/organism/ReportTable";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const CashFlowReport = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  // Same params for the cards, the detail table and the export.
  const reportParams = {
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd")
  };

  const { data, isLoading, isError, refetch } = useQuery(["cash-flow", reportParams], () =>
    getCashFlow(reportParams)
  );

  const cf = data?.data || {};

  const inflowCards = [
    {
      labelKey: "page.report.cashFlow.card.cashReceipt",
      value: cf.penerimaanTunai,
      color: "text-green-600"
    },
    {
      labelKey: "page.report.cashFlow.card.qrisReceipt",
      value: cf.penerimaanQris,
      color: "text-blue-600"
    },
    {
      labelKey: "page.report.cashFlow.card.transferReceipt",
      value: cf.penerimaanTransfer,
      color: "text-purple-600"
    },
    {
      labelKey: "page.report.cashFlow.card.purchaseReturnRefund",
      value: cf.penerimaanReturPembelian,
      color: "text-emerald-600"
    },
    {
      labelKey: "page.report.cashFlow.card.totalInflow",
      value: cf.totalKasMasuk,
      color: "text-primary",
      bold: true
    }
  ];

  const outflowCards = [
    {
      labelKey: "page.report.cashFlow.card.expense",
      value: cf.pengeluaranExpense,
      color: "text-orange-600"
    },
    {
      labelKey: "page.report.cashFlow.card.supplierPayment",
      value: cf.pengeluaranPurchasePayment,
      color: "text-red-600"
    },
    {
      labelKey: "page.report.cashFlow.card.totalOutflow",
      value: cf.totalPengeluaran,
      color: "text-red-600",
      bold: true
    },
    {
      labelKey: "page.report.cashFlow.card.netCashFlow",
      value: cf.netCashFlow,
      color: (cf.netCashFlow ?? 0) >= 0 ? "text-green-600" : "text-red-600",
      bold: true
    }
  ];

  const renderCards = (cards) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.labelKey}>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t(card.labelKey)}
            </p>
            <p className={`text-xl font-bold ${card.color}`}>
              {cf != null && card.value != null ? formatCurrency(card.value) : "-"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.report.cashFlow.title") }
        ]}
        title={t("page.report.cashFlow.title")}
        description={t("page.report.cashFlow.description")}>
        <ExportButtons reportKey="cashFlow" buildParams={() => reportParams} />
        <DatePicker date={startDate} setDate={setStartDate} />
        <DatePicker date={endDate} setDate={setEndDate} minDate={startDate} />
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                  <Skeleton className="h-8 w-28 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("page.report.cashFlow.section.inflow")}
                </h3>
                {renderCards(inflowCards)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("page.report.cashFlow.section.outflow")}
                </h3>
                {renderCards(outflowCards)}
              </div>
              <ReportTable
                reportKey="cashFlow"
                params={reportParams}
                title={t("page.report.cashFlow.detailTitle")}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CashFlowReport;

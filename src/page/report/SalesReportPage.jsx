import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { useQuery } from "react-query";
import { getSalesSummary } from "@/services/report";
import ExportButtons from "@/components/organism/ExportButtons";
import GlobalSalesTab from "./GlobalSalesTab";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const SalesReportPage = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [salesPeriod, setSalesPeriod] = useState("Today");

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const {
    data: salesData,
    isLoading: salesLoading,
    isError,
    refetch
  } = useQuery(["sales-summary", salesPeriod], () =>
    getSalesSummary({ period: salesPeriod.toLowerCase() })
  );

  return (
    <div data-tour="page-reports" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.report.sales.title") }
        ]}
        title={t("page.report.sales.title")}
        description={t("page.report.sales.description")}>
        <ExportButtons
          reportKey="sales"
          buildParams={() => ({
            filter: salesPeriod.toLowerCase()
          })}
        />
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div className="relative min-h-[300px]">
              <GlobalSalesTab
                t={t}
                period={salesPeriod}
                setPeriod={setSalesPeriod}
                data={salesData?.data}
                isLoading={salesLoading}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesReportPage;

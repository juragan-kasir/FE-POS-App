import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import StoreFilter from "@/components/ui/StoreFilter";
import ExportButtons from "@/components/organism/ExportButtons";
import ReportTable from "@/components/organism/ReportTable";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const DailyReport = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const storeId = isSuperAdmin && storeFilter && storeFilter !== "all" ? storeFilter : "";
  const storeParams = storeId ? { store: storeId } : {};

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  // One set of params for the table and the export, so both show the same.
  const reportParams = {
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    ...storeParams
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.report.daily.title") }
        ]}
        title={t("page.report.daily.title")}
        description={t("page.report.daily.description")}>
        {isSuperAdmin && (
          <StoreFilter
            locations={locData?.data || []}
            value={storeFilter}
            onChange={setGlobalStoreFilter}
            isSuperAdmin={isSuperAdmin}
            t={t}
          />
        )}
        <ExportButtons reportKey="daily" buildParams={() => reportParams} />
        <DatePicker date={startDate} setDate={setStartDate} />
        <DatePicker date={endDate} setDate={setEndDate} minDate={startDate} />
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <ReportTable
          reportKey="daily"
          params={reportParams}
          title={t("page.report.daily.title")}
          emptyText={t("page.report.daily.noData")}
          signedKeys={["grossProfit", "netProfit"]}
        />
      )}
    </div>
  );
};

export default DailyReport;

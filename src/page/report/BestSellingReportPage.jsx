import React from "react";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { useQuery } from "react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getBestSellerReport } from "@/services/report";
import ExportButtons from "@/components/organism/ExportButtons";
import BestSellerTab from "./BestSellerTab";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const BestSellingReportPage = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const {
    data: bestSellerData,
    isLoading: bestLoading,
    isError,
    refetch
  } = useQuery(
    ["best-seller-report"],
    () => getBestSellerReport({ limit: 10, store: isSuperAdmin ? "" : user?.store || "" }),
    {}
  );

  return (
    <div data-tour="page-reports" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.report.bestSeller.title") }
        ]}
        title={t("page.report.bestSeller.title")}
        description={t("page.report.bestSeller.description")}>
        <ExportButtons reportKey="bestSeller" buildParams={() => ({ limit: 10 })} />
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div className="relative min-h-[300px]">
              {bestLoading && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
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
              )}

              {bestSellerData?.data && (
                <BestSellerTab t={t} data={bestSellerData?.data} isLoading={bestLoading} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BestSellingReportPage;

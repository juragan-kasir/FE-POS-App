import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { TrendingUp, Package, Users, DollarSign } from "lucide-react";
import { formatCurrency, formatNumber } from "@/utils/reportUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExportButtons from "@/components/organism/ExportButtons";
import ReportTable from "@/components/organism/ReportTable";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";
import { useReportData } from "@/queries/useReportData";

const FILTERS = [
  { key: "daily", labelKey: "page.advancedReporting.period.daily" },
  { key: "weekly", labelKey: "page.advancedReporting.period.weekly" },
  { key: "monthly", labelKey: "page.advancedReporting.period.monthly" }
];

// Each tab's table is the report of the same key in /report/settings, and
// its export button downloads exactly that table.
const TAB_KEY = {
  sales: "daily",
  product: "productSales",
  category: "categorySales",
  kasir: "kasirPerformance"
};

// The reporting endpoints filter by startDate/endDate (yyyy-MM-dd), not by
// a period name: turn the picked period into that range.
const periodRange = (period, now = new Date()) => {
  const day = (d) => format(d, "yyyy-MM-dd");
  if (period === "weekly") {
    return {
      startDate: day(startOfWeek(now, { weekStartsOn: 1 })),
      endDate: day(endOfWeek(now, { weekStartsOn: 1 }))
    };
  }
  if (period === "monthly")
    return { startDate: day(startOfMonth(now)), endDate: day(endOfMonth(now)) };
  return { startDate: day(now), endDate: day(now) };
};

const AdvancedReporting = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [period, setPeriod] = useState("daily");
  const [store, setStore] = useState(cookie?.activeStore || "");
  const [activeTab, setActiveTab] = useState("sales");
  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const locations = locData?.data || [];
  const storeId = store || cookie?.activeStore;

  useEffect(() => {
    const activeStore = cookie?.activeStore;
    const hasStoredStore = activeStore && activeStore !== "undefined" && String(activeStore) !== "";
    if (isSuperAdmin && locations.length > 0 && !hasStoredStore) {
      setStore(String(locations[0].id));
    }
  }, [isSuperAdmin, locations, cookie]);

  const reportParams = { store: storeId, ...periodRange(period) };

  // The sales KPIs add up the rows of the sales tab's own table (the
  // daily report), so cards, table and export always agree.
  const { data: dailyReport, isLoading: salesLoading } = useReportData("daily", reportParams, {
    enabled: !!storeId
  });
  const dailyRows = dailyReport?.rows || [];
  const sumDaily = (field) => dailyRows.reduce((sum, row) => sum + Number(row[field] || 0), 0);

  const reportTable = (tab, titleKey) =>
    storeId ? (
      <ReportTable
        reportKey={TAB_KEY[tab]}
        params={reportParams}
        title={t(titleKey)}
        signedKeys={["profit", "grossProfit", "netProfit"]}
      />
    ) : (
      <NoStore />
    );

  const StatCard = ({ icon: Icon, label, value }) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
        {t(
          "page.advancedReporting.legacyNotice",
          "Advanced reporting uses pre-aggregated summaries that may be stale. For live sales data, use the main Report page."
        )}
      </div>
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { i18nKey: "page.advancedReporting.breadcrumb" }
        ]}
        title={t("page.advancedReporting.title")}
        description={t("page.advancedReporting.description")}>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {t(f.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSuperAdmin && (
          <Select value={store} onValueChange={setStore}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("page.advancedReporting.store.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <ExportButtons
          reportKey={TAB_KEY[activeTab]}
          buildParams={() => reportParams}
          disabled={!storeId}
        />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sales">{t("page.advancedReporting.tabs.sales")}</TabsTrigger>
          <TabsTrigger value="product">{t("page.advancedReporting.tabs.product")}</TabsTrigger>
          <TabsTrigger value="category">{t("page.advancedReporting.tabs.category")}</TabsTrigger>
          <TabsTrigger value="kasir">{t("page.advancedReporting.tabs.kasir")}</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          {!storeId ? (
            <NoStore />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  {
                    icon: DollarSign,
                    labelKey: "page.advancedReporting.kpi.totalSales",
                    value: formatCurrency(sumDaily("totalPenjualanBersih"))
                  },
                  {
                    icon: Package,
                    labelKey: "page.advancedReporting.kpi.totalTransactions",
                    value: formatNumber(sumDaily("totalTransaksi"))
                  },
                  {
                    icon: Users,
                    labelKey: "page.advancedReporting.kpi.totalCustomers",
                    value: formatNumber(sumDaily("totalCovers"))
                  },
                  {
                    icon: TrendingUp,
                    labelKey: "page.advancedReporting.kpi.netProfit",
                    value: formatCurrency(sumDaily("netProfit"))
                  }
                ].map((kpi) =>
                  salesLoading ? (
                    <Skeleton key={kpi.labelKey} className="h-24 rounded-lg" />
                  ) : (
                    <StatCard
                      key={kpi.labelKey}
                      icon={kpi.icon}
                      label={t(kpi.labelKey)}
                      value={kpi.value}
                    />
                  )
                )}
              </div>
              {reportTable("sales", "page.advancedReporting.table.salesTitle")}
            </>
          )}
        </TabsContent>

        <TabsContent value="product">
          {reportTable("product", "page.advancedReporting.table.productTitle")}
        </TabsContent>

        <TabsContent value="category">
          {reportTable("category", "page.advancedReporting.table.categoryTitle")}
        </TabsContent>

        <TabsContent value="kasir">
          {reportTable("kasir", "page.advancedReporting.table.kasirTitle")}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReporting;

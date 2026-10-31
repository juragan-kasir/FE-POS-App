import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { RefreshCw, Store, CalendarDays, Building2, Info, BellRing, Calendar } from "lucide-react";
import { getSuperAdminDashboard } from "@/services/dashboard";
import { getUpcomingPayments } from "@/services/expense";
import { getAllProductTable } from "@/services/product";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import AbortController from "@/components/organism/abort-controller";
import KpiCards from "@/components/dashboard-super-admin/KpiCards";
import SalesTrendChart from "@/components/dashboard-super-admin/SalesTrendChart";
import PaymentBreakdown from "@/components/dashboard-super-admin/PaymentBreakdown";
import StorePerformance from "@/components/dashboard-super-admin/StorePerformance";
import FinanceSection from "@/components/dashboard-super-admin/FinanceSection";
import OperationsSection from "@/components/dashboard-super-admin/OperationsSection";
import CustomersSection from "@/components/dashboard-super-admin/CustomersSection";
import ActivitySection from "@/components/dashboard-super-admin/ActivitySection";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import { buildDashboardQueryParams } from "@/lib/dashboard-query";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";
import PosWelcomeModal from "@/components/organism/PosWelcomeModal";
import { usePosWelcome } from "@/hooks/usePosWelcome";

const PRESETS = ["7d", "30d", "thisMonth", "lastMonth", "all"];

const getRange = (key) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "7d") {
    return {
      startDate: new Date(todayStart.getTime() - 6 * 86400000).toISOString(),
      endDate: now.toISOString()
    };
  }
  if (key === "30d") {
    return {
      startDate: new Date(todayStart.getTime() - 29 * 86400000).toISOString(),
      endDate: now.toISOString()
    };
  }
  if (key === "thisMonth") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: now.toISOString()
    };
  }
  if (key === "lastMonth") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString()
    };
  }
  return { startDate: null, endDate: null };
};

const DashboardSuperAdmin = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "id-ID";
  const { activeStoreId, setActiveStore } = useStore();
  const navigate = useNavigate();
  const [preset, setPreset] = useState("thisMonth");
  const [dateRange, setDateRange] = useState(() => getRange("thisMonth"));

  const storeFilter = activeStoreId ? String(activeStoreId) : null;

  const { data: locationsData } = useLocations("active", { staleTime: 5 * 60 * 1000 });
  const locations = locationsData?.data || [];

  const { data: upcomingData } = useQuery(
    ["expense-upcoming", storeFilter],
    () => getUpcomingPayments({ location: storeFilter || undefined, days: 7 }),
    { staleTime: 60000 }
  );
  const upcoming = upcomingData?.data || [];
  const upcomingCount = upcoming.length;

  const queryParams = useMemo(
    () => buildDashboardQueryParams({ storeFilter, dateRange }),
    [storeFilter, dateRange]
  );

  const {
    data: dashData,
    isLoading,
    isError,
    refetch,
    isFetching
  } = useQuery(["dashboard-super-admin", queryParams], () => getSuperAdminDashboard(queryParams), {
    enabled: true,
    staleTime: 0
  });

  const d = dashData?.data || {};
  const summary = d.summary || {};

  // A brand-new account (no store, orders, members or products anywhere) gets the
  // POS welcome once per browser. The summary's activeProducts is not
  // computed by the server, so products are counted from the catalog.
  const { data: productCountData, isSuccess: productCountLoaded } = useQuery(
    ["dashboard-super-admin-product-count"],
    () => getAllProductTable({ location: "", page: 1, limit: 1, statusProduct: "all" }),
    { staleTime: 5 * 60 * 1000, retry: 1 }
  );
  // get-product-all reports the catalog size as stats.total (whatever the
  // status filter) and the filtered count as pagination.totalItems.
  const productTotal = Number(
    productCountData?.stats?.total ?? productCountData?.pagination?.totalItems ?? 0
  );
  const { data: anyStoreData, isSuccess: anyStoreLoaded } = useLocations("all", {
    staleTime: 5 * 60 * 1000
  });
  const storeCount = (anyStoreData?.data || []).length;
  const welcome = usePosWelcome(
    !isLoading &&
      !isError &&
      productCountLoaded &&
      anyStoreLoaded &&
      storeCount === 0 &&
      Number(summary.orders || 0) === 0 &&
      Number(summary.revenue || 0) === 0 &&
      Number(summary.totalMembers || 0) === 0 &&
      productTotal === 0
  );
  const selectedStoreName = locations.find((l) => String(l.id) === String(storeFilter))?.name;

  // The period label follows the active language, so it is derived here
  // instead of being stored with the range.
  const rangeLabel = t(`page.dashboardSuperAdmin.range.${preset}`, {
    month: new Date().toLocaleDateString(locale, { month: "long", year: "numeric" })
  });

  useEffect(() => {
    document.title = t("page.dashboardSuperAdmin.documentTitle");
  }, [t]);

  const handlePreset = (key) => {
    setPreset(key);
    setDateRange(getRange(key));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.dashboardSuperAdmin.title")}
        description={t("page.dashboardSuperAdmin.subtitle")}
        dynamicInfo={false}>
        <div className="flex bg-muted rounded-lg p-0.5">
          {PRESETS.map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => handlePreset(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                preset === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {t(`page.dashboardSuperAdmin.preset.${key}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Store size={16} className="text-muted-foreground shrink-0" />
          <Select
            value={storeFilter || "all"}
            onValueChange={(v) => {
              if (v === "all") setActiveStore("", "");
              else setActiveStore(v, "");
            }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("page.dashboardSuperAdmin.allStores")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("page.dashboardSuperAdmin.allStores")}</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => refetch()}
          disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          {t("page.dashboardSuperAdmin.reload")}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 capitalize">
          <CalendarDays size={13} />
          {rangeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Building2 size={13} />
          {storeFilter
            ? selectedStoreName ||
              t("page.dashboardSuperAdmin.meta.storeFallback", { id: storeFilter })
            : t("page.dashboardSuperAdmin.meta.allStores")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={13} />
          {t("page.dashboardSuperAdmin.meta.period")}{" "}
          {dateRange.startDate
            ? `${new Date(dateRange.startDate).toLocaleDateString(locale)} – ${new Date(
                dateRange.endDate
              ).toLocaleDateString(locale)}`
            : t("page.dashboardSuperAdmin.meta.allTime")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Info size={13} />
          {t("page.dashboardSuperAdmin.meta.activeStores", { count: d.meta?.storeCount || 0 })}
        </span>
      </div>

      {upcomingCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <BellRing size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t("page.expense.upcoming.title")}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {t("page.expense.list.upcomingDesc", { count: upcomingCount })}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {upcoming.slice(0, 5).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => navigate(`/detail-expense?id=${p.id}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-background border border-amber-300 dark:border-amber-700 text-xs font-medium text-amber-800 dark:text-amber-200 hover:border-amber-400 transition-colors">
                  <Calendar size={12} className="shrink-0" />
                  <span className="truncate max-w-[180px]">{p.description || "-"}</span>
                  <span className="text-amber-500 dark:text-amber-400 whitespace-nowrap">
                    · {t("page.expense.upcoming.dueIn")}{" "}
                    {Math.ceil((new Date(p.nextDueDate).getTime() - Date.now()) / 86400000)}{" "}
                    {t("page.expense.upcoming.days")}
                  </span>
                  {p.storeName && (
                    <span className="text-amber-500 dark:text-amber-400 whitespace-nowrap">
                      · {p.storeName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <>
          <KpiCards summary={summary} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <SalesTrendChart kpiTrend={d.kpiTrend} filterLabel={rangeLabel} />
            <PaymentBreakdown paymentBreakdown={d.paymentBreakdown} />
          </div>

          <StorePerformance storePerformance={d.storePerformance} totalRevenue={summary.revenue} />

          <FinanceSection finance={d.finance} summary={summary} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <OperationsSection operations={d.operations} />
            </div>
            <div className="lg:col-span-4">
              <CustomersSection customers={d.customers} />
            </div>
          </div>

          <ActivitySection activity={d.activity} />

          <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
            <span>
              {t("page.dashboardSuperAdmin.footer.totalRevenue")}{" "}
              <span className="font-semibold text-foreground">
                {formatCurrencyRupiah(summary.revenue)}
              </span>
            </span>
            <span>
              {t("page.dashboardSuperAdmin.footer.summary", {
                orders: summary.orders,
                items: summary.itemsSold,
                members: summary.totalMembers
              })}
            </span>
          </div>
        </>
      )}
      <PosWelcomeModal open={welcome.open} onOpenChange={welcome.onOpenChange} />
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 bg-card rounded-xl border border-border p-5">
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-3 w-56 mb-4" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
      <div className="lg:col-span-4 bg-card rounded-xl border border-border p-5">
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-3 w-56 mb-4" />
        <Skeleton className="h-[180px] w-full rounded-lg" />
        <Skeleton className="h-4 w-full mt-4" />
        <Skeleton className="h-4 w-full mt-2" />
      </div>
    </div>
    <div className="bg-card rounded-xl border border-border p-5">
      <Skeleton className="h-5 w-56 mb-4" />
      <Skeleton className="h-[260px] w-full rounded-lg" />
    </div>
    <div className="bg-card rounded-xl border border-border p-5">
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="h-[280px] w-full rounded-lg" />
    </div>
  </div>
);

export default DashboardSuperAdmin;

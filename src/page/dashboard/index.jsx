import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { safeGet } from "@/lib/safe-lookup";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { useCookies } from "react-cookie";
import {
  Eye,
  UtensilsCrossed,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Target,
  Wallet,
  RefreshCw,
  Banknote,
  QrCode,
  CreditCard,
  ArrowLeftRight,
  BarChart3,
  PackageSearch,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import AbortController from "@/components/organism/abort-controller";
import PosWelcomeModal from "@/components/organism/PosWelcomeModal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import { getAPDashboard } from "@/services/purchase-payment";
import { getDashboardSummary } from "@/services/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSession } from "@/hooks/useUserSession";
import { hasMenuAccess } from "@/utils/permission";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { key: "daily", label: "Harian" },
  { key: "weekly", label: "Mingguan" },
  { key: "monthly", label: "Bulanan" }
];

const statusBadge = (status) => {
  const s = (status || "Paid").toLowerCase();
  const styles = {
    paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  };
  const dotColors = {
    paid: "bg-green-500",
    completed: "bg-green-500",
    pending: "bg-yellow-500",
    cancelled: "bg-red-500"
  };
  const key = Object.keys(styles).find((k) => s.includes(k)) || "paid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${safeGet(styles, key, "")}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${safeGet(dotColors, key, "bg-green-500")}`} />
      {status}
    </span>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const store = cookie?.store;
  const { t, i18n } = useTranslation();
  const user = useUserSession() || cookie?.user || {};
  const [chartFilter, setChartFilter] = useState("weekly");
  const [orderPage, setOrderPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const ORDER_PAGE_SIZE = 5;

  // ponytail: jangan tampilkan widget/aksi yang tidak bisa diakses role ini —
  // mis. role HR "user" melihat kartu & tombol low-stock → terlempar ke
  // /low-stock-all lalu 403 dari BE.
  const canLowStock = hasMenuAccess(user, "/low-stock-all", ["view"]);
  const canMembers = hasMenuAccess(user, "/member-list", ["view"]);
  const canPos = hasMenuAccess(user, "/home", ["view"]);
  const canSalesReport = hasMenuAccess(user, "/report/sales", ["view"]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return t("page.dashboard.greeting.morning");
    if (h < 15) return t("page.dashboard.greeting.afternoon");
    if (h < 19) return t("page.dashboard.greeting.evening");
    return t("page.dashboard.greeting.night");
  })();

  // ponytail: double-fetch previous period for comparison, single endpoint reuse
  const getPrevDateRange = (filter) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filter === "daily") {
      return {
        prevStart: new Date(todayStart.getTime() - 86400000),
        prevEnd: new Date(todayStart.getTime() - 1)
      };
    }
    if (filter === "monthly") {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { prevStart: prevMonth, prevEnd: prevMonthEnd };
    }
    const daysSinceMonday = (now.getDay() + 6) % 7;
    const monday = new Date(todayStart);
    monday.setDate(todayStart.getDate() - daysSinceMonday);
    return {
      prevStart: new Date(monday.getTime() - 7 * 86400000),
      prevEnd: new Date(monday.getTime() - 1)
    };
  };
  const prevRange = useMemo(() => getPrevDateRange(chartFilter), [chartFilter]);

  const {
    data: dashData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(
    ["dashboard-summary", store, chartFilter, orderPage],
    () =>
      getDashboardSummary({
        store,
        filter: chartFilter,
        page: orderPage,
        pageSize: ORDER_PAGE_SIZE
      }),
    { enabled: true, staleTime: 0 }
  );

  const { data: apData, isLoading: apLoading } = useQuery(
    ["ap-dashboard-summary"],
    getAPDashboard,
    { staleTime: 30000, retry: 1 }
  );

  const { data: prevDashData } = useQuery(
    ["dashboard-prev", store, chartFilter],
    () =>
      getDashboardSummary({
        store,
        startDate: prevRange.prevStart.toISOString(),
        endDate: prevRange.prevEnd.toISOString(),
        page: 1,
        pageSize: 1
      }),
    {}
  );

  useEffect(() => {
    if (dashData) setLastUpdated(new Date());
  }, [dashData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    setLastUpdated(new Date());
  };

  const d = dashData?.data || dashData || {};
  const prev = prevDashData?.data || prevDashData || {};
  const growth = (curr, prev) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

  const totalSales = d.totalSales || 0;
  const dailyTarget = d.dailyTarget || 0;
  const targetPercent =
    dailyTarget > 0 ? Math.min(Math.round((totalSales / dailyTarget) * 100), 999) : 0;
  const totalOrders = d.totalOrders || 0;
  const totalProducts = d.totalProducts || 0;
  const totalMembers = d.totalMembers || 0;
  const averageOrderValue = d.averageOrderValue || 0;
  const netSales = d.netSales || 0;
  const lowStockItems = d.lowStock || 0;

  // ponytail: pengguna baru = data kosong semua → sambut sekali per browser.
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const welcomeSeen = useRef(
    typeof window !== "undefined" && localStorage.getItem("pos-welcome-seen") === "1"
  );
  useEffect(() => {
    if (
      !isLoading &&
      !welcomeSeen.current &&
      totalOrders === 0 &&
      totalProducts === 0 &&
      totalMembers === 0
    ) {
      setWelcomeOpen(true);
    }
  }, [isLoading, totalOrders, totalProducts, totalMembers]);
  const handleWelcomeChange = useCallback((open) => {
    setWelcomeOpen(open);
    if (!open) {
      localStorage.setItem("pos-welcome-seen", "1");
      welcomeSeen.current = true;
    }
  }, []);

  const summaryCards = [
    {
      id: "revenue",
      label: t("page.dashboard.revenue"),
      value: formatCurrencyRupiah(totalSales),
      growth: growth(totalSales, prev.totalSales || 0),
      icon: DollarSign,
      color: "text-primary"
    },
    {
      id: "aov",
      label: t("page.dashboard.averageOrderValue"),
      value: formatCurrencyRupiah(averageOrderValue),
      growth: growth(averageOrderValue, prev.averageOrderValue || 0),
      icon: Wallet,
      color: "text-primary"
    },
    ...(dailyTarget > 0
      ? [
          {
            id: "target",
            label: t("page.dashboard.target") || "Target Harian",
            value: `${targetPercent}%`,
            growth: growth(totalSales, prev.totalSales || 0),
            icon: Target,
            color: "text-emerald-600",
            iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
            progress: targetPercent,
            progressColor: "bg-emerald-500",
            progressLabel: `${formatCurrencyRupiah(totalSales)} / ${formatCurrencyRupiah(dailyTarget)}`
          }
        ]
      : []),
    {
      id: "orders",
      label: t("page.dashboard.orderCount"),
      value: String(totalOrders),
      growth: growth(totalOrders, prev.totalOrders || 0),
      icon: ShoppingCart,
      color: "text-primary"
    },
    {
      id: "netprofit",
      label: t("page.dashboard.netProfit"),
      value: formatCurrencyRupiah(netSales),
      growth: growth(netSales, prev.netSales || 0),
      trendNote: `${t("page.dashboard.expenses")}: ${formatCurrencyRupiah(d.totalExpense || 0)}`,
      icon: Wallet,
      color: "text-emerald-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30"
    },
    {
      id: "products",
      label: t("page.dashboard.activeProducts"),
      value: String(totalProducts),
      growth: growth(totalProducts, prev.totalProducts || 0),
      icon: Package,
      color: "text-primary"
    },
    ...(canMembers
      ? [
          {
            id: "members",
            label: t("page.dashboard.memberCount"),
            value: String(totalMembers),
            growth: growth(totalMembers, prev.totalMembers || 0),
            icon: Users,
            color: "text-primary"
          }
        ]
      : []),
    ...(canLowStock
      ? [
          {
            id: "lowstock",
            label: t("page.dashboard.lowStock"),
            value: String(lowStockItems),
            trend: lowStockItems ? t("page.dashboard.restockNow") : t("page.dashboard.safe"),
            trendUp: !lowStockItems,
            icon: AlertTriangle,
            color: "text-destructive",
            bg: "bg-destructive/5 border-destructive/20"
          }
        ]
      : [])
  ];

  const quickActions = [
    ...(canPos
      ? [
          {
            label: t("page.dashboard.quickKasir"),
            href: "/home",
            icon: ShoppingCart,
            iconBg: "bg-primary/10 text-primary"
          }
        ]
      : []),
    ...(canSalesReport
      ? [
          {
            label: t("page.dashboard.quickReport"),
            href: "/report/sales",
            icon: BarChart3,
            iconBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
          }
        ]
      : []),
    ...(canLowStock
      ? [
          {
            label: t("page.dashboard.quickLowStock"),
            href: "/low-stock-all",
            icon: PackageSearch,
            iconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          }
        ]
      : []),
    ...(canMembers
      ? [
          {
            label: t("page.dashboard.quickMembers"),
            href: "/member-list",
            icon: Users,
            iconBg: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
          }
        ]
      : [])
  ];

  const paymentMeta = {
    cash: { label: t("page.dashboard.payCash"), icon: Banknote },
    transfer: { label: t("page.dashboard.payTransfer"), icon: ArrowLeftRight },
    qris: { label: "QRIS", icon: QrCode },
    qrcode: { label: "QRIS", icon: QrCode },
    card: { label: t("page.dashboard.payCard"), icon: CreditCard },
    kredit: { label: t("page.dashboard.payCard"), icon: CreditCard },
    debit: { label: t("page.dashboard.payCard"), icon: CreditCard }
  };
  const paidMethods = (d.paymentMethods || []).map((m) => {
    const meta = paymentMeta[(m.method || "cash").toLowerCase()] || {
      label: m.method,
      icon: Banknote
    };
    return { ...m, label: meta.label, icon: meta.icon, sales: Number(m.sales) || 0 };
  });
  const maxMethodSales = Math.max(1, ...paidMethods.map((m) => m.sales));

  const rawChart = d.salesChart || [];
  const buildChartData = () => {
    const map = {};
    rawChart.forEach((item) => {
      const dt = new Date(item.date);
      if (chartFilter === "daily") {
        map[dt.getHours()] = Number(item.sales) || 0;
      } else if (chartFilter === "monthly") {
        map[dt.getDate()] = Number(item.sales) || 0;
      } else {
        map[dt.getDay()] = Number(item.sales) || 0;
      }
    });

    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const result = [];

    if (chartFilter === "daily") {
      for (let h = 8; h <= 22; h++) {
        result.push({ day: `${String(h).padStart(2, "0")}:00`, value: safeGet(map, h, 0) });
      }
    } else if (chartFilter === "monthly") {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        result.push({ day: String(d), value: safeGet(map, d, 0) });
      }
    } else {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        result.push({
          day: `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`,
          value: safeGet(map, d.getDay(), 0)
        });
      }
    }
    return result;
  };
  const chartData = buildChartData();
  const chartHasData = chartData.some((item) => item.value > 0);
  const bestSelling = (d.bestSellers || []).slice(0, 5);
  const recentOrdersData = d.recentOrders || {};
  const recentOrders = recentOrdersData.rows || [];
  const recentOrdersTotal = recentOrdersData.total || 0;
  const recentOrdersPages = Math.max(1, Math.ceil(recentOrdersTotal / ORDER_PAGE_SIZE));
  const totalExpense = d.totalExpense || 0;
  const recentExpenses = d.recentExpenses || [];
  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "-";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.dashboard.title")}
        description={`${greeting}, ${user.fullName || user.userName || ""}`}>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            {t("page.dashboard.lastUpdated", {
              time: lastUpdated.toLocaleTimeString(i18n.language === "en" ? "en-US" : "id-ID", {
                hour: "2-digit",
                minute: "2-digit"
              })
            })}
          </span>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh}>
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          {t("page.dashboard.refresh")}
        </Button>
      </PageHeader>

      {isLoading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="p-5">
                <Skeleton className="h-[220px] w-full rounded-lg" />
              </div>
            </div>

            <div className="lg:col-span-4 bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                      <div>
                        <Skeleton className="h-4 w-28 mb-1.5" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="p-5">
                <Skeleton className="h-[220px] w-full rounded-lg" />
              </div>
            </div>

            <div className="lg:col-span-4 bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                      <div>
                        <Skeleton className="h-4 w-28 mb-1.5" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : isError ? (
        <AbortController refetch={refetch} error={error} />
      ) : (
        <>
          <DashboardAlerts apData={apData} isLoading={apLoading} />

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">{t("page.dashboard.title")}</h2>
            <span className="text-xs text-muted-foreground">
              {t("page.dashboard.header.subtitle")}
            </span>
          </div>

          <DashboardStats summaryCards={summaryCards} />

          {/* Quick actions */}
          {quickActions.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((qa) => (
                <button
                  key={qa.href}
                  onClick={() => navigate(qa.href)}
                  className="group bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md hover:ring-2 hover:ring-primary/30 transition-all text-left">
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${qa.iconBg || "bg-primary/10 text-primary"}`}>
                      <qa.icon size={19} />
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-transform"
                    />
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-2.5">{qa.label}</p>
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div
              data-tour="dashboard-chart"
              className="lg:col-span-8 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {t("page.dashboard.chartTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        `page.dashboard.chartSubtitle${chartFilter === "daily" ? "Daily" : chartFilter === "monthly" ? "Monthly" : "Weekly"}`
                      )}
                    </p>
                  </div>
                  <div className="flex bg-muted rounded-lg p-0.5">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setChartFilter(f.key)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          chartFilter === f.key
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded shrink-0">
                    {totalOrders} {t("page.dashboard.chartTotal", { count: totalOrders })}
                  </span>
                </div>
              </div>
              {!chartHasData ? (
                <div className="p-10 h-[81%] flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 size={28} className="mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t("page.dashboard.emptyChart")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 h-[81%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        tickFormatter={(val) => {
                          if (val >= 1000000) return `Rp${(val / 1000000).toFixed(1)}Jt`;
                          if (val >= 1000) return `Rp${(val / 1000).toFixed(0)}K`;
                          return `Rp${val}`;
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px"
                        }}
                        formatter={(value) => [
                          formatCurrencyRupiah(value),
                          t("page.dashboard.revenue")
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        opacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border">
                <h3 className="text-base font-semibold text-foreground">
                  {t("page.dashboard.bestSelling")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("page.dashboard.bestSellingSubtitle")}
                </p>
              </div>
              <div className="divide-y divide-border">
                {bestSelling.length === 0 ? (
                  <div className="p-5 text-sm text-muted-foreground text-center h-[44vh] flex items-center justify-center">
                    {t("page.dashboard.noData")}
                  </div>
                ) : (
                  bestSelling.map((item, i) => {
                    const Icon = item.icon || UtensilsCrossed;
                    return (
                      <div
                        key={item.name || i}
                        className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Icon size={16} />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-foreground">
                              {item.name || item.productName || "-"}
                            </h4>
                            <p className="text-xs text-muted-foreground">{item.category || ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[11px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                            {item.count || item.quantity || 0}x
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t border-border">
                <button
                  onClick={() => navigate("/product-list")}
                  className="w-full text-sm font-semibold text-primary hover:underline inline-flex items-center justify-center gap-1">
                  {t("page.dashboard.seeAllProducts")}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div
              data-tour="dashboard-orders"
              className="lg:col-span-8 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.dashboard.recentOrders")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("page.dashboard.recentOrdersSubtitle")}
                  </p>
                </div>
                <button
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => navigate("/report/sales")}>
                  {t("page.dashboard.viewAll")}
                </button>
              </div>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-5 py-3 font-medium">
                        {t("page.dashboard.table.orderId")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("page.dashboard.table.table")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("page.dashboard.table.customer")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("page.dashboard.items")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("page.dashboard.table.total")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("page.dashboard.table.status")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("page.dashboard.table.time")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("page.dashboard.table.action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-8 text-center text-sm text-muted-foreground">
                          {t("page.dashboard.noOrders")}
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order, i) => (
                        <tr key={order.id || i} className="hover:bg-accent/30 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs font-semibold text-primary">
                            {order.id || order.invoice || "-"}
                          </td>
                          <td className="px-5 py-3.5">
                            {order.table || order.tableName ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {order.tableName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {t("page.cashier.modal.takeAway")}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-foreground">
                            {order.customer || order.memberName || order.customerName || "-"}
                          </td>
                          <td className="px-5 py-3.5">
                            {order.items?.length ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Package size={13} />
                                {t("page.dashboard.itemsCount", { count: order.items.length })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs font-semibold">
                            {formatCurrencyRupiah(order.total || order.totalPrice || 0)}
                          </td>
                          <td className="px-5 py-3.5">{statusBadge(order.status)}</td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                onClick={() => navigate("/report/sales")}>
                                <Eye size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </HorizontalScrollArea>
              {recentOrdersTotal > ORDER_PAGE_SIZE && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{recentOrdersTotal} orders</span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={orderPage <= 1}
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent disabled:opacity-30 disabled:pointer-events-none">
                      {t("common.prev")}
                    </button>
                    {Array.from({ length: recentOrdersPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setOrderPage(p)}
                        className={`px-2.5 py-1 text-xs rounded border ${
                          p === orderPage
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-accent"
                        }`}>
                        {p}
                      </button>
                    ))}
                    <button
                      disabled={orderPage >= recentOrdersPages}
                      onClick={() => setOrderPage((p) => Math.min(recentOrdersPages, p + 1))}
                      className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent disabled:opacity-30 disabled:pointer-events-none">
                      {t("common.next")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              data-tour="dashboard-payment"
              className="lg:col-span-4 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Wallet size={16} className="text-muted-foreground" />
                    {t("page.dashboard.paymentMethods")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("page.dashboard.paymentMethodsSubtitle")}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {paidMethods.length === 0 ? (
                  <div className="p-5 text-sm text-muted-foreground text-center">
                    {t("page.dashboard.noData")}
                  </div>
                ) : (
                  paidMethods.map((m) => {
                    const pct = Math.round((m.sales / maxMethodSales) * 100);
                    return (
                      <div key={m.method || m.label} className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <m.icon size={15} className="text-muted-foreground" />
                            {m.label}
                          </span>
                          <span className="text-xs font-mono font-semibold text-foreground">
                            {formatCurrencyRupiah(m.sales)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {m.orders}x
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div
            data-tour="dashboard-expenses"
            className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Wallet size={16} className="text-muted-foreground" />
                  {t("page.dashboard.recentExpenses")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("page.dashboard.recentExpensesSubtitle")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.dashboard.expenseTotal")}
                  </p>
                  <p className="text-lg font-bold text-destructive">
                    {formatCurrencyRupiah(totalExpense)}
                  </p>
                </div>
                <button
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => navigate("/expense")}>
                  {t("page.dashboard.viewAll")}
                </button>
              </div>
            </div>
            <HorizontalScrollArea>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-5 py-3 font-medium">
                      {t("page.dashboard.expenseTable.description")}
                    </th>
                    <th className="text-left px-5 py-3 font-medium">
                      {t("page.dashboard.expenseTable.category")}
                    </th>
                    <th className="text-left px-5 py-3 font-medium">
                      {t("page.dashboard.expenseTable.store")}
                    </th>
                    <th className="text-left px-5 py-3 font-medium">
                      {t("page.dashboard.expenseTable.date")}
                    </th>
                    <th className="text-right px-5 py-3 font-medium">
                      {t("page.dashboard.expenseTable.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentExpenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-sm text-muted-foreground">
                        {t("page.dashboard.noExpenses")}
                      </td>
                    </tr>
                  ) : (
                    recentExpenses.map((exp, i) => (
                      <tr key={exp.id || i} className="hover:bg-accent/30 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          {exp.description || "-"}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {exp.categoryName || "-"}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {exp.storeName || "-"}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">
                          {formatDate(exp.date)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-destructive">
                          {formatCurrencyRupiah(exp.amount || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </HorizontalScrollArea>
          </div>
        </>
      )}
      <PosWelcomeModal open={welcomeOpen} onOpenChange={handleWelcomeChange} />
    </div>
  );
};

export default Dashboard;

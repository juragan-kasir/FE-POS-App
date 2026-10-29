import React, { useMemo } from "react";
import { formatCurrency, formatNumber, periods } from "@/utils/reportUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, ReceiptText, Users, Store } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import ReportTable from "@/components/organism/ReportTable";

const STORE_COLORS = [
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316"
];

const CustomTooltip = ({ active, payload, label, t }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-card border border-border shadow-lg rounded-xl p-3 text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-mono font-semibold text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-border mt-1.5 pt-1.5 flex justify-between font-semibold text-foreground">
        <span>{t("page.report.sales.revenueTrend")}</span>
        <span className="font-mono">{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

const GlobalSalesTab = ({ t, period, setPeriod, data, isLoading }) => {
  const salesChart = data?.salesChart || [];
  const storeSalesChart = data?.storeSalesChart || [];
  const hasMultipleStores = storeSalesChart.length > 1;

  const dateStoreMap = useMemo(() => {
    if (!hasMultipleStores) return {};
    const map = {};
    for (const store of storeSalesChart) {
      for (const d of store.data) {
        if (!map[d.date]) map[d.date] = {};
        map[d.date][store.storeName] = Number(d.sales) || 0;
      }
    }
    return map;
  }, [storeSalesChart, hasMultipleStores]);

  const chartData = useMemo(() => {
    if (!salesChart.length) return [];
    return salesChart.map((item) => {
      const row = { date: item.date };
      if (hasMultipleStores && dateStoreMap[item.date]) {
        for (const store of storeSalesChart) {
          row[store.storeName] = dateStoreMap[item.date][store.storeName] || 0;
        }
      } else {
        row.total = Number(item.sales) || 0;
      }
      return row;
    });
  }, [salesChart, storeSalesChart, dateStoreMap, hasMultipleStores]);

  if (isLoading) {
    return (
      <div className="space-y-6">
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
        <div className="bg-card rounded-xl border border-border p-6">
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-3 w-56 mb-6" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <Skeleton className="h-4 w-48 mb-4" />
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-3 border-b border-border last:border-0">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20 ml-auto" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              Icon: Banknote,
              labelKey: "page.report.sales.kpi.totalSales",
              value: formatCurrency(data?.totalSales || 0)
            },
            {
              Icon: ReceiptText,
              labelKey: "page.report.sales.kpi.avgTransaction",
              value: formatCurrency(data?.avgTransaction || 0)
            },
            {
              Icon: Users,
              labelKey: "page.report.sales.kpi.totalCustomers",
              value: formatNumber(data?.totalCustomers || 0)
            },
            {
              Icon: Store,
              labelKey: "page.report.sales.kpi.totalOutlets",
              value: formatNumber(data?.totalStores || 0)
            }
          ].map((kpi) => {
            const Icon = kpi.Icon;
            return (
              <div
                key={kpi.labelKey}
                className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Icon size={18} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t(kpi.labelKey)}
                </p>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="w-8 h-1 bg-primary rounded-full mb-2" />
              <h3 className="text-base font-semibold text-foreground">
                {t("page.report.sales.revenueTrend")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("page.report.sales.revenueTrendDesc")}
              </p>
            </div>
            {hasMultipleStores && (
              <div className="flex flex-wrap gap-3">
                {storeSalesChart.map((s, i) => (
                  <div key={s.storeId} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: STORE_COLORS[i % STORE_COLORS.length] }}
                    />
                    <span className="text-xs font-medium text-muted-foreground">{s.storeName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-card border border-border rounded-lg p-1 flex">
              {periods.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setPeriod(p.label)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    period === p.label
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {t(p.dateLabel)}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    {hasMultipleStores ? (
                      storeSalesChart.map((s, i) => (
                        <linearGradient
                          key={s.storeId}
                          id={`gradient-${s.storeId}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1">
                          <stop
                            offset="5%"
                            stopColor={STORE_COLORS[i % STORE_COLORS.length]}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={STORE_COLORS[i % STORE_COLORS.length]}
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      ))
                    ) : (
                      <linearGradient id="gradient-single" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <Tooltip content={<CustomTooltip t={t} />} />
                  {hasMultipleStores ? (
                    storeSalesChart.map((s, i) => (
                      <Area
                        key={s.storeId}
                        type="monotone"
                        dataKey={s.storeName}
                        stackId="1"
                        stroke={STORE_COLORS[i % STORE_COLORS.length]}
                        fill={`url(#gradient-${s.storeId})`}
                        strokeWidth={2}
                      />
                    ))
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="total"
                      stackId="1"
                      stroke="#3B82F6"
                      fill="url(#gradient-single)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                {t("page.report.sales.noData")}
              </div>
            )}
          </div>
        </div>

        <ReportTable
          reportKey="sales"
          params={{ filter: String(period || "").toLowerCase() }}
          title={t("page.report.sales.storePerformance")}
          emptyText={t("page.report.sales.noStoreData")}
        />
      </div>
    </div>
  );
};

export default GlobalSalesTab;

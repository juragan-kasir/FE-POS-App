import React from "react";
import { MapPin, Trophy } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import SectionCard from "./SectionCard";
import { useTranslation } from "react-i18next";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
  "#f97316"
];

const StorePerformance = ({ storePerformance, totalRevenue }) => {
  const { t } = useTranslation();
  const list = storePerformance || [];
  const chartData = list.map((s) => ({
    name: s.storeName,
    revenue: s.revenue,
    color: COLORS[list.indexOf(s) % COLORS.length]
  }));

  return (
    <SectionCard
      icon={Trophy}
      title={t("page.dashboardSuperAdmin.store.title")}
      subtitle={t("page.dashboardSuperAdmin.store.subtitle")}
      bodyClassName="space-y-5">
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("page.dashboardSuperAdmin.store.empty")}
        </p>
      ) : (
        <>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(val) =>
                    val >= 1000000
                      ? `Rp${(val / 1000000).toFixed(1)}${t("page.dashboardSuperAdmin.short.million")}`
                      : `Rp${(val / 1000).toFixed(0)}${t("page.dashboardSuperAdmin.short.thousand")}`
                  }
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
                    t("page.dashboardSuperAdmin.store.col.revenue")
                  ]}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <HorizontalScrollArea className="-mx-5" viewportClassName="px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-3 py-2.5 font-medium rounded-l-lg">
                    {t("page.dashboardSuperAdmin.store.col.store")}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    {t("page.dashboardSuperAdmin.store.col.revenue")}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    {t("page.dashboardSuperAdmin.store.col.orders")}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    {t("page.dashboardSuperAdmin.store.col.aov")}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    {t("page.dashboardSuperAdmin.store.col.expense")}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    {t("page.dashboardSuperAdmin.store.col.net")}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    {t("page.dashboardSuperAdmin.store.col.share")}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium rounded-r-lg">
                    {t("page.dashboardSuperAdmin.store.col.target")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((s, i) => (
                  <tr key={s.storeId} className="hover:bg-accent/30 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-1.5">
                            {s.storeName}
                            {i === 0 && <Trophy size={13} className="text-amber-500" />}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin size={10} />
                            {s.city || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs font-semibold">
                      {formatCurrencyRupiah(s.revenue)}
                    </td>
                    <td className="px-3 py-3 text-right">{s.orders}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">
                      {formatCurrencyRupiah(s.avgOrderValue)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-destructive">
                      {formatCurrencyRupiah(s.expense)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono text-xs font-semibold ${
                        s.net >= 0 ? "text-emerald-600" : "text-destructive"
                      }`}>
                      {formatCurrencyRupiah(s.net)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {totalRevenue > 0 ? (
                        <span className="text-xs font-semibold">
                          {Math.round((s.revenue / totalRevenue) * 100)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {s.targetPercent !== null ? (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            s.targetPercent >= 100
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                          {s.targetPercent}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>
        </>
      )}
    </SectionCard>
  );
};

export default StorePerformance;

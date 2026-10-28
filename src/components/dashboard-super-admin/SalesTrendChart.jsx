import React from "react";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import SectionCard from "./SectionCard";
import { useTranslation } from "react-i18next";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";

const SalesTrendChart = ({ kpiTrend, filterLabel }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "id-ID";
  const revenueLabel = t("page.dashboardSuperAdmin.sales.revenue");
  const ordersLabel = t("page.dashboardSuperAdmin.sales.orders");
  const formatShortRupiah = (val) => {
    if (val >= 1000000)
      return `Rp${(val / 1000000).toFixed(1)}${t("page.dashboardSuperAdmin.short.million")}`;
    if (val >= 1000)
      return `Rp${(val / 1000).toFixed(0)}${t("page.dashboardSuperAdmin.short.thousand")}`;
    return `Rp${val}`;
  };
  const data = (kpiTrend || []).map((d) => ({
    ...d,
    label: d.date
      ? new Date(`${d.date}T00:00:00`).toLocaleDateString(locale, {
          day: "2-digit",
          month: "short"
        })
      : "-"
  }));

  return (
    <SectionCard
      icon={TrendingUp}
      title={t("page.dashboardSuperAdmin.sales.title")}
      subtitle={
        filterLabel
          ? t("page.dashboardSuperAdmin.sales.subtitlePeriod", { period: filterLabel })
          : t("page.dashboardSuperAdmin.sales.subtitle")
      }
      action={
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary/80" /> {revenueLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {ordersLabel}
          </span>
        </div>
      }
      className="lg:col-span-8"
      bodyClassName="h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            minTickGap={16}
          />
          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={formatShortRupiah}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px"
            }}
            formatter={(value, name, item) =>
              item?.dataKey === "revenue" ? [formatCurrencyRupiah(value), name] : [value, name]
            }
            labelFormatter={(label, payload) => {
              const row = payload?.[0]?.payload;
              return row?.date
                ? new Date(`${row.date}T00:00:00`).toLocaleDateString(locale, {
                    weekday: "short",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })
                : label;
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name={revenueLabel}
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            opacity={0.85}
          />
          <Line
            yAxisId="right"
            dataKey="orders"
            name={ordersLabel}
            type="monotone"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </SectionCard>
  );
};

export default SalesTrendChart;

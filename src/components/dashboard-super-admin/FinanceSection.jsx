import React from "react";
import { Wallet, ArrowDownRight, Building2, CalendarClock } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import SectionCard from "./SectionCard";
import { useTranslation } from "react-i18next";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";

const FinanceSection = ({ finance, summary }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "id-ID";
  const million = t("page.dashboardSuperAdmin.short.million");
  const thousand = t("page.dashboardSuperAdmin.short.thousand");
  const miniAmount = (val) =>
    val >= 1000000
      ? `${(val / 1000000).toFixed(1)}${million}`
      : `${(val / 1000).toFixed(0)}${thousand}`;
  const fmtShort = (val) => (val >= 1000 ? `Rp${miniAmount(val)}` : `Rp${val}`);

  const cashFlow = (finance?.cashFlow || []).map((d) => ({
    ...d,
    label:
      d.date && !isNaN(new Date(`${d.date}T00:00:00`).getTime())
        ? new Date(`${d.date}T00:00:00`).toLocaleDateString(locale, {
            day: "2-digit",
            month: "short"
          })
        : "-"
  }));

  const expenseCat = finance?.expenseByCategory || [];
  const expenseTotal = expenseCat.reduce((s, r) => s + r.amount, 0);
  const arCustomers = finance?.arByCustomer || [];
  const apPOs = finance?.apOutstandingPOs || [];

  const statBlock = (label, value, sub, color = "text-foreground") => (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <>
      <SectionCard
        icon={Wallet}
        title={t("page.dashboardSuperAdmin.finance.title")}
        subtitle={t("page.dashboardSuperAdmin.finance.subtitle")}
        bodyClassName="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlow}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    minTickGap={16}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={fmtShort}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    formatter={(value, name) => [formatCurrencyRupiah(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area
                    type="monotone"
                    dataKey="inflow"
                    name={t("page.dashboardSuperAdmin.finance.inflow")}
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.18}
                  />
                  <Area
                    type="monotone"
                    dataKey="outflow"
                    name={t("page.dashboardSuperAdmin.finance.outflow")}
                    stackId="1"
                    stroke="#f43f5e"
                    fill="#f43f5e"
                    fillOpacity={0.18}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 gap-3 content-start">
            {statBlock(
              t("page.dashboardSuperAdmin.finance.revenue"),
              formatCurrencyRupiah(summary.revenue),
              t("page.dashboardSuperAdmin.finance.discountTax", {
                discount: miniAmount(summary.discount),
                tax: miniAmount(summary.tax)
              })
            )}
            {statBlock(
              t("page.dashboardSuperAdmin.finance.expense"),
              formatCurrencyRupiah(summary.totalExpense),
              t("page.dashboardSuperAdmin.finance.categories", { count: expenseCat.length }),
              "text-destructive"
            )}
            {statBlock(
              t("page.dashboardSuperAdmin.finance.netProfit"),
              formatCurrencyRupiah(summary.netRevenue),
              t("page.dashboardSuperAdmin.kpi.margin", { value: summary.netMargin }),
              summary.netRevenue >= 0 ? "text-emerald-600" : "text-destructive"
            )}
            {statBlock(
              t("page.dashboardSuperAdmin.kpi.ap"),
              formatCurrencyRupiah(finance?.ap?.outstanding || 0),
              t("page.dashboardSuperAdmin.finance.apUnpaid", { count: finance?.ap?.count || 0 }),
              "text-amber-600"
            )}
            {statBlock(
              t("page.dashboardSuperAdmin.kpi.ar"),
              formatCurrencyRupiah(finance?.ar?.outstanding || 0),
              t("page.dashboardSuperAdmin.finance.invoices", { count: finance?.ar?.count || 0 }),
              "text-orange-600"
            )}
            {statBlock(
              t("page.dashboardSuperAdmin.finance.apPaid"),
              formatCurrencyRupiah(finance?.ap?.paidInRange || 0),
              t("page.dashboardSuperAdmin.finance.apPaidSub"),
              "text-emerald-600"
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-5 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ArrowDownRight size={13} className="text-emerald-600" />
              {t("page.dashboardSuperAdmin.finance.expenseByCategory")}
            </p>
            <div className="space-y-2.5">
              {expenseCat.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("page.dashboardSuperAdmin.finance.noExpense")}
                </p>
              )}
              {expenseCat.map((r) => {
                const pct = expenseTotal > 0 ? Math.round((r.amount / expenseTotal) * 100) : 0;
                return (
                  <div key={r.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{r.category}</span>
                      <span className="font-mono text-xs font-semibold">
                        {pct}% · {formatCurrencyRupiah(r.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-destructive/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 size={13} className="text-orange-600" />
              {t("page.dashboardSuperAdmin.finance.arByCustomer")}
            </p>
            <div className="space-y-2">
              {arCustomers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("page.dashboardSuperAdmin.finance.noAr")}
                </p>
              )}
              {arCustomers.map((r) => (
                <div
                  key={r.customer}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.customer}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("page.dashboardSuperAdmin.finance.invoices", { count: r.count })}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-orange-600">
                    {formatCurrencyRupiah(r.outstanding)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CalendarClock size={13} className="text-amber-600" />
              {t("page.dashboardSuperAdmin.finance.apBySupplier")}
            </p>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {apPOs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("page.dashboardSuperAdmin.finance.noAp")}
                </p>
              )}
              {apPOs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{r.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.storeName || "—"}
                      {r.dueDate
                        ? ` · ${t("page.dashboardSuperAdmin.finance.dueDate", {
                            date: new Date(r.dueDate).toLocaleDateString(locale)
                          })}`
                        : ""}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-amber-600">
                    {formatCurrencyRupiah(r.outstanding)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
};

export default FinanceSection;

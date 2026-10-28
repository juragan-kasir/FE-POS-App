import React from "react";
import { CreditCard } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import SectionCard from "./SectionCard";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import { useTranslation } from "react-i18next";
import { PAYMENT_METHOD_META, paymentMethodMeta } from "@/utils/payment";

const PaymentBreakdown = ({ paymentBreakdown }) => {
  const { t } = useTranslation();
  // Unknown codes take the UNRECONCILED label, as paymentMethodMeta does.
  const methodLabel = (code) =>
    t(
      `page.dashboardSuperAdmin.payment.method.${
        Object.prototype.hasOwnProperty.call(PAYMENT_METHOD_META, code) ? code : "UNRECONCILED"
      }`
    );
  // Buckets are canonical tender codes (+ UNRECONCILED) from the API.
  const byType = (paymentBreakdown?.byType || []).map((r) => ({
    ...r,
    label: methodLabel(r.type),
    color: paymentMethodMeta(r.type).color
  }));
  const byMethod = paymentBreakdown?.byMethod || [];
  const total = paymentBreakdown?.totalPayments || 0;

  return (
    <SectionCard
      icon={CreditCard}
      title={t("page.dashboardSuperAdmin.payment.title")}
      subtitle={t("page.dashboardSuperAdmin.payment.subtitle")}
      className="lg:col-span-4"
      bodyClassName="flex flex-col">
      <div className="h-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={byType}
              dataKey="amount"
              nameKey="label"
              innerRadius={48}
              outerRadius={75}
              paddingAngle={3}
              strokeWidth={0}>
              {byType.map((entry) => (
                <Cell key={entry.type} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px"
              }}
              formatter={(value, name) => [formatCurrencyRupiah(value), name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5 mt-3">
        {byType.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("page.dashboardSuperAdmin.payment.empty")}
          </p>
        )}
        {byType.map((r) => {
          const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
          return (
            <div key={r.type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  {r.label}
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {pct}% · {formatCurrencyRupiah(r.amount)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: r.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {byMethod.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("page.dashboardSuperAdmin.payment.methodDetail")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {byMethod.map((m) => {
              const code = m.bucket ?? m.method;
              const meta = paymentMethodMeta(code);
              // A stored value that is not itself canonical (legacy alias or
              // unreconciled tender) is shown next to its label for tracing.
              const showStoredValue = code !== m.method;
              return (
                <span
                  key={m.method}
                  title={m.method}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs text-foreground">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {methodLabel(code)}
                  {showStoredValue && (
                    <span className="font-mono text-muted-foreground">{m.method}</span>
                  )}
                  <span className="font-mono font-semibold text-muted-foreground tabular-nums">
                    {m.count}x
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default PaymentBreakdown;

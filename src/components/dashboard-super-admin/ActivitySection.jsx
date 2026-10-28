import React from "react";
import {
  Activity,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  ScrollText,
  Store
} from "lucide-react";
import SectionCard from "./SectionCard";
import { useTranslation } from "react-i18next";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";

const ActivitySection = ({ activity }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "id-ID";

  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("page.dashboardSuperAdmin.activity.justNow");
    if (min < 60) return t("page.dashboardSuperAdmin.activity.minutesAgo", { count: min });
    const hr = Math.floor(min / 60);
    if (hr < 24) return t("page.dashboardSuperAdmin.activity.hoursAgo", { count: hr });
    const day = Math.floor(hr / 24);
    return t("page.dashboardSuperAdmin.activity.daysAgo", { count: day });
  };

  const fmtDateTime = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "—";

  const orders = activity?.recentOrders || [];
  const payments = activity?.recentPayments || [];
  const audit = activity?.recentAudit || [];

  return (
    <SectionCard
      icon={Activity}
      title={t("page.dashboardSuperAdmin.activity.title")}
      subtitle={t("page.dashboardSuperAdmin.activity.subtitle")}
      bodyClassName="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ShoppingCart size={13} className="text-primary" />{" "}
          {t("page.dashboardSuperAdmin.activity.recentOrders")}
        </p>
        <div className="space-y-2.5">
          {orders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
              {t("page.dashboardSuperAdmin.activity.noOrders")}
            </p>
          )}
          {orders.map((o) => (
            <div key={o.id} className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-primary truncate">
                  {o.orderNumber}
                </span>
                <span className="font-mono text-xs font-semibold shrink-0">
                  {formatCurrencyRupiah(o.totalPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 truncate">
                  <Store size={10} className="shrink-0" />
                  {o.storeName || "—"}
                </span>
                <span className="shrink-0">{timeAgo(o.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{o.cashierName || "—"}</span>
                <span className="text-xs font-semibold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  {o.paymentMethod || o.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ArrowDownLeft size={13} className="text-emerald-600" />
          {t("page.dashboardSuperAdmin.activity.recentPayments")}
        </p>
        <div className="space-y-2.5">
          {payments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
              {t("page.dashboardSuperAdmin.activity.noPayments")}
            </p>
          )}
          {payments.map((p) => (
            <div key={`${p.type}-${p.id}`} className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold truncate">
                  {p.type === "in" ? (
                    <ArrowDownLeft size={12} className="text-emerald-600 shrink-0" />
                  ) : (
                    <ArrowUpRight size={12} className="text-rose-500 shrink-0" />
                  )}
                  {p.ref || "—"}
                </span>
                <span
                  className={`font-mono text-xs font-semibold shrink-0 ${
                    p.type === "in" ? "text-emerald-600" : "text-rose-500"
                  }`}>
                  {p.type === "in" ? "+" : "-"}
                  {formatCurrencyRupiah(p.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{p.party || "—"}</span>
                <span className="shrink-0">{p.method || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 truncate">
                  <Store size={10} className="shrink-0" />
                  {p.storeName || "—"}
                </span>
                <span className="shrink-0">{timeAgo(p.date || p.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ScrollText size={13} className="text-violet-500" />{" "}
          {t("page.dashboardSuperAdmin.activity.auditLog")}
        </p>
        <div className="space-y-2.5">
          {audit.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
              {t("page.dashboardSuperAdmin.activity.noActivity")}
            </p>
          )}
          {audit.map((a) => (
            <div key={a.id} className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {a.userName || t("page.dashboardSuperAdmin.activity.system")}
                </span>
                <span className="text-xs font-semibold uppercase bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-0.5 rounded shrink-0">
                  {a.action}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {a.entity}
                {a.entityId ? ` #${a.entityId}` : ""}
                {a.description ? ` — ${a.description}` : ""}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 truncate">
                  <Store size={10} className="shrink-0" />
                  {a.storeName || "—"}
                </span>
                <span className="shrink-0">{fmtDateTime(a.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
};

export default ActivitySection;

import React from "react";
import {
  Package,
  AlertTriangle,
  Factory,
  Banknote,
  ListOrdered,
  CalendarCheck2,
  Boxes
} from "lucide-react";
import SectionCard from "./SectionCard";
import { useTranslation } from "react-i18next";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import { safeGet } from "@/lib/safe-lookup";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const PROD_STATUS = {
  draft: { color: "text-muted-foreground", bg: "bg-muted" },
  planned: {
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-900/30"
  },
  in_progress: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30"
  },
  completed: {
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30"
  },
  cancelled: {
    color: "text-destructive",
    bg: "bg-destructive/10"
  }
};

const STATUS_KEYS = ["draft", "planned", "in_progress", "completed", "cancelled"];

const OperationsSection = ({ operations }) => {
  const { t } = useTranslation();
  const lowStock = operations?.lowStockItems || [];
  const production = operations?.production || {};
  const register = operations?.cashRegister || { open: 0, closed: 0 };

  const statusCounts = new Map(
    Object.entries(production).filter(([key]) => STATUS_KEYS.includes(key))
  );
  const prodSummary = STATUS_KEYS.map((s) => ({
    status: s,
    count: statusCounts.get(s) || 0,
    ...safeGet(PROD_STATUS, s, {})
  })).filter((item) => item.count > 0);

  return (
    <SectionCard
      icon={Package}
      title={t("page.dashboardSuperAdmin.ops.title")}
      subtitle={t("page.dashboardSuperAdmin.ops.subtitle")}
      bodyClassName="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <Boxes size={12} /> {t("page.dashboardSuperAdmin.ops.stockValue")}
          </p>
          <p className="text-base font-bold text-foreground">
            {formatCurrencyRupiah(operations?.stockValue || 0)}
          </p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <Banknote size={12} /> {t("page.dashboardSuperAdmin.ops.openRegisters")}
          </p>
          <p className="text-base font-bold text-foreground">
            {register.open || 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {t("page.dashboardSuperAdmin.ops.ofTotal", {
                total: register.open + register.closed || 0
              })}
            </span>
          </p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <ListOrdered size={12} /> {t("page.dashboardSuperAdmin.ops.queue")}
          </p>
          <p className="text-base font-bold text-foreground">
            {operations?.queueWaiting || 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {t("page.dashboardSuperAdmin.ops.waiting")}
            </span>
          </p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <CalendarCheck2 size={12} /> {t("page.dashboardSuperAdmin.ops.reservationsToday")}
          </p>
          <p className="text-base font-bold text-foreground">
            {operations?.reservationsToday || 0}
          </p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <Factory size={12} /> {t("page.dashboardSuperAdmin.ops.production")}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {prodSummary.length === 0 && (
              <span className="text-sm text-muted-foreground">
                {t("page.dashboardSuperAdmin.ops.none")}
              </span>
            )}
            {prodSummary.map((s) => (
              <span
                key={s.status}
                className={`px-1.5 py-0.5 rounded text-xs font-semibold ${s.bg} ${s.color}`}>
                {t(`page.dashboardSuperAdmin.ops.status.${s.status}`)}: {s.count}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle size={12} /> {t("page.dashboardSuperAdmin.ops.lowStock")}
          </p>
          <p className="text-base font-bold text-destructive">
            {t("page.dashboardSuperAdmin.ops.itemCount", { count: operations?.lowStockCount || 0 })}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-destructive" />
          {t("page.dashboardSuperAdmin.ops.lowStockItems")}
        </p>
        {lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
            {t("page.dashboardSuperAdmin.ops.allStockSafe")}
          </p>
        ) : (
          <HorizontalScrollArea className="-mx-5" viewportClassName="px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-3 py-2.5 font-medium rounded-l-lg">
                    {t("page.dashboardSuperAdmin.ops.col.item")}
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    {t("page.dashboardSuperAdmin.ops.col.type")}
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    {t("page.dashboardSuperAdmin.ops.col.store")}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium rounded-r-lg">
                    {t("page.dashboardSuperAdmin.ops.col.stockMin")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lowStock.slice(0, 8).map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="hover:bg-accent/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-foreground">{item.name}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${
                          item.type === "product"
                            ? "bg-primary/10 text-primary"
                            : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                        }`}>
                        {item.type === "product"
                          ? t("page.dashboardSuperAdmin.ops.type.product")
                          : t("page.dashboardSuperAdmin.ops.type.ingredient")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.storeName}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      <span className="text-destructive font-semibold">{item.stock}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        / {item.minStock} {item.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollArea>
        )}
      </div>
    </SectionCard>
  );
};

export default OperationsSection;

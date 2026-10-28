import { Sparkles, ShoppingBag, Banknote, Package, RotateCcw } from "lucide-react";
import React from "react";
import { formatCurrency, formatNumber } from "@/utils/reportUtils";
import { Skeleton } from "@/components/ui/skeleton";
import ReportTable from "@/components/organism/ReportTable";

const BestSellerTab = ({ t, data, isLoading }) => {
  const bestSellers = data?.bestSellers || [];
  const summary = data?.summary || {};
  const maxSold = Math.max(...bestSellers.map((p) => p.sold || 0), 1);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <Skeleton className="h-4 w-48 mb-4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2 py-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-3 w-full mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              Icon: ShoppingBag,
              labelKey: "page.report.bestSeller.kpi.unitsSold",
              value: formatNumber(summary.totalUnitsSold || 0)
            },
            {
              Icon: Banknote,
              labelKey: "page.report.bestSeller.kpi.productRevenue",
              value: formatCurrency(summary.totalRevenue || 0)
            },
            {
              Icon: Package,
              labelKey: "page.report.bestSeller.kpi.activeProducts",
              value: formatNumber(summary.activeProducts || 0)
            },
            {
              Icon: RotateCcw,
              labelKey: "page.report.bestSeller.kpi.returnRate",
              value: "0%"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="w-8 h-1 bg-primary rounded-full mb-2" />
            <h3 className="text-base font-semibold text-foreground mb-6">
              {t("page.report.bestSeller.top10Visualization")}
            </h3>
            {bestSellers.length > 0 ? (
              <div className="space-y-4">
                {bestSellers.slice(0, 5).map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {formatNumber(item.sold)} {t("page.report.bestSeller.unit")}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${(item.sold / maxSold) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("page.report.bestSeller.noData")}
              </p>
            )}
          </div>

          {bestSellers[0] && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm">
              <div className="absolute -right-10 -top-10 opacity-10">
                <Sparkles size={180} />
              </div>
              <div className="relative z-10">
                <span className="bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-4 inline-block">
                  {t("page.report.bestSeller.productSpotlight")}
                </span>
                <h4 className="text-lg font-semibold mb-2">{bestSellers[0].name}</h4>
                <p className="text-sm text-white/70 mb-6">
                  {t("page.report.bestSeller.spotlightDesc")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <p className="text-xs text-white/60 uppercase tracking-widest">
                      {t("page.report.bestSeller.share")}
                    </p>
                    <p className="text-lg font-bold">
                      {summary.totalUnitsSold > 0
                        ? `${Math.round((bestSellers[0].sold / summary.totalUnitsSold) * 100)}%`
                        : "0%"}
                    </p>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg">
                    <p className="text-xs text-white/60 uppercase tracking-widest">
                      {t("common.status")}
                    </p>
                    <p className="text-lg font-bold">{t("page.report.bestSeller.lead")}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <ReportTable
          reportKey="bestSeller"
          params={{ limit: 10 }}
          title={t("page.report.bestSeller.productPerformanceTable")}
          emptyText={t("page.report.bestSeller.noData")}
        />
      </div>
    </div>
  );
};

export default BestSellerTab;

import { safeGet } from "@/lib/safe-lookup";
import { getTaxType } from "@/utils/taxDisplay";
import React from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Percent, Edit3, Calendar, Store, User, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTaxConfigById } from "@/services/tax-config";
import PageHeader from "@/components/ui/PageHeader";
import { useStore } from "@/contexts/StoreContext";
import { useUserSession } from "@/hooks/useUserSession";
import { canAccess } from "@/utils/permission";
import EffectiveTaxSummary from "@/page/tax-config/components/EffectiveTaxSummary";
import {
  outletNameFor,
  resolveEffectiveTaxScope,
  scopeForTaxRow,
  taxRowScope
} from "@/utils/taxEffective";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const statusBadge = (status, t) => {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
        {t("common.active")}
      </span>
    );
  if (status === "draft")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        {t("common.draft")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
      {t("common.inactive")}
    </span>
  );
};

const typeBadge = (name, type) => {
  const taxType = getTaxType(name, type);
  const colors = {
    PPN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    PPh: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    "Non-Pajak": "bg-muted text-foreground border-border"
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${safeGet(colors, taxType, colors["Non-Pajak"])}`}>
      {taxType}
    </span>
  );
};

const DetailTaxConfig = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["tax-config", id],
    () => getTaxConfigById({ id }),
    { enabled: !!id }
  );

  const tax = data?.data || data;

  // P1: evaluate the effective tax where this row applies — its own outlet,
  // or the caller's current context for a global row.
  const user = useUserSession();
  const { activeStoreId, activeStoreName, isSuperAdmin } = useStore();
  const { data: locData } = useLocations("active", {
    enabled: !!isSuperAdmin
  });
  const outletLookup = { locations: locData?.data, activeStoreId, activeStoreName };
  const summaryScope = scopeForTaxRow(
    tax,
    resolveEffectiveTaxScope({ isSuperAdmin, storeId: activeStoreId })
  );
  const isGlobalRow = taxRowScope(tax?.store) === "global";

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.taxConfig.detail.notFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.taxConfig.detail.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="outline" onClick={() => navigate("/tax-list")}>
          {t("common.back")}
        </Button>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.taxConfig.list.title"),
            href: "/tax-list",
            i18nKey: "page.taxConfig.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : tax?.name || "-"}
        description={t("page.taxConfig.detail.description")}
        backLink="/tax-list"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate(`/edit-tax?id=${id}`)}>
            <Edit3 size={14} className="mr-1.5" />
            {t("common.edit")}
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2 space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
              <Percent size={16} />
              {t("page.taxConfig.detail.info")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.taxConfig.detail.name")}
                </p>
                <p className="font-medium">{tax?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.taxConfig.detail.id")}
                </p>
                <p className="font-mono text-sm">#{tax?.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.taxConfig.table.type")}
                </p>
                {typeBadge(tax?.name, tax?.type)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.taxConfig.table.rate")}
                </p>
                <p className="font-semibold text-lg">{tax?.rate ?? 0}%</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.taxConfig.detail.descriptionLabel")}
                </p>
                <p className="font-medium">{tax?.description || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.taxConfig.detail.status")}
                </p>
                {statusBadge(tax?.status, t)}
              </div>
              <div data-testid="tax-detail-scope">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.taxConfig.scope.column")}
                </p>
                {isGlobalRow ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe
                        size={14}
                        className="shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="font-medium">{t("page.taxConfig.scope.global")}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("page.taxConfig.scope.globalHint")}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Store
                      size={14}
                      className="shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="font-medium">
                      {outletNameFor(tax?.store, outletLookup) || t("page.taxConfig.scope.outlet")}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-border/50 mt-5 pt-4 grid grid-cols-2 gap-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("common.createdBy")}: {tax?.createdByUser?.fullName || tax?.createdBy || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("common.modifiedBy")}:{" "}
                  {tax?.modifiedByUser?.fullName || tax?.modifiedBy || "-"}
                </span>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                <Calendar size={14} />
                {t("page.taxConfig.detail.createdAt")}
              </div>
              <p className="text-sm font-medium">
                {tax?.createdAt
                  ? new Date(tax.createdAt).toLocaleDateString(dateLocale(), {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "-"}
              </p>
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.taxConfig.detail.updatedAt")}
                </p>
                <p className="text-sm font-medium">
                  {tax?.updatedAt
                    ? new Date(tax.updatedAt).toLocaleDateString(dateLocale(), {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "-"}
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {!isLoading && tax && (
        <EffectiveTaxSummary
          scope={summaryScope}
          outletName={summaryScope?.store ? outletNameFor(summaryScope.store, outletLookup) : null}
          highlightRowId={tax.id}
          canViewDetail={canAccess(user, "/tax-list", "detail")}
        />
      )}
    </div>
  );
};

export default DetailTaxConfig;

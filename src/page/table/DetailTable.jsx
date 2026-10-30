import { safeGet } from "@/lib/safe-lookup";
import React from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sofa, Edit3, Calendar, Store, User, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTableById } from "@/services/table";
import PageHeader from "@/components/ui/PageHeader";
import { dateLocale } from "@/lib/locale";

const statusBadge = (status, t) => {
  const colors = {
    available:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    occupied:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    reserved:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
  };
  const labels = {
    available: t("page.table.status.available"),
    occupied: t("page.table.status.occupied"),
    reserved: t("page.table.status.reserved")
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${safeGet(colors, status, colors.available)}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === "available" ? "bg-green-500" : status === "occupied" ? "bg-red-500" : "bg-amber-500"}`}
      />
      {safeGet(labels, status, labels.available)}
    </span>
  );
};

const DetailTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(["table", id], () => getTableById(id), {
    enabled: !!id
  });

  const table = data?.data || data;

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.table.detail.notFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.table.detail.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="outline" onClick={() => navigate("/table-list")}>
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
            label: t("page.table.list.title"),
            href: "/table-list",
            i18nKey: "page.table.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : table?.name || table?.number || "-"}
        description={t("page.table.detail.description")}
        backLink="/table-list"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate("/table-list")}>
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
              <Sofa size={16} />
              {t("page.table.detail.info")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("page.table.table.name")}</p>
                <p className="font-medium">{table?.name || table?.number || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("page.table.detail.id")}</p>
                <p className="font-mono text-sm">#{table?.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.table.table.capacity")}
                </p>
                <div className="flex items-center gap-2">
                  <Users size={14} className="shrink-0 text-muted-foreground" />
                  <span className="font-medium">
                    {table?.capacity || "-"} {t("page.table.detail.people")}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("page.table.table.area")}</p>
                <span className="font-medium capitalize">
                  {t(`page.table.area.${table?.area || "indoor"}`)}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.table.table.tableType")}
                </p>
                <span className="font-medium capitalize">
                  {t(`page.table.tableType.${table?.tableType || "regular"}`)}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("common.status")}</p>
                {statusBadge(table?.status, t)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("page.table.detail.store")}</p>
                <div className="flex items-center gap-2">
                  <Store size={14} className="shrink-0 text-muted-foreground" />
                  <span className="font-medium">{table?.store?.name || table?.store || "-"}</span>
                </div>
              </div>
            </div>
            <div className="border-t border-border/50 mt-5 pt-4 grid grid-cols-2 gap-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("common.createdBy")}:{" "}
                  {table?.createdByUser?.fullName || table?.createdBy || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("common.modifiedBy")}:{" "}
                  {table?.modifiedByUser?.fullName || table?.modifiedBy || "-"}
                </span>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                <Calendar size={14} />
                {t("page.table.detail.createdAt")}
              </div>
              <p className="text-sm font-medium">
                {table?.createdAt
                  ? new Date(table.createdAt).toLocaleDateString(dateLocale(), {
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
                  {t("page.table.detail.updatedAt")}
                </p>
                <p className="text-sm font-medium">
                  {table?.updatedAt
                    ? new Date(table.updatedAt).toLocaleDateString(dateLocale(), {
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
    </div>
  );
};

export default DetailTable;

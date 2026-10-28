import React from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tags, Edit3, Calendar, User, Store } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDiscountById } from "@/services/discount";
import { useLocations } from "@/queries/useLocations";

const statusBadge = (status, t) => {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
        {t("page.discount.list.active")}
      </span>
    );
  if (status === "draft")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        {t("page.discount.list.draft")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
      {t("page.discount.list.inactive")}
    </span>
  );
};

const DetailDiscount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["discount", id],
    () => getDiscountById(id),
    { enabled: !!id }
  );

  const discount = data?.data || data;

  const { data: locData } = useLocations();
  const locations = locData?.data || [];

  const storeName = discount?.store
    ? locations.find((l) => l.id === discount.store)?.name || `Toko #${discount.store}`
    : t("page.discount.form.storeSection.allStores");

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.discount.edit.idNotFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.discount.edit.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="danger" onClick={() => navigate("/discount-list")}>
          {t("common.back")}
        </Button>
      </div>
    );

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

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
            label: t("page.discount.list.title"),
            href: "/discount-list",
            i18nKey: "page.discount.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : discount?.name || "-"}
        description={t("page.discount.detail.title")}
        backLink="/discount-list"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate(`/edit-discount?id=${id}`)}>
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
              <div className="col-span-2 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-48" />
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
              <Skeleton className="h-4 w-3/4" />
            </Card>
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
              <Tags size={16} />
              {t("page.discount.ui.discountInfo")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.discount.table.status")}
                </p>
                {statusBadge(discount.status, t)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.discount.table.store")}
                </p>
                <p className="font-medium flex items-center gap-1.5">
                  <Store size={14} className="text-muted-foreground" />
                  {storeName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("page.discount.form.type")}</p>
                <p className="font-medium">
                  {discount.type === "percent"
                    ? "Persentase"
                    : discount.type === "nominal"
                      ? "Nominal"
                      : discount.type || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.discount.form.value")}
                </p>
                <p className="font-medium">
                  {discount.value}
                  {discount.type === "percent" ? "%" : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.discount.form.promoCode")}
                </p>
                <p className="font-mono text-sm">{discount.code || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.discount.form.minPurchase")}
                </p>
                <p className="font-medium">
                  {discount.minimumOrder
                    ? `Rp${discount.minimumOrder.toLocaleString("id-ID")}`
                    : "0"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.discount.form.maxDiscount")}
                </p>
                <p className="font-medium">
                  {discount.maximumDiscount
                    ? `Rp${discount.maximumDiscount.toLocaleString("id-ID")}`
                    : "0"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.discount.table.validity")}
                </p>
                <p className="font-medium">
                  {formatDate(discount.startDate)} - {formatDate(discount.endDate)}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.discount.form.description")}
                </p>
                <p className="font-medium">{discount.description || "-"}</p>
              </div>
            </div>
            <div className="border-t border-border/50 mt-5 pt-4 grid grid-cols-2 gap-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("page.discount.table.createdBy")}: {discount.createdByUser?.fullName || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("page.discount.table.modifiedBy")}: {discount.modifiedByUser?.fullName || "-"}
                </span>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Tags size={20} />
              </div>
              <p className="text-2xl font-bold">{discount.usageCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("page.bundle.detail.totalTransactions")}
              </p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                <Calendar size={14} />
                {t("page.backup.createdAt")}
              </div>
              <p className="text-sm font-medium">{formatDate(discount.createdAt)}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                <Calendar size={14} />
                {t("page.discount.ui.modified")}
              </div>
              <p className="text-sm font-medium">{formatDate(discount.updatedAt)}</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailDiscount;

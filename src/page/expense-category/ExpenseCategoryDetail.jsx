import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { Tag, Clock, Edit3 } from "lucide-react";
import { getExpenseCategories } from "@/services/expense";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";

const ExpenseCategoryDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const store = user?.store || "";
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["expense-categories", store],
    () => getExpenseCategories(store || undefined),
    { enabled: !!id }
  );

  const category = useMemo(() => {
    if (!data) return null;
    const list = data?.data || data || [];
    return list.find((item) => String(item.id) === id || String(item._id) === id) || null;
  }, [data, id]);

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.expenseCategory.detail.notFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  const statusStyle =
    category?.status === "active"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : category?.status === "draft"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  const statusLabel =
    category?.status === "active"
      ? t("common.active")
      : category?.status === "draft"
        ? t("common.draft")
        : t("common.inactive");

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.expenseCategory.list.title"),
            href: "/expense-category",
            i18nKey: "page.expenseCategory.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : category?.name || "-"}
        description={t("page.expenseCategory.detail.title")}
        backLink="/expense-category"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate(`/edit-expense-category?id=${id}`)}>
            <Edit3 size={14} className="mr-1.5" />
            {t("common.edit")}
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
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
          </div>
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
      ) : !category ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            {t("page.expenseCategory.detail.categoryNotFound")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.category.form.info")}
                  </h3>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("document.name")}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-1">{category.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("common.status")}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${statusStyle}`}>
                    {statusLabel}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("page.expenseCategory.list.accountCode")}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-primary/10 text-primary mt-1">
                    {category.accountCode || "-"}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("page.role.detail.descLabel")}
                  </p>
                  <p className="text-sm text-foreground mt-1">{category.description || "-"}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-border">
                <Clock size={18} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("page.expenseCategory.ui.systemInformation")}
                </h3>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("page.reservation.createdAt")}
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right">
                    {formatDate(category.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("page.location.table.updatedAt")}
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right">
                    {formatDate(category.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.createdBy")}
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right">
                    {category.createdByUser?.fullName || category.createdByUser?.userName || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("common.modifiedBy")}
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right">
                    {category.modifiedByUser?.fullName || category.modifiedByUser?.userName || "-"}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseCategoryDetail;

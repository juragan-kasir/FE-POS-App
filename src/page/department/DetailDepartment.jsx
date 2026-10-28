import React from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Edit3, Calendar, Store, User, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDepartmentById } from "@/services/department";

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

const DetailDepartment = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["department", id],
    () => getDepartmentById({ id }),
    { enabled: !!id }
  );

  const department = data?.data || data;

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.department.detail.notFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.department.detail.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="danger" onClick={() => navigate("/department-list")}>
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
            label: t("breadcrumb.department"),
            href: "/department-list",
            i18nKey: "breadcrumb.department"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : department?.name || "-"}
        description={t("page.department.detail.description")}
        backLink="/department-list"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate(`/edit-department?id=${id}`)}>
            <Edit3 size={14} className="mr-1.5" />
            {t("common.edit")}
          </Button>
        )}
      </PageHeader>

      {/* Main Content */}
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
          {/* Info Card */}
          <Card className="p-5 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
              <Building2 size={16} />
              {t("page.department.detail.info")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.department.detail.name")}
                </p>
                <p className="font-medium">{department.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.department.detail.id")}
                </p>
                <p className="font-mono text-sm">#{department.id}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.department.detail.descriptionLabel")}
                </p>
                <p className="font-medium">{department.description || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.department.detail.status")}
                </p>
                {statusBadge(department.status, t)}
              </div>
            </div>
            <div className="border-t border-border/50 mt-5 pt-4 grid grid-cols-2 gap-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("common.createdBy")}:{" "}
                  {department.createdByUser?.fullName || department.createdByUser?.userName || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User size={13} className="shrink-0" />
                <span>
                  {t("common.modifiedBy")}:{" "}
                  {department.modifiedByUser?.fullName ||
                    department.modifiedByUser?.userName ||
                    "-"}
                </span>
              </div>
            </div>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                <Users size={14} />
                {t("page.department.detail.totalPosition")}
                <span className="ml-auto text-primary font-bold text-sm">
                  {department.positionCount ?? 0}
                </span>
              </div>
              <div className="space-y-2">
                {department.positions?.length > 0 ? (
                  department.positions.map((pos) => (
                    <div key={pos.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{pos.name}</span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-tight px-2 py-0.5 rounded-full border ${
                          pos.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                            : pos.status === "draft"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                        }`}>
                        {pos.status === "active"
                          ? t("common.active")
                          : pos.status === "draft"
                            ? t("common.draft")
                            : t("common.inactive")}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                <Calendar size={14} />
                {t("page.department.detail.createdAt")}
              </div>
              <p className="text-sm font-medium">
                {department.createdAt
                  ? new Date(department.createdAt).toLocaleDateString("id-ID", {
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
                  {t("page.department.detail.updatedAt")}
                </p>
                <p className="text-sm font-medium">
                  {department.updatedAt
                    ? new Date(department.updatedAt).toLocaleDateString("id-ID", {
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
            {department.store && (
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <Store size={14} />
                  {t("page.department.detail.store")}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Store size={14} className="shrink-0 text-muted-foreground" />
                  <span>{department.store}</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailDepartment;

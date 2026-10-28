import React from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, Edit3, Calendar, User, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getShiftTemplateById } from "@/services/shiftTemplate";
import { Loading } from "@/components/ui/loading";
import PageHeader from "@/components/ui/PageHeader";
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

const DetailShiftTemplate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["shift-template-detail", id],
    () => getShiftTemplateById({ id }),
    { enabled: !!id }
  );

  const template = data?.data || data;

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.shiftTemplate.detail.idNotFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.shiftTemplate.detail.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="danger" onClick={() => navigate("/shift-template-list")}>
          {t("common.back")}
        </Button>
      </div>
    );

  if (isLoading) return <Loading fullscreen size="lg" label={t("common.loadingData")} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Breadcrumb */}
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.shiftTemplate.list.title"),
            href: "/shift-template-list",
            i18nKey: "page.shiftTemplate.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={template?.name || "-"}
        description={t("page.shiftTemplate.edit.description")}
        backLink="/shift-template-list"
        dynamicInfo={false}>
        <Button variant="general" onClick={() => navigate(`/edit-shift-template?id=${id}`)}>
          <Edit3 size={14} className="mr-1.5" />
          {t("common.edit")}
        </Button>
      </PageHeader>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Info Card */}
        <Card className="p-5 col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
            <BadgeCheck size={16} />
            {t("page.shiftTemplate.detail.info", "Informasi Template")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t("page.shiftTemplate.detail.id", "ID")}
              </p>
              <p className="font-mono text-sm">#{template.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t("page.shiftTemplate.form.name")}
              </p>
              <p className="font-medium">{template.name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t("page.shiftTemplate.form.startTime")}
              </p>
              <p className="font-mono font-medium text-lg">
                {template.startTime?.slice(0, 5) || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t("page.shiftTemplate.form.endTime")}
              </p>
              <p className="font-mono font-medium text-lg">
                {template.endTime?.slice(0, 5) || "-"}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">
                {t("page.shiftTemplate.form.description")}
              </p>
              <p className="font-medium">{template.description || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t("page.shiftTemplate.table.status")}
              </p>
              {statusBadge(template.status, t)}
            </div>
          </div>
          <div className="border-t border-border/50 mt-5 pt-4 grid grid-cols-2 gap-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <User size={13} className="shrink-0" />
              <span>
                {t("common.createdBy")}:{" "}
                {template.createdByUser?.fullName || template.createdByUser?.userName || "-"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User size={13} className="shrink-0" />
              <span>
                {t("common.modifiedBy")}:{" "}
                {template.modifiedByUser?.fullName || template.modifiedByUser?.userName || "-"}
              </span>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              <Clock size={14} />
              {t("page.shiftTemplate.detail.timeInfo", "Jadwal Waktu")}
            </div>
            <div className="space-y-3">
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.shiftTemplate.form.startTime")}
                </p>
                <p className="text-xl font-bold font-mono text-primary">
                  {template.startTime?.slice(0, 5) || "-"}
                </p>
              </div>
              <div className="flex justify-center">
                <div className="w-8 h-px bg-border" />
              </div>
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.shiftTemplate.form.endTime")}
                </p>
                <p className="text-xl font-bold font-mono text-primary">
                  {template.endTime?.slice(0, 5) || "-"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              <Calendar size={14} />
              {t("page.shiftTemplate.detail.createdAt", "Dibuat")}
            </div>
            <p className="text-sm font-medium">
              {template.createdAt
                ? new Date(template.createdAt).toLocaleDateString(dateLocale(), {
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
                {t("page.shiftTemplate.detail.updatedAt", "Diperbarui")}
              </p>
              <p className="text-sm font-medium">
                {template.updatedAt
                  ? new Date(template.updatedAt).toLocaleDateString(dateLocale(), {
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
    </div>
  );
};

export default DetailShiftTemplate;

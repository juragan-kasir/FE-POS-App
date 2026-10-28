import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import {
  Plane,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  FileDown,
  MapPin,
  User,
  Store,
  Wallet,
  Receipt,
  CalendarDays,
  History,
  UserCheck,
  Info
} from "lucide-react";
import { getBusinessTripById } from "@/services/business-trip";
import { PrintButton } from "@/components/document/FormalDocument";
import SpdDocument from "@/components/document/SpdDocument";
import BusinessTripDownloadModal from "@/components/organism/business-trip-download-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const statusBadge = {
  draft: {
    label: "businessTrip.status.draft",
    class: "bg-muted text-foreground",
    icon: FileText
  },
  pending: {
    label: "businessTrip.status.pending",
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    icon: Clock
  },
  approved: {
    label: "businessTrip.status.approved",
    class: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    icon: CheckCircle2
  },
  rejected: {
    label: "businessTrip.status.rejected",
    class: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    icon: XCircle
  }
};

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (v) => {
  const d = toDate(v);
  return d
    ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "-";
};

const formatDateTime = (v) => {
  const d = toDate(v);
  return d
    ? d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";
};

const DefRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-2 text-sm">
    <Icon size={14} className="text-muted-foreground shrink-0 mt-0.5" />
    <span className="text-muted-foreground shrink-0">{label}:</span>
    <span className="font-medium min-w-0">{children || "-"}</span>
  </div>
);

const CardTitle = ({ icon: Icon, children }) => (
  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
    <Icon size={16} className="text-muted-foreground" />
    {children}
  </h3>
);

const DetailBusinessTrip = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [downloadOpen, setDownloadOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery(
    ["business-trip-detail", id],
    () => getBusinessTripById(id),
    { enabled: !!id }
  );
  const trip = data?.data;
  const st = statusBadge[trip?.status] || statusBadge.draft;
  const StatusIcon = st.icon;

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (!trip && !isLoading) {
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
              label: t("page.businessTrip.list.title"),
              href: "/business-trip",
              i18nKey: "page.businessTrip.list.title"
            },
            { label: t("common.notFound"), i18nKey: "common.notFound" }
          ]}
          title={t("common.notFound")}
          backLink="/business-trip"
        />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Plane className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t("common.notFound")}</p>
          <Button variant="general" onClick={() => navigate("/business-trip")}>
            <ArrowLeft size={16} className="mr-2" />
            {t("page.businessTrip.list.title")}
          </Button>
        </div>
      </div>
    );
  }

  const brokenTotal = (trip?.budgetItems || []).reduce((s, b) => s + Number(b.total || 0), 0);
  const declaredBudget = Number(trip?.budget || 0);
  const budgetMismatch = declaredBudget > 0 && brokenTotal !== declaredBudget;
  const employees = trip?.employees?.length ? trip.employees : [];

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
            label: t("page.businessTrip.list.title"),
            href: "/business-trip",
            i18nKey: "page.businessTrip.list.title"
          },
          {
            label: trip?.tripNumber || t("page.businessTrip.detail.title"),
            i18nKey: "page.businessTrip.detail.title"
          }
        ]}
        title={trip?.tripNumber || "-"}
        description={t("page.businessTrip.detail.subtitle")}
        backLink="/business-trip">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${st.class}`}>
          <StatusIcon size={14} />
          {t(st.label)}
        </span>
        <Button
          variant="general"
          size="sm"
          className="gap-1.5"
          onClick={() => setDownloadOpen(true)}
          disabled={!trip}>
          <FileDown size={14} />
          <span className="hidden sm:inline">{t("page.businessTrip.detail.download")}</span>
        </Button>
        <PrintButton />
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
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
              </div>
            </Card>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-24 w-full" />
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </Card>
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6">
              <CardTitle icon={Info}>{t("page.businessTrip.detail.sectionTrip")}</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <DefRow icon={Store} label={t("page.businessTrip.detail.store")}>
                  {trip.storeData?.name || "-"}
                </DefRow>
                <DefRow icon={MapPin} label={t("page.businessTrip.detail.destination")}>
                  {trip.destination}
                </DefRow>
                <DefRow icon={FileText} label={t("page.businessTrip.detail.purpose")}>
                  {trip.tripPurpose}
                </DefRow>
                <DefRow icon={CalendarDays} label={t("page.businessTrip.detail.departureDate")}>
                  {formatDate(trip.departureDate)}
                </DefRow>
                <DefRow icon={CalendarDays} label={t("page.businessTrip.detail.returnDate")}>
                  {formatDate(trip.returnDate)}
                </DefRow>
              </div>
              {trip.notes && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm">
                  <p className="text-muted-foreground mb-1">
                    {t("page.businessTrip.detail.notes")}:
                  </p>
                  <p className="whitespace-pre-wrap">{trip.notes}</p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <CardTitle icon={Receipt}>{t("page.businessTrip.rab.breakdownTitle")}</CardTitle>
              <HorizontalScrollArea className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 uppercase text-xs text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">#</th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.businessTrip.rab.komponen")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("page.businessTrip.rab.qty")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("page.businessTrip.rab.satuan")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("page.businessTrip.rab.tarif")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("page.businessTrip.rab.total")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(trip?.budgetItems?.length ? trip.budgetItems : []).map((b, i) => (
                      <tr key={b.id || i} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-3 px-4 font-medium">{b.komponen || "-"}</td>
                        <td className="py-3 px-4 text-right">{b.qty != null ? b.qty : "-"}</td>
                        <td className="py-3 px-4 text-right">{b.satuan || "-"}</td>
                        <td className="py-3 px-4 text-right">
                          {b.tarif != null ? Number(b.tarif).toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {b.total != null ? Number(b.total).toLocaleString("id-ID") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30 font-bold">
                      <td colSpan={5} className="py-3 px-4 text-right">
                        {t("page.businessTrip.rab.totalEstimate")}
                      </td>
                      <td className="py-3 px-4 text-right text-primary">
                        {brokenTotal.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </HorizontalScrollArea>
              {budgetMismatch && (
                <p className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-900/40">
                  <Wallet size={14} className="shrink-0 mt-0.5" />
                  <span>
                    {t("page.businessTrip.rab.mismatchWarning")}:{" "}
                    {t("page.businessTrip.rab.mismatchDiff", {
                      diff: `Rp ${Math.abs(declaredBudget - brokenTotal).toLocaleString("id-ID")}`,
                      over: declaredBudget - brokenTotal < 0 ? t("common.over") : t("common.under")
                    })}
                  </span>
                </p>
              )}
            </Card>

            <Card className="p-6">
              <CardTitle icon={History}>{t("page.businessTrip.detail.systemTitle")}</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <DefRow icon={UserCheck} label={t("page.businessTrip.detail.createdBy")}>
                  {trip.createdByUser?.fullName || "-"}
                </DefRow>
                <DefRow icon={CalendarDays} label={t("page.businessTrip.detail.created")}>
                  {formatDateTime(trip.createdAt)}
                </DefRow>
                <DefRow icon={UserCheck} label={t("page.businessTrip.detail.updatedBy")}>
                  {trip.modifiedByUser?.fullName || "-"}
                </DefRow>
                <DefRow icon={CalendarDays} label={t("page.businessTrip.detail.updated")}>
                  {formatDateTime(trip.updatedAt)}
                </DefRow>
                <DefRow icon={UserCheck} label={t("page.businessTrip.detail.approvedBy")}>
                  {trip.approvedByUser?.fullName || "-"}
                </DefRow>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-6">
              <CardTitle icon={User}>{t("page.businessTrip.detail.sectionEmployee")}</CardTitle>
              <div className="space-y-4">
                {employees.length ? (
                  employees.map((e) => (
                    <div
                      key={e.id || e.employeeId}
                      className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User size={14} className="text-muted-foreground shrink-0" />
                        <span className="font-medium">
                          {e.employeeUser?.fullName || e.employeeName || "-"}
                        </span>
                      </div>
                      <div className="mt-1 pl-6 text-sm text-muted-foreground">
                        {e.employeePosition || "-"}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <CardTitle icon={Wallet}>{t("page.businessTrip.rab.cashAdvance")}</CardTitle>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("page.businessTrip.rab.declared")}
                  </span>
                  <span className="font-medium">
                    {trip.budget != null
                      ? `Rp ${Number(trip.budget).toLocaleString("id-ID")}`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("page.businessTrip.rab.totalEstimate")}
                  </span>
                  <span className="font-medium">{brokenTotal.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <div className="hidden print:block print-doc">
        <SpdDocument trip={trip} />
      </div>

      <BusinessTripDownloadModal open={downloadOpen} onOpenChange={setDownloadOpen} trip={trip} />
    </div>
  );
};

export default DetailBusinessTrip;

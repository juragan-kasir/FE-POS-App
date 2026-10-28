import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getReservationById } from "@/services/reservation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/ui/PageHeader";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import { dateLocale } from "@/lib/locale";

const STATUS_MAP = {
  pending: {
    labelKey: "page.reservation.status.pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  confirmed: {
    labelKey: "page.reservation.status.confirmed",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
  },
  cancelled: {
    labelKey: "page.reservation.status.cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  },
  completed: {
    labelKey: "page.reservation.status.completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  no_show: {
    labelKey: "page.reservation.status.noShow",
    color: "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
  }
};

const DetailRow = ({ label, children }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{children}</p>
  </div>
);

const DetailReservation = () => {
  const { t } = useTranslation();
  const { id } = useParams();

  const { data, isLoading } = useQuery(["reservation", id], () => getReservationById(id), {
    enabled: !!id
  });

  const r = data?.data;

  const sendWhatsApp = () => {
    if (!r?.customerPhone) {
      toast.error(t("page.reservation.detail.noPhone"));
      return;
    }
    const phone = r.customerPhone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `Halo ${r.customerName},\n\nReservasi anda pada ${r.reservationDate} pukul ${r.startTime?.slice(0, 5)} telah dikonfirmasi.\n\nTerima kasih.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  if (!r && !isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.reservation.edit.notFound")}</p>
      </div>
    );
  }

  const s = STATUS_MAP[r?.status] || STATUS_MAP.pending;

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.reservation.title"),
            href: "/reservation",
            i18nKey: "page.reservation.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={
          isLoading ? t("common.loading") : r?.customerName || t("page.reservation.detailTitle")
        }
        description={t("page.reservation.detail.subtitle")}
        backLink="/reservation"
        dynamicInfo={false}
      />
      <LoadErrorBanner />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ) : (
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("page.reservation.detail.customer")}
              </h2>
              <DetailRow label={t("page.reservation.detail.name")}>{r.customerName}</DetailRow>
              {r.customerPhone && (
                <DetailRow label={t("page.reservation.detail.phone")}>{r.customerPhone}</DetailRow>
              )}
              {r.customerEmail && (
                <DetailRow label={t("page.reservation.detail.email")}>{r.customerEmail}</DetailRow>
              )}
            </div>
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("common.status")}
              </h2>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${s.color}`}>
                {t(s.labelKey)}
              </span>
            </div>
          </div>

          <hr />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailRow label={t("page.reservation.columns.date")}>
              {r.reservationDate
                ? new Date(r.reservationDate + "T00:00:00").toLocaleDateString(dateLocale(), {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })
                : "-"}
            </DetailRow>
            <DetailRow label={t("page.reservation.columns.time")}>
              {r.startTime?.slice(0, 5)} - {r.endTime?.slice(0, 5)}
            </DetailRow>
            <DetailRow label={t("page.reservation.columns.guests")}>
              {r.guestCount} {t("page.reservation.guestSuffix")}
            </DetailRow>
            <DetailRow label={t("page.reservation.columns.table")}>
              {r.tableInfo?.name || "-"}
            </DetailRow>
            <DetailRow label={t("page.reservation.columns.store")}>
              {r.storeInfo?.name || `Store #${r.store}`}
            </DetailRow>
            <DetailRow label={t("page.reservation.columns.notes")}>{r.notes || "-"}</DetailRow>
          </div>

          <hr />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailRow label={t("page.reservation.createdBy")}>
              {r.createdByUser?.fullName || "-"}
            </DetailRow>
            <DetailRow label={t("page.reservation.createdAt")}>
              {r.createdAt ? new Date(r.createdAt).toLocaleString("id-ID") : "-"}
            </DetailRow>
            {r.modifiedBy && (
              <>
                <DetailRow label={t("page.reservation.modifiedBy")}>
                  {r.modifiedByUser?.fullName || "-"}
                </DetailRow>
                <DetailRow label={t("page.reservation.updatedAt")}>
                  {r.updatedAt ? new Date(r.updatedAt).toLocaleString("id-ID") : "-"}
                </DetailRow>
              </>
            )}
          </div>
        </Card>
      )}

      {r?.customerPhone && r.status === "confirmed" && (
        <div className="flex justify-end">
          <Button onClick={sendWhatsApp} className="gap-2">
            <Phone size={16} /> {t("page.reservation.detail.sendWA")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DetailReservation;

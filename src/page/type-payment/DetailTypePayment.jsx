import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Edit3, CreditCard, Percent, Clock, ArrowUpDown } from "lucide-react";
import AbortController from "@/components/organism/abort-controller";
import { getTypePaymentById } from "@/services/type-payment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TipsCard } from "@/components/ui/tips-card";
import PageHeader from "@/components/ui/PageHeader";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "-";
  }
};

const DetailTypePayment = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["type-payment-detail", paymentId],
    () => getTypePaymentById(paymentId),
    { enabled: !!paymentId }
  );

  const item = data?.data || {};

  if (!paymentId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <CreditCard size={48} className="opacity-40" />
        <p>{t("page.typePayment.ui.paymentIdNotFound")}</p>
        <Button variant="danger" onClick={() => navigate("/type-payment-list")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
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
      </div>
    );
  }

  if (!item || !item.id) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <CreditCard size={48} className="opacity-40" />
        <p>{t("page.typePayment.ui.paymentMethodNotFound")}</p>
        <Button variant="danger" onClick={() => navigate("/type-payment-list")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const isActive =
    item.status === "Aktif" ||
    item.status === true ||
    item.status === "active" ||
    item.isActive === true;

  return (
    <div>
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.dashboard"
            },
            {
              label: t("page.typePayment.list.title"),
              href: "/type-payment-list",
              i18nKey: "page.typePayment.list.title"
            },
            { label: t("breadcrumb.detail") }
          ]}
          title={item.name}
          description={item.type || item.tipe || "-"}
          backLink="/type-payment-list"
          dynamicInfo={false}>
          {!item.isSystem && (
            <Button variant="outline" onClick={() => navigate(`/edit-type-payment?id=${item.id}`)}>
              <Edit3 size={14} className="mr-1.5" />
              {t("common.edit")}
            </Button>
          )}
        </PageHeader>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <CreditCard size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.profile.type")}
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {item.type || item.tipe || "-"}
                </p>
              </div>
            </div>
            <div className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Percent size={20} className="text-lg" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.typePayment.form.fee")}
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {item.feeType === "percent"
                    ? `${item.fee || 0}%`
                    : Number(item.fee) > 0
                      ? `Rp ${Number(item.fee).toLocaleString("id-ID")}`
                      : "-"}
                </p>
              </div>
            </div>
            <div className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Clock size={20} className="text-lg" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.typePayment.form.tenor")}
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {item.tenor > 0 ? `${item.tenor} hari` : "-"}
                </p>
              </div>
            </div>
            <div className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ArrowUpDown size={20} className="text-lg" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.typePayment.form.sortOrder")}
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {item.sortOrder ?? "-"}
                </p>
              </div>
            </div>
            <div className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 shrink-0">
                <span className="text-sm font-bold">{isActive ? "A" : "N"}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("page.typePayment.detail.status")}
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {isActive ? t("common.active") : t("common.inactive")}
                </p>
              </div>
            </div>
            <div className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="text-sm font-bold">#</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ID
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5 font-mono">
                  #{String(item.id).padStart(3, "0")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {item.deskripsi && (
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("page.role.detail.descLabel")}
            </p>
            <p className="text-sm text-foreground">{item.deskripsi}</p>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t("page.product.detail.systemInfo")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">{t("page.reservation.createdAt")}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatDate(item.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("page.location.table.updatedAt")}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatDate(item.updatedAt || item.updated_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <TipsCard
            tips={[
              "Pastikan metode pembayaran aktif sebelum digunakan pada transaksi",
              "Sistem hanya akan menampilkan metode dengan status Aktif di halaman kasir",
              "Metode pembayaran sistem tidak dapat dihapus atau dinonaktifkan"
            ]}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="danger" onClick={() => navigate("/type-payment-list")} className="gap-2">
            <ArrowLeft size={16} />
            {t("common.back")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DetailTypePayment;

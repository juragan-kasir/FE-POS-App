import React from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Wallet, Building2, FileText, User } from "lucide-react";
import { getPaymentById } from "@/services/purchase-payment";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import i18next from "i18next";
import { dateLocale } from "@/lib/locale";

const methodBadge = {
  cash: {
    get label() {
      return i18next.t("page.purchaseOrder.paymentMethod.cash");
    },
    class: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
  },
  transfer: {
    get label() {
      return i18next.t("page.dashboard.payTransfer");
    },
    class: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
  },
  giro: {
    get label() {
      return i18next.t("page.purchaseOrder.paymentMethod.giro");
    },
    class: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
  },
  other: {
    get label() {
      return i18next.t("page.purchaseOrder.paymentMethod.other");
    },
    class: "bg-muted text-foreground"
  }
};

const poStatusBadge = {
  draft: {
    get label() {
      return i18next.t("common.draft");
    },
    class: "bg-muted text-foreground"
  },
  pending: {
    get label() {
      return i18next.t("page.expense.list.pending");
    },
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
  },
  ordered: {
    get label() {
      return i18next.t("page.purchaseOrder.status.ordered");
    },
    class: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
  },
  received: {
    get label() {
      return i18next.t("page.purchaseOrder.status.received");
    },
    class: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
  },
  cancelled: {
    get label() {
      return i18next.t("page.purchaseOrder.status.cancelled");
    },
    class: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
  }
};

const Row = ({ label, children }) => (
  <tr>
    <td className="py-2.5 text-muted-foreground w-44 align-top">{label}</td>
    <td className="py-2.5 font-medium">{children || "-"}</td>
  </tr>
);

const PurchasePaymentDetail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["payment-detail", id],
    () => getPaymentById(id),
    { enabled: !!id }
  );
  const payment = data?.data;
  const mb = methodBadge[payment?.paymentMethod] || methodBadge.other;

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.purchaseOrder.detail.idNotFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

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
            label: t("page.purchasePayment.list.title"),
            href: "/purchase-payment",
            i18nKey: "page.purchasePayment.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={
          isLoading
            ? t("common.loading")
            : `${t("page.purchasePayment.detail.title")} #${payment?.id || ""}`
        }
        description={t("page.purchasePayment.detail.pageDesc")}
        backLink="/purchase-payment"
        dynamicInfo={false}>
        {!isLoading && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${mb?.class}`}>
            <Wallet size={14} />
            {t(`page.purchaseOrder.paymentMethod.${payment?.paymentMethod}`) || mb?.label}
          </span>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6 space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          </div>
        </div>
      ) : !payment ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Wallet size={16} className="text-muted-foreground" />
                {t("page.purchasePayment.detail.paymentInfo")}
              </h3>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <Row label={t("page.purchasePayment.detail.amount")}>
                      <span className="text-lg font-bold">
                        Rp {Number(payment.amount).toLocaleString("id-ID")}
                      </span>
                    </Row>
                    <Row label={t("page.purchasePayment.detail.paymentMethod")}>
                      <span className="capitalize">
                        {t(`page.purchaseOrder.paymentMethod.${payment.paymentMethod}`)}
                      </span>
                    </Row>
                    <Row label={t("page.purchasePayment.detail.paymentDate")}>
                      {payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString(dateLocale(), {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })
                        : "-"}
                    </Row>
                    <Row label={t("page.purchasePayment.detail.reference")}>
                      {payment.reference || "-"}
                    </Row>
                    <Row label={t("page.purchasePayment.detail.notes")}>{payment.notes || "-"}</Row>
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText size={16} className="text-muted-foreground" />
                {t("page.purchasePayment.detail.poInfo")}
              </h3>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <Row label={t("page.purchasePayment.detail.poNumber")}>
                      {payment.purchaseOrderData?.orderNumber || `PO-${payment.purchaseOrder}`}
                    </Row>
                    <Row label={t("page.purchasePayment.detail.supplier")}>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-muted-foreground" />
                        {payment.supplierData?.name || "-"}
                      </div>
                    </Row>
                    <Row label={t("page.purchasePayment.detail.poStatus")}>
                      {(() => {
                        const s =
                          poStatusBadge[payment.purchaseOrderData?.status] || poStatusBadge.pending;
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
                            {s.label}
                          </span>
                        );
                      })()}
                    </Row>
                    <Row label={t("page.purchasePayment.detail.poAmount")}>
                      <span className="font-medium">
                        Rp{" "}
                        {Number(payment.purchaseOrderData?.finalAmount || 0).toLocaleString(
                          "id-ID"
                        )}
                      </span>
                    </Row>
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                {t("page.purchasePayment.detail.system")}
              </h3>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2 text-muted-foreground">
                        {t("page.purchasePayment.detail.createdBy")}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {payment.createdByUser?.fullName || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">
                        {t("page.purchasePayment.detail.created")}
                      </td>
                      <td className="py-2 text-right">
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString(dateLocale(), {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground">
                        {t("page.purchasePayment.detail.updated")}
                      </td>
                      <td className="py-2 text-right">
                        {payment.updatedAt
                          ? new Date(payment.updatedAt).toLocaleDateString(dateLocale(), {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasePaymentDetail;

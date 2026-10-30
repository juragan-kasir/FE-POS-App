import { safeGet } from "@/lib/safe-lookup";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { Receipt, Wallet, Clock, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getARById } from "@/services/accounts-receivable";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import DataTable from "@/components/ui/DataTable";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import i18next from "i18next";
import { dateLocale } from "@/lib/locale";

const STATUS_MAP = {
  UNPAID: {
    get label() {
      return i18next.t("page.accountsReceivable.list.status.unpaid");
    },
    color: "bg-yellow-100 text-yellow-800"
  },
  PARTIAL: {
    get label() {
      return i18next.t("page.accountsReceivable.ui.partiallyPaid");
    },
    color: "bg-blue-100 text-blue-800"
  },
  PAID: {
    get label() {
      return i18next.t("page.expense.list.statusPaid");
    },
    color: "bg-green-100 text-green-800"
  },
  OVERDUE: {
    get label() {
      return i18next.t("page.apDashboard.po.dueDate");
    },
    color: "bg-red-100 text-red-800"
  }
};

const AccountsReceivableDetail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(["ar-detail", id], () => getARById(id), {
    enabled: !!id
  });

  if (isError) return <AbortController refetch={refetch} />;

  const ar = data?.data;
  const statusKey = ar?.status || "UNPAID";
  const statusInfo = {
    ...safeGet(STATUS_MAP, statusKey),
    label: t(`page.accountsReceivable.detail.status.${statusKey?.toLowerCase()}`)
  };
  const payments = ar?.payments || [];
  const isOverdue = ar?.overdueDays > 0 && ar?.status !== "PAID";

  const paymentColumns = [
    {
      header: t("page.accountsReceivable.detail.paymentTable.date"),
      render: (p) =>
        new Date(p.paymentDate).toLocaleDateString(dateLocale(), {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
    },
    {
      header: t("page.accountsReceivable.detail.paymentTable.amount"),
      render: (p) => formatCurrencyRupiah(p.amount)
    },
    {
      header: t("page.accountsReceivable.detail.paymentTable.method"),
      render: (p) => p.paymentMethod || "-"
    },
    { header: t("page.accountsReceivable.detail.paymentTable.note"), render: (p) => p.note || "-" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("page.accountsReceivable.detail.breadcrumb.dashboard"),
            href: "/dashboard-super-admin"
          },
          {
            label: t("page.accountsReceivable.detail.breadcrumb.list"),
            href: "/accounts-receivable"
          },
          { label: t("page.accountsReceivable.detail.breadcrumb.detail") }
        ]}
        title={isLoading ? "…" : ar?.invoiceNo || `AR-${ar?.id}`}
        backLink="/accounts-receivable"
        dynamicInfo={false}>
        {!isLoading && (
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusInfo?.color}`}>
            {isOverdue ? t("page.accountsReceivable.detail.status.overdue") : statusInfo?.label}
            {ar?.overdueDays > 0 &&
              ` (${t("page.accountsReceivable.detail.overdueLabel")} ${ar.overdueDays} ${t("page.accountsReceivable.detail.days")})`}
          </span>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
          <Card className="p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
          <Card className="p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        </div>
      ) : !ar ? (
        <p className="text-center text-muted-foreground py-12">
          {t("page.accountsReceivable.detail.notFound")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <Card className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40">
                  <Receipt size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("page.accountsReceivable.detail.card.totalTagihan")}
                  </p>
                  <p className="text-lg font-bold">{formatCurrencyRupiah(ar.totalAmount)}</p>
                </div>
              </Card>
            </div>
            <div>
              <Card className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/40">
                  <Wallet size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("page.accountsReceivable.detail.card.sudahDibayar")}
                  </p>
                  <p className="text-lg font-bold">{formatCurrencyRupiah(ar.paidAmount)}</p>
                </div>
              </Card>
            </div>
            <div>
              <Card className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isOverdue ? "bg-red-50" : "bg-yellow-50"}`}>
                  {isOverdue ? (
                    <AlertCircle size={20} className="text-red-600" />
                  ) : (
                    <Clock size={20} className="text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("page.accountsReceivable.detail.card.sisaPiutang")}
                  </p>
                  <p className="text-lg font-bold">{formatCurrencyRupiah(ar.outstandingAmount)}</p>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Card className="p-4">
                <h3 className="font-semibold mb-3">
                  {t("page.accountsReceivable.detail.section.informasiInvoice")}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("page.accountsReceivable.detail.field.noInvoice")}
                    </span>
                    <span>{ar.invoiceNo || "-"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("page.accountsReceivable.detail.field.tanggalInvoice")}
                    </span>
                    <span>
                      {ar.invoiceDate
                        ? new Date(ar.invoiceDate).toLocaleDateString(dateLocale())
                        : "-"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("page.accountsReceivable.detail.field.jatuhTempo")}
                    </span>
                    <span>
                      {ar.dueDate ? new Date(ar.dueDate).toLocaleDateString(dateLocale()) : "-"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("page.accountsReceivable.detail.field.customer")}
                    </span>
                    <span>{ar.customerName || ar.orderData?.customerName || "-"}</span>
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <Card className="p-4">
                <h3 className="font-semibold mb-3">
                  {t("page.accountsReceivable.detail.section.informasiOrder")}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("page.accountsReceivable.detail.field.noOrder")}
                    </span>
                    {ar.orderId || ar.orderData?.id ? (
                      <Link
                        to={`/order/detail?id=${ar.orderId || ar.orderData.id}`}
                        className="text-primary hover:underline">
                        {ar.orderNumber || ar.orderData?.orderNumber || "-"}
                      </Link>
                    ) : (
                      <span>{ar.orderNumber || "-"}</span>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("page.accountsReceivable.detail.field.tipeOrder")}
                    </span>
                    <span>{ar.orderData?.orderType || ar.orderType || "-"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("page.accountsReceivable.detail.field.statusOrder")}
                    </span>
                    <span>{ar.orderData?.status || "-"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("page.accountsReceivable.detail.field.metodePembayaran")}
                    </span>
                    <span>{ar.orderData?.paymentMethod || ar.paymentMethod || "-"}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div>
            <Card className="p-4">
              <h3 className="font-semibold mb-3">
                {t("page.accountsReceivable.detail.paymentHistory")} ({payments.length})
              </h3>
              {payments.length > 0 ? (
                <DataTable
                  columns={paymentColumns}
                  data={payments}
                  isLoading={false}
                  emptyMessage={t("page.accountsReceivable.detail.noPayments")}
                  emptyIcon={Wallet}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("page.accountsReceivable.detail.noPayments")}
                </p>
              )}
            </Card>
          </div>

          {ar.notes && (
            <div>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">{t("page.accountsReceivable.detail.notes")}</h3>
                <p className="text-sm text-muted-foreground">{ar.notes}</p>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AccountsReceivableDetail;

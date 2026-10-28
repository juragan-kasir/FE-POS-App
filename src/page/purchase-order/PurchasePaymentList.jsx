import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { Wallet, Eye } from "lucide-react";
import { getAllPayments } from "@/services/purchase-payment";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import StoreFilter from "@/components/ui/StoreFilter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DataTable from "@/components/ui/DataTable";
import { TipsCard } from "@/components/ui/tips-card";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import AbortController from "@/components/organism/abort-controller";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const PurchasePaymentList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies(["user"]);
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(20);
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const locationParam = storeFilter !== "all" ? storeFilter : undefined;

  const { data, isLoading, isError, refetch } = useQuery(
    ["purchase-payments", page, limit, storeFilter],
    () => getAllPayments({ page, limit, store: locationParam }),
    { keepPreviousData: true }
  );

  const payments = data?.data || [];
  const pagination = data?.pagination || {};
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;

  const totalAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const columns = [
    {
      header: t("page.purchasePayment.list.columns.date"),
      render: (p) => (
        <span className="text-muted-foreground">
          {p.paymentDate
            ? new Date(p.paymentDate).toLocaleDateString(dateLocale(), {
                year: "numeric",
                month: "short",
                day: "numeric"
              })
            : "-"}
        </span>
      )
    },
    {
      header: t("page.purchasePayment.list.columns.supplier"),
      render: (p) => p.supplierData?.name || "-"
    },
    {
      header: t("page.purchasePayment.list.columns.store"),
      render: (p) => <span className="text-sm">{p.storeData?.name || "-"}</span>
    },
    {
      header: t("page.purchasePayment.list.columns.poNumber"),
      render: (p) => (
        <span
          className="font-medium text-primary cursor-pointer hover:underline"
          onClick={() => navigate(`/purchase-order/detail?id=${p.purchaseOrderData?.id}`)}>
          {p.purchaseOrderData?.orderNumber || `PO-${p.purchaseOrder}`}
        </span>
      )
    },
    {
      header: t("page.purchasePayment.list.columns.amount"),
      render: (p) => (
        <span className="font-medium">Rp {Number(p.amount).toLocaleString("id-ID")}</span>
      )
    },
    {
      header: t("page.purchasePayment.list.columns.method"),
      render: (p) => {
        const labels = {
          cash: t("page.purchaseOrder.paymentMethod.cash"),
          transfer: t("page.purchaseOrder.paymentMethod.transfer"),
          giro: t("page.purchaseOrder.paymentMethod.giro"),
          other: t("page.purchaseOrder.paymentMethod.other")
        };
        return <span className="text-sm">{labels[p.paymentMethod] || p.paymentMethod || "-"}</span>;
      }
    },
    {
      header: t("page.purchasePayment.list.columns.reference"),
      render: (p) => <span className="text-sm text-muted-foreground">{p.reference || "-"}</span>
    },
    {
      header: t("page.purchasePayment.list.columns.notes"),
      render: (p) => (
        <span className="text-sm text-muted-foreground max-w-[150px] block truncate">
          {p.notes || "-"}
        </span>
      )
    },
    {
      header: t("page.purchasePayment.list.columns.actions"),
      stickyRight: true,
      legend: [{ icon: Eye, label: t("common.view") }],
      render: (p) => (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => navigate(`/purchase-payment-detail?id=${p.id}`)}
          title={t("common.detail")}>
          <Eye size={18} />
        </Button>
      )
    }
  ];

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
            i18nKey: "page.purchasePayment.list.title"
          }
        ]}
        title={t("page.purchasePayment.list.title")}
        description={t("page.purchasePayment.list.description")}>
        {isSuperAdmin && locData && (
          <StoreFilter
            locations={locData?.data || []}
            value={storeFilter}
            onChange={(v) => {
              setGlobalStoreFilter(v);
              setPage(1);
            }}
            isSuperAdmin={isSuperAdmin}
            t={t}
          />
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm">
              <Wallet size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">
                {t("page.purchasePayment.list.totalLabel")}:
              </span>
              <span className="font-bold text-lg">
                Rp {Number(totalAmount).toLocaleString("id-ID")}
              </span>
            </div>
          </Card>

          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div className="space-y-4">
              <DataTable
                columns={columns}
                data={payments}
                isLoading={isLoading}
                emptyMessage={t("page.purchasePayment.list.empty")}
                emptyIcon={Wallet}
                pagination={{
                  page,
                  totalPages,
                  total,
                  onPageChange: setPage,
                  pageSize: limit,
                  onPageSizeChange: (v) => {
                    setLimit(v);
                    setPage(1);
                  }
                }}
              />
            </div>
          )}

          <TipsCard
            tips={[
              t("page.purchasePayment.list.tips.1"),
              t("page.purchasePayment.list.tips.2"),
              t("page.purchasePayment.list.tips.3"),
              t("page.purchasePayment.list.tips.4")
            ]}
          />
        </>
      )}
    </div>
  );
};

export default PurchasePaymentList;

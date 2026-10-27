import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  FileText,
  User,
  Store
} from "lucide-react";
import { getPurchaseReturnById } from "@/services/purchase-return";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormalDocument, PrintButton } from "@/components/document/FormalDocument";
import { getDocumentSpecForPurchaseReturn } from "@/components/document/documentMappers";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const statusBadge = {
  pending: {
    label: "Pending",
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    icon: Clock
  },
  approved: {
    label: "Approved",
    class: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    icon: CheckCircle2
  },
  rejected: {
    label: "Rejected",
    class: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    icon: XCircle
  }
};

const Row = ({ label, children }) => (
  <tr>
    <td className="py-2.5 text-muted-foreground w-44 align-top">{label}</td>
    <td className="py-2.5 font-medium">{children || "-"}</td>
  </tr>
);

const DetailPurchaseReturn = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["purchase-return-detail", id],
    () => getPurchaseReturnById(id),
    { enabled: !!id }
  );
  const ret = data?.data;
  // The return carries its PO as an id, or as the PO itself when included.
  const poId =
    ret?.purchaseOrder && typeof ret.purchaseOrder === "object"
      ? (ret.purchaseOrder.id ?? null)
      : (ret?.purchaseOrder ?? null);
  const st = statusBadge[ret?.status] || statusBadge.pending;
  const StatusIcon = st.icon;
  const printSpec = ret ? getDocumentSpecForPurchaseReturn(ret, t) : null;

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.purchaseReturn.detail.idNotFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;
  if (!ret && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("page.purchaseReturn.detail.notFound")}</p>
        <Button variant="danger" onClick={() => navigate("/purchase-return")}>
          <ArrowLeft size={16} className="mr-2" />
          {t("page.purchaseReturn.detail.back")}
        </Button>
      </div>
    );
  }

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
            label: t("page.purchaseReturn.detail.breadcrumb.list"),
            href: "/purchase-return",
            i18nKey: "page.purchaseReturn.detail.breadcrumb.list"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : ret?.returnNumber || "-"}
        description={t("page.purchaseReturn.detail.title")}
        backLink="/purchase-return"
        dynamicInfo={false}>
        {!isLoading && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${st.class}`}>
            <StatusIcon size={14} />
            {st.label}
          </span>
        )}
        {!isLoading && <PrintButton />}
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText size={16} className="text-muted-foreground" />
                {t("page.purchaseReturn.detail.section.informasiRetur")}
              </h3>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <Row label={t("page.purchaseReturn.detail.field.returnNo")}>
                      {ret.returnNumber}
                    </Row>
                    <Row label={t("page.purchaseReturn.detail.field.store")}>
                      <div className="flex items-center gap-2">
                        <Store size={14} className="text-muted-foreground" />
                        {ret.storeData?.name || "-"}
                      </div>
                    </Row>
                    <Row label={t("page.purchaseReturn.detail.field.reason")}>
                      {ret.reason || "-"}
                    </Row>
                    <Row label={t("page.purchaseReturn.detail.field.returnedBy")}>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-muted-foreground" />
                        {ret.returnedBy?.name || "-"}
                      </div>
                    </Row>
                    <Row label={t("page.purchaseReturn.detail.field.date")}>
                      {ret.createdAt
                        ? new Date(ret.createdAt).toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "-"}
                    </Row>
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <ShoppingBag size={16} className="text-muted-foreground" />
                {t("page.purchaseReturn.detail.section.items")}
              </h3>
              <HorizontalScrollArea className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("page.purchaseReturn.detail.table.product")}
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
                        {t("page.purchaseReturn.detail.table.qty")}
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
                        {t("page.purchaseReturn.detail.table.unit")}
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">
                        {t("page.purchaseReturn.detail.table.price")}
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">
                        {t("page.purchaseReturn.detail.table.subtotal")}
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("page.purchaseReturn.detail.table.notes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {ret.items?.length > 0 ? (
                      ret.items.map((item, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-medium">
                            {item.product?.name ||
                              item.ingredient?.name ||
                              item.ingredientName ||
                              "-"}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">{item.qty}</td>
                          <td className="py-3 px-4 text-center text-muted-foreground">
                            {item.unit || "pcs"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                            Rp {Number(item.price || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium">
                            Rp {Number(item.subtotal || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{item.notes || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          {t("page.purchaseReturn.detail.table.noItems")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </HorizontalScrollArea>

              {ret.items?.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 bg-muted/20 border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("page.purchaseReturn.detail.table.totalItems")}
                    </p>
                    <p className="text-lg font-bold text-foreground">{ret.items.length}</p>
                  </Card>
                  <Card className="p-4 bg-muted/20 border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("page.purchaseReturn.detail.table.totalQty")}
                    </p>
                    <p className="text-lg font-bold text-foreground font-mono">
                      {ret.items.reduce((s, i) => s + (Number(i.qty) || 0), 0)}
                    </p>
                  </Card>
                  <Card className="p-4 bg-muted/20 border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("page.purchaseReturn.detail.table.totalAmount")}
                    </p>
                    <p className="text-lg font-bold font-mono text-primary">
                      Rp {Number(ret.totalAmount || 0).toLocaleString("id-ID")}
                    </p>
                  </Card>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <ShoppingBag size={16} className="text-muted-foreground" />
                {t("page.purchaseReturn.detail.section.status")}
              </h3>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${st.class}`}>
                <StatusIcon size={16} />
                {st.label}
              </div>
              {ret.resolution && (
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      ret.resolution === "replacement"
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                    }`}>
                    {t(`page.purchaseReturn.resolution.${ret.resolution}`)}
                  </span>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-muted-foreground" />
                {t("page.purchaseReturn.detail.section.poInfo")}
              </h3>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2 text-muted-foreground">
                        {t("page.purchaseReturn.detail.field.poNumber")}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {poId ? (
                          <Link
                            to={`/purchase-order/detail?id=${poId}`}
                            className="text-primary hover:underline">
                            {ret.purchaseOrder?.orderNumber || `PO-${poId}`}
                          </Link>
                        ) : (
                          ret.purchaseOrder?.orderNumber || "-"
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </Card>
          </div>
        </div>
      )}
      {printSpec && (
        <div className="hidden print:block print-doc">
          <FormalDocument spec={printSpec} />
        </div>
      )}
    </div>
  );
};

export default DetailPurchaseReturn;

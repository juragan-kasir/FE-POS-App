import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { ArrowLeft, ArrowRightLeft, CheckCircle, XCircle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  getTransferById,
  receiveStockTransfer,
  cancelStockTransfer
} from "@/services/stock-transfer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import Modal from "@/components/organism/modal";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import i18next from "i18next";
import { dateLocale } from "@/lib/locale";

const statusDetail = {
  sent: {
    get label() {
      return i18next.t("page.stockTransfer.ui.sent");
    },
    class: "bg-blue-100 text-blue-800"
  },
  received: {
    get label() {
      return i18next.t("page.purchaseOrder.status.received");
    },
    class: "bg-green-100 text-green-800"
  },
  cancelled: {
    get label() {
      return i18next.t("page.purchaseOrder.status.cancelled");
    },
    class: "bg-red-100 text-red-800"
  },
  pending: {
    get label() {
      return i18next.t("page.expense.list.pending");
    },
    class: "bg-yellow-100 text-yellow-800"
  },
  approved: {
    get label() {
      return i18next.t("page.expense.list.approved");
    },
    class: "bg-green-100 text-green-800"
  },
  rejected: {
    get label() {
      return i18next.t("page.expense.list.rejected");
    },
    class: "bg-red-100 text-red-800"
  }
};

const DetailStockTransfer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["stock-transfer-detail", id],
    () => getTransferById(id),
    {
      enabled: !!id
    }
  );
  const transfer = data?.data;

  const queryClient = useQueryClient();

  const [confirmAction, setConfirmAction] = useState(null);

  const receiveMutation = useMutation(receiveStockTransfer, {
    onSuccess: () => {
      toast.success(t("page.stockTransfer.detail.receiveSuccess"));
      queryClient.invalidateQueries("stock-transfer-detail");
    },
    onError: (err) => toast.error(err.message)
  });

  const cancelMutation = useMutation(cancelStockTransfer, {
    onSuccess: () => {
      toast.success(t("page.stockTransfer.detail.cancelSuccess"));
      queryClient.invalidateQueries("stock-transfer-detail");
    },
    onError: (err) => toast.error(err.message)
  });

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading)
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
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          </div>
        </div>
      </div>
    );
  if (!transfer)
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t("page.stockTransfer.detail.notFound")}</p>
        <Button variant="danger" onClick={() => navigate("/stock-transfer")} className="mt-4">
          <ArrowLeft size={16} className="mr-1" /> {t("page.stockTransfer.detail.back")}
        </Button>
      </div>
    );

  const st = statusDetail[transfer.status] || statusDetail.pending;

  return (
    <>
      {(receiveMutation.isLoading || cancelMutation.isLoading) && (
        <Loading fullscreen size="lg" label={t("common.loadingData")} />
      )}
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("page.stockTransfer.detail.breadcrumb.list"),
              href: "/stock-transfer",
              i18nKey: "page.stockTransfer.detail.breadcrumb.list"
            },
            { label: t("breadcrumb.detail") }
          ]}
          title={t("page.stockTransfer.detail.title")}
          description={transfer.transferNumber}
          backLink="/stock-transfer"
          dynamicInfo={false}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h2 className="text-lg font-semibold mb-4">
                {t("page.stockTransfer.detail.section.informasiTransfer")}
              </h2>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      [t("page.stockTransfer.detail.field.transferNo"), transfer.transferNumber],
                      [
                        t("page.stockTransfer.detail.field.from"),
                        transfer.fromStoreData?.name || "-"
                      ],
                      [t("page.stockTransfer.detail.field.to"), transfer.toStoreData?.name || "-"],
                      [
                        t("page.stockTransfer.detail.field.transferredBy"),
                        transfer.transferredBy || transfer.transferredByData?.name || "-"
                      ],
                      [
                        t("page.stockTransfer.detail.field.date"),
                        transfer.createdAt && !isNaN(new Date(transfer.createdAt).getTime())
                          ? new Date(transfer.createdAt).toLocaleDateString("id")
                          : "-"
                      ],
                      [t("page.stockTransfer.detail.field.notes"), transfer.notes || "-"],
                      [t("page.stockTransfer.detail.field.reason"), transfer.reason || "-"],
                      [
                        t("page.stockTransfer.detail.field.expectedArrival"),
                        transfer.expectedArrival
                          ? new Date(transfer.expectedArrival).toLocaleDateString(dateLocale())
                          : "-"
                      ]
                    ].map(([l, v]) => (
                      <tr key={l} className="border-b border-muted/30">
                        <td className="py-2 pr-4 text-muted-foreground w-40">{l}</td>
                        <td className="py-2 font-medium">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border">
              <h2 className="text-lg font-semibold mb-4">
                {t("page.stockTransfer.detail.section.items")}
              </h2>
              <HorizontalScrollArea>
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2">{t("page.stockTransfer.detail.table.product")}</th>
                      <th className="pb-2 text-right">
                        {t("page.stockTransfer.detail.table.qty")}
                      </th>
                      <th className="pb-2 text-center">
                        {t("page.stockTransfer.detail.table.unit")}
                      </th>
                      <th className="pb-2">{t("page.stockTransfer.detail.table.notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.items?.length > 0 ? (
                      transfer.items.map((item, i) => (
                        <tr key={i} className="border-b border-muted/20">
                          <td className="py-2">
                            {item.productData?.nameProduct || item.product?.nameProduct || "-"}
                          </td>
                          <td className="py-2 text-right font-mono">{item.qty}</td>
                          <td className="py-2 text-center">{item.unit || "pcs"}</td>
                          <td className="py-2">{item.notes || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">
                          {t("page.stockTransfer.detail.table.noItems")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t("page.stockTransfer.detail.section.status")}
              </h2>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${st.class}`}>
                <ArrowRightLeft size={14} /> {st.label}
              </div>
              {transfer.status === "sent" && (
                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full gap-2"
                    onClick={() =>
                      setConfirmAction({
                        type: "receive",
                        id: transfer.id,
                        transferNumber: transfer.transferNumber
                      })
                    }>
                    <CheckCircle size={16} /> {t("page.stockTransfer.detail.receive")}
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full gap-2 text-red-600"
                    onClick={() =>
                      setConfirmAction({
                        type: "cancel",
                        id: transfer.id,
                        transferNumber: transfer.transferNumber
                      })
                    }>
                    <XCircle size={16} /> {t("page.stockTransfer.detail.cancel")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        type="confirm"
        open={!!confirmAction}
        onOpenChange={(v) => {
          if (!v) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === "receive"
            ? t("page.stockTransfer.detail.receiveConfirmTitle")
            : t("page.stockTransfer.detail.cancelConfirmTitle")
        }
        description={
          confirmAction?.type === "receive"
            ? t("page.stockTransfer.detail.receiveConfirmDesc", {
                transferNumber: confirmAction?.transferNumber
              })
            : t("page.stockTransfer.detail.cancelConfirmDesc", {
                transferNumber: confirmAction?.transferNumber
              })
        }
        confirmText={
          confirmAction?.type === "receive"
            ? t("page.stockTransfer.detail.receive")
            : t("page.stockTransfer.detail.cancel")
        }
        confirmVariant={confirmAction?.type === "cancel" ? "destructive" : "default"}
        loading={
          confirmAction?.type === "receive" ? receiveMutation.isLoading : cancelMutation.isLoading
        }
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "receive") receiveMutation.mutate(confirmAction.id);
          else cancelMutation.mutate(confirmAction.id);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
};

export default DetailStockTransfer;

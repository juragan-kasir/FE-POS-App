import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  FileText,
  Package,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Store,
  User,
  Calendar,
  Truck,
  Hash
} from "lucide-react";
import { getGoodsReceiptById } from "@/services/goods-receipt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormalDocument, PrintButton } from "@/components/document/FormalDocument";
import { getDocumentSpecForGoodsReceipt } from "@/components/document/documentMappers";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const DetailGoodsReceipt = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["goods-receipt-detail", id],
    () => getGoodsReceiptById(id),
    { enabled: !!id }
  );

  const receipt = data?.data;
  const printSpec = receipt ? getDocumentSpecForGoodsReceipt(receipt, t) : null;

  if (isError) return <AbortController refetch={refetch} />;

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
            label: t("breadcrumb.goodsReceipt"),
            href: "/goods-receipt",
            i18nKey: "breadcrumb.goodsReceipt"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : t("page.goodsReceipt.detail.title")}
        description={receipt?.receiptNumber}
        backLink="/goods-receipt"
        dynamicInfo={false}>
        <PrintButton />
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <Skeleton className="h-5 w-36" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-3 w-full rounded-full" />
            </Card>
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </Card>
          </div>
        </div>
      ) : !receipt ? (
        <div className="p-6">
          <p className="text-muted-foreground">{t("page.goodsReceipt.detail.notFound")}</p>
          <Button variant="danger" onClick={() => navigate("/goods-receipt")} className="mt-4">
            <ArrowLeft size={16} className="mr-1" /> {t("page.goodsReceipt.detail.back")}
          </Button>
        </div>
      ) : (
        (() => {
          const poItems = receipt.purchaseOrderItems || [];
          const grItems = receipt.items || [];

          const totalOrdered = poItems.reduce((s, pi) => s + (Number(pi.quantity) || 0), 0);
          const totalReceivedNow = grItems.reduce((s, gi) => s + (Number(gi.qtyReceived) || 0), 0);
          const receivingDone = totalOrdered > 0 && totalReceivedNow >= totalOrdered;
          const receivingPct =
            totalOrdered > 0 ? Math.min(100, (totalReceivedNow / totalOrdered) * 100) : 0;

          const completedItems = poItems.filter((pi) => {
            const matched = grItems.find(
              (gi) =>
                gi.ingredientName === (pi.ingredientName || pi.product) || gi.product === pi.product
            );
            return matched && Number(matched.qtyReceived) >= Number(pi.quantity);
          }).length;

          let docUrls = [];
          if (receipt.documentation) {
            try {
              const parsed = JSON.parse(receipt.documentation);
              docUrls = Array.isArray(parsed) ? parsed.filter(Boolean) : [receipt.documentation];
            } catch {
              docUrls = [receipt.documentation];
            }
          }
          const shippingCost = Number(receipt.shippingCost) || 0;

          const stBadgeClass = receivingDone
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
          const stLabel = receivingDone
            ? t("page.goodsReceipt.add.status.selesai")
            : t("page.goodsReceipt.add.status.belumSelesai");

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <FileText size={14} />
                    {t("page.goodsReceipt.detail.receiptInfo")}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-0.5">
                        {t("page.goodsReceipt.detail.receiptNumber")}
                      </span>
                      <span className="font-semibold text-primary">{receipt.receiptNumber}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-0.5">
                        {t("page.goodsReceipt.detail.poReference")}
                      </span>
                      <span className="font-semibold">
                        {receipt.purchaseOrderData?.orderNumber || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                        <Store size={10} /> {t("page.goodsReceipt.detail.store")}
                      </span>
                      <span className="font-semibold">{receipt.storeData?.name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                        <Calendar size={10} /> {t("page.goodsReceipt.detail.receivedDate")}
                      </span>
                      <span className="font-semibold">
                        {receipt.receivedDate
                          ? new Date(receipt.receivedDate).toLocaleDateString("id", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })
                          : "-"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                        <User size={10} /> {t("page.goodsReceipt.detail.pic")}
                      </span>
                      <span className="font-medium">{receipt.picData?.fullName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                        <Truck size={10} /> {t("page.goodsReceipt.add.form.suratJalan")}
                      </span>
                      <span className="font-medium">{receipt.suratJalan || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                        <Hash size={10} /> {t("page.goodsReceipt.add.form.taxInvoiceNo")}
                      </span>
                      <span className="font-medium">{receipt.taxInvoiceNo || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-0.5">
                        {t("page.goodsReceipt.add.form.shippingCost")}
                      </span>
                      <span className="font-medium">
                        {shippingCost > 0 ? "Rp " + shippingCost.toLocaleString("id-ID") : "-"}
                      </span>
                    </div>
                  </div>
                  {receipt.notes && (
                    <div className="border-t border-border/60 pt-3">
                      <span className="text-[11px] text-muted-foreground block mb-0.5">
                        {t("page.goodsReceipt.detail.notes")}
                      </span>
                      <p className="text-sm">{receipt.notes}</p>
                    </div>
                  )}
                </div>

                {docUrls.length > 0 && (
                  <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <FileText size={14} />
                      {t("page.goodsReceipt.detail.documentation")}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {docUrls.map((url, i) => (
                        <img
                          key={url || i}
                          src={url}
                          alt={`${t("page.goodsReceipt.detail.documentation")} ${i + 1}`}
                          className="rounded-lg border border-border h-40 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(url, "_blank")}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <Package size={14} />
                    {t("page.goodsReceipt.detail.itemsReceived")}
                  </div>
                  {grItems.length > 0 ? (
                    <div className="space-y-3">
                      {grItems.map((item, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-border bg-background overflow-hidden">
                          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <Package size={14} className="text-muted-foreground shrink-0" />
                              <span className="text-sm font-semibold truncate">
                                {item.productData?.nameProduct || item.ingredientName || "-"}
                              </span>
                            </div>
                            {Number(item.qtyReceived) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
                                <CheckCircle2 size={10} />
                                {t("page.goodsReceipt.add.status.pas")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
                                <AlertTriangle size={10} />0
                              </span>
                            )}
                          </div>
                          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">
                                {t("page.goodsReceipt.detail.qty")}
                              </span>
                              <span className="font-semibold">{item.qtyReceived || 0}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">
                                {t("page.goodsReceipt.detail.unit")}
                              </span>
                              <span className="inline-flex px-2 py-0.5 rounded text-xs bg-muted capitalize">
                                {item.unit || "pcs"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">
                                {t("page.goodsReceipt.detail.conversion")}
                              </span>
                              <span className="font-mono text-xs">
                                {item.conversionToBase || 1}{" "}
                                <span className="text-muted-foreground">
                                  ={" "}
                                  {Number(
                                    item.qtyStock ||
                                      Number(item.qtyReceived) * (item.conversionToBase || 1)
                                  ).toLocaleString("id-ID")}{" "}
                                  stok
                                </span>
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">
                                {t("page.goodsReceipt.detail.costPrice")}
                              </span>
                              <span className="font-semibold">
                                {Number(item.costPrice) > 0
                                  ? "Rp " + Number(item.costPrice).toLocaleString("id-ID")
                                  : "-"}
                              </span>
                              {Number(item.landedCost) > 0 && (
                                <p className="text-[10px] text-emerald-600 mt-0.5">
                                  {t("page.goodsReceipt.detail.landed")}: +Rp{" "}
                                  {Number(item.landedCost).toLocaleString("id-ID")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="px-4 pb-4 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">
                                {t("page.goodsReceipt.add.table.batch")}
                              </span>
                              <span className="font-mono text-xs">{item.batchNumber || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">
                                {t("page.goodsReceipt.add.table.expiry")}
                              </span>
                              <span className="font-mono text-xs">
                                {item.expiryDate
                                  ? new Date(item.expiryDate).toLocaleDateString("id")
                                  : "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block mb-0.5">
                                {t("page.goodsReceipt.detail.notes")}
                              </span>
                              <span className="text-xs">{item.conditionNotes || "-"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("page.goodsReceipt.detail.noItems")}
                    </p>
                  )}
                </div>

                {poItems.length > 0 && (
                  <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <BarChart3 size={14} />
                      {t("page.goodsReceipt.detail.poItems")}
                    </div>
                    <HorizontalScrollArea>
                      <table className="w-full text-sm min-w-[500px]">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-semibold text-xs">
                              {t("page.goodsReceipt.detail.product")}
                            </th>
                            <th className="pb-2 text-right font-semibold text-xs">
                              {t("page.goodsReceipt.detail.qtyPo")}
                            </th>
                            <th className="pb-2 text-right font-semibold text-xs">
                              {t("page.goodsReceipt.detail.qtyReceived")}
                            </th>
                            <th className="pb-2 text-center font-semibold text-xs w-32">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map((pi, i) => {
                            const ordered = Number(pi.quantity) || 0;
                            const received = Number(pi.receivedQuantity) || 0;
                            const isDone = ordered > 0 && received >= ordered;
                            const pct = ordered > 0 ? Math.min(100, (received / ordered) * 100) : 0;
                            return (
                              <tr key={i} className="border-b border-muted/20">
                                <td className="py-2.5 font-medium">
                                  {pi.product || pi.ingredientName || "-"}
                                </td>
                                <td className="py-2.5 text-right font-mono">{ordered}</td>
                                <td className="py-2.5 text-right font-mono">
                                  <span className={isDone ? "text-emerald-600 font-semibold" : ""}>
                                    {received}
                                  </span>
                                </td>
                                <td className="py-2.5">
                                  <div className="flex items-center gap-2 justify-center">
                                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden max-w-[80px]">
                                      <div
                                        className={`h-full rounded-full ${
                                          isDone ? "bg-emerald-500" : "bg-amber-500"
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    {isDone ? (
                                      <CheckCircle2 size={12} className="text-emerald-500" />
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        {received}/{ordered}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </HorizontalScrollArea>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.goodsReceipt.detail.statusLabel")}
                  </h2>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${stBadgeClass}`}>
                    <FileText size={14} /> {stLabel}
                  </div>

                  {totalOrdered > 0 && (
                    <>
                      <div className="border-t border-border" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {t("page.goodsReceipt.detail.receivingStatus")}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={
                                receivingDone
                                  ? "text-emerald-600 font-medium"
                                  : "text-muted-foreground"
                              }>
                              {receivingDone
                                ? t("page.goodsReceipt.add.items.summaryCompleted")
                                : t("page.goodsReceipt.add.items.summaryPending")}
                            </span>
                            <span className="font-medium text-muted-foreground">
                              {completedItems}/{poItems.length} item
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                receivingDone ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${receivingPct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {totalReceivedNow.toLocaleString("id-ID")} /{" "}
                            {totalOrdered.toLocaleString("id-ID")} unit
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <BarChart3 size={14} />
                    {t("page.goodsReceipt.add.items.summaryTitle")}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("page.goodsReceipt.add.items.summaryTotalReceived")}
                      </span>
                      <span className="font-semibold text-emerald-600">
                        {totalReceivedNow.toLocaleString("id-ID")} /{" "}
                        {totalOrdered.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("page.goodsReceipt.add.items.summaryRemaining")}
                      </span>
                      <span className="font-semibold text-amber-600">
                        {Math.max(0, totalOrdered - totalReceivedNow).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {shippingCost > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("page.goodsReceipt.add.form.shippingCost")}
                        </span>
                        <span className="font-semibold">
                          Rp {shippingCost.toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    {t("page.goodsReceipt.detail.systemInfo")}
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {t("page.goodsReceipt.detail.createdAt")}
                      </p>
                      <p className="font-medium">
                        {receipt.createdAt
                          ? new Date(receipt.createdAt).toLocaleDateString("id", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {t("page.goodsReceipt.detail.updatedAt")}
                      </p>
                      <p className="font-medium">
                        {receipt.updatedAt
                          ? new Date(receipt.updatedAt).toLocaleDateString("id", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "-"}
                      </p>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-[11px] text-muted-foreground">
                        {t("page.goodsReceipt.detail.createdBy")}
                      </p>
                      <p className="font-medium">
                        {receipt.createdByUser?.fullName || receipt.createdByUser?.userName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {t("page.goodsReceipt.detail.updatedBy")}
                      </p>
                      <p className="font-medium">
                        {receipt.modifiedByUser?.fullName ||
                          receipt.modifiedByUser?.userName ||
                          "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
      {printSpec && (
        <div className="hidden print:block print-doc">
          <FormalDocument spec={printSpec} />
        </div>
      )}
    </div>
  );
};

export default DetailGoodsReceipt;

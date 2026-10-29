import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Undo2, Receipt, CreditCard, History, ShoppingBag } from "lucide-react";
import { getOrderById } from "@/services/order";
import { getSplitBillByOrder } from "@/services/split-bill";
import { getAllSalesReturn } from "@/services/sales-return";
import { useLocations } from "@/queries/useLocations";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { dateLocale } from "@/lib/locale";

// One sale, read-only: what was sold, how it was charged and paid, and how
// its status moved. Documents that refer to a sale (sales return, cash
// register history, receivables) link here, and a paid sale can be returned
// from here.

const rupiah = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(dateLocale(), {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

const STATUS_CLASS = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  served: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  void: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
};
const badgeClass = (value) =>
  `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
    STATUS_CLASS[value] || "bg-muted text-foreground"
  }`;

// Options are stored as labels, modifiers as { name }; older rows mix both.
const choiceLabel = (choice) =>
  typeof choice === "string" ? choice : choice?.name || choice?.label || "";

export const canReturnOrder = (order) =>
  !!order &&
  ["paid", "partial"].includes(order.paymentStatus) &&
  !["cancelled", "void"].includes(order.status);

const DetailOrder = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, error, refetch } = useQuery(
    ["order-detail", id],
    () => getOrderById(id),
    { enabled: !!id, retry: false }
  );
  const order = data?.data;

  const isSplit = Number(order?.splitCount) > 1;
  const { data: splitData } = useQuery(["split-bill", id], () => getSplitBillByOrder(id), {
    enabled: !!id && isSplit,
    retry: false
  });
  const splits = Array.isArray(splitData?.data) ? splitData.data : [];
  // The order carries only its store id.
  const { data: locationsData } = useLocations("all");
  const storeName = (locationsData?.data || []).find(
    (loc) => String(loc.id) === String(order?.store)
  )?.name;

  // Returns made against this sale. The list is filtered again here: an API
  // without the orderId filter would answer with every return of the store.
  const {
    data: returnsData,
    isError: returnsError,
    refetch: refetchReturns
  } = useQuery(["order-returns", id], () => getAllSalesReturn({ orderId: id, limit: 50 }), {
    enabled: !!id,
    retry: false
  });
  const returns = (Array.isArray(returnsData?.data) ? returnsData.data : []).filter(
    (r) => String(r.order) === String(id)
  );

  const header = (title, description, actions) => (
    <PageHeader
      breadcrumbs={[
        { label: t("breadcrumb.home"), href: "/dashboard-super-admin", i18nKey: "breadcrumb.home" },
        { label: t("page.order.detail.breadcrumb"), i18nKey: "page.order.detail.breadcrumb" }
      ]}
      title={title}
      description={description}
      backLink="/sales-return"
      dynamicInfo={false}>
      {actions}
    </PageHeader>
  );

  if (isError && error?.response?.status === 404) {
    return <div className="space-y-6">{header(t("page.order.detail.notFound"))}</div>;
  }
  if (isError) {
    return (
      <div className="space-y-6">
        {header(t("page.order.detail.title"))}
        <AbortController refetch={refetch} error={error} />
      </div>
    );
  }
  if (isLoading || !order) {
    return (
      <div className="space-y-6">
        {header(<Skeleton className="h-7 w-48" />, <Skeleton className="h-4 w-64" />)}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 w-full" />
          </Card>
          <Card className="p-5 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-24 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  const statusLabel = t(`page.order.status.${order.status}`, { defaultValue: order.status });
  const paymentLabel = t(`page.cashier.orderQueue.paymentStatus.${order.paymentStatus}`, {
    defaultValue: order.paymentStatus
  });
  const methodLabel = (m) => (m ? t(`page.order.method.${m}`, { defaultValue: m }) : "-");

  const info = [
    [t("page.order.detail.date"), formatDateTime(order.createdAt)],
    [t("page.order.detail.store"), storeName || "-"],
    [t("page.order.detail.cashier"), order.cashierName || "-"],
    [
      t("page.order.detail.customer"),
      order.customerName
        ? `${order.customerName}${order.customerPhone ? ` · ${order.customerPhone}` : ""}`
        : t("page.salesReturn.create.guest")
    ],
    [t("page.order.detail.table"), order.table?.name || "-"],
    [
      t("page.order.detail.source"),
      t(`page.order.source.${order.source}`, { defaultValue: order.source || "-" })
    ]
  ];

  const totals = [
    [t("page.order.detail.subtotal"), order.subTotal],
    Number(order.discountAmount) > 0 && [t("page.order.detail.discount"), -order.discountAmount],
    Number(order.redeemedPoints) > 0 && [
      t("page.order.detail.pointsRedeemed"),
      -order.redeemedPoints
    ],
    Number(order.taxAmount) > 0 && [
      `${t("page.order.detail.tax")}${order.taxRate ? ` (${Number(order.taxRate)}%)` : ""}`,
      order.taxAmount
    ],
    Number(order.serviceChargeAmount) > 0 && [
      `${t("page.order.detail.serviceCharge")}${order.serviceChargeRate ? ` (${Number(order.serviceChargeRate)}%)` : ""}`,
      order.serviceChargeAmount
    ]
  ].filter(Boolean);

  const history = [...(order.statusHistory || [])].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  return (
    <div className="space-y-6">
      {header(
        order.orderNumber || `#${order.id}`,
        t("page.order.detail.subtitle"),
        <>
          <span className={badgeClass(order.status)}>{statusLabel}</span>
          <span className={badgeClass(order.paymentStatus)}>{paymentLabel}</span>
          {canReturnOrder(order) && (
            <Link
              to={`/sales-return/create?orderId=${order.id}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}>
              <Undo2 size={14} aria-hidden="true" />
              {t("page.order.detail.createReturn")}
            </Link>
          )}
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Receipt size={16} className="text-muted-foreground" aria-hidden="true" />
              {t("page.order.detail.info")}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {info.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
              {order.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">{t("page.order.detail.notes")}</dt>
                  <dd className="font-medium whitespace-pre-line">{order.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <ShoppingBag size={16} className="text-muted-foreground" aria-hidden="true" />
              {t("page.order.detail.items")}
            </h2>
            <HorizontalScrollArea className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">
                      {t("page.order.detail.product")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      {t("page.order.detail.qty")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      {t("page.order.detail.price")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      {t("page.order.detail.lineTotal")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(order.items || []).map((item) => {
                    const choices = [...(item.options || []), ...(item.modifiers || [])]
                      .map(choiceLabel)
                      .filter(Boolean);
                    return (
                      <tr key={item.id}>
                        <td className="py-3 px-4">
                          <p className="font-medium">
                            {item.bundleName || item.productName || "-"}
                          </p>
                          {choices.length > 0 && (
                            <p className="text-xs text-muted-foreground">{choices.join(", ")}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">{item.quantity}</td>
                        <td className="py-3 px-4 text-right font-mono">{rupiah(item.price)}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {rupiah(item.totalPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </HorizontalScrollArea>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-muted-foreground" aria-hidden="true" />
              {t("page.order.detail.payment")}
            </h2>
            <dl className="space-y-2 text-sm">
              {totals.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-mono">{value < 0 ? `- ${rupiah(-value)}` : rupiah(value)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
                <dt>{t("page.order.detail.total")}</dt>
                <dd className="font-mono">{rupiah(order.totalPrice)}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-2">
                <dt className="text-muted-foreground">{t("page.order.detail.method")}</dt>
                <dd className="font-medium">{methodLabel(order.paymentMethod)}</dd>
              </div>
            </dl>
            {isSplit && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {t("page.order.detail.splitBill", { count: Number(order.splitCount) })}
                </p>
                <ul className="space-y-1.5 text-sm">
                  {splits.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span>
                        #{s.splitNumber} · {methodLabel(s.paymentMethod)}
                      </span>
                      <span className="font-mono">
                        {rupiah(s.amount)}{" "}
                        <span className={badgeClass(s.status)}>
                          {t(`page.cashier.orderQueue.paymentStatus.${s.status}`, {
                            defaultValue: s.status
                          })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Undo2 size={16} className="text-muted-foreground" aria-hidden="true" />
              {t("page.order.detail.returns")}
            </h2>
            {returnsError ? (
              <div className="text-sm text-muted-foreground">
                <p>{t("common.loadError")}</p>
                <button
                  type="button"
                  onClick={() => refetchReturns()}
                  className="mt-1 text-primary hover:underline">
                  {t("common.retry")}
                </button>
              </div>
            ) : returns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("page.order.detail.noReturns")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {returns.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/sales-return/detail?id=${r.id}`}
                        className="font-medium text-primary hover:underline">
                        {r.returnNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(r.createdAt)} ·{" "}
                        {t(`page.expense.list.${r.status}`, { defaultValue: r.status })}
                      </p>
                    </div>
                    <span className="font-mono">{rupiah(r.refundAmount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <History size={16} className="text-muted-foreground" aria-hidden="true" />
              {t("page.order.detail.history")}
            </h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("page.order.detail.noHistory")}</p>
            ) : (
              <ol className="space-y-3 text-sm border-l border-border pl-4">
                {history.map((h) => (
                  <li key={h.id}>
                    <p className="font-medium">
                      {t(`page.order.status.${h.status}`, { defaultValue: h.status })}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
                    {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetailOrder;

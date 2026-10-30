import { safeGet } from "@/lib/safe-lookup";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import {
  Building2,
  User,
  Calendar,
  Clock,
  DollarSign,
  ShoppingCart,
  Receipt,
  FileText,
  Coins,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext
} from "@/components/ui/pagination";
import { getOrdersByStore } from "@/services/order";
import { getZReport } from "@/services/cash-register";
import { formatStoreDate, formatStoreTime, formatStoreDateTime } from "@/utils/storeTimezone";
import { finalClosingBalance } from "@/utils/registerBalance";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { VARIANCE_STATUS, canDecideVariance } from "@/utils/varianceApproval";
import {
  VarianceApprovalBadge,
  VarianceDecisionControls,
  varianceNoteKey
} from "@/page/cash-register/components/VarianceApproval";

// Phase 39 Batch 6A: the transaction lists were hardcoded to `limit: 100`
// with no page state, silently hiding any register session's transactions
// beyond the first 100 even though pagination.total was always accurate.
// 50 mirrors the backend's own default page size for this same endpoint
// (getOrdersByStore) and the Order Queue's existing convention for order
// lists specifically — CashRegisterHistory's page size of 10 is a
// different list (registers, not transactions) and isn't the right
// precedent to mirror here.
const TRANSACTIONS_PAGE_SIZE = 50;
const formatIDR = (num) => {
  if (!num && num !== 0) return "-";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

const orderStatusBadge = (status) => {
  const map = {
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    void: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-purple-100 text-purple-800",
    ready: "bg-teal-100 text-teal-800",
    served: "bg-muted text-muted-foreground"
  };
  return safeGet(map, status, "bg-muted text-muted-foreground");
};

const CashRegisterDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [cookie] = useCookies();
  const item = location.state?.item;

  const statusCfg = {
    open: { label: t("page.cashRegister.detail.statusOpen"), class: "bg-green-100 text-green-800" },
    closed: {
      label: t("page.cashRegister.detail.statusClosed"),
      class: "bg-muted text-muted-foreground"
    }
  };
  const sc = statusCfg[item?.status] || statusCfg.closed;
  const storeId = item?.store || cookie?.activeStore;

  // Phase 39 Batch 6A: in-window and outside-window are two independent
  // lists (separate queries, separate tables below) — each needs its own
  // page state so navigating one never affects the other.
  const [ordersPage, setOrdersPage] = useState(1);
  const [outsidePage, setOutsidePage] = useState(1);

  // BA finding #1: the API already returns each order's `items` (order_item
  // rows) — the tables used to discard them, so "rincian per invoice" was
  // impossible on this page. A row expands to reveal its line items.
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // A new register/context means both lists' queries change shape — reset
  // both back to page 1 so neither can request a now-invalid stale page.
  useEffect(() => {
    setOrdersPage(1);
    setOutsidePage(1);
    setExpandedOrderId(null);
  }, [item?.id]);

  // Phase 39 Batch 4: the transaction list is scoped by the register
  // lifecycle window server-side (cashRegisterId → openedAt..closedAt on
  // order.createdAt). NEVER derive the window from the opening calendar
  // date — multi-day registers would silently show the wrong day's orders.
  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError,
    refetch
  } = useQuery(
    ["register-orders", storeId, item?.id, ordersPage],
    () =>
      getOrdersByStore({
        location: storeId,
        cashRegisterId: item.id,
        page: ordersPage,
        limit: TRANSACTIONS_PAGE_SIZE
      }),
    { enabled: !!storeId && !!item?.id, keepPreviousData: true }
  );

  const orders = ordersData?.data || [];
  // Phase 39 Finding #3: the badge must reflect every in-window transaction,
  // not just the current page — pagination.total is already the distinct
  // count (fixed in Batch 5's `distinct: true`) over the SAME unfiltered
  // in-window population `orders` renders (all statuses, not just
  // reconciliation-eligible sales), so it's the correct source here, not
  // rec.sales.eligible.count (a narrower, different quantity). Mirrors the
  // outsideTotal pattern below exactly. This must keep reading
  // pagination.total on every page — never orders.length — or Finding #3
  // regresses the moment pagination makes `orders` a partial page again.
  const ordersTotal = ordersData?.pagination?.total ?? orders.length;
  const ordersTotalPages = ordersData?.pagination?.totalPages || 1;

  // Phase 39 Batch 4 follow-up: the outside-window population behind the
  // reconciliation OUTSIDE_WINDOW bucket (same membership, listed 1:1) so
  // users can audit exactly which transactions fell outside the register
  // lifecycle window and why the closing balance ignores them.
  const { data: outsideData } = useQuery(
    ["register-orders-outside", storeId, item?.id, outsidePage],
    () =>
      getOrdersByStore({
        location: storeId,
        cashRegisterId: item.id,
        window: "outside",
        page: outsidePage,
        limit: TRANSACTIONS_PAGE_SIZE
      }),
    { enabled: !!storeId && !!item?.id, keepPreviousData: true }
  );
  const outsideOrders = outsideData?.data || [];
  const outsideTotal = outsideData?.pagination?.total ?? outsideOrders.length;
  const outsideTotalPages = outsideData?.pagination?.totalPages || 1;

  // Batch B: the summary used to render ONLY the frozen close-time snapshot
  // (item.totalSales / item.totalExpenses) next to a live store+date order
  // list of ALL statuses with no stated inclusion rules — irreconcilable by
  // construction. The Z-report now carries an additive `reconciliation`
  // block (eligible sales + explicit exclusion buckets + cash expenses +
  // movements) reusing the exact close-time membership semantics. Render
  // the live breakdown when available; fall back to the stored snapshot
  // when the report is unreachable so the page never renders empty.
  const { data: zReportData } = useQuery(
    ["cash-register-z-report", item?.id],
    () => getZReport(item.id),
    { enabled: !!item?.id }
  );
  const report = zReportData?.data || null;
  const rec = report?.reconciliation || null;
  const summary = report?.summary || null;
  const live = !!rec;

  // DR-15 variance review. The navigation-state row can be stale (it
  // survives reloads), so a decision is offered only from the freshly
  // fetched Z-report: its snapshot summary carries varianceApprovalStatus.
  // Legacy Z-reports (registers closed before close snapshots) carry no
  // status; the row's status is then shown read-only.
  const roleType = cookie?.user?.roleType;
  const [decidedStatus, setDecidedStatus] = useState(null);
  useEffect(() => {
    setDecidedStatus(null);
  }, [item?.id]);
  const hasLiveApproval =
    !!summary && Object.prototype.hasOwnProperty.call(summary, "varianceApprovalStatus");
  const approvalStatus =
    decidedStatus ??
    (hasLiveApproval ? summary.varianceApprovalStatus : item?.varianceApprovalStatus) ??
    null;
  const reviewRegisterStatus = report?.register?.status ?? item?.status;
  const canDecide =
    !decidedStatus &&
    hasLiveApproval &&
    canDecideVariance({
      roleType,
      registerStatus: report?.register?.status,
      approvalStatus: summary.varianceApprovalStatus
    });
  const showReviewFromHistory =
    !!report &&
    !hasLiveApproval &&
    roleType === "super_admin" &&
    approvalStatus === VARIANCE_STATUS.PENDING;
  const reviewVariance = summary?.variance ?? item?.variance;
  const reviewVarianceLabel =
    reviewVariance == null
      ? undefined
      : `${reviewVariance > 0 ? "+" : ""}${formatIDR(reviewVariance)}`;
  const reviewNoteKey = varianceNoteKey(approvalStatus);

  // Phase 39 Batch 6-prereq: register-level timestamps (open/close date,
  // register window caption) must render in the store's local time, not
  // the viewer's browser timezone. Prefer the live z-report's store
  // (freshest), falling back to the history row's storeData.
  const storeTimezone = report?.store?.timezone ?? item?.storeData?.timezone;

  const openingBalance = report?.register?.openingBalance ?? item?.openingBalance;
  const totalSales = rec?.sales?.eligible?.total ?? summary?.totalSales ?? item?.totalSales;
  const totalExpenses =
    rec?.expenses?.includedCash?.total ?? summary?.totalExpenses ?? item?.totalExpenses;
  // Final only once CLOSED; an open register has no closing balance yet.
  const closingBalance = finalClosingBalance({
    status: report?.register?.status ?? item?.status,
    closingBalance: report?.register?.closingBalance ?? item?.closingBalance
  });

  // Per-row eligibility comes from the backend reconciliation identity sets
  // — never recomputed with duplicated FE rules.
  const eligibleIds = useMemo(() => new Set(rec?.sales?.eligible?.orderIds || []), [rec]);
  const reasonById = useMemo(() => {
    const m = new Map();
    (rec?.sales?.excluded || []).forEach((b) =>
      (b.orderIds || []).forEach((id) => {
        if (!m.has(id)) m.set(id, b.code);
      })
    );
    return m;
  }, [rec]);

  const eligibilityOf = (order) => {
    if (!rec) return null;
    if (eligibleIds.has(order.id)) return "included";
    return reasonById.get(order.id) || "notIncluded";
  };

  // Phase 39 Batch 4 follow-up: one table renderer for both the
  // in-window history and the outside-window history. Every row shows the
  // transaction date plus an explicit period badge so "Termasuk periode"
  // vs "Di luar periode" is never ambiguous. Eligibility sub-badges still
  // come from the backend reconciliation identity sets, never FE rules.
  const renderOrderTable = (list, inPeriod, emptyKey) => {
    if (list.length === 0) {
      return (
        <div className="p-6 text-center text-sm text-muted-foreground">
          <Receipt size={32} className="mx-auto text-muted-foreground/40 mb-2" />
          {t(emptyKey)}
        </div>
      );
    }
    return (
      <HorizontalScrollArea contentKey={list}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left">
                {t("page.cashRegister.detail.tableNo")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left">
                {t("page.cashRegister.detail.tableInvoice")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left">
                {t("page.cashRegister.detail.tableCashier")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left">
                {t("page.cashRegister.detail.tableDate")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left">
                {t("page.cashRegister.detail.tableTime")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right">
                {t("page.cashRegister.detail.tableTotal")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center">
                {t("page.cashRegister.detail.tableStatus")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center">
                {t("page.cashRegister.detail.period")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center">
                {t("page.cashRegister.detail.tablePayment")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((o, i) => (
              <React.Fragment key={o.id}>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {/* BA finding #1: every transaction row is expandable so
                        the invoice's line items (product, qty, price, total)
                        are visible without leaving the shift report. Items
                        ride on the same payload — no extra request. */}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-left hover:underline"
                      aria-expanded={expandedOrderId === o.id}
                      aria-label={t("page.cashRegister.detail.toggleItems")}
                      onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}>
                      {expandedOrderId === o.id ? (
                        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                      )}
                      {o.orderNumber || "-"}
                    </button>
                    <Link
                      to={`/order/detail?id=${o.id}`}
                      aria-label={t("page.order.detail.openOrder")}
                      title={t("page.order.detail.openOrder")}
                      className="ml-2 inline-flex align-middle text-muted-foreground hover:text-primary">
                      <ExternalLink size={14} aria-hidden="true" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {o.cashierName || o.createdByUser?.fullName || o.createdByUser?.userName || "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("id")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.createdAt).toTimeString().slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatIDR(o.totalPrice)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${orderStatusBadge(o.status)}`}>
                      {o.status}
                    </span>
                    {(() => {
                      const eligibility = eligibilityOf(o);
                      if (!eligibility) return null;
                      const included = eligibility === "included";
                      return (
                        <div
                          className={`mt-1 text-xs font-semibold ${
                            included ? "text-green-700" : "text-amber-700"
                          }`}>
                          {included
                            ? t("page.cashRegister.detail.included")
                            : eligibility === "notIncluded"
                              ? t("page.cashRegister.detail.notIncluded")
                              : t(`page.cashRegister.detail.reason.${eligibility}`)}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        inPeriod ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}>
                      {inPeriod
                        ? t("page.cashRegister.detail.inPeriod")
                        : t("page.cashRegister.detail.outsidePeriod")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{o.paymentMethod || "-"}</td>
                </tr>
                {expandedOrderId === o.id && (
                  <tr className="bg-muted/30">
                    <td colSpan={9} className="px-4 py-3">
                      {(o.items || []).length > 0 ? (
                        <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/50 text-muted-foreground">
                                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider">
                                  {t("page.cashRegister.detail.itemProduct")}
                                </th>
                                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
                                  {t("page.cashRegister.detail.itemQty")}
                                </th>
                                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
                                  {t("page.cashRegister.detail.itemPrice")}
                                </th>
                                <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
                                  {t("page.cashRegister.detail.itemTotal")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {(o.items || []).map((it) => (
                                <tr key={it.id}>
                                  <td className="px-3 py-1.5">
                                    {it.productName || "-"}
                                    {it.notes && (
                                      <span className="block text-xs text-muted-foreground">
                                        {it.notes}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono">
                                    {it.quantity}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono">
                                    {formatIDR(it.price)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono">
                                    {formatIDR(it.totalPrice)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          {t("page.cashRegister.detail.noItems")}
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </HorizontalScrollArea>
    );
  };

  // Phase 39 Batch 6A: mirrors the existing shadcn Pagination primitive
  // usage pattern (src/components/ui/pagination.jsx, already used the same
  // way for a raw <table> in DetailSupplier.jsx) rather than migrating this
  // page's custom-rendered tables onto DataTable, which would be a much
  // larger, riskier rewrite of the eligibility/period badge cell rendering
  // above. Hidden entirely for a one-page result.
  const renderTablePagination = (page, totalPages, onPageChange) => {
    if (totalPages <= 1) return null;
    const maxVisible = Math.min(totalPages, 5);
    let start = 1;
    if (totalPages > maxVisible) {
      if (page <= 3) start = 1;
      else if (page >= totalPages - 2) start = totalPages - maxVisible + 1;
      else start = page - 2;
    }
    const pageNumbers = Array.from({ length: maxVisible }, (_, i) => start + i);

    return (
      <div className="px-4 py-3 border-t border-border flex justify-center sm:justify-end">
        <Pagination className="sm:justify-end justify-center mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && onPageChange(page - 1)}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {pageNumbers.map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  isActive={pageNum === page}
                  onClick={() => onPageChange(pageNum)}
                  className="cursor-pointer">
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => page < totalPages && onPageChange(page + 1)}
                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  if (!item) {
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
              label: t("page.cashRegister.detail.breadcrumbCashier"),
              href: "/cash-register/current",
              i18nKey: "page.cashRegister.detail.breadcrumbCashier"
            },
            {
              label: t("page.cashRegister.detail.breadcrumbHistory"),
              href: "/cash-register/history",
              i18nKey: "page.cashRegister.detail.breadcrumbHistory"
            },
            { label: t("page.cashRegister.detail.breadcrumb") }
          ]}
          title={t("page.cashRegister.detail.breadcrumb")}
          backLink="/cash-register/history"
          dynamicInfo={false}
        />
        <div className="bg-card p-12 rounded-xl border border-border text-center">
          <Receipt size={48} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{t("page.cashRegister.detail.notFound")}</p>
          <Button
            variant="outline"
            onClick={() => navigate("/cash-register/history")}
            className="mt-4">
            {t("page.cashRegister.detail.backToHistory")}
          </Button>
        </div>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  const leftCol = [
    {
      icon: Building2,
      label: t("page.cashRegister.detail.store"),
      value: item.storeData?.name || "-"
    },
    {
      icon: User,
      label: t("page.cashRegister.detail.openedBy"),
      value: item.userData?.fullName || "-"
    },
    {
      icon: Calendar,
      label: t("page.cashRegister.detail.openDate"),
      value: formatStoreDate(item.openedAt, storeTimezone)
    },
    {
      icon: Clock,
      label: t("page.cashRegister.detail.openTime"),
      value: formatStoreTime(item.openedAt, storeTimezone)
    },
    {
      icon: Calendar,
      label: t("page.cashRegister.detail.closeDate"),
      value: item.closedAt ? formatStoreDate(item.closedAt, storeTimezone) : "-"
    },
    {
      icon: Clock,
      label: t("page.cashRegister.detail.closeTime"),
      value: item.closedAt ? formatStoreTime(item.closedAt, storeTimezone) : "-"
    }
  ];

  const rightCol = [
    {
      icon: DollarSign,
      label: t("page.cashRegister.detail.openingBalance"),
      value: formatIDR(openingBalance),
      mono: true
    },
    {
      icon: ShoppingCart,
      label: t("page.cashRegister.detail.totalSales"),
      value: formatIDR(totalSales),
      mono: true
    },
    {
      icon: Receipt,
      label: t("page.cashRegister.detail.totalExpenses"),
      value: formatIDR(totalExpenses),
      mono: true
    },
    {
      icon: Coins,
      label: t("page.cashRegister.detail.closingBalance"),
      value: closingBalance == null ? "-" : formatIDR(closingBalance),
      mono: true
    },
    { icon: FileText, label: t("page.cashRegister.detail.notes"), value: item.notes || "-" }
  ];

  // Live breakdown rows — rendered only when the reconciliation contract is
  // present; every number traces to a backend query, nothing is summed here.
  const methodRows = (rec?.sales?.eligible?.byPaymentMethod || []).map((r) => ({
    label: `${r.type} · ${r.orders}x`,
    value: formatIDR(r.amount)
  }));
  const excludedSalesRows = (rec?.sales?.excluded || []).map((b) => ({
    label: `${t(`page.cashRegister.detail.reason.${b.code}`)} · ${b.count}x`,
    value: formatIDR(b.total)
  }));
  const expenseCategoryRows = (report?.expenses || []).map((r) => ({
    label: `${r.category} · ${r.count}x`,
    value: formatIDR(r.amount)
  }));
  const expenseRecords = rec?.expenses?.records || [];
  const excludedExpenseRows = (rec?.expenses?.excluded || []).map((b) => ({
    label: `${t(`page.cashRegister.detail.reason.${b.code}`)} · ${b.count}x`,
    value: formatIDR(b.total)
  }));
  const cashRows = summary
    ? [
        {
          label: t("page.cashRegister.detail.cashSalesReceived"),
          value: formatIDR(summary.totalCashPayment)
        },
        {
          label: t("page.cashRegister.detail.activeCashIn"),
          value: formatIDR(summary.activeCashIn)
        },
        {
          label: t("page.cashRegister.detail.activeCashOut"),
          value: formatIDR(summary.activeCashOut)
        },
        {
          label: t("page.cashRegister.detail.expectedCash"),
          value: formatIDR(summary.expectedCash)
        },
        ...(summary.variance !== null && summary.variance !== undefined
          ? [
              {
                label: t("page.cashRegister.detail.variance"),
                value: formatIDR(summary.variance)
              }
            ]
          : [])
      ]
    : [];

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("page.cashRegister.detail.breadcrumbCashier"),
              href: "/cash-register/current",
              i18nKey: "page.cashRegister.detail.breadcrumbCashier"
            },
            {
              label: t("page.cashRegister.detail.breadcrumbHistory"),
              href: "/cash-register/history",
              i18nKey: "page.cashRegister.detail.breadcrumbHistory"
            },
            { label: t("page.cashRegister.detail.breadcrumb") }
          ]}
          title={t("page.cashRegister.detail.title")}
          description={formatStoreDate(item.openedAt, storeTimezone)}
          backLink="/cash-register/history"
          dynamicInfo={false}>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${sc.class}`}>
            {sc.label}
          </span>
        </PageHeader>

        {reviewRegisterStatus === "closed" && approvalStatus && (
          <section
            aria-labelledby="variance-review-title"
            className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/30 px-6 py-3 border-b border-border">
              <h2 id="variance-review-title" className="text-sm font-semibold">
                {t("page.cashRegister.variance.reviewTitle")}
              </h2>
            </div>
            <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <div>
                  <VarianceApprovalBadge status={approvalStatus} />
                </div>
                {reviewNoteKey && (
                  <p className="text-sm text-muted-foreground">{t(reviewNoteKey)}</p>
                )}
                {showReviewFromHistory && (
                  <p className="text-sm text-muted-foreground">
                    {t("page.cashRegister.variance.note.reviewFromHistory")}
                  </p>
                )}
              </div>
              {canDecide && (
                <VarianceDecisionControls
                  registerId={item.id}
                  varianceLabel={reviewVarianceLabel}
                  onDecided={setDecidedStatus}
                />
              )}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/30 px-6 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">{t("page.cashRegister.detail.infoTitle")}</h2>
            </div>
            <div className="p-6">
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody>
                    {leftCol.map((r) => (
                      <tr key={r.label} className="border-b border-muted/30 last:border-b-0">
                        <td className="py-2.5 pr-4 w-40">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <r.icon size={14} />
                            <span>{r.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 font-medium">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/30 px-6 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">
                {t("page.cashRegister.detail.financialSummary")}
              </h2>
            </div>
            <div className="p-6">
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody>
                    {rightCol.map((r) => (
                      <tr key={r.label} className="border-b border-muted/30 last:border-b-0">
                        <td className="py-2.5 pr-4 w-40">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <r.icon size={14} />
                            <span>{r.label}</span>
                          </div>
                        </td>
                        <td
                          className={`py-2.5 ${r.mono ? "font-mono font-semibold" : "font-medium"}`}>
                          {r.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!live && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("page.cashRegister.detail.snapshotFallback")}
                  </p>
                )}
              </HorizontalScrollArea>
            </div>
          </div>
        </div>

        {live && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/30 px-6 py-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-sm font-semibold">{t("page.cashRegister.detail.liveSummary")}</h2>
              {rec?.window?.openedAt && (
                <span className="text-xs text-muted-foreground">
                  {t("page.cashRegister.detail.registerWindow")}:{" "}
                  {formatStoreDateTime(rec.window.openedAt, storeTimezone)}
                  {rec.window.endAt
                    ? ` → ${formatStoreDateTime(rec.window.endAt, storeTimezone)}`
                    : ""}
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {`${t("page.cashRegister.detail.salesBreakdown")} · ${t(
                      "page.cashRegister.detail.salesIncluded"
                    )} (${rec.sales.eligible.count}x)`}
                  </h3>
                  <HorizontalScrollArea>
                    <table className="w-full text-sm mt-1">
                      <tbody>
                        {methodRows.map((r) => (
                          <tr key={r.label} className="border-b border-muted/30 last:border-b-0">
                            <td className="py-1.5 pr-4 text-muted-foreground">{r.label}</td>
                            <td className="py-1.5 text-right font-mono">{r.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                </div>
                {excludedSalesRows.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.cashRegister.detail.salesExcluded")}
                    </h3>
                    <HorizontalScrollArea>
                      <table className="w-full text-sm mt-1">
                        <tbody>
                          {excludedSalesRows.map((r) => (
                            <tr key={r.label} className="border-b border-muted/30 last:border-b-0">
                              <td className="py-1.5 pr-4 text-muted-foreground">{r.label}</td>
                              <td className="py-1.5 text-right font-mono">{r.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </HorizontalScrollArea>
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("page.cashRegister.detail.expenseBreakdown")}
                  </h3>
                  <HorizontalScrollArea>
                    <table className="w-full text-sm mt-1">
                      <tbody>
                        {expenseCategoryRows.map((r) => (
                          <tr key={r.label} className="border-b border-muted/30 last:border-b-0">
                            <td className="py-1.5 pr-4 text-muted-foreground">{r.label}</td>
                            <td className="py-1.5 text-right font-mono">{r.value}</td>
                          </tr>
                        ))}
                        {excludedExpenseRows.map((r) => (
                          <tr key={r.label} className="border-b border-muted/30 last:border-b-0">
                            <td className="py-1.5 pr-4 text-muted-foreground">{r.label}</td>
                            <td className="py-1.5 text-right font-mono">{r.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                </div>
                {expenseRecords.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.cashRegister.detail.expenseRecords")} ({expenseRecords.length}x)
                    </h3>
                    <HorizontalScrollArea>
                      <table className="w-full text-sm mt-1">
                        <tbody>
                          {expenseRecords.map((e) => (
                            <tr key={e.id} className="border-b border-muted/30 last:border-b-0">
                              <td className="py-1.5 pr-4 text-muted-foreground">
                                {e.category || "-"}
                                {e.createdAt
                                  ? ` · ${new Date(e.createdAt).toLocaleString("id")}`
                                  : ""}
                                {e.notes ? ` · ${e.notes}` : ""}
                              </td>
                              <td className="py-1.5 text-right font-mono">{formatIDR(e.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </HorizontalScrollArea>
                  </div>
                )}
                {cashRows.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.cashRegister.detail.cashReconciliation")}
                    </h3>
                    <HorizontalScrollArea>
                      <table className="w-full text-sm mt-1">
                        <tbody>
                          {cashRows.map((r) => (
                            <tr key={r.label} className="border-b border-muted/30 last:border-b-0">
                              <td className="py-1.5 pr-4 text-muted-foreground">{r.label}</td>
                              <td className="py-1.5 text-right font-mono">{r.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </HorizontalScrollArea>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-muted/30 px-6 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t("page.cashRegister.detail.transactionHistory")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("page.cashRegister.detail.transactionCount", { count: ordersTotal })}
            </span>
          </div>
          {ordersLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            renderOrderTable(orders, true, "page.cashRegister.detail.noTransactions")
          )}
          {!ordersLoading &&
            orders.length > 0 &&
            renderTablePagination(ordersPage, ordersTotalPages, setOrdersPage)}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-muted/30 px-6 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t("page.cashRegister.detail.outsideHistory")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("page.cashRegister.detail.transactionCount")} · {outsideTotal}x
            </span>
          </div>
          {renderOrderTable(outsideOrders, false, "page.cashRegister.detail.noOutsideTransactions")}
          {outsideOrders.length > 0 &&
            renderTablePagination(outsidePage, outsideTotalPages, setOutsidePage)}
        </div>
      </div>
    </>
  );
};

export default CashRegisterDetail;

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";
import {
  FileBarChart,
  Printer,
  RefreshCw,
  Wallet,
  Coins,
  CreditCard,
  ReceiptText,
  Store,
  User,
  ChevronDown
} from "lucide-react";
import { getXReport, getZReport, getCashRegisterHistory } from "@/services/cash-register";
import { isCashPayment } from "@/utils/payment";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const formatIDR = (num) => {
  if (num == null || isNaN(num)) return "Rp 0";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

// Top-level smart thermal print handler
const handlePrintReport = (elementId) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Clone node so we don't mess up the react virtual DOM
  const clone = element.cloneNode(true);

  // Strip all buttons/actions that shouldn't be printed
  const noPrintElements = clone.querySelectorAll(".no-print");
  noPrintElements.forEach((el) => el.remove());

  // Create absolute container
  const printContainer = document.createElement("div");
  printContainer.className = "print-report-container-temp";
  printContainer.appendChild(clone);

  // Style tags specifically optimized for 58mm POS receipt printers
  const style = document.createElement("style");
  style.id = "temp-print-style";
  style.textContent = `
    @media screen {
      .print-report-container-temp {
        display: none !important;
      }
    }
    @media print {
      body > * {
        display: none !important;
      }
      .print-report-container-temp {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: 58mm !important;
        background: white !important;
        color: black !important;
        padding: 4px 8px !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        font-family: 'Courier New', Courier, monospace !important;
      }
      .print-report-container-temp * {
        background: white !important;
        color: black !important;
        font-family: 'Courier New', Courier, monospace !important;
      }
      .print-report-container-temp .relative,
      .print-report-container-temp .rounded-2xl {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        background: white !important;
      }
      .print-report-container-temp div {
        border-color: #555 !important;
      }
      .print-report-container-temp .bg-accent\\/40,
      .print-report-container-temp .bg-accent\\/20,
      .print-report-container-temp .bg-accent {
        background: white !important;
        border: 1px dashed #555 !important;
        padding: 6px !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `;

  document.body.appendChild(style);
  document.body.appendChild(printContainer);

  window.print();

  // Cleanup with small timeout to allow window.print() to parse
  setTimeout(() => {
    printContainer.remove();
    style.remove();
  }, 300);
};

const Dashed = () => (
  <div
    className="border-t border-dashed border-border/80 my-3 w-full animate-pulse-subtle"
    aria-hidden="true"
  />
);

const Row = ({ label, value, strong, accent }) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <span className="text-muted-foreground text-xs font-medium">{label}</span>
    <span
      className={`font-mono text-xs ${strong ? "font-bold text-sm text-foreground" : "font-semibold text-muted-foreground"} ${
        accent || ""
      }`}>
      {value}
    </span>
  </div>
);

Row.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
  strong: PropTypes.bool,
  accent: PropTypes.string
};

const ReportView = ({ data, reportType }) => {
  const { t } = useTranslation();
  if (!data) return null;
  const summary = data.summary || {};
  const payments = data.payments || [];
  const expenses = data.expenses || [];
  // Phase 39 Batch 4 follow-up: outside-window buckets already ride along
  // on the Z-report reconciliation block — render them so the XZ page
  // shows exactly which transactions fell outside the register period.
  // Read-only display of the backend payload; nothing is recomputed here.
  const excluded = data.reconciliation?.sales?.excluded || [];
  // BA finding #1: per-product breakdown frozen/live on the report payload.
  const salesByProduct = data.salesByProduct || [];

  // ponytail: Map agregasi + fromEntries — O(N), bebas object injection
  const paymentMap = new Map();
  for (const p of payments) {
    const key = p.type || "cash";
    const existing = paymentMap.get(key);
    if (existing) {
      existing.amount += p.amount;
      existing.count += p.count;
    } else {
      paymentMap.set(key, { amount: p.amount, count: p.count });
    }
  }
  const paymentGroups = Object.fromEntries(paymentMap);

  const uniqueId = `report-${reportType === "Z" ? data.register?.id || "z" : "current"}`;

  return (
    <div
      id={uniqueId}
      className="relative mx-auto bg-card text-card-foreground rounded-2xl border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-none overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.07)]">
      {/* Decorative Brand Top-border */}
      <div
        className={`h-1.5 w-full bg-gradient-to-r ${reportType === "Z" ? "from-amber-500 to-orange-500" : "from-blue-500 to-indigo-500"}`}
      />

      <div className="p-4">
        {/* Store Header */}
        <div className="text-center space-y-1.5 mb-4">
          <div
            className={`inline-flex p-2.5 rounded-full mb-1 ${reportType === "Z" ? "bg-amber-100/60 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" : "bg-blue-100/60 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"}`}>
            <Store size={18} className="animate-pulse" />
          </div>
          <p className="font-bold uppercase tracking-wider text-sm text-foreground">
            {data.store?.name || t("page.cashRegister.xz.storeFallback")}
          </p>
          {data.store?.address && (
            <p className="text-xs text-muted-foreground leading-relaxed px-4">
              {data.store.address}
            </p>
          )}
          {data.store?.phone && (
            <p className="text-xs text-muted-foreground/80 mt-0.5 font-mono">
              {t("page.cashRegister.ui.phone")} {data.store.phone}
            </p>
          )}
        </div>

        <Dashed />

        {/* Report Identification */}
        <div className="space-y-2 my-3">
          <div className="flex items-center justify-center gap-1.5 mb-2 text-muted-foreground">
            <FileBarChart
              size={14}
              className={reportType === "Z" ? "text-amber-500" : "text-blue-500"}
            />
            <p className="font-bold text-xs uppercase tracking-widest">
              {t("page.cashRegister.xz.reportTitle")}
            </p>
          </div>
          <Row
            label={t("page.cashRegister.xz.registerNo")}
            value={`#${data.register?.id || "-"}`}
          />
          <Row
            label={t("page.cashRegister.xz.cashier")}
            value={
              <span className="inline-flex items-center gap-1.5 bg-accent/60 px-2 py-0.5 rounded text-xs text-foreground font-semibold">
                <User size={11} className="text-muted-foreground" />
                {data.cashier?.fullName || "-"}
              </span>
            }
          />
          <Row
            label={t("page.cashRegister.xz.openedAt")}
            value={
              data.register?.openedAt
                ? new Date(data.register.openedAt).toLocaleString(dateLocale(), {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : "-"
            }
          />
          {data.register?.closedAt && (
            <Row
              label={t("page.cashRegister.xz.closedAt")}
              value={new Date(data.register.closedAt).toLocaleString(dateLocale(), {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              })}
            />
          )}
          <Row
            label={t("page.cashRegister.xz.status")}
            value={
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  data.register?.status === "open"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                {data.register?.status === "open"
                  ? t("page.cashRegister.xz.statusOpen")
                  : t("page.cashRegister.xz.statusClosed")}
              </span>
            }
          />
        </div>

        <Dashed />

        {/* Sales Metrics Section */}
        <div className="space-y-1 my-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
            {t("page.cashRegister.xz.summaryTitle")}
          </p>
          <Row
            label={t("page.cashRegister.xz.transactions")}
            value={summary.totalTransactions ?? 0}
          />
          <Row label={t("page.cashRegister.xz.quantity")} value={summary.totalQuantity ?? 0} />
          {!!summary.totalCovers && (
            <Row label={t("page.cashRegister.xz.covers")} value={summary.totalCovers} />
          )}
          <Row label={t("page.cashRegister.xz.subtotal")} value={formatIDR(summary.subtotal)} />
          {summary.discount > 0 && (
            <Row
              label={t("page.cashRegister.xz.discount")}
              value={`-${formatIDR(summary.discount)}`}
              accent="text-emerald-600 dark:text-emerald-400 font-bold"
            />
          )}
          {summary.tax > 0 && (
            <Row label={t("page.cashRegister.xz.tax")} value={formatIDR(summary.tax)} />
          )}
          {summary.serviceCharge > 0 && (
            <Row
              label={t("page.cashRegister.xz.serviceCharge")}
              value={formatIDR(summary.serviceCharge)}
            />
          )}
          <div className="mt-2.5 pt-2.5 border-t border-border/40">
            <Row
              label={t("page.cashRegister.xz.totalSales")}
              value={formatIDR(summary.totalSales)}
              strong
              accent={
                reportType === "Z"
                  ? "text-amber-600 dark:text-amber-400 text-base font-extrabold"
                  : "text-blue-600 dark:text-blue-400 text-base font-extrabold"
              }
            />
          </div>
        </div>

        <Dashed />

        {/* Sales by product (BA finding #1): which items sold this shift —
            name, SKU, qty × average unit price, line total. Rendered only
            when the backend serves rows (legacy frozen Z snapshots carry
            none and simply omit the section). */}
        {salesByProduct.length > 0 && (
          <>
            <div className="space-y-1.5 my-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
                {t("page.cashRegister.xz.salesByProductTitle")}
              </p>
              <div className="space-y-1">
                {salesByProduct.map((p, i) => (
                  <div
                    key={`${p.sku || p.productName || "p"}-${i}`}
                    className="flex items-end justify-between gap-3 py-0.5">
                    <span className="text-xs text-muted-foreground font-medium min-w-0">
                      <span className="block text-foreground font-semibold truncate">
                        {p.productName || "-"}
                      </span>
                      <span className="block text-xs font-mono text-muted-foreground">
                        {p.sku ? `${p.sku} · ` : ""}
                        {p.quantity} × {formatIDR(p.unitPrice)}
                      </span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {formatIDR(p.totalSales)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Dashed />
          </>
        )}

        {/* Payments breakdown */}
        <div className="space-y-1.5 my-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
            {t("page.cashRegister.xz.paymentTitle")}
          </p>
          {Object.entries(paymentGroups).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(paymentGroups).map(([type, p]) => (
                <div key={type} className="flex items-center justify-between gap-4 py-0.5">
                  <span className="text-xs text-muted-foreground font-medium capitalize flex items-center gap-2">
                    {isCashPayment(type) ? (
                      <Coins size={13} className="text-amber-500/80" />
                    ) : (
                      <CreditCard size={13} className="text-blue-500/80" />
                    )}
                    {type}{" "}
                    <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.2 rounded font-mono font-medium">
                      ({p.count})
                    </span>
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {formatIDR(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">-</p>
          )}
        </div>

        {excluded.length > 0 && (
          <>
            <Dashed />
            <div className="space-y-1.5 my-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
                {t("page.cashRegister.xz.outsideTitle")}
              </p>
              <div className="space-y-1">
                {excluded.map((b) => (
                  <div key={b.code} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                      {t(`page.cashRegister.detail.reason.${b.code}`, b.code)}{" "}
                      <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.2 rounded font-mono font-medium">
                        ({b.count})
                      </span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {formatIDR(b.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {expenses.length > 0 && (
          <>
            <Dashed />
            <div className="space-y-1.5 my-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
                {t("page.cashRegister.xz.expenseTitle")} ({formatIDR(summary.totalExpenses)})
              </p>{" "}
              <div className="space-y-1">
                {expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive/70" />
                      {e.category}{" "}
                      <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.2 rounded font-mono font-medium">
                        ({e.count})
                      </span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-destructive">
                      {formatIDR(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Dashed />

        {/* Cash balance and discrepancy segment */}
        <div className="space-y-1.5 my-3 bg-accent/40 dark:bg-accent/25 p-3.5 rounded-xl border border-border/50">
          <Row
            label={t("page.cashRegister.xz.openingBalance")}
            value={formatIDR(data.register?.openingBalance)}
          />
          <Row
            label={t("page.cashRegister.xz.cashPayment")}
            value={formatIDR(summary.totalCashPayment)}
          />
          <Row
            label={t("page.cashRegister.xz.expenses")}
            value={`-${formatIDR(summary.totalExpenses)}`}
            accent="text-destructive font-semibold"
          />

          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-dashed border-border/60">
            <span className="font-bold text-xs text-foreground">
              {t("page.cashRegister.xz.expectedCash")}
            </span>
            <span className="font-mono font-bold text-sm text-primary">
              {formatIDR(summary.expectedCash)}
            </span>
          </div>

          {data.register?.status === "closed" && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground font-medium">
                {t("page.cashRegister.xz.closingBalance")}
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                {formatIDR(data.register?.closingBalance)}
              </span>
            </div>
          )}

          {summary.variance != null && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground font-medium">
                {t("page.cashRegister.xz.variance")}
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                  summary.variance > 0
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : summary.variance < 0
                      ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
                      : "bg-muted text-muted-foreground"
                }`}>
                {summary.variance > 0 ? "+" : ""}
                {formatIDR(summary.variance)}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-dashed border-border/80 text-center mb-2">
          <p className="text-xs text-muted-foreground tracking-wide font-medium">
            {t("page.cashRegister.xz.footer")}
          </p>
        </div>

        {/* Action printing nested in Card, ignored during print */}
        <div className="no-print mt-4 pt-3 border-t border-border/30">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all duration-300 hover:bg-primary hover:text-primary-foreground border-dashed"
            onClick={() => handlePrintReport(uniqueId)}>
            <Printer size={14} />
            {t("page.cashRegister.xz.print")} {t("sidebar.laporan")}{" "}
            {reportType === "Z" ? `#${data.register?.id || ""}` : "X"}
          </Button>
        </div>
      </div>
    </div>
  );
};

ReportView.propTypes = {
  data: PropTypes.shape({
    store: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      address: PropTypes.string,
      city: PropTypes.string,
      phone: PropTypes.string
    }),
    cashier: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      fullName: PropTypes.string
    }),
    register: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      status: PropTypes.string,
      openedAt: PropTypes.string,
      closedAt: PropTypes.string,
      openingBalance: PropTypes.number,
      closingBalance: PropTypes.number
    }),
    summary: PropTypes.shape({
      totalTransactions: PropTypes.number,
      totalQuantity: PropTypes.number,
      totalCovers: PropTypes.number,
      subtotal: PropTypes.number,
      discount: PropTypes.number,
      tax: PropTypes.number,
      serviceCharge: PropTypes.number,
      totalSales: PropTypes.number,
      totalExpenses: PropTypes.number,
      totalCashPayment: PropTypes.number,
      totalNonCashPayment: PropTypes.number,
      expectedCash: PropTypes.number,
      variance: PropTypes.number,
      openingBalance: PropTypes.number
    }),
    payments: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        amount: PropTypes.number,
        count: PropTypes.number
      })
    ),
    salesByProduct: PropTypes.arrayOf(
      PropTypes.shape({
        productName: PropTypes.string,
        sku: PropTypes.string,
        quantity: PropTypes.number,
        unitPrice: PropTypes.number,
        totalSales: PropTypes.number
      })
    ),
    expenses: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string,
        amount: PropTypes.number,
        count: PropTypes.number
      })
    )
  }),
  reportType: PropTypes.oneOf(["X", "Z"]).isRequired
};

const XZReport = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const cookieStoreId = cookie?.activeStore || user?.store;
  // super_admin memilih toko lewat store selector (global filter); "all" = Semua Toko
  const [storeFilter, setStoreFilter] = useGlobalStoreFilter();
  const [selectedRegister, setSelectedRegister] = useState(null);

  const { data: locationsData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || [];

  const storeId = isSuperAdmin ? (storeFilter !== "all" ? storeFilter : null) : cookieStoreId;

  useEffect(() => {
    setSelectedRegister(null);
  }, [storeFilter]);

  const {
    data: xData,
    isLoading: xLoading,
    isError: xError,
    refetch: refetchX
  } = useQuery(["cash-register-x-report", storeId], () => getXReport(storeId), {
    enabled: !!storeId
  });

  const { data: historyData } = useQuery(
    ["cash-register-history-xz", storeId],
    () => getCashRegisterHistory({ limit: 100, store: storeId }),
    { enabled: !!storeId }
  );
  const registers = (historyData?.data || []).filter((r) => r.status === "closed");

  const {
    data: zData,
    isLoading: zLoading,
    isError: zError,
    refetch: refetchZ
  } = useQuery(["cash-register-z-report", selectedRegister], () => getZReport(selectedRegister), {
    enabled: !!selectedRegister
  });

  // Global print handles contextual selection
  const handlePrint = () => {
    if (selectedRegister && zData?.data) {
      handlePrintReport(`report-z`);
    } else if (xData?.data) {
      handlePrintReport(`report-current`);
    } else {
      window.print();
    }
  };

  if (!isSuperAdmin && !cookieStoreId) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            { i18nKey: "page.cashRegister.xz.breadcrumb" }
          ]}
        />
        <div className="flex min-h-full w-full">
          <NoStore />
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: t("breadcrumb.home"), href: "/dashboard-super-admin", i18nKey: "breadcrumb.home" },
    { i18nKey: "page.cashRegister.xz.breadcrumb" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={t("page.cashRegister.xz.title")}
        description={t("page.cashRegister.xz.desc")}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="shadow-sm font-semibold h-9 rounded-lg">
            <Printer size={15} className="mr-1.5" /> {t("page.cashRegister.xz.print")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchX();
              if (selectedRegister) refetchZ();
            }}
            className="shadow-sm font-semibold h-9 rounded-lg">
            <RefreshCw size={15} className="mr-1.5 animate-spin-hover" />{" "}
            {t("page.cashRegister.xz.refresh")}
          </Button>
        </div>
      </PageHeader>

      {isSuperAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card/40 backdrop-blur-sm rounded-2xl border border-border/60 p-3 shadow-[0_4px_20px_rgb(0,0,0,0.015)]">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-primary/10 text-primary rounded-lg shadow-sm">
              <Store size={16} />
            </div>
            <label
              htmlFor="xz-store"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              {t("header.selectStore")}
            </label>
          </div>
          <div className="relative w-full sm:w-72">
            <select
              id="xz-store"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-lg bg-background border border-border/80 text-xs font-semibold appearance-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer shadow-sm hover:border-border">
              <option value="all">{t("header.allStore")}</option>
              {locations.map((loc) => {
                const id = loc.id || loc._id;
                return (
                  <option key={id} value={id}>
                    {loc.name}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* X Report Column */}
        <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/60 p-4 space-y-4 shadow-[0_4px_20px_rgb(0,0,0,0.015)]">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
                <Wallet size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {t("page.cashRegister.xz.xTitle")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("page.cashRegister.ui.currentRegisterStatusNoAdjustments")}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-emerald-950/60 dark:to-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold uppercase tracking-widest shadow-sm border border-emerald-200/50 dark:border-emerald-900/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("common.active")}
            </span>
          </div>

          {isSuperAdmin && !storeId ? (
            <div className="bg-card/60 dark:bg-card/30 p-6 rounded-2xl border border-dashed border-border/60 text-center mx-auto shadow-sm my-6">
              <div className="p-4 bg-accent/40 dark:bg-accent/20 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3 text-muted-foreground/30">
                <Store size={32} />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">
                {t("page.cashRegister.ui.selectAStoreFirst")}
              </h3>
              <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                {t("page.cashRegister.ui.selectAStoreAboveTo")}
              </p>
            </div>
          ) : xLoading ? (
            <div className="flex justify-center p-6">
              <Skeleton className="h-[450px] w-full rounded-2xl" />
            </div>
          ) : xError ? (
            <div className="py-6">
              <AbortController refetch={refetchX} />
            </div>
          ) : xData?.data ? (
            <div className="space-y-4">
              <ReportView data={xData.data} reportType="X" />
              <div className="flex items-start gap-2.5 mx-auto bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 p-3 rounded-xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
                <span className="text-blue-500 text-lg flex-shrink-0 mt-0">ℹ️</span>
                <div>
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-0.5">
                    {t("page.cashRegister.xz.xNote")}
                  </p>
                  <p className="text-xs text-blue-700/80 dark:text-blue-300/70 leading-relaxed">
                    {t("page.cashRegister.ui.theXReportCanBe")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card/60 dark:bg-card/30 p-6 rounded-2xl border border-dashed border-border/60 text-center mx-auto shadow-sm my-6">
              <div className="p-4 bg-accent/40 dark:bg-accent/20 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3 text-muted-foreground/30">
                <ReceiptText size={32} />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">
                {t("page.cashRegister.ui.noActiveRegister")}
              </h3>
              <p className="text-xs text-muted-foreground px-4 mb-5 leading-relaxed">
                {t("page.cashRegister.xz.noOpenRegister")}
              </p>
              <Button
                variant="danger"
                onClick={() => navigate("/cash-register/open-close")}
                className="font-semibold shadow-sm hover:shadow-md rounded-lg px-5 h-9 transition-all"
                size="sm">
                {t("page.cashRegister.xz.openRegister")}
              </Button>
            </div>
          )}
        </div>

        {/* Z Report Column */}
        <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/60 p-4 space-y-4 shadow-[0_4px_20px_rgb(0,0,0,0.015)]">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl shadow-sm">
                <FileBarChart size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {t("page.cashRegister.xz.zTitle")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("page.cashRegister.ui.endOfShiftReportPermanent")}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-100 to-red-50 dark:from-red-950/60 dark:to-red-950/30 text-red-700 dark:text-red-300 text-xs font-extrabold uppercase tracking-widest shadow-sm border border-red-200/50 dark:border-red-900/30">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {t("page.cashRegister.history.closed")}
            </span>
          </div>

          {isSuperAdmin && !storeId ? (
            <div className="bg-card/60 dark:bg-card/30 p-6 rounded-2xl border border-dashed border-border/60 text-center mx-auto shadow-sm">
              <div className="p-4 bg-accent/40 dark:bg-accent/20 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3 text-muted-foreground/30">
                <FileBarChart size={32} />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">
                {t("page.cashRegister.ui.selectAStoreFirst")}
              </h3>
              <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                {t("page.cashRegister.ui.selectAStoreAboveTo2")}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/80 shadow-sm mx-auto overflow-hidden">
              <div className="p-3 bg-gradient-to-r from-accent/30 to-accent/10 dark:from-accent/15 dark:to-accent/5 border-b border-border/40 flex items-center gap-4">
                <label
                  htmlFor="xz-register"
                  className="text-xs font-bold uppercase tracking-widest text-muted-foreground/90 whitespace-nowrap">
                  {t("page.cashRegister.xz.selectRegister")}
                </label>
                {registers.length > 0 ? (
                  <div className="relative flex-1">
                    <select
                      id="xz-register"
                      value={selectedRegister || ""}
                      onChange={(e) => setSelectedRegister(e.target.value)}
                      className="w-full h-9 pl-3 pr-8 rounded-lg bg-background border border-border/80 text-xs font-semibold appearance-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer shadow-sm hover:border-border">
                      <option value="">{t("page.cashRegister.xz.selectPlaceholder")}</option>
                      {registers.map((r) => (
                        <option key={r.id} value={r.id}>
                          #{r.id} · {r.userData?.fullName || "-"} ·{" "}
                          {r.openedAt && !isNaN(new Date(r.openedAt).getTime())
                            ? new Date(r.openedAt).toLocaleDateString(dateLocale(), {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })
                            : "-"}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic font-medium flex-1">
                    {t("page.cashRegister.xz.noClosedRegister")}
                  </p>
                )}
              </div>

              <ScrollArea className="min-h-[300px] [&>[data-radix-scroll-area-viewport]]:max-h-[580px]">
                {selectedRegister ? (
                  zLoading ? (
                    <div className="p-6">
                      <Skeleton className="h-[400px] w-full rounded-2xl animate-pulse" />
                    </div>
                  ) : zError ? (
                    <div className="p-6">
                      <AbortController refetch={refetchZ} />
                    </div>
                  ) : zData?.data ? (
                    <div className="p-4">
                      <ReportView data={zData.data} reportType="Z" />
                    </div>
                  ) : null
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center min-h-[300px]">
                    <div className="p-4 bg-gradient-to-br from-accent/40 to-accent/20 dark:from-accent/20 dark:to-accent/10 rounded-2xl text-muted-foreground/40 mb-4 animate-pulse">
                      <ReceiptText size={32} />
                    </div>
                    <h4 className="text-xs font-bold text-foreground mb-1.5">
                      {t("page.cashRegister.xz.zHint")}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed font-medium">
                      {t("page.cashRegister.ui.selectAClosedRegisterSession")}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default XZReport;

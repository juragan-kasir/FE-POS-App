import React, { useState, useRef, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
  X,
  Printer,
  RotateCcw,
  CheckCircle,
  Users,
  Plus,
  Trash2,
  Banknote,
  Merge,
  FileText,
  MessageCircle,
  ReceiptText
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  createSplitBill,
  getSplitBillByOrder,
  paySplitBill,
  cancelSplitBill,
  mergeSplitBills
} from "@/services/split-bill";
import { getAllTypePayment } from "@/services/type-payment";
import { getInvoiceSetting } from "@/services/invoice";
import { getLocationById } from "@/services/location";
import {
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
  getPostalCode
} from "@/services/general";
import { toast } from "sonner";
import { warnStockShortages } from "@/lib/stock-shortage";
import { printReceipt, printViaBrowser } from "@/utils/thermalPrint";
import ReceiptPaper from "@/components/receipt/ReceiptPaper";
import SendWhatsAppDialog from "./SendWhatsAppDialog";
import { receiptLabels } from "@/components/receipt/receiptLabels";
import { buildAddressLines } from "@/utils/receiptDocument";
import { isRegisterRequiredError } from "@/state/registerRequired";
import { paymentMethodLabel } from "@/utils/payment";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const ReceiptModal = ({ data, onClose, onNewTransaction }) => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const [thermalLoading, setThermalLoading] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const newTransactionRef = useRef(null);
  const formatPrice = (value) => {
    if (value == null || isNaN(value)) return "0";
    return Number(value).toLocaleString("id-ID");
  };

  const user = cookie?.user;
  const storeId =
    cookie?.activeStore || user?.store || data?.storeId || data?.location || data?.store || "";

  const { data: invoiceSettings } = useQuery(
    ["invoice-settings", storeId],
    () => getInvoiceSetting(storeId),
    { enabled: !!storeId }
  );
  const settingsData = invoiceSettings?.data || null;

  const [paperSize, setPaperSize] = useState(settingsData?.paperSize || "58mm");

  React.useEffect(() => {
    if (settingsData?.paperSize) {
      setPaperSize(settingsData.paperSize);
    }
  }, [settingsData?.paperSize]);

  const { data: storeData } = useQuery(
    ["store-detail", storeId],
    () => getLocationById({ id: storeId }),
    { enabled: !!storeId }
  );
  const locationDetail = storeData?.data || storeData || null;

  const { data: provinces } = useQuery(["provinces"], getProvinces, {
    enabled: !!locationDetail?.province && !locationDetail?.provinceName
  });
  const { data: cities } = useQuery(
    ["cities", locationDetail?.province],
    () => getCities(locationDetail.province),
    { enabled: !!locationDetail?.province && !locationDetail?.cityName }
  );
  const { data: districts } = useQuery(
    ["districts", locationDetail?.city],
    () => getDistricts(locationDetail.city),
    { enabled: !!locationDetail?.city && !locationDetail?.districtName }
  );
  const { data: villages } = useQuery(
    ["villages", locationDetail?.district],
    () => getVillages(locationDetail.district),
    { enabled: !!locationDetail?.district && !locationDetail?.villageName }
  );
  const { data: postalCodes } = useQuery(
    ["postal-codes", locationDetail?.village],
    () => getPostalCode(locationDetail.village),
    { enabled: !!locationDetail?.village && !locationDetail?.postalCode }
  );

  const showLogo = settingsData?.showLogo ?? true;
  const showStoreName = settingsData?.showStoreName ?? true;
  const showAddress = settingsData?.showAddress ?? true;
  const showMemberInfo = settingsData?.showMemberInfo ?? true;
  const showSocialMedia = settingsData?.showSocialMedia ?? true;
  const addressFieldsVisible = (() => {
    const raw = settingsData?.addressFieldsVisibility;
    if (!raw) return {};
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return {};
    }
  })();

  const storeName =
    locationDetail?.name ||
    locationDetail?.storeName ||
    data?.storeName ||
    data?.outlet ||
    t("page.cashier.receipt.storeFallback");
  const locationAddress =
    locationDetail?.address ||
    locationDetail?.locationAddress ||
    data?.storeAddress ||
    data?.outletAddress ||
    "";
  const locationDetailAddress =
    locationDetail?.detailLocation || locationDetail?.locationDetail || "";
  const provinceName =
    locationDetail?.provinceName ||
    provinces?.find((p) => p.kode_prov === locationDetail?.province)?.nama_provinsi ||
    locationDetail?.province ||
    "";
  const cityName =
    locationDetail?.cityName ||
    cities?.find((c) => c.kode_kab === locationDetail?.city)?.nama_kabupaten ||
    locationDetail?.city ||
    "";
  const districtName =
    locationDetail?.districtName ||
    districts?.find((d) => d.kode_kec === locationDetail?.district)?.nama_kecamatan ||
    locationDetail?.district ||
    "";
  const villageName =
    locationDetail?.villageName ||
    villages?.find((v) => v.kode_desa === locationDetail?.village)?.nama_desa ||
    locationDetail?.village ||
    "";
  const postalCodeValue = locationDetail?.postalCode || postalCodes?.[0]?.kode_pos || "";
  const storePhone =
    locationDetail?.phoneNumber || locationDetail?.phone || data?.storePhone || data?.phone || "";
  const storeEmail = locationDetail?.email || data?.storeEmail || data?.email || "";

  const buildStoreAddress = () => {
    const parts = [];
    if (addressFieldsVisible.address !== false && locationAddress) parts.push(locationAddress);
    if (addressFieldsVisible.locationDetail !== false && locationDetailAddress)
      parts.push(locationDetailAddress);
    const regionParts = [];
    if (addressFieldsVisible.province !== false && provinceName) regionParts.push(provinceName);
    if (addressFieldsVisible.city !== false && cityName) regionParts.push(cityName);
    if (addressFieldsVisible.district !== false && districtName) regionParts.push(districtName);
    if (addressFieldsVisible.village !== false && villageName) regionParts.push(villageName);
    if (regionParts.length > 0) parts.push(regionParts.join(", "));

    if (addressFieldsVisible.postalCode !== false && postalCodeValue)
      parts.push(`Kode Pos: ${postalCodeValue}`);
    return parts.join(", ");
  };
  const storeAddress = buildStoreAddress();

  const socialMedia = locationDetail?.socialMedia || data?.socialMedia || [];
  // Same fallback as the invoice-settings preview, so an empty footer
  // setting prints the same text in both places.
  const footerText = settingsData?.footer || data?.footer || t("page.invoice.footerDefault");
  const orderNumber =
    data?.orderNumber ||
    data?.invoice ||
    data?.transactionNumber ||
    `#INV-${Date.now().toString().slice(-6)}`;
  const orderId = data?.id || data?._id;
  const transactionDate = data?.createdAt || data?.date || new Date().toISOString();
  const cashierName = data?.cashierName || data?.cashier || "-";
  // C11: mirrors the same table?.name-or-raw-id fallback already used by
  // Dapur KDS (kitchen-display/index.jsx) — only renders once a table
  // association is actually resolved, so an order with no table (takeaway,
  // no tableId) shows nothing rather than a stray label.
  const tableName = data?.table?.name || (data?.tableId ? String(data.tableId) : null);
  const customerName = data?.customerName || data?.customer?.name || "-";
  const paymentMethod = data?.paymentMethod || data?.payment?.method || "-";
  const items = data?.items || data?.orderItems || [];
  const subtotal = data?.subtotal || data?.amount || data?.total || 0;
  const tax = data?.tax || data?.taxAmount || 0;
  const taxRatePercent = (() => {
    if (data?.taxRate == null) {
      return tax > 0 ? Math.round((tax / Math.max(subtotal || 1, 1)) * 100) : 0;
    }
    const r = Number(data.taxRate);
    return r > 1 ? Math.round(r) : Math.round(r * 100);
  })();
  const discount = data?.discountValue || data?.discount || 0;
  const total = data?.total || data?.grandTotal || 0;
  const cashAmount = data?.cashAmount || data?.payment?.cashAmount || 0;
  const changeAmount = data?.changeAmount || data?.payment?.changeAmount || 0;

  const [showSplit, setShowSplit] = useState(false);

  const [splitCount, setSplitCount] = useState(2);
  // ponytail: simple equal-split default, manual override per person
  const [splitAmounts, setSplitAmounts] = useState(() =>
    Array.from({ length: 2 }, (_, i) => (i === 0 ? Math.ceil(total / 2) : Math.floor(total / 2)))
  );

  const queryClient = useQueryClient();
  // Only super_admin/admin may pay/cancel/merge a split (BE:
  // requireRole('super_admin','admin') on those three routes — getByOrder
  // itself has no role restriction, so a kasir can still see the list).
  // Mirrored here purely so a kasir isn't offered an action that is
  // guaranteed to 403 — the BE remains the actual authority.
  // DR-23 §J: split.manage is a kasir default grant (interim mapping);
  // staff ("user") hold no sales/settlement rights. UX gate only — the
  // server's capability check is the authority.
  const canManageSplits = ["super_admin", "admin", "kasir"].includes(user?.roleType);
  const [payingId, setPayingId] = useState(null);
  const [payMethodChoice, setPayMethodChoice] = useState("");
  const [payReference, setPayReference] = useState("");
  const splitNeedsReference = !!payMethodChoice && !["cash", "points"].includes(payMethodChoice);
  const [selectedMergeIds, setSelectedMergeIds] = useState([]);

  const { data: existingSplitsData, refetch: refetchSplits } = useQuery(
    ["split-bills", orderId],
    () => getSplitBillByOrder(orderId),
    { enabled: !!orderId && showSplit }
  );
  const existingSplits = existingSplitsData?.data?.splits || [];
  const splitSummary = existingSplitsData?.data?.summary || {
    totalSplits: 0,
    totalPaid: 0,
    totalPending: 0
  };

  const { data: splitPaymentMethodsData } = useQuery(
    ["payment-methods-active", storeId],
    () => getAllTypePayment({ store: storeId, status: "active" }),
    { enabled: showSplit && canManageSplits && !!storeId }
  );
  const splitPaymentMethods = (
    splitPaymentMethodsData?.data ||
    (Array.isArray(splitPaymentMethodsData) ? splitPaymentMethodsData : []) ||
    []
  ).map((pm) => ({ id: pm.type || pm.id?.toString() || pm.name?.toLowerCase(), label: pm.name }));

  // Reused across retries of the SAME submission (e.g. a network drop after
  // the request already reached the server), so the server-side idempotency
  // check can recognize a resubmit instead of creating a duplicate round of
  // splits. Cleared whenever the actual split content changes, so a
  // genuinely different draft never gets rejected as a "payload mismatch"
  // against a stale key from an earlier edit.
  const splitIdempotencyKeyRef = useRef(null);
  useEffect(() => {
    splitIdempotencyKeyRef.current = null;
  }, [orderId, splitAmounts]);

  const splitMutation = useMutation({
    mutationFn: (payload) => {
      if (!splitIdempotencyKeyRef.current) {
        splitIdempotencyKeyRef.current =
          (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      return createSplitBill({ ...payload, idempotencyKey: splitIdempotencyKeyRef.current });
    },
    onSuccess: () => {
      toast.success(t("page.cashier.receipt.toast.splitSuccess"));
      splitIdempotencyKeyRef.current = null;
      refetchSplits();
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || t("page.cashier.receipt.toast.splitFailed")
      );
    }
  });

  const paySplitMutation = useMutation({
    // DR-23 §D: a non-cash split carries its reference (OTHER: a
    // description); the server refuses it otherwise (422 REFERENCE_REQUIRED)
    // and refuses a reused one (409 DUPLICATE_REFERENCE, BA 004).
    mutationFn: ({ id, paymentMethod, referenceNumber }) =>
      paySplitBill(id, {
        paymentMethod,
        ...(referenceNumber ? { referenceNumber } : {})
      }),
    onSuccess: (result) => {
      toast.success(t("page.cashier.receipt.toast.splitPaySuccess"));
      warnStockShortages(result?.data?.stockShortages, t);
      setPayingId(null);
      setPayMethodChoice("");
      setPayReference("");
      refetchSplits();
      if (result?.data?.orderComplete) {
        // Matches OrderQueue.jsx's actual query keys — each status tab is
        // its own key (["cashier-orders-<status>", store]), not a shared
        // prefix, so each needs its own invalidation call.
        ["pending", "confirmed", "preparing", "ready"].forEach((status) =>
          queryClient.invalidateQueries(["cashier-orders-" + status, storeId])
        );
      }
    },
    onError: (err) => {
      // No open register: the app-wide RegisterRequiredDialog handles it.
      if (isRegisterRequiredError(err)) return;
      const code = err?.response?.data?.code;
      if (code === "DUPLICATE_REFERENCE") {
        toast.error(t("page.cashier.collectPayment.reference.duplicate"));
        return;
      }
      if (code === "REFERENCE_REQUIRED") {
        toast.error(t("page.cashier.collectPayment.reference.required"));
        return;
      }
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t("page.cashier.receipt.toast.splitPayFailed")
      );
    }
  });

  const cancelSplitMutation = useMutation({
    mutationFn: (id) => cancelSplitBill(id),
    onSuccess: () => {
      toast.success(t("page.cashier.receipt.toast.splitCancelSuccess"));
      refetchSplits();
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t("page.cashier.receipt.toast.splitCancelFailed")
      );
    }
  });

  const mergeMutation = useMutation({
    mutationFn: (splitIds) => mergeSplitBills({ order: orderId, splitIds }),
    onSuccess: () => {
      toast.success(t("page.cashier.receipt.toast.splitMergeSuccess"));
      setSelectedMergeIds([]);
      refetchSplits();
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t("page.cashier.receipt.toast.splitMergeFailed")
      );
    }
  });

  const toggleMergeSelect = (id) => {
    setSelectedMergeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSplitCountChange = (n) => {
    const count = Math.max(2, Math.min(20, Number(n) || 2));
    setSplitCount(count);
    const base = Math.floor(total / count);
    const remainder = total - base * count;
    setSplitAmounts(Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base)));
  };

  const handleSplitAmountChange = (idx, val) => {
    setSplitAmounts(splitAmounts.map((amt, i) => (i === idx ? Number(val) || 0 : amt)));
  };

  const handleSplitSubmit = () => {
    const sum = splitAmounts.reduce((s, a) => s + a, 0);
    if (sum !== total) {
      toast.error(
        t("page.cashier.receipt.toast.splitSumError", {
          sum: formatPrice(sum),
          total: formatPrice(total)
        })
      );
      return;
    }
    if (!orderId) {
      toast.error(t("page.cashier.receipt.toast.orderNotFound"));
      return;
    }
    splitMutation.mutate({
      order: orderId,
      items: splitAmounts.map((amount) => ({ amount }))
    });
  };

  const isCashPayment = String(paymentMethod).toLowerCase() === "cash";
  const memberPointsValue =
    data?.customer?.memberPoints ?? data?.customer?.totalPoints ?? data?.customer?.points;
  const redeemedPoints = data?.redeemedPoints || data?.customer?.redeemedPoints || 0;

  // One receipt object drives the on-screen receipt AND every print path
  // (browser, ESC/POS, local bridge), so what is shown is what prints.
  const receiptData = useMemo(
    () => ({
      labels: receiptLabels(t),
      storeName,
      storeAddress,
      storePhone,
      storeEmail,
      addressLines: buildAddressLines(
        {
          address: locationAddress,
          locationDetail: locationDetailAddress,
          village: villageName,
          district: districtName,
          city: cityName,
          province: provinceName,
          postalCode: postalCodeValue,
          phone: storePhone,
          email: storeEmail
        },
        addressFieldsVisible
      ),
      logo: settingsData?.logo || "",
      memberName: customerName !== "-" ? customerName : "",
      memberTier: data?.customer?.memberTier || data?.customer?.tier || "",
      memberPoints: memberPointsValue ?? null,
      orderNumber,
      cashier: cashierName,
      date: transactionDate,
      table: tableName,
      paymentMethod,
      paymentMethodLabel: paymentMethodLabel(paymentMethod),
      items: items.map((i) => ({
        name: i.nameProduct || i.name || "-",
        qty: i.count || i.qty || 0,
        price: i.price || 0,
        total: i.totalPrice || i.price * (i.count || 1) || 0,
        options: i.options || (i.variantName ? [{ name: i.variantName }] : [])
      })),
      subtotal,
      discount,
      tax,
      taxLabel: `${t("page.cashier.tax")} (${taxRatePercent}%)`,
      redeemedPoints,
      total,
      // A receipt recovered from an already-recorded order carries no
      // tender detail — show none rather than invented amounts.
      showTender: isCashPayment && !data?.tenderDetailUnknown,
      cashAmount,
      changeAmount,
      socialMedia,
      footer: footerText,
      showLogo,
      showStoreName,
      showAddress,
      showMemberInfo,
      showSocialMedia,
      socialMediaVisibility: settingsData?.socialMediaVisibility,
      addressFieldsVisibility: addressFieldsVisible,
      memberFieldsVisibility: settingsData?.memberFieldsVisibility,
      paperSize,
      fontSize: settingsData?.fontSize || "normal",
      fontFamily: settingsData?.fontFamily || "monospace",
      lineSpacing: settingsData?.lineSpacing || "normal"
    }),
    // Every value above derives from the order, the invoice settings, the
    // location and its region lookups, and the paper size.
    [
      data,
      settingsData,
      locationDetail,
      paperSize,
      provinces,
      cities,
      districts,
      villages,
      postalCodes,
      t
    ]
  );

  const handleThermalPrint = async () => {
    setThermalLoading(true);
    try {
      await printReceipt(receiptData, "auto");
      toast.success(t("page.cashier.receipt.toast.printSuccess"));
    } catch (err) {
      if (err.name !== "NotFoundError") {
        toast.error(err?.message || t("page.cashier.receipt.toast.printError"));
      }
    } finally {
      setThermalLoading(false);
    }
  };

  return (
    // F9-04: migrated onto the project's accessible Dialog primitive —
    // the manual window-keydown Escape handler (removed) is superseded by
    // Radix's own per-dialog Escape handling, which already closes only
    // the topmost of two stacked dialogs (this modal + the split-bill
    // dialog below), matching the prior "closes whichever layer is on
    // top" behavior without extra code.
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:w-[calc(100vw-2rem)]"
        withX={false}
        aria-describedby={undefined}
        // The next step after a sale is the next sale: land on the primary
        // action so Enter starts it (Tab still reaches every other control).
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          newTransactionRef.current?.focus();
        }}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
          <DialogTitle className="flex min-w-0 items-center gap-2 text-base font-bold">
            <ReceiptText size={18} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{t("page.cashier.receipt.title")}</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div
              role="radiogroup"
              aria-label={t("page.cashier.receipt.paperSize")}
              className="flex items-center rounded-lg bg-muted p-0.5 text-xs">
              {["58mm", "80mm"].map((size) => (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={paperSize === size}
                  onClick={() => setPaperSize(size)}
                  className={`h-8 min-w-[3.25rem] rounded-md px-2.5 font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    paperSize === size
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {size}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          {/* Sale summary: what was charged and how, before the receipt. */}
          <section
            aria-label={t("page.cashier.receipt.summary")}
            className="shrink-0 border-b border-border/60 p-4 sm:px-5 md:w-72 md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle size={22} className="shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("page.cashier.receipt.paymentSuccess")}</p>
                <p className="truncate font-mono text-xs opacity-80" title={orderNumber}>
                  {orderNumber}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 items-baseline gap-x-3 gap-y-2 text-sm md:grid-cols-1 md:gap-y-1">
              <dt className="text-muted-foreground">{t("page.cashier.receipt.totalPaid")}</dt>
              <dd className="text-right text-2xl font-bold tabular-nums md:text-left md:text-3xl">
                Rp{formatPrice(total)}
              </dd>
              <dt className="text-muted-foreground md:mt-3">
                {t("page.cashier.receipt.paidWith")}
              </dt>
              <dd className="text-right font-semibold md:text-left">
                {receiptData.paymentMethodLabel || "-"}
              </dd>
              {receiptData.showTender && (
                <>
                  <dt className="text-muted-foreground md:mt-3">
                    {t("page.cashier.receipt.change")}
                  </dt>
                  <dd className="text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 md:text-left">
                    Rp{formatPrice(changeAmount)}
                  </dd>
                </>
              )}
            </dl>
          </section>

          {/* The receipt exactly as printed, zoomed to fit the column. */}
          <section
            aria-label={t("page.cashier.receipt.preview")}
            className="flex-1 bg-muted/40 p-3 sm:p-5 md:min-h-0 md:overflow-y-auto">
            <ReceiptPaper data={receiptData} fit />
          </section>
        </div>

        <footer className="shrink-0 border-t border-border/60 bg-background p-3 sm:p-4 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              variant="outline"
              className="h-11 rounded-xl border-border/60"
              onClick={handleThermalPrint}
              loading={thermalLoading}>
              <Printer size={16} aria-hidden="true" />
              {t("page.cashier.receipt.thermal")}
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-border/60"
              title={t("page.invoice.pdfHint")}
              onClick={() => printViaBrowser(receiptData)}>
              <FileText size={16} aria-hidden="true" />
              PDF
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-border/60"
              disabled={!orderId}
              onClick={() => setShowWhatsApp(true)}>
              <MessageCircle size={16} aria-hidden="true" />
              <span className="truncate">{t("page.cashier.receipt.sendWA")}</span>
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-border/60"
              onClick={() => {
                setSplitCount(2);
                const base = Math.floor(total / 2);
                setSplitAmounts([total - base, base]);
                setShowSplit(true);
              }}>
              <Users size={16} aria-hidden="true" />
              {t("page.cashier.receipt.split")}
            </Button>
          </div>
          <Button
            ref={newTransactionRef}
            onClick={onNewTransaction}
            className="mt-2 h-12 w-full rounded-xl text-base font-semibold md:mt-0 md:w-56">
            <RotateCcw size={18} aria-hidden="true" />
            {t("page.cashier.receipt.newTransaction")}
          </Button>
        </footer>
      </DialogContent>

      {showWhatsApp && orderId && (
        <SendWhatsAppDialog
          orderId={orderId}
          defaultPhone={
            data?.customer?.phoneNumber || data?.customer?.phone || data?.customerPhone || ""
          }
          onClose={() => setShowWhatsApp(false)}
        />
      )}

      {/* F9-04: a second, independent Dialog for the split-bill sub-flow —
          Radix supports these stacked, and closes only the topmost one on
          Escape, matching the prior "closes whichever layer is on top"
          behavior of the manual handler this replaced. */}
      {showSplit && (
        <Dialog open onOpenChange={(open) => !open && setShowSplit(false)}>
          <DialogContent
            className="max-w-sm max-h-[80vh] flex flex-col overflow-hidden p-0"
            withX={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <DialogTitle className="font-bold">
                  {t("page.cashier.receipt.splitTitle")}
                </DialogTitle>
              </div>
              <button
                onClick={() => setShowSplit(false)}
                className="p-1 rounded-lg hover:bg-accent">
                <X size={16} />
              </button>
            </div>

            {existingSplits.length > 0 ? (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {existingSplits.map((split) => {
                    const isPending = split.status === "pending";
                    const isChoosingMethod = payingId === split.id;
                    const isSelected = selectedMergeIds.includes(split.id);
                    return (
                      <div
                        key={split.id}
                        className={`border rounded-xl p-3 space-y-2 ${
                          isSelected ? "border-primary bg-primary/5" : "border-border/60"
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {canManageSplits && isPending && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMergeSelect(split.id)}
                                className="w-4 h-4 accent-primary"
                                aria-label={t("page.cashier.receipt.splitSelectForMerge")}
                              />
                            )}
                            <span className="text-sm font-semibold">{split.splitNumber}</span>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isPending
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}>
                            {isPending
                              ? t("page.cashier.receipt.splitStatusPending")
                              : t("page.cashier.receipt.splitStatusPaid")}
                          </span>
                        </div>
                        <div className="text-sm font-bold">Rp {formatPrice(split.amount)}</div>

                        {isPending &&
                          canManageSplits &&
                          (isChoosingMethod ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Select value={payMethodChoice} onValueChange={setPayMethodChoice}>
                                  <SelectTrigger className="h-8 text-xs flex-1">
                                    <SelectValue placeholder={t("page.cashier.paymentMethod")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {splitPaymentMethods.map((m) => (
                                      <SelectItem key={m.id} value={m.id}>
                                        {m.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="h-8 w-8 p-0 shrink-0"
                                  aria-label={t("page.cashier.receipt.splitPayConfirm")}
                                  disabled={
                                    !payMethodChoice ||
                                    (splitNeedsReference && !payReference.trim()) ||
                                    paySplitMutation.isLoading
                                  }
                                  onClick={() =>
                                    paySplitMutation.mutate({
                                      id: split.id,
                                      paymentMethod: payMethodChoice,
                                      referenceNumber: splitNeedsReference
                                        ? payReference.trim()
                                        : undefined
                                    })
                                  }>
                                  <CheckCircle size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 shrink-0"
                                  onClick={() => setPayingId(null)}>
                                  <X size={14} />
                                </Button>
                              </div>
                              {splitNeedsReference && (
                                <Input
                                  unstyled
                                  value={payReference}
                                  onChange={(e) => setPayReference(e.target.value)}
                                  aria-label={t(
                                    payMethodChoice === "other"
                                      ? "page.cashier.collectPayment.reference.otherLabel"
                                      : "page.cashier.collectPayment.reference.label"
                                  )}
                                  placeholder={t(
                                    payMethodChoice === "other"
                                      ? "page.cashier.collectPayment.reference.otherPlaceholder"
                                      : "page.cashier.collectPayment.reference.placeholder"
                                  )}
                                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                                  maxLength={FIELD_LIMITS.REFERENCE}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="success"
                                className="flex-1 h-8 text-xs"
                                onClick={() => {
                                  setPayingId(split.id);
                                  setPayMethodChoice("");
                                  setPayReference("");
                                }}>
                                <Banknote size={14} className="mr-1" />
                                {t("page.cashier.receipt.splitPay")}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                className="h-8 w-8 p-0 shrink-0"
                                disabled={cancelSplitMutation.isLoading}
                                aria-label={t("page.cashier.receipt.splitCancel")}
                                onClick={() => cancelSplitMutation.mutate(split.id)}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ))}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border/50 p-4 shrink-0 space-y-2">
                  {splitSummary.totalPending === 0 && splitSummary.totalSplits > 0 && (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium justify-center">
                      <CheckCircle size={16} />
                      {t("page.cashier.receipt.splitAllPaid")}
                    </div>
                  )}
                  {canManageSplits && selectedMergeIds.length >= 2 && (
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs"
                      disabled={mergeMutation.isLoading}
                      onClick={() => mergeMutation.mutate(selectedMergeIds)}>
                      <Merge size={14} className="mr-1" />
                      {t("page.cashier.receipt.splitMergeSelected", {
                        count: selectedMergeIds.length
                      })}
                    </Button>
                  )}
                  <Button variant="danger" className="w-full" onClick={() => setShowSplit(false)}>
                    {t("common.close")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("page.cashier.receipt.splitPeople")}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleSplitCountChange(splitCount - 1)}>
                        <Plus size={14} className="rotate-45" />
                      </Button>
                      <span className="w-8 text-center font-bold">{splitCount}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleSplitCountChange(splitCount + 1)}>
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {splitAmounts.map((amount, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6 shrink-0">
                          #{idx + 1}
                        </span>
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) => handleSplitAmountChange(idx, e.target.value)}
                          className="flex-1"
                        />
                        {splitCount > 2 && (
                          <button
                            onClick={() => {
                              const next = splitAmounts.filter((_, i) => i !== idx);
                              setSplitAmounts(next);
                              setSplitCount(next.length);
                            }}
                            aria-label={t("page.cashier.receipt.splitRemovePerson", {
                              number: idx + 1
                            })}
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm font-medium pt-2 border-t border-border">
                    <span>{t("page.cashier.total")}</span>
                    <span
                      className={
                        splitAmounts.reduce((s, a) => s + a, 0) === total
                          ? "text-primary"
                          : "text-destructive"
                      }>
                      Rp {formatPrice(splitAmounts.reduce((s, a) => s + a, 0))}
                      {splitAmounts.reduce((s, a) => s + a, 0) !== total && (
                        <span className="text-xs ml-1">
                          ({t("page.cashier.receipt.splitMustEqual", { total: formatPrice(total) })}
                          )
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/50 p-4 shrink-0 flex items-center gap-2">
                  <Button variant="danger" className="flex-1" onClick={() => setShowSplit(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="success"
                    className="flex-1"
                    onClick={handleSplitSubmit}
                    loading={splitMutation.isLoading}
                    disabled={splitAmounts.reduce((s, a) => s + a, 0) !== total}>
                    {t("common.save")}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

ReceiptModal.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    orderNumber: PropTypes.string,
    invoice: PropTypes.string,
    transactionNumber: PropTypes.string,
    createdAt: PropTypes.string,
    date: PropTypes.string,
    cashierName: PropTypes.string,
    cashier: PropTypes.string,
    customerName: PropTypes.string,
    customer: PropTypes.shape({ name: PropTypes.string }),
    paymentMethod: PropTypes.string,
    payment: PropTypes.shape({
      method: PropTypes.string,
      cashAmount: PropTypes.number,
      changeAmount: PropTypes.number
    }),
    items: PropTypes.array,
    orderItems: PropTypes.array,
    subtotal: PropTypes.number,
    amount: PropTypes.number,
    total: PropTypes.number,
    tax: PropTypes.number,
    taxAmount: PropTypes.number,
    discountValue: PropTypes.number,
    discount: PropTypes.number,
    grandTotal: PropTypes.number,
    cashAmount: PropTypes.number,
    changeAmount: PropTypes.number,
    tenderDetailUnknown: PropTypes.bool,
    storeName: PropTypes.string,
    storeAddress: PropTypes.string,
    storePhone: PropTypes.string,
    socialMedia: PropTypes.array
  }),
  onClose: PropTypes.func,
  onNewTransaction: PropTypes.func
};

export default ReceiptModal;

import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { X, CheckCircle2, Users, Banknote, Loader2, AlertCircle, Coins } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { warnStockShortages } from "@/lib/stock-shortage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getOrderById, updateOrderStatus } from "@/services/order";
import { getMemberById } from "@/services/member";
import MemberSearchModal from "@/components/MemberSearchModal";
import { REFERENCE_REQUIRED_METHODS, MAX_REFERENCE_LENGTH } from "@/utils/payment";
import { isRegisterRequiredError } from "@/state/registerRequired";

// F4-01: settles an order that already exists (e.g. created through
// BISA-MAKAN's QR ordering flow) instead of the previous workaround of
// re-typing its items into a brand-new POS order — see CashierPage's
// handleLoadOrder, which only pre-fills the cart and leaves the original
// order unpaid. Every mutation here targets the SAME order id/store that was
// already fetched; this component never calls order/create.
const CASHIER_ORDER_QUEUE_STATUSES = ["pending", "confirmed", "preparing", "ready", "served"];

// Mirrors CheckoutModal's own order -> receipt-prop mapping (subTotal ->
// subtotal, totalPrice -> total/grandTotal, item.productName -> nameProduct,
// item.quantity -> count) so ReceiptModal renders identically regardless of
// whether it was opened after a fresh POS sale or after settling an existing
// order here.
//
// DR-04: when the settlement tender is known (the just-validated payload),
// the receipt reflects it instead of fabricating cash = total / change = 0.
// A null tender keeps the legacy bill-view defaults (split-bill preview,
// which is not a settlement).
const toReceiptData = (order, tender = null) => ({
  ...order,
  subtotal: order.subTotal,
  total: order.totalPrice,
  grandTotal: order.totalPrice,
  paymentMethod: tender?.paymentMethod ?? order.paymentMethod,
  cashAmount: tender ? tender.cashAmount : order.totalPrice,
  changeAmount: tender ? tender.changeAmount : 0,
  items: (order.items || []).map((item) => ({
    ...item,
    nameProduct: item.productName,
    count: item.quantity
  }))
});

// DR-04: the canonical settlement methods (same set the BE validates).
// The cashier must tender explicitly — the backend fails closed (422) when
// a method-less order is settled without one.
const SETTLEMENT_METHODS = [
  "cash",
  "qris",
  "debit",
  "credit",
  "transfer",
  "e-wallet",
  "points",
  "other"
];

const CollectPaymentModal = ({ order, store, onClose, onOpenReceipt }) => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("choose"); // choose | confirmFull
  // DR-04 tender state: null method means "not chosen yet" — the effective
  // method falls back to the order's own stated intent (e.g. a QR order's
  // paymentMethod), else cash. Cash input empty means exact tender (the
  // server fills cashReceived = due, changeGiven = 0, same as order/create).
  const [methodChoice, setMethodChoice] = useState(null);
  const [cashReceivedInput, setCashReceivedInput] = useState("");
  // Non-cash reference as typed. Kept across a failed settlement and a
  // method change so the cashier corrects it instead of retyping; sent
  // trimmed, and only for a method that requires it.
  const [referenceInput, setReferenceInput] = useState("");
  // Set when the server refuses the settlement for a missing reference.
  const [referenceRefused, setReferenceRefused] = useState(false);
  // BA 004 (DR-23 §D): the server refused a reference already used for
  // another payment at this store (409 DUPLICATE_REFERENCE).
  const [referenceDuplicate, setReferenceDuplicate] = useState(false);
  // DR-04 P2-1: explicit cashier acknowledgement that the order total will
  // be redeemed from the member's points; reset whenever the method changes.
  const [pointsConfirmed, setPointsConfirmed] = useState(false);
  // DR-16: optional staff-verified member attachment at settlement. Null
  // means "no selection" and the customerId key is omitted entirely, so an
  // anonymous order settles anonymously and an already-attached order keeps
  // its server-side member. The modal never fabricates an explicit null.
  const [attachedMember, setAttachedMember] = useState(null);
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  // Set when the server refuses a different member (409 MEMBER_MISMATCH).
  const [attachConflict, setAttachConflict] = useState(false);
  const attachedMemberId = attachedMember?.id ?? attachedMember?._id ?? null;

  // Always re-fetch the authoritative current state before offering a
  // payment action — the order queue this modal is opened from can be up to
  // 30s stale, and an order already paid/cancelled elsewhere must never be
  // paid again from here.
  const {
    data: orderData,
    isLoading,
    isError
  } = useQuery(["collect-payment-order", order?.id], () => getOrderById(order.id), {
    enabled: !!order?.id,
    retry: false
  });
  const freshOrder = orderData?.data || order;
  // DR-23 §K/§M: a settlement retried after its response was lost is
  // refused with OUTSTANDING_CHANGED; the ledger-derived financialState
  // tells "already fully paid" apart from "amount stale".
  const [confirmedPaid, setConfirmedPaid] = useState(false);
  const [openingReceipt, setOpeningReceipt] = useState(false);
  const isAlreadySettled =
    confirmedPaid ||
    freshOrder?.paymentStatus === "paid" ||
    ["cancelled", "void"].includes(freshOrder?.status);
  const isTerminal = ["cancelled", "void"].includes(freshOrder?.status);

  const amountDue = Number(freshOrder?.totalPrice) || 0;
  // DR-04 P2-1: points settle only against the member already attached to
  // the order (the server derives it from the order; this modal never sends
  // a member id). Guest orders cannot pick points at all.
  const orderMemberId = freshOrder?.customerId || null;
  const isMethodAvailable = (m) => m !== "points" || !!orderMemberId;
  const effectiveMethod =
    methodChoice ??
    (SETTLEMENT_METHODS.includes(freshOrder?.paymentMethod) &&
    isMethodAvailable(freshOrder.paymentMethod)
      ? freshOrder.paymentMethod
      : "cash");
  const isPoints = effectiveMethod === "points";
  const cashReceivedOrNull = cashReceivedInput === "" ? null : Number(cashReceivedInput);
  const cashChange = cashReceivedOrNull === null ? 0 : Math.max(0, cashReceivedOrNull - amountDue);
  // Block confirming cash that cannot cover the bill; the server revalidates
  // everything (422) regardless — this is UX only, never the trust boundary.
  const cashCovers =
    effectiveMethod !== "cash" ||
    cashReceivedOrNull === null ||
    (Number.isInteger(cashReceivedOrNull) && cashReceivedOrNull >= amountDue);

  // Member record backs both the points panel and the DR-16 attach
  // section below (existing attached member's name). Fetched whenever the
  // server-confirmed order carries a member — points gating itself still
  // requires the member to be on the order, never merely staged (the server
  // redeems from the pre-settlement member, so a staged attach cannot
  // redeem in the same settlement). UX only: the server re-checks the
  // balance under a row lock (422).
  const {
    data: memberData,
    isLoading: isMemberLoading,
    isError: isMemberError
  } = useQuery(
    ["collect-payment-member", orderMemberId],
    () => getMemberById({ id: orderMemberId }),
    {
      enabled: !!orderMemberId,
      retry: false
    }
  );
  const member = memberData?.data || null;
  const memberPoints = Number(member?.totalPoints) || 0;
  const pointsRequired = amountDue;
  const pointsToRedeem = Math.min(memberPoints, pointsRequired);
  const pointsSufficient = !!member && memberPoints >= pointsRequired;
  const pointsReady = !isPoints || (pointsSufficient && pointsConfirmed);
  const needsReference = REFERENCE_REQUIRED_METHODS.includes(effectiveMethod);
  // "Other" is a free-form description, not an external transaction
  // reference, so it gets its own label/placeholder/hint wording.
  const isOtherMethod = effectiveMethod === "other";
  const referenceTrimmed = referenceInput.trim();
  // UX only — the server re-checks (422 REFERENCE_REQUIRED).
  const referenceReady = !needsReference || referenceTrimmed !== "";
  const canConfirm = cashCovers && pointsReady && referenceReady;
  let confirmBlockedReason;
  if (!cashCovers) confirmBlockedReason = t("page.cashier.collectPayment.cashInsufficient");
  else if (!pointsReady)
    confirmBlockedReason = !member
      ? t("page.cashier.collectPayment.points.unavailableGuest")
      : !pointsSufficient
        ? t("page.cashier.collectPayment.points.insufficient")
        : t("page.cashier.disabledReason.confirmPoints");
  else if (!referenceReady)
    confirmBlockedReason = isOtherMethod
      ? t("page.cashier.collectPayment.reference.otherRequired")
      : t("page.cashier.collectPayment.reference.required");

  const invalidateOrderQueues = () => {
    CASHIER_ORDER_QUEUE_STATUSES.forEach((status) =>
      queryClient.invalidateQueries(["cashier-orders-" + status, store])
    );
    queryClient.invalidateQueries(["customer-orders"]);
  };

  // react-query's mutation.isLoading flips asynchronously (a tick after
  // mutate() runs), which is too late to stop several fireEvent-speed clicks
  // fired in the same turn — this ref is set synchronously on the very first
  // click, so every click after it is a no-op regardless of render timing.
  const isSubmittingRef = useRef(false);

  const settleMutation = useMutation({
    // DR-04: the settlement carries the actual tender — method always, cash
    // detail only for cash (never fabricated for other methods). The server
    // validates (422) and resolves register attribution; this modal never
    // sends a register id.
    // DR-16: a staff-selected member rides along as customerId so the
    // settlement attaches it and awards loyalty points. Omitted when nothing
    // was selected — anonymous stays anonymous, an existing attachment is
    // left to the server (sending the same id would be an idempotent no-op).
    mutationFn: (tender) =>
      updateOrderStatus({
        id: freshOrder.id,
        store,
        status: "paid",
        changedBy: user?.id,
        changedByName: user?.fullName || user?.userName,
        paymentMethod: tender.paymentMethod,
        ...(attachedMemberId != null ? { customerId: attachedMemberId } : {}),
        ...(tender.paymentMethod === "cash" && tender.cashAmount !== null
          ? { cashAmount: tender.cashAmount, changeAmount: tender.changeAmount }
          : {}),
        ...(tender.referenceNumber ? { referenceNumber: tender.referenceNumber } : {})
      }),
    onSuccess: async (data, tender) => {
      toast.success(t("page.cashier.collectPayment.toast.paidSuccess"));
      warnStockShortages(data?.stockShortages, t);
      invalidateOrderQueues();
      // Re-fetch rather than trust the mutation response for the receipt —
      // updateOrderStatus's response order was loaded without its items
      // association, while the receipt view needs the full item list.
      const refreshed = await getOrderById(freshOrder.id);
      // DR-04: hand the receipt the just-settled tender (server-validated
      // by the 200 above) instead of fabricating cash = total / change = 0.
      const receiptTender =
        tender.paymentMethod === "cash"
          ? {
              paymentMethod: "cash",
              cashAmount: tender.cashAmount ?? amountDue,
              changeAmount: tender.changeAmount ?? 0
            }
          : { paymentMethod: tender.paymentMethod, cashAmount: null, changeAmount: null };
      onOpenReceipt(toReceiptData(refreshed?.data || freshOrder, receiptTender));
      onClose();
    },
    onError: (err) => {
      // No open register: the app-wide RegisterRequiredDialog handles it.
      if (isRegisterRequiredError(err)) return;
      // DR-16: attaching a different member than the order's existing one is
      // refused fail-closed (409 MEMBER_MISMATCH) — never silently replaced.
      // Surface the conflict inline, refresh the server-confirmed order so
      // the displayed member is authoritative again, and stay open for retry.
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 409 && code === "MEMBER_MISMATCH") {
        setAttachConflict(true);
        queryClient.invalidateQueries(["collect-payment-order", freshOrder.id]);
        toast.error(t("page.cashier.collectPayment.member.mismatch"));
        return;
      }
      // DR-23 §D: the server refused the settlement for a missing reference.
      // Nothing was recorded; keep the typed values and point at the field.
      if (status === 409 && code === "DUPLICATE_REFERENCE") {
        setReferenceRefused(true);
        setReferenceDuplicate(true);
        toast.error(t("page.cashier.collectPayment.reference.duplicate"));
        return;
      }
      if (status === 422 && code === "REFERENCE_REQUIRED") {
        setReferenceRefused(true);
        setReferenceDuplicate(false);
        toast.error(
          t(
            isOtherMethod
              ? "page.cashier.collectPayment.reference.otherRequired"
              : "page.cashier.collectPayment.reference.required"
          )
        );
        return;
      }
      // DR-23: the settlement must equal the CURRENT outstanding amount — a
      // stale claim (split paid meanwhile, amount changed) is refused with
      // the live outstanding. Refresh and stay open so the cashier retries
      // against server-confirmed state instead of the stale total.
      if (
        status === 409 &&
        code === "OUTSTANDING_CHANGED" &&
        err?.response?.data?.financialState === "PAID" &&
        Number(err?.response?.data?.outstanding) === 0
      ) {
        // Fully paid already (e.g. this settlement's earlier response was
        // lost) — never imply money is still owed, never settle again.
        setConfirmedPaid(true);
        invalidateOrderQueues();
        queryClient.invalidateQueries(["collect-payment-order", freshOrder.id]);
        toast.info(t("page.cashier.collectPayment.alreadyPaid"));
        return;
      }
      if (status === 409 && code === "OUTSTANDING_CHANGED") {
        queryClient.invalidateQueries(["collect-payment-order", freshOrder.id]);
        const outstanding = err?.response?.data?.outstanding;
        toast.error(
          t("page.cashier.collectPayment.outstandingChanged", {
            amount:
              outstanding === undefined || outstanding === null
                ? amountDue.toLocaleString("id-ID")
                : Number(outstanding).toLocaleString("id-ID")
          })
        );
        return;
      }
      // update-status business failures (422) carry their text in `error`.
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          t("page.cashier.collectPayment.toast.paidFailed")
      );
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    }
  });

  // Opens the receipt of the already-paid order from a fresh read — no
  // settlement is sent. The read carries no ledger cash detail, so the
  // receipt shows none (tenderDetailUnknown) instead of inventing it.
  const handleOpenPaidReceipt = async () => {
    if (openingReceipt) return;
    setOpeningReceipt(true);
    try {
      const refreshed = await getOrderById(freshOrder.id);
      const paid = refreshed?.data || refreshed || freshOrder;
      onOpenReceipt({
        ...toReceiptData(paid, {
          paymentMethod: paid.paymentMethod,
          cashAmount: null,
          changeAmount: null
        }),
        tenderDetailUnknown: true
      });
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("page.cashier.collectPayment.toast.paidFailed")
      );
    } finally {
      setOpeningReceipt(false);
    }
  };

  const handleConfirmFullPayment = () => {
    if (isSubmittingRef.current || settleMutation.isLoading) return;
    if (!canConfirm) return;
    isSubmittingRef.current = true;
    // DR-04 tender: method always; cash detail only when the cashier typed
    // an amount (empty = exact tender, server fills received = due).
    const tender =
      effectiveMethod === "cash" && cashReceivedOrNull !== null
        ? {
            paymentMethod: "cash",
            cashAmount: cashReceivedOrNull,
            changeAmount: cashChange
          }
        : {
            paymentMethod: effectiveMethod,
            cashAmount: null,
            changeAmount: null,
            ...(needsReference ? { referenceNumber: referenceTrimmed } : {})
          };
    setReferenceRefused(false);
    setReferenceDuplicate(false);
    settleMutation.mutate(tender);
  };

  const handleSplitBill = () => {
    onOpenReceipt(toReceiptData(freshOrder));
  };

  const formatPrice = (value) => Number(value || 0).toLocaleString("id-ID");

  return (
    // F9-04: migrated onto the project's accessible Dialog primitive —
    // Escape now closes this modal the same way its own X button already
    // did unconditionally (there was no business rule blocking a close via
    // the X, even mid-mutation), so wiring Escape to the same `onClose`
    // is a consistency fix, not new behavior.
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-y-auto" withX={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <DialogTitle className="text-base font-bold">
            {t("page.cashier.collectPayment.title")}
          </DialogTitle>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 size={20} className="animate-spin mr-2" />
              {t("common.loadingData")}
            </div>
          ) : isError ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-destructive">
                {t("page.cashier.collectPayment.loadFailed")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries(["collect-payment-order", order?.id])}>
                {t("common.retry", "Coba lagi")}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t("page.cashier.collectPayment.orderNumber")}
                </p>
                <p className="font-bold">{freshOrder?.orderNumber}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-sm font-medium">
                  {t("page.cashier.collectPayment.amountDue")}
                </span>
                <span className="text-lg font-bold">Rp {formatPrice(amountDue)}</span>
              </div>

              {isAlreadySettled ? (
                <div className="space-y-2 py-2" data-testid="collect-already-paid">
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium justify-center">
                    <CheckCircle2 size={16} />
                    {t("page.cashier.collectPayment.alreadyPaid")}
                  </div>
                  {!isTerminal && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={openingReceipt}
                      onClick={handleOpenPaidReceipt}>
                      {t("page.cashier.collectPayment.viewReceipt")}
                    </Button>
                  )}
                </div>
              ) : mode === "confirmFull" ? (
                <div className="space-y-3">
                  {/* DR-16: optional staff-verified member attachment. The
                      picker returns a server-looked-up member record (never a
                      free-text name), and the id rides the settlement payload
                      only when explicitly selected. */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {t("page.cashier.collectPayment.member.title")}
                    </p>
                    {attachedMember ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users
                            size={16}
                            className="shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium break-words">
                              {attachedMember.name || attachedMember.nameMember || "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {attachedMember.phoneNumber || attachedMember.phone || ""}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedMember(null);
                            setAttachConflict(false);
                          }}
                          aria-label={t("page.cashier.collectPayment.member.clear")}
                          className="p-2 rounded-lg hover:bg-accent shrink-0">
                          <X size={16} />
                        </button>
                      </div>
                    ) : orderMemberId ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users
                            size={16}
                            className="shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <p className="text-sm font-medium break-words">
                            {member?.name ||
                              `${t("page.cashier.collectPayment.member.attachedToOrder")} #${orderMemberId}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMemberSearchOpen(true)}
                          className="text-sm font-medium text-primary hover:underline shrink-0 px-2 py-2">
                          {t("page.cashier.collectPayment.member.change")}
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11"
                        onClick={() => setMemberSearchOpen(true)}>
                        <Users size={16} className="mr-1.5" />
                        {t("page.cashier.collectPayment.member.attach")}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("page.cashier.collectPayment.member.attachHint")}
                    </p>
                    {attachConflict && (
                      <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {t("page.cashier.collectPayment.member.mismatch")}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("page.cashier.collectPayment.confirmFullDesc")}
                  </p>
                  <div className="space-y-1">
                    <label htmlFor="collect-payment-method" className="text-sm font-medium">
                      {t("page.cashier.paymentMethod")}
                    </label>
                    <select
                      id="collect-payment-method"
                      value={effectiveMethod}
                      onChange={(e) => {
                        setMethodChoice(e.target.value);
                        setPointsConfirmed(false);
                      }}
                      aria-describedby={
                        !orderMemberId ? "collect-payment-points-unavailable" : undefined
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      {SETTLEMENT_METHODS.map((m) => (
                        <option key={m} value={m} disabled={!isMethodAvailable(m)}>
                          {t(`page.cashier.collectPayment.method.${m}`, m)}
                        </option>
                      ))}
                    </select>
                    {!orderMemberId && (
                      <p
                        id="collect-payment-points-unavailable"
                        className="text-xs text-muted-foreground">
                        {t("page.cashier.collectPayment.points.unavailableGuest")}
                      </p>
                    )}
                  </div>
                  {isPoints && (
                    <div
                      className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2"
                      data-testid="collect-payment-points-panel">
                      {isMemberLoading ? (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Loader2 size={16} className="animate-spin mr-2" aria-hidden="true" />
                          {t("page.cashier.collectPayment.points.loadingMember")}
                        </div>
                      ) : isMemberError || !member ? (
                        <p
                          role="alert"
                          className="flex items-start gap-1.5 text-sm text-destructive">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                          {t("page.cashier.collectPayment.points.memberLoadFailed")}
                        </p>
                      ) : (
                        <>
                          <div className="flex items-start gap-2">
                            <Coins
                              size={16}
                              className="mt-0.5 shrink-0 text-violet-500"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium break-words">
                                {member.name || "-"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.phoneNumber || member.phone || "-"}
                              </p>
                            </div>
                          </div>
                          <dl className="space-y-1 text-sm tabular-nums">
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">
                                {t("page.cashier.collectPayment.points.balance")}
                              </dt>
                              <dd
                                className="font-medium"
                                data-testid="collect-payment-points-balance">
                                {formatPrice(memberPoints)} pts
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">
                                {t("page.cashier.collectPayment.points.required")}
                              </dt>
                              <dd
                                className="font-medium"
                                data-testid="collect-payment-points-required">
                                {formatPrice(pointsRequired)} pts
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">
                                {t("page.cashier.collectPayment.points.toRedeem")}
                              </dt>
                              <dd
                                className="font-semibold"
                                data-testid="collect-payment-points-redeem">
                                {formatPrice(pointsToRedeem)} pts
                              </dd>
                            </div>
                          </dl>
                          {pointsSufficient ? (
                            <label
                              htmlFor="collect-payment-points-confirm"
                              className="flex items-start gap-2 pt-1 text-sm cursor-pointer">
                              <Checkbox
                                id="collect-payment-points-confirm"
                                checked={pointsConfirmed}
                                onCheckedChange={(v) => setPointsConfirmed(v === true)}
                                className="mt-0.5"
                              />
                              <span>{t("page.cashier.collectPayment.points.confirmRedeem")}</span>
                            </label>
                          ) : (
                            <p
                              role="alert"
                              className="flex items-start gap-1.5 text-sm text-destructive">
                              <AlertCircle
                                size={16}
                                className="mt-0.5 shrink-0"
                                aria-hidden="true"
                              />
                              {t("page.cashier.collectPayment.points.insufficient")}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {needsReference && (
                    <div className="space-y-1">
                      <label htmlFor="collect-payment-reference" className="text-sm font-medium">
                        {t(
                          isOtherMethod
                            ? "page.cashier.collectPayment.reference.otherLabel"
                            : "page.cashier.collectPayment.reference.label"
                        )}
                      </label>
                      <input
                        id="collect-payment-reference"
                        value={referenceInput}
                        maxLength={MAX_REFERENCE_LENGTH}
                        autoComplete="off"
                        placeholder={t(
                          isOtherMethod
                            ? "page.cashier.collectPayment.reference.otherPlaceholder"
                            : "page.cashier.collectPayment.reference.placeholder"
                        )}
                        onChange={(e) => {
                          setReferenceInput(e.target.value);
                          setReferenceRefused(false);
                          setReferenceDuplicate(false);
                        }}
                        aria-invalid={referenceRefused || undefined}
                        aria-describedby="collect-payment-reference-hint"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      {referenceRefused ? (
                        <p
                          id="collect-payment-reference-hint"
                          role="alert"
                          className="flex items-start gap-1.5 text-sm text-destructive">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                          {t(
                            referenceDuplicate
                              ? "page.cashier.collectPayment.reference.duplicate"
                              : isOtherMethod
                                ? "page.cashier.collectPayment.reference.otherRequired"
                                : "page.cashier.collectPayment.reference.required"
                          )}
                        </p>
                      ) : (
                        <p
                          id="collect-payment-reference-hint"
                          className="text-xs text-muted-foreground">
                          {t(
                            isOtherMethod
                              ? "page.cashier.collectPayment.reference.otherHint"
                              : "page.cashier.collectPayment.reference.hint"
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  {effectiveMethod === "cash" && (
                    <div className="space-y-1">
                      <label htmlFor="collect-payment-cash" className="text-sm font-medium">
                        {t("page.cashier.cashAmount")}
                      </label>
                      <input
                        id="collect-payment-cash"
                        inputMode="numeric"
                        placeholder={String(amountDue)}
                        value={cashReceivedInput}
                        onChange={(e) =>
                          setCashReceivedInput(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <p className="text-sm text-muted-foreground">
                        {t("page.cashier.change")}: Rp {formatPrice(cashChange)}
                      </p>
                      {!cashCovers && (
                        <p className="text-sm text-destructive">
                          {t(
                            "page.cashier.collectPayment.cashInsufficient",
                            "Cash received must cover the amount due."
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={settleMutation.isLoading}
                      onClick={() => setMode("choose")}>
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="success"
                      className="flex-1"
                      loading={settleMutation.isLoading}
                      disabled={!canConfirm}
                      disabledReason={confirmBlockedReason}
                      onClick={handleConfirmFullPayment}>
                      {t("page.cashier.collectPayment.confirm")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="success"
                    className="flex-1 h-11"
                    onClick={() => setMode("confirmFull")}>
                    <Banknote size={16} className="mr-1.5" />
                    {t("page.cashier.collectPayment.payFull")}
                  </Button>
                  <Button variant="outline" className="flex-1 h-11" onClick={handleSplitBill}>
                    <Users size={16} className="mr-1.5" />
                    {t("page.cashier.collectPayment.splitBill")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
      <MemberSearchModal
        open={memberSearchOpen}
        onClose={() => setMemberSearchOpen(false)}
        onSelect={(m) => {
          setAttachedMember(m);
          setAttachConflict(false);
          setMemberSearchOpen(false);
        }}
      />
    </Dialog>
  );
};

CollectPaymentModal.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose: PropTypes.func.isRequired,
  onOpenReceipt: PropTypes.func.isRequired
};

export default CollectPaymentModal;

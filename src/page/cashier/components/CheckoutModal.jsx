import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import {
  X,
  CreditCard,
  Banknote,
  Check,
  Receipt,
  Percent,
  Ticket,
  Users,
  Smartphone,
  Loader2,
  AlertCircle,
  Wallet,
  RotateCcw,
  Search,
  Plus,
  UserPlus,
  ShoppingBag
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { quoteOrder, createOrder, getOrderById } from "@/services/order";
import {
  checkoutAttempts,
  ATTEMPT_STATUS,
  classifyCreateError,
  beginLiveRequest,
  endLiveRequest,
  isRequestLive
} from "@/state/checkout-attempt";
import { getAllCustomer, addCustomer } from "@/services/customer";
import { getAllDiscount, lookupDiscountByCode } from "@/services/discount";
import { getAllMemberTier } from "@/services/member-tier";
import { getAllTypePayment } from "@/services/type-payment";
import { getMemberById } from "@/services/member";
import { getTableAvailability, getTablesWithActiveOrders } from "@/services/table";
import {
  getPaymentIconKind,
  REFERENCE_REQUIRED_METHODS,
  MAX_REFERENCE_LENGTH
} from "@/utils/payment";
import { buildOrderItemsPayload, parsePriceChangedError } from "@/utils/orderPayload";
import { useDebounce } from "@/hooks/useDebounce";
import MemberSearchModal from "@/components/MemberSearchModal";
import { toast } from "sonner";
import { dispatchDisplayEvent, DISPLAY_EVENT_TYPES } from "@/utils/customerDisplayBoard";
import { isRegisterRequiredError } from "@/state/registerRequired";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Input } from "@/components/ui/input";
import { quickCashAmounts } from "../quickCash";

// The customer/discount dropdowns render in a fixed-position portal anchored
// to their input's rect — always below it, with no bounds check. On a
// shorter viewport (tablet, small laptop) with the field scrolled down near
// the bottom of the screen, that pushes the list off-screen entirely. Flip
// it above the input whenever there isn't enough room below; 200px covers
// the list's own max-h-40 (160px) plus its border/padding.
const DROPDOWN_MAX_HEIGHT = 200;

const computeDropdownPos = (rect) => {
  if (!rect) return null;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUpward = spaceBelow < DROPDOWN_MAX_HEIGHT && rect.top > spaceBelow;
  return openUpward
    ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width }
    : { top: rect.bottom + 4, left: rect.left, width: rect.width };
};

const CheckoutModal = ({
  items: propItems,
  store,
  cashierName,
  cashierId,
  onClose,
  onTableChange,
  onComplete,
  onApplyServerPrices
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  // DR-23 §K: the counter-sale attempt — its idempotency key and the exact
  // payload it sent — lives in state/checkout-attempt.js, not in this
  // modal, so closing/reopening the modal (or reloading the tab) never
  // mints a new key while an earlier attempt's outcome is unknown. A new
  // key exists only after the previous attempt was resolved.
  const attempt = checkoutAttempts((s) => s.attempts[String(store ?? "")]) || null;
  useEffect(() => {
    if (store && !attempt) checkoutAttempts.getState().ensureAttempt(store);
  }, [store, attempt]);
  const idempotencyKey = attempt?.key;
  // An `in_flight` attempt with no request running in this page (e.g. the
  // tab was reloaded mid-request) has an unknown outcome — offer the
  // same-payload retry instead of an endless "still processing". A request
  // that IS running keeps `in_flight`, so no concurrent duplicate is sent.
  const attemptStatus =
    attempt?.status === ATTEMPT_STATUS.IN_FLIGHT && !isRequestLive(attempt.key)
      ? ATTEMPT_STATUS.UNKNOWN
      : attempt?.status || ATTEMPT_STATUS.DRAFT;
  const recordedOrder = attempt?.existingOrder || null;
  const [paymentMethod, setPaymentMethod] = useState("");
  // DR-23 §D (BA gap G-02): the reference of a non-cash payment (EDC
  // approval code, QRIS/e-wallet confirmation, transfer reference) or the
  // description of an "other" payment, as typed. Kept across a refusal and a
  // method change so the cashier corrects it instead of retyping.
  const [referenceInput, setReferenceInput] = useState("");
  // Set when the server refuses the sale for a missing (422
  // REFERENCE_REQUIRED) or reused (409 DUPLICATE_REFERENCE) reference.
  const [referenceRefused, setReferenceRefused] = useState(false);
  const [referenceDuplicate, setReferenceDuplicate] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  // Phase 31 Batch 2 (PERF-1): debounce the dropdown text into the
  // server-side nameMember/search filters so typing narrows remotely
  // instead of pulling the whole list on every open.
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);
  const [discountSearch, setDiscountSearch] = useState("");
  const debouncedDiscountSearch = useDebounce(discountSearch, 300);
  const [fullPayment, setFullPayment] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [selectedTier, setSelectedTier] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [memberPoints, setMemberPoints] = useState(0);
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);
  const [orderType, setOrderType] = useState("take-away");
  const [selectedTable, setSelectedTable] = useState(null);
  const [partySize, setPartySize] = useState("");
  const [qrisPending, setQrisPending] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  // D2: the checkout (quoted inputs + tender + table) a pending QRIS was
  // issued for. Confirmation is only valid while the checkout is unchanged.
  const [pendingCheckoutKey, setPendingCheckoutKey] = useState(null);
  // D2: a pending QRIS was invalidated by a checkout change; its QR may still
  // be on the customer display (no clear event exists) and is not payable.
  const [qrisInvalidated, setQrisInvalidated] = useState(false);
  const clearPendingQris = useCallback(() => {
    setQrisPending(false);
    setPendingPayload(null);
    setPendingCheckoutKey(null);
  }, []);
  // The customer-display protocol has no "cancel QRIS" event, so the old QR
  // stays visible there until replaced or auto-dismissed: tell the cashier
  // it is void and that a new QRIS must be started.
  const invalidatePendingQris = useCallback(() => {
    clearPendingQris();
    setQrisInvalidated(true);
    toast.error(
      t(
        "page.cashier.qris.invalidated",
        "QRIS dibatalkan karena checkout berubah. QR di layar pelanggan tidak berlaku — mulai QRIS lagi."
      )
    );
  }, [clearPendingQris, t]);
  // W3-4 (W3-2 contract): a 409 PRICE_CHANGED rejection blocks payment until
  // the cashier explicitly applies the server prices and reviews the total.
  const [priceChange, setPriceChange] = useState(null);
  // Checkout lines in the exact order they were last sent — the server's
  // mismatch `index` addresses this order.
  const submittedLinesRef = useRef([]);
  // P1 quote-stage PRICE_CHANGED: signature of the quote mismatch already
  // surfaced, so an identical 409 is never toasted or re-applied in a loop.
  const surfacedQuoteMismatchRef = useRef(null);
  // F-SMOKE-02: mutation.isLoading flips a tick after mutate() runs, too
  // late to stop several fireEvent-speed clicks in the same turn — mirrors
  // CollectPaymentModal's synchronous guard (set on the click that starts
  // the submission, cleared in onSettled regardless of outcome).
  const isSubmittingRef = useRef(false);
  // Set once the order is created; a finished checkout never voids its QRIS.
  const orderCompletedRef = useRef(false);
  const cashInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const discountSearchRef = useRef(null);
  const customerPortalRef = useRef(null);
  const discountPortalRef = useRef(null);
  const [customerDropdownPos, setCustomerDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [discountDropdownPos, setDiscountDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updateDropdownPos = useCallback(() => {
    const custPos = computeDropdownPos(searchContainerRef.current?.getBoundingClientRect());
    if (custPos) setCustomerDropdownPos(custPos);
    const discPos = computeDropdownPos(discountSearchRef.current?.getBoundingClientRect());
    if (discPos) setDiscountDropdownPos(discPos);
  }, []);

  const items = useMemo(() => {
    if (propItems && propItems.length > 0) {
      return propItems.map((item) => ({
        idProduct: item.id || item.ID || item.idProduct || item._id,
        nameProduct: item.nameProduct || item.name || "",
        price: Number(item.price) || 0,
        variantName: item.variantName || null,
        count: item.count || item.qty || 0,
        image: item.image || item.imageProduct || null,
        discount: Number(item.discountItem) || 0,
        totalPrice: Number(item.totalPrice) || 0,
        // W3-4 (K1/K3): carried through so the payload keeps overrides,
        // bundles, separate options/modifiers and the authoritative flag.
        cartKey: item.cartKey,
        priceOverridden: item.priceOverridden === true,
        priceAuthoritative: item.priceAuthoritative === true,
        isBundle: item.isBundle === true,
        bundleId: item.bundleId,
        selectedOptions: item.selectedOptions,
        selectedModifiers: item.selectedModifiers
      }));
    }
    return [];
  }, [propItems]);

  const { data: customersData } = useQuery(
    ["customers", store, debouncedCustomerSearch],
    () =>
      getAllCustomer({
        page: 1,
        limit: 50,
        store,
        ...(debouncedCustomerSearch ? { nameMember: debouncedCustomerSearch } : {})
      }),
    { enabled: !!store }
  );
  const { data: discountsData } = useQuery(
    ["discounts-active", store, debouncedDiscountSearch],
    () =>
      getAllDiscount({
        page: 1,
        limit: 50,
        location: store,
        status: "active",
        ...(debouncedDiscountSearch ? { search: debouncedDiscountSearch } : {})
      }),
    { enabled: !!store }
  );
  const { data: tiersData } = useQuery(["member-tiers-active"], () =>
    getAllMemberTier({ status: "active" })
  );
  const { data: paymentMethodsData } = useQuery(["payment-methods-active"], () =>
    getAllTypePayment({ store, status: "active" })
  );
  const { data: tablesData, isLoading: tablesLoading } = useQuery(
    ["table-availability", store],
    () => getTableAvailability({ location: store }),
    { enabled: !!store, staleTime: 0, refetchOnMount: true }
  );
  // table.status (above) is the source of truth for physical occupancy: both
  // POS dine-in and QR orders mark their table "occupied" when created, and a
  // POS visit stays occupied until staff "Set Available" it. On top of that,
  // a table with an active (pending..served) QR order is still treated as
  // occupied even if its status says available (e.g. it was released by hand
  // while that QR order was still open). POS orders are deliberately ignored
  // here — their kitchen status says nothing about whether the diners left.
  const {
    data: activeOrdersData,
    isLoading: activeOrdersLoading,
    isFetching: activeOrdersFetching,
    isError: activeOrdersError
  } = useQuery(
    ["table-active-orders", store],
    () => getTablesWithActiveOrders({ location: store }),
    { enabled: !!store, staleTime: 0, refetchOnMount: true }
  );
  const tableIdsWithActiveOrders = useMemo(() => {
    const list = Array.isArray(activeOrdersData?.data) ? activeOrdersData.data : [];
    return new Set(
      list
        .filter((t) => Array.isArray(t.orders) && t.orders.some((o) => o?.source === "qr"))
        .map((t) => t.id)
    );
  }, [activeOrdersData]);
  const allTables = useMemo(() => tablesData?.data?.tables || [], [tablesData]);
  const partySizeNum = Number(partySize) || 0;
  const occupancyLoading = tablesLoading || activeOrdersLoading || activeOrdersFetching;
  const occupancyError = !!activeOrdersError;
  // Fail closed: until occupancy is known (and unless it errored) no table is
  // offered as safely available for a new order.
  const canResolveTableSafety = !occupancyLoading && !occupancyError;
  const availableTables = useMemo(
    () =>
      allTables.filter(
        (t) =>
          t.status === "available" &&
          !tableIdsWithActiveOrders.has(t.id) &&
          (partySizeNum === 0 || Number(t.capacity) >= partySizeNum)
      ),
    [allTables, tableIdsWithActiveOrders, partySizeNum]
  );

  const isQrisPayment = paymentMethod === "e-wallet" || paymentMethod === "qris";

  useEffect(() => {
    onTableChange?.(selectedTable);
  }, [selectedTable, onTableChange]);

  useEffect(() => {
    if (partySize && !selectedTable) {
      setSelectedTable(null);
    }
  }, [partySize, selectedTable]);
  const selectedTableStillFits =
    !selectedTable ||
    !partySizeNum ||
    !selectedTable.capacity ||
    Number(selectedTable.capacity) >= partySizeNum;

  useEffect(() => {
    if (selectedTable && !selectedTableStillFits) setSelectedTable(null);
  }, [selectedTableStillFits, selectedTable]);

  const customerId = selectedCustomer?.id || selectedCustomer?._id;
  const { data: memberData } = useQuery(
    ["member-points", customerId],
    () => getMemberById({ id: customerId }),
    { enabled: !!customerId, retry: false }
  );

  const customers = useMemo(() => {
    const data = customersData?.data || customersData || [];
    const list = Array.isArray(data) ? data : [];
    // ponytail: filter active only client-side; BE doesn't support status filter
    return list.filter((c) => {
      const s = (c.status || "").toString().toLowerCase();
      return !s || s === "active" || s === "true";
    });
  }, [customersData]);

  const discounts = useMemo(() => {
    const data = discountsData?.data || discountsData || [];
    return Array.isArray(data) ? data : [];
  }, [discountsData]);

  const memberTiers = useMemo(() => {
    const data = tiersData?.data || tiersData?.tiers || [];
    return Array.isArray(data) ? data : [];
  }, [tiersData]);

  const paymentMethods = useMemo(() => {
    const data = paymentMethodsData?.data || paymentMethodsData || [];
    const list = Array.isArray(data) ? data : [];
    return list
      .filter((pm) => {
        const s = (pm.status || "").toString().toLowerCase();
        return !s || s === "active" || s === "true";
      })
      .map((pm) => {
        const kind = getPaymentIconKind(pm.type);
        const icon =
          kind === "cash"
            ? Banknote
            : kind === "ewallet"
              ? Smartphone
              : kind === "card"
                ? CreditCard
                : Wallet;
        return {
          id: pm.type || pm.id?.toString() || pm.name?.toLowerCase(),
          label: pm.name,
          icon,
          color: "from-primary to-primary/70"
        };
      });
  }, [paymentMethodsData]);

  // Most sales are cash: preselect it (when the store has it active) so the
  // cashier types the amount and presses Enter, instead of picking a method
  // on every sale. Only until the cashier picks a method themselves.
  const defaultPaymentMethod = paymentMethods.some((m) => m.id === "cash") ? "cash" : "";
  const methodPickedRef = useRef(false);
  useEffect(() => {
    if (!methodPickedRef.current && !paymentMethod && defaultPaymentMethod) {
      setPaymentMethod(defaultPaymentMethod);
    }
  }, [defaultPaymentMethod, paymentMethod]);
  // Cash selected (preselected or clicked) → the amount field is next.
  useEffect(() => {
    if (paymentMethod === "cash") cashInputRef.current?.focus();
  }, [paymentMethod]);

  const matchedTier = useMemo(() => {
    if (!memberPoints || memberTiers.length === 0) return null;
    const active = memberTiers.filter((t) => t.status === "active");
    const exact = active.find((t) => memberPoints >= t.minPoints && memberPoints <= t.maxPoints);
    if (exact) return exact;
    // ponytail: no exact range match; pick highest tier whose minPoints we meet
    return (
      active
        .filter((t) => t.minPoints <= memberPoints)
        .sort((a, b) => b.minPoints - a.minPoints)[0] || null
    );
  }, [memberPoints, memberTiers]);
  // DR-11 / DR-17 (one backend resolver; displayed = charged): every total
  // on this screen is the server's quote for the exact pricing inputs that
  // /order/create will receive — discounts, tier, campaign, points and tax
  // are never re-derived here. Payment is offered only against a quote for
  // the CURRENT inputs, so cash change is reconciled with what is charged.
  const quoteInputs = useMemo(
    () => ({
      store,
      customerId: selectedCustomer?.id || selectedCustomer?._id || null,
      discountId: selectedDiscount?.id || selectedDiscount?._id || null,
      promoCode: promoCode.trim() || undefined,
      redeemedPoints: Number(redeemPoints) || 0,
      items: buildOrderItemsPayload(items)
    }),
    [store, selectedCustomer, selectedDiscount, promoCode, redeemPoints, items]
  );
  const quoteKey = JSON.stringify(quoteInputs);
  // D2: everything a QRIS confirmation commits to besides the cashier — the
  // quoted pricing inputs (tax, discount, promo, member, points, lines and
  // prices) plus tender and table. Same fields handleSubmit puts in the order.
  const checkoutKey = JSON.stringify({
    quote: quoteKey,
    paymentMethod: paymentMethod || null,
    tableId: orderType === "dine-in" ? selectedTable?.id || null : null,
    totalCovers: orderType === "dine-in" ? partySizeNum : 0
  });
  // D2: a pending QRIS is void as soon as its checkout changes — the stored
  // payload must never be confirmed against a different quote.
  // Not after the sale went through: the parent resets the cart (zustand,
  // flushed synchronously) before its batched close unmounts this modal, so
  // one render sees an empty cart with the QRIS still pending — that is the
  // completed sale, not a checkout change.
  useEffect(() => {
    if (orderCompletedRef.current) return;
    if (qrisPending && pendingCheckoutKey !== checkoutKey) invalidatePendingQris();
  }, [qrisPending, pendingCheckoutKey, checkoutKey, invalidatePendingQris]);
  const debouncedQuoteKey = useDebounce(quoteKey, 300);
  const {
    data: quoteData,
    isFetching: quoteFetching,
    isError: quoteFailed,
    error: quoteError,
    refetch: refetchQuote
  } = useQuery(
    ["checkout-quote", debouncedQuoteKey],
    () => quoteOrder(JSON.parse(debouncedQuoteKey)),
    {
      enabled: items.length > 0 && !!store,
      keepPreviousData: true,
      retry: false,
      refetchOnWindowFocus: false
    }
  );
  const quote = quoteFailed ? null : quoteData?.data || null;
  const quoteCurrent = Boolean(quote) && !quoteFetching && debouncedQuoteKey === quoteKey;
  const quoteErrorMessage =
    quoteError?.response?.data?.error ||
    quoteError?.response?.data?.message ||
    t("page.cashier.quote.failed");
  // P1 (quote-stage PRICE_CHANGED): POST /order/quote enforces the same
  // W3-2 contract as create — a 409 PRICE_CHANGED carries the fresh catalog
  // prices for the exact lines the quote sent. A generic retry would resend
  // the same stale expectedPrice lines and fail again, so a strict-contract
  // match is routed into the existing apply-prices flow (same state, panel
  // and toast as the create stage). Anything else — network failure, other
  // 409s, other quote errors — keeps the generic fail-closed alert below.
  // D1: the mismatch identity comes from the 409 contract only (line index,
  // expected and current price) — not from the cart — so the same error seen
  // again across re-renders is never re-surfaced, while a NEW mismatch (e.g.
  // the price moved again after an applied change) always is.
  useEffect(() => {
    if (!quoteFailed || !quoteError) return;
    const parsed = parsePriceChangedError(quoteError, items);
    if (!parsed) return;
    const signature = JSON.stringify(
      parsed.items.map(({ index, expectedPrice, currentPrice }) => [
        index,
        expectedPrice,
        currentPrice
      ])
    );
    if (surfacedQuoteMismatchRef.current === signature) return;
    surfacedQuoteMismatchRef.current = signature;
    setPriceChange({ ...parsed, applied: false });
    // A pending QR/e-wallet confirmation was built from stale prices; drop
    // it so the old expectedPrice can never be re-sent.
    // D2: its QR may still be on the customer display — flag it as void,
    // as the create-stage PRICE_CHANGED does (one "Prices changed" toast).
    if (qrisPending) setQrisInvalidated(true);
    clearPendingQris();
    // Refresh the catalog so items added afterwards use the new prices.
    queryClient.invalidateQueries(["products-outlet", store]);
    queryClient.invalidateQueries(["recipe-availability", store]);
    toast.error(t("page.cashier.priceChanged.title", "Prices changed"));
  }, [quoteFailed, quoteError, items, qrisPending, clearPendingQris, queryClient, store, t]);
  // A fresh valid quote means the current inputs are priced — a later,
  // different mismatch may surface again.
  useEffect(() => {
    if (quote && !quoteFetching) surfacedQuoteMismatchRef.current = null;
  }, [quote, quoteFetching]);
  const quotedSubtotal = quote ? Number(quote.subTotal) || 0 : 0;
  const pointsDiscount = quote ? Number(quote.pointDiscountAmount) || 0 : 0;
  const orderDiscount = quote
    ? Math.max(0, (Number(quote.discountAmount) || 0) - pointsDiscount)
    : 0;
  const taxAmount = quote ? Number(quote.taxAmount) || 0 : 0;
  // Final payable after every discount and redeemed point (server total).
  const total = quote ? Number(quote.totalPrice) || 0 : 0;
  const remainingTotal = total;
  // A sale fully covered by points takes no tender, so no reference.
  const needsReference = remainingTotal > 0 && REFERENCE_REQUIRED_METHODS.includes(paymentMethod);
  const isOtherMethod = paymentMethod === "other";
  const referenceTrimmed = referenceInput.trim();
  // UX only — the server re-checks (422 REFERENCE_REQUIRED).
  const referenceReady = !needsReference || referenceTrimmed !== "";
  // The server clamps the order discount to the subtotal; points beyond
  // what is left after the order discount buy nothing.
  const redeemCeiling = Math.max(0, quotedSubtotal - orderDiscount);
  const cashAmountNum = parseFloat(cashAmount) || 0;
  const change = Math.max(0, cashAmountNum - remainingTotal);

  const applyFullPayment = useCallback(() => {
    setFullPayment(true);
    setCashAmount(String(Math.ceil(total / 1000) * 1000));
  }, [total]);

  const handleDiscountSelect = useCallback((disc) => {
    setSelectedDiscount(disc);
    setDiscountSearch(disc.nameDiscount || disc.name || disc.discountName || "");
    setShowDiscountDropdown(false);
  }, []);

  const clearDiscount = useCallback(() => {
    setSelectedDiscount(null);
    setPromoCode("");
    setDiscountSearch("");
  }, []);

  const handleApplyPromoCode = useCallback(async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await lookupDiscountByCode(promoCode.trim().toUpperCase(), store);
      const disc = res?.data || res;
      if (disc?.id || disc?._id) {
        setSelectedDiscount(disc);
        toast.success(t("page.cashier.promoApplied"));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || t("page.cashier.promoInvalid"));
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, store, t]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        (c.name || c.Name || "").toLowerCase().includes(q) ||
        (c.phone || c.Phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const filteredDiscounts = useMemo(() => {
    if (!discountSearch) return discounts;
    const q = discountSearch.toLowerCase();
    return discounts.filter((d) =>
      (d.nameDiscount || d.name || d.discountName || "").toLowerCase().includes(q)
    );
  }, [discounts, discountSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target) &&
        !customerPortalRef.current?.contains(e.target)
      ) {
        setShowCustomerDropdown(false);
      }
      if (
        discountSearchRef.current &&
        !discountSearchRef.current.contains(e.target) &&
        !discountPortalRef.current?.contains(e.target)
      ) {
        setShowDiscountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showCustomerDropdown && !showDiscountDropdown) return;
    const updatePos = () => {
      const custPos = computeDropdownPos(searchContainerRef.current?.getBoundingClientRect());
      if (custPos) setCustomerDropdownPos(custPos);
      const discPos = computeDropdownPos(discountSearchRef.current?.getBoundingClientRect());
      if (discPos) setDiscountDropdownPos(discPos);
    };
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [showCustomerDropdown, showDiscountDropdown]);

  useEffect(() => {
    if (customerId) {
      const pts = memberData?.data?.totalPoints || memberData?.totalPoints || 0;
      setMemberPoints(Number(pts));
      setRedeemPoints("");
    } else {
      setMemberPoints(0);
      setRedeemPoints("");
    }
  }, [customerId, memberData]);

  // The attempt's lifecycle is recorded here, around the request itself, so
  // it is correct even when this modal unmounts before the response lands.
  const sendAttempt = useCallback(
    async (payload) => {
      const attempts = checkoutAttempts.getState();
      const before = attempts.attempts[String(store ?? "")]?.status;
      attempts.markInFlight(store, payload);
      beginLiveRequest(payload.idempotencyKey);
      try {
        const res = await createOrder(payload);
        const order = res?.data || res;
        attempts.markRecorded(store, {
          id: order?.id,
          orderNumber: order?.orderNumber || null,
          totalPrice: Number(order?.totalPrice),
          paymentStatus: order?.paymentStatus || null
        });
        return res;
      } catch (err) {
        const outcome = classifyCreateError(err);
        if (outcome.kind === "unknown") attempts.markUnknown(store);
        else if (outcome.kind === "unconfirmed") {
          attempts.markUnknown(store, {
            reason: "unconfirmed",
            serverMessage: outcome.serverMessage
          });
        } else if (outcome.kind === "conflict") attempts.markConflict(store, outcome.existingOrder);
        else if (
          outcome.kind === "auth" &&
          [ATTEMPT_STATUS.UNKNOWN, ATTEMPT_STATUS.CONFLICT].includes(before)
        ) {
          // 401/403 says nothing about the earlier request — keep it open.
          attempts.update(store, { status: before });
        } else attempts.markRefused(store);
        err.attemptOutcome = outcome;
        throw err;
      } finally {
        endLiveRequest(payload.idempotencyKey);
      }
    },
    [store]
  );

  const mutation = useMutation({
    mutationFn: sendAttempt,
    onSuccess: (res, variables) => {
      orderCompletedRef.current = true;
      clearPendingQris();
      toast.success(t("page.cashier.transactionSuccess"));
      const order = res?.data || res;
      checkoutAttempts.getState().resolve(store);
      queryClient.invalidateQueries(["products-outlet", store]);
      queryClient.invalidateQueries(["recipe-availability", store]);
      queryClient.invalidateQueries(["categories-cashier", store]);
      queryClient.invalidateQueries(["products"]);
      onComplete({
        ...order,
        subtotal: order.subTotal,
        total: order.totalPrice,
        grandTotal: order.totalPrice,
        // F9-01: the backend recomputes prices/total server-side and
        // ignores whatever the client submitted — reconciling changeAmount
        // against the client's pre-submit `variables.changeAmount` (computed
        // against the client's own, possibly stale, total) could show cash
        // change that doesn't match what was actually charged. Always
        // derive it from the server-authoritative `order.totalPrice`.
        cashAmount: variables.paymentMethod === "cash" ? variables.cashAmount : order.totalPrice,
        changeAmount:
          variables.paymentMethod === "cash"
            ? Math.max(0, Number(variables.cashAmount || 0) - Number(order.totalPrice || 0))
            : 0,
        items: (order.items || []).map((item) => ({
          ...item,
          nameProduct: item.productName,
          count: item.quantity
        })),
        customer: selectedCustomer
          ? {
              name: selectedCustomer.name || selectedCustomer.Name,
              memberTier: matchedTier?.name || "",
              memberPoints: Number(
                selectedCustomer.totalPoints ||
                  selectedCustomer.TotalPoints ||
                  memberData?.data?.totalPoints ||
                  0
              )
            }
          : null
      });
    },
    onError: (err, variables) => {
      const outcome = err?.attemptOutcome || classifyCreateError(err);
      // No open register: refused before anything was written; the app-wide
      // RegisterRequiredDialog explains it and links to opening one. A
      // pending QRIS confirmation is kept — the customer may already have paid.
      if (isRegisterRequiredError(err)) return;
      // DR-23 §K: the sale may already be recorded — never invite a fresh
      // sale here; the attempt panel offers the same-payload retry.
      if (outcome.kind === "unknown") {
        clearPendingQris();
        toast.error(t("page.cashier.attempt.unknownToast"));
        return;
      }
      if (outcome.kind === "conflict") {
        clearPendingQris();
        toast.error(t("page.cashier.attempt.conflictToast"));
        return;
      }
      // A 409 that neither proves a recorded sale nor guarantees no write:
      // neutral wording, attempt kept (see classifyCreateError).
      if (outcome.kind === "unconfirmed") {
        clearPendingQris();
        toast.error(t("page.cashier.attempt.unconfirmedToast"));
        return;
      }
      // DR-23 §D: refused for a missing or reused reference before anything
      // was written. Keep the typed values (and a pending QRIS: the customer
      // has paid, only the reference needs correcting) and point at the field.
      if (outcome.code === "DUPLICATE_REFERENCE" || outcome.code === "REFERENCE_REQUIRED") {
        const duplicate = outcome.code === "DUPLICATE_REFERENCE";
        setReferenceRefused(true);
        setReferenceDuplicate(duplicate);
        toast.error(
          t(
            duplicate
              ? "page.cashier.collectPayment.reference.duplicate"
              : variables?.paymentMethod === "other"
                ? "page.cashier.collectPayment.reference.otherRequired"
                : "page.cashier.collectPayment.reference.required"
          )
        );
        return;
      }
      // DR-23 §M TOTAL_CHANGED: nothing was written — the payable moved
      // (e.g. a promo stopped applying). Re-quote and show the new total
      // before the cashier pays again; never a sign of an existing sale.
      if (outcome.code === "TOTAL_CHANGED") {
        clearPendingQris();
        if (["qris", "e-wallet"].includes(variables?.paymentMethod)) setQrisInvalidated(true);
        queryClient.invalidateQueries(["checkout-quote"]);
        toast.error(t("page.cashier.attempt.totalChanged"));
        return;
      }
      // W3-4 (W3-2 contract): the server refused the order because prices
      // changed. Nothing was written. Block payment until the cashier applies
      // the server prices; never retry or touch the cart automatically.
      const priceChanged = parsePriceChangedError(err, submittedLinesRef.current);
      if (priceChanged) {
        setPriceChange({ ...priceChanged, applied: false });
        // A pending QR/e-wallet confirmation was built from the stale prices;
        // drop it so the old expectedPrice can never be re-sent.
        clearPendingQris();
        // D2: a refused QRIS confirmation leaves its QR on the customer
        // display — flag it as void until a new QRIS is started.
        if (["qris", "e-wallet"].includes(variables?.paymentMethod)) setQrisInvalidated(true);
        // Refresh the catalog so items added afterwards use the new prices.
        queryClient.invalidateQueries(["products-outlet", store]);
        queryClient.invalidateQueries(["recipe-availability", store]);
        toast.error(t("page.cashier.priceChanged.title", "Prices changed"));
        return;
      }
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          t("page.cashier.transactionError")
      );
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    }
  });

  const priceChangePending = Boolean(priceChange) && !priceChange.applied;

  // DR-23 §K: while the previous attempt's outcome is not settled, no new
  // sale may be submitted — only the same payload may be resent (same key),
  // or the recorded order recovered.
  const attemptBlocking =
    attemptStatus === ATTEMPT_STATUS.UNKNOWN ||
    attemptStatus === ATTEMPT_STATUS.CONFLICT ||
    (attemptStatus === ATTEMPT_STATUS.RECORDED && !mutation.isLoading && !mutation.isSuccess) ||
    (attemptStatus === ATTEMPT_STATUS.IN_FLIGHT && !mutation.isLoading);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // Resend exactly what the unresolved attempt sent, under the same key:
  // the server replays it if it was recorded, or records it once.
  const handleRetryAttempt = useCallback(() => {
    if (!attempt?.payload || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    mutation.mutate(attempt.payload);
  }, [attempt, mutation]);

  // Hand the already-recorded order to the receipt (as a completed sale).
  // GET /order/get-order does not carry the ledger's cash received/change,
  // so the receipt shows no tender detail rather than inventing it.
  const handleOpenRecordedOrder = useCallback(async () => {
    if (!recordedOrder?.id || recovering) return;
    setRecovering(true);
    try {
      const res = await getOrderById(recordedOrder.id);
      const order = res?.data || res;
      checkoutAttempts.getState().resolve(store);
      onComplete({
        ...order,
        subtotal: order.subTotal,
        total: order.totalPrice,
        grandTotal: order.totalPrice,
        tenderDetailUnknown: true,
        cashAmount: null,
        changeAmount: null,
        items: (order.items || []).map((item) => ({
          ...item,
          nameProduct: item.productName,
          count: item.quantity
        })),
        customer: null
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || t("page.cashier.attempt.recoverFailed"));
    } finally {
      setRecovering(false);
    }
  }, [recordedOrder, recovering, store, onComplete, t]);

  // Explicit cashier decision after checking the order queue/history: the
  // unresolved attempt is dropped and the next sale gets a new key.
  // Two steps, never offered when the recorded order is identified.
  const handleDiscardAttempt = useCallback(() => {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    checkoutAttempts.getState().resolve(store);
    setConfirmDiscard(false);
    toast.info(t("page.cashier.attempt.discarded"));
  }, [confirmDiscard, store, t]);

  const handleApplyServerPrices = useCallback(() => {
    if (!priceChange || priceChange.applied) return;
    onApplyServerPrices?.(
      priceChange.items
        .filter((entry) => entry.cartKey)
        .map((entry) => ({ cartKey: entry.cartKey, price: entry.currentPrice }))
    );
    setPriceChange((prev) => (prev ? { ...prev, applied: true } : prev));
  }, [priceChange, onApplyServerPrices]);

  const addCustomerMutation = useMutation({
    mutationFn: (payload) => addCustomer(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["customers"]);
      const newCust = res?.data || res;
      if (newCust?.id || newCust?._id) {
        setSelectedCustomer(newCust);
        setCustomerSearch(newCust.name || newCust.Name || newCustomerName);
      }
      setAddCustomerOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setSelectedTier(null);
      toast.success(t("page.cashier.customerAdded"));
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || t("page.cashier.customerAddError")
      );
    }
  });

  const handleAddCustomer = useCallback(() => {
    if (!newCustomerName.trim()) return;
    addCustomerMutation.mutate({
      nameMember: newCustomerName.trim(),
      phoneNumber: newCustomerPhone.trim(),
      tier: selectedTier?.id || null
    });
  }, [newCustomerName, newCustomerPhone, selectedTier, addCustomerMutation]);

  const handleQrisConfirm = useCallback(() => {
    if (!pendingPayload) return;
    if (isSubmittingRef.current || attemptBlocking) return;
    // D2: confirm only the checkout the QR was issued for, and only while
    // the server quote for it is current — never a stale stored payload.
    if (pendingCheckoutKey !== checkoutKey || !quoteCurrent || priceChangePending) {
      invalidatePendingQris();
      return;
    }
    // DR-23 §D: the QRIS/e-wallet reference exists only once the customer
    // has paid, so it joins the stored payload at confirmation.
    if (referenceTrimmed === "") {
      setReferenceRefused(true);
      setReferenceDuplicate(false);
      return;
    }
    isSubmittingRef.current = true;
    mutation.mutate({ ...pendingPayload, referenceNumber: referenceTrimmed });
  }, [
    pendingPayload,
    referenceTrimmed,
    pendingCheckoutKey,
    checkoutKey,
    quoteCurrent,
    priceChangePending,
    invalidatePendingQris,
    attemptBlocking,
    mutation
  ]);

  const startQrisPayment = useCallback(
    (payload, method) => {
      setPendingPayload(payload);
      setPendingCheckoutKey(checkoutKey);
      setQrisInvalidated(false);
      setQrisPending(true);
      dispatchDisplayEvent({
        type: DISPLAY_EVENT_TYPES.QRIS_PAYMENT_REQUEST,
        store,
        total: remainingTotal,
        tableName: selectedTable?.name || "",
        paymentMethod: method
      });
    },
    [store, remainingTotal, selectedTable, checkoutKey]
  );

  const handleSubmit = useCallback(() => {
    // DR-23 §K: an unresolved earlier attempt blocks a new sale.
    if (attemptBlocking) return;
    // W3-4: never resubmit while a price change is unresolved.
    if (priceChangePending) return;
    // DR-11 / DR-17: never pay against a total the server has not quoted
    // for the current inputs.
    if (!quoteCurrent) {
      toast.error(t("page.cashier.quote.notReady"));
      return;
    }
    // F9-23: an empty cart must never reach the payment/order creation path.
    if (items.length === 0) {
      toast.error(t("page.cashier.emptyCart", "Keranjang kosong"));
      return;
    }
    // A table is optional for dine-in (not every warung uses tables); a
    // picked table must still pass every occupancy guard.
    if (orderType === "dine-in" && selectedTable) {
      if (!canResolveTableSafety) {
        toast.error(
          occupancyError
            ? t("page.cashier.tableOccupancyError", "Gagal memuat status meja")
            : t("page.cashier.tableOccupancyLoading", "Memeriksa ketersediaan meja...")
        );
        return;
      }
      // Defense in depth: the UI blocks occupied tables, but a QR order can
      // land after the table was picked — re-check at submit time so a second
      // order is never created on a table with an active customer order.
      if (tableIdsWithActiveOrders.has(selectedTable.id)) {
        toast.error(t("page.cashier.tableOccupied", "Meja sedang digunakan"));
        return;
      }
    }
    if (remainingTotal > 0 && !paymentMethod) {
      toast.error(t("page.cashier.selectPayment"));
      return;
    }
    if (remainingTotal > 0 && paymentMethod === "cash" && cashAmountNum < remainingTotal) {
      toast.error(t("page.cashier.insufficientCash"));
      return;
    }
    if (!isQrisPayment && !referenceReady) {
      setReferenceRefused(true);
      setReferenceDuplicate(false);
      return;
    }

    const method = paymentMethod || "points";
    const payload = {
      store: store,
      idempotencyKey: idempotencyKey || checkoutAttempts.getState().ensureAttempt(store).key,
      cashierId: cashierId || cookie?.user?.id || cookie?.user?.ID,
      cashierName: cashierName || cookie?.user?.userName || cookie?.user?.name,
      customerId: selectedCustomer?.id || selectedCustomer?._id || null,
      customerName: selectedCustomer?.name || selectedCustomer?.Name || null,
      discountId: selectedDiscount?.id || selectedDiscount?._id || null,
      promoCode: promoCode.trim() || undefined,
      redeemedPoints: Number(redeemPoints) || 0,
      paymentMethod: method,
      source: "pos",
      tableId: orderType === "dine-in" ? selectedTable?.id || null : null,
      totalCovers: orderType === "dine-in" ? partySizeNum : 0,
      // F-SMOKE-01: the backend's cash-tender validation (validateCashTender)
      // rejects any non-cash order that carries cashAmount/changeAmount at
      // all, even a "harmless" placeholder like the total/0 sent here
      // before — so these keys must be entirely absent for non-cash
      // methods, not merely zeroed.
      ...(method === "cash" ? { cashAmount: cashAmountNum, changeAmount: change } : {}),
      // DR-23 §D: card, transfer and "other" carry their reference or
      // description now; QRIS/e-wallet add it at confirmation (above).
      ...(needsReference && !isQrisPayment ? { referenceNumber: referenceTrimmed } : {}),
      // DR-23 §M TOTAL_CHANGED: the payable the cashier was shown — the
      // server quote for these exact inputs (quoteCurrent is required
      // above). A differing server payable is refused before any write.
      ...(Number.isInteger(total) ? { expectedTotal: total } : {}),
      // W3-4: expectedPrice / bundleId / separate options & modifiers /
      // priceOverride — see utils/orderPayload.js.
      items: buildOrderItemsPayload(items)
    };
    submittedLinesRef.current = items;
    // A resolved (applied) price change is cleared once the cashier retries.
    if (priceChange) setPriceChange(null);
    surfacedQuoteMismatchRef.current = null;

    if (method === "e-wallet" || method === "qris") {
      startQrisPayment(payload, method);
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    mutation.mutate(payload);
  }, [
    paymentMethod,
    cashAmountNum,
    total,
    remainingTotal,
    items,
    cashierId,
    cashierName,
    store,
    idempotencyKey,
    selectedCustomer,
    selectedDiscount,
    promoCode,
    redeemPoints,
    change,
    orderType,
    selectedTable,
    canResolveTableSafety,
    occupancyError,
    tableIdsWithActiveOrders,
    mutation,
    cookie,
    t,
    startQrisPayment,
    priceChange,
    priceChangePending,
    quoteCurrent,
    attemptBlocking,
    needsReference,
    isQrisPayment,
    isOtherMethod,
    referenceReady,
    referenceTrimmed
  ]);

  // DR-23 §D: reference (or "other" description) input — shown in the form
  // for card/transfer/other and on the QRIS confirmation step for QRIS and
  // e-wallet, whose reference exists only once the customer has paid.
  const renderReferenceField = () => (
    <div className="space-y-1">
      <label htmlFor="checkout-payment-reference" className="text-sm font-medium">
        {t(
          isOtherMethod
            ? "page.cashier.collectPayment.reference.otherLabel"
            : "page.cashier.collectPayment.reference.label"
        )}
      </label>
      <input
        id="checkout-payment-reference"
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
        aria-describedby="checkout-payment-reference-hint"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      {referenceRefused ? (
        <p
          id="checkout-payment-reference-hint"
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
        <p id="checkout-payment-reference-hint" className="text-xs text-muted-foreground">
          {t(
            isOtherMethod
              ? "page.cashier.collectPayment.reference.otherHint"
              : "page.cashier.collectPayment.reference.hint"
          )}
        </p>
      )}
    </div>
  );

  const formatPrice = (value) => {
    if (value == null || isNaN(value)) return "0";
    return Number(value).toLocaleString("id-ID");
  };

  const quickAmounts = useMemo(() => quickCashAmounts(total), [total]);

  const canSubmit =
    items.length > 0 &&
    !attemptBlocking &&
    !priceChangePending &&
    quoteCurrent &&
    (remainingTotal === 0 ||
      (paymentMethod &&
        (paymentMethod !== "cash" || cashAmountNum >= remainingTotal) &&
        (isQrisPayment || referenceReady)));

  // First unmet condition of canSubmit, shown on the disabled pay button.
  let submitBlockedReason;
  if (!canSubmit) {
    if (items.length === 0) submitBlockedReason = t("page.cashier.emptyCartDesc");
    else if (attemptBlocking) submitBlockedReason = t("page.cashier.disabledReason.attemptPending");
    else if (priceChangePending) submitBlockedReason = t("page.cashier.priceChanged.title");
    else if (!quoteCurrent) submitBlockedReason = t("page.cashier.quote.notReady");
    else if (!paymentMethod) submitBlockedReason = t("page.cashier.selectPayment");
    else if (paymentMethod === "cash") submitBlockedReason = t("page.cashier.insufficientCash");
    else submitBlockedReason = t("page.cashier.collectPayment.reference.required");
  }

  const hasUnsavedCheckout =
    qrisPending ||
    // The preselected cash method is not a change the cashier made.
    (Boolean(paymentMethod) && paymentMethod !== defaultPaymentMethod) ||
    referenceInput.trim() !== "" ||
    cashAmount.trim() !== "" ||
    Boolean(selectedCustomer) ||
    Boolean(selectedDiscount) ||
    promoCode.trim() !== "" ||
    Number(redeemPoints) > 0 ||
    orderType !== "take-away" ||
    Boolean(selectedTable) ||
    partySize.trim() !== "";

  const requestClose = useCallback(() => {
    if (hasUnsavedCheckout) {
      setCloseConfirmOpen(true);
      return;
    }
    onClose();
  }, [hasUnsavedCheckout, onClose]);

  const discardCheckout = useCallback(() => {
    setCloseConfirmOpen(false);
    onClose();
  }, [onClose]);

  return (
    // F9-04: migrated onto the project's accessible Dialog primitive —
    // the manual window-keydown Escape handler (removed) is superseded by
    // Radix's own per-dialog Escape handling, which already closes only
    // the topmost of two stacked dialogs (this modal + the nested
    // add-customer dialog below), matching the prior "closes whichever
    // layer is on top" behavior without extra code.
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0"
        withX={false}
        onOpenAutoFocus={(e) => {
          // Cash already selected → open on the amount field.
          if (!cashInputRef.current) return;
          e.preventDefault();
          cashInputRef.current.focus();
        }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-primary" />
            <DialogTitle className="text-lg font-bold">{t("page.cashier.payment")}</DialogTitle>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("common.close")}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {items.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border/40 bg-background">
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <ShoppingBag size={14} className="text-muted-foreground" aria-hidden="true" />
                  {t("page.cashier.checkoutItemsTitle")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("page.cashier.checkoutItemsCount", { count: items.length })}
                </span>
              </div>
              <ul className="max-h-36 divide-y divide-border/30 overflow-y-auto">
                {items.map((item, index) => {
                  const lineTotal =
                    Number(item.totalPrice) || Number(item.price) * Number(item.count) || 0;
                  return (
                    <li
                      key={item.cartKey || item.idProduct || index}
                      className="flex items-start justify-between gap-3 px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.nameProduct}
                        </p>
                        {item.variantName && (
                          <p className="truncate text-xs text-muted-foreground">
                            {item.variantName}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium tabular-nums text-foreground">
                          Rp {formatPrice(lineTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">×{item.count}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="bg-muted/40 rounded-xl p-4 border border-border/40 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("page.cashier.subtotal")}</span>
              <span className="font-medium tabular-nums">
                {quote ? `Rp ${formatPrice(quotedSubtotal)}` : "…"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("page.cashier.tax")}
                {quote ? ` (${Math.round(Number(quote.taxRate) || 0)}%)` : ""}
              </span>
              <span className="font-medium tabular-nums">
                {quote ? `Rp ${formatPrice(taxAmount)}` : "…"}
              </span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Percent size={12} aria-hidden="true" />
                  {quote.discountSource === "tier"
                    ? `${t("page.cashier.quote.tierDiscount")}${matchedTier?.name ? ` · ${matchedTier.name}` : ""}`
                    : quote.discountSource === "campaign"
                      ? t("page.cashier.quote.campaignDiscount")
                      : selectedDiscount?.nameDiscount ||
                        selectedDiscount?.name ||
                        t("page.cashier.discount")}
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  -Rp {formatPrice(orderDiscount)}
                </span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-violet-600 dark:text-violet-400">
                  {t("page.cashier.quote.pointsDiscount")}
                </span>
                <span className="font-medium text-violet-600 dark:text-violet-400 tabular-nums">
                  -Rp {formatPrice(pointsDiscount)}
                </span>
              </div>
            )}
            <div className="border-t border-border/40 pt-1.5 mt-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold">{t("page.cashier.total")}</span>
                <span className="font-bold text-lg text-primary tabular-nums">
                  {quote ? `Rp ${formatPrice(total)}` : "…"}
                </span>
              </div>
              {quoteFailed ? (
                <div
                  role="alert"
                  className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {priceChangePending ? (
                    // P1: the quote itself reported PRICE_CHANGED — resending
                    // the same prices would fail again, so the apply-prices
                    // panel below is the recovery path, not Recalculate.
                    <span className="flex-1">
                      {t("page.cashier.priceChanged.title", "Prices changed")}
                    </span>
                  ) : (
                    <>
                      <span className="flex-1">{quoteErrorMessage}</span>
                      <button
                        type="button"
                        onClick={() => refetchQuote()}
                        className="font-semibold underline underline-offset-2">
                        {t("page.cashier.quote.retry")}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                !quoteCurrent &&
                items.length > 0 && (
                  <p
                    className="mt-1 text-xs text-muted-foreground"
                    data-testid="checkout-quote-pending">
                    {t("page.cashier.quote.updating")}
                  </p>
                )
              )}
            </div>
          </div>

          <div>
            <p
              id="checkout-order-type"
              className="block text-sm font-medium mb-2 text-muted-foreground">
              {t("page.cashier.modal.orderType")}
            </p>
            <div role="group" aria-labelledby="checkout-order-type" className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrderType("dine-in");
                  setSelectedTable(null);
                }}
                className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                  orderType === "dine-in"
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/50 bg-card/50 hover:border-border"
                }`}>
                {t("page.cashier.modal.dineIn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType("take-away");
                  setSelectedTable(null);
                }}
                className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                  orderType === "take-away"
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/50 bg-card/50 hover:border-border"
                }`}>
                {t("page.cashier.modal.takeAway")}
              </button>
            </div>
            {orderType === "dine-in" && (
              <div className="mt-2 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-[38%] shrink-0">
                    <label
                      htmlFor="checkout-modal-guests"
                      className="block text-xs font-medium text-muted-foreground mb-1">
                      {t("page.cashier.guests", "Jumlah orang")}
                    </label>
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 focus-within:border-primary">
                      <Users size={14} className="text-muted-foreground shrink-0" />
                      <input
                        id="checkout-modal-guests"
                        type="number"
                        min="1"
                        value={partySize}
                        onChange={(e) => setPartySize(e.target.value)}
                        placeholder="0"
                        className="w-full py-2 text-sm outline-none bg-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor="checkout-modal-table"
                      className="block text-xs font-medium text-muted-foreground mb-1">
                      {t("page.cashier.modal.table", "Pilih Meja")}{" "}
                      <span className="font-normal">({t("common.optional")})</span>
                    </label>
                    <Combobox
                      id="checkout-modal-table"
                      options={[
                        { value: "", label: t("page.cashier.noTable") },
                        ...allTables.map((tbl) => {
                          const hasActiveOrder = tableIdsWithActiveOrders.has(tbl.id);
                          const isAvailable = tbl.status === "available" && !hasActiveOrder;
                          const statusKey = hasActiveOrder ? "occupied" : tbl.status || "available";
                          const statusLabel = t(`page.table.status.${statusKey}`, statusKey);
                          return {
                            value: String(tbl.id),
                            label: `${tbl.name} (${t("page.cashier.capacity", "Kapasitas")}: ${tbl.capacity}) — ${statusLabel}`,
                            disabled: !isAvailable || !canResolveTableSafety
                          };
                        })
                      ]}
                      value={String(selectedTable?.id || "")}
                      loading={!canResolveTableSafety}
                      onChange={(v) => {
                        const tbl = allTables.find(
                          (tb) =>
                            String(tb.id) === v &&
                            tb.status === "available" &&
                            !tableIdsWithActiveOrders.has(tb.id)
                        );
                        setSelectedTable(tbl || null);
                      }}
                      placeholder={t("page.cashier.selectTable", "Pilih Meja")}
                      searchPlaceholder={t("common.search.table")}
                    />
                    {occupancyError && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle size={12} />
                        {t(
                          "page.cashier.tableOccupancyError",
                          "Gagal memuat status meja, mohon coba lagi"
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {partySizeNum > 0 && canResolveTableSafety && availableTables.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "page.cashier.guestsNoTable",
                      "Tidak ada meja kosong untuk jumlah orang tersebut"
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Who is buying and what comes off the bill come before payment:
              the total the cashier collects is the one after them. */}
          <div ref={searchContainerRef} className="relative">
            <label
              htmlFor="checkout-modal-customer"
              className="block text-sm font-medium mb-1.5 text-muted-foreground">
              {t("page.cashier.customer")}
            </label>
            <div className="relative flex gap-2">
              <div className="group relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-emerald-600"
                />
                <input
                  id="checkout-modal-customer"
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerSearch(val);
                    setShowCustomerDropdown(true);
                    updateDropdownPos();
                    // Editing the text after a customer was picked must drop
                    // that selection — otherwise the field can show one name
                    // while a *different*, stale customer is still the one
                    // actually attached to the order (points/tier included).
                    if (
                      selectedCustomer &&
                      val !== (selectedCustomer.name || selectedCustomer.Name)
                    ) {
                      setSelectedCustomer(null);
                    }
                  }}
                  onFocus={() => {
                    setShowCustomerDropdown(true);
                    updateDropdownPos();
                  }}
                  placeholder={t("page.cashier.searchCustomer")}
                  className="w-full h-10 pl-9 pr-9 text-sm rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors"
                />
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                    aria-label={t("common.clear", "Clear")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMemberSearchOpen(true)}
                className="shrink-0 h-10 px-4">
                <Search size={16} className="mr-2" />
                {t("page.cashier.ui.searchCustomer")}
              </Button>
              <button
                type="button"
                onClick={() => setAddCustomerOpen(true)}
                className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-border/60 flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
                title={t("page.cashier.addCustomer")}>
                <Plus size={18} />
              </button>
            </div>
            {showCustomerDropdown &&
              createPortal(
                <div
                  ref={customerPortalRef}
                  style={{ position: "fixed", ...customerDropdownPos, zIndex: 70 }}
                  className="bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden">
                  {filteredCustomers.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto">
                      {filteredCustomers.map((c, idx) => (
                        <button
                          type="button"
                          key={c.id || c._id || idx}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setShowCustomerDropdown(false);
                            setCustomerSearch(c.name || c.Name || "");
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2">
                          <Users size={14} className="text-muted-foreground" />
                          <span className="font-medium">{c.name || c.Name || "-"}</span>
                          <span className="text-muted-foreground text-xs ml-auto">
                            {c.phone || c.Phone || ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      {t("page.cashier.noCustomer")}
                    </div>
                  )}
                </div>,
                document.body
              )}
          </div>

          {selectedCustomer && (
            <div className="bg-card border border-border/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    {selectedCustomer.name || selectedCustomer.Name || "-"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("page.cashier.ui.member")}{" "}
                    {selectedCustomer.phone ||
                      selectedCustomer.Phone ||
                      selectedCustomer.phoneNumber ||
                      "-"}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsMemberSearchOpen(true)}>
                  {t("page.cashier.ui.changeCustomer")}
                </Button>
              </div>
              {matchedTier && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: matchedTier.color || "#f59e0b" }}
                  />
                  <span className="text-xs font-semibold">{matchedTier.name}</span>
                  {matchedTier.discountPercent > 0 && (
                    <span className="text-xs text-emerald-500 font-medium">
                      {matchedTier.discountPercent}% {t("page.cashier.discount")}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t("page.cashier.ui.points")}</span>
                <span className="font-medium">
                  {t("page.cashier.pointsValue", { value: memberPoints.toLocaleString("id-ID") })}
                </span>
                <span className="text-muted-foreground">
                  {t("page.cashier.ui.status")} {selectedCustomer.status || t("common.active")}
                </span>
              </div>
            </div>
          )}

          <div ref={discountSearchRef} className="relative">
            <label
              htmlFor="checkout-modal-discount"
              className="block text-sm font-medium mb-1.5 text-muted-foreground">
              {t("page.cashier.discount")}
            </label>
            <div className="group relative">
              <Ticket
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-emerald-600"
              />
              <input
                id="checkout-modal-discount"
                type="text"
                value={discountSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setDiscountSearch(val);
                  setShowDiscountDropdown(true);
                  updateDropdownPos();
                  // Same stale-selection risk as the customer field: don't
                  // let an edited search term keep a no-longer-matching
                  // discount silently applied to the total.
                  if (
                    selectedDiscount &&
                    val !==
                      (selectedDiscount.nameDiscount ||
                        selectedDiscount.name ||
                        selectedDiscount.discountName)
                  ) {
                    setSelectedDiscount(null);
                  }
                }}
                onFocus={() => {
                  setShowDiscountDropdown(true);
                  updateDropdownPos();
                }}
                placeholder={t("page.cashier.searchDiscount")}
                className="w-full h-10 pl-9 pr-9 text-sm rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors"
              />
              {selectedDiscount && (
                <button
                  type="button"
                  onClick={clearDiscount}
                  aria-label={t("common.clear", "Clear")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            {showDiscountDropdown &&
              createPortal(
                <div
                  ref={discountPortalRef}
                  style={{ position: "fixed", ...discountDropdownPos, zIndex: 70 }}
                  className="bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden">
                  {filteredDiscounts.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto">
                      {filteredDiscounts.map((d, idx) => (
                        <button
                          type="button"
                          key={d.id || d._id || idx}
                          onClick={() => handleDiscountSelect(d)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2">
                          <Percent size={14} className="text-emerald-500" />
                          <span className="font-medium">
                            {d.nameDiscount || d.name || d.discountName || "-"}
                          </span>
                          <span className="text-muted-foreground text-xs ml-auto">
                            {d.type === "percent" ? `${d.value}%` : `Rp ${formatPrice(d.value)}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      {t("page.cashier.noDiscount")}
                    </div>
                  )}
                </div>,
                document.body
              )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="checkout-modal-promo-code"
              className="block text-sm font-medium text-muted-foreground">
              {t("page.cashier.promoCode")}
            </label>
            <div className="flex gap-2">
              <Input
                id="checkout-modal-promo-code"
                unstyled
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={t("page.cashier.promoCodePlaceholder")}
                className="flex-1 h-10 px-4 text-sm rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors"
                disabled={promoLoading || !!selectedDiscount}
                maxLength={FIELD_LIMITS.CODE}
              />
              <Button
                size="sm"
                onClick={handleApplyPromoCode}
                disabled={!promoCode.trim() || promoLoading || !!selectedDiscount}
                disabledReason={
                  promoLoading
                    ? undefined
                    : selectedDiscount
                      ? t("page.cashier.disabledReason.discountApplied")
                      : t("page.cashier.disabledReason.enterPromoCode")
                }
                className="h-10 px-4 rounded-xl shrink-0">
                {promoLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  t("page.cashier.apply")
                )}
              </Button>
            </div>
            {selectedDiscount && promoCode && (
              <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                <Check size={10} />
                {t("page.cashier.promoApplied")}
              </p>
            )}
          </div>

          {memberPoints > 0 && (
            <div className="bg-violet-500/5 rounded-xl p-4 border border-violet-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="checkout-redeem-points"
                  className="text-sm font-medium text-muted-foreground">
                  {t("page.memberLoyalty.tabs.redeem")}
                </label>
                <span className="text-xs text-violet-500 font-medium">
                  {t("common.available", "Tersedia")}:{" "}
                  {t("page.cashier.pointsValue", { value: memberPoints.toLocaleString("id-ID") })}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  id="checkout-redeem-points"
                  type="text"
                  value={redeemPoints ? Number(redeemPoints).toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    const max = Math.min(memberPoints, redeemCeiling);
                    setRedeemPoints(val ? String(Math.min(Number(val), max)) : "");
                  }}
                  placeholder="0"
                  className="flex-1 h-12 px-4 text-lg font-bold rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors text-right tabular-nums"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRedeemPoints(String(Math.min(memberPoints, redeemCeiling)));
                  }}
                  className="shrink-0 h-12 px-4 rounded-xl bg-violet-500/10 border border-violet-500/30 text-sm font-semibold text-violet-600 hover:bg-violet-500/20 transition-all">
                  {t("page.cashier.ui.max")}
                </button>
              </div>
              {redeemPoints > 0 && (
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  {t("page.cashier.ui.discountRp")} {Number(redeemPoints).toLocaleString("id-ID")}
                </p>
              )}
            </div>
          )}

          <div>
            <p
              id="checkout-payment-method"
              className="block text-sm font-medium mb-2 text-muted-foreground">
              {t("page.cashier.paymentMethod")}
            </p>
            <div
              role="group"
              aria-labelledby="checkout-payment-method"
              className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {paymentMethods.length === 0 ? (
                <p className="col-span-full text-sm text-muted-foreground text-center py-3">
                  {t("page.cashier.noPaymentMethods", "Tidak ada metode pembayaran aktif")}
                </p>
              ) : (
                paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      type="button"
                      key={method.id}
                      onClick={() => {
                        methodPickedRef.current = true;
                        setPaymentMethod(method.id);
                        setReferenceRefused(false);
                        setReferenceDuplicate(false);
                        clearPendingQris();
                      }}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm shadow-primary/10 scale-[1.02]"
                          : "border-border/50 bg-card/50 hover:border-border hover:bg-accent/50"
                      }`}>
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${method.color} shadow-sm`}>
                        <Icon size={16} className="text-white" />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}>
                        {method.label}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Check size={10} className="text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {needsReference && !isQrisPayment && renderReferenceField()}

          {paymentMethod === "cash" && (
            <div className="bg-muted/30 rounded-xl p-4 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="checkout-cash-amount"
                  className="text-sm font-medium text-muted-foreground">
                  {t("page.cashier.cashAmount")}
                </label>
                <button
                  type="button"
                  onClick={applyFullPayment}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  <RotateCcw size={12} />
                  {t("page.cashier.roundUp")}
                </button>
              </div>
              <div className="relative">
                <input
                  id="checkout-cash-amount"
                  ref={cashInputRef}
                  type="text"
                  value={cashAmount ? `Rp ${Number(cashAmount).toLocaleString("id-ID")}` : ""}
                  onChange={(e) => {
                    setCashAmount(e.target.value.replace(/[^0-9]/g, ""));
                    setFullPayment(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (e.nativeEvent?.isComposing || e.isComposing) return;
                    if (paymentMethod !== "cash") return;
                    if (!canSubmit || mutation.isLoading || isSubmittingRef.current) return;
                    e.preventDefault();
                    handleSubmit();
                  }}
                  placeholder="Rp 0"
                  className="w-full h-12 px-4 text-lg font-bold rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors text-right"
                  inputMode="numeric"
                />
              </div>
              {cashAmountNum > 0 && remainingTotal > 0 && cashAmountNum < remainingTotal && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
                  <AlertCircle size={12} />
                  {t("page.cashier.insufficientCash")}
                </div>
              )}
              {cashAmountNum >= remainingTotal && (
                <div className="flex items-center justify-between text-sm bg-emerald-500/5 rounded-lg px-3 py-2">
                  <span className="text-emerald-500 font-medium">{t("page.cashier.change")}</span>
                  <span className="font-bold text-emerald-500">Rp {formatPrice(change)}</span>
                </div>
              )}
              {!fullPayment && (
                <div className="flex flex-wrap gap-1.5">
                  {total > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCashAmount(String(total));
                        setFullPayment(false);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 transition-all">
                      {t("page.cashier.exactCash")}
                    </button>
                  )}
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setCashAmount(String(amt));
                        setFullPayment(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/50 border border-border/50 hover:bg-accent hover:border-border transition-all">
                      Rp {formatPrice(amt)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {closeConfirmOpen && (
          <Dialog open onOpenChange={(open) => !open && setCloseConfirmOpen(false)}>
            <DialogContent className="max-w-md p-0" withX={false}>
              <div className="p-5 space-y-2">
                <DialogTitle className="font-semibold">
                  {t("page.cashier.checkoutDiscardTitle")}
                </DialogTitle>
                <DialogDescription>{t("page.cashier.checkoutDiscardDesc")}</DialogDescription>
                {qrisPending && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    {t("page.cashier.checkoutDiscardQris")}
                  </p>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 px-5 pb-5 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setCloseConfirmOpen(false)}>
                  {t("page.cashier.keepEditing")}
                </Button>
                <Button variant="destructive" onClick={discardCheckout}>
                  {t("page.cashier.discardCheckout")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* F9-04: a second, independent Dialog for the add-customer
            sub-flow — Radix supports these stacked, and closes only the
            topmost one on Escape, matching the prior "closes whichever
            layer is on top" behavior of the manual handler this replaced. */}
        {addCustomerOpen && (
          <Dialog open onOpenChange={(open) => !open && setAddCustomerOpen(false)}>
            <DialogContent className="max-w-md p-0 overflow-y-auto" withX={false}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-primary" />
                  <DialogTitle className="font-semibold">
                    {t("page.cashier.addCustomerTitle")}
                  </DialogTitle>
                </div>
                <button
                  type="button"
                  aria-label={t("common.close")}
                  onClick={() => setAddCustomerOpen(false)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <div className="mb-3">
                  <label
                    htmlFor="checkout-modal-add-customer-name"
                    className="block text-sm font-medium mb-1.5 text-muted-foreground">
                    {t("page.cashier.addCustomerName")}
                  </label>
                  <Input
                    id="checkout-modal-add-customer-name"
                    unstyled
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder={t("page.cashier.addCustomerName")}
                    className="w-full h-10 px-4 text-sm rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors"
                    autoFocus
                    maxLength={FIELD_LIMITS.PERSON_NAME}
                  />
                </div>
                <div className="mb-3">
                  <label
                    htmlFor="checkout-modal-add-customer-phone"
                    className="block text-sm font-medium mb-1.5 text-muted-foreground">
                    {t("page.cashier.addCustomerPhone")}
                  </label>
                  <Input
                    id="checkout-modal-add-customer-phone"
                    unstyled
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) =>
                      setNewCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 14))
                    }
                    placeholder={t("page.cashier.addCustomerPhone")}
                    className="w-full h-10 px-4 text-sm rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors"
                    inputMode="numeric"
                    maxLength={FIELD_LIMITS.PHONE}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("common.phoneHint")}</p>
                </div>
                <div>
                  <p
                    id="checkout-new-customer-tier"
                    className="block text-sm font-medium mb-1.5 text-muted-foreground">
                    {t("page.cashier.addCustomerMemberTier")}
                  </p>
                  <div
                    role="group"
                    aria-labelledby="checkout-new-customer-tier"
                    className="grid grid-cols-2 gap-2">
                    {memberTiers.length === 0 ? (
                      <div className="col-span-2 text-sm text-muted-foreground bg-accent/30 rounded-xl px-3 py-2">
                        {t("page.cashier.addCustomerNoTier")}
                      </div>
                    ) : (
                      memberTiers.map((tier) => {
                        const isSelected = selectedTier?.id === tier.id;
                        return (
                          <button
                            type="button"
                            key={tier.id}
                            onClick={() => setSelectedTier(isSelected ? null : tier)}
                            className={`text-left p-3 rounded-xl border transition-all ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border/50 bg-accent/30 hover:border-border hover:bg-accent/50"
                            }`}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: tier.color || "#f59e0b" }}
                              />
                              <span className="text-sm font-semibold">{tier.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1 block">
                              {tier.discountPercent > 0
                                ? `${tier.discountPercent}% ${t("page.cashier.discount")}`
                                : "-"}
                            </span>
                            {isSelected &&
                              (Array.isArray(tier.benefits)
                                ? tier.benefits
                                : (tier.benefits || "").split("\n").filter(Boolean)
                              ).length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                                  {(Array.isArray(tier.benefits)
                                    ? tier.benefits
                                    : (tier.benefits || "").split("\n").filter(Boolean)
                                  ).map((b, i) => (
                                    <div key={i} className="flex items-start gap-1.5">
                                      <Check
                                        size={10}
                                        className="text-emerald-500 mt-0.5 shrink-0"
                                      />
                                      <span className="text-xs text-muted-foreground">{b}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-5 py-4 border-t border-border/50 bg-muted/20">
                <Button
                  variant="danger"
                  onClick={() => setAddCustomerOpen(false)}
                  className="flex-1">
                  {t("page.cashier.addCustomerCancel")}
                </Button>
                <Button
                  variant="success"
                  onClick={handleAddCustomer}
                  disabled={!newCustomerName.trim() || addCustomerMutation.isLoading}
                  disabledReason={
                    addCustomerMutation.isLoading
                      ? undefined
                      : t("page.cashier.disabledReason.enterCustomerName")
                  }
                  className="flex-1">
                  {addCustomerMutation.isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {t("page.cashier.addCustomerSave")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="border-t border-border/50 p-4 shrink-0 space-y-2">
          {/* Payment sits at the bottom of the form now, so the amount to
              collect stays in view here while the cash is typed. */}
          <div
            className="flex items-baseline justify-between gap-3"
            data-testid="checkout-footer-total">
            <span className="text-sm font-medium text-muted-foreground">
              {t("page.cashier.total")}
            </span>
            <span className="text-xl font-bold text-primary tabular-nums">
              {quote ? `Rp ${formatPrice(total)}` : "…"}
            </span>
          </div>
          {priceChange && (
            <div
              data-testid="price-change-panel"
              role={priceChange.applied ? "status" : "alert"}
              aria-live={priceChange.applied ? "polite" : "assertive"}
              className={`rounded-xl border p-3 space-y-2 ${
                priceChange.applied
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}>
              <div className="flex items-start gap-2">
                {priceChange.applied ? (
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                )}
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {priceChange.applied
                      ? t("page.cashier.priceChanged.appliedTitle", "Prices updated")
                      : t("page.cashier.priceChanged.title", "Prices changed")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {priceChange.applied
                      ? t(
                          "page.cashier.priceChanged.appliedDesc",
                          "Review the new total, then confirm payment again."
                        )
                      : t(
                          "page.cashier.priceChanged.desc",
                          "This order was not created. The prices below changed at this outlet. Apply the updated prices and review the total before confirming payment again."
                        )}
                  </p>
                </div>
              </div>
              <ul className="space-y-1">
                {priceChange.items.map((entry) => (
                  <li key={entry.index} className="flex items-start justify-between gap-2 text-xs">
                    <span className="min-w-0 break-words text-foreground">
                      {entry.name ||
                        t("page.cashier.priceChanged.unmatched", "Item no longer in cart")}
                      {entry.variantName ? ` (${entry.variantName})` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="text-muted-foreground line-through">
                        Rp {formatPrice(entry.expectedPrice)}
                      </span>
                      <span className="mx-1 text-muted-foreground" aria-hidden="true">
                        →
                      </span>
                      <span className="sr-only">{t("page.cashier.priceChanged.now", "now")} </span>
                      <span className="font-semibold text-foreground">
                        Rp {formatPrice(entry.currentPrice)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {!priceChange.applied && (
                <Button
                  type="button"
                  variant="draft"
                  onClick={handleApplyServerPrices}
                  className="w-full h-11 rounded-xl font-semibold text-sm">
                  <RotateCcw size={16} aria-hidden="true" />
                  {t("page.cashier.priceChanged.apply", "Apply updated prices")}
                </Button>
              )}
            </div>
          )}
          {attemptBlocking && (
            <div
              role="alert"
              data-testid="checkout-attempt-panel"
              data-attempt-status={attemptStatus}
              className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div className="flex-1 space-y-1">
                  {attemptStatus === ATTEMPT_STATUS.UNKNOWN && (
                    <>
                      {attempt?.reason === "unconfirmed" ? (
                        <>
                          <p className="font-semibold">
                            {t("page.cashier.attempt.unconfirmedTitle")}
                          </p>
                          <p>{t("page.cashier.attempt.unconfirmedBody")}</p>
                          {attempt?.serverMessage && (
                            <p data-testid="checkout-attempt-server-message">
                              {t("page.cashier.attempt.serverMessage")}: {attempt.serverMessage}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">{t("page.cashier.attempt.unknownTitle")}</p>
                          <p>{t("page.cashier.attempt.unknownBody")}</p>
                        </>
                      )}
                      {Number.isInteger(attempt?.payload?.expectedTotal) && (
                        <p data-testid="checkout-attempt-total">
                          {t("page.cashier.attempt.originalTotal")}: Rp{" "}
                          {formatPrice(attempt.payload.expectedTotal)}
                        </p>
                      )}
                    </>
                  )}
                  {attemptStatus === ATTEMPT_STATUS.IN_FLIGHT && (
                    <p className="font-semibold">{t("page.cashier.attempt.inFlight")}</p>
                  )}
                  {(attemptStatus === ATTEMPT_STATUS.CONFLICT ||
                    attemptStatus === ATTEMPT_STATUS.RECORDED) &&
                    (recordedOrder?.id ? (
                      <>
                        <p className="font-semibold">{t("page.cashier.attempt.recordedTitle")}</p>
                        <p data-testid="checkout-attempt-order">
                          {recordedOrder.orderNumber || `#${recordedOrder.id}`}
                          {Number.isFinite(recordedOrder.totalPrice)
                            ? ` · Rp ${formatPrice(recordedOrder.totalPrice)}`
                            : ""}
                        </p>
                        <p>{t("page.cashier.attempt.recordedBody")}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">{t("page.cashier.attempt.conflictTitle")}</p>
                        <p>{t("page.cashier.attempt.conflictBody")}</p>
                      </>
                    ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {attemptStatus === ATTEMPT_STATUS.UNKNOWN && attempt?.payload && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleRetryAttempt}
                    disabled={mutation.isLoading}>
                    {t("page.cashier.attempt.retrySame")}
                  </Button>
                )}
                {recordedOrder?.id &&
                  (attemptStatus === ATTEMPT_STATUS.CONFLICT ||
                    attemptStatus === ATTEMPT_STATUS.RECORDED) && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={handleOpenRecordedOrder}
                      loading={recovering}>
                      {t("page.cashier.attempt.openRecorded")}
                    </Button>
                  )}
                {(attemptStatus === ATTEMPT_STATUS.UNKNOWN ||
                  (attemptStatus === ATTEMPT_STATUS.CONFLICT && !recordedOrder?.id)) && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleDiscardAttempt}
                    disabled={mutation.isLoading}>
                    {confirmDiscard
                      ? t("page.cashier.attempt.discardConfirm")
                      : t("page.cashier.attempt.discard")}
                  </Button>
                )}
              </div>
            </div>
          )}
          {qrisInvalidated && !qrisPending && (
            <div
              role="alert"
              data-testid="qris-invalidated"
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {t(
                  "page.cashier.qris.invalidated",
                  "QRIS dibatalkan karena checkout berubah. QR di layar pelanggan tidak berlaku — mulai QRIS lagi."
                )}
              </span>
            </div>
          )}
          {qrisPending && isQrisPayment ? (
            <>
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm dark:bg-amber-900/20 dark:border-amber-800/50">
                <Wallet
                  size={16}
                  className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    {t("page.cashier.qris.manualTitle", "Pembayaran manual")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "page.cashier.qris.manualDesc",
                      "Minta pelanggan membayar, lalu masukkan nomor referensi setelah dana diterima."
                    )}
                  </p>
                  <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {t(
                      "page.cashier.qris.confirmWarning",
                      "Jangan konfirmasi sebelum dana benar-benar diterima."
                    )}
                  </p>
                </div>
              </div>
              {renderReferenceField()}
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={clearPendingQris}
                  className="flex-1 h-12 rounded-xl">
                  {t("page.cashier.cancel", "Batal")}
                </Button>
                <Button
                  variant="success"
                  onClick={handleQrisConfirm}
                  disabled={mutation.isLoading || referenceTrimmed === ""}
                  disabledReason={
                    mutation.isLoading
                      ? undefined
                      : t("page.cashier.collectPayment.reference.required")
                  }
                  className="flex-[2] h-12 rounded-xl font-semibold text-sm">
                  {mutation.isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {mutation.isLoading
                    ? t("page.cashier.processing")
                    : t("page.cashier.qris.confirmReceived", "Konfirmasi Pembayaran Diterima")}
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={!canSubmit || mutation.isLoading}
              disabledReason={mutation.isLoading ? undefined : submitBlockedReason}
              className="w-full h-12 rounded-xl font-semibold text-sm relative overflow-hidden group/btn">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/90 opacity-90 group-hover/btn:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                {mutation.isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {mutation.isLoading
                  ? t("page.cashier.processing")
                  : t("page.cashier.confirmPayment")}
              </span>
            </Button>
          )}
        </div>
      </DialogContent>
      <MemberSearchModal
        open={isMemberSearchOpen}
        onClose={() => setIsMemberSearchOpen(false)}
        onSelect={(member) => {
          setSelectedCustomer(member);
          setCustomerSearch(member.name || member.Name || "");
          setIsMemberSearchOpen(false);
        }}
      />
    </Dialog>
  );
};

CheckoutModal.propTypes = {
  items: PropTypes.array,
  store: PropTypes.any,
  cashierName: PropTypes.string,
  cashierId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose: PropTypes.func,
  onTableChange: PropTypes.func,
  onComplete: PropTypes.func,
  onApplyServerPrices: PropTypes.func
};

export default CheckoutModal;

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  Clock,
  Utensils,
  ShoppingBag,
  Wallet,
  Ban,
  Undo2,
  ClipboardList,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { getOrdersByStore, updateOrderStatus } from "@/services/order";
import { getCurrentCashRegister } from "@/services/cash-register";
import { useSocket } from "@/services/socket";
import { useRoomSubscription } from "@/hooks/useRoomSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import ScrollRail from "@/components/ui/ScrollRail";
import CollapsiblePanel from "@/components/ui/CollapsiblePanel";
import VoidOrderDialog from "@/components/organism/VoidOrderDialog";
import i18next from "i18next";

const statusConfig = {
  pending: {
    color: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
    get label() {
      return i18next.t("page.expense.list.pending");
    }
  },
  confirmed: {
    color: "bg-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
    get label() {
      return i18next.t("page.cashier.orderQueue.status.confirmed");
    }
  },
  preparing: {
    color: "bg-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
    get label() {
      return i18next.t("page.cashier.orderQueue.status.preparing");
    }
  },
  ready: {
    color: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    get label() {
      return i18next.t("page.cashier.orderQueue.status.ready");
    }
  },
  served: {
    color: "bg-purple-500",
    textColor: "text-purple-600 dark:text-purple-400",
    get label() {
      return i18next.t("page.cashier.orderQueue.status.served");
    }
  }
};

const paymentStatusConfig = {
  paid: {
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
  },
  partial: {
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
  },
  unpaid: {
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
  },
  refunded: {
    color: "bg-muted-foreground/10 text-muted-foreground border-border"
  }
};

function timeAgo(dateStr, t) {
  const diffMin = Math.floor((new Date() - new Date(dateStr)) / 60000);
  if (diffMin < 1) return t("page.cashier.orderQueue.timeAgo.justNow");
  if (diffMin < 60) return t("page.cashier.orderQueue.timeAgo.minutes", { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("page.cashier.orderQueue.timeAgo.hours", { count: diffHr });
  return t("page.cashier.orderQueue.timeAgo.days", { count: Math.floor(diffHr / 24) });
}

// The queue lists today's orders plus older ones that still have money to
// collect; a finished (paid) order from an earlier day is history, not work.
const isTodayOrUnpaid = (order, startOfToday) =>
  order.paymentStatus !== "paid" || new Date(order.createdAt) >= startOfToday;

// Phase 39 Batch 6B: `readOnly` is set only for an order of an EARLIER
// (closed) register whose payment is already finalized (paymentStatus ===
// "paid" — the same definition canCollectPayment already used to know
// nothing is left to collect). It never applies to the current register or
// to unassigned/self-orders, which stay fully actionable regardless of
// payment state.
const OrderCard = ({
  order,
  onClick,
  onCollectPayment,
  onCancelOrder,
  onVoidOrder,
  readOnly = false
}) => {
  const { t } = useTranslation();
  const status = statusConfig[order.status] || statusConfig.pending;
  const payCfg = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.unpaid;
  const isDineIn = !!order.tableId;
  const itemCount = order.totalQuantity || order.items?.length || 0;
  // F4-01: every order this queue lists is, by construction, not yet paid
  // (a POS-created order is created already status:'paid' and never appears
  // here) — so "Collect Payment" is offered whenever the caller wired it up,
  // regardless of the order's kitchen-progress status.
  const canCollectPayment =
    !readOnly && typeof onCollectPayment === "function" && order.paymentStatus !== "paid";
  // DR-08: cancel ends an order only before payment (server enforces
  // CANCEL_REQUIRES_VOID once anything was collected — void itself needs an
  // elevated capability and lives outside this queue). Offered for unpaid
  // orders only; cancelling is terminal, so the button arms on first tap.
  const canCancel =
    !readOnly &&
    typeof onCancelOrder === "function" &&
    (!order.paymentStatus || order.paymentStatus === "unpaid");
  // DR-23 §G: once anything was collected, cancel is refused
  // (CANCEL_REQUIRES_VOID) and the order can only end by an elevated void
  // with an immediate refund. Offered only when the caller wired it (i.e.
  // the user holds order.void) and only for part-paid orders — fully paid
  // orders are not in this queue.
  const canVoid =
    !readOnly && typeof onVoidOrder === "function" && order.paymentStatus === "partial";
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancelTimer = useRef(null);
  useEffect(
    () => () => {
      if (cancelTimer.current) clearTimeout(cancelTimer.current);
    },
    []
  );
  const handleCancelTap = (e) => {
    e.stopPropagation();
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      cancelTimer.current = setTimeout(() => setConfirmingCancel(false), 5000);
      return;
    }
    if (cancelTimer.current) clearTimeout(cancelTimer.current);
    setConfirmingCancel(false);
    onCancelOrder(order);
  };

  const cardBody = (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-foreground">
          #{order.orderNumber?.slice(-5) || order.id}
        </span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color} text-white`}>
          {t(`page.cashier.orderQueue.status.${order.status}`, status.label)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {isDineIn ? <Utensils size={12} /> : <ShoppingBag size={12} />}
        <span>
          {isDineIn
            ? `${t("page.cashier.orderQueue.dineIn")} / ${t("page.cashier.orderQueue.table")} ${order.tableId}`
            : t("page.cashier.orderQueue.takeaway")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1 mb-1.5">
        {order.paymentStatus && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${payCfg.color}`}>
            {t(`page.cashier.orderQueue.paymentStatus.${order.paymentStatus}`, order.paymentStatus)}
          </span>
        )}
        {order.source && order.source !== "pos" && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full border border-border/60 text-muted-foreground uppercase">
            {t(`page.delivery.source.${order.source}`, order.source)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {itemCount} {t("page.cashier.orderQueue.items")}
        </span>
        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
          <Clock size={10} />
          {timeAgo(order.createdAt, t)}
        </span>
      </div>
    </>
  );

  return (
    <div
      className={`shrink-0 w-56 bg-card border border-border/60 rounded-xl p-3.5 transition-all group space-y-2.5 ${readOnly ? "opacity-80" : "hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"}`}>
      {readOnly ? (
        <div className="w-full text-left" aria-label={t("page.cashier.orderQueue.readOnly")}>
          {cardBody}
        </div>
      ) : (
        <button type="button" onClick={() => onClick(order)} className="w-full text-left">
          {cardBody}
        </button>
      )}
      {canCollectPayment && (
        <button
          type="button"
          aria-label={t("page.cashier.orderQueue.collectPayment")}
          onClick={(e) => {
            e.stopPropagation();
            onCollectPayment(order);
          }}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Wallet size={12} />
          {t("page.cashier.orderQueue.collectPayment")}
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          aria-label={
            confirmingCancel
              ? t("page.cashier.orderQueue.confirmCancel")
              : t("page.cashier.orderQueue.cancel")
          }
          onClick={handleCancelTap}
          className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
            confirmingCancel
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "text-muted-foreground hover:bg-accent hover:text-destructive"
          }`}>
          <Ban size={12} />
          {confirmingCancel
            ? t("page.cashier.orderQueue.confirmCancel")
            : t("page.cashier.orderQueue.cancel")}
        </button>
      )}
      {canVoid && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onVoidOrder(order);
          }}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
          <Undo2 size={12} aria-hidden="true" />
          {t("page.voidOrder.action")}
        </button>
      )}
    </div>
  );
};

const OrderQueueSkeleton = () => (
  <div className="flex gap-3 px-4 mt-6 lg:px-6">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="shrink-0 w-56 bg-card border border-border/60 rounded-xl p-3.5 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-28" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    ))}
  </div>
);

const OrderQueue = ({ store, onLoadOrder, onCollectPayment, canVoid = false }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Defensive fallback (`|| {}`): unlike KDS/WaiterRequestList, several
  // existing OrderQueue tests render this component with no SocketProvider
  // in the tree at all, so useSocket() legitimately returns null there.
  const { socket, connected } = useSocket() || {};
  // F2: room-subscription awareness. `connected` alone must not disable
  // polling — the `kitchen-${store}` join can be rejected (or lost on
  // reconnect) while the transport stays up. Polling stays on until the
  // server confirms this exact room (see useRoomSubscription).
  const { roomOk } = useRoomSubscription({
    socket,
    connected,
    roomEvent: "join-kitchen",
    roomKey: store || null
  });
  const fetchOrders = async (status) => {
    const res = await getOrdersByStore({ location: store, status, limit: 50 });
    return res?.data || [];
  };

  // Phase 39 Batch 6B: register-session awareness for display/actionability
  // ONLY — none of the 5 fetch calls above gain a cashRegisterId filter, and
  // this query never changes what gets requested from them. Reuses the
  // existing getCurrentCashRegister mechanism (same one CashRegisterCurrent
  // uses) rather than inferring "current" from any date/time heuristic.
  const { data: currentRegisterData, isLoading: currentRegisterLoading } = useQuery(
    ["order-queue-current-register", store],
    () => getCurrentCashRegister(store),
    { enabled: !!store }
  );
  const currentRegister = currentRegisterData?.data?.register || currentRegisterData?.data || null;
  const currentRegisterId = currentRegister?.id ?? null;
  // Until this resolves, we genuinely don't know which orders are
  // "current" — bucketing must not guess (see allOrders below).
  const currentRegisterKnown = !currentRegisterLoading;

  // Phase 20 Batch 2: realtime-first with polling fallback, mirroring the
  // exact pattern already established by kitchen-display/index.jsx and
  // WaiterRequestList.jsx. Branch on `connected && roomOk` (not `connected`
  // alone, and never on `socket` truthiness) — a connected transport whose
  // room join was rejected, is still pending, or was lost on reconnect
  // delivers no events, so the screen must keep polling until the room join
  // is confirmed (F2 — see useRoomSubscription).
  //
  // Only 4 of the 5 statuses have a real backend event to react to (see the
  // socket effect below for exactly which ones and why) — 'confirmed' has no
  // corresponding emit anywhere in BE-POS-App today (order.js's
  // updateOrderItemStatus cascade only ever targets pending/preparing/ready/
  // served), so its poll stays unconditionally on rather than silently going
  // stale forever once connected. This is a real, audited backend contract
  // gap, not an oversight — see the Phase 20 Batch 2 report.
  const pollFallback = connected && roomOk ? false : 30000;

  const {
    data: pendingOrders,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending
  } = useQuery(["cashier-orders-pending", store], () => fetchOrders("pending"), {
    enabled: !!store,
    refetchInterval: pollFallback
  });

  const {
    data: confirmedOrders,
    isLoading: confirmedLoading,
    isError: confirmedError,
    refetch: refetchConfirmed
  } = useQuery(["cashier-orders-confirmed", store], () => fetchOrders("confirmed"), {
    enabled: !!store,
    refetchInterval: 30000
  });

  const {
    data: preparingOrders,
    isLoading: preparingLoading,
    isError: preparingError,
    refetch: refetchPreparing
  } = useQuery(["cashier-orders-preparing", store], () => fetchOrders("preparing"), {
    enabled: !!store,
    refetchInterval: pollFallback
  });

  const {
    data: readyOrders,
    isLoading: readyLoading,
    isError: readyError,
    refetch: refetchReady
  } = useQuery(["cashier-orders-ready", store], () => fetchOrders("ready"), {
    enabled: !!store,
    refetchInterval: pollFallback
  });

  // P5-03: a served QR order must stay reachable in the queue for payment —
  // it has the same payment/collect-payment semantics as every other
  // unpaid order listed here.
  const {
    data: servedOrders,
    isLoading: servedLoading,
    isError: servedError,
    refetch: refetchServed
  } = useQuery(["cashier-orders-served", store], () => fetchOrders("served"), {
    enabled: !!store,
    refetchInterval: pollFallback
  });

  const invalidatePending = useCallback(() => {
    queryClient.invalidateQueries(["cashier-orders-pending", store]);
  }, [queryClient, store]);

  // Covers exactly the statuses updateOrderItemStatus's cascade can produce
  // (api/controller/order.js: statusMap = {pending, preparing, ready,
  // served}) — deliberately excludes 'confirmed', which that cascade never
  // targets, so this event can never make it stale.
  const invalidateKitchenCascade = useCallback(() => {
    queryClient.invalidateQueries(["cashier-orders-pending", store]);
    queryClient.invalidateQueries(["cashier-orders-preparing", store]);
    queryClient.invalidateQueries(["cashier-orders-ready", store]);
    queryClient.invalidateQueries(["cashier-orders-served", store]);
  }, [queryClient, store]);

  const invalidateAllQueues = useCallback(() => {
    invalidatePending();
    invalidateKitchenCascade();
    queryClient.invalidateQueries(["cashier-orders-confirmed", store]);
  }, [queryClient, store, invalidatePending, invalidateKitchenCascade]);

  // DR-08: cancel ends an order before payment. The server owns the guard —
  // anything net-collected is refused with CANCEL_REQUIRES_VOID (void needs
  // an elevated capability and is out of this queue's scope). React to the
  // confirmed result only: toast + queue refresh, never optimistic removal.
  // Duplicate taps are blocked per order id while its request is in flight.
  const cancellingIds = useRef(new Set());
  const cancelMutation = useMutation({
    mutationFn: (target) => updateOrderStatus({ id: target.id, store, status: "cancelled" }),
    onSuccess: () => {
      toast.success(t("page.cashier.orderQueue.cancelled"));
      invalidateAllQueues();
    },
    onError: (err) => {
      const code = err?.response?.data?.code;
      if (code === "CANCEL_REQUIRES_VOID") {
        toast.error(t("page.cashier.orderQueue.cancelRequiresVoid"));
      } else {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            t("page.cashier.orderQueue.cancelFailed")
        );
      }
      invalidateAllQueues();
    },
    onSettled: (_data, _err, target) => {
      cancellingIds.current.delete(target?.id);
    }
  });
  const [voidTarget, setVoidTarget] = useState(null);

  const handleCancelOrder = useCallback(
    (target) => {
      if (!target?.id || cancellingIds.current.has(target.id)) return;
      cancellingIds.current.add(target.id);
      cancelMutation.mutate(target);
    },
    [cancelMutation]
  );

  useEffect(() => {
    if (!socket || !store) return;
    // Domain listeners only — room membership (join-kitchen with ack,
    // join-rejected, leave-kitchen, reconnect re-join) is owned by
    // useRoomSubscription above. Room membership is verified server-side
    // against the caller's own JWT `store` claim (canJoinStore), so this
    // can never receive another store's events.

    const handleNewOrder = () => invalidatePending();
    const handleItemStatusUpdate = () => invalidateKitchenCascade();
    // A disconnect/reconnect window can silently miss domain events that
    // fired while offline — reconcile everything on every (re)connect,
    // matching WaiterRequestList/KitchenDisplay's own reconnect handling.
    const handleReconnect = () => {
      invalidatePending();
      invalidateKitchenCascade();
    };

    socket.on("new-order", handleNewOrder);
    socket.on("item-status-updated", handleItemStatusUpdate);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("new-order", handleNewOrder);
      socket.off("item-status-updated", handleItemStatusUpdate);
      socket.off("connect", handleReconnect);
    };
  }, [socket, store, invalidatePending, invalidateKitchenCascade]);

  const allOrders = useMemo(() => {
    // statuses are disjoint server-side, but guard against the same order
    // leaking into two results during a transition — key by id (the served
    // entry wins, being last) so no order is ever rendered twice.
    const byId = new Map();
    const push = (list) =>
      (list || []).forEach((o) => {
        if (o && o.id != null) byId.set(String(o.id), o);
      });
    push(pendingOrders);
    push(confirmedOrders);
    push(preparingOrders);
    push(readyOrders);
    push(servedOrders);
    return Array.from(byId.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [pendingOrders, confirmedOrders, preparingOrders, readyOrders, servedOrders]);

  // Only today's orders, plus older ones still waiting for payment — a
  // paid order from another day no longer clutters the cashier.
  const today = new Date().toDateString(); // re-filters after midnight
  const visibleOrders = useMemo(() => {
    const startOfToday = new Date(today);
    return allOrders.filter((order) => isTodayOrUnpaid(order, startOfToday));
  }, [allOrders, today]);

  // Phase 39 Batch 6B: orders of the open register and of an earlier
  // register (closed and reopened) share one list; only unassigned/
  // self-orders (cashRegisterId null) get their own section. While the
  // current register is unknown, nothing is split or locked.
  const buckets = useMemo(() => {
    if (!currentRegisterKnown) return { current: visibleOrders, unassigned: [] };
    const current = [];
    const unassigned = [];
    for (const order of visibleOrders) {
      if (order.cashRegisterId == null) unassigned.push(order);
      else current.push(order);
    }
    return { current, unassigned };
  }, [visibleOrders, currentRegisterKnown]);

  // A paid order of an earlier (closed) register is read-only — nothing left
  // to collect and its register is closed. Unpaid ones, the open register's
  // and unassigned/self-orders stay fully actionable.
  const isClosedRegisterPaid = (order) =>
    currentRegisterKnown &&
    order.cashRegisterId != null &&
    order.cashRegisterId !== currentRegisterId &&
    order.paymentStatus === "paid";

  // The common case (no unassigned orders) renders one flat rail with no
  // section headers.
  const hasMultipleBuckets = buckets.unassigned.length > 0;

  const isLoading =
    pendingLoading || confirmedLoading || preparingLoading || readyLoading || servedLoading;
  const queueError = pendingError || confirmedError || preparingError || readyError || servedError;
  const refetchQueue = useCallback(() => {
    refetchPending();
    refetchConfirmed();
    refetchPreparing();
    refetchReady();
    refetchServed();
  }, [refetchPending, refetchConfirmed, refetchPreparing, refetchReady, refetchServed]);

  if (!store) return null;

  // Phase 39 Batch 6B: a section is one ScrollRail. The current-register
  // rail always keeps the original testid/fade-prefix ("order-queue-rail" /
  // "order-queue") and the original "mt-6" gutter spacing — both proven by
  // pre-existing tests — so the common single-bucket case is byte-for-byte
  // unaffected. Extra sections only ever appear alongside it, never in its
  // place.
  const sectionMeta = {
    current: {
      railTestId: "order-queue-rail",
      fadeTestIdPrefix: "order-queue",
      labelKey: "page.cashier.orderQueue.currentRegister"
    },
    unassigned: {
      railTestId: "order-queue-rail-unassigned",
      fadeTestIdPrefix: "order-queue-unassigned",
      labelKey: "page.cashier.orderQueue.unassignedOrders"
    }
  };

  const renderSection = (bucketKey, orders, { showLabel = false }) => {
    if (orders.length === 0) return null;
    const meta = sectionMeta[bucketKey];
    return (
      <div key={meta.railTestId}>
        {showLabel && (
          <div className="px-4 lg:px-6 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(meta.labelKey)}
          </div>
        )}
        <ScrollRail
          leftLabel={t("page.cashier.orderQueue.scrollLeft")}
          rightLabel={t("page.cashier.orderQueue.scrollRight")}
          railTestId={meta.railTestId}
          fadeTestIdPrefix={meta.fadeTestIdPrefix}
          gutterClassName={`${showLabel ? "" : "mt-6 "}flex items-center gap-2 px-4 lg:px-6`}
          railClassName="pb-1">
          <div className="flex gap-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={onLoadOrder}
                onCollectPayment={onCollectPayment}
                onCancelOrder={handleCancelOrder}
                onVoidOrder={canVoid ? setVoidTarget : undefined}
                readOnly={isClosedRegisterPaid(order)}
              />
            ))}
          </div>
        </ScrollRail>
      </div>
    );
  };

  return (
    <div className="shrink-0">
      {queueError && !isLoading && (
        <div
          role="alert"
          className="mx-4 lg:mx-6 mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {visibleOrders.length > 0
              ? t("page.cashier.orderQueue.refreshFailed")
              : t("page.cashier.orderQueue.loadFailed")}
          </span>
          <button
            type="button"
            onClick={refetchQueue}
            className="shrink-0 font-semibold underline underline-offset-2">
            {t("common.retry")}
          </button>
        </div>
      )}
      {isLoading ? (
        <OrderQueueSkeleton />
      ) : visibleOrders.length > 0 ? (
        <CollapsiblePanel
          title={t("page.cashier.orderQueue.title")}
          icon={ClipboardList}
          count={visibleOrders.length}
          storageKey="cashier.orderQueue"
          className="mt-3">
          {hasMultipleBuckets ? (
            <div className="mt-6 space-y-4">
              {renderSection("current", buckets.current, { showLabel: true })}
              {renderSection("unassigned", buckets.unassigned, { showLabel: true })}
            </div>
          ) : (
            // Common case: no unassigned orders — one rail, no headers.
            renderSection("current", buckets.current, {})
          )}
        </CollapsiblePanel>
      ) : null}
      {voidTarget && (
        <VoidOrderDialog
          open
          onOpenChange={(next) => !next && setVoidTarget(null)}
          order={voidTarget}
          store={store}
          onVoided={invalidateAllQueues}
        />
      )}
    </div>
  );
};

OrderQueue.propTypes = {
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onLoadOrder: PropTypes.func.isRequired,
  onCollectPayment: PropTypes.func,
  canVoid: PropTypes.bool
};

export default OrderQueue;

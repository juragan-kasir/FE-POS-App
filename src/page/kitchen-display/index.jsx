import { safeGet } from "@/lib/safe-lookup";
import React, { useEffect, useCallback } from "react";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
// import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useSocket } from "@/services/socket";
import { useRoomSubscription } from "@/hooks/useRoomSubscription";
import { getKitchenOrders, updateOrderItemStatus } from "@/services/kitchen";
import NoStore from "@/components/ui/NoStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Bell,
  CookingPot,
  Utensils,
  ListOrdered,
  User,
  StickyNote
} from "lucide-react";
import AbortController from "@/components/organism/abort-controller";
import StoreFilter from "@/components/ui/StoreFilter";
import { useLocations } from "@/queries/useLocations";

const statusConfig = {
  pending: {
    label: "Menunggu",
    icon: Clock,
    color: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    next: "preparing",
    nextLabel: "Ambil"
  },
  preparing: {
    label: "Dimasak",
    icon: CookingPot,
    color: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    next: "ready",
    nextLabel: "Selesai"
  },
  ready: {
    label: "Siap Saji",
    icon: CheckCircle2,
    color: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
    badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    next: "served",
    nextLabel: "Sajikan"
  }
};

const statusColumns = ["pending", "preparing", "ready"];

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}j ${mins % 60}m`;
};

const formatIDR = (num) => {
  if (!num && num !== 0) return "-";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

const paymentStatusCfg = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
};

const KitchenDisplay = () => {
  const { t } = useTranslation();
  // const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const { socket, connected } = useSocket();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const storeId = isSuperAdmin
    ? storeFilter && storeFilter !== "all"
      ? storeFilter
      : ""
    : cookie?.activeStore || cookie?.user?.store;

  const { data: locData, isLoading: isLoadingLocations } = useLocations("active", {
    enabled: isSuperAdmin
  });

  // F2: room-subscription awareness. `connected` alone must not disable
  // polling — the kitchen room join can be rejected (or lost on reconnect)
  // while the transport stays up. The super_admin global view joins the
  // `kitchen-all` room; every other view joins its own `kitchen-${storeId}`.
  const { roomOk } = useRoomSubscription({
    socket,
    connected,
    roomEvent: "join-kitchen",
    roomKey: storeId ? storeId : storeId === "" ? "all" : null
  });

  // Poll only as a fallback when realtime room membership is unconfirmed —
  // otherwise the socket listeners below (new-order/order-updated/
  // item-status-updated) already invalidate this query in real time, so
  // polling on top of that would just double the request rate for no
  // benefit (same pattern as WaiterRequestList's pollFallback). Branch on
  // `connected && roomOk`: a client that exists but is not connected, or a
  // connected client whose room join was rejected/is pending/was lost on
  // reconnect, delivers no events — the screen must keep polling until the
  // room join is confirmed (F2).
  const { data, isLoading, isError, refetch } = useQuery(
    ["kitchen-orders", storeId],
    () => getKitchenOrders(storeId ? { store: storeId } : {}),
    { enabled: !!storeId || storeId === "", refetchInterval: connected && roomOk ? false : 15000 }
  );
  const orders = data?.data || [];

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 200);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewOrder = () => {
      queryClient.invalidateQueries(["kitchen-orders"]);
      playNotificationSound();
    };
    const handleUpdate = () => queryClient.invalidateQueries(["kitchen-orders"]);

    socket.on("new-order", handleNewOrder);
    socket.on("order-updated", handleUpdate);
    socket.on("item-status-updated", handleUpdate);

    return () => {
      socket.off("new-order", handleNewOrder);
      socket.off("order-updated", handleUpdate);
      socket.off("item-status-updated", handleUpdate);
    };
  }, [socket, queryClient, playNotificationSound]);

  const updateMut = useMutation(
    ({ orderId, itemId, status }) => updateOrderItemStatus(orderId, itemId, status),
    {
      onSuccess: () => queryClient.invalidateQueries(["kitchen-orders"]),
      onError: (error, variables) => {
        toast.error(t("page.kitchenDisplay.updateFailed"), {
          action: {
            label: t("common.retry"),
            onClick: () => updateMut.mutate(variables)
          }
        });
      }
    }
  );

  const isItemLoading = (itemId) => updateMut.isLoading && updateMut.variables?.itemId === itemId;

  const getOrdersByStatus = (status) =>
    orders.filter((o) => o.items?.some((i) => i.status === status));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="text-primary" /> {t("page.kitchenDisplay.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("page.kitchenDisplay.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Bell size={16} />
          <span>{orders.reduce((s, o) => s + (o.items?.length || 0), 0)} item</span>
        </div>
      </div>

      {isSuperAdmin &&
        (isLoadingLocations || isLoading ? (
          <Skeleton className="h-9 w-48 rounded-md" />
        ) : (
          <div className="mb-4">
            <StoreFilter
              locations={locData?.data || []}
              value={storeFilter}
              onChange={(v) => setGlobalStoreFilter(v)}
              isSuperAdmin={isSuperAdmin}
              t={t}
            />
          </div>
        ))}

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : isLoading ? (
            <div className="grid grid-cols-3 gap-4 shrink-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ))}
            </div>
          ) : (
            // ponytail: flex-1 min-h-0 fills remaining space instead of hardcoded calc — tips card now lives above
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
              {statusColumns.map((colStatus) => {
                const cfg = safeGet(statusConfig, colStatus);
                const Icon = cfg.icon;
                const colOrders = getOrdersByStatus(colStatus);

                return (
                  <div key={colStatus} className="flex flex-col h-full">
                    <div
                      className={`flex items-center justify-between px-4 py-3 rounded-t-xl border ${cfg.color}`}>
                      <div className="flex items-center gap-2 font-semibold">
                        <Icon size={18} />
                        {t(`page.kitchenDisplay.status.${colStatus}`)}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.badge}`}>
                        {colOrders.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 p-3 border-x border-b rounded-b-xl bg-card">
                      {colOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                          <ListOrdered size={32} className="mb-2 opacity-30" />
                          {t("page.kitchenDisplay.noOrders")}
                        </div>
                      ) : (
                        colOrders.map((order) => {
                          const colItems = (order.items || []).filter(
                            (i) => i.status === colStatus
                          );
                          const colQty = colItems.reduce((s, i) => s + (i.quantity || 1), 0);
                          const colTotal = colItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
                          return (
                            <div
                              key={order.id}
                              className="bg-muted/30 rounded-lg border border-border overflow-hidden">
                              <div className="px-3 pt-3 pb-2 border-b border-border">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-sm truncate">
                                      #{order.orderNumber || order.id}
                                    </span>
                                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-background border border-border shrink-0">
                                      {colQty} {t("page.kitchenDisplay.itemUnit")}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {timeAgo(order.createdAt)}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  {(order.table?.name || order.tableId) && (
                                    <span className="inline-flex items-center gap-1">
                                      <Utensils size={12} />
                                      {order.table?.name ||
                                        `${t("page.kitchenDisplay.tableLabel")} ${order.tableId}`}
                                    </span>
                                  )}
                                  {order.customerName && (
                                    <span className="inline-flex items-center gap-1">
                                      <User size={12} />
                                      {order.customerName}
                                    </span>
                                  )}
                                  {order.cashierName && (
                                    <span className="inline-flex items-center gap-1">
                                      <ChefHat size={12} />
                                      {order.cashierName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="p-3 space-y-1.5">
                                {colItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="bg-background rounded-md border border-border px-3 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-medium text-sm truncate">
                                            {item.productName}
                                          </p>
                                          {item.quantity > 1 && (
                                            <span className="text-xs text-muted-foreground shrink-0">
                                              x{item.quantity}
                                            </span>
                                          )}
                                          {item.bundleName && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                              {item.bundleName}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                          {formatIDR(item.price)}
                                        </p>
                                        {item.notes && (
                                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            <StickyNote size={11} className="inline mr-0.5" />
                                            {t("page.kitchenDisplay.notesLabel")}: {item.notes}
                                          </p>
                                        )}
                                        {item.options?.length > 0 && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {t("page.kitchenDisplay.optionsLabel")}:{" "}
                                            {item.options.map((o) => o.name || o).join(", ")}
                                          </p>
                                        )}
                                        {item.modifiers?.length > 0 && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {t("page.kitchenDisplay.modifiersLabel")}:{" "}
                                            {item.modifiers.map((m) => m.name || m).join(", ")}
                                          </p>
                                        )}
                                        {item.stationDapur && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {t("page.kitchenDisplay.stationLabel")}:{" "}
                                            {item.stationDapur}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 h-7 text-xs"
                                        loading={isItemLoading(item.id)}
                                        onClick={() =>
                                          updateMut.mutate({
                                            orderId: order.id,
                                            itemId: item.id,
                                            status: cfg.next
                                          })
                                        }>
                                        {t(`page.kitchenDisplay.nextLabel.${colStatus}`)}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="px-3 py-2 border-t border-border flex items-center justify-between gap-2 text-xs">
                                <span className="text-muted-foreground">
                                  {colQty} {t("page.kitchenDisplay.itemUnit")}
                                </span>
                                <span className="font-semibold font-mono">
                                  {formatIDR(colTotal)}
                                </span>
                              </div>
                              <div className="px-3 pb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span className="uppercase">{order.paymentMethod || "-"}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                                    paymentStatusCfg[order.paymentStatus] ||
                                    paymentStatusCfg.pending
                                  }`}>
                                  {order.paymentStatus || "-"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KitchenDisplay;

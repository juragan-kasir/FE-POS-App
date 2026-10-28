import React, { useState, useCallback, useEffect } from "react";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  User,
  Store,
  Receipt,
  Loader2,
  Utensils,
  RefreshCw,
  XCircle,
  CheckCircle
} from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { axiosInstance } from "@/services";
import { useQuery, useQueryClient } from "react-query";
import { useSocket } from "@/services/socket";
import { useRoomSubscription } from "@/hooks/useRoomSubscription";
import StoreFilter from "@/components/ui/StoreFilter";
import TableToolbar from "@/components/ui/TableToolbar";
import { Skeleton } from "@/components/ui/skeleton";
import NoStore from "@/components/ui/NoStore";
import QrOrderFreshness from "./QrOrderFreshness";
import Modal from "@/components/organism/modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

// Polling fallback interval while the store room is not confirmed. An
// engineering default (DR-19: polling is engineering-owned); the numeric
// realtime-awareness bound itself is an open DR-10 launch input.
const QR_ORDER_POLL_MS = 30 * 1000;

const CustomerOrderManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const store = cookie?.activeStore || cookie.user?.store;
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [search, setSearch] = useState("");
  const [acceptingId, setAcceptingId] = useState(null);

  // P5-01: this screen previously only refreshed via the manual Refresh
  // button, so QR orders placed by customers stayed invisible to staff until
  // someone clicked it. When a socket is available, join the store room and
  // refetch the pending list on the backend's store-scoped `new-order` event.
  // The effective store mirrors the query below so the room matches exactly
  // the store whose pending orders are shown.
  const effectiveStore = isSuperAdmin ? (storeFilter === "all" ? "" : storeFilter || store) : store;

  const { socket, connected } = useSocket() || {};
  const queryClient = useQueryClient();

  // DR-10: realtime-first with a polling fallback — the established pattern
  // of OrderQueue / kitchen-display / WaiterRequestList. Room membership is
  // owned by useRoomSubscription (acked join, leave, reconnect); the list
  // polls until the server confirms this exact store room, so a host
  // without sockets (or a rejected/lost join) still surfaces new QR orders.
  const { roomOk } = useRoomSubscription({
    socket,
    connected,
    roomEvent: "join-store",
    roomKey: effectiveStore || null
  });
  const pollFallback = connected && roomOk ? false : QR_ORDER_POLL_MS;

  useEffect(() => {
    if (!socket) return;
    const handleNewOrder = () => {
      queryClient.invalidateQueries(["customer-orders", store, storeFilter, isSuperAdmin]);
    };
    socket.on("new-order", handleNewOrder);
    return () => socket.off("new-order", handleNewOrder);
  }, [socket, queryClient, store, storeFilter, isSuperAdmin]);

  const isFiltered = storeFilter !== "all" || search !== "";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setSearch("");
  };

  const { data: locData, isLoading: isLoadingLocations } = useLocations("all", {
    enabled: isSuperAdmin
  });

  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersError,
    isFetching: ordersFetching,
    dataUpdatedAt: ordersUpdatedAt,
    refetch: refetchOrders
  } = useQuery(
    ["customer-orders", store, storeFilter, isSuperAdmin],
    () => {
      if (!isSuperAdmin && !effectiveStore) {
        return [];
      }
      const params = new URLSearchParams({ source: "qr", status: "pending", limit: "100" });
      if (effectiveStore) params.set("store", effectiveStore);
      return axiosInstance
        .get(`/order/get-orders?${params.toString()}`)
        .then((res) => res.data?.data || []);
    },
    {
      enabled: isSuperAdmin || !!store,
      staleTime: 30 * 1000,
      refetchInterval: pollFallback
    }
  );

  const orders = ordersData || [];

  const [rejectingId, setRejectingId] = useState(null);
  const [modalOrder, setModalOrder] = useState(null);
  const [modalAction, setModalAction] = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const acceptOrder = useCallback(
    async (order) => {
      setAcceptingId(order.id);
      try {
        await axiosInstance.put("/order/update-status", {
          id: order.id,
          store,
          status: "preparing",
          changedBy: cookie.user?.id,
          changedByName: cookie.user?.fullName || cookie.user?.userName
        });
        setModalMessage(t("page.customerOrder.accepted", { orderNumber: order.orderNumber }));
        setSuccessModal(true);
        refetchOrders();
      } catch (e) {
        setModalMessage(e?.response?.data?.message || t("page.customerOrder.acceptFailed"));
        setErrorModal(true);
      } finally {
        setAcceptingId(null);
      }
    },
    [store, cookie.user, t, refetchOrders]
  );

  const rejectOrder = useCallback(
    async (order) => {
      setRejectingId(order.id);
      try {
        await axiosInstance.put("/order/update-status", {
          id: order.id,
          store,
          status: "cancelled",
          notes: "Ditolak oleh admin",
          changedBy: cookie.user?.id,
          changedByName: cookie.user?.fullName || cookie.user?.userName
        });
        setModalMessage(t("page.customerOrder.rejected", { orderNumber: order.orderNumber }));
        setSuccessModal(true);
        refetchOrders();
      } catch (e) {
        setModalMessage(e?.response?.data?.message || t("page.customerOrder.rejectFailed"));
        setErrorModal(true);
      } finally {
        setRejectingId(null);
      }
    },
    [store, cookie.user, t, refetchOrders]
  );

  const openConfirmModal = useCallback((order, action) => {
    setModalOrder(order);
    setModalAction(action);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!modalOrder || !modalAction) return;
    const order = modalOrder;
    const action = modalAction;
    setModalOrder(null);
    setModalAction(null);
    if (action === "accept") {
      acceptOrder(order);
    } else {
      rejectOrder(order);
    }
  }, [modalOrder, modalAction, acceptOrder, rejectOrder]);

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.items?.some((i) => i.productName?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {(acceptingId || rejectingId) && (
        <Loading fullscreen size="lg" label={t("common.loadingData")} />
      )}
      <div>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => navigate("/dashboard-super-admin")}
            className="hover:text-foreground transition-colors">
            {t("breadcrumb.home")}
          </button>
          <span className="text-xs">/</span>
          <span className="text-primary font-semibold">{t("sidebar.customerOrder")}</span>
        </nav>
      </div>

      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("sidebar.customerOrder")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("page.customerOrder.pendingDesc", { count: orders.length })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetchOrders} disabled={ordersLoading}>
            {ordersLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {t("page.customerOrder.refresh")}
          </Button>
        </div>
      </div>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            {isLoadingLocations ? (
              <>
                <Skeleton className="h-9 w-48 rounded-md" />
                <Skeleton className="h-9 w-full md:w-64 rounded-md" />
              </>
            ) : (
              <TableToolbar
                title={t("sidebar.customerOrder")}
                onReset={resetFilters}
                isFiltered={isFiltered}>
                {isSuperAdmin && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.customerOrder.storeLabel")}
                    </label>
                    <StoreFilter
                      locations={(locData?.data || []).filter((l) => l.status === "active")}
                      value={storeFilter}
                      onChange={(v) => setGlobalStoreFilter(v)}
                      isSuperAdmin={isSuperAdmin}
                      t={t}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="index-search"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.search")}
                  </label>
                  <SearchInput
                    id="index-search"
                    value={search}
                    onChange={setSearch}
                    placeholder={t("page.customerOrder.searchOrders")}
                    isLoading={ordersLoading}
                  />
                </div>
              </TableToolbar>
            )}
          </div>

          {ordersData !== undefined && (
            <QrOrderFreshness
              updatedAt={ordersUpdatedAt}
              isFetching={ordersFetching}
              isError={ordersError}
              onRetry={() => refetchOrders()}
            />
          )}

          {/* A failed background refresh keeps the last list on screen,
              flagged stale above; the full error state is only for "never
              loaded". */}
          {ordersError && ordersData === undefined ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Utensils size={40} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm mb-4">
                {t("page.customerOrder.loadOrdersFail")}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchOrders()}>
                <RefreshCw size={14} className="mr-1" />
                {t("page.customerOrder.retry")}
              </Button>
            </div>
          ) : ordersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-32 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              {search ? t("page.customerOrder.noMatching") : t("page.customerOrder.noPending")}
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((order) => {
                // const itemCount = order.items?.length || 0;
                return (
                  <Card
                    key={order.id}
                    className="p-4 sm:p-5 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base sm:text-lg text-foreground break-words">
                                {order.orderNumber}
                              </span>
                              <Badge variant="secondary" className="text-xs bg-muted dark:bg-muted">
                                <Clock size={10} className="mr-1" />
                                {new Date(order.createdAt).toLocaleString(dateLocale(), {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "numeric",
                                  month: "short"
                                })}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                              {order.customerName && (
                                <span className="flex items-center gap-1 bg-muted dark:bg-muted px-2 py-1 rounded-lg">
                                  <User size={12} className="text-primary" />
                                  <span className="font-medium text-foreground">
                                    {order.customerName}
                                  </span>
                                </span>
                              )}
                              {order.cashierName && (
                                <span className="flex items-center gap-1 bg-muted dark:bg-muted px-2 py-1 rounded-lg">
                                  <Receipt size={12} className="text-primary" />
                                  <span>
                                    {t("page.customerOrder.cashier")}: {order.cashierName}
                                  </span>
                                </span>
                              )}
                              {order.customerPhone && (
                                <span className="flex items-center gap-1 bg-muted dark:bg-muted px-2 py-1 rounded-lg">
                                  <span className="text-xs">📱</span>
                                  <span>{order.customerPhone}</span>
                                </span>
                              )}
                              {(order.table || order.tableId) && (
                                <span className="flex items-center gap-1 bg-muted dark:bg-muted px-2 py-1 rounded-lg">
                                  <Store size={12} className="text-primary" />
                                  {t("page.customerOrder.table")}{" "}
                                  {order.table?.name || order.table?.tableNumber || order.tableId}
                                </span>
                              )}
                              {order.paymentMethod && (
                                <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg border border-green-100 dark:border-green-800">
                                  <span className="text-xs">💳</span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {order.paymentMethod}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-1 sm:gap-2 sm:w-36 shrink-0">
                            <span className="block text-xs text-muted-foreground">
                              {t("page.customerOrder.totalQuantity")}
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              {t("page.customerOrder.itemsCount", { count: order.totalQuantity })}
                            </span>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                            {t("page.customerOrder.itemsLabel")}
                          </h4>
                          <div className="space-y-2">
                            {order.items?.map((item) => (
                              <div
                                key={item.id}
                                className="bg-muted dark:bg-muted p-3 rounded-xl border border-border dark:border-border">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                    <span className="font-bold text-primary shrink-0">
                                      {item.quantity}x
                                    </span>
                                    <span className="font-medium text-foreground break-words">
                                      {item.productName}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                      Rp{Number(item.price).toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                  <span className="font-bold text-primary shrink-0">
                                    Rp
                                    {Number(
                                      item.totalPrice || item.price * item.quantity
                                    ).toLocaleString("id-ID")}
                                  </span>
                                </div>
                                {item.notes && (
                                  <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                                    <span>✏️</span>
                                    <span className="italic break-words">{item.notes}</span>
                                  </div>
                                )}
                                {item.options && item.options.length > 0 && (
                                  <div className="flex items-start gap-1.5 mt-1 text-xs text-muted-foreground">
                                    <span>⚙️</span>
                                    <span className="italic break-words">
                                      {item.options.map((opt) => opt.value || opt.name).join(", ")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 w-full lg:w-48 lg:items-end shrink-0">
                        <div className="flex flex-col gap-1 w-full lg:w-auto">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-between lg:justify-end">
                            <span className="text-muted-foreground">
                              {t("page.customerOrder.subtotal")}:
                            </span>
                            <span>Rp{Number(order.subTotal).toLocaleString("id-ID")}</span>
                          </div>
                          {order.discountAmount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 justify-between lg:justify-end">
                              <span className="text-muted-foreground">
                                {t("page.customerOrder.discount")}:
                              </span>
                              <span>-Rp{Number(order.discountAmount).toLocaleString("id-ID")}</span>
                            </div>
                          )}
                          {order.taxAmount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-between lg:justify-end">
                              <span className="text-muted-foreground">
                                {t("page.customerOrder.taxRate", { rate: order.taxRate || 0 })}:
                              </span>
                              <span>Rp{Number(order.taxAmount).toLocaleString("id-ID")}</span>
                            </div>
                          )}
                          {order.serviceChargeAmount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-between lg:justify-end">
                              <span className="text-muted-foreground">
                                {t("page.customerOrder.service")}:
                              </span>
                              <span>
                                Rp{Number(order.serviceChargeAmount).toLocaleString("id-ID")}
                              </span>
                            </div>
                          )}
                          <Separator className="my-1" />
                          <div className="flex items-center gap-2 font-bold text-lg justify-between lg:justify-end">
                            <span className="text-muted-foreground">
                              {t("page.customerOrder.total")}:
                            </span>
                            <span className="text-primary">
                              Rp{Number(order.totalPrice).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full">
                          <Button
                            onClick={() => openConfirmModal(order, "accept")}
                            className="flex-1 bg-primary hover:bg-primary/90 py-2"
                            size="lg">
                            <CheckCircle size={18} className="mr-1.5" />
                            {t("page.customerOrder.accept")}
                          </Button>
                          <Button
                            onClick={() => openConfirmModal(order, "reject")}
                            variant="destructive"
                            className="flex-1 py-2"
                            size="lg">
                            <XCircle size={18} className="mr-1.5" />
                            {t("page.customerOrder.reject")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={!!modalOrder} onOpenChange={(open) => !open && setModalOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalAction === "accept" ? (
                <CheckCircle size={20} className="text-primary" />
              ) : (
                <XCircle size={20} className="text-destructive" />
              )}
              {modalAction === "accept"
                ? t("page.customerOrder.confirmAcceptTitle")
                : t("page.customerOrder.confirmRejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {modalAction === "accept"
                ? t("page.customerOrder.confirmAcceptDesc", {
                    orderNumber: modalOrder?.orderNumber
                  })
                : t("page.customerOrder.confirmRejectDesc", {
                    orderNumber: modalOrder?.orderNumber
                  })}
            </DialogDescription>
          </DialogHeader>

          {modalOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">{modalOrder.orderNumber}</span>
                <Badge variant="secondary" className="text-xs bg-muted dark:bg-muted">
                  <Clock size={10} className="mr-1" />
                  {new Date(modalOrder.createdAt).toLocaleString(dateLocale(), {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short"
                  })}
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                {modalOrder.customerName && (
                  <span className="flex items-center gap-1 bg-muted dark:bg-muted px-2 py-1 rounded-lg">
                    <User size={12} className="text-primary" />
                    <span className="font-medium text-foreground">{modalOrder.customerName}</span>
                  </span>
                )}
                {modalOrder.cashierName && (
                  <span className="flex items-center gap-1 bg-muted dark:bg-muted px-2 py-1 rounded-lg">
                    <Receipt size={12} className="text-primary" />
                    <span>
                      {t("page.customerOrder.cashier")}: {modalOrder.cashierName}
                    </span>
                  </span>
                )}
                {modalOrder.customerPhone && (
                  <span className="flex items-center gap-1 bg-muted dark:bg-muted px-2 py-1 rounded-lg">
                    <span className="text-xs">📱</span>
                    <span>{modalOrder.customerPhone}</span>
                  </span>
                )}
                {(modalOrder.table || modalOrder.tableId) && (
                  <span className="flex items-center gap-1 bg-muted dark:bg-muted px-2 py-1 rounded-lg">
                    <Store size={12} className="text-primary" />
                    {t("page.customerOrder.table")}{" "}
                    {modalOrder.table?.name || modalOrder.table?.tableNumber || modalOrder.tableId}
                  </span>
                )}
                {modalOrder.paymentMethod && (
                  <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg border border-green-100 dark:border-green-800">
                    <span className="text-xs">💳</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {modalOrder.paymentMethod}
                    </span>
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  {t("page.customerOrder.itemsLabel")}
                </h4>
                <div className="space-y-2">
                  {modalOrder.items?.map((item) => (
                    <div
                      key={item.id}
                      className="bg-muted dark:bg-muted p-3 rounded-xl border border-border dark:border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                          <span className="font-bold text-primary shrink-0">{item.quantity}x</span>
                          <span className="font-medium text-foreground break-words">
                            {item.productName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Rp{Number(item.price).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <span className="font-bold text-primary shrink-0">
                          Rp
                          {Number(item.totalPrice || item.price * item.quantity).toLocaleString(
                            "id-ID"
                          )}
                        </span>
                      </div>
                      {item.notes && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                          <span>✏️</span>
                          <span className="italic break-words">{item.notes}</span>
                        </div>
                      )}
                      {item.options && item.options.length > 0 && (
                        <div className="flex items-start gap-1.5 mt-1 text-xs text-muted-foreground">
                          <span>⚙️</span>
                          <span className="italic break-words">
                            {item.options.map((opt) => opt.value || opt.name).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="text-muted-foreground">{t("page.customerOrder.subtotal")}:</span>
                  <span>Rp{Number(modalOrder.subTotal).toLocaleString("id-ID")}</span>
                </div>
                {modalOrder.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400">
                    <span className="text-muted-foreground">
                      {t("page.customerOrder.discount")}:
                    </span>
                    <span>-Rp{Number(modalOrder.discountAmount).toLocaleString("id-ID")}</span>
                  </div>
                )}
                {modalOrder.taxAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="text-muted-foreground">
                      {t("page.customerOrder.taxRate", { rate: modalOrder.taxRate || 0 })}:
                    </span>
                    <span>Rp{Number(modalOrder.taxAmount).toLocaleString("id-ID")}</span>
                  </div>
                )}
                {modalOrder.serviceChargeAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="text-muted-foreground">
                      {t("page.customerOrder.service")}:
                    </span>
                    <span>Rp{Number(modalOrder.serviceChargeAmount).toLocaleString("id-ID")}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex items-center justify-between font-bold text-base">
                  <span className="text-muted-foreground">{t("page.customerOrder.total")}:</span>
                  <span className="text-primary">
                    Rp{Number(modalOrder.totalPrice).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="danger"
              onClick={() => setModalOrder(null)}
              className="flex-1 sm:flex-none">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              variant={modalAction === "reject" ? "destructive" : "default"}
              className={`flex-1 sm:flex-none ${modalAction === "accept" ? "bg-primary hover:bg-primary/90" : ""}`}>
              {modalAction === "accept" ? (
                <CheckCircle size={16} className="mr-1.5" />
              ) : (
                <XCircle size={16} className="mr-1.5" />
              )}
              {modalAction === "accept"
                ? t("page.customerOrder.accept")
                : t("page.customerOrder.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Modal
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={modalMessage}
        onConfirm={() => setSuccessModal(false)}
      />

      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />
    </div>
  );
};

export default CustomerOrderManagement;

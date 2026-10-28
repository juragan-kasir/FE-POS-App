import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingBag, Maximize, Minimize, Sun, Moon, Store, UtensilsCrossed } from "lucide-react";
import { useThemeStore } from "@/state/theme";
import { useThemeEffect } from "@/hooks/useThemeEffect";
import { storeIdsEqual } from "@/utils/storeId";
import {
  CART_MIRROR_KEY,
  DISPLAY_EVENT_KEY,
  DISPLAY_EVENT_TYPES,
  clearDisplayEvent,
  readDisplayEvent
} from "@/utils/customerDisplayBoard";
import ThankYouModal from "./ThankYouModal";
import QrisPaymentModal from "./QrisPaymentModal";
import { useLocations } from "@/queries/useLocations";
import { Button } from "@/components/ui/button";

const EVENT_RECENCY_MS = 30000;

const formatIDR = (val) => `Rp ${(val || 0).toLocaleString("id-ID")}`;

const readCart = () => {
  try {
    const raw = localStorage.getItem(CART_MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const OrderItemRow = ({ item }) => {
  const initial = (item.nameProduct || "?")[0]?.toUpperCase() || "?";
  return (
    <div className="flex items-center justify-between gap-4 bg-card rounded-2xl border border-border px-5 py-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center">
          <span className="text-xl font-bold text-primary/70">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-lg truncate">{item.nameProduct}</p>
          {item.variantName && (
            <p className="text-sm text-muted-foreground truncate">- {item.variantName}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-5 shrink-0">
        <span className="text-2xl font-black text-primary">{item.count || 0}x</span>
        <span className="font-bold text-foreground text-lg font-mono min-w-[110px] text-right">
          {formatIDR(item.totalPrice)}
        </span>
      </div>
    </div>
  );
};

const CustomerDisplayBoard = () => {
  const { t } = useTranslation();
  const { toggleTheme } = useThemeStore();
  useThemeEffect();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get("store");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cart, setCart] = useState(readCart);
  const [thankYouEvent, setThankYouEvent] = useState(null);
  const [qrisEvent, setQrisEvent] = useState(null);

  const { data: locsData } = useLocations("active", { enabled: !!storeId, retry: 1 });
  const locationList = locsData?.data || locsData || [];
  const storeName = locationList.find((l) => storeIdsEqual(l.id, storeId))?.name || "";

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const matchesStore = (evt) => {
    if (!storeId || !evt.store) return true;
    return storeIdsEqual(evt.store, storeId);
  };

  const handleThankYouEvent = (evt) => {
    setCart(null);
    try {
      localStorage.removeItem(CART_MIRROR_KEY);
    } catch {
      // localStorage unavailable; ignore
    }
    setQrisEvent(null);
    setThankYouEvent(evt);
    clearDisplayEvent();
  };

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CART_MIRROR_KEY) {
        setCart(e.newValue ? JSON.parse(e.newValue) : null);
      }
      if (e.key === DISPLAY_EVENT_KEY && e.newValue) {
        let evt = null;
        try {
          evt = JSON.parse(e.newValue);
        } catch {
          evt = null;
        }
        if (!evt) return;
        if (evt.type === DISPLAY_EVENT_TYPES.TRANSACTION_SUCCESS && matchesStore(evt)) {
          handleThankYouEvent(evt);
        } else if (evt.type === DISPLAY_EVENT_TYPES.QRIS_PAYMENT_REQUEST && matchesStore(evt)) {
          setThankYouEvent(null);
          setQrisEvent(evt);
          clearDisplayEvent();
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storeId]);

  useEffect(() => {
    const evt = readDisplayEvent();
    if (!evt || !matchesStore(evt)) return;
    if (
      evt.type === DISPLAY_EVENT_TYPES.TRANSACTION_SUCCESS &&
      Date.now() - (evt.dispatchedAt || 0) < EVENT_RECENCY_MS
    ) {
      handleThankYouEvent(evt);
    } else if (
      evt.type === DISPLAY_EVENT_TYPES.QRIS_PAYMENT_REQUEST &&
      Date.now() - (evt.dispatchedAt || 0) < EVENT_RECENCY_MS
    ) {
      setQrisEvent(evt);
      clearDisplayEvent();
    }
  }, [storeId]);

  const items = cart?.items || [];
  const tableName = cart?.tableName || "";
  const totalItems = cart?.totalItems ?? items.reduce((sum, i) => sum + (i.count || 0), 0);
  const subtotal = cart?.subtotal ?? 0;
  const taxAmount = cart?.taxAmount ?? 0;
  const total = cart?.total ?? subtotal + taxAmount;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border px-6 md:px-10 py-5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ShoppingBag size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                {t("page.customerDisplayBoard.title")}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Store size={13} />
                  {storeName || t("page.customerDisplayBoard.store")}
                </p>
                {tableName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-0.5 text-sm font-bold">
                    <UtensilsCrossed size={13} />
                    {t("page.customerDisplayBoard.table")}: {tableName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-sm text-muted-foreground">
                {t("page.customerDisplayBoard.activeOrders")}
              </p>
              <p className="text-3xl font-black text-orange-500 dark:text-orange-400 leading-none mt-1">
                {totalItems}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={t("header.toggleTheme")}
              className="rounded-xl">
              <Sun size={18} className="hidden dark:block" />
              <Moon size={18} className="block dark:hidden" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              aria-label={t("page.customerDisplayBoard.ui.toggleFullscreen")}
              className="rounded-xl">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 md:px-10 py-8 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-muted/50 border border-border flex items-center justify-center mb-6">
                <ShoppingBag size={48} className="text-muted-foreground/40" />
              </div>
              <p className="text-2xl font-bold text-muted-foreground">
                {t("page.customerDisplayBoard.noOrders")}
              </p>
              <p className="text-muted-foreground/70 mt-2">
                {t("page.customerDisplayBoard.noOrdersDesc")}
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-bold text-xl mb-4 px-1">
                {t("page.customerDisplayBoard.orderCount", { count: totalItems })}
              </h2>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <OrderItemRow key={item.cartKey || idx} item={item} />
                ))}
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 mt-6 border-t border-border bg-card/50 backdrop-blur rounded-2xl border-b-0 border-l-0 border-r-0 px-5 py-5 space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">
                {t("page.customerDisplayBoard.subtotal")}
              </span>
              <span className="font-semibold text-foreground">{formatIDR(subtotal)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex items-center justify-between text-lg">
                <span className="text-muted-foreground">
                  {t("page.customerDisplayBoard.tax", {
                    rate: Math.round((cart?.taxRate || 0) * 100)
                  })}
                </span>
                <span className="font-semibold text-foreground">{formatIDR(taxAmount)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">
                {t("page.customerDisplayBoard.total")}
              </span>
              <span className="font-black text-2xl text-foreground">{formatIDR(total)}</span>
            </div>
          </div>
        )}
      </main>

      {thankYouEvent && (
        <ThankYouModal event={thankYouEvent} onDismiss={() => setThankYouEvent(null)} />
      )}

      {qrisEvent && <QrisPaymentModal event={qrisEvent} onDismiss={() => setQrisEvent(null)} />}
    </div>
  );
};

export default CustomerDisplayBoard;

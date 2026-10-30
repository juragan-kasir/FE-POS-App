import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  X,
  Package,
  Menu,
  Sun,
  Moon,
  Store,
  ChevronRight,
  ChevronLeft,
  MonitorPlay,
  Armchair,
  Loader2
} from "lucide-react";
import AbortController from "@/components/organism/abort-controller";
import { useDebounce } from "@/hooks/useDebounce";
import { useTranslation } from "react-i18next";
import {
  getFullProductCatalog,
  getProductByOutlet,
  getRecipeAvailability
} from "@/services/product";
import { getCustomerTaxRate } from "@/services/order";
import { storeIdsEqual } from "@/utils/storeId";
import { isAdminRole } from "@/utils/role";
import { canAccess } from "@/utils/permission";
import { normalizeCatalogProduct } from "@/utils/catalogPrice";
import { orderList } from "@/state/order-list";
import {
  CART_MIRROR_KEY,
  DISPLAY_EVENT_TYPES,
  dispatchDisplayEvent
} from "@/utils/customerDisplayBoard";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import ProductGrid from "./components/ProductGrid";
import CartPanel from "./components/CartPanel";
import CheckoutModal from "./components/CheckoutModal";
import ReceiptModal from "./components/ReceiptModal";
import OrderQueue from "./components/OrderQueue";
import IncomingQrOrderAlert from "./components/IncomingQrOrderAlert";
import CollectPaymentModal from "./components/CollectPaymentModal";
import ParkedCartPanel from "./components/ParkedCartPanel";
import { createParkedCart } from "@/services/parked-cart";
import Sidebar from "@/components/layout/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserDropdown, NotificationBell } from "@/components/layout/Header";
import { useThemeStore } from "@/state/theme";
import { useThemeEffect } from "@/hooks/useThemeEffect";
import ScreenModeDialog from "./components/ScreenModeDialog";
import CashierTablePanel, { cashierTablesKey } from "./components/CashierTablePanel";
import { getCashierTables } from "@/services/table";
import { useLocations } from "@/queries/useLocations";
import NoStore from "@/components/ui/NoStore";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Textarea } from "@/components/ui/textarea";
import { handleCashierShortcut } from "./shortcuts";

const CashierPage = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = useMemo(() => {
    const fromSession = () => {
      try {
        const stored = sessionStorage.getItem("user");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    };
    const session = fromSession();
    if (
      session &&
      session.accessMenu &&
      Array.isArray(session.accessMenu) &&
      session.accessMenu.length > 0
    ) {
      return session;
    }
    return cookie?.user;
  }, [cookie?.user]);
  const role = user?.roleType;
  const isSuperAdmin = role === "super_admin";
  // F7-01: price override is a UX/safety gate only — mirrors admin/super_admin
  // roles the same way ReceiptModal's split-bill actions already do for this
  // page. The backend remains the actual authority on whether an override
  // is ever accepted.
  const canOverridePrice = isAdminRole(user);
  // DR-23 §J: void is elevated (order.void) — the legacy admin roles only.
  // UX gate; the server's capability check is the authority.
  const canVoidOrders = isAdminRole(user);
  // An empty catalog offers "Tambah Produk" to whoever may add products —
  // the same check the product list uses for its add button.
  const navigate = useNavigate();
  const canAddProduct = canAccess(user, "/product-list", "add");
  const [searchParams, setSearchParams] = useSearchParams();
  const storeParam = searchParams.get("store");
  const [pickedStore, setPickedStore] = useState(null);
  // Store chosen on the picker, awaiting the one/two-screen choice.
  const [screenModeStore, setScreenModeStore] = useState(null);
  // A super admin with exactly one active store goes straight to it (see
  // singleStoreId below); with several, the picker asks which one.
  const [autoStoreId, setAutoStoreId] = useState(null);
  const store =
    storeParam || (isSuperAdmin ? pickedStore || autoStoreId : cookie?.activeStore || user?.store);
  const boardTabRef = useRef(0);

  const openBoardTab = (storeId) => {
    const now = Date.now();
    if (now - boardTabRef.current < 500 || isOpeningBoard) return;
    boardTabRef.current = now;
    setIsOpeningBoard(true);
    const boardWindow = window.open(
      storeId ? `/customer-display-board?store=${storeId}` : "/customer-display-board",
      "_blank"
    );
    if (!boardWindow) {
      setIsOpeningBoard(false);
      toast.error(t("page.cashier.popupBlocked"));
      return;
    }
    setTimeout(() => setIsOpeningBoard(false), 800);
  };

  // One screen: the cashier only. Two screens: also the store's customer
  // display board in a new tab (opened from this click, so it is not
  // popup-blocked).
  const handleScreenMode = (mode) => {
    const loc = screenModeStore;
    setScreenModeStore(null);
    if (!loc) return;
    setPickedStore(loc.id);
    setSearchParams({ store: loc.id });
    if (mode === "dual") openBoardTab(loc.id);
  };

  const { data: locsData, isLoading: locsLoading } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locationList = locsData?.data || locsData || [];
  // The store list loaded and holds no store: nothing to pick, so point to
  // creating one (same empty state as the other store-scoped pages).
  const noStoreYet = !!locsData && !locsLoading && locationList.length === 0;
  // One store, nothing to pick: open it (one screen; the header's board
  // button still opens the customer display).
  const singleStoreId = isSuperAdmin && locationList.length === 1 ? locationList[0].id : null;
  useEffect(() => {
    if (singleStoreId != null && autoStoreId !== singleStoreId) setAutoStoreId(singleStoreId);
  }, [singleStoreId, autoStoreId]);

  const storeName = store
    ? locationList.find((l) => storeIdsEqual(l.id, store))?.name || t("page.cashier.storeName")
    : t("page.cashier.storeName");
  const userName = user?.userName || user?.name || cookie?.name || t("page.cashier.cashierName");
  const { toggleTheme: toggleThemeStore } = useThemeStore();
  useThemeEffect();

  const toggleTheme = () => toggleThemeStore();

  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showTables, setShowTables] = useState(false);
  // Table reset (BA C-16 amended): cashier roles only; the button shows when
  // the store has tables, with a badge for tables that are not available.
  const canManageTables = ["kasir", "admin", "super_admin"].includes(role);
  const { data: cashierTablesData } = useQuery(
    cashierTablesKey(store),
    () => getCashierTables(store),
    { enabled: !!store && canManageTables, staleTime: 60000, refetchOnWindowFocus: false }
  );
  const cashierTables = cashierTablesData?.data || [];
  const tablesNotAvailable = cashierTables.filter((tb) => tb.status !== "available").length;
  const [isOpeningBoard, setIsOpeningBoard] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [clearCartOpen, setClearCartOpen] = useState(false);
  const [parkCartOpen, setParkCartOpen] = useState(false);
  const [parkNotes, setParkNotes] = useState("");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [pendingLoadOrder, setPendingLoadOrder] = useState(null);
  const [refocusSignal, setRefocusSignal] = useState(0);
  // F4-01: order selected from the queue for payment settlement — kept
  // separate from `pendingLoadOrder`/cart state since settling an existing
  // order never touches the cart.
  const [collectPaymentOrder, setCollectPaymentOrder] = useState(null);

  useEffect(() => {
    const visited = localStorage.getItem("pos-onboarding-done");
    if (visited) setHasSeenOnboarding(true);
  }, []);

  useEffect(() => {
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => {
        setOnboardingOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenOnboarding]);

  const handleCompleteOnboarding = useCallback(() => {
    localStorage.setItem("pos-onboarding-done", "true");
    setHasSeenOnboarding(true);
    setOnboardingOpen(false);
    toast.success(t("page.cashier.welcome"), {
      description: t("page.cashier.welcomeDesc")
    });
  }, [t]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowCartMobile(false);
        return;
      }
      handleCashierShortcut(e);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSidebarHoverChange = (collapsed) => setSidebarCollapsed(collapsed);
  const handleMobileMenuToggle = () => setMobileSidebarOpen((prev) => !prev);

  // Phase 31 Batch 2 (PERF-1): subscribe to the cart `order` slice only —
  // the previous whole-store subscription re-rendered this page (and
  // re-created every cart callback below) on any store write. Actions are
  // stable references read via getState() without subscribing.
  const cartOrder = orderList((s) => s.order);

  // Debounced for the network request only — the input itself stays
  // controlled by the raw `search` state so typing feels instant, and the
  // client-side re-filter below also uses the raw value against whatever
  // is already loaded. Without this, every keystroke fired a live request
  // against the store's full product list (this is the highest-traffic
  // screen in the app).
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: productsData,
    isLoading,
    isError,
    refetch
  } = useQuery(
    ["products-outlet", store, debouncedSearch],
    () => getFullProductCatalog({ location: store, search: debouncedSearch || undefined }),
    {
      enabled: !!store
    }
  );

  // BRD BR-05: portions each recipe product can still make at this outlet
  // (ProductGrid subtracts the cart). Refreshed after every sale
  // (CheckoutModal) and every minute; a failure never blocks selling — the
  // server still refuses a short sale.
  const { data: recipeAvailability } = useQuery(
    ["recipe-availability", store],
    () => getRecipeAvailability({ location: store }),
    { enabled: !!store, retry: false, refetchInterval: 60000 }
  );

  // W3-4 (K1): the catalog's server-authoritative effectivePrice becomes the
  // selling price of every product row (see utils/catalogPrice.js).
  const products = useMemo(() => {
    const rows = productsData?.data || productsData || [];
    return Array.isArray(rows) ? rows.map(normalizeCatalogProduct) : [];
  }, [productsData]);
  const bundles = useMemo(() => productsData?.bundles || [], [productsData]);

  const bundleProducts = useMemo(
    () =>
      bundles.map((b) => ({
        id: b.id,
        bundleId: b.id,
        nameProduct: b.name,
        sku: b.sku,
        sellPrice: b.bundlePrice,
        price: b.bundlePrice,
        // bundlePrice is the server's authoritative bundle price.
        priceAuthoritative: true,
        stock: b.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        isBundle: true,
        category: { id: "bundle", nameCategory: "Bundle" },
        bundleData: b
      })),
    [bundles]
  );

  const allProducts = useMemo(() => [...products, ...bundleProducts], [products, bundleProducts]);

  const catId = (p) => {
    const raw =
      p.category?.id ??
      p.category?._id ??
      p.category ??
      p.categoryId?.id ??
      p.categoryId?._id ??
      "";
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw).id;
      } catch {
        return raw;
      }
    }
    return raw;
  };

  const filteredProducts = useMemo(
    () =>
      allProducts.filter((p) => {
        const name = (p.nameProduct || p.name || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const q = search.toLowerCase();
        const matchesSearch = !search || name.includes(q) || sku.includes(q);
        const matchesCategory = !categoryId || String(catId(p)) === String(categoryId);
        return matchesSearch && matchesCategory;
      }),
    [allProducts, search, categoryId]
  );

  // `allProducts` only ever holds the store's first catalog page (backend
  // caps a page at 500 rows, F7-02) — a store with more active products than
  // that has real, sellable items ProductGrid's local barcode lookup can
  // never see. Give it a narrowly-scoped live fallback instead of letting a
  // valid scan for one of those items falsely report "not found".
  const lookupProductRemote = useCallback(
    async (code) => {
      if (!store) return [];
      const res = await getProductByOutlet({ location: store, search: code });
      return (res?.data || []).map(normalizeCatalogProduct);
    },
    [store]
  );

  const totalItems = cartOrder.reduce((sum, item) => sum + (item.count || 0), 0);
  const subtotal = cartOrder.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);

  // F-SMOKE-01: fetches the same store-or-global, fallback-included rate
  // order/create actually charges (getActiveTaxRate/getServiceChargeRate),
  // instead of re-deriving it locally from the raw tax-config list — a
  // re-derivation that had no equivalent to the backend's 11% default and
  // so silently showed 0% whenever no active ppn row existed.
  const {
    data: customerTaxRateData,
    isLoading: taxLoading,
    refetch: refetchTaxRate
  } = useQuery(["cashier-customer-tax-rate", store], () => getCustomerTaxRate(store), {
    enabled: !!store
  });

  // Never present a failed tax lookup as 0%: checkout will charge the
  // server-resolved rate, so an unresolved rate makes the cart total
  // unavailable until the operator retries.
  const rawTaxRate = customerTaxRateData?.data?.rate;
  const taxRateResolved = rawTaxRate != null && Number.isFinite(Number(rawTaxRate));
  const taxRate = taxRateResolved ? Number(rawTaxRate) / 100 : null;
  const taxAmount = taxRate != null ? Math.round(subtotal * taxRate) : null;
  const taxUnavailable = !taxLoading && !taxRateResolved;

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(
        CART_MIRROR_KEY,
        JSON.stringify({
          totalItems,
          subtotal,
          taxRate,
          taxAmount,
          taxUnavailable,
          total: taxUnavailable ? null : subtotal + (taxAmount || 0),
          tableName: selectedTable?.name || "",
          items: cartOrder.map((item) => ({
            cartKey: item.cartKey || item.id,
            nameProduct: item.nameProduct || item.name || "",
            variantName: item.variantName || null,
            count: item.count || 0,
            price: Number(item.price) || 0,
            totalPrice: Number(item.totalPrice) || 0,
            unit: item.unit || ""
          })),
          updatedAt: Date.now()
        })
      );
    }, 150);
    return () => clearTimeout(timer);
  }, [cartOrder, totalItems, subtotal, taxRate, taxAmount, taxUnavailable, selectedTable]);

  const queryClient = useQueryClient();

  // storeAtInvocation is captured synchronously here, before the request
  // starts — onSuccess invalidates that captured store's cache entry,
  // never whatever `store` happens to be selected once the response
  // resolves. This is what makes a park started on Store A, followed by
  // a switch to Store B before the response returns, unable to touch
  // Store B's parked-cart list.
  const parkMutation = useMutation(
    (payload) => {
      const storeAtInvocation = store;
      return createParkedCart(payload).then((res) => ({ res, storeAtInvocation }));
    },
    {
      onSuccess: ({ res, storeAtInvocation }) => {
        queryClient.invalidateQueries(["parked-carts", storeAtInvocation]);
        if (res?.data?.status === "active") {
          orderList.getState().resetOrder();
          setSelectedTable(null);
        }
        setParkCartOpen(false);
        setParkNotes("");
        toast.success(t("page.cashier.parkedCart.parked", "Cart parked"));
      },
      onError: (err) => {
        toast.error(t("page.cashier.parkedCart.parkFailed", "Could not park cart"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  const handleParkCart = useCallback(() => {
    parkMutation.mutate({
      tableId: selectedTable?.id || null,
      notes: parkNotes || undefined,
      cart: {
        items: cartOrder,
        orderType: selectedTable ? "dine-in" : "takeaway"
      }
    });
  }, [parkMutation, selectedTable, parkNotes, cartOrder]);

  // The server has already committed the resume transition by the time
  // this runs (ParkedCartPanel only calls onResumed after a genuine 200)
  // — this is purely client-side rehydration of an already-confirmed
  // server state, using the payload the server just returned rather than
  // any locally-cached copy.
  const handleResumeParkedCart = useCallback(
    (parkedCart) => {
      orderList.getState().resetOrder();
      const items = parkedCart?.cartPayload?.items || [];
      items.forEach((item) => orderList.getState().addingProduct(item));
      setSelectedTable(
        parkedCart?.tableId ? { id: parkedCart.tableId, name: parkedCart.table?.name || "" } : null
      );
      toast.success(t("page.cashier.parkedCart.resumed", "Parked cart resumed"), {
        description: t("page.cashier.orderLoadedDesc", { count: items.length })
      });
    },
    [t]
  );

  const handleLoadOrder = useCallback(
    (order) => {
      // F9-03: a malformed/incomplete order (no `items` array at all) must
      // not wipe the active cart on its way to a crash — bail before
      // resetting anything, and tell the cashier clearly instead of
      // silently leaving them with an empty cart and no feedback.
      if (!Array.isArray(order?.items)) {
        toast.error(t("page.cashier.orderLoadFailed"), {
          description: t("page.cashier.orderLoadFailedDesc")
        });
        return;
      }
      orderList.getState().resetOrder();
      order.items.forEach((item) => {
        orderList.getState().addingProduct({
          id: item.product,
          cartKey: `${item.product}_${item.options?.[0]?.name || ""}`,
          nameProduct: item.productName,
          variantName: item.options?.[0]?.name || null,
          price: item.price,
          count: item.quantity,
          totalPrice: item.totalPrice || item.price * item.quantity,
          image: null,
          unit: "",
          sku: "",
          point: 0,
          redeemPoints: 0
        });
      });
      toast.success(t("page.cashier.orderLoaded"), {
        description: t("page.cashier.orderLoadedDesc", { count: order.items.length })
      });
    },
    [t]
  );

  // Loading a queued order wipes the active cart via handleLoadOrder's
  // cart.resetOrder() — guard that behind a confirmation whenever the
  // cashier already has unpaid items in progress, so a stray click on the
  // order queue can't silently destroy an in-progress sale. An empty cart
  // loads immediately (no added friction for the common case).
  const requestLoadOrder = useCallback(
    (order) => {
      if (cartOrder.length > 0) {
        setPendingLoadOrder(order);
      } else {
        handleLoadOrder(order);
      }
    },
    [cartOrder.length, handleLoadOrder]
  );

  const handleCheckoutComplete = useCallback(
    (result) => {
      setReceiptData(result);
      setCheckoutOpen(false);
      orderList.getState().resetOrder();
      dispatchDisplayEvent({
        type: DISPLAY_EVENT_TYPES.TRANSACTION_SUCCESS,
        store,
        orderId: result?.id || result?._id || "",
        orderNumber: result?.orderNumber || result?.invoice || "",
        total: result?.total || result?.grandTotal || result?.totalPrice || 0
      });
    },
    [store]
  );

  const handleNewTransaction = useCallback(() => {
    orderList.getState().resetOrder();
    setSelectedTable(null);
    setReceiptData(null);
    // Return the cashier straight to scanning/typing the next sale instead
    // of leaving them to click back into the search/barcode field.
    setRefocusSignal((n) => n + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background relative">
      {/* Subtle background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 dark:bg-primary/3 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-secondary/5 dark:bg-secondary/3 blur-3xl" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden desk:block">
        <Sidebar collapsed={sidebarCollapsed} onHoverChange={handleSidebarHoverChange} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 desk:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 h-screen w-72 shadow-2xl">
            <Sidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`h-screen flex flex-col transition-all duration-300 ${sidebarCollapsed ? "desk:ml-16" : "desk:ml-64"}`}>
        <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/50 shrink-0">
          <TooltipProvider>
            <div className="flex items-center justify-between px-4 lg:px-6 py-3 gap-4">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t("common.openMenu")}
                      onClick={handleMobileMenuToggle}
                      className="desk:hidden p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
                      <Menu size={20} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    {t("page.cashier.menu")}
                  </TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 flex items-center justify-center">
                    <Package className="text-primary-foreground" size={18} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold leading-tight text-foreground">{storeName}</h1>
                    <p className="text-xs text-muted-foreground/80">{userName}</p>
                  </div>
                </div>
                {/* <StoreSelector cookie={cookie} setCookie={setCookie} /> */}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {storeParam && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isOpeningBoard}
                        className="relative rounded-xl border-border/60 bg-card/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all px-4 lg:px-6 hidden sm:inline-flex group"
                        onClick={() => openBoardTab(store)}>
                        {isOpeningBoard ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <MonitorPlay
                            size={16}
                            className="transition-transform duration-200 group-hover:scale-110"
                          />
                        )}
                        <span className="hidden lg:inline">
                          {t("page.cashier.openCustomerDisplay")}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                      {t("page.cashier.openCustomerDisplay")}
                    </TooltipContent>
                  </Tooltip>
                )}
                {canManageTables && cashierTables.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative rounded-xl border-border/60 bg-card/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
                        data-shortcut="tables"
                        aria-keyshortcuts="F9"
                        onClick={() => setShowTables(true)}>
                        <Armchair size={16} />
                        <span className="hidden lg:inline">{t("page.cashier.tables.button")}</span>
                        {tablesNotAvailable > 0 && (
                          <span
                            data-testid="tables-not-available-badge"
                            className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                            {tablesNotAvailable}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                      {t("page.cashier.tables.buttonTooltip")}
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t("header.toggleTheme")}
                      onClick={toggleTheme}
                      className="p-1.5 sm:p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
                      <Sun size={16} className="hidden dark:block sm:size-[18px]" />
                      <Moon size={16} className="block dark:hidden sm:size-[18px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    {t("page.cashier.toggleTheme")}
                  </TooltipContent>
                </Tooltip>
                <NotificationBell />
                <UserDropdown />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="xl:hidden relative rounded-xl border-border/60"
                      onClick={() => setShowCartMobile(!showCartMobile)}>
                      <ShoppingCart size={18} />
                      {totalItems > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                          {totalItems}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" align="center">
                    {t("page.cashier.cart", { count: totalItems })}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {!store && noStoreYet ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-xl">
                <NoStore />
              </div>
            </div>
          ) : !store ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center w-full">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Store size={40} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {t("page.cashier.storeName")}
                </h2>
                <p className="text-muted-foreground mb-8">
                  {t("page.table.form.storePlaceholder")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {locsLoading
                    ? [0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card ${
                            i === 1 ? "hidden sm:flex" : i >= 2 ? "hidden lg:flex" : ""
                          }`}>
                          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <Skeleton className="h-5 w-5/6" />
                            <Skeleton className="h-4 w-4/6" />
                          </div>
                          <Skeleton className="w-5 h-5 shrink-0" />
                        </div>
                      ))
                    : locationList.map((loc) => (
                        <button
                          type="button"
                          key={loc.id}
                          onClick={() => setScreenModeStore(loc)}
                          className="flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all text-left group">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15">
                            <Store size={24} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{loc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {t("page.table.form.storePlaceholder")}
                            </p>
                          </div>
                          <ChevronRight
                            size={20}
                            className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                          />
                        </button>
                      ))}
                </div>
              </div>
            </div>
          ) : isError ? (
            <div className="flex-1 flex items-center justify-center">
              <AbortController refetch={refetch} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <OrderQueue
                store={store}
                onLoadOrder={requestLoadOrder}
                onCollectPayment={setCollectPaymentOrder}
                canVoid={canVoidOrders}
              />
              <ParkedCartPanel
                store={store}
                onResumed={handleResumeParkedCart}
                hasCartItems={cartOrder.length > 0}
              />
              <ProductGrid
                products={filteredProducts}
                allProducts={allProducts}
                refocusSignal={refocusSignal}
                isLoading={isLoading}
                search={search}
                onSearchChange={setSearch}
                barcode={barcode}
                onBarcodeChange={setBarcode}
                categoryId={categoryId}
                onCategoryChange={setCategoryId}
                store={store}
                storeName={storeName}
                onRemoteBarcodeLookup={lookupProductRemote}
                recipeAvailability={recipeAvailability}
                onAddProduct={canAddProduct ? () => navigate("/add-product") : undefined}
              />
            </div>
          )}

          {/* Mobile cart overlay */}
          {showCartMobile && (
            <div className="fixed inset-0 z-50 xl:hidden">
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowCartMobile(false)}
              />
              <div className="fixed right-0 top-0 bottom-0 w-[88vw] sm:max-w-md bg-card/95 backdrop-blur-xl border-l border-border/50 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
                  <h2 className="font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {t("page.cashier.orderCount", { count: totalItems })}
                  </h2>
                  <button
                    type="button"
                    aria-label={t("common.close")}
                    onClick={() => setShowCartMobile(false)}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <CartPanel
                  items={cartOrder}
                  subtotal={subtotal}
                  taxRate={taxRate}
                  taxAmount={taxAmount}
                  taxUnavailable={taxUnavailable}
                  onRetryTax={refetchTaxRate}
                  onIncrement={orderList.getState().incrementOrder}
                  onDecrement={orderList.getState().decrementOrder}
                  onDelete={orderList.getState().handleDeleteOrder}
                  onCheckout={() => setCheckoutOpen(true)}
                  onClearCart={() => setClearCartOpen(true)}
                  onParkCart={() => setParkCartOpen(true)}
                  isParkingCart={parkMutation.isLoading}
                  totalItems={totalItems}
                  onUpdatePrice={(item, newPrice) =>
                    orderList.getState().updateItemPrice(item, newPrice)
                  }
                  canEditPrice={canOverridePrice}
                  isLoading={taxLoading}
                />
              </div>
            </div>
          )}

          {/* Desktop cart sidebar */}
          {store && (
            <div
              className={`hidden lg:flex shrink-0 h-full border-l border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 relative ${
                cartExpanded ? "lg:w-[380px] xl:w-[420px]" : "lg:w-14"
              }`}>
              {/* Toggle button */}
              <button
                type="button"
                onClick={() => setCartExpanded(!cartExpanded)}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 flex items-center justify-center rounded-l-lg bg-card border border-border/50 border-r-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title={
                  cartExpanded ? t("page.cashier.ui.collapseCart") : t("page.cashier.ui.expandCart")
                }>
                {cartExpanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
              <CartPanel
                items={cartOrder}
                subtotal={subtotal}
                taxRate={taxRate}
                taxAmount={taxAmount}
                taxUnavailable={taxUnavailable}
                onRetryTax={refetchTaxRate}
                onIncrement={orderList.getState().incrementOrder}
                onDecrement={orderList.getState().decrementOrder}
                onDelete={orderList.getState().handleDeleteOrder}
                onCheckout={() => setCheckoutOpen(true)}
                onClearCart={() => setClearCartOpen(true)}
                onParkCart={() => setParkCartOpen(true)}
                isParkingCart={parkMutation.isLoading}
                totalItems={totalItems}
                onUpdatePrice={(item, newPrice) =>
                  orderList.getState().updateItemPrice(item, newPrice)
                }
                canEditPrice={canOverridePrice}
                isLoading={taxLoading}
                expanded={cartExpanded}
              />
            </div>
          )}
        </div>

        {checkoutOpen && (
          <CheckoutModal
            onClose={() => setCheckoutOpen(false)}
            items={cartOrder}
            subtotal={subtotal}
            taxRate={taxRate}
            store={store}
            cashierName={userName}
            cashierId={user?.id || user?.ID}
            onTableChange={setSelectedTable}
            onComplete={handleCheckoutComplete}
            onApplyServerPrices={orderList.getState().applyServerPrices}
          />
        )}

        {receiptData && (
          <ReceiptModal
            data={receiptData}
            onClose={() => setReceiptData(null)}
            onNewTransaction={handleNewTransaction}
          />
        )}

        {/* F4-01: settles an EXISTING order (e.g. a QR order from the queue
            above) in place — never creates a new order via CheckoutModal. */}
        {showTables && store && (
          <CashierTablePanel store={store} onClose={() => setShowTables(false)} />
        )}
        <ScreenModeDialog
          store={screenModeStore}
          onClose={() => setScreenModeStore(null)}
          onChoose={handleScreenMode}
        />
        {store && ["kasir", "admin", "super_admin"].includes(role) && (
          <IncomingQrOrderAlert
            store={store}
            actor={{ id: user?.id, name: user?.fullName || user?.userName }}
          />
        )}
        {collectPaymentOrder && (
          <CollectPaymentModal
            order={collectPaymentOrder}
            store={store}
            onClose={() => setCollectPaymentOrder(null)}
            onOpenReceipt={setReceiptData}
          />
        )}

        {/* Load Order Confirmation — only shown when the active cart already has items */}
        <Dialog
          open={!!pendingLoadOrder}
          onOpenChange={(open) => !open && setPendingLoadOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("page.cashier.loadOrderConfirmTitle")}</DialogTitle>
              <DialogDescription>{t("page.cashier.loadOrderConfirmDesc")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="danger" onClick={() => setPendingLoadOrder(null)}>
                {t("page.cashier.cancel")}
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  handleLoadOrder(pendingLoadOrder);
                  setPendingLoadOrder(null);
                }}>
                {t("page.cashier.loadOrderConfirmButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Cart Confirmation */}
        <Dialog open={clearCartOpen} onOpenChange={setClearCartOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("page.cashier.clearCart")}</DialogTitle>
              <DialogDescription>{t("page.cashier.clearCartDesc")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="danger" onClick={() => setClearCartOpen(false)}>
                {t("page.cashier.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  orderList.getState().resetOrder();
                  setClearCartOpen(false);
                  toast.info(t("page.cashier.cartCleared"));
                }}>
                {t("page.cashier.clear")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Park Cart Confirmation */}
        <Dialog open={parkCartOpen} onOpenChange={setParkCartOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("page.cashier.parkedCart.parkTitle", "Park this cart?")}</DialogTitle>
              <DialogDescription>
                {t(
                  "page.cashier.parkedCart.parkDesc",
                  "The cart will be saved and can be resumed from any terminal in this store."
                )}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              unstyled
              value={parkNotes}
              onChange={(e) => setParkNotes(e.target.value)}
              placeholder={t("page.cashier.parkedCart.notesPlaceholder", "Notes (optional)")}
              className="w-full min-h-[80px] rounded-lg border border-border/60 bg-transparent p-2 text-sm outline-none focus:border-primary/50"
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
            <DialogFooter>
              <Button variant="danger" onClick={() => setParkCartOpen(false)}>
                {t("page.cashier.cancel")}
              </Button>
              <Button variant="success" disabled={parkMutation.isLoading} onClick={handleParkCart}>
                {parkMutation.isLoading
                  ? t("page.cashier.parkedCart.parking", "Parking...")
                  : t("page.cashier.parkedCart.parkAction", "Park Cart")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Onboarding Welcome Modal */}
        <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                🎉 {t("page.cashier.welcome")}
              </DialogTitle>
              <DialogDescription className="text-center">
                {t("page.cashier.welcomeDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShoppingCart size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t("page.cashier.tourCart")}</p>
                  <p className="text-xs text-muted-foreground">{t("page.cashier.tourCartDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t("page.cashier.tourProducts")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("page.cashier.tourProductsDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Store size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t("page.cashier.tourCheckout")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("page.cashier.tourCheckoutDesc")}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleCompleteOnboarding}>
                {t("page.cashier.startUsing")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CashierPage;

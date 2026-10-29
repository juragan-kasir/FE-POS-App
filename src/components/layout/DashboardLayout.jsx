import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useCookies } from "react-cookie";
import { useLocation, Outlet } from "react-router-dom";
export const SidebarContext = createContext(false);
export const useSidebar = () => useContext(SidebarContext);
import { useTranslation } from "react-i18next";
import Sidebar from "./Sidebar";
import Header from "./Header";
import CommandPalette from "./CommandPalette";
import { TipsCard } from "@/components/ui/tips-card";
import FloatingTourButton from "@/components/organism/FloatingTourButton";
import { OfflineBanner } from "@/components/ui/OfflineIndicator";
import { useStore } from "@/contexts/StoreContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useLocations } from "@/queries/useLocations";
import { useUserSession } from "@/hooks/useUserSession";
import { AccessDenied } from "@/components/ui/RequireRole";
import { canOpenPage } from "@/utils/pageAccess";

const tipsKeys = {
  "/product-list": ["tips.product", "tips.product2", "tips.product3"],
  "/add-product": ["tips.product", "tips.product2", "tips.product3"],
  "/edit-product": ["tips.product", "tips.product2", "tips.product3"],
  "/category-list": ["tips.category", "tips.category2"],
  "/supplier": ["tips.supplier", "tips.supplier2"],
  "/member-list": ["tips.member", "tips.member2"],
  "/member-tier": ["tips.memberTier", "tips.memberTier2"],
  "/discount-list": ["tips.discount", "tips.discount2"],
  "/type-payment-list": ["tips.payment", "tips.payment2"],
  "/shift-list": ["tips.shift", "tips.shift2"],
  "/purchase-order": ["tips.purchaseOrder", "tips.purchaseOrder2"],
  "/stock-opname": ["tips.stockOpname", "tips.stockOpname2"],
  "/stock-history": ["tips.stockHistory", "tips.stockHistory2"],
  "/low-stock": ["tips.lowStock", "tips.lowStock2"],
  "/expense-category": ["tips.expense", "tips.expense2"],
  "/expense": ["tips.expense", "tips.expense2"],
  "/employee-list": ["tips.employee", "tips.employee2"],
  "/department-list": ["tips.department", "tips.department2"],
  "/position-list": ["tips.position", "tips.position2"],
  "/table-list": ["tips.table"],
  "/tax-list": ["tips.tax", "tips.tax2"],
  "/location-list": ["tips.location", "tips.location2"],
  "/user-list": ["tips.user", "tips.user2"],
  "/add-user": ["tips.user", "tips.user2"],
  "/report/sales": ["tips.report", "tips.report2"],
  "/best-selling": ["tips.report", "tips.report2"],
  "/report/daily": ["tips.report", "tips.report2"],
  "/report/cash-flow": ["tips.report", "tips.report2"],
  "/report/settings": ["tips.reportSettings", "tips.reportSettings2"],
  "/invoice-page": ["tips.invoice", "tips.invoice2", "tips.invoice3"],
  "/cashier": ["tips.cashier", "tips.cashier2", "tips.cashier3"],
  "/dashboard": ["tips.dashboard", "tips.dashboard2"],

  "/add-category": ["tips.category", "tips.category2"],
  "/edit-category": ["tips.category", "tips.category2"],
  "/detail-category": ["tips.category", "tips.category2"],

  "/add-supplier": ["tips.supplier", "tips.supplier2"],
  "/edit-supplier": ["tips.supplier", "tips.supplier2"],

  "/add-member": ["tips.member", "tips.member2"],
  "/edit-member": ["tips.member", "tips.member2"],
  "/add-member-tier": ["tips.memberTier", "tips.memberTier2"],
  "/detail-member-tier": ["tips.memberTier", "tips.memberTier2"],

  "/add-discount": ["tips.discount", "tips.discount2"],
  "/edit-discount": ["tips.discount", "tips.discount2"],
  "/detail-discount": ["tips.discount", "tips.discount2"],

  "/add-type-payment": ["tips.payment", "tips.payment2"],
  "/edit-type-payment": ["tips.payment", "tips.payment2"],

  "/add-shift": ["tips.shift", "tips.shift2"],
  "/edit-shift": ["tips.shift", "tips.shift2"],

  "/add-location": ["tips.location", "tips.location2"],
  "/edit-location": ["tips.location", "tips.location2"],
  "/detail-location": ["tips.location", "tips.location2"],
  "/store-geospatial": ["tips.location", "tips.location2"],

  "/add-tax": ["tips.tax", "tips.tax2"],
  "/edit-tax": ["tips.tax", "tips.tax2"],

  "/add-position": ["tips.position", "tips.position2"],
  "/edit-position": ["tips.position", "tips.position2"],
  "/detail-position": ["tips.position", "tips.position2"],

  "/add-department": ["tips.department", "tips.department2"],
  "/edit-department": ["tips.department", "tips.department2"],
  "/detail-department": ["tips.department", "tips.department2"],

  "/add-employee": ["tips.employee", "tips.employee2"],
  "/edit-employee": ["tips.employee", "tips.employee2"],
  "/detail-employee": ["tips.employee", "tips.employee2"],

  "/add-purchase-order": ["tips.purchaseOrder", "tips.purchaseOrder2"],

  "/add-expense-category": ["tips.expense", "tips.expense2"],
  "/edit-expense-category": ["tips.expense", "tips.expense2"],
  "/add-expense": ["tips.expense", "tips.expense2"],
  "/edit-expense": ["tips.expense", "tips.expense2"],

  "/add-stock-opname": ["tips.stockOpname", "tips.stockOpname2"],

  "/production-order": ["tips.productionOrder", "tips.productionOrder2"],
  "/add-production-order": ["tips.productionOrder", "tips.productionOrder2"],

  "/goods-receipt": ["tips.goodsReceipt", "tips.goodsReceipt2"],
  "/add-goods-receipt": ["tips.goodsReceipt", "tips.goodsReceipt2"],

  "/accounts-receivable": ["tips.accountReceivable", "tips.accountReceivable2"],

  "/ingredient": ["tips.ingredient", "tips.ingredient2", "tips.ingredient3"],

  "/qr-order-management": [
    "tips.qrOrderManagement",
    "tips.qrOrderManagement2",
    "tips.qrOrderManagement3"
  ],

  "/purchase-payment": ["tips.purchasePayment", "tips.purchasePayment2", "tips.purchasePayment3"],

  "/stock-adjustment": ["tips.stockAdjustment", "tips.stockAdjustment2", "tips.stockAdjustment3"],

  "/ingredient-category": ["tips.ingredient", "tips.ingredient2", "tips.ingredient3"],

  "/ap-dashboard": ["tips.apDashboard", "tips.apDashboard2", "tips.apDashboard3"],

  "/sales-return": ["tips.salesReturn", "tips.salesReturn2"],
  "/purchase-return": ["tips.purchaseReturn", "tips.purchaseReturn2"],

  "/stock-transfer": ["tips.stockTransfer", "tips.stockTransfer2"],
  "/add-stock-transfer": ["tips.stockTransfer", "tips.stockTransfer2"],

  "/cash-register": ["tips.cashRegister", "tips.cashRegister2"],

  "/price-list-template": ["tips.priceStore", "tips.priceStore2"],

  "/bom": ["tips.bom", "tips.bom2"],

  "/reservation": ["tips.reservation", "tips.reservation2"],
  "/add-reservation": ["tips.reservation", "tips.reservation2"],
  "/edit-reservation": ["tips.reservation", "tips.reservation2"],

  "/kitchen-display": ["tips.kitchenDisplay", "tips.kitchenDisplay2"],

  "/notification": ["tips.notification", "tips.notification2"],
  "/support": ["tips.support"],
  "/profile": ["tips.profile"],

  "/role-management": ["tips.role", "tips.role2"],
  "/add-role": ["tips.role", "tips.role2"],
  "/edit-role": ["tips.role", "tips.role2"],
  "/detail-role": ["tips.role", "tips.role2"],

  "/delivery-orders": ["tips.deliveryOrders", "tips.deliveryOrders2"],
  "/detail-delivery-order": ["tips.deliveryOrderDetail", "tips.deliveryOrderDetail2"],
  "/driver-list": ["tips.driver", "tips.driver2"],
  "/add-driver": ["tips.driver", "tips.driver2"],
  "/edit-driver": ["tips.driver", "tips.driver2"],
  "/detail-driver": ["tips.driver", "tips.driver2"],

  "/queue-list": ["tips.queue", "tips.queue2"],
  "/supplier-score-list": ["tips.supplierPerformance", "tips.supplierPerformance2"],
  "/detail-supplier-score": ["tips.supplierPerformance", "tips.supplierPerformance2"],
  "/promo-list": ["tips.promo", "tips.promo2"],
  "/add-promo": ["tips.promo", "tips.promo2"],
  "/edit-promo": ["tips.promo", "tips.promo2"],
  "/detail-promo": ["tips.promo", "tips.promo2"],

  "/home": ["tips.cashier", "tips.cashier2", "tips.cashier3"],
  "/customer-display": ["tips.cashier", "tips.cashier2", "tips.cashier3"],
  "/customer-display-board": ["tips.cashier", "tips.cashier2", "tips.cashier3"],

  "/product": ["tips.product", "tips.product2", "tips.product3"],
  "/detail-product": ["tips.product", "tips.product2", "tips.product3"],

  "/add-ingredient": ["tips.ingredient", "tips.ingredient2", "tips.ingredient3"],
  "/edit-ingredient": ["tips.ingredient", "tips.ingredient2", "tips.ingredient3"],
  "/detail-ingredient": ["tips.ingredient", "tips.ingredient2", "tips.ingredient3"],
  "/add-ingredient-category": ["tips.ingredient", "tips.ingredient2", "tips.ingredient3"],
  "/edit-ingredient-category": ["tips.ingredient", "tips.ingredient2", "tips.ingredient3"],
  "/detail-ingredient-category": ["tips.ingredient", "tips.ingredient2", "tips.ingredient3"],

  "/goods-request": ["tips.goodsRequest", "tips.goodsRequest2"],
  "/add-goods-request": ["tips.goodsRequest", "tips.goodsRequest2"],
  "/edit-goods-request": ["tips.goodsRequest", "tips.goodsRequest2"],
  "/edit-goods-receipt": ["tips.goodsReceipt", "tips.goodsReceipt2"],

  "/detail-supplier": ["tips.supplier", "tips.supplier2"],
  "/detail-supplier-category": ["tips.supplier", "tips.supplier2"],
  "/detail-member": ["tips.member", "tips.member2"],
  "/member-loyalty": ["tips.member", "tips.member2"],
  "/member-point-history": ["tips.member", "tips.member2"],

  "/detail-expense": ["tips.expense", "tips.expense2"],
  "/detail-expense-category": ["tips.expense", "tips.expense2"],
  "/detail-shift": ["tips.shift", "tips.shift2"],
  "/detail-shift-template": ["tips.shift", "tips.shift2"],
  "/shift-template-list": ["tips.shift", "tips.shift2"],
  "/detail-table": ["tips.table"],
  "/detail-tax": ["tips.tax", "tips.tax2"],
  "/detail-type-payment": ["tips.payment", "tips.payment2"],
  "/edit-purchase-order": ["tips.purchaseOrder", "tips.purchaseOrder2"],

  "/advanced-reporting": ["tips.report", "tips.report2"],
  "/report/profit-per-product": ["tips.report", "tips.report2"],
  "/accounting": ["tips.report", "tips.report2"],
  "/ar-payment": ["tips.accountReceivable", "tips.accountReceivable2"],

  "/audit-log": ["tips.auditLog", "tips.auditLog2"],
  "/backup": ["tips.backup", "tips.backup2"],
  "/bundle": ["tips.bundle", "tips.bundle2"],
  "/stock-forecast": ["tips.stockForecast", "tips.stockForecast2"],
  "/thermal-printer": ["tips.thermalPrinter", "tips.thermalPrinter2"],
  "/waiter-request": ["tips.waiter", "tips.waiter2"],
  "/my-shift": ["tips.myShift", "tips.myShift2"]
};

const DashboardLayout = () => {
  const { t } = useTranslation();
  // ponytail: dua fase untuk animasi buka/tutup drawer —
  // mounted = render di DOM, open = trigger transisi transform/opacity
  const [mobileSidebarMounted, setMobileSidebarMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [cookie] = useCookies();
  const location = useLocation();
  // The full session user (cookie copy has accessMenu stripped), as the Sidebar reads it.
  const sessionUser = useUserSession();
  const { activeStoreId, setActiveStore } = useStore();

  const user = cookie?.user;
  const role = user?.roleType || "";

  const { data: locationsData } = useLocations("active", { enabled: !activeStoreId });
  const locations = locationsData?.data || [];

  // A store-bound user lands on a store. A super_admin keeps "Semua Toko"
  // when there are several stores, but with exactly one store there is
  // nothing to choose, so that store becomes active (no "pilih toko" gates).
  useEffect(() => {
    if (!locations.length || activeStoreId) return;
    if (role === "super_admin" && locations.length !== 1) return;
    const first = locations[0];
    const firstId = first.id || first._id;
    const firstName = first.name || first.storeName || "";
    setActiveStore(firstId, firstName);
  }, [locations, activeStoreId, role, setActiveStore]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT" ||
        e.target.isContentEditable
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ponytail: drawer mobile harus tertutup saat ESC dan saat pindah halaman,
  // karena prop onToggle di Sidebar tidak pernah dipanggil saat navigasi
  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileSidebarOpen]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // ponytail: unmount setelah animasi keluar selesai (durasi harus cocok
  // dengan duration-300 pada backdrop & drawer)
  useEffect(() => {
    if (mobileSidebarOpen || !mobileSidebarMounted) return undefined;
    const timer = setTimeout(() => setMobileSidebarMounted(false), 300);
    return () => clearTimeout(timer);
  }, [mobileSidebarOpen, mobileSidebarMounted]);

  useBodyScrollLock(mobileSidebarMounted || isPaletteOpen);

  const handleMobileMenuToggle = useCallback(() => {
    if (mobileSidebarOpen) {
      setMobileSidebarOpen(false);
      return;
    }
    setMobileSidebarMounted(true);
    // double rAF: pastikan frame pertama ter-render dengan posisi awal
    // (-translate-x-full) agar transisi slide benar-benar berjalan
    requestAnimationFrame(() => requestAnimationFrame(() => setMobileSidebarOpen(true)));
  }, [mobileSidebarOpen]);

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  const handleSidebarHoverChange = useCallback((collapsed) => setSidebarCollapsed(collapsed), []);

  const currentPath = location.pathname;
  const matchedKeys = Object.entries(tipsKeys).find(([path]) => currentPath.startsWith(path));
  const tips = matchedKeys?.[1]?.map((key) => t(key));

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden desk:block">
        <Sidebar collapsed={sidebarCollapsed} onHoverChange={handleSidebarHoverChange} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarMounted && (
        <div className="fixed inset-0 z-50 desk:hidden">
          <div
            aria-hidden="true"
            onClick={closeMobileSidebar}
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out
              ${mobileSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("sidebar.menu", { defaultValue: "Menu" })}
            className={`fixed left-0 top-0 h-screen w-[50vw]
              transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            {/* ponytail: wrapper hanya selebar drawer (bukan inset-0) agar
                tap di luar tetap jatuh ke backdrop dan drawer bisa ditutup
                di iPad. Aside di dalamnya sudah position:fixed & w-[50vw]. */}
            <Sidebar collapsed={false} expandWidthClass="w-[50vw]" onToggle={closeMobileSidebar} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        style={{ willChange: "margin-left" }}
        className={`transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarCollapsed ? "desk:ml-16" : "desk:ml-64"
        }`}>
        <Header
          onMenuToggle={handleMobileMenuToggle}
          onOpenPalette={() => setIsPaletteOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="pt-16 lg:pt-20 lg:pb-6 p-4 lg:p-6">
          <SidebarContext.Provider value={sidebarCollapsed}>
            <div
              key={location.pathname}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {canOpenPage(sessionUser, location.pathname) ? <Outlet /> : <AccessDenied />}
            </div>
          </SidebarContext.Provider>
          {tips && (
            <div className="mt-6">
              <TipsCard
                title={t("common.tips")}
                variant="default"
                tips={tips}
                dismissKey={location.pathname}
              />
            </div>
          )}
        </main>
      </div>

      {/* Command Palette - above everything */}
      <CommandPalette open={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* Floating Tour Button - super_admin only */}
      <FloatingTourButton />

      {/* Offline Indicator & Banner */}
      <OfflineBanner />
    </div>
  );
};

export default DashboardLayout;

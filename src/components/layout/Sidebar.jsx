/* eslint-disable no-unused-vars */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  LifeBuoy,
  Crown,
  Calculator,
  ChefHat,
  MoreHorizontal,
  DollarSign,
  FileText,
  QrCode,
  X
} from "lucide-react";
import {
  sidebarMenuSuperAdmin,
  sidebarMenuAdmin,
  sidebarMenuCashier,
  sidebarMenuUser,
  navCategories
} from "@/utils/sidebar-menu";
import {
  filterMenuByPermission,
  filterNavCategoriesByPermission,
  hasMenuAccess
} from "@/utils/permission";
import {
  bypassesMenuPermissions,
  isAdminRole,
  isCashierRole,
  isSuperAdminRole
} from "@/utils/role";
import { useUserSession } from "@/hooks/useUserSession";
import { useStoreManagePermission } from "@/hooks/useStoreManagePermission";
import { useTenantManagePermission } from "@/hooks/useTenantManagePermission";
import { canOpenMenu } from "@/utils/pageAccess";
import { canonicalLocationNavItems, withCanonicalLocationItems } from "@/lib/canonical-nav";
import { endSession, SESSION_END_REASON } from "@/services/session";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import NavigationModal from "./NavigationModal";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import logoImg from "@/assets/logo-sidebar.png";

// ponytail: untuk user yang menu-nya dikontrol accessMenu, navigasi memakai
// cabang kategori + popup yang sama dengan super_admin (difilter accessMenu,
// lihat categories/menuItems di bawah). Daftar POS di bawah juga difilter
// supaya item tanpa akses (mis. KDS, QR) tidak bocor ke user terbatas.

const Sidebar = ({ collapsed = true, expandWidthClass = "w-64", onToggle, onHoverChange }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const [isHovered, setIsHovered] = useState(false);

  const [logoutModal, setLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const user = useUserSession();
  const { canManageStores } = useStoreManagePermission();
  const { canAdministerTenants } = useTenantManagePermission();

  const hasAccessMenu =
    user?.accessMenu && Array.isArray(user.accessMenu) && user.accessMenu.length > 0;
  // ponytail: user non-super_admin yang memiliki accessMenu wajib mengikuti
  // daftar menu persis sesuai accessMenu (tanpa item/bagian tambahan). A
  // menu-scoped super_admin (own accessMenu, BE accessMenuScoped) is too.
  const isMenuControlled = hasAccessMenu && !bypassesMenuPermissions(user);

  const baseMenu = useMemo(() => {
    if (hasAccessMenu || isSuperAdminRole(user)) return sidebarMenuSuperAdmin;
    if (isAdminRole(user)) return sidebarMenuAdmin;
    if (isCashierRole(user)) return sidebarMenuCashier;
    return sidebarMenuUser;
  }, [hasAccessMenu, user]);

  const menuItems = useMemo(() => filterMenuByPermission(baseMenu, user), [baseMenu, user]);

  const categories = useMemo(() => {
    const raw = hasAccessMenu || isSuperAdminRole(user) ? navCategories.super_admin || [] : [];
    let base = raw;
    if (isMenuControlled)
      base = filterNavCategoriesByPermission(raw, user, (href) => canOpenMenu(user, href));
    else if (isSuperAdminRole(user)) base = raw;
    else if (isAdminRole(user)) base = navCategories.admin || [];
    // Tenant and Store Configuration sit in the Location category, gated by
    // the canonical permissions (independent of roleType/accessMenu).
    return withCanonicalLocationItems(base, { canAdministerTenants, canManageStores });
  }, [hasAccessMenu, isMenuControlled, user, canAdministerTenants, canManageStores]);

  const directItems = useMemo(() => {
    const items = [];
    menuItems.forEach((item) => {
      if (item.section) return;
      if (item.children && item.children.length > 1) return;

      const target = item.children?.length === 1 ? item.children[0] : item;
      if (!target?.href) return;

      if (isCashierRole(user)) {
        items.push({
          title: target.title,
          i18nKey: target.i18nKey,
          href: target.href,
          icon: target.icon || item.icon
        });
      } else if (target.href === "/home" || target.href?.startsWith("/dashboard")) {
        items.push({
          title: target.title,
          i18nKey: target.i18nKey,
          href: target.href,
          icon: target.icon || item.icon
        });
      }
    });
    return items;
  }, [menuItems, user]);

  const handleOpenCategory = useCallback(
    (catId) => {
      const cat = categories.find((c) => c.id === catId);
      if (cat) {
        setActiveCategory(cat);
        setNavModalOpen(true);
      }
    },
    [categories]
  );

  const handleNavigate = useCallback(
    (href) => {
      if (!href) return;
      navigate(href);
    },
    [navigate]
  );

  const handleSupportClick = useCallback(() => {
    navigate("/support");
  }, [navigate]);

  // The session boundary revokes, clears (cart included — a shared POS
  // terminal must not hand the next cashier an unpaid cart) and reloads to
  // the login page, which shows the logout confirmation.
  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await endSession({ reason: SESSION_END_REASON.LOGOUT, revoke: true });
  };

  const handleLogout = () => setLogoutModal(true);

  const isActive = (href) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const DashboardIcon = isSuperAdminRole(user) ? Crown : Crown;

  // ponytail: collapsed=false (drawer iPad/mobile) berarti auto terbuka penuh
  // tanpa bergantung hover; desktop tetap rail collapse + hover-expand.
  // expandWidthClass mengatur lebar saat expanded (drawer mobile = w-[68vw]).
  const isExpanded = !collapsed || isHovered;

  const asideRef = useRef(null);

  // ponytail: modal yang ditutup via ESC/backdrop tidak memicu mouseleave pada
  // <aside>, sehingga state hover bisa "nyangkut" terbuka. Sinkronkan selalu
  // dengan realitas DOM (:hover) setelah event yang berpotensi mendesinkronkan.
  const syncHoverState = useCallback(() => {
    const hovered = asideRef.current?.matches(":hover") ?? false;
    setIsHovered(hovered);
    onHoverChange?.(!hovered);
  }, [onHoverChange]);

  useEffect(() => {
    const onKeyUp = (e) => {
      if (e.key === "Escape") setTimeout(syncHoverState, 0);
    };
    const onWindowBlur = () => {
      setIsHovered(false);
      onHoverChange?.(true);
    };
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [syncHoverState]);

  // ponytail: re-check juga saat modal internal sidebar (navigasi/logout) tertutup
  useEffect(() => {
    if (navModalOpen || logoutModal) return undefined;
    const id = setTimeout(syncHoverState, 0);
    return () => clearTimeout(id);
  }, [navModalOpen, logoutModal, syncHoverState]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHoverChange?.(false);
  }, [onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHoverChange?.(true);
  }, [onHoverChange]);

  const posItems = useMemo(
    () => [
      { title: "POS", i18nKey: "sidebar.cashier", href: "/home", icon: Calculator },
      {
        title: "Cash Register",
        i18nKey: "sidebar.cashRegister",
        href: "/cash-register/current",
        icon: DollarSign,
        // ponytail: regex literal yang dikompilasi statis — menghindari
        // new RegExp dinamis (ReDoS sink Codacy)
        activeRegex: /^\/cash-register\/(current|history)$/
      },
      {
        title: "Laporan X/Z",
        i18nKey: "sidebar.xzReport",
        href: "/cash-register/xz-report",
        icon: FileText
      },
      { title: "KDS", i18nKey: "sidebar.kitchenDisplay", href: "/kitchen-display", icon: ChefHat },
      {
        title: "QR Orders",
        i18nKey: "sidebar.qrOrders",
        href: "/qr-order-management",
        icon: QrCode
      }
    ],
    []
  );

  // ponytail: posItems hardcoded — untuk user menu-controlled wajib difilter
  // accessMenu supaya item tanpa akses (mis. KDS, QR Orders) tidak bocor.
  const visiblePosItems = useMemo(() => {
    if (!isMenuControlled) return posItems;
    return posItems.filter((item) => hasMenuAccess(user, item.href, ["view"]));
  }, [isMenuControlled, posItems, user]);

  // ponytail: tombol kategori ikut "hidup" saat halaman aktif berada di
  // dalamnya — cek href, activePaths, dan activeRegex tiap item.
  const isCategoryActive = useCallback(
    (cat) => {
      const items = [];
      (cat.sections || []).forEach((section) => {
        (section.items || []).forEach((item) => items.push(item));
      });
      return items.some((item) => {
        if (!item.href) return false;
        if (isActive(item.href)) return true;
        if (
          Array.isArray(item.activePaths) &&
          item.activePaths.some(
            (p) => location.pathname === p || location.pathname.startsWith(p + "/")
          )
        )
          return true;
        if (item.activeRegex instanceof RegExp) return item.activeRegex.test(location.pathname);
        return false;
      });
    },
    [location.pathname]
  );

  const renderNavButton = (item, icon, extraClass = "") => {
    const Icon = icon;
    // ponytail: activeRegex adalah literal statis dari config posItems,
    // bukan string dinamis — aman dari ReDoS/injection
    const active = item.activeRegex
      ? item.activeRegex.test(location.pathname)
      : isActive(item.href);
    const btn = (
      <button
        type="button"
        onClick={() => handleNavigate(item.href)}
        className={`nav-btn group relative flex items-center gap-3 rounded-xl overflow-hidden
          h-10 px-3
          ${extraClass}
          ${
            active
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
              : "text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm"
          }`}>
        <Icon
          size={20}
          className="shrink-0 transition-transform duration-150 group-hover:scale-110"
        />
        <span
          className={`nav-label text-sm font-medium whitespace-nowrap transition-[opacity,transform] duration-200 ease-out
            ${isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"}`}>
          {t(item.i18nKey) || item.title}
        </span>
      </button>
    );

    if (isExpanded) return <div key={item.href}>{btn}</div>;
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="font-medium">
          {t(item.i18nKey) || item.title}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        ref={asideRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ willChange: "width" }}
        className={`fixed left-0 top-0 h-screen z-50 bg-card border-r border-border/50
          flex flex-col py-4
          transition-[width,padding,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${
            isExpanded
              ? `${expandWidthClass} px-3 shadow-xl shadow-black/5`
              : "w-16 px-1.5 shadow-sm"
          }`}>
        {isLoggingOut && (
          <Loading fullscreen size="lg" label={t("header.loggingOut") || "Logging out..."} />
        )}

        {/* Brand */}
        <div
          className={`mb-5 flex items-center overflow-hidden
            ${isExpanded ? "gap-3 px-1" : "justify-center px-1"}`}>
          <div className="w-9 h-9 shrink-0">
            <img src={logoImg} alt="Juragan Kasir" className="w-full h-full object-contain" />
          </div>
          <span
            className={`text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden
              transition-[opacity,transform,max-width] duration-200 ease-out
              ${
                isExpanded
                  ? "opacity-100 translate-x-0 max-w-[160px]"
                  : "opacity-0 -translate-x-2 pointer-events-none max-w-0"
              }`}>
            {t("sidebar.brandName") || "Brand"}
          </span>
          {!collapsed && onToggle && (
            // ponytail: tombol tutup khusus drawer (iPad/mobile) — di desktop
            // collapsed tetap true sehingga tombol ini tidak pernah muncul
            <button
              type="button"
              onClick={onToggle}
              aria-label={t("common.close", { defaultValue: "Tutup" })}
              className="ml-auto shrink-0 p-2 -mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-0.5 w-full overflow-y-auto overflow-x-hidden">
          {/* ponytail: satu cabang navigasi untuk semua role — user
              menu-controlled memakai tombol kategori + popup yang sama,
              hanya isinya yang difilter accessMenu (categories/menuItems/
              visiblePosItems di atas). */}
          <>
            {/* Dashboard - always direct navigate */}
            {directItems
              .filter((item) => item.href?.startsWith("/dashboard"))
              .map((item) => renderNavButton(item, DashboardIcon))}

            {/* Kasir - for non-cashier roles */}
            {!isCashierRole(user) &&
              directItems
                .filter((item) => item.href === "/home")
                .map((item) => renderNavButton(item, Calculator))}

            {/* Cashier role: render ALL directItems (termasuk Dashboard karyawan) */}
            {isCashierRole(user) &&
              directItems.map((item) => {
                const iconMap = { "/home": Calculator, "/kitchen-display": ChefHat };
                const Icon = iconMap[item.href] || item.icon || MoreHorizontal;
                return renderNavButton(item, Icon);
              })}

            {/* Divider before POS */}
            {!isCashierRole(user) && (
              <div className="overflow-hidden my-2 mx-auto">
                <div
                  className={`border-t border-border/40 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isExpanded ? "w-full" : "w-6"}`}
                />
              </div>
            )}

            {/* POS & Penjualan - direct buttons for admin/super_admin */}
            {!isCashierRole(user) &&
              visiblePosItems.map((item) => renderNavButton(item, item.icon))}

            {/* Divider before categories */}
            {categories.length > 0 && (
              <div className="overflow-hidden my-2 mx-auto">
                <div
                  className={`border-t border-border/40 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isExpanded ? "w-full" : "w-6"}`}
                />
              </div>
            )}

            {/* Category buttons - open modal */}
            {categories.map((cat) => {
              const active = isCategoryActive(cat);
              const btn = (
                <button
                  type="button"
                  onClick={() => handleOpenCategory(cat.id)}
                  className={`nav-btn group relative flex items-center gap-3 rounded-xl overflow-hidden
                      h-10 px-3
                      ${
                        active
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm"
                      }`}>
                  <cat.icon
                    size={20}
                    className="shrink-0 transition-transform duration-150 group-hover:scale-110"
                  />
                  <span
                    className={`nav-label text-sm font-medium whitespace-nowrap transition-[opacity,transform] duration-200 ease-out
                        ${isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"}`}>
                    {t(cat.i18nKey) || cat.title}
                  </span>
                </button>
              );

              if (isExpanded) return <div key={cat.id}>{btn}</div>;
              return (
                <Tooltip key={cat.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="font-medium">
                    {t(cat.i18nKey) || cat.title}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </>
        </nav>

        {/* Bottom */}
        <div className="mt-auto flex flex-col gap-0.5 w-full pt-3 border-t border-border/40">
          <div className="flex flex-col gap-0.5 w-full">
            {renderNavButton({ title: "Support", i18nKey: "support", href: "/support" }, LifeBuoy)}
            <button
              type="button"
              onClick={handleLogout}
              className="group relative flex items-center gap-3 rounded-xl overflow-hidden
                h-10 px-3
                text-destructive hover:bg-destructive/10 hover:shadow-sm">
              <LogOut
                size={20}
                className="shrink-0 transition-transform duration-150 group-hover:scale-110 group-hover:-rotate-12"
              />
              <span
                className={`nav-label text-sm font-medium whitespace-nowrap transition-[opacity,transform] duration-200 ease-out
                  ${isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"}`}>
                {t("header.logout")}
              </span>
            </button>
          </div>
        </div>

        <Modal
          open={logoutModal}
          onOpenChange={setLogoutModal}
          type="confirm"
          title={t("header.logoutConfirmTitle")}
          description={t("header.logoutConfirmDesc")}
          confirmText={t("header.logoutYes")}
          onConfirm={confirmLogout}
        />

        {activeCategory && (
          <NavigationModal
            open={navModalOpen}
            onOpenChange={setNavModalOpen}
            // Read the live category so items gated by a permission that
            // resolves after the modal opened (Tenant, Store Configuration)
            // still appear.
            categories={[categories.find((c) => c.id === activeCategory.id) || activeCategory]}
            onNavigate={handleMouseLeave}
          />
        )}
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;

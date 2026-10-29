/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { useCookies } from "react-cookie";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import {
  Moon,
  Sun,
  Bell,
  Search,
  Menu,
  Store,
  ChevronDown,
  Check,
  Building2,
  Settings,
  User,
  LogOut,
  ChevronRight,
  LifeBuoy,
  Globe
} from "lucide-react";
import { translationSelect } from "@/state/translation";
import { useSocket } from "@/services/socket";
import { useQueryClient } from "react-query";
import { axiosInstance } from "@/services";
import { endSession, SESSION_END_REASON } from "@/services/session";
import { getUnreadCount } from "@/services/notification";
import { useTourStore } from "@/state/tour";
import { useThemeStore } from "@/state/theme";
import { useThemeEffect } from "@/hooks/useThemeEffect";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/contexts/StoreContext";
import { useLocations } from "@/queries/useLocations";

const StoreSelector = ({ cookie, setCookie }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { activeStoreId, activeStoreName: ctxStoreName, setActiveStore, isSuperAdmin } = useStore();

  const ref = useRef(null);
  const user = cookie?.user;
  const role = user?.roleType || "";

  const { data: locationsData } = useLocations("active", {
    enabled: role === "super_admin"
  });
  const locations = locationsData?.data || [];

  const activeStore = locations.find((l) => (l.id || l._id) === activeStoreId);
  const storeName =
    locations.length === 0
      ? t("header.selectStore")
      : !activeStoreId
        ? t("header.allStore")
        : activeStore?.name ||
          activeStore?.storeName ||
          ctxStoreName ||
          cookie?.activeStoreName ||
          t("header.selectStore");

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (role !== "super_admin") return null;

  // One store: nothing to switch between ("Semua Toko" would be the same).
  if (locations.length === 1) {
    return (
      <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm max-w-[160px] md:max-w-[200px]">
        <Building2 size={16} className="text-primary shrink-0" />
        <span className="truncate font-medium text-foreground hidden sm:inline">
          {locations[0].name || locations[0].storeName}
        </span>
      </div>
    );
  }

  const handleSelect = (loc) => {
    const id = loc.id || loc._id;
    const name = loc.name || loc.storeName || "";
    setActiveStore(id, name);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-accent transition-colors text-sm max-w-[160px] md:max-w-[200px]">
        <Building2 size={16} className="text-primary shrink-0" />
        <span className="truncate font-medium text-foreground hidden sm:inline">{storeName}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 md:left-auto md:right-auto md:w-64 bg-card border border-border rounded-xl shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
          <p className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("header.selectStore")}
          </p>
          {locations.length === 0 ? (
            <div className="px-3 sm:px-4 py-3 sm:py-6 text-center space-y-2 sm:space-y-3">
              <Store size={20} className="sm:size-[24px] mx-auto text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">{t("header.noStore")}</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.location.assign("/add-location");
                }}
                className="text-xs sm:text-sm font-medium text-primary hover:underline">
                + {t("header.addStore")}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveStore("", "");
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm transition-colors hover:bg-accent ${
                  !activeStoreId ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                }`}>
                <Globe
                  size={14}
                  className={!activeStoreId ? "text-primary" : "text-muted-foreground"}
                />
                <span className="truncate flex-1 text-left">{t("header.allStore")}</span>
                {!activeStoreId && <Check size={12} className="text-primary shrink-0" />}
              </button>
              {locations.map((loc) => {
                const id = loc.id || loc._id;
                const name = loc.name || loc.storeName || "";
                const isSelected = id === activeStoreId;
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => handleSelect(loc)}
                    className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm transition-colors hover:bg-accent ${
                      isSelected ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                    }`}>
                    <Store
                      size={14}
                      className={isSelected ? "text-primary" : "text-muted-foreground"}
                    />
                    <span className="truncate flex-1 text-left">{name}</span>
                    {isSelected && <Check size={12} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const UserDropdown = () => {
  const { t } = useTranslation();
  const { translation, updateTranslation } = translationSelect();
  const { theme, toggleTheme: toggleThemeStore } = useThemeStore();
  const { startTour } = useTourStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef(null);
  const [cookie] = useCookies();
  const [logoutModal, setLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = cookie?.user;
  const userName = user?.userName || user?.name || "Admin";
  const userRole = user?.roleType || "admin";
  const userImage = user?.image || null;
  const userFullName = user?.fullName || userName;
  const userRoleName = user?.roleName || userRole.replace("_", " ");

  const toggleTheme = () => toggleThemeStore();

  const languages = [
    { code: "id", label: "ID" },
    { code: "en", label: "EN" }
  ];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // The session boundary revokes, clears and reloads to the login page, which
  // shows the logout confirmation.
  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await endSession({ reason: SESSION_END_REASON.LOGOUT, revoke: true });
  };

  const handleLogout = () => setLogoutModal(true);

  const avatarButton = (onClick) => (
    <button
      type="button"
      onClick={onClick}
      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border-2 border-primary flex items-center justify-center bg-accent text-foreground text-xs font-bold shrink-0 hover:brightness-90 transition-all">
      {userImage ? (
        <img src={userImage} alt={userName} className="h-full w-full object-cover" />
      ) : (
        userName?.charAt(0)?.toUpperCase() || "A"
      )}
    </button>
  );

  // ponytail: item menu profil dipakai dua kali — dropdown desktop &
  // modal mobile — agar perilaku keduanya selalu sinkron
  const menuItemClass =
    "w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-foreground hover:bg-accent transition-colors";

  return (
    <>
      {/* Desktop: dropdown inline */}
      <div data-tour="header-user" className="relative hidden md:block" ref={ref}>
        {isLoggingOut && (
          <Loading fullscreen size="lg" label={t("header.loggingOut") || "Logging out..."} />
        )}
        {avatarButton(() => setOpen(!open))}

        {open && (
          <div className="absolute top-full mt-2 right-0 w-48 sm:w-56 bg-card border border-border rounded-xl shadow-lg z-50 py-2 overflow-hidden">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {userFullName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{userRoleName}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
              className={menuItemClass}>
              <User size={14} className="sm:size-[16px] text-muted-foreground" />
              {userName}
              <ChevronRight size={12} className="sm:size-[14px] ml-auto text-muted-foreground" />
            </button>

            <div className="border-t border-border mt-1 pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className={`${menuItemClass} text-destructive hover:bg-destructive/10`}>
                <LogOut size={14} className="sm:size-[16px]" />
                {t("header.logout")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: avatar membuka modal profil berisi preferensi & logout */}
      <div className="md:hidden">
        {avatarButton(() => setMobileOpen(true))}
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-xs rounded-2xl p-0 overflow-hidden">
            <DialogHeader className="px-4 pt-4 pb-3 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-primary flex items-center justify-center bg-accent text-sm font-bold shrink-0">
                  {userImage ? (
                    <img src={userImage} alt={userName} className="h-full w-full object-cover" />
                  ) : (
                    userFullName?.charAt(0)?.toUpperCase() || "A"
                  )}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm font-semibold truncate">
                    {userFullName}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {userRoleName}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="py-2">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/profile");
                }}
                className={menuItemClass}>
                <User size={16} className="text-muted-foreground" />
                {userName}
                <ChevronRight size={14} className="ml-auto text-muted-foreground" />
              </button>

              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2.5 text-sm text-foreground">
                  <Globe size={16} className="text-muted-foreground" />
                  {t("common.language", { defaultValue: "Bahasa" })}
                </span>
                <div className="flex items-center bg-muted/50 rounded-full p-0.5 border border-border">
                  {languages.map((lang) => (
                    <button
                      type="button"
                      key={lang.code}
                      onClick={() => updateTranslation(lang.code)}
                      className={`px-2.5 py-1 text-xs font-bold tracking-widest rounded-full transition-all duration-200 ${
                        translation === lang.code
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={toggleTheme} className={menuItemClass}>
                {theme === "dark" ? (
                  <Sun size={16} className="text-muted-foreground" />
                ) : (
                  <Moon size={16} className="text-muted-foreground" />
                )}
                {theme === "dark"
                  ? t("header.lightMode") || "Light Mode"
                  : t("header.darkMode") || "Dark Mode"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  startTour();
                }}
                className={menuItemClass}>
                <LifeBuoy size={16} className="text-muted-foreground" />
                {t("guide.dashboard.startTour")}
              </button>

              <div className="border-t border-border mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${menuItemClass} text-destructive hover:bg-destructive/10`}>
                  <LogOut size={16} />
                  {t("header.logout")}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
    </>
  );
};

export const NotificationBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { newNotification } = useSocket() || {};
  const queryClient = useQueryClient();
  const [localUnread, setLocalUnread] = useState(0);

  const { data: unreadData } = useQuery("unread-notifications", getUnreadCount, {
    // ponytail: BE membalut payload dalam data.unreadCount — bukan count
    onSuccess: (data) => {
      const count = data?.data?.unreadCount ?? 0;
      setLocalUnread(count);
    }
  });

  useEffect(() => {
    if (newNotification) {
      setLocalUnread((prev) => prev + 1);
    }
  }, [newNotification]);

  const handleClick = () => {
    setLocalUnread(0);
    navigate("/notification");
  };

  return (
    <button
      type="button"
      data-tour="header-notification"
      aria-label={t("header.notifications")}
      onClick={handleClick}
      className="relative p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      <Bell size={16} className="sm:size-[18px]" />
      {localUnread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] sm:text-[10px] font-bold rounded-full px-1 leading-none shadow-sm">
          {localUnread > 99 ? "99+" : localUnread}
        </span>
      )}
    </button>
  );
};

const globalPages = [
  "/dashboard-super-admin",
  "/location-list",
  "/add-location",
  "/edit-location",
  "/detail-location",
  "/store-geospatial",
  "/department-list",
  "/add-department",
  "/edit-department",
  "/detail-department",
  "/position-list",
  "/add-position",
  "/edit-position",
  "/detail-position",
  "/employee-list",
  "/add-employee",
  "/edit-employee",
  "/detail-employee",
  "/role-management",
  "/add-role",
  "/edit-role",
  "/user-list",
  "/add-user",
  "/notification",
  "/category-list",
  "/add-category",
  "/edit-category",
  "/detail-category",
  "/ingredient-category",
  "/add-ingredient-category",
  "/edit-ingredient-category",
  "/supplier",
  "/add-supplier",
  "/edit-supplier",
  "/detail-supplier",
  "/member-tier",
  "/add-member-tier",
  "/edit-member-tier",
  "/member-list",
  "/add-member",
  "/edit-member",
  "/detail-member",
  "/tax-list",
  "/add-tax",
  "/edit-tax",
  "/type-payment-list",
  "/add-type-payment",
  "/edit-type-payment",
  "/shift-list",
  "/add-shift",
  "/edit-shift",
  "/stock-history",
  "/low-stock",
  "/low-stock-all",
  "/stock-opname",
  "/detail-member-tier",
  "/price-list-template",
  "/product-list",
  "/add-product",
  "/discount-list",
  "/edit-product",
  "/add-discount",
  "/edit-discount"
];

const Header = ({ onMenuToggle, onOpenPalette, sidebarCollapsed }) => {
  const { t } = useTranslation();
  const { translation, updateTranslation } = translationSelect();
  const navigate = useNavigate();

  const { startTour } = useTourStore();
  const { toggleTheme: toggleThemeStore } = useThemeStore();
  useThemeEffect();
  const location = useLocation();
  const isGlobalPage = globalPages.some((p) => location.pathname.startsWith(p));

  const toggleTheme = () => toggleThemeStore();

  const languages = [
    { code: "id", label: "ID" },
    { code: "en", label: "EN" }
  ];

  return (
    <header
      className={`fixed top-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border transition-[left] duration-300 ${sidebarCollapsed ? "desk:left-16" : "desk:left-64"} left-0`}>
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            aria-label={t("header.openMenu")}
            onClick={onMenuToggle}
            className="desk:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Menu size={20} />
          </button>
          <button
            type="button"
            data-tour="header-search"
            onClick={onOpenPalette}
            className="hidden md:flex items-center gap-2 bg-muted/50 hover:bg-accent px-5 lg:px-6 py-1.5 rounded-lg lg:rounded-full border border-border transition-colors text-muted-foreground text-sm w-full max-w-xs lg:max-w-sm">
            <Search size={14} className="lg:size-[16px] shrink-0" />
            <span className="text-xs lg:text-sm">{t("header.search")}</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono bg-background rounded border border-border ml-4">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search */}
          <button
            type="button"
            aria-label={t("header.search")}
            onClick={onOpenPalette}
            className="md:hidden p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Search size={16} className="sm:size-[18px]" />
          </button>

          {/* Language Switcher — desktop saja; di mobile pindah ke modal profil */}
          <div
            data-tour="header-translation"
            className="hidden md:flex items-center bg-muted/50 rounded-full p-0.5 border border-border">
            {languages.map((lang) => (
              <button
                type="button"
                key={lang.code}
                onClick={() => updateTranslation(lang.code)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold tracking-widest rounded-full transition-all duration-200 ${
                  translation === lang.code
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {lang.label}
              </button>
            ))}
          </div>

          {/* Theme Toggle — desktop saja; di mobile pindah ke modal profil */}
          <button
            type="button"
            data-tour="header-theme"
            aria-label={t("header.toggleTheme")}
            onClick={toggleTheme}
            className="hidden md:block p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Sun size={16} className="hidden dark:block sm:size-[18px]" />
            <Moon size={16} className="block dark:hidden sm:size-[18px]" />
          </button>

          {/* Tour Guide — desktop saja; di mobile pindah ke modal profil */}
          <button
            type="button"
            data-tour="header-tour"
            aria-label={t("guide.dashboard.startTour")}
            onClick={() => startTour()}
            className="hidden md:block p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={t("guide.dashboard.startTour")}>
            <LifeBuoy size={16} className="sm:size-[18px]" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Dropdown */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;
export { StoreSelector };

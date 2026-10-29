import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useCookies } from "react-cookie";
import { useQueryClient } from "react-query";
import { isSessionEnding } from "@/services/session";
import { getToken } from "@/utils/cookies";
import { isRememberMeEnabled } from "@/lib/remembered-session";
import { sessionCookieOptions } from "@/lib/session-cookie";

// Store cookies share the login cookies' lifetime, so a remembered session
// keeps its user/store after a browser restart.
const storeCookieOptions = () => sessionCookieOptions(getToken(), isRememberMeEnabled());

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [cookies, setCookie] = useCookies();
  const queryClient = useQueryClient();

  const user = cookies?.user;
  const role = user?.roleType || "";
  const isSuperAdmin = role === "super_admin";

  const [activeStoreId, setActiveStoreIdState] = useState(() => {
    if (!isSuperAdmin) return user?.store;
    const cookieStore = cookies?.activeStore;
    return cookieStore && cookieStore !== "undefined" ? cookieStore : null;
  });
  const [activeStoreName, setActiveStoreNameState] = useState(() => {
    return cookies?.user?.storeName || cookies?.activeStoreName || "";
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      setCookie("activeStore", user?.store || "", storeCookieOptions());
      setCookie("activeStoreName", user?.storeName || "", storeCookieOptions());
    }
    // Normalisasi sekali saat mount: refresh HP tidak ikut larut dalam
    // stale activeStore/activeStoreName bekas sesi super admin.
  }, []);

  const setActiveStore = useCallback(
    (id, name) => {
      // A late caller (e.g. a locations response) must not write the ending
      // session's user/store cookies back.
      if (isSessionEnding()) return;
      // If super_admin, we use the passed ID (could be empty for global, or specific ID)
      // If not super_admin, we force the user's assigned store name so the UI never
      // shows a stale store from a previous session.
      const storeValue = isSuperAdmin ? id : user?.store || "";
      // ponytail: non-super_admin — nama yang dioper hanya dipercaya bila id-nya
      // memang toko user; auto-pick DashboardLayout mengoper lokasi pertama
      // (bisa toko lain) sehingga admin tanpa toko tampil "Bakso ABC".
      const storeNameValue = isSuperAdmin
        ? name || ""
        : user?.storeName || (String(id ?? "") === String(storeValue) ? name : "") || "";

      // ponytail: set tanpa perubahan = no-op. Tanpa ini, admin tanpa store
      // (storeValue selalu "") memicu loop: DashboardLayout auto-pick →
      // invalidateQueries() → locations refetch (array baru) → auto-pick lagi.
      if (
        String(storeValue ?? "") === String(activeStoreId ?? "") &&
        storeNameValue === activeStoreName
      ) {
        return;
      }

      const cookieOptions = storeCookieOptions();
      setCookie("activeStore", storeValue, cookieOptions);
      setCookie("activeStoreName", storeNameValue || "", cookieOptions);

      // Update user cookie to keep UI in sync if needed
      if (user) {
        setCookie("user", { ...user, store: storeValue, storeName: storeNameValue }, cookieOptions);
      }

      setActiveStoreIdState(storeValue);
      setActiveStoreNameState(storeNameValue);

      localStorage.setItem("globalStoreFilter", String(storeValue));
      queryClient.invalidateQueries();
    },
    [setCookie, user, queryClient, isSuperAdmin, activeStoreId, activeStoreName]
  );

  const value = useMemo(
    () => ({
      activeStoreId,
      activeStoreName,
      setActiveStore,
      isSuperAdmin,
      userRole: role
    }),
    [activeStoreId, activeStoreName, setActiveStore, isSuperAdmin, role]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return ctx;
}

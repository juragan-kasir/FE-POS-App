import { useMemo } from "react";
import { useCookies } from "react-cookie";
import { readRememberedUser } from "@/lib/remembered-session";

// ponytail: resolusi user dipakai bersama Sidebar & CommandPalette
// (accessMenu bisa terpotong dari cookie, fallback ke sessionStorage)
export const useUserSession = () => {
  const [cookie] = useCookies();

  return useMemo(() => {
    let session = null;
    try {
      const stored = sessionStorage.getItem("user");
      session = stored ? JSON.parse(stored) : null;
    } catch {
      session = null;
    }
    if (
      session &&
      session.accessMenu &&
      Array.isArray(session.accessMenu) &&
      session.accessMenu.length > 0
    ) {
      return session;
    }
    const remembered = readRememberedUser();
    if (
      remembered &&
      remembered.accessMenu &&
      Array.isArray(remembered.accessMenu) &&
      remembered.accessMenu.length > 0
    ) {
      return remembered;
    }
    return cookie?.user;
  }, [cookie?.user]);
};

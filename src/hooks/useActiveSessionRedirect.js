import { useEffect } from "react";
import { useCookies } from "react-cookie";

import { readRememberedUser } from "@/lib/remembered-session";
import { getTokenExpiryDate } from "@/lib/token-expiry";
import { isSessionEnding, sessionNavigation } from "@/services/session";
import { getToken } from "@/utils/cookies";
import { getRoleDashboard } from "@/utils/role";

export const useActiveSessionRedirect = () => {
  const [cookies] = useCookies();

  useEffect(() => {
    if (isSessionEnding()) return;
    const expiresAt = getTokenExpiryDate(getToken());
    if (!expiresAt || expiresAt <= new Date()) return;
    const role = readRememberedUser()?.roleType || cookies.user?.roleType;
    if (!role) return;
    sessionNavigation.replace(getRoleDashboard(role));
  }, [cookies.user]);
};

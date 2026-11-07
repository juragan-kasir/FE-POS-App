import { useEffect } from "react";
import { useCookies } from "react-cookie";

import { readActiveSessionRole } from "@/lib/active-session";
import { sessionNavigation } from "@/services/session";
import { getRoleDashboard } from "@/utils/role";

export const useActiveSessionRedirect = () => {
  const [cookies] = useCookies();

  useEffect(() => {
    const role = readActiveSessionRole(cookies.user);
    if (!role) return;
    sessionNavigation.replace(getRoleDashboard(role));
  }, [cookies.user]);
};

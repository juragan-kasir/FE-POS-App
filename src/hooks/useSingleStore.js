import { useCookies } from "react-cookie";
import { useLocations } from "@/queries/useLocations";

// The only active store of a super_admin who has exactly one, else null.
// Store pickers use it to fill themselves instead of asking for a choice
// that has a single answer. Reads the role from the session cookie, so it
// also works in pages rendered outside a StoreProvider.
export const useSingleStore = () => {
  const [cookies] = useCookies();
  const isSuperAdmin = cookies?.user?.roleType === "super_admin";
  const { data } = useLocations("active", { enabled: isSuperAdmin });
  const list = data?.data || [];
  return isSuperAdmin && list.length === 1 ? list[0] : null;
};

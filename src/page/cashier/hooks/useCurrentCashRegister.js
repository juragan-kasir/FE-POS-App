import { useQuery } from "react-query";
import { getCurrentCashRegister } from "@/services/cash-register";
import { CASH_REGISTER_STATUS_POLL_MS } from "@/constants/cashRegister";

export const useCurrentCashRegister = (store) => {
  const { data, isLoading } = useQuery(
    ["cash-register-current", store],
    () => getCurrentCashRegister(store),
    {
      enabled: !!store,
      refetchInterval: store ? CASH_REGISTER_STATUS_POLL_MS : false
    }
  );

  const register = data?.data?.register || data?.data || null;

  return { register, isLoading };
};

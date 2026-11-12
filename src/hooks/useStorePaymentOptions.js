import { useMemo } from "react";
import { useQuery } from "react-query";
import { getAllTypePayment } from "@/services/type-payment";
import { activePaymentOptions } from "@/utils/payment";

export const useStorePaymentOptions = (store, { enabled = true } = {}) => {
  const { data } = useQuery(
    ["payment-methods-active", store],
    () => getAllTypePayment({ store, status: "active" }),
    { enabled: enabled && !!store }
  );
  return useMemo(() => activePaymentOptions(data), [data]);
};

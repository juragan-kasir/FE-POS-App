import { useCallback } from "react";
import { useQueryClient } from "react-query";
import { CASHIER_ORDER_QUEUE_STATUSES } from "@/constants/orderQueue";

export const useOrderQueueRefresh = (store) => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    CASHIER_ORDER_QUEUE_STATUSES.forEach((status) =>
      queryClient.invalidateQueries(["cashier-orders-" + status, store])
    );
    queryClient.invalidateQueries(["customer-orders"]);
  }, [queryClient, store]);
};

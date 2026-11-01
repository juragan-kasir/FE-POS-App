import { useCallback, useMemo, useState } from "react";
import { useMutation } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { addOrderItems } from "@/services/order";
import { buildOrderItemsPayload, orderLinesSignature } from "@/utils/orderPayload";
import { newIdempotencyKey } from "@/utils/paymentIdempotency";
import { useOrderQueueRefresh } from "./useOrderQueueRefresh";

export const useAddOrderRound = ({ store, items, onAdded }) => {
  const { t } = useTranslation();
  const refreshQueues = useOrderQueueRefresh(store);
  const [target, setTarget] = useState(null);
  const signature = orderLinesSignature(items);
  const idempotencyKey = useMemo(() => newIdempotencyKey(), [target?.id, signature]);

  const mutation = useMutation(
    () =>
      addOrderItems(target.id, {
        store,
        items: buildOrderItemsPayload(items),
        idempotencyKey
      }),
    {
      onSuccess: () => {
        toast.success(t("page.cashier.openBill.roundAdded", { order: target.orderNumber }));
        refreshQueues();
        setTarget(null);
        onAdded();
      },
      onError: (err) =>
        toast.error(t("page.cashier.openBill.roundFailed"), { description: err.message })
    }
  );

  const start = useCallback((order) => setTarget(order), []);
  const cancel = useCallback(() => setTarget(null), []);

  return { target, start, cancel, submit: mutation.mutate, isSubmitting: mutation.isLoading };
};

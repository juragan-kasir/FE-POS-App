import { useMemo } from "react";
import { useMutation } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createOpenBill } from "@/services/order";
import { buildOrderItemsPayload, orderLinesSignature } from "@/utils/orderPayload";
import { newIdempotencyKey } from "@/utils/paymentIdempotency";
import { useOrderQueueRefresh } from "./useOrderQueueRefresh";

export const useSaveOpenBill = ({ store, items, table, cashierId, cashierName, onSaved }) => {
  const { t } = useTranslation();
  const refreshQueues = useOrderQueueRefresh(store);
  const signature = `${table?.id}:${orderLinesSignature(items)}`;
  const idempotencyKey = useMemo(() => newIdempotencyKey(), [signature]);

  const mutation = useMutation(
    () =>
      createOpenBill({
        store,
        tableId: table.id,
        items: buildOrderItemsPayload(items),
        cashierId,
        cashierName,
        idempotencyKey
      }),
    {
      onSuccess: () => {
        toast.success(t("page.cashier.openBill.saved", { table: table.name }));
        refreshQueues();
        onSaved();
      },
      onError: (err) =>
        toast.error(t("page.cashier.openBill.saveFailed"), { description: err.message })
    }
  );

  return { save: mutation.mutate, isSaving: mutation.isLoading };
};

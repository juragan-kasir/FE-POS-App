import React from "react";
import { useTranslation } from "react-i18next";
import { PlusCircle, X } from "lucide-react";

const AddRoundNotice = ({ order, onCancel }) => {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
      <PlusCircle size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <span className="flex-1">
        {t("page.cashier.openBill.addingTo", {
          order: order.orderNumber?.slice(-5) || order.id,
          table: order.table?.name || order.tableId || "-"
        })}
      </span>
      <button
        type="button"
        onClick={onCancel}
        aria-label={t("page.cashier.openBill.cancelAdding")}
        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground">
        <X size={14} />
      </button>
    </div>
  );
};

export default AddRoundNotice;

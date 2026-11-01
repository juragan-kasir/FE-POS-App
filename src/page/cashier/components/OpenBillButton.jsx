import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaveOpenBill } from "../hooks/useSaveOpenBill";

const OpenBillButton = ({ store, items, table, cashierId, cashierName, hasDiscount, onSaved }) => {
  const { t } = useTranslation();
  const { save, isSaving } = useSaveOpenBill({
    store,
    items,
    table,
    cashierId,
    cashierName,
    onSaved
  });
  const Icon = isSaving ? Loader2 : ReceiptText;

  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        onClick={() => save()}
        disabled={hasDiscount || isSaving}
        disabledReason={hasDiscount ? t("page.cashier.openBill.noDiscount") : undefined}
        className="w-full h-11 rounded-xl text-sm font-semibold">
        <Icon size={16} className={isSaving ? "animate-spin" : undefined} />
        {t("page.cashier.openBill.save")}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        {t("page.cashier.openBill.saveHint", { table: table.name })}
      </p>
    </div>
  );
};

export default OpenBillButton;

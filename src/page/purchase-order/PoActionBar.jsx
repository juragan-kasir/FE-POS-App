import React from "react";
import { useTranslation } from "react-i18next";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PoActionBar = ({ totals, onCancel, onSaveDraft, onSave, isSaving, saveLabel }) => {
  const { t } = useTranslation();
  const shownTotal = totals.hasAdjustments ? totals.finalAmount : totals.totalAmount;

  return (
    <div className="sticky bottom-4 flex flex-wrap justify-between items-center gap-3 bg-card border border-border/60 shadow-lg rounded-xl p-4 backdrop-blur-sm">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="gap-2 flex-1 sm:flex-none">
        <X size={18} />
        {t("common.cancel")}
      </Button>
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">
            {t("page.purchaseOrder.add.totalAfterDiscount")}
          </p>
          <p className="text-sm font-semibold">Rp {shownTotal.toLocaleString("id-ID")}</p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="draft"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex-1 sm:flex-none">
            {t("page.purchaseOrder.add.saveDraft")}
          </Button>
          <Button
            variant="success"
            type="button"
            disabled={isSaving}
            className="gap-2 flex-1 sm:flex-none min-w-0 sm:min-w-[140px] shadow-md"
            onClick={onSave}>
            <Save size={18} />
            {isSaving ? t("common.saving") : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PoActionBar;

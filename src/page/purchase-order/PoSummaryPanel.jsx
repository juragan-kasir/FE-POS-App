import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { formatIDR, parseIDR } from "./poForm";

const PoSummaryPanel = ({
  idPrefix,
  header,
  totals,
  financialLockReason,
  hasAdditionalCostNotes
}) => {
  const { t } = useTranslation();
  const isFinancialLocked = Boolean(financialLockReason);

  return (
    <div className="rounded-xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/60 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 justify-end">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 sm:pt-1">
          <div className="flex items-center gap-3">
            <Label
              htmlFor={`${idPrefix}-purchase-order-discount`}
              className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              {t("page.purchaseOrder.add.discount")}
            </Label>
            <Input
              id={`${idPrefix}-purchase-order-discount`}
              placeholder={t("page.purchaseOrder.add.rpPlaceholder")}
              value={header.discount ? formatIDR(header.discount) : ""}
              onChange={(e) => header.setDiscount(parseIDR(e.target.value))}
              disabled={isFinancialLocked}
              title={financialLockReason}
              className="h-9 text-sm w-32 sm:w-36 text-right"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label
              htmlFor={`${idPrefix}-purchase-order-tax-rate`}
              className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              {t("page.purchaseOrder.add.taxRate")}
            </Label>
            <Input
              id={`${idPrefix}-purchase-order-tax-rate`}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={header.taxRate || ""}
              onChange={(e) =>
                header.setTaxRate(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)
              }
              disabled={isFinancialLocked}
              title={financialLockReason}
              className="h-9 text-sm w-20 text-right"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label
              htmlFor={`${idPrefix}-purchase-order-additional-cost`}
              className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              {t("page.purchaseOrder.add.additionalCost")}
            </Label>
            <Input
              id={`${idPrefix}-purchase-order-additional-cost`}
              placeholder={t("page.purchaseOrder.add.rpPlaceholder")}
              value={header.additionalCost ? formatIDR(header.additionalCost) : ""}
              onChange={(e) => header.setAdditionalCost(parseIDR(e.target.value))}
              disabled={isFinancialLocked}
              title={financialLockReason}
              className="h-9 text-sm w-32 sm:w-36 text-right"
            />
          </div>
          {hasAdditionalCostNotes && header.additionalCost > 0 && (
            <div className="flex items-center gap-3">
              <Label
                htmlFor={`${idPrefix}-purchase-order-additional-cost-notes`}
                className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                {t("page.purchaseOrder.add.additionalCostNotes")}
              </Label>
              <Input
                id={`${idPrefix}-purchase-order-additional-cost-notes`}
                placeholder={t("page.purchaseOrder.add.additionalCostNotesPlaceholder")}
                value={header.additionalCostNotes}
                onChange={(e) => header.setAdditionalCostNotes(e.target.value)}
                className="h-9 text-sm flex-1 min-w-[160px]"
                disabled={isFinancialLocked}
                maxLength={FIELD_LIMITS.SHORT_NOTE}
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Label
              htmlFor={`${idPrefix}-purchase-order-over-delivery-tolerance`}
              className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              {t("page.purchaseOrder.add.overDeliveryTolerance")}
            </Label>
            <Input
              id={`${idPrefix}-purchase-order-over-delivery-tolerance`}
              type="text"
              inputMode="decimal"
              value={header.overDeliveryTolerance || ""}
              onChange={(e) =>
                header.setOverDeliveryTolerance(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)
              }
              disabled={isFinancialLocked}
              title={financialLockReason}
              className="h-9 text-sm w-20 text-right"
            />
          </div>
        </div>
        <div className="flex-1 max-w-[280px] ml-auto">
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("page.purchaseOrder.add.totalPrice")}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              Rp {totals.totalAmount.toLocaleString("id-ID")}
            </p>
          </div>
          {totals.hasAdjustments && (
            <>
              <div className="border-t border-border/60 my-2" />
              <div className="text-right space-y-0.5">
                {header.discount > 0 && (
                  <p className="text-xs font-medium text-destructive">
                    {t("page.purchaseOrder.add.discountLabel")} - Rp{" "}
                    {header.discount.toLocaleString("id-ID")}
                  </p>
                )}
                {totals.taxAmount > 0 && (
                  <p className="text-xs font-medium text-foreground">
                    {t("page.purchaseOrder.add.taxLabel", { rate: header.taxRate })} + Rp{" "}
                    {totals.taxAmount.toLocaleString("id-ID")}
                  </p>
                )}
                {header.additionalCost > 0 && (
                  <p className="text-xs font-medium text-emerald-600">
                    {t("page.purchaseOrder.add.additionalCostLabel")} + Rp{" "}
                    {header.additionalCost.toLocaleString("id-ID")}
                  </p>
                )}
                <p className="text-base sm:text-lg font-bold text-foreground">
                  Rp {totals.finalAmount.toLocaleString("id-ID")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoSummaryPanel;

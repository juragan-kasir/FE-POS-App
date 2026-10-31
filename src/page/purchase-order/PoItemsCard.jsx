import React from "react";
import { useTranslation } from "react-i18next";
import { Package, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import PoItemGroups from "./PoItemGroups";
import PoSummaryPanel from "./PoSummaryPanel";
import { hasDuplicateItems } from "./poForm";

const PoItemsCard = ({
  idPrefix,
  header,
  groupsApi,
  totals,
  suppliersLoading,
  requestLockReason,
  financialLockReason,
  hasAdditionalCostNotes
}) => {
  const { t } = useTranslation();
  const isStoreSelected = Boolean(header.selectedStore);
  const addSupplierDisabledReason =
    requestLockReason ||
    (suppliersLoading
      ? t("common.disabledReason.loading")
      : t("common.disabledReason.selectStoreFirst"));

  return (
    <Card className="overflow-hidden border-0 shadow-md rounded-xl">
      <div className="bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {t("page.purchaseOrder.add.itemSection")}
            </h3>
            <p className="text-xs text-emerald-100">
              {t("page.purchaseOrder.add.itemSectionDesc")}
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {isStoreSelected ? (
          <div className="space-y-4">
            {header.errors.items && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                <span className="text-xs text-destructive font-medium">{header.errors.items}</span>
              </div>
            )}
            {hasDuplicateItems(groupsApi.filledItems) && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-950/20 dark:border-amber-800">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  {t("page.purchaseOrder.add.validation.duplicateItems")}
                </span>
              </div>
            )}
            <PoItemGroups
              groupsApi={groupsApi}
              isStoreSelected={isStoreSelected}
              suppliersLoading={suppliersLoading}
              requestLockReason={requestLockReason}
              addSupplierDisabledReason={addSupplierDisabledReason}
            />
            <PoSummaryPanel
              idPrefix={idPrefix}
              header={header}
              totals={totals}
              financialLockReason={financialLockReason}
              hasAdditionalCostNotes={hasAdditionalCostNotes}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {t("page.purchaseOrder.add.selectStoreFirst")}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
              {t("page.purchaseOrder.add.selectStoreHint")}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PoItemsCard;

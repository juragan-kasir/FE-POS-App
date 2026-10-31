import React from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ShoppingCart } from "lucide-react";

const DISPLAY_DATE = "dd MMM yyyy";

const formatRequestDate = (value) => (value ? format(new Date(value), DISPLAY_DATE) : "-");

const PoGoodsRequestInfo = ({ goodsRequestData }) => {
  const { t } = useTranslation();

  return (
    <div className="md:col-span-2">
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <ShoppingCart size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              {t("page.purchaseOrder.edit.fromGoodsRequest")}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {goodsRequestData.requestNumber}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-blue-500 dark:text-blue-400 mb-0.5">
              {t("page.purchaseOrder.edit.requestedBy")}
            </p>
            <p className="font-medium text-blue-800 dark:text-blue-300">
              {goodsRequestData.requestedBy || "-"}
            </p>
          </div>
          <div>
            <p className="text-blue-500 dark:text-blue-400 mb-0.5">
              {t("page.purchaseOrder.edit.requestDate")}
            </p>
            <p className="font-medium text-blue-800 dark:text-blue-300">
              {formatRequestDate(goodsRequestData.requestDate)}
            </p>
          </div>
          <div>
            <p className="text-blue-500 dark:text-blue-400 mb-0.5">
              {t("page.purchaseOrder.edit.neededDate")}
            </p>
            <p className="font-medium text-blue-800 dark:text-blue-300">
              {formatRequestDate(goodsRequestData.neededDate)}
            </p>
          </div>
          <div>
            <p className="text-blue-500 dark:text-blue-400 mb-0.5">
              {t("page.purchaseOrder.edit.grStatus")}
            </p>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold capitalize bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {goodsRequestData.status}
            </span>
          </div>
        </div>
        {goodsRequestData.items && goodsRequestData.items.length > 0 && (
          <div className="border-t border-blue-200 dark:border-blue-800 pt-2">
            <p className="text-xs text-blue-500 dark:text-blue-400 font-medium uppercase tracking-wider mb-1.5">
              {t("page.purchaseOrder.edit.requestedItems")}
            </p>
            <div className="space-y-1">
              {goodsRequestData.items.map((grItem, grIdx) => (
                <div key={grIdx} className="flex items-center justify-between text-xs">
                  <span className="text-blue-800 dark:text-blue-300">
                    {grItem.ingredientName || grItem.productName || "-"}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {grItem.qty} {grItem.unit}
                    {grItem.notes ? ` · ${grItem.notes}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {goodsRequestData.notes && (
          <div className="border-t border-blue-200 dark:border-blue-800 pt-2">
            <p className="text-xs text-blue-500 dark:text-blue-400 font-medium uppercase tracking-wider mb-0.5">
              {t("page.purchaseOrder.edit.grNotes")}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">{goodsRequestData.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoGoodsRequestInfo;

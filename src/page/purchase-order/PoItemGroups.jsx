import React from "react";
import { useTranslation } from "react-i18next";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { UNIT_OPTIONS, formatIDR, parseDecimal, parseIDR } from "./poForm";

const PoItemGroups = ({
  groupsApi,
  isStoreSelected,
  suppliersLoading,
  requestLockReason,
  addSupplierDisabledReason
}) => {
  const { t } = useTranslation();
  const { groups } = groupsApi;
  const isRequestLocked = Boolean(requestLockReason);

  return (
    <>
      {groups.map((group, gIdx) => (
        <div key={gIdx} className="border rounded-lg overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b bg-muted/40">
            <Label
              htmlFor={`po-group-${gIdx}-supplier`}
              className="shrink-0 text-xs text-muted-foreground">
              {t("page.purchaseOrder.add.table.supplier")}
            </Label>
            <div className="flex-1 min-w-[220px]">
              <Combobox
                id={`po-group-${gIdx}-supplier`}
                options={groupsApi.supplierOptions}
                value={group.supplier ? String(group.supplier) : ""}
                onChange={(val) => groupsApi.pickGroupSupplier(gIdx, val)}
                onClear={() => groupsApi.clearGroupSupplier(gIdx)}
                placeholder={t("page.purchaseOrder.add.selectSupplier")}
                searchPlaceholder={t("common.search")}
                emptyMessage={t("page.purchaseOrder.add.noSupplierFound")}
                disabled={!isStoreSelected || suppliersLoading || isRequestLocked}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("common.delete")}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => groupsApi.requestRemoveGroup(gIdx)}
              disabled={groups.length === 1 || isRequestLocked}
              disabledReason={requestLockReason}>
              <Trash2 size={14} />
            </Button>
          </div>

          {group.supplier && groupsApi.supplierItems(group.supplier).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Package size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {t("page.purchaseOrder.add.supplierNoItems")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("page.purchaseOrder.add.supplierNoItemsDesc")}
              </p>
            </div>
          ) : (
            <>
              <HorizontalScrollArea>
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                        {t("page.purchaseOrder.add.table.name")}
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                        {t("page.purchaseOrder.add.table.qty")}
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                        {t("page.purchaseOrder.add.table.unit")}
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                        {t("page.purchaseOrder.add.table.price")}
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                        {t("page.purchaseOrder.add.table.subtotal")}
                      </th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, iIdx) => (
                      <tr key={iIdx} className="border-b border-muted/20">
                        <td className="px-3 py-2 min-w-[280px]">
                          <Combobox
                            options={groupsApi.itemOptionsForRow(gIdx, iIdx, group.supplier)}
                            value={groupsApi.selectedItemValue(item, group.supplier)}
                            onChange={(val) => groupsApi.pickItemOption(gIdx, iIdx, val)}
                            placeholder={
                              group.supplier
                                ? t("page.purchaseOrder.add.placeholder.selectItem")
                                : t("page.purchaseOrder.add.selectSupplierFirst")
                            }
                            searchPlaceholder={t("common.search")}
                            emptyMessage={t("page.purchaseOrder.add.noIngredientFound")}
                            disabled={!group.supplier}
                          />
                          {item.name && !groupsApi.selectedItemValue(item, group.supplier) && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {item.name}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.qty === 0 ? "" : String(item.qty)}
                            onChange={(e) =>
                              groupsApi.updateItem(gIdx, iIdx, "qty", parseDecimal(e.target.value))
                            }
                            className="h-8 text-xs text-center w-20 mx-auto"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex justify-center">
                            <Combobox
                              options={UNIT_OPTIONS}
                              value={item.unit}
                              onChange={(val) => groupsApi.updateItem(gIdx, iIdx, "unit", val)}
                              placeholder="pcs"
                              searchPlaceholder={t("common.search")}
                            />
                          </div>
                          <div className="mt-1">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={item.conversionToBase ? String(item.conversionToBase) : "1"}
                              onChange={(e) =>
                                groupsApi.updateItem(
                                  gIdx,
                                  iIdx,
                                  "conversionToBase",
                                  Number(e.target.value.replace(/[^0-9.]/g, "")) || 1
                                )
                              }
                              className="h-7 text-xs text-center"
                              title={t("page.purchaseOrder.add.conversionPlaceholder", {
                                unit: item.unit || "pcs"
                              })}
                              aria-label={t("page.purchaseOrder.add.conversionPlaceholder", {
                                unit: item.unit || "pcs"
                              })}
                            />
                            <p className="text-xs text-muted-foreground text-center mt-0.5">
                              {t("page.purchaseOrder.add.conversionPlaceholder", {
                                unit: item.unit || "pcs"
                              })}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder={t("page.purchaseOrder.add.rpPlaceholder")}
                            value={item.price ? formatIDR(item.price) : ""}
                            onChange={(e) =>
                              groupsApi.updateItem(gIdx, iIdx, "price", parseIDR(e.target.value))
                            }
                            className="h-8 text-xs text-right w-36 ml-auto"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              Rp {(item.qty * item.price).toLocaleString("id-ID")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.qty} x {formatIDR(item.price)}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            aria-label={t("common.delete")}
                            type="button"
                            onClick={() => groupsApi.requestRemoveItem(gIdx, iIdx)}
                            disabled={group.items.length === 1 || isRequestLocked}
                            title={requestLockReason}
                            className="text-muted-foreground/40 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground/40">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>

              <div className="p-3 border-t">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => groupsApi.addItem(gIdx)}
                  disabled={isRequestLocked}
                  disabledReason={requestLockReason}
                  className="gap-1">
                  <Plus size={14} /> {t("page.purchaseOrder.add.form.addItem")}
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="success"
        size="sm"
        onClick={groupsApi.addGroup}
        disabled={!isStoreSelected || suppliersLoading || isRequestLocked}
        disabledReason={addSupplierDisabledReason}
        className="gap-1">
        <Plus size={14} /> {t("page.purchaseOrder.add.form.addSupplier")}
      </Button>
    </>
  );
};

export default PoItemGroups;

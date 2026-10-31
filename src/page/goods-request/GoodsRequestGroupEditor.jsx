import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

// One supplier group of a goods request (supplier + its item rows), shared
// by Tambah and Edit Permintaan Barang. Controlled: Add backs it with
// react-hook-form, Edit with local state; each page keeps its own item
// picking logic and passes it in.
const GoodsRequestGroupEditor = ({
  index,
  supplier,
  supplierOptions,
  onSupplierChange,
  supplierDisabled,
  canRemove,
  onRemove,
  items,
  rowKeys,
  itemOptionsForRow,
  selectedItemValue,
  onPickItem,
  onItemChange,
  onRemoveItem,
  onAddItem,
  unitOptions
}) => {
  const { t } = useTranslation();
  const supplierId = `goods-request-group-${index}-supplier`;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b bg-muted/40">
        <Label htmlFor={supplierId} className="shrink-0 text-xs text-muted-foreground">
          {t("page.goodsRequest.add.table.supplier")}
        </Label>
        <div className="flex-1 min-w-[220px]">
          <Combobox
            id={supplierId}
            options={supplierOptions}
            value={supplier ? String(supplier) : ""}
            onChange={onSupplierChange}
            placeholder={t("page.goodsRequest.add.placeholder.selectSupplier")}
            searchPlaceholder={t("common.search")}
            emptyMessage={t("page.goodsRequest.add.table.noSupplier")}
            disabled={supplierDisabled}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("common.delete")}
          title={t("common.delete")}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}>
          <Trash2 size={14} />
        </Button>
      </div>

      <HorizontalScrollArea>
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                {t("page.goodsRequest.add.table.name")}
              </th>
              <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                {t("page.goodsRequest.add.table.qty")}
              </th>
              <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                {t("page.goodsRequest.add.table.unit")}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                {t("page.goodsRequest.add.table.notes")}
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, iIdx) => (
              <tr key={rowKeys?.[iIdx] ?? iIdx} className="border-b border-muted/20">
                <td className="px-3 py-2 min-w-[280px]">
                  <Combobox
                    options={itemOptionsForRow(iIdx)}
                    value={selectedItemValue(item)}
                    onChange={(val) => onPickItem(iIdx, val)}
                    placeholder={t("page.goodsRequest.add.placeholder.selectItem")}
                    searchPlaceholder={t("common.search")}
                    emptyMessage={t("page.goodsRequest.add.table.noItem")}
                    disabled={!supplier}
                  />
                  {item.name && !selectedItemValue(item) && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{item.name}</p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={!item.qty ? "" : String(item.qty)}
                    onChange={(e) =>
                      onItemChange(iIdx, "qty", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                    }
                    className="h-8 text-xs text-center w-20 mx-auto"
                    placeholder="0"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-center">
                    <Combobox
                      options={unitOptions}
                      value={item.unit}
                      onChange={(val) => onItemChange(iIdx, "unit", val)}
                      placeholder="pcs"
                      searchPlaceholder={t("common.search")}
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={item.notes || ""}
                    onChange={(e) => onItemChange(iIdx, "notes", e.target.value)}
                    className="h-8 text-xs"
                    placeholder={t("page.goodsRequest.add.placeholder.notes")}
                    maxLength={FIELD_LIMITS.SHORT_NOTE}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    aria-label={t("common.delete")}
                    type="button"
                    onClick={() => onRemoveItem(iIdx)}
                    className="text-muted-foreground/40 hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </HorizontalScrollArea>

      <div className="p-3 border-t">
        <Button type="button" variant="success" size="sm" onClick={onAddItem} className="gap-1">
          <Plus size={14} /> {t("page.goodsRequest.add.form.addItem")}
        </Button>
      </div>
    </div>
  );
};

GoodsRequestGroupEditor.propTypes = {
  index: PropTypes.number.isRequired,
  supplier: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  supplierOptions: PropTypes.array.isRequired,
  onSupplierChange: PropTypes.func.isRequired,
  supplierDisabled: PropTypes.bool,
  canRemove: PropTypes.bool,
  onRemove: PropTypes.func.isRequired,
  items: PropTypes.array.isRequired,
  rowKeys: PropTypes.array,
  itemOptionsForRow: PropTypes.func.isRequired,
  selectedItemValue: PropTypes.func.isRequired,
  onPickItem: PropTypes.func.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onRemoveItem: PropTypes.func.isRequired,
  onAddItem: PropTypes.func.isRequired,
  unitOptions: PropTypes.array.isRequired
};

export default GoodsRequestGroupEditor;

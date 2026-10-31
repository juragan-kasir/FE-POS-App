import { useMemo, useState } from "react";
import { safeGet } from "@/lib/safe-lookup";
import { EMPTY_ITEM, emptyGroup, filledItemsOf, isFilledItem } from "./poForm";

const CLEARED_ITEM_FIELDS = {
  name: "",
  product: null,
  productName: null,
  ingredient: null,
  ingredientName: null
};

const supplierProductOptions = (suppliers) =>
  Object.fromEntries(
    suppliers.map((sup) => [
      sup.id,
      (sup.products || []).map((p) => ({
        value: `sp-${p.id}`,
        productId: p.productId || null,
        name: p.name,
        unit: p.unit || "pcs",
        price: p.price || p.lastPrice || 0
      }))
    ])
  );

const pickedItem = (item, option) => {
  if (!option) return { ...item, ...CLEARED_ITEM_FIELDS };
  return {
    ...item,
    name: option.name,
    product: option.productId,
    productName: option.name,
    ingredient: null,
    ingredientName: null,
    unit: option.unit || item.unit,
    price: option.price
  };
};

const mapAt = (list, index, update) =>
  list.map((entry, i) => (i === index ? update(entry) : entry));

export const usePoItemGroups = ({ initialGroups, suppliers }) => {
  const [groups, setGroups] = useState(initialGroups);
  const [supplierChange, setSupplierChange] = useState(null);
  const [supplierRemove, setSupplierRemove] = useState(null);
  const [itemRemove, setItemRemove] = useState(null);
  const [groupRemove, setGroupRemove] = useState(null);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((sup) => ({
        value: String(sup.id),
        label: sup.name || sup.supplierName || `Supplier #${sup.id}`
      })),
    [suppliers]
  );
  const itemsBySupplier = useMemo(() => supplierProductOptions(suppliers), [suppliers]);
  const supplierItems = (supplier) => safeGet(itemsBySupplier, supplier, []);
  const filledItems = useMemo(() => filledItemsOf(groups), [groups]);

  const selectedItemValue = (item, supplier) => {
    if (!supplier) return "";
    const match = supplierItems(supplier).find(
      (opt) =>
        (item.product && item.product === opt.productId) ||
        (item.ingredientName && item.ingredientName === opt.name) ||
        (item.productName && item.productName === opt.name)
    );
    return match?.value || "";
  };

  const itemOptionsForRow = (gIdx, iIdx, supplier) => {
    if (!supplier) return [];
    const taken = new Set(
      (groups.at(gIdx)?.items || [])
        .filter((_, j) => j !== iIdx)
        .map((other) => selectedItemValue(other, supplier))
        .filter(Boolean)
    );
    return supplierItems(supplier)
      .filter((it) => !taken.has(it.value))
      .map((it) => ({ value: it.value, label: it.name }));
  };

  const groupHasFilledItems = (gIdx) => (groups.at(gIdx)?.items || []).some(isFilledItem);

  const addGroup = () => setGroups((prev) => [...prev, emptyGroup()]);
  const removeGroup = (gIdx) => setGroups((prev) => prev.filter((_, i) => i !== gIdx));
  const addItem = (gIdx) =>
    setGroups((prev) =>
      mapAt(prev, gIdx, (g) => ({ ...g, items: [...g.items, { ...EMPTY_ITEM }] }))
    );
  const removeItem = (gIdx, iIdx) =>
    setGroups((prev) =>
      mapAt(prev, gIdx, (g) => ({ ...g, items: g.items.filter((_, j) => j !== iIdx) }))
    );
  const updateItem = (gIdx, iIdx, field, value) =>
    setGroups((prev) =>
      mapAt(prev, gIdx, (g) => ({
        ...g,
        items: mapAt(g.items, iIdx, (it) => ({ ...it, [field]: value }))
      }))
    );
  const applySupplierChange = (gIdx, supplierId) =>
    setGroups((prev) =>
      mapAt(prev, gIdx, () => ({ supplier: supplierId, items: [{ ...EMPTY_ITEM }] }))
    );

  const pickGroupSupplier = (gIdx, value) => {
    const supplierId = value ? Number(value) : null;
    const isSameSupplier = (groups.at(gIdx)?.supplier || null) === supplierId;
    if (groupHasFilledItems(gIdx) && !isSameSupplier) {
      setSupplierChange({ gIdx, supplierId });
      return;
    }
    applySupplierChange(gIdx, supplierId);
  };

  const clearGroupSupplier = (gIdx) => {
    if (groupHasFilledItems(gIdx)) {
      setSupplierRemove({ gIdx });
      return;
    }
    applySupplierChange(gIdx, null);
  };

  const requestRemoveItem = (gIdx, iIdx) => {
    if ((groups.at(gIdx)?.items || []).length > 1) {
      setItemRemove({ gIdx, iIdx });
      return;
    }
    removeItem(gIdx, iIdx);
  };

  const requestRemoveGroup = (gIdx) => {
    if (groups.length > 1) {
      setGroupRemove({ gIdx });
      return;
    }
    removeGroup(gIdx);
  };

  const pickItemOption = (gIdx, iIdx, value) =>
    setGroups((prev) =>
      mapAt(prev, gIdx, (g) => {
        const option = supplierItems(g.supplier).find((o) => o.value === value);
        return { ...g, items: mapAt(g.items, iIdx, (it) => pickedItem(it, option)) };
      })
    );

  const confirmations = {
    supplierChange,
    supplierRemove,
    itemRemove,
    groupRemove,
    dismissSupplierChange: () => setSupplierChange(null),
    dismissSupplierRemove: () => setSupplierRemove(null),
    dismissItemRemove: () => setItemRemove(null),
    dismissGroupRemove: () => setGroupRemove(null),
    confirmSupplierChange: () => {
      if (supplierChange) applySupplierChange(supplierChange.gIdx, supplierChange.supplierId);
      setSupplierChange(null);
    },
    confirmSupplierRemove: () => {
      if (supplierRemove) applySupplierChange(supplierRemove.gIdx, null);
      setSupplierRemove(null);
    },
    confirmItemRemove: () => {
      if (itemRemove) removeItem(itemRemove.gIdx, itemRemove.iIdx);
      setItemRemove(null);
    },
    confirmGroupRemove: () => {
      if (groupRemove) removeGroup(groupRemove.gIdx);
      setGroupRemove(null);
    }
  };

  return {
    groups,
    setGroups,
    supplierOptions,
    supplierItems,
    filledItems,
    selectedItemValue,
    itemOptionsForRow,
    addGroup,
    addItem,
    updateItem,
    pickGroupSupplier,
    clearGroupSupplier,
    requestRemoveItem,
    requestRemoveGroup,
    pickItemOption,
    confirmations
  };
};

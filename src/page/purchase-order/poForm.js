import { z } from "zod";

export const EMPTY_ITEM = {
  name: "",
  product: null,
  productName: null,
  ingredient: null,
  ingredientName: null,
  qty: 1,
  unit: "pcs",
  price: 0,
  conversionToBase: 1
};

export const emptyGroup = () => ({ supplier: null, items: [{ ...EMPTY_ITEM }] });

export const UNIT_OPTIONS = [
  "pcs",
  "item",
  "unit",
  "buah",
  "pasang",
  "set",
  "lusin",
  "pack",
  "box",
  "karton",
  "kg",
  "gram",
  "liter",
  "ml",
  "meter",
  "cm",
  "cup",
  "gelas",
  "porsi"
].map((unit) => ({ value: unit, label: unit }));

export const DEFAULT_OVER_DELIVERY_TOLERANCE = 10;
const PERCENT = 100;

export const formatIDR = (num) => {
  if (!num && num !== 0) return "";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

export const parseIDR = (str) => {
  if (!str) return 0;
  return Number(str.replace(/[^0-9]/g, "")) || 0;
};

export const parseDecimal = (str) =>
  Number(str.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")) || 0;

export const buildPoFieldLabels = (t) => ({
  store: t("page.purchaseOrder.add.store"),
  pic: t("page.purchaseOrder.add.pic"),
  orderDate: t("page.purchaseOrder.add.poDate"),
  orderTime: t("page.purchaseOrder.add.time"),
  dueDate: t("page.purchaseOrder.add.dueDate"),
  items: t("page.purchaseOrder.add.itemSection")
});

export const buildPoSchema = (t, { isPicRequired }) =>
  z.object({
    store: z.number().min(1, t("page.purchaseOrder.add.validation.store")),
    pic: isPicRequired ? z.number().min(1, "") : z.number().optional().nullable(),
    orderDate: z.date({ required_error: t("page.purchaseOrder.add.validation.orderDate") }),
    orderTime: z.string().min(1, t("page.purchaseOrder.add.validation.orderTime")),
    dueDate: z.date().nullable().optional(),
    items: z
      .array(
        z.object({
          name: z.string().min(1, t("page.purchaseOrder.add.validation.itemName")),
          qty: z.number().min(1, t("page.purchaseOrder.add.validation.qty")),
          price: z.number().min(0, t("page.purchaseOrder.add.validation.price")),
          unit: z.string().min(1)
        })
      )
      .min(1, t("page.purchaseOrder.add.validation.minItem"))
  });

export const poSchemaInput = ({ selectedStore, picId, orderDate, orderTime, dueDate }, items) => ({
  store: Number(selectedStore) || 0,
  pic: picId,
  orderDate,
  orderTime,
  dueDate,
  items: items.map((it) => ({ name: it.name, qty: it.qty, price: it.price, unit: it.unit }))
});

export const combineDateTime = (date, time) => {
  const combined = new Date(date);
  const [hours, minutes] = (time || "00:00").split(":");
  combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return combined;
};

export const isFilledItem = (item) => Boolean(item.name.trim());

export const filledItemsOf = (groups) =>
  groups.flatMap((g) =>
    g.items.filter(isFilledItem).map((it) => ({ ...it, supplier: g.supplier }))
  );

export const hasDuplicateItems = (items) => {
  const seen = new Set();
  return items.some((it) => {
    const key = `${it.product || it.ingredient || it.name.toLowerCase()}-sup-${it.supplier || ""}`;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
};

export const buildItemsPayload = (groups, isDraft) =>
  groups.flatMap((g) =>
    g.items
      .filter((it) => isDraft || isFilledItem(it))
      .map((it) => ({
        product: it.product || null,
        ingredient: it.ingredient || null,
        ingredientName: it.ingredientName || it.productName || it.name || null,
        quantity: it.qty,
        price: it.price || 0,
        unit: it.unit || "pcs",
        conversionToBase: Number(it.conversionToBase) || 1,
        supplier: g.supplier || null
      }))
  );

export const poTotals = ({ groups, discount, taxRate, additionalCost }) => {
  const totalAmount = groups
    .flatMap((g) => g.items)
    .reduce((sum, item) => sum + item.qty * item.price, 0);
  const taxableBase = totalAmount - discount;
  const taxAmount = Math.round(taxableBase * ((Number(taxRate) || 0) / PERCENT));
  const finalAmount = taxableBase + taxAmount + additionalCost;
  const hasAdjustments = discount > 0 || taxAmount > 0 || additionalCost > 0;
  return { totalAmount, taxAmount, finalAmount, hasAdjustments };
};

export const isDiscountOverTotal = ({ discount, totalAmount }) => discount > totalAmount;

export const groupsFromOrderItems = (items) => {
  const bySupplier = new Map();
  items.forEach((item) => {
    const supplierId = item.supplier || null;
    if (!bySupplier.has(supplierId)) bySupplier.set(supplierId, []);
    bySupplier.get(supplierId).push({
      name: item.ingredientName || item.productData?.nameProduct || "",
      product: item.product || null,
      productName: item.productData?.nameProduct || null,
      ingredient: item.ingredient || null,
      ingredientName: item.ingredientName || null,
      qty: Math.round(item.quantity) || 1,
      price: item.price,
      unit: item.unit || "pcs",
      conversionToBase: item.conversionToBase || 1
    });
  });
  return [...bySupplier.entries()].map(([supplierId, groupItems]) => ({
    supplier: supplierId === null ? null : Number(supplierId),
    items: groupItems
  }));
};

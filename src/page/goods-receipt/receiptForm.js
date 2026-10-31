export const MAX_RECEIPT_DOCS = 5;
export const MAX_RECEIPT_DOC_BYTES = 5 * 1024 * 1024;

export const validReceiptItems = (items) =>
  items.filter((it) => parseFloat(it.qtyReceived) > 0 && (it.ingredientName || it.ingredient));

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const isBeforePoDate = (receivedDate, poOrderDate) => {
  if (!poOrderDate || !(receivedDate instanceof Date)) return false;
  return startOfDay(receivedDate) < startOfDay(new Date(poOrderDate));
};

export const receiptItemsPayload = (items) =>
  items.map((it) => ({
    purchaseOrderItem: it.purchaseOrderItem || null,
    ingredient: it.ingredient,
    ingredientName: it.ingredientName,
    product: it.product,
    qtyReceived: parseFloat(it.qtyReceived),
    unit: it.unit,
    conditionNotes: it.conditionNotes,
    batchNumber: it.batchNumber?.trim() || null,
    expiryDate: it.expiryDate || null,
    costPrice: parseFloat(it.costPrice) || 0,
    conversionToBase: parseFloat(it.conversionToBase) || 1
  }));

export const parseQtyInput = (value) => value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

export const cappedQty = (raw, max) => (parseFloat(raw) > max ? String(max) : raw);

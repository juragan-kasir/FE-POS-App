const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const matchesProductCode = (product, code) => {
  const wanted = normalizeCode(code);
  if (!wanted || !product) return false;
  return normalizeCode(product.sku) === wanted || normalizeCode(product.barcode) === wanted;
};

export const productTextMatches = (product, query) => {
  const q = normalizeCode(query);
  if (!q) return true;
  const name = normalizeCode(product?.nameProduct || product?.name);
  return (
    name.includes(q) ||
    normalizeCode(product?.sku).includes(q) ||
    normalizeCode(product?.barcode).includes(q)
  );
};

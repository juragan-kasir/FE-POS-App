// W3-4 (DR-11, W3-2 contract): builds /order/create `items` from checkout
// lines and parses the 409 PRICE_CHANGED rejection.
//
// - expectedPrice echoes the server-authoritative unit price the cashier saw
//   (catalog effectivePrice + option/modifier markup, or bundlePrice). It is
//   only sent for authoritative, non-overridden integer prices — never
//   manufactured from a legacy/base price.
// - An admin price override sends priceOverride and no expectedPrice (the
//   server exempts overrides from the comparison).
// - Bundles are sent as bundleId (never as a pseudo product id) and never
//   carry priceOverride (the server rejects bundle overrides).
// - Options and modifiers are sent as separate arrays so the server's
//   base + markup price matches what the cashier was shown.

const isValidExpectedPrice = (price) => Number.isInteger(price) && price >= 0;

const namesOf = (list) =>
  Array.isArray(list)
    ? list.filter((entry) => entry && entry.name).map((entry) => ({ name: entry.name }))
    : null;

export const buildOrderItemsPayload = (items = []) =>
  items.map((item) => {
    const price = Number(item.price);
    const quantity = item.count;
    const subtotal = item.totalPrice;

    if (item.isBundle && item.bundleId !== undefined && item.bundleId !== null) {
      return {
        bundleId: item.bundleId,
        bundleName: item.nameProduct,
        quantity,
        price,
        subtotal,
        ...(isValidExpectedPrice(price) ? { expectedPrice: price } : {})
      };
    }

    const options =
      namesOf(item.selectedOptions) ?? (item.variantName ? [{ name: item.variantName }] : []);
    const modifiers = namesOf(item.selectedModifiers) ?? [];
    const enrollExpected =
      !item.priceOverridden && item.priceAuthoritative === true && isValidExpectedPrice(price);

    return {
      product: item.product || item.idProduct || item.id,
      productName: item.nameProduct,
      quantity,
      ...(item.priceOverridden ? { priceOverride: item.price } : {}),
      ...(enrollExpected ? { expectedPrice: price } : {}),
      price: item.price,
      basePrice: item.price,
      subtotal,
      options,
      modifiers
    };
  });

export const orderLinesSignature = (items = []) => JSON.stringify(buildOrderItemsPayload(items));

// Returns null unless the error is the W3-2 409 PRICE_CHANGED contract.
// `submittedLines` are the checkout lines in the exact order they were sent;
// the server's `index` addresses that order. A line is only mapped back to a
// cart key when its identity matches the server's productId/bundleId.
export const parsePriceChangedError = (err, submittedLines = []) => {
  const response = err?.response;
  const data = response?.data;
  if (response?.status !== 409 || data?.code !== "PRICE_CHANGED" || !Array.isArray(data.items)) {
    return null;
  }
  return {
    message: data.message || "",
    items: data.items.map((mismatch) => {
      const line = submittedLines[mismatch.index];
      const matches =
        line &&
        (mismatch.bundleId !== undefined && mismatch.bundleId !== null
          ? line.isBundle && String(line.bundleId) === String(mismatch.bundleId)
          : !line.isBundle &&
            String(line.product || line.idProduct || line.id) === String(mismatch.productId));
      return {
        index: mismatch.index,
        cartKey: matches ? line.cartKey : null,
        name: matches ? line.nameProduct : null,
        variantName: matches ? line.variantName || null : null,
        expectedPrice: Number(mismatch.expectedPrice),
        currentPrice: Number(mismatch.currentPrice)
      };
    })
  };
};

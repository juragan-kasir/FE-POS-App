// F9-25: per-store prices are edited in local state and only reach the
// backend through each row's Save button. Comparing every row against the
// last-persisted value lets the edit form refuse to silently discard edits
// when the main product save is submitted instead.
export const getUnsavedStorePriceRows = (storePrices = [], savedStorePriceMap = {}) => {
  return storePrices.filter((sp) => {
    if (sp.storeId == null || sp.storeId === "") return false;
    // A store without its own price yet: unsaved once something is typed.
    if (!(sp.storeId in savedStorePriceMap)) return String(sp.price ?? "") !== "";
    return String(savedStorePriceMap[sp.storeId]) !== String(sp.price ?? "");
  });
};

export const buildSavedStorePriceMap = (rows = []) => {
  const saved = {};
  rows.forEach((sp) => {
    if (sp.storeId != null && sp.storeId !== "") saved[sp.storeId] = sp.price;
  });
  return saved;
};

// The server returns only stores that already have their own price. One
// row per visible store, so a store still on the base price can get one;
// its price is "" until then. Saved prices for stores not in the list are
// kept.
export const mergeStorePriceRows = (locations = [], savedRows = []) => {
  const byStore = new Map(savedRows.map((sp) => [String(sp.storeId), sp]));
  const rows = locations.map((loc) => {
    const saved = byStore.get(String(loc.id));
    byStore.delete(String(loc.id));
    return {
      storeId: saved ? saved.storeId : loc.id,
      storeName: loc.name || saved?.storeName || String(loc.id),
      price: saved ? saved.price : ""
    };
  });
  return [...rows, ...byStore.values()];
};

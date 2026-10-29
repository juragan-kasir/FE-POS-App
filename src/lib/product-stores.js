// The stores a product is saved to. "Semua Toko" (allStores) used to be sent
// as an empty list, which the server reads as "assigned to no store" and
// rejects for a sellable product ("a sellable product must be assigned to at
// least one store of one tenant"). It now means every store the user can
// see — for a single-store account, that one store.
export const storesForSave = ({ allStores, selectedStores, locations, userStore }) => {
  if (!allStores) return selectedStores;
  const visible = (locations || []).map((loc) => loc.id).filter((id) => id != null);
  if (visible.length > 0) return visible;
  return userStore ? [userStore] : [];
};

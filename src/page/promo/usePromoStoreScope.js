import { useState } from "react";

export const usePromoStoreScope = ({ isSuperAdmin, fallbackStore, onScopeChange }) => {
  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const effectiveStore = allStores ? null : selectedStores[0] || fallbackStore || null;
  const isStoreReady = !isSuperAdmin || allStores || selectedStores.length > 0;

  const handleStoreChange = (stores) => {
    setSelectedStores(stores);
    if (stores.length > 0) setAllStores(false);
    onScopeChange();
  };

  const handleAllStoresChange = (value) => {
    setAllStores(value);
    if (value) setSelectedStores([]);
    onScopeChange();
  };

  const hydrateStore = (store) => {
    if (store) {
      setSelectedStores([store]);
      setAllStores(false);
      return;
    }
    if (!isSuperAdmin) return;
    setSelectedStores([]);
    setAllStores(true);
  };

  return {
    selectedStores,
    allStores,
    effectiveStore,
    isStoreReady,
    handleStoreChange,
    handleAllStoresChange,
    hydrateStore
  };
};

import { useState } from "react";
import { useTranslation } from "react-i18next";

// State and handlers behind step 3 of the product form (variants, add-ons,
// price tiers, images), shared by Tambah and Edit Produk. Edit fills the
// state from the loaded product through the returned setters.
export const useProductExtras = (form, setConfirmAction) => {
  const { t } = useTranslation();
  const [variantGroups, setVariantGroups] = useState([]);
  const [modifierItems, setModifierItems] = useState([]);
  const [priceTiers, setPriceTiers] = useState([]);
  const [productImages, setProductImages] = useState([]);

  const handleProductImagesChange = (updater) => {
    setProductImages(updater);
  };

  const addVariantGroup = () => {
    setVariantGroups((prev) => [
      ...prev,
      { id: Date.now(), name: "", options: [{ name: "", price: 0, stock: 0 }] }
    ]);
    form.setValue("isOption", true);
  };

  const removeVariantGroup = (id) => {
    setVariantGroups((prev) => prev.filter((g) => g.id !== id));
    if (variantGroups.length <= 1) {
      form.setValue("isOption", false);
    }
  };

  const updateVariantGroup = (id, field, value) => {
    setVariantGroups((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const addVariantOption = (groupId) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, { name: "", price: 0, stock: 0 }] } : g
      )
    );
  };

  const updateVariantOption = (groupId, index, field, value) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
            }
          : g
      )
    );
  };

  const removeVariantOption = (groupId, index) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: g.options.filter((_, i) => i !== index) } : g
      )
    );
  };

  const addModifierItem = () => {
    setModifierItems((prev) => [...prev, { id: Date.now(), name: "", price: 0 }]);
    form.setValue("hasModifiers", true);
  };

  const updateModifierItem = (id, field, value) => {
    setModifierItems((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const removeModifierItem = (id) => {
    setModifierItems((prev) => prev.filter((m) => m.id !== id));
    if (modifierItems.length <= 1) {
      form.setValue("hasModifiers", false);
    }
  };

  const addPriceTier = () => {
    setPriceTiers((prev) => [...prev, { id: Date.now(), name: "", price: 0 }]);
  };

  const updatePriceTier = (id, field, value) => {
    setPriceTiers((prev) =>
      prev.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier))
    );
  };

  const removePriceTier = (id) => {
    setPriceTiers((prev) => prev.filter((tier) => tier.id !== id));
  };

  const handleToggleOption = (checked) => {
    if (!checked && variantGroups.length > 0) {
      setConfirmAction({
        title: t("page.product.form.confirmDisableVariantTitle"),
        description: t("page.product.form.confirmDisableVariantDesc"),
        onConfirm: () => {
          form.setValue("isOption", false);
          setVariantGroups([]);
        }
      });
      return;
    }
    form.setValue("isOption", checked);
    if (!checked) setVariantGroups([]);
  };

  const handleToggleModifier = (checked) => {
    if (!checked && modifierItems.length > 0) {
      setConfirmAction({
        title: t("page.product.form.confirmDisableModifierTitle"),
        description: t("page.product.form.confirmDisableModifierDesc"),
        onConfirm: () => {
          form.setValue("hasModifiers", false);
          setModifierItems([]);
        }
      });
      return;
    }
    form.setValue("hasModifiers", checked);
    if (!checked) setModifierItems([]);
  };

  const confirmRemove = (onConfirm, count) => {
    if (count > 1) {
      setConfirmAction({
        title: t("page.product.form.confirmDeleteTitle"),
        description: t("page.product.form.confirmDeleteDesc"),
        onConfirm
      });
      return;
    }
    onConfirm();
  };

  return {
    variantGroups,
    setVariantGroups,
    modifierItems,
    setModifierItems,
    priceTiers,
    setPriceTiers,
    productImages,
    setProductImages,
    handleProductImagesChange,
    addVariantGroup,
    removeVariantGroup,
    updateVariantGroup,
    addVariantOption,
    updateVariantOption,
    removeVariantOption,
    addModifierItem,
    updateModifierItem,
    removeModifierItem,
    addPriceTier,
    updatePriceTier,
    removePriceTier,
    handleToggleOption,
    handleToggleModifier,
    confirmRemove
  };
};

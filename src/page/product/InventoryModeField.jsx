import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  INVENTORY_MODES,
  RETIRED_INVENTORY_MODES,
  selectableInventoryModes,
  usesRecipeMode
} from "@/lib/inventory-mode";

const P = "page.product.form.inventoryMode";

// Product fulfillment strategy picker (see lib/inventory-mode). `savedMode`
// is the product's stored mode: a retired mode (hybrid) is offered only to
// the product that already has it.
const InventoryModeField = ({ value, onChange, productId, savedMode = null }) => {
  const { t } = useTranslation();
  const mode = INVENTORY_MODES.includes(value) ? value : "stocked";
  const usesRecipe = usesRecipeMode(mode);
  const options = selectableInventoryModes(savedMode);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{t(`${P}.label`)}</legend>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
              mode === option ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
            }`}>
            <input
              type="radio"
              name="inventoryMode"
              value={option}
              checked={mode === option}
              onChange={() => onChange(option)}
              className="mt-0.5 accent-primary"
            />
            <span className="space-y-0.5">
              <span className="block font-medium text-foreground">{t(`${P}.${option}`)}</span>
              <span className="block text-xs text-muted-foreground">{t(`${P}.${option}Desc`)}</span>
            </span>
          </label>
        ))}
      </div>
      {options.some((o) => RETIRED_INVENTORY_MODES.includes(o)) && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="note">
          {t(`${P}.hybridRetired`)}
        </p>
      )}
      {usesRecipe && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="note">
          {t(`${P}.recipeRequired`)}{" "}
          {productId ? (
            <Link
              to={`/bom/add?productId=${productId}`}
              className="font-medium text-primary underline-offset-2 hover:underline">
              {t(`${P}.recipeLink`)}
            </Link>
          ) : (
            t(`${P}.recipeAfterSave`)
          )}
        </p>
      )}
    </fieldset>
  );
};

InventoryModeField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  savedMode: PropTypes.string
};

export default InventoryModeField;

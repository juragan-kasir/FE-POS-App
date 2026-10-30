import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// How many base units one sale unit holds. With the same unit on both sides
// it is 1 and not editable. The reset to 1 used to be a useEffect inside the
// FormField render callback (a hook outside a component); it lives in this
// component now, so it still runs only while the field is shown.
const ConversionFactorInput = ({ field, unit, baseUnit }) => {
  const { t } = useTranslation();
  const factor = field.value || 1;
  const isSameUnit = unit === baseUnit;

  useEffect(() => {
    if (isSameUnit && field.value !== 1) {
      field.onChange(1);
    }
  }, [isSameUnit, field.value]);

  return (
    <FormItem>
      <FormLabel>{t("page.product.form.conversionFactor")}</FormLabel>
      <Input type="number" min="1" {...field} disabled={isSameUnit} placeholder="1" />
      <p className="text-xs font-medium text-primary mt-1.5 flex items-center gap-1.5 bg-primary/5 p-2 rounded-md border border-primary/10">
        <Info size={14} />
        {isSameUnit
          ? t("page.product.form.sameUnitHelper")
          : `1 ${unit || "Satuan"} = ${factor} ${baseUnit || "Satuan Dasar"}`}
      </p>
      <FormMessage />
    </FormItem>
  );
};

ConversionFactorInput.propTypes = {
  field: PropTypes.object.isRequired,
  unit: PropTypes.string,
  baseUnit: PropTypes.string
};

const ConversionFactorField = ({ form }) => (
  <FormField
    control={form.control}
    name="conversionFactor"
    render={({ field }) => (
      <ConversionFactorInput
        field={field}
        unit={form.watch("unit")}
        baseUnit={form.watch("baseUnit")}
      />
    )}
  />
);

ConversionFactorField.propTypes = {
  form: PropTypes.object.isRequired
};

export default ConversionFactorField;

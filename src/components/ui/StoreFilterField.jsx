import React from "react";
import StoreFilter from "@/components/ui/StoreFilter";

const FIELD_CLASS = "flex flex-col gap-1.5";
const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const StoreFilterField = ({
  id,
  label,
  locations = [],
  value = "",
  onChange,
  isSuperAdmin,
  t,
  children,
  className = FIELD_CLASS,
  labelClassName = LABEL_CLASS
}) => {
  if (!isSuperAdmin || locations.length <= 1) return null;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {children ?? (
        <StoreFilter
          id={id}
          locations={locations}
          value={value}
          onChange={onChange}
          isSuperAdmin={isSuperAdmin}
          t={t}
        />
      )}
    </div>
  );
};

export default StoreFilterField;

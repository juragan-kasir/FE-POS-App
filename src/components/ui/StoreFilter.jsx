import React from "react";
import { Store } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const stripLoc = (v) => (v ? String(v).replace(/^loc-0*/, "") : v);

const StoreFilter = ({ locations = [], value = "", onChange, isSuperAdmin, t }) => {
  // With one store there is nothing to filter between.
  if (!isSuperAdmin || locations.length <= 1) return null;

  const currentValue = value === "all" ? "all" : stripLoc(value);

  const handleChange = (val) => {
    onChange(val === "all" ? "all" : stripLoc(val));
  };

  return (
    <div className="flex items-center gap-2">
      <Store size={16} className="text-muted-foreground shrink-0" />
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t?.("header.selectStore") || "Pilih Toko"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t?.("page.category.form.storeSection.allStores") || "Semua Toko"}
          </SelectItem>
          {locations.map((loc) => {
            const numId = stripLoc(loc.id);
            return (
              <SelectItem key={loc.id} value={numId}>
                {loc.name || loc.storeName || `Toko #${numId}`}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StoreFilter;

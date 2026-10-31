import React from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { FormField } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

const SupplierStatusField = ({ form }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("page.supplier.form.status")}</h3>
        <div
          className={`flex items-center justify-between p-4 rounded-lg ${
            form.watch("isActive")
              ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
          }`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                form.watch("isActive")
                  ? "bg-green-600 text-secondary"
                  : "bg-destructive/10 text-destructive"
              }`}>
              {form.watch("isActive") ? (
                <Check size={20} />
              ) : (
                <span className="text-lg font-bold">⏻</span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {form.watch("isActive") ? t("common.active") : t("common.inactive")}
              </p>
              <p className="text-xs text-muted-foreground">
                {form.watch("isActive")
                  ? t("page.supplier.form.activeDescription")
                  : t("page.supplier.form.inactiveDescription")}
              </p>
            </div>
          </div>
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </>
  );
};

export default SupplierStatusField;

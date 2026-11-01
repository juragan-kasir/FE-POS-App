import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const RestockChoice = ({ checked, onChange }) => {
  const { t } = useTranslation();
  return (
    <Card className="p-6 space-y-2">
      <div className="flex items-start gap-3">
        <Checkbox
          id="create-sales-return-restock"
          checked={checked}
          onCheckedChange={(value) => onChange(value === true)}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <label htmlFor="create-sales-return-restock" className="text-sm font-semibold">
            {t("page.salesReturn.create.restockLabel")}
          </label>
          <p className="text-xs text-muted-foreground">
            {t(
              checked
                ? "page.salesReturn.create.restockOnHint"
                : "page.salesReturn.create.restockOffHint"
            )}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default RestockChoice;

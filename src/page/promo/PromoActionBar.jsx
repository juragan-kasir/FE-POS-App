import React from "react";
import { useTranslation } from "react-i18next";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PromoActionBar = ({ onBack, onSaveDraft, onSave, isSaving }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="gap-2 w-full sm:w-auto justify-center">
        <X size={18} />
        {t("breadcrumb.back")}
      </Button>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Button
          type="button"
          variant="draft"
          className="w-full sm:w-auto justify-center"
          onClick={onSaveDraft}
          disabled={isSaving}>
          {t("page.discount.add.saveAsDraft")}
        </Button>
        <Button
          variant="success"
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="gap-2 w-full sm:w-auto justify-center">
          <Save size={18} />
          {isSaving ? t("button.saving") : t("button.save")}
        </Button>
      </div>
    </div>
  );
};

export default PromoActionBar;

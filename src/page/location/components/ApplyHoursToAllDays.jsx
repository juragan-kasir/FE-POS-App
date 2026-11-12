import React from "react";
import { useTranslation } from "react-i18next";
import { CopyCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyHoursToAllDays } from "@/utils/openingHours";

const ApplyHoursToAllDays = ({ form, sourceDay, sourceLabel }) => {
  const { t } = useTranslation();
  const handleApply = () =>
    form.setValue("openingHours", copyHoursToAllDays(form.getValues("openingHours"), sourceDay), {
      shouldDirty: true
    });

  return (
    <div className="flex justify-end mb-2">
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleApply}>
        <CopyCheck size={14} aria-hidden="true" />
        {t("page.location.form.applyHoursToAllDays", { day: t(sourceLabel) })}
      </Button>
    </div>
  );
};

export default ApplyHoursToAllDays;

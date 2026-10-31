import React from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { DAY_LABELS } from "./promoForm";
import { usePromoTypeFlags } from "./usePromoTypeFlags";

const DEFAULT_HAPPY_HOUR_START = "15:00";
const DEFAULT_HAPPY_HOUR_END = "17:00";

const PromoScheduleTab = ({ idPrefix, form, schedule }) => {
  const { t } = useTranslation();
  const { isHappyHour } = usePromoTypeFlags(form);

  return (
    <>
      {isHappyHour && (
        <p className="text-xs text-muted-foreground">{t("page.promo.ui.setTheStartAndEnd")}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor={`${idPrefix}-promo-campaign-start-date`}>
            {t("page.promo.form.startDate")} <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            id={`${idPrefix}-promo-campaign-start-date`}
            date={schedule.startDate}
            setDate={schedule.changeStartDate}
            placeholder={t("page.promo.form.startDate")}
          />
        </div>
        <div className="flex flex-col justify-end">
          <TimePicker value={schedule.startTime} onChange={schedule.changeStartTime} />
        </div>
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor={`${idPrefix}-promo-campaign-end-date`}>
            {t("page.promo.form.endDate")} <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            id={`${idPrefix}-promo-campaign-end-date`}
            date={schedule.endDate}
            setDate={schedule.changeEndDate}
            minDate={schedule.startDate || undefined}
            disabled={!schedule.startDate}
            placeholder={
              !schedule.startDate
                ? t("page.bundle.form.validFromFirst")
                : t("page.promo.form.endDate")
            }
          />
        </div>
        <div className="flex flex-col justify-end">
          <TimePicker
            value={schedule.endTime}
            onChange={schedule.changeEndTime}
            disabled={!schedule.startDate}
          />
        </div>
        {isHappyHour && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-promo-campaign-start-time`}>
                {t("page.promo.form.startTime")}
              </Label>
              <TimePicker
                id={`${idPrefix}-promo-campaign-start-time`}
                value={form.watch("startTime") || DEFAULT_HAPPY_HOUR_START}
                onChange={(v) => form.setValue("startTime", v)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-promo-campaign-end-time`}>
                {t("page.promo.form.endTime")}
              </Label>
              <TimePicker
                id={`${idPrefix}-promo-campaign-end-time`}
                value={form.watch("endTime") || DEFAULT_HAPPY_HOUR_END}
                onChange={(v) => form.setValue("endTime", v)}
              />
            </div>
          </>
        )}
      </div>
      {isHappyHour && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p id="promo-active-days" className="font-medium leading-none text-xs">
            {t("page.promo.ui.activeDays")}
          </p>
          <div role="group" aria-labelledby="promo-active-days" className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => schedule.toggleDay(day)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  (schedule.daysOfWeek || []).includes(day)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("page.promo.ui.leaveEmptyToApplyEvery")}
          </p>
        </div>
      )}
    </>
  );
};

export default PromoScheduleTab;

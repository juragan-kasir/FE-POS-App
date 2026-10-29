"use client";

import * as React from "react";
import i18next from "i18next";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

function DatePicker({
  id,
  date,
  setDate,
  placeholder = "Pilih tanggal",
  className,
  disabled = false,
  // C10: a per-day disable predicate for the popover Calendar, distinct from
  // `disabled` (a boolean that only ever disabled the trigger Button). A
  // caller previously had no way to pass one — the Calendar's own `disabled`
  // prop was hardcoded to `isBeforeMinDate` — so callers that tried using
  // `disabled` as that predicate instead got a truthy function object on the
  // Button's boolean prop, permanently disabling the trigger.
  disabledDates,
  fromYear = 1945,
  toYear = 2999,
  captionLayout = "dropdown",
  minDate,
  ...rest
}) {
  const isValidDate = date instanceof Date && !isNaN(date.getTime());
  const [month, setMonth] = React.useState(isValidDate ? date : new Date());

  React.useEffect(() => {
    if (date instanceof Date && !isNaN(date.getTime())) setMonth(date);
  }, [date]);

  const handleClear = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDate(null);
  };

  const isBeforeMinDate = (d) => {
    if (!minDate || !(minDate instanceof Date)) return false;
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const minOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return dateOnly < minOnly;
  };

  return (
    <div className={cn("relative", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10 pr-8",
              !isValidDate && "text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}>
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {isValidDate ? format(date, "dd MMM yyyy") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 overflow-visible" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d && isBeforeMinDate(d)) return;
              setDate(d);
              if (d) setMonth(d);
            }}
            month={month}
            onMonthChange={setMonth}
            disabled={(d) =>
              isBeforeMinDate(d) || (typeof disabledDates === "function" && disabledDates(d))
            }
            initialFocus
            captionLayout={captionLayout}
            fromYear={fromYear}
            toYear={toYear}
            {...rest}
          />
        </PopoverContent>
      </Popover>
      {isValidDate && !disabled && (
        <button
          aria-label={i18next.t("common.clear")}
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer z-10">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export { DatePicker };

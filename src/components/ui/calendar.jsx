"use client";
import * as React from "react";
import i18next from "i18next";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  getYear,
  getMonth,
  setMonth,
  setYear
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { ScrollArea } from "./scroll-area";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function generateYears(fromYear, toYear) {
  const years = [];
  for (let y = fromYear; y <= toYear; y++) years.push(y);
  return years;
}

function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  month: monthProp,
  onMonthChange,
  showOutsideDays = true,
  captionLayout = "label",
  fromYear = 1900,
  toYear = 2100,
  numberOfMonths = 1,
  defaultMonth,
  disabled,
  ...props
}) {
  const [internalMonth, setInternalMonth] = React.useState(monthProp || defaultMonth || new Date());
  const month = monthProp || internalMonth;

  const setMonthSafe = (m) => {
    if (!monthProp) setInternalMonth(m);
    onMonthChange?.(m);
  };

  const handlePrevMonth = () => setMonthSafe(subMonths(month, 1));
  const handleNextMonth = () => setMonthSafe(addMonths(month, 1));

  const months = Array.from({ length: numberOfMonths }, (_, i) => addMonths(month, i));

  return (
    <div className={cn("p-3", className)} {...props}>
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0">
        {months.map((currentMonth, monthIndex) => (
          <CalendarMonth
            key={monthIndex}
            month={currentMonth}
            selected={selected}
            onSelect={onSelect}
            mode={mode}
            showOutsideDays={showOutsideDays}
            captionLayout={captionLayout}
            fromYear={fromYear}
            toYear={toYear}
            onPrevMonth={monthIndex === 0 ? handlePrevMonth : undefined}
            onNextMonth={monthIndex === months.length - 1 ? handleNextMonth : undefined}
            onMonthChange={setMonthSafe}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarMonth({
  month,
  selected,
  onSelect,
  mode,
  showOutsideDays,
  captionLayout,
  fromYear,
  toYear,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
  disabled
}) {
  const years = React.useMemo(() => generateYears(fromYear, toYear), [fromYear, toYear]);
  const currentYear = getYear(month);
  const currentMonthIdx = getMonth(month);

  const weeks = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const handleSelectDay = (day) => {
    if (mode === "single") {
      onSelect?.(day);
    } else if (mode === "range") {
      if (!selected?.from || (selected.from && selected.to)) {
        onSelect?.({ from: day, to: undefined });
      } else if (selected.from && !selected.to) {
        if (day < selected.from) {
          onSelect?.({ from: day, to: selected.from });
        } else {
          onSelect?.({ from: selected.from, to: day });
        }
      }
    }
  };

  const isDaySelected = (day) => {
    if (!selected) return false;
    if (mode === "single") return isSameDay(day, selected);
    if (mode === "range") {
      if (selected.from && isSameDay(day, selected.from)) return true;
      if (selected.to && isSameDay(day, selected.to)) return true;
      if (
        selected.from &&
        selected.to &&
        isWithinInterval(day, { start: selected.from, end: selected.to })
      )
        return true;
    }
    return false;
  };

  const isDayRangeMiddle = (day) => {
    if (mode !== "range" || !selected?.from || !selected?.to) return false;
    return day > selected.from && day < selected.to;
  };

  const isRangeEnd = (day) => {
    if (mode !== "range" || !selected?.to) return false;
    return isSameDay(day, selected.to);
  };

  const captionLabel = `${MONTHS.at(currentMonthIdx)} ${currentYear}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-center pt-1 relative items-center">
        {captionLayout === "dropdown" ? (
          <div className="flex items-center gap-1">
            <Select
              value={currentMonthIdx.toString()}
              onValueChange={(val) => {
                const newDate = setMonth(month, parseInt(val));
                onMonthChange?.(newDate);
              }}>
              <SelectTrigger className="w-[110px] h-8 text-sm font-medium">
                <SelectValue>{MONTHS.at(currentMonthIdx)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <ScrollArea className="h-80">
                  {MONTHS.map((m, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            <Select
              value={currentYear.toString()}
              onValueChange={(val) => {
                const newDate = setYear(month, parseInt(val));
                onMonthChange?.(newDate);
              }}>
              <SelectTrigger className="w-[75px] h-8 text-sm font-medium">
                <SelectValue>{currentYear}</SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <ScrollArea className="h-80">
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="text-sm font-medium">{captionLabel}</span>
        )}

        <div className="space-x-1 flex items-center absolute left-1">
          {onPrevMonth && (
            <button
              type="button"
              aria-label={i18next.t("common.previousMonth")}
              onClick={onPrevMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              )}>
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="space-x-1 flex items-center absolute right-1">
          {onNextMonth && (
            <button
              type="button"
              aria-label={i18next.t("common.nextMonth")}
              onClick={onNextMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              )}>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="flex">
            {WEEKDAYS.map((day) => (
              <th
                key={day}
                className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(weeks.length / 7) }, (_, weekIdx) => {
            const weekDays = weeks.slice(weekIdx * 7, weekIdx * 7 + 7);
            return (
              <tr key={weekIdx} className="flex w-full mt-2">
                {weekDays.map((day, dayIdx) => {
                  const isOutside = !isSameMonth(day, month);
                  const isSelected = isDaySelected(day);
                  const isToday = isSameDay(day, new Date());
                  const isRangeMiddle = isRangeEnd(day) ? false : isDayRangeMiddle(day);
                  const isDisabled = disabled ? disabled(day) : false;

                  return (
                    <td
                      key={dayIdx}
                      className={cn(
                        "text-center text-sm p-0 relative h-9 w-9",
                        isSelected && "bg-accent first:rounded-l-md last:rounded-r-md",
                        isRangeMiddle && "bg-accent",
                        isOutside && !showOutsideDays && "invisible"
                      )}>
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleSelectDay(day)}
                        disabled={isDisabled || (isOutside && !showOutsideDays)}
                        className={cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-9 w-9 p-0 font-normal",
                          isSelected &&
                            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          isToday && !isSelected && "bg-accent text-accent-foreground",
                          isOutside && "text-muted-foreground opacity-50",
                          isRangeMiddle && "text-muted-foreground opacity-50",
                          isDisabled &&
                            !isSelected &&
                            "text-muted-foreground/50 bg-muted/30 cursor-not-allowed"
                        )}>
                        {format(day, "d")}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };

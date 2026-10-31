import { useState } from "react";
import { DEFAULT_END_TIME, DEFAULT_START_TIME, combineDateTime, timeOf } from "./promoForm";

const toIso = (date, time) => combineDateTime(date, time)?.toISOString() || "";

export const usePromoSchedule = (form) => {
  const [startDate, setStartDate] = useState(null);
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [endDate, setEndDate] = useState(null);
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);
  const [daysOfWeek, setDaysOfWeek] = useState([]);

  const changeStartDate = (date) => {
    setStartDate(date);
    form.setValue("startDate", toIso(date, startTime));
  };

  const changeStartTime = (time) => {
    setStartTime(time);
    if (startDate) form.setValue("startDate", toIso(startDate, time));
  };

  const changeEndDate = (date) => {
    setEndDate(date);
    form.setValue("endDate", toIso(date, endTime));
  };

  const changeEndTime = (time) => {
    setEndTime(time);
    if (endDate) form.setValue("endDate", toIso(endDate, time));
  };

  const toggleDay = (day) =>
    setDaysOfWeek((prev) => {
      const days = prev || [];
      return days.includes(day) ? days.filter((d) => d !== day).sort() : [...days, day].sort();
    });

  const hydrateSchedule = (campaign) => {
    const start = campaign.startDate ? new Date(campaign.startDate) : null;
    const end = campaign.endDate ? new Date(campaign.endDate) : null;
    setStartDate(start);
    setStartTime(timeOf(start, DEFAULT_START_TIME));
    setEndDate(end);
    setEndTime(timeOf(end, DEFAULT_END_TIME));
    setDaysOfWeek(campaign.daysOfWeek ?? null);
  };

  return {
    startDate,
    startTime,
    endDate,
    endTime,
    daysOfWeek,
    changeStartDate,
    changeStartTime,
    changeEndDate,
    changeEndTime,
    toggleDay,
    hydrateSchedule
  };
};

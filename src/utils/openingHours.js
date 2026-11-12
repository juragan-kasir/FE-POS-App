const HOUR_FIELDS = ["open", "close", "isOpen", "is24Hours"];

export const copyHoursToAllDays = (hours, sourceDay) => {
  const source = (hours || []).find((entry) => entry.day === sourceDay);
  if (!source) return hours || [];
  const copied = Object.fromEntries(HOUR_FIELDS.map((field) => [field, source[field]]));
  return hours.map((entry) => ({ ...entry, ...copied }));
};

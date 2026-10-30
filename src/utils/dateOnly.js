const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

const pad = (value) => String(value).padStart(2, "0");

const toLocalDate = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

const fromDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined;
  return toLocalDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
};

export const parseDateOnly = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) return fromDate(value);

  if (typeof value === "string") {
    const match = DATE_PREFIX.exec(value.trim());
    if (match) {
      return toLocalDate(Number(match[1]), Number(match[2]), Number(match[3]));
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return fromDate(parsed);
};

export const formatDateOnly = (value) => {
  const date = parseDateOnly(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const todayDateOnly = (now = new Date()) => formatDateOnly(now);

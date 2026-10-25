import { formatDateOnly, parseDateOnly, todayDateOnly } from "../utils/dateOnly";

describe("dateOnly", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("formats a local Date as its local calendar day, not its UTC day", () => {
    expect(formatDateOnly(new Date(2026, 0, 2, 23, 30))).toBe("2026-01-02");
    expect(formatDateOnly(new Date(2026, 11, 31, 0, 15))).toBe("2026-12-31");
  });

  test("keeps an existing date-only string unchanged", () => {
    expect(formatDateOnly("2026-09-10")).toBe("2026-09-10");
  });

  test("returns an empty string for missing or invalid values", () => {
    expect(formatDateOnly(null)).toBe("");
    expect(formatDateOnly("")).toBe("");
    expect(formatDateOnly("not-a-date")).toBe("");
  });

  test("parses a date-only string into local midnight", () => {
    const parsed = parseDateOnly("2026-09-10");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(10);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });

  test("parses a Date by dropping its time in local time", () => {
    const parsed = parseDateOnly(new Date(2026, 8, 10, 18, 45));
    expect(formatDateOnly(parsed)).toBe("2026-09-10");
    expect(parsed.getHours()).toBe(0);
  });

  test("returns undefined for invalid date-only input", () => {
    expect(parseDateOnly("")).toBeUndefined();
    expect(parseDateOnly(null)).toBeUndefined();
    expect(parseDateOnly("2026-02-31")).toBeUndefined();
  });

  test("todayDateOnly uses the local calendar day", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 25, 23, 30));
    expect(todayDateOnly()).toBe("2026-10-25");
  });
});

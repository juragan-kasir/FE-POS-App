import { shortOrderNumber } from "@/utils/orderNumber";

describe("shortOrderNumber", () => {
  test("daily-counter numbers show the sequence", () => {
    expect(shortOrderNumber("ORD-12-261119-0001")).toBe("0001");
    expect(shortOrderNumber("ORD-3-261119-12345")).toBe("12345");
  });

  test("legacy numbers keep the last 5 characters", () => {
    expect(shortOrderNumber("26111904AB3F")).toBe("4AB3F");
  });

  test("missing number falls back", () => {
    expect(shortOrderNumber(undefined, 42)).toBe(42);
    expect(shortOrderNumber("", 7)).toBe(7);
    expect(shortOrderNumber(null)).toBe("");
  });
});

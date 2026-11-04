import { receiptPaymentLabel } from "@/utils/payment";

// PGA-34 (browser pass 2026-11-04): a counter cash receipt said "Cash"
// (the store's type name) while a QR cash settlement said "Tunai".
describe("receiptPaymentLabel", () => {
  test.each([
    ["cash", "Cash"],
    ["CASH", "Uang Tunai"],
    ["cash", undefined]
  ])("cash (%s, store name %s) is always the canonical label", (method, name) => {
    expect(receiptPaymentLabel(method, name)).toBe("Tunai");
  });

  test("a non-cash tender keeps the store's own type name", () => {
    expect(receiptPaymentLabel("e-wallet", "GoPay")).toBe("GoPay");
    expect(receiptPaymentLabel("E_WALLET", null)).toBe("E-Wallet");
  });
});

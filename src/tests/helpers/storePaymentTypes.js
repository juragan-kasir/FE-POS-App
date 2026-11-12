export const STORE_PAYMENT_TYPES = [
  "cash",
  "qris",
  "debit",
  "credit",
  "transfer",
  "e-wallet",
  "other"
].map((type) => ({ id: type, type, name: type, status: "active" }));

export const storePaymentTypesMock = () => ({
  getAllTypePayment: jest.fn(() => Promise.resolve({ data: STORE_PAYMENT_TYPES }))
});

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import ReceiptModal from "../page/cashier/components/ReceiptModal";

// C11 (Phase 13/14): the cashier's own printed receipt never displayed a
// table at all — the data reaching it (createOrder's response, via
// fetchFullOrder on the backend) didn't carry the table association, and
// ReceiptModal had no rendering for it either. This covers the FE display
// half of the fix once the backend's fetchFullOrder include is added.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (opts?.count != null ? `${k}:${opts.count}` : k) })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock("@/utils/thermalPrint", () => ({ printReceipt: jest.fn() }));

jest.mock("@/services/invoice", () => ({
  getInvoiceSetting: jest.fn(() => Promise.resolve({ data: {} }))
}));
jest.mock("@/services/location", () => ({
  getLocationById: jest.fn(() => Promise.resolve({ data: {} }))
}));
jest.mock("@/services/general", () => ({
  getProvinces: jest.fn(() => Promise.resolve([])),
  getCities: jest.fn(() => Promise.resolve([])),
  getDistricts: jest.fn(() => Promise.resolve([])),
  getVillages: jest.fn(() => Promise.resolve([])),
  getPostalCode: jest.fn(() => Promise.resolve([]))
}));
jest.mock("@/services/type-payment", () => ({
  getAllTypePayment: jest.fn(() =>
    Promise.resolve({ data: [{ type: "cash", name: "Cash", status: "active" }] })
  )
}));
jest.mock("../services/split-bill", () => ({
  createSplitBill: jest.fn(() => Promise.resolve({ data: [] })),
  getSplitBillByOrder: jest.fn(() => Promise.resolve({ data: null })),
  paySplitBill: jest.fn(),
  cancelSplitBill: jest.fn(),
  mergeSplitBills: jest.fn()
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 7 }, activeStore: 7 }]
}));

const renderModal = (orderData) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptModal data={orderData} onClose={jest.fn()} onNewTransaction={jest.fn()} />
    </QueryClientProvider>
  );
};

describe("ReceiptModal table display (C11)", () => {
  test("shows the resolved table name when data.table.name is present", async () => {
    renderModal({
      id: 601,
      orderNumber: "ORD-601",
      total: 50000,
      items: [],
      tableId: 12,
      table: { id: 12, name: "VIP 2" }
    });

    expect(await screen.findByText("VIP 2")).toBeInTheDocument();
  });

  test("falls back to a labeled raw tableId when no table name is available", async () => {
    renderModal({ id: 602, orderNumber: "ORD-602", total: 50000, items: [], tableId: 7 });

    // The row's label ("page.cashier.receipt.table" under the test's `t`
    // mock, which returns the key verbatim) is unique on the page, unlike a
    // bare "7" which risks matching an unrelated digit (e.g. the clock time
    // baked into the receipt's formatted timestamp).
    const label = await screen.findByText("page.cashier.receipt.table");
    expect(label.parentElement).toHaveTextContent("7");
  });

  test("renders no table line and does not crash when the order has no table at all", () => {
    expect(() =>
      renderModal({ id: 603, orderNumber: "ORD-603", total: 50000, items: [], tableId: null })
    ).not.toThrow();
    expect(within(screen.getByTestId("receipt-paper")).getByText("ORD-603")).toBeInTheDocument();
  });
});

// PGA-20: the order's priced add-ons reach the printed receipt.
describe("ReceiptModal add-ons (PGA-20)", () => {
  test("prints each add-on of a line returned by the server", async () => {
    renderModal({
      id: 604,
      orderNumber: "ORD-604",
      total: 28000,
      items: [
        {
          nameProduct: "Americano",
          count: 1,
          price: 28000,
          totalPrice: 28000,
          options: [{ name: "Ukuran - Large" }],
          modifiers: [{ name: "Extra Shot" }]
        }
      ]
    });
    const paper = await screen.findByTestId("receipt-paper");
    expect(paper).toHaveTextContent("Ukuran - Large");
    expect(paper).toHaveTextContent("+ Extra Shot");
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import CheckoutModal from "../page/cashier/components/CheckoutModal";
import { quickCashAmounts } from "../page/cashier/quickCash";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "cashier" } }]
}));
jest.mock("../services/order", () => ({
  quoteOrder: jest.fn((payload) =>
    Promise.resolve(jest.requireActual("./helpers/checkoutQuote").serverQuote(payload))
  ),
  createOrder: jest.fn()
}));
jest.mock("../services/customer", () => ({
  getAllCustomer: jest.fn(() => Promise.resolve({ data: [] })),
  addCustomer: jest.fn()
}));
jest.mock("../services/discount", () => ({
  getAllDiscount: jest.fn(() => Promise.resolve({ data: [] })),
  lookupDiscountByCode: jest.fn()
}));
jest.mock("../services/member-tier", () => ({
  getAllMemberTier: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("../services/type-payment", () => ({
  getAllTypePayment: jest.fn(() =>
    Promise.resolve({ data: [{ type: "cash", name: "Cash", status: "active" }] })
  )
}));
jest.mock("../services/member", () => ({
  getMemberById: jest.fn(() => Promise.resolve({ data: {} }))
}));
jest.mock("../services/table", () => ({
  getTableAvailability: jest.fn(() => Promise.resolve({ data: { tables: [] } })),
  getTablesWithActiveOrders: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("../utils/customerDisplayBoard", () => ({
  dispatchDisplayEvent: jest.fn(),
  DISPLAY_EVENT_TYPES: { QRIS_PAYMENT_REQUEST: "QRIS_PAYMENT_REQUEST" }
}));

describe("quickCashAmounts", () => {
  test("rounds the total up to the notes a customer hands over", () => {
    expect(quickCashAmounts(37500)).toEqual([38000, 40000, 50000, 100000]);
    expect(quickCashAmounts(8000)).toEqual([10000, 20000, 50000, 100000]);
    expect(quickCashAmounts(1500)).toEqual([2000, 5000, 10000, 20000, 50000]);
  });

  test("skips the exact total, which has its own button", () => {
    expect(quickCashAmounts(150000)).toEqual([160000, 200000]);
    expect(quickCashAmounts(100000)).toEqual([]);
  });

  test("offers nothing for an empty or free sale", () => {
    expect(quickCashAmounts(0)).toEqual([]);
    expect(quickCashAmounts(NaN)).toEqual([]);
  });
});

describe("CheckoutModal quick cash", () => {
  const renderModal = () =>
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
          })
        }>
        <CheckoutModal
          items={[{ id: "p1", nameProduct: "Bakso", price: 37500, count: 1, totalPrice: 37500 }]}
          subtotal={37500}
          taxRate={0}
          store="1"
          cashierName="Kasir"
          cashierId={1}
          onClose={jest.fn()}
          onTableChange={jest.fn()}
          onComplete={jest.fn()}
        />
      </QueryClientProvider>
    );

  test("Uang Pas fills the exact total; a note fills that note", async () => {
    renderModal();
    fireEvent.click(await screen.findByText("Cash"));
    // The buttons appear once the server has quoted the total.
    const exact = await screen.findByRole("button", { name: "page.cashier.exactCash" });
    const input = screen.getByPlaceholderText("Rp 0");

    fireEvent.click(exact);
    expect(input).toHaveValue(`Rp ${(37500).toLocaleString("id-ID")}`);

    fireEvent.click(screen.getByRole("button", { name: `Rp ${(50000).toLocaleString("id-ID")}` }));
    expect(input).toHaveValue(`Rp ${(50000).toLocaleString("id-ID")}`);
    expect(
      screen.queryByRole("button", { name: `Rp ${(47500).toLocaleString("id-ID")}` })
    ).toBeNull();
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import CheckoutModal from "../page/cashier/components/CheckoutModal";
import { quoteOrder, createOrder } from "../services/order";
import { getAllTypePayment } from "../services/type-payment";
import { waitForCheckoutQuote } from "./helpers/checkoutQuote";
import { checkoutAttempts } from "../state/checkout-attempt";

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
    Promise.resolve({
      data: [
        { type: "cash", name: "Cash", status: "active" },
        { type: "qris", name: "QRIS", status: "active" }
      ]
    })
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

const renderModal = () => {
  const onClose = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <CheckoutModal
        items={[{ id: "p1", nameProduct: "Kopi", price: 20000, count: 1, totalPrice: 20000 }]}
        subtotal={20000}
        taxRate={0}
        store="1"
        cashierName="Kasir"
        cashierId={1}
        onClose={onClose}
        onTableChange={jest.fn()}
        onComplete={jest.fn()}
      />
    </QueryClientProvider>
  );
  return onClose;
};

beforeEach(() => {
  sessionStorage.clear();
  checkoutAttempts.setState({ attempts: {} });
  quoteOrder.mockClear();
  createOrder.mockClear();
  getAllTypePayment.mockResolvedValue({
    data: [
      { type: "cash", name: "Cash", status: "active" },
      { type: "qris", name: "QRIS", status: "active" }
    ]
  });
});

describe("CheckoutModal — closing does not silently discard input", () => {
  test("a clean checkout still closes immediately on Escape", async () => {
    const onClose = renderModal();
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("page.cashier.checkoutDiscardTitle")).not.toBeInTheDocument();
  });

  test("Escape on a dirty checkout asks before discarding", async () => {
    const onClose = renderModal();
    fireEvent.click(await screen.findByText("Cash"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(await screen.findByText("page.cashier.checkoutDiscardTitle")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("page.cashier.keepEditing"));
    expect(screen.queryByText("page.cashier.checkoutDiscardTitle")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(await screen.findByText("page.cashier.discardCheckout"));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  test("the X button follows the same guard", async () => {
    const onClose = renderModal();
    const dialog = await screen.findByRole("dialog");

    fireEvent.click((await screen.findByText("Cash")).closest("button"));
    fireEvent.click(dialog.querySelector("button"));

    expect(await screen.findByText("page.cashier.checkoutDiscardTitle")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("a pending QRIS warns that closing does not cancel it", async () => {
    const onClose = renderModal();
    fireEvent.click(await screen.findByText("QRIS"));
    await waitForCheckoutQuote();

    fireEvent.click(screen.getByText("page.cashier.confirmPayment"));
    await screen.findByText("page.cashier.qris.confirmReceived");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(await screen.findByText("page.cashier.checkoutDiscardTitle")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.checkoutDiscardQris")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

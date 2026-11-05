import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import OrderQueue from "../page/cashier/components/OrderQueue";
import { getOrdersByStore } from "../services/order";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, d) => (typeof d === "string" ? d : k) })
}));

jest.mock("../services/order", () => ({
  getOrdersByStore: jest.fn()
}));

jest.mock("../services/cash-register", () => ({
  getCurrentCashRegister: jest.fn(() =>
    Promise.resolve({ data: { register: { id: 999 } } })
  )
}));

jest.mock("../services/socket", () => ({
  useSocket: () => ({ socket: null, connected: false })
}));

const order = {
  id: 10,
  orderNumber: "CUST-000010",
  status: "pending",
  paymentStatus: "unpaid",
  source: "qr",
  tableId: 10,
  table: { id: 10, name: "K3-4" },
  totalQuantity: 1,
  createdAt: new Date().toISOString(),
  cashRegisterId: 999,
  items: []
};

const renderQueue = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrderQueue store={7} onLoadOrder={jest.fn()} onCollectPayment={jest.fn()} />
    </QueryClientProvider>
  );
};

describe("OrderQueue — PGA-26 table label", () => {
  beforeEach(() => {
    getOrdersByStore
      .mockReset()
      .mockImplementation(({ status }) =>
        Promise.resolve({ data: status === "pending" ? [order] : [] })
      );
  });

  test("renders the table name returned by the API, not the raw table id", async () => {
    renderQueue();

    await waitFor(() =>
      expect(screen.getByText("#00010")).toBeInTheDocument()
    );
    expect(screen.getByText(/K3-4/)).toBeInTheDocument();
    expect(
      screen.queryByText(/orderQueue\.table 10/)
    ).not.toBeInTheDocument();
  });
});

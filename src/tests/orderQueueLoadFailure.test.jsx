import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import OrderQueue from "../page/cashier/components/OrderQueue";
import { useSocket } from "@/services/socket";
import { getOrdersByStore } from "@/services/order";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (typeof opts === "string" ? opts : k) })
}));

jest.mock("@/services/order", () => ({
  getOrdersByStore: jest.fn()
}));

jest.mock("@/services/cash-register", () => ({
  getCurrentCashRegister: jest.fn(() => Promise.resolve({ data: { register: null } }))
}));

jest.mock("@/services/socket", () => ({ useSocket: jest.fn() }));

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

beforeEach(() => {
  jest.clearAllMocks();
  useSocket.mockReturnValue(null);
});

describe("OrderQueue does not present a failed load as an empty queue", () => {
  test("shows a persistent failure with retry", async () => {
    getOrdersByStore.mockRejectedValue(new Error("offline"));

    renderQueue();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("page.cashier.orderQueue.loadFailed");

    fireEvent.click(screen.getByText("common.retry").closest("button"));
    await waitFor(() => expect(getOrdersByStore).toHaveBeenCalledTimes(10));
  });
});

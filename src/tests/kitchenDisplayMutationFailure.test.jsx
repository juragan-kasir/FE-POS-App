import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import KitchenDisplay from "../page/kitchen-display";
import { getKitchenOrders, updateOrderItemStatus } from "@/services/kitchen";
import { useSocket } from "@/services/socket";
import { toast } from "sonner";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { store: 7, roleType: "cashier", name: "Kasir" }, activeStore: 7 }]
}));

jest.mock("@/hooks/useGlobalStoreFilter", () => ({
  useGlobalStoreFilter: () => ["all", jest.fn()]
}));

jest.mock("@/hooks/useRoomSubscription", () => ({
  useRoomSubscription: () => ({ roomOk: false })
}));

jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: null, isLoading: false })
}));

jest.mock("@/services/socket", () => ({ useSocket: jest.fn() }));

jest.mock("@/services/kitchen", () => ({
  getKitchenOrders: jest.fn(),
  updateOrderItemStatus: jest.fn()
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const order = {
  id: 42,
  orderNumber: "A42",
  createdAt: new Date().toISOString(),
  paymentMethod: "cash",
  paymentStatus: "unpaid",
  items: [
    {
      id: 11,
      productName: "Kopi Susu",
      quantity: 1,
      price: 18000,
      totalPrice: 18000,
      status: "pending"
    }
  ]
};

const renderKitchen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <KitchenDisplay />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  useSocket.mockReturnValue({ socket: null, connected: false });
});

describe("KitchenDisplay surfaces a failed status bump", () => {
  test("an offline bump raises an error toast with a retry", async () => {
    getKitchenOrders.mockResolvedValue({ data: [order] });
    updateOrderItemStatus.mockRejectedValueOnce(new Error("offline"));

    renderKitchen();

    expect(await screen.findByText("Kopi Susu")).toBeInTheDocument();
    fireEvent.click(screen.getByText("page.kitchenDisplay.nextLabel.pending"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "page.kitchenDisplay.updateFailed",
        expect.objectContaining({ action: expect.any(Object) })
      )
    );
  });
});

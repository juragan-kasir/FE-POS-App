import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashierPage from "../page/cashier/CashierPage";

let mockCookies;
let mockActiveStoreId;
const mockSetActiveStore = jest.fn();

jest.mock("react-cookie", () => ({
  useCookies: () => [mockCookies, jest.fn(), jest.fn()]
}));
jest.mock("@/contexts/StoreContext", () => ({
  useOptionalStore: () => ({
    activeStoreId: mockActiveStoreId,
    setActiveStore: mockSetActiveStore
  })
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (typeof opts === "string" ? opts : k)
  })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
}));
jest.mock("@/services/table", () => ({
  getCashierTables: jest.fn(() => Promise.resolve({ data: [] })),
  releaseCashierTable: jest.fn()
}));
jest.mock("@/services/product", () => ({
  getProductByOutlet: jest.fn(() => Promise.resolve({ data: [] })),
  getFullProductCatalog: jest.fn(() => Promise.resolve({ data: [], bundles: [] }))
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() =>
    Promise.resolve({
      data: [
        { id: 3, name: "Warung Bakso Pusat" },
        { id: 4, name: "Warung Bakso Cabang" }
      ]
    })
  )
}));
jest.mock("@/services/tax-config", () => ({
  getAllTaxConfig: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/order", () => ({
  getCustomerTaxRate: jest.fn(() => Promise.resolve({ data: { rate: 0, serviceChargeRate: 0 } }))
}));
jest.mock("@/services/parked-cart", () => ({
  createParkedCart: jest.fn()
}));
jest.mock("@/utils/customerDisplayBoard", () => ({
  CART_MIRROR_KEY: "cart-mirror-test",
  DISPLAY_EVENT_TYPES: { TRANSACTION_SUCCESS: "transaction-success" },
  dispatchDisplayEvent: jest.fn()
}));
jest.mock("@/state/theme", () => ({
  useThemeStore: () => ({ toggleTheme: jest.fn() })
}));
jest.mock("@/hooks/useThemeEffect", () => ({
  useThemeEffect: jest.fn()
}));
jest.mock("@/components/layout/Sidebar", () => () => null);
jest.mock("@/components/layout/Header", () => ({
  UserDropdown: () => null,
  NotificationBell: () => null
}));
jest.mock("../page/cashier/components/ProductGrid", () => () => null);
jest.mock("../page/cashier/components/CheckoutModal", () => () => null);
jest.mock("../page/cashier/components/ReceiptModal", () => () => null);
jest.mock("../page/cashier/components/CollectPaymentModal", () => () => null);
jest.mock("../page/cashier/components/ParkedCartPanel", () => () => null);
jest.mock("../page/cashier/components/OrderQueue", () => ({
  __esModule: true,
  default: ({ store }) => <div data-testid="order-queue">{`queue-store-${store}`}</div>
}));

const renderCashierPage = (entry = "/home") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
          })
        }>
        <CashierPage />
      </QueryClientProvider>
    </MemoryRouter>
  );

describe("cashier store follows into the app-wide store context", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockSetActiveStore.mockReset();
    mockSetActiveStore.mockImplementation((id) => {
      mockActiveStoreId = id;
    });
    mockActiveStoreId = "3";
    mockCookies = { user: { id: 1, roleType: "super_admin" }, activeStore: "3" };
  });

  test("picking another store on the cashier makes it the active store", async () => {
    renderCashierPage();
    fireEvent.click(await screen.findByText("Warung Bakso Cabang"));
    fireEvent.click(await screen.findByText("page.cashier.screenMode.single"));

    await waitFor(() => expect(mockSetActiveStore).toHaveBeenCalledWith(4, "Warung Bakso Cabang"));
    expect(mockSetActiveStore).toHaveBeenCalledTimes(1);
  });

  test("a store opened by URL also becomes the active store", async () => {
    renderCashierPage("/home?store=4");
    await waitFor(() =>
      expect(mockSetActiveStore).toHaveBeenCalledWith("4", "Warung Bakso Cabang")
    );
  });

  test("nothing is rewritten when the cashier store is already the active one", async () => {
    renderCashierPage("/home?store=3");
    expect(await screen.findByTestId("order-queue")).toHaveTextContent("queue-store-3");
    await screen.findByText("Warung Bakso Pusat");
    expect(mockSetActiveStore).not.toHaveBeenCalled();
  });

  test("a store-bound cashier never rewrites the store and sees its store name", async () => {
    mockCookies = {
      user: { id: 9, roleType: "kasir", store: 4, storeName: "Warung Bakso Cabang" },
      activeStore: 4
    };
    mockActiveStoreId = 4;
    renderCashierPage();

    expect(await screen.findByRole("heading", { name: "Warung Bakso Cabang" })).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.storeName")).not.toBeInTheDocument();
    expect(mockSetActiveStore).not.toHaveBeenCalled();
  });
});

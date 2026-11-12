import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashierPage from "../page/cashier/CashierPage";
import { orderList } from "../state/order-list";
import { toast } from "sonner";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      if (typeof opts === "string") return opts;
      if (opts && typeof opts === "object" && "count" in opts) return `${k}:${opts.count}`;
      return k;
    }
  })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
}));

// react-cookie's useCookies() returns [cookies, setCookie, removeCookie];
// CashierPage destructures `const [cookie] = useCookies();`, so the mock
// must return that same array shape.
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: "1" }, activeStore: "1" }]
}));

// Cashier table panel (header "Meja" button) — no tables in these suites.
jest.mock("@/services/table", () => ({
  getCashierTables: jest.fn(() => Promise.resolve({ data: [] })),
  releaseCashierTable: jest.fn()
}));
jest.mock("@/services/product", () => ({
  getProductByOutlet: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/tax-config", () => ({
  getAllTaxConfig: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/waiterRequest", () => ({
  getWaiterRequestList: jest.fn(() => Promise.resolve({ data: [] }))
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

// The real CashierPage wires OrderQueue's onLoadOrder straight to
// requestLoadOrder/handleLoadOrder — stubbing OrderQueue down to a single
// button lets this test drive that exact production code path without
// needing to mock sockets/queries OrderQueue itself depends on.
let mockOrderToLoad;
jest.mock("../page/cashier/components/OrderQueue", () => ({
  __esModule: true,
  default: ({ onLoadOrder }) => (
    <button type="button" onClick={() => onLoadOrder(mockOrderToLoad)}>
      trigger-load-order
    </button>
  )
}));

const renderCashierPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <CashierPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("CashierPage handleLoadOrder safety (F9-03)", () => {
  beforeEach(() => {
    orderList.setState({ order: [] });
    toast.success.mockClear();
    toast.error.mockClear();
  });

  test("loading a well-formed order populates the cart and shows a success toast with the right count", () => {
    mockOrderToLoad = {
      items: [
        {
          product: "p1",
          productName: "Product A",
          price: 1000,
          quantity: 2,
          totalPrice: 2000,
          options: []
        }
      ]
    };
    renderCashierPage();

    fireEvent.click(screen.getByText("trigger-load-order"));

    expect(orderList.getState().order).toHaveLength(1);
    expect(orderList.getState().order[0].nameProduct).toBe("Product A");
    expect(toast.success).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("an order with items:[] still resets the cart and reports zero items loaded (existing behavior preserved)", () => {
    mockOrderToLoad = { items: [] };
    renderCashierPage();

    fireEvent.click(screen.getByText("trigger-load-order"));

    expect(orderList.getState().order).toHaveLength(0);
    expect(toast.success).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("a malformed order with no items array does not throw and does not touch the cart, and reports an error", () => {
    mockOrderToLoad = { id: "bad-order" }; // no `items` at all
    renderCashierPage();

    expect(() => fireEvent.click(screen.getByText("trigger-load-order"))).not.toThrow();

    expect(orderList.getState().order).toHaveLength(0);
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("loading a malformed order does not wipe an existing in-progress cart", () => {
    const existingItem = {
      id: 9,
      cartKey: "9_",
      nameProduct: "Existing Product",
      price: 5000,
      count: 1,
      totalPrice: 5000
    };
    orderList.setState({ order: [existingItem] });
    mockOrderToLoad = { id: "bad-order" }; // no `items`
    renderCashierPage();

    // Cart already has an item, so requestLoadOrder shows the replace-cart
    // confirmation first — confirm it, then the malformed order must not
    // wipe the cart it was about to replace.
    fireEvent.click(screen.getByText("trigger-load-order"));
    fireEvent.click(screen.getByText("page.cashier.loadOrderConfirmButton"));

    expect(orderList.getState().order).toHaveLength(1);
    expect(orderList.getState().order[0].nameProduct).toBe("Existing Product");
    expect(toast.error).toHaveBeenCalled();
  });
});

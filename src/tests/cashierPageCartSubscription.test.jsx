import React from "react";
import { render, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashierPage from "../page/cashier/CashierPage";
import { orderList } from "../state/order-list";

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
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: "1" }, activeStore: "1" }]
}));
// Cashier table panel (header "Meja" button) — no tables in these suites.
jest.mock("@/services/table", () => ({
  getCashierTables: jest.fn(() => Promise.resolve({ data: [] })),
  releaseCashierTable: jest.fn()
}));
jest.mock("@/services/product", () => ({
  getProductByOutlet: jest.fn(() => Promise.resolve({ data: [] })),
  getFullProductCatalog: jest.fn(() => Promise.resolve({ data: [], bundles: [] }))
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
  getCustomerTaxRate: jest.fn(() => Promise.resolve({ data: { rate: 11 } }))
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

let mockProductGridRenders = 0;
jest.mock("../page/cashier/components/ProductGrid", () => {
  // Deliberately NOT memoized: any parent re-render re-renders this mock,
  // so its counter measures exactly how often CashierPage itself re-renders.
  return function MockProductGrid() {
    mockProductGridRenders += 1;
    return null;
  };
});
jest.mock("../page/cashier/components/CheckoutModal", () => () => null);
jest.mock("../page/cashier/components/ReceiptModal", () => () => null);
jest.mock("../page/cashier/components/OrderQueue", () => () => null);
jest.mock("../page/cashier/components/CollectPaymentModal", () => () => null);
jest.mock("../page/cashier/components/ParkedCartPanel", () => () => null);
jest.mock("../page/cashier/components/CartPanel", () => () => null);

const renderPage = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const utils = render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <CashierPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
  // Let queries settle so later counts are not polluted by load renders.
  await act(async () => {});
  return utils;
};

// Phase 31 Batch 2 (PERF-1): CashierPage must subscribe to the cart `order`
// slice only — an unrelated store write must not re-render the page.
describe("CashierPage — narrow cart subscription", () => {
  beforeEach(() => {
    orderList.setState({ order: [] });
    mockProductGridRenders = 0;
  });

  test("an unrelated zustand store write does not re-render the page", async () => {
    await renderPage();
    const settled = mockProductGridRenders;
    expect(settled).toBeGreaterThan(0);
    await act(async () => {
      orderList.setState((s) => ({ ...s }));
    });
    expect(mockProductGridRenders).toBe(settled);
  });

  test("cart updates still flow through: adding an item re-renders with new content", async () => {
    await renderPage();
    const settled = mockProductGridRenders;
    await act(async () => {
      orderList.getState().addOrder({ id: 9, nameProduct: "Narrow", price: 5000 });
    });
    expect(mockProductGridRenders).toBeGreaterThan(settled);
    expect(orderList.getState().order).toHaveLength(1);
  });
});

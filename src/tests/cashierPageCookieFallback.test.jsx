import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashierPage from "../page/cashier/CashierPage";

// Regression: /home in a tab without the login-tab sessionStorage "user"
// must resolve the user from the cookie. react-cookie's useCookies()
// returns [cookies, setCookie, removeCookie]; reading `.user` off that
// array left role/store undefined, so a super_admin saw an empty
// "Pilih toko" picker with no stores and a cashier saw no store at all.

let mockCookies;
jest.mock("react-cookie", () => ({
  useCookies: () => [mockCookies, jest.fn(), jest.fn()]
}));

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
  getAllLocation: jest.fn(() =>
    Promise.resolve({
      data: [
        { id: 1, name: "Store Alpha" },
        { id: 2, name: "Store Beta" },
        { id: 3, name: "Store Gamma" }
      ]
    })
  )
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
jest.mock("../page/cashier/components/OrderQueue", () => ({
  __esModule: true,
  default: ({ store }) => <div data-testid="order-queue">{`queue-store-${store}`}</div>
}));

const renderCashierPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <QueryClientProvider client={queryClient}>
        <CashierPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("CashierPage cookie fallback when sessionStorage has no user", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test("super_admin sees every store in the picker", async () => {
    mockCookies = { user: { id: 1, roleType: "super_admin" } };
    renderCashierPage();

    expect(await screen.findByText("Store Alpha")).toBeInTheDocument();
    expect(screen.getByText("Store Beta")).toBeInTheDocument();
    expect(screen.getByText("Store Gamma")).toBeInTheDocument();
  });

  test("a store-bound user lands on their cookie store instead of the picker", () => {
    mockCookies = { user: { id: 2, roleType: "admin", store: "7" }, activeStore: "7" };
    renderCashierPage();

    expect(screen.getByTestId("order-queue")).toHaveTextContent("queue-store-7");
    expect(screen.queryByText("Pilih toko")).not.toBeInTheDocument();
  });
});

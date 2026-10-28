import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashierPage from "../page/cashier/CashierPage";
import { getCustomerTaxRate } from "../services/order";
import { getAllTaxConfig } from "../services/tax-config";

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
  getProductByOutlet: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/tax-config", () => ({
  getAllTaxConfig: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/order", () => ({
  getCustomerTaxRate: jest.fn()
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
jest.mock("../page/cashier/components/CheckoutModal", () => {
  const MockCheckoutModal = (props) => (
    <div data-testid="checkout-modal-tax-rate">{props.taxRate}</div>
  );
  return MockCheckoutModal;
});
jest.mock("../page/cashier/components/ReceiptModal", () => () => null);
jest.mock("../page/cashier/components/OrderQueue", () => () => null);
jest.mock("../page/cashier/components/CollectPaymentModal", () => () => null);
jest.mock("../page/cashier/components/ParkedCartPanel", () => () => null);
jest.mock("../page/cashier/components/CartPanel", () => {
  const MockCartPanel = (props) => (
    <>
      <div data-testid="cart-panel-tax-rate">{props.taxRate}</div>
      <div data-testid="cart-panel-tax-unavailable">{String(props.taxUnavailable)}</div>
    </>
  );
  return MockCartPanel;
});

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

describe("CashierPage tax rate consistency (F-SMOKE-01)", () => {
  beforeEach(() => {
    getAllTaxConfig.mockResolvedValue({ data: [] });
  });

  test("the displayed tax rate comes from the same authoritative resolution order/create uses — including its 11% fallback when no active ppn row exists", async () => {
    // No active ppn/service-charge row anywhere for this store — order/create's
    // getActiveTaxRate falls back to the documented 11% default. The cart
    // display must show that same 11%, not the 0% a naive local re-derivation
    // of an empty tax-config list would show.
    getCustomerTaxRate.mockResolvedValue({ data: { rate: 11, serviceChargeRate: 0 } });

    renderCashierPage();

    await waitFor(() => expect(getCustomerTaxRate).toHaveBeenCalled());
    const panels = await screen.findAllByTestId("cart-panel-tax-rate");
    panels.forEach((panel) => expect(panel).toHaveTextContent("0.11"));
  });

  test("a global-only active ppn config is reflected in the displayed rate", async () => {
    getCustomerTaxRate.mockResolvedValue({ data: { rate: 7, serviceChargeRate: 0 } });

    renderCashierPage();

    await waitFor(() => expect(getCustomerTaxRate).toHaveBeenCalled());
    const panels = await screen.findAllByTestId("cart-panel-tax-rate");
    panels.forEach((panel) => expect(panel).toHaveTextContent("0.07"));
  });

  test("a failed tax lookup is marked unavailable instead of silently showing 0%", async () => {
    getCustomerTaxRate.mockRejectedValue(new Error("offline"));

    renderCashierPage();

    await waitFor(() => expect(getCustomerTaxRate).toHaveBeenCalled());
    const unavailable = await screen.findAllByTestId("cart-panel-tax-unavailable");
    unavailable.forEach((panel) => expect(panel).toHaveTextContent("true"));

    const rates = await screen.findAllByTestId("cart-panel-tax-rate");
    rates.forEach((panel) => expect(panel).not.toHaveTextContent("0"));
  });
});

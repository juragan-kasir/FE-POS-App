import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashierPage from "../page/cashier/CashierPage";
import { getCustomerTaxRate } from "../services/order";
import { getFullProductCatalog, getProductByOutlet } from "../services/product";

// W3-4 (K1): CashierPage hands the grid catalog rows whose selling price is
// the server's effectivePrice (and authoritative bundle prices), including
// rows found through the remote barcode lookup.

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
  getFullProductCatalog: jest.fn(),
  getProductByOutlet: jest.fn()
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
jest.mock("@/services/cash-register", () => ({
  getCurrentCashRegister: jest.fn(() => Promise.resolve({ data: { register: null } }))
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

const gridProps = { current: null };
jest.mock("../page/cashier/components/ProductGrid", () => {
  const MockProductGrid = (props) => {
    gridProps.current = props;
    return (
      <ul>
        {(props.allProducts || []).map((p) => (
          <li
            key={`${p.isBundle ? "b" : "p"}-${p.id}`}
            data-testid={`grid-${p.isBundle ? "b" : "p"}-${p.id}`}>
            {p.price}
          </li>
        ))}
      </ul>
    );
  };
  return MockProductGrid;
});
jest.mock("../page/cashier/components/CheckoutModal", () => () => null);
jest.mock("../page/cashier/components/ReceiptModal", () => () => null);
jest.mock("../page/cashier/components/OrderQueue", () => () => null);
jest.mock("../page/cashier/components/CollectPaymentModal", () => () => null);
jest.mock("../page/cashier/components/ParkedCartPanel", () => () => null);
jest.mock("../page/cashier/components/CartPanel", () => () => null);

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

describe("W3-4 CashierPage catalog effectivePrice (K1)", () => {
  beforeEach(() => {
    gridProps.current = null;
    getCustomerTaxRate.mockResolvedValue({ data: { rate: 11, serviceChargeRate: 0 } });
    getFullProductCatalog.mockResolvedValue({
      data: [
        { id: 1, nameProduct: "Kopi", price: 10000, effectivePrice: 12000 },
        { id: 2, nameProduct: "Gratis", price: 10000, effectivePrice: 0 }
      ],
      bundles: [{ id: 7, name: "Paket", sku: "PKT", bundlePrice: 50000, items: [] }],
      pagination: { page: 1, limit: 500, hasMore: false }
    });
  });

  test("the grid receives effectivePrice as the selling price, never the base price", async () => {
    renderCashierPage();

    expect(await screen.findByTestId("grid-p-1")).toHaveTextContent("12000");
    expect(screen.getByTestId("grid-p-2")).toHaveTextContent(/^0$/);
    const kopi = gridProps.current.allProducts.find((p) => p.id === 1 && !p.isBundle);
    expect(kopi).toMatchObject({ price: 12000, basePrice: 10000, priceAuthoritative: true });
  });

  test("bundles carry bundleId and their authoritative bundlePrice", async () => {
    renderCashierPage();

    expect(await screen.findByTestId("grid-b-7")).toHaveTextContent("50000");
    const bundle = gridProps.current.allProducts.find((p) => p.isBundle);
    expect(bundle).toMatchObject({ bundleId: 7, price: 50000, priceAuthoritative: true });
  });

  test("the remote barcode lookup returns normalized effective prices", async () => {
    getProductByOutlet.mockResolvedValue({
      data: [{ id: 9, nameProduct: "Scan", sku: "SC9", price: 4000, effectivePrice: 4500 }]
    });
    renderCashierPage();
    await screen.findByTestId("grid-p-1");

    let found;
    await act(async () => {
      found = await gridProps.current.onRemoteBarcodeLookup("SC9");
    });

    expect(found).toEqual([
      expect.objectContaining({ id: 9, price: 4500, basePrice: 4000, priceAuthoritative: true })
    ]);
    await waitFor(() => expect(getProductByOutlet).toHaveBeenCalled());
  });
});

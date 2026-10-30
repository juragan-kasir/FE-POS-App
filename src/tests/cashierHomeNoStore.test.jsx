import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CashierPage from "../page/cashier/CashierPage";
import { getAllLocation } from "@/services/location";

// /home with no store at all (fresh tenant, or right after a data reset):
// there is nothing to pick, so the cashier shows the shared "Toko Tidak
// Tersedia" empty state whose button leads to creating a store.

let mockCookies;
jest.mock("react-cookie", () => ({
  useCookies: () => [mockCookies, jest.fn(), jest.fn()]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (typeof opts === "string" ? opts : k)
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
  getAllLocation: jest.fn()
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

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
          })
        }>
        <Routes>
          <Route path="/home" element={<CashierPage />} />
          <Route path="/add-location" element={<div>add-location-page</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  sessionStorage.clear();
  mockCookies = { user: { id: 1, roleType: "super_admin" } };
});

test("no store yet: shows the empty state and links to creating a store", async () => {
  getAllLocation.mockResolvedValue({ data: [] });
  renderHome();
  expect(await screen.findByText("page.noStore.title")).toBeInTheDocument();
  expect(screen.getByText("page.noStore.description")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "page.noStore.action" }));
  expect(await screen.findByText("add-location-page")).toBeInTheDocument();
});

test("with several stores: the picker is shown, not the empty state", async () => {
  getAllLocation.mockResolvedValue({
    data: [
      { id: 3, name: "Warung Bakso Pusat", address: "Jl. Merdeka 1" },
      { id: 4, name: "Warung Bakso Cabang" }
    ]
  });
  renderHome();
  expect(await screen.findByText("Warung Bakso Pusat")).toBeInTheDocument();
  expect(screen.getByText("Warung Bakso Cabang")).toBeInTheDocument();
  // A heading that asks the question, and each card says where the store is
  // (a store without an address shows no filler line).
  expect(screen.getByText("page.cashier.pickStoreTitle")).toBeInTheDocument();
  expect(screen.getByText("Jl. Merdeka 1")).toBeInTheDocument();
  expect(screen.queryByText("page.table.form.storePlaceholder")).not.toBeInTheDocument();
  expect(screen.queryByText("page.noStore.title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("order-queue")).not.toBeInTheDocument();
});

// Production 10-29: bakso_admin (one store, Bakso ABC) was asked to pick a
// store on /home, a choice with one answer.
test("with one store: the cashier opens on it without the picker", async () => {
  getAllLocation.mockResolvedValue({ data: [{ id: 3, name: "Bakso ABC" }] });
  renderHome();
  expect(await screen.findByTestId("order-queue")).toHaveTextContent("queue-store-3");
  expect(screen.queryByText("page.cashier.pickStoreTitle")).not.toBeInTheDocument();
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashierPage from "../page/cashier/CashierPage";
import CollapsiblePanel from "../components/ui/CollapsiblePanel";
import { canonicalLocationNavItems, withCanonicalLocationItems } from "../lib/canonical-nav";
import { getCashierTables } from "@/services/table";

// Cashier store pick asks 1 screen / 2 screens (2 = also the customer display
// board in a new tab); order queue / parked carts are show/hide panels; Tenant
// and Store Configuration live in the Location navigation category.

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
  // Two stores: with one, /home opens it without the picker.
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

const renderCashierPage = () =>
  render(
    <MemoryRouter initialEntries={["/home"]}>
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

describe("cashier store pick — 1 screen / 2 screens", () => {
  let openSpy;
  beforeEach(() => {
    sessionStorage.clear();
    mockCookies = { user: { id: 1, roleType: "super_admin" } };
    openSpy = jest.spyOn(window, "open").mockReturnValue({});
  });
  afterEach(() => openSpy.mockRestore());

  test("picking a store asks for the screen mode before opening anything", async () => {
    renderCashierPage();
    fireEvent.click(await screen.findByText("Warung Bakso Pusat"));
    expect(await screen.findByText("page.cashier.screenMode.title")).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("order-queue")).not.toBeInTheDocument();
  });

  test("1 screen opens only the cashier for that store", async () => {
    renderCashierPage();
    fireEvent.click(await screen.findByText("Warung Bakso Pusat"));
    fireEvent.click(await screen.findByText("page.cashier.screenMode.single"));
    expect(await screen.findByTestId("order-queue")).toHaveTextContent("queue-store-3");
    expect(openSpy).not.toHaveBeenCalled();
  });

  test("2 screens also opens the store's customer display board in a new tab", async () => {
    renderCashierPage();
    fireEvent.click(await screen.findByText("Warung Bakso Pusat"));
    fireEvent.click(await screen.findByText("page.cashier.screenMode.dual"));
    expect(await screen.findByTestId("order-queue")).toHaveTextContent("queue-store-3");
    expect(openSpy).toHaveBeenCalledWith("/customer-display-board?store=3", "_blank");
  });
});

describe("CollapsiblePanel (order queue / parked carts)", () => {
  beforeEach(() => localStorage.clear());

  test("open by default; the header hides and shows the body like the support FAQ", () => {
    render(
      <CollapsiblePanel title="Antrian Pesanan" count={4} storageKey="test.queue">
        <div>queue body</div>
      </CollapsiblePanel>
    );
    const header = screen.getByRole("button", { name: /Antrian Pesanan/ });
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("queue body")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("queue body")).not.toBeInTheDocument();

    fireEvent.click(header);
    expect(screen.getByText("queue body")).toBeInTheDocument();
  });

  test("remembers a hidden panel on this device", () => {
    const { unmount } = render(
      <CollapsiblePanel title="Keranjang Ditahan" storageKey="test.parked">
        <div>parked body</div>
      </CollapsiblePanel>
    );
    fireEvent.click(screen.getByRole("button", { name: /Keranjang Ditahan/ }));
    unmount();
    render(
      <CollapsiblePanel title="Keranjang Ditahan" storageKey="test.parked">
        <div>parked body</div>
      </CollapsiblePanel>
    );
    expect(screen.queryByText("parked body")).not.toBeInTheDocument();
  });
});

describe("Location navigation category", () => {
  const superAdminCategories = [
    {
      id: "location",
      title: "Location",
      sections: [
        {
          i18nKey: "sidebar.section.kelolaToko",
          items: [{ href: "/location-list", title: "Kelola Toko" }]
        },
        { i18nKey: "sidebar.section.harga", items: [{ href: "/price-list-template" }] }
      ]
    },
    { id: "produk", sections: [] }
  ];
  const hrefsOf = (cats) =>
    cats.find((c) => c.id === "location")?.sections.flatMap((s) => s.items.map((i) => i.href)) ||
    [];

  test("Tenant and Store Configuration join the Kelola Toko section", () => {
    const result = withCanonicalLocationItems(superAdminCategories, {
      canAdministerTenants: true,
      canManageStores: true
    });
    const storeSection = result[0].sections[0];
    // Display order: Tenant, store list, Store Configuration.
    expect(storeSection.items.map((i) => i.href)).toEqual([
      "/tenant",
      "/location-list",
      "/store-configuration"
    ]);
    expect(result).toHaveLength(2);
  });

  test("each item follows its own canonical permission", () => {
    expect(
      hrefsOf(
        withCanonicalLocationItems(superAdminCategories, {
          canAdministerTenants: false,
          canManageStores: true
        })
      )
    ).not.toContain("/tenant");
    expect(
      withCanonicalLocationItems(superAdminCategories, {
        canAdministerTenants: false,
        canManageStores: false
      })
    ).toBe(superAdminCategories);
    expect(
      canonicalLocationNavItems({ canAdministerTenants: true, canManageStores: false })
    ).toHaveLength(1);
  });

  test("a role without a Location category gets one for these items", () => {
    const result = withCanonicalLocationItems([{ id: "produk", sections: [] }], {
      canAdministerTenants: false,
      canManageStores: true
    });
    expect(hrefsOf(result)).toEqual(["/store-configuration"]);
  });
});

describe("cashier table reset button (BA C-16 amended)", () => {
  test("a kasir sees the Meja button with a badge for tables that are not available", async () => {
    mockCookies = { user: { id: 2, roleType: "kasir", store: 5 }, activeStore: 5 };
    getCashierTables.mockResolvedValueOnce({
      data: [
        { id: 1, name: "Meja 1", status: "occupied", canRelease: true },
        { id: 2, name: "Meja 2", status: "reserved", canRelease: true },
        { id: 3, name: "Meja 3", status: "available", canRelease: false }
      ]
    });
    renderCashierPage();
    expect(await screen.findByTestId("tables-not-available-badge")).toHaveTextContent("2");
    expect(screen.getByText("page.cashier.tables.button")).toBeInTheDocument();
  });

  test("staff without a cashier role get no button and no request", async () => {
    getCashierTables.mockClear();
    mockCookies = { user: { id: 3, roleType: "user", store: 5 }, activeStore: 5 };
    renderCashierPage();
    await screen.findByTestId("order-queue").catch(() => null);
    expect(screen.queryByText("page.cashier.tables.button")).not.toBeInTheDocument();
    expect(getCashierTables).not.toHaveBeenCalled();
  });
});

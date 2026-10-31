import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import DashboardSuperAdmin from "@/page/dashboard-super-admin";
import { getSuperAdminDashboard } from "@/services/dashboard";
import { getAllProductTable } from "@/services/product";
import { POS_WELCOME_SEEN_KEY } from "@/hooks/usePosWelcome";

// A brand-new account (no orders, members or products) lands on the super
// admin dashboard: the POS welcome greets it once per browser.

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts && typeof opts.defaultValue === "string" ? opts.defaultValue : k),
    i18n: { language: "id" }
  })
}));
jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ activeStoreId: "7", setActiveStore: jest.fn() })
}));
let mockStores = [];
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: mockStores }, isSuccess: true })
}));
jest.mock("@/services/expense", () => ({
  getUpcomingPayments: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/dashboard", () => ({ getSuperAdminDashboard: jest.fn() }));
jest.mock("@/services/product", () => ({ getAllProductTable: jest.fn() }));

const emptySummary = { revenue: 0, orders: 0, totalMembers: 0, newMembers: 0, growth: {} };
const WELCOME = /Selamat Datang di juragankasir\.com!/;

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DashboardSuperAdmin />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe("Super admin dashboard — POS welcome for an empty account", () => {
  beforeEach(() => {
    localStorage.clear();
    mockStores = [];
    getSuperAdminDashboard.mockReset();
    getAllProductTable.mockReset();
  });

  test("stays closed once the account has a store, even with no sales or products", async () => {
    mockStores = [{ id: 7, name: "Toko A", status: "draft" }];
    getSuperAdminDashboard.mockResolvedValue({ data: { summary: emptySummary } });
    getAllProductTable.mockResolvedValue({ stats: { total: 0 }, pagination: { totalItems: 0 } });
    renderPage();

    await waitFor(() => expect(getAllProductTable).toHaveBeenCalled());
    await screen.findByText("page.dashboardSuperAdmin.kpi.revenue");
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(WELCOME)).not.toBeInTheDocument();
  });

  test("shows the welcome when there is no store and orders, members and products are empty", async () => {
    getSuperAdminDashboard.mockResolvedValue({ data: { summary: emptySummary } });
    getAllProductTable.mockResolvedValue({ stats: { total: 0 }, pagination: { totalItems: 0 } });
    renderPage();

    expect(await screen.findByText(WELCOME)).toBeInTheDocument();
    expect(getAllProductTable).toHaveBeenCalledWith(
      expect.objectContaining({ location: "", statusProduct: "all" })
    );

    fireEvent.click(screen.getByTestId("pos-welcome-cta"));
    await waitFor(() => expect(screen.queryByText(WELCOME)).not.toBeInTheDocument());
    expect(localStorage.getItem(POS_WELCOME_SEEN_KEY)).toBe("1");
  });

  test("stays closed once the welcome was dismissed in this browser", async () => {
    localStorage.setItem(POS_WELCOME_SEEN_KEY, "1");
    getSuperAdminDashboard.mockResolvedValue({ data: { summary: emptySummary } });
    getAllProductTable.mockResolvedValue({ stats: { total: 0 } });
    renderPage();

    await waitFor(() => expect(getAllProductTable).toHaveBeenCalled());
    await waitFor(() => expect(getSuperAdminDashboard).toHaveBeenCalled());
    expect(screen.queryByText(WELCOME)).not.toBeInTheDocument();
  });

  test.each([
    ["products exist", { summary: emptySummary }, { stats: { total: 4 } }],
    [
      "orders exist",
      { summary: { ...emptySummary, orders: 2, revenue: 50000 } },
      { stats: { total: 0 } }
    ],
    ["members exist", { summary: { ...emptySummary, totalMembers: 1 } }, { stats: { total: 0 } }]
  ])("stays closed when %s", async (_, dash, products) => {
    getSuperAdminDashboard.mockResolvedValue({ data: dash });
    getAllProductTable.mockResolvedValue(products);
    renderPage();

    await waitFor(() => expect(getAllProductTable).toHaveBeenCalled());
    await screen.findByText("page.dashboardSuperAdmin.kpi.revenue");
    expect(screen.queryByText(WELCOME)).not.toBeInTheDocument();
  });

  test("a failed dashboard request is not read as an empty account", async () => {
    getSuperAdminDashboard.mockRejectedValue(new Error("boom"));
    getAllProductTable.mockResolvedValue({ stats: { total: 0 } });
    renderPage();

    await waitFor(() => expect(getSuperAdminDashboard).toHaveBeenCalled());
    await waitFor(() => expect(getAllProductTable).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(WELCOME)).not.toBeInTheDocument();
  });
});

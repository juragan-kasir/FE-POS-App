import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";

// FE W3 Phase 2 — Store Configuration list page.

// jsdom lacks ResizeObserver, which DataTable uses for sticky columns.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
// cmdk (DataTable's page-size Combobox) scrolls the active option into view.
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: "id", changeLanguage: jest.fn() } })
}));

const mockGetStoreConfigurations = jest.fn();
jest.mock("@/services/location", () => ({
  getStoreConfigurations: (...args) => mockGetStoreConfigurations(...args)
}));

let mockPermission;
jest.mock("@/hooks/useStoreManagePermission", () => ({
  useStoreManagePermission: () => mockPermission
}));

jest.mock("@/services/session", () => ({
  endSession: jest.fn(),
  SESSION_END_REASON: { LOGOUT: "logout", EXPIRED: "expired" }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin" } }, jest.fn(), jest.fn()]
}));
jest.mock("@/hooks/useUserSession", () => ({
  useUserSession: () => ({ id: 1, roleType: "admin" })
}));
jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ activeStoreId: null, activeStoreName: "", setActiveStore: jest.fn() })
}));

import StoreConfigurationList from "@/page/store-configuration/StoreConfigurationList";

const row = (n, extra = {}) => ({
  id: `loc-00${n}`,
  storeId: `ST-00${n}`,
  name: `Store ${n}`,
  status: "active",
  category: "Branch",
  timezone: "Asia/Jakarta",
  dailyTarget: 1000000,
  ...extra
});

const page = (rows, pagination) => ({
  success: true,
  message: "Success",
  data: rows,
  pagination
});

const httpError = (status) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data: {} } });

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <StoreConfigurationList />
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  mockPermission = { canManageStores: true, isLoading: false, isError: false, refetch: jest.fn() };
  mockNavigate.mockReset();
  mockGetStoreConfigurations.mockReset();
});

describe("permission gate", () => {
  test("auth context loading shows the skeleton and fetches nothing", () => {
    mockPermission = { ...mockPermission, isLoading: true, canManageStores: false };
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(mockGetStoreConfigurations).not.toHaveBeenCalled();
  });

  test("without store.manage renders Access Denied and fetches nothing", () => {
    mockPermission = { ...mockPermission, canManageStores: false };
    renderPage();
    expect(screen.getByText("error.forbiddenTitle")).toBeInTheDocument();
    expect(mockGetStoreConfigurations).not.toHaveBeenCalled();
  });
});

describe("list", () => {
  test("requests the default page and limit", async () => {
    mockGetStoreConfigurations.mockResolvedValue(
      page([row(1)], { page: 1, limit: 20, total: 1, totalPages: 1 })
    );
    renderPage();
    await screen.findByText("Store 1");
    expect(mockGetStoreConfigurations).toHaveBeenCalledWith(1, 20);
  });

  test("loading renders the table skeleton (no rows yet)", () => {
    mockGetStoreConfigurations.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByText("Store 1")).not.toBeInTheDocument();
    expect(screen.queryByText("page.storeConfiguration.list.empty")).not.toBeInTheDocument();
  });

  test("empty result renders the empty state", async () => {
    mockGetStoreConfigurations.mockResolvedValue(
      page([], { page: 1, limit: 20, total: 0, totalPages: 0 })
    );
    renderPage();
    expect(await screen.findByText("page.storeConfiguration.list.empty")).toBeInTheDocument();
  });

  test("populated rows show identity, category, timezone and status", async () => {
    mockGetStoreConfigurations.mockResolvedValue(
      page(
        [row(1), row(2, { status: "closed", category: "Main Branch", timezone: "Asia/Makassar" })],
        {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      )
    );
    renderPage();
    expect(await screen.findByText("Store 1")).toBeInTheDocument();
    expect(screen.getByText("ST-002")).toBeInTheDocument();
    expect(screen.getByText("page.location.category.mainBranch")).toBeInTheDocument();
    expect(screen.getByText("Asia/Makassar")).toBeInTheDocument();
    expect(screen.getByText("page.storeConfiguration.status.closed")).toBeInTheDocument();
  });

  test("row click navigates to the detail route", async () => {
    mockGetStoreConfigurations.mockResolvedValue(
      page([row(1)], { page: 1, limit: 20, total: 1, totalPages: 1 })
    );
    renderPage();
    fireEvent.click(await screen.findByText("Store 1"));
    expect(mockNavigate).toHaveBeenCalledWith("/store-configuration/loc-001");
  });

  test("403 renders Access Denied", async () => {
    mockGetStoreConfigurations.mockRejectedValue(httpError(403));
    renderPage();
    expect(await screen.findByText("error.forbiddenTitle")).toBeInTheDocument();
  });

  test("other failures are retryable", async () => {
    mockGetStoreConfigurations
      .mockRejectedValueOnce(httpError(500))
      .mockResolvedValue(page([row(1)], { page: 1, limit: 20, total: 1, totalPages: 1 }));
    renderPage();
    fireEvent.click(await screen.findByText("common.retry"));
    expect(await screen.findByText("Store 1")).toBeInTheDocument();
  });
});

describe("pagination", () => {
  const multiPage = (pageNo, limit) =>
    page([row(pageNo)], { page: pageNo, limit, total: 45, totalPages: Math.ceil(45 / limit) });

  test("page change requests the next page", async () => {
    mockGetStoreConfigurations.mockImplementation((p, l) => Promise.resolve(multiPage(p, l)));
    renderPage();
    await screen.findByText("Store 1");
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(mockGetStoreConfigurations).toHaveBeenLastCalledWith(2, 20));
    expect(await screen.findByText("Store 2")).toBeInTheDocument();
  });

  test("page-size change resets to page 1 with the new limit", async () => {
    mockGetStoreConfigurations.mockImplementation((p, l) => Promise.resolve(multiPage(p, l)));
    renderPage();
    await screen.findByText("Store 1");
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(mockGetStoreConfigurations).toHaveBeenLastCalledWith(2, 20));
    const sizeGroup = screen.getByRole("group", { name: "common.rowsPerPage" });
    fireEvent.click(within(sizeGroup).getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "50" }));
    await waitFor(() => expect(mockGetStoreConfigurations).toHaveBeenLastCalledWith(1, 50));
  });
});

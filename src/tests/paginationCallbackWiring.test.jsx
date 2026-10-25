import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import QueueList from "../page/queue/QueueList";
import WaiterRequestList from "../page/waiterRequest/WaiterRequestList";
import PromoCampaignList from "../page/promo/PromoCampaignList";
import { getQueueList } from "@/services/queue";
import { getWaiterRequestList } from "@/services/waiterRequest";
import { getCampaigns } from "@/services/promo";

// jsdom has no ResizeObserver; DataTable's sticky-column measurement effect
// needs a stub to mount at all. Unrelated to the bug under test.
window.ResizeObserver =
  window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// Phase 11/14 carry-over bug: QueueList, WaiterRequestList, and
// PromoCampaignList each pass `pagination={data?.pagination}` (the raw API
// pagination metadata, no callbacks) plus SEPARATE top-level
// `onPageChange`/`onLimitChange` props to <DataTable>. DataTable only ever
// reads onPageChange/onPageSizeChange nested INSIDE its `pagination` object
// prop (DataTable.jsx: `const { page, totalPages, ..., onPageChange,
// onPageSizeChange } = pagination`) — the top-level props are silently
// ignored, so `onPageChange` is undefined and clicking Next throws
// `TypeError: onPageChange is not a function`. Every other DataTable
// consumer in this codebase (ARPaymentList, BomList, CategoryList, ...)
// already nests these correctly.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn()
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "super_admin", store: null } }]
}));
jest.mock("@/hooks/useGlobalStoreFilter", () => ({
  useGlobalStoreFilter: () => ["all", jest.fn()]
}));
jest.mock("@/utils/permission", () => ({
  canAccess: () => true
}));
jest.mock("@/services/queue", () => ({
  getQueueList: jest.fn(),
  getQueueStats: jest.fn(() => Promise.resolve({ data: {} })),
  updateQueueStatus: jest.fn()
}));
jest.mock("@/services/waiterRequest", () => ({
  getWaiterRequestList: jest.fn(),
  updateWaiterRequestStatus: jest.fn()
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/socket", () => ({
  useSocket: () => ({ socket: null, connected: false })
}));
jest.mock("@/services/promo", () => ({
  getCampaigns: jest.fn(),
  getCampaignStats: jest.fn(() => Promise.resolve({ data: {} })),
  updateCampaignStatus: jest.fn(),
  deleteCampaign: jest.fn()
}));

const renderWithClient = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
};

const twoPageResponse = (rows) => ({
  data: rows,
  pagination: { page: 1, totalPages: 2, total: rows.length + 1 }
});

// React 18 reports an error thrown inside a DOM event handler asynchronously
// via console.error ("Uncaught [...]") rather than re-throwing it through
// fireEvent.click's own call stack, so the bug must be observed via this spy
// rather than expect(...).toThrow().
let consoleErrorSpy;
beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});
const hadOnPageChangeError = () =>
  consoleErrorSpy.mock.calls.some((args) =>
    args.some((a) => String(a).includes("onPageChange is not a function"))
  );

describe("Pagination callback wiring — QueueList", () => {
  test("clicking Next page does not throw and re-fetches page 2", async () => {
    getQueueList.mockResolvedValue(
      twoPageResponse([{ id: 1, customerName: "Budi", partySize: 2, status: "waiting" }])
    );
    renderWithClient(<QueueList />);

    // Wait for the row data to actually resolve before clicking — the
    // pagination controls render as soon as `pagination` is a truthy
    // object (even before data loads), so clicking too early would race
    // the query itself rather than exercise the wiring bug.
    await screen.findByText("Budi");
    const nextButton = screen.getByLabelText("common.nextPage");
    fireEvent.click(nextButton);

    await waitFor(() =>
      expect(getQueueList).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
    );
    expect(hadOnPageChangeError()).toBe(false);
  });
});

describe("Pagination callback wiring — WaiterRequestList", () => {
  test("clicking Next page does not throw and re-fetches page 2", async () => {
    getWaiterRequestList.mockResolvedValue(
      twoPageResponse([
        { id: 1, table: { name: "Table 1" }, status: "pending", requestType: "water" }
      ])
    );
    renderWithClient(<WaiterRequestList />);

    await screen.findByText("Table 1");
    const nextButton = screen.getByLabelText("common.nextPage");
    fireEvent.click(nextButton);

    await waitFor(() =>
      expect(getWaiterRequestList).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
    );
    expect(hadOnPageChangeError()).toBe(false);
  });
});

describe("Pagination callback wiring — PromoCampaignList", () => {
  test("clicking Next page does not throw and re-fetches page 2", async () => {
    getCampaigns.mockResolvedValue(
      twoPageResponse([{ id: 1, name: "Promo A", status: "active", type: "percent" }])
    );
    renderWithClient(<PromoCampaignList />);

    await screen.findByText("Promo A");
    const nextButton = screen.getByLabelText("common.nextPage");
    fireEvent.click(nextButton);

    await waitFor(() =>
      expect(getCampaigns).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
    );
    expect(hadOnPageChangeError()).toBe(false);
  });
});

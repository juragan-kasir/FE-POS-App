import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashRegisterDetail from "../page/cash-register/CashRegisterDetail";
import XZReport from "../page/cash-register/XZReport";
import { getXReport, getZReport, getCashRegisterHistory } from "@/services/cash-register";
import { getOrdersByStore } from "@/services/order";

// jsdom lacks ResizeObserver; Radix components may mount one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;

// BA finding #1 (Waroeng Bakso dummy, 2026-10-17): register + X/Z reports
// had no per-invoice / per-product detail. Register Detail rows expand to
// show the order's line items (already present on the payload); the X/Z
// report renders the backend's salesByProduct breakdown.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts?.count != null ? `${k}:${opts.count}` : k)
  })
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ activeStore: "1", user: { roleType: "admin", store: 1 } }]
}));

jest.mock("@/hooks/useGlobalStoreFilter", () => ({
  useGlobalStoreFilter: () => ["all", jest.fn()]
}));

jest.mock("@/services/order", () => ({
  getOrdersByStore: jest.fn()
}));

jest.mock("@/services/cash-register", () => ({
  getXReport: jest.fn(),
  getZReport: jest.fn(),
  getCashRegisterHistory: jest.fn()
}));

jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn().mockResolvedValue({ data: [] })
}));

const mockLocation = {
  state: {
    item: {
      id: 7001,
      store: 1,
      status: "closed",
      openingBalance: 100000,
      totalSales: 60000,
      totalExpenses: 0,
      closingBalance: 160000,
      openedAt: "2026-09-12T10:00:00.000Z",
      closedAt: "2026-09-12T12:00:00.000Z",
      storeData: { name: "Store A" },
      userData: { fullName: "angga" }
    }
  }
};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
  useLocation: () => mockLocation
}));

const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
};

const orderWithItems = {
  id: 11,
  orderNumber: "ORD-11",
  status: "served",
  paymentMethod: "cash",
  totalPrice: 60000,
  createdAt: "2026-09-12T10:02:00.000Z",
  items: [{ id: 1, productName: "Bakso Urat", quantity: 2, price: 25000, totalPrice: 50000 }]
};

const emptyOutside = { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } };

describe("CashRegisterDetail — per-invoice item detail (BA finding #1)", () => {
  beforeEach(() => {
    getZReport.mockResolvedValue({ data: null });
    getOrdersByStore.mockImplementation((payload) =>
      payload?.window === "outside"
        ? Promise.resolve(emptyOutside)
        : Promise.resolve({
            data: [orderWithItems],
            pagination: { total: 1, page: 1, limit: 50, totalPages: 1 }
          })
    );
  });

  test("an invoice row expands to its line items and collapses again", async () => {
    renderWithProviders(<CashRegisterDetail />);
    expect(await screen.findByText("ORD-11")).toBeInTheDocument();

    // Items are on the payload but hidden until the row is expanded.
    expect(screen.queryByText("Bakso Urat")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("page.cashRegister.detail.toggleItems"));
    expect(await screen.findByText("Bakso Urat")).toBeInTheDocument();
    expect(screen.getByText("page.cashRegister.detail.itemProduct")).toBeInTheDocument();
    expect(screen.getByText("page.cashRegister.detail.itemQty")).toBeInTheDocument();
    expect(screen.getByText("page.cashRegister.detail.itemPrice")).toBeInTheDocument();
    expect(screen.getByText("page.cashRegister.detail.itemTotal")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Rp 25.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 50.000")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("page.cashRegister.detail.toggleItems"));
    await waitFor(() => expect(screen.queryByText("Bakso Urat")).not.toBeInTheDocument());
  });
});

describe("XZReport — per-product breakdown (BA finding #1)", () => {
  const xReportData = {
    register: { id: 5, status: "open", openingBalance: 0 },
    store: { name: "Store A" },
    cashier: { fullName: "angga" },
    summary: {
      totalTransactions: 1,
      totalQuantity: 2,
      subtotal: 50000,
      totalSales: 50000,
      totalExpenses: 0,
      totalCashPayment: 50000,
      expectedCash: 50000
    },
    payments: [{ type: "cash", amount: 50000, count: 1 }],
    expenses: []
  };

  beforeEach(() => {
    getCashRegisterHistory.mockResolvedValue({ data: [] });
    getZReport.mockResolvedValue({ data: null });
  });

  test("renders salesByProduct: name, SKU, qty × unit price, line total", async () => {
    getXReport.mockResolvedValue({
      data: {
        ...xReportData,
        salesByProduct: [
          {
            productName: "Bakso Urat",
            sku: "SKU-1",
            quantity: 2,
            unitPrice: 25000,
            totalSales: 50000
          }
        ]
      }
    });
    renderWithProviders(<XZReport />);
    expect(await screen.findByText("page.cashRegister.xz.salesByProductTitle")).toBeInTheDocument();
    expect(screen.getByText("Bakso Urat")).toBeInTheDocument();
    expect(screen.getByText("SKU-1 · 2 × Rp 25.000")).toBeInTheDocument();
  });

  test("shows the opening time on the store's clock, not the device's", async () => {
    getXReport.mockResolvedValue({
      data: {
        ...xReportData,
        register: { ...xReportData.register, openedAt: "2026-09-12T10:00:00.000Z" },
        store: { name: "Store A", timezone: "Pacific/Kiritimati" }
      }
    });
    renderWithProviders(<XZReport />);
    const expected = new Date("2026-09-12T10:00:00.000Z").toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Pacific/Kiritimati"
    });
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  test("omits the section entirely when the report has no breakdown (legacy Z)", async () => {
    getXReport.mockResolvedValue({ data: { ...xReportData } });
    renderWithProviders(<XZReport />);
    expect(await screen.findByText("page.cashRegister.xz.summaryTitle")).toBeInTheDocument();
    expect(screen.queryByText("page.cashRegister.xz.salesByProductTitle")).not.toBeInTheDocument();
  });
});

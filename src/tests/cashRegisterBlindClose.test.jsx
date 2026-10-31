import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashRegisterHistory from "../page/cash-register/CashRegisterHistory";
import { getCashRegisterHistory, closeCashRegister } from "@/services/cash-register";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts?.count != null ? `${k}:${opts.count}` : k)
  })
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ activeStore: "1", user: { id: 1, roleType: "super_admin" } }]
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));
jest.mock("@/services/cash-register", () => ({
  getCashRegisterHistory: jest.fn(),
  closeCashRegister: jest.fn(() => Promise.resolve({ data: {} })),
  getZReport: jest.fn()
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/order", () => ({
  getOrdersByStore: jest.fn(() => Promise.resolve({ data: [], pagination: { total: 0 } }))
}));
jest.mock("@/hooks/useGlobalStoreFilter", () => ({
  useGlobalStoreFilter: () => ["all", jest.fn()]
}));
jest.mock("@/components/ui/StoreFilter", () => () => null);
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn()
}));

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const OPEN_ROW = {
  id: 3,
  store: 2,
  status: "open",
  openingBalance: 500000,
  totalSales: 94350,
  totalExpenses: 0,
  closingBalance: 0,
  openedAt: "2026-10-31T11:18:57.000Z",
  closedAt: null,
  storeData: { name: "Sumber Rejeki - Kaliurang" },
  userData: { fullName: "Super Admin" }
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <CashRegisterHistory />
      </QueryClientProvider>
    </MemoryRouter>
  );

const openCloseDialog = async () => {
  fireEvent.click(
    await screen.findByRole("button", { name: "page.cashRegister.history.closeRegister" })
  );
  return screen.findByLabelText(/page.cashRegister.current.closingBalance/);
};

const confirmButton = () =>
  screen.getByRole("button", { name: "page.cashRegister.history.closeConfirm" });

describe("Tutup Register from the history list is a blind count", () => {
  beforeEach(() => {
    closeCashRegister.mockClear();
    getCashRegisterHistory.mockResolvedValue({
      data: [OPEN_ROW],
      pagination: { total: 1, totalPages: 1 }
    });
  });

  test("the closing balance starts empty instead of a system-computed amount", async () => {
    renderPage();
    const input = await openCloseDialog();
    expect(input).toHaveValue("");
    expect(screen.getByText("page.cashRegister.history.blindCountHint")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  test("the counted amount is what gets sent", async () => {
    renderPage();
    const input = await openCloseDialog();
    fireEvent.change(input, { target: { value: "570000" } });
    expect(confirmButton()).toBeEnabled();
    fireEvent.click(confirmButton());

    await waitFor(() =>
      expect(closeCashRegister).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ storeId: 2, closingBalance: 570000 })
      )
    );
  });

  test("an empty drawer can be closed by typing 0", async () => {
    renderPage();
    const input = await openCloseDialog();
    fireEvent.change(input, { target: { value: "0" } });
    expect(confirmButton()).toBeEnabled();
    fireEvent.click(confirmButton());

    await waitFor(() =>
      expect(closeCashRegister).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ closingBalance: 0 })
      )
    );
  });
});

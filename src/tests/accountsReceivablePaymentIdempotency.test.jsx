import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import AccountsReceivableList from "../page/accounts-receivable/AccountsReceivableList";
import { getARList, getARAging, recordARPayment } from "../services/accounts-receivable";

// jsdom has no ResizeObserver; DataTable's sticky-column measurement effect
// needs a stub to mount at all. Unrelated to the bug under test.
window.ResizeObserver =
  window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn()
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 1 } }]
}));
jest.mock("@/hooks/useGlobalStoreFilter", () => ({
  useGlobalStoreFilter: () => ["all", jest.fn()]
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("../services/accounts-receivable", () => ({
  getARList: jest.fn(),
  getARAging: jest.fn(),
  recordARPayment: jest.fn()
}));

const arRow = {
  id: 42,
  invoiceNo: "AR-042",
  customerName: "Toko Maju",
  totalAmount: 500000,
  paidAmount: 0,
  outstandingAmount: 500000,
  status: "UNPAID"
};

const renderWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AccountsReceivableList />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

const findPayButton = async () => {
  await screen.findByText("AR-042");
  const matches = screen.getAllByText("page.accountsReceivable.list.payButton");
  const button = matches.map((el) => el.closest("button")).find(Boolean);
  if (!button) throw new Error("Pay button not found among matches");
  return button;
};

const clickPayThenConfirm = async () => {
  const payButton = await findPayButton();
  fireEvent.click(payButton);
  const confirmButton = await screen.findByText("page.accountsReceivable.list.modal.confirm");
  fireEvent.click(confirmButton);
  return confirmButton;
};

describe("AccountsReceivableList payment idempotency", () => {
  beforeEach(() => {
    getARList.mockReset().mockResolvedValue({
      data: [arRow],
      pagination: { total: 1, totalPages: 1 }
    });
    getARAging.mockReset().mockResolvedValue({ data: { buckets: {}, grandTotal: 0 } });
    recordARPayment.mockReset().mockResolvedValue({ success: true });
  });

  test("sends a non-empty reference alongside id and amount (payload contract)", async () => {
    renderWithClient();

    await clickPayThenConfirm();

    await waitFor(() => expect(recordARPayment).toHaveBeenCalledTimes(1));
    const [id, payload] = recordARPayment.mock.calls[0];
    expect(id).toBe(arRow.id);
    expect(payload.amount).toBe(String(arRow.outstandingAmount));
    expect(payload.reference).toBeTruthy();
  });

  test("reuses the exact same reference across a rapid double-submit of one attempt", async () => {
    renderWithClient();

    const payButton = await findPayButton();
    fireEvent.click(payButton);
    const confirmButton = await screen.findByText("page.accountsReceivable.list.modal.confirm");

    // Fire both clicks synchronously, back-to-back, before React flushes the
    // async onConfirm's state updates — this is the realistic shape of a
    // double-click / flaky-network-retry within one open attempt.
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => expect(recordARPayment).toHaveBeenCalledTimes(2));
    const firstRef = recordARPayment.mock.calls[0][1].reference;
    const secondRef = recordARPayment.mock.calls[1][1].reference;
    expect(firstRef).toBeTruthy();
    expect(secondRef).toBe(firstRef);
  });

  test("issues a fresh reference for a genuinely new payment attempt", async () => {
    renderWithClient();

    await clickPayThenConfirm();
    await waitFor(() => expect(recordARPayment).toHaveBeenCalledTimes(1));
    const firstRef = recordARPayment.mock.calls[0][1].reference;

    await clickPayThenConfirm();
    await waitFor(() => expect(recordARPayment).toHaveBeenCalledTimes(2));
    const secondRef = recordARPayment.mock.calls[1][1].reference;

    expect(secondRef).toBeTruthy();
    expect(secondRef).not.toBe(firstRef);
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "react-query";
import ReceiptModal from "../page/cashier/components/ReceiptModal";
import {
  getSplitBillByOrder,
  paySplitBill,
  cancelSplitBill,
  mergeSplitBills
} from "../services/split-bill";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (opts?.count != null ? `${k}:${opts.count}` : k) })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));

jest.mock("@/utils/thermalPrint", () => ({ printReceipt: jest.fn() }));

jest.mock("@/services/invoice", () => ({
  getInvoiceSetting: jest.fn(() => Promise.resolve({ data: {} }))
}));
jest.mock("@/services/location", () => ({
  getLocationById: jest.fn(() => Promise.resolve({ data: {} }))
}));
jest.mock("@/services/general", () => ({
  getProvinces: jest.fn(() => Promise.resolve([])),
  getCities: jest.fn(() => Promise.resolve([])),
  getDistricts: jest.fn(() => Promise.resolve([])),
  getVillages: jest.fn(() => Promise.resolve([])),
  getPostalCode: jest.fn(() => Promise.resolve([]))
}));
jest.mock("@/services/type-payment", () => ({
  getAllTypePayment: jest.fn(() =>
    Promise.resolve({
      data: [
        { type: "cash", name: "Cash", status: "active" },
        { type: "qris", name: "QRIS", status: "active" }
      ]
    })
  )
}));

jest.mock("../services/split-bill", () => ({
  createSplitBill: jest.fn(() => Promise.resolve({ data: [] })),
  getSplitBillByOrder: jest.fn(),
  paySplitBill: jest.fn(),
  cancelSplitBill: jest.fn(),
  mergeSplitBills: jest.fn()
}));

// Radix Select needs pointer-capture APIs jsdom doesn't implement.
jest.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }) => (
    <select
      aria-label="split-pay-method"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: ({ children }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>
}));

let mockCookieUser = { id: 1, roleType: "admin", store: 7 };
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: mockCookieUser, activeStore: 7 }]
}));

const orderData = { id: 501, orderNumber: "ORD-501", total: 100000, items: [] };

const renderModal = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptModal data={orderData} onClose={jest.fn()} onNewTransaction={jest.fn()} />
    </QueryClientProvider>
  );
};

describe("ReceiptModal split-bill management", () => {
  beforeEach(() => {
    mockCookieUser = { id: 1, roleType: "admin", store: 7 };
    getSplitBillByOrder.mockReset();
    paySplitBill.mockReset();
    cancelSplitBill.mockReset();
    mergeSplitBills.mockReset();
  });

  test("shows existing pending/paid splits with pay/cancel actions for admin", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [
          { id: 1, splitNumber: "SPL001", amount: 50000, status: "pending" },
          { id: 2, splitNumber: "SPL002", amount: 50000, status: "paid" }
        ],
        summary: { totalSplits: 2, totalPaid: 50000, totalPending: 50000 }
      }
    });

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));

    await waitFor(() => expect(screen.getByText("SPL001")).toBeInTheDocument());
    expect(screen.getByText("SPL002")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.receipt.splitPay")).toBeInTheDocument();
  });

  test("pays a pending split with the chosen method", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [{ id: 1, splitNumber: "SPL001", amount: 50000, status: "pending" }],
        summary: { totalSplits: 1, totalPaid: 0, totalPending: 50000 }
      }
    });
    paySplitBill.mockResolvedValue({ data: { orderComplete: false } });

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));
    await waitFor(() => expect(screen.getByText("SPL001")).toBeInTheDocument());

    fireEvent.click(screen.getByText("page.cashier.receipt.splitPay"));
    fireEvent.change(screen.getByLabelText("split-pay-method"), { target: { value: "cash" } });

    const confirmButtons = screen.getAllByRole("button");
    const confirmBtn = confirmButtons.find((b) => b.querySelector("svg.lucide-circle-check-big"));
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(paySplitBill).toHaveBeenCalledWith(1, { paymentMethod: "cash" }));
  });

  test("a non-cash split needs its reference and sends it (DR-23 §D)", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [{ id: 1, splitNumber: "SPL001", amount: 50000, status: "pending" }],
        summary: { totalSplits: 1, totalPaid: 0, totalPending: 50000 }
      }
    });
    paySplitBill.mockResolvedValue({ data: { orderComplete: false } });

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));
    await waitFor(() => expect(screen.getByText("SPL001")).toBeInTheDocument());
    fireEvent.click(screen.getByText("page.cashier.receipt.splitPay"));
    fireEvent.change(screen.getByLabelText("split-pay-method"), { target: { value: "qris" } });

    const confirm = screen.getByLabelText("page.cashier.receipt.splitPayConfirm");
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("page.cashier.collectPayment.reference.label"), {
      target: { value: "  QR-77 " }
    });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(paySplitBill).toHaveBeenCalledWith(1, {
        paymentMethod: "qris",
        referenceNumber: "QR-77"
      })
    );
  });

  test("a reused split reference shows the duplicate message (BA 004)", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [{ id: 1, splitNumber: "SPL001", amount: 50000, status: "pending" }],
        summary: { totalSplits: 1, totalPaid: 0, totalPending: 50000 }
      }
    });
    paySplitBill.mockRejectedValue({
      response: { status: 409, data: { code: "DUPLICATE_REFERENCE" } }
    });

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));
    await waitFor(() => expect(screen.getByText("SPL001")).toBeInTheDocument());
    fireEvent.click(screen.getByText("page.cashier.receipt.splitPay"));
    fireEvent.change(screen.getByLabelText("split-pay-method"), { target: { value: "qris" } });
    fireEvent.change(screen.getByLabelText("page.cashier.collectPayment.reference.label"), {
      target: { value: "QR-77" }
    });
    fireEvent.click(screen.getByLabelText("page.cashier.receipt.splitPayConfirm"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("page.cashier.collectPayment.reference.duplicate")
    );
  });

  test("cancels a pending split", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [{ id: 3, splitNumber: "SPL003", amount: 20000, status: "pending" }],
        summary: { totalSplits: 1, totalPaid: 0, totalPending: 20000 }
      }
    });
    cancelSplitBill.mockResolvedValue({});

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));
    await waitFor(() => expect(screen.getByText("SPL003")).toBeInTheDocument());

    const trashButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg.lucide-trash2"));
    fireEvent.click(trashButtons[0]);

    await waitFor(() => expect(cancelSplitBill).toHaveBeenCalledWith(3));
  });

  test("merges two selected pending splits", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [
          { id: 4, splitNumber: "SPL004", amount: 10000, status: "pending" },
          { id: 5, splitNumber: "SPL005", amount: 10000, status: "pending" }
        ],
        summary: { totalSplits: 2, totalPaid: 0, totalPending: 20000 }
      }
    });
    mergeSplitBills.mockResolvedValue({});

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));
    await waitFor(() => expect(screen.getByText("SPL004")).toBeInTheDocument());

    const checkboxes = screen.getAllByLabelText("page.cashier.receipt.splitSelectForMerge");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByText(/page.cashier.receipt.splitMergeSelected/));

    await waitFor(() =>
      expect(mergeSplitBills).toHaveBeenCalledWith({ order: 501, splitIds: [4, 5] })
    );
  });

  // DR-23 §J (BA §35.10) interim mapping: split.manage and payment.collect
  // are kasir default grants; staff ("user") hold no sales rights.
  test("kasir can pay and merge pending splits", async () => {
    mockCookieUser = { id: 2, roleType: "kasir", store: 7 };
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [{ id: 6, splitNumber: "SPL006", amount: 30000, status: "pending" }],
        summary: { totalSplits: 1, totalPaid: 0, totalPending: 30000 }
      }
    });

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));

    await waitFor(() => expect(screen.getByText("SPL006")).toBeInTheDocument());
    expect(screen.getByText("page.cashier.receipt.splitPay")).toBeInTheDocument();
    expect(screen.getByLabelText("page.cashier.receipt.splitSelectForMerge")).toBeInTheDocument();
  });

  test("staff (user) sees no pay/merge split actions", async () => {
    mockCookieUser = { id: 3, roleType: "user", store: 7 };
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [{ id: 6, splitNumber: "SPL006", amount: 30000, status: "pending" }],
        summary: { totalSplits: 1, totalPaid: 0, totalPending: 30000 }
      }
    });

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));

    await waitFor(() =>
      expect(screen.queryByText("page.cashier.receipt.splitPay")).not.toBeInTheDocument()
    );
    expect(
      screen.queryByLabelText("page.cashier.receipt.splitSelectForMerge")
    ).not.toBeInTheDocument();
  });

  test("shows the create-split form when no splits exist yet", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: { splits: [], summary: { totalSplits: 0, totalPaid: 0, totalPending: 0 } }
    });

    renderModal();
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));

    await waitFor(() =>
      expect(screen.getByText("page.cashier.receipt.splitPeople")).toBeInTheDocument()
    );
  });
});

describe("ReceiptModal — accessible dialog semantics (F9-04)", () => {
  beforeEach(() => {
    mockCookieUser = { id: 1, roleType: "admin", store: 7 };
    getSplitBillByOrder.mockReset();
  });

  test("renders as a properly-labelled dialog", async () => {
    renderModal();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("page.cashier.receipt.title");
  });

  test("Escape closes the main receipt when the split-bill dialog is not open", async () => {
    const onClose = jest.fn();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ReceiptModal data={orderData} onClose={onClose} onNewTransaction={jest.fn()} />
      </QueryClientProvider>
    );
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("Escape closes only the split-bill dialog (the topmost layer), not the main receipt", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: { splits: [], summary: { totalSplits: 0, totalPaid: 0, totalPending: 0 } }
    });
    const onClose = jest.fn();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ReceiptModal data={orderData} onClose={onClose} onNewTransaction={jest.fn()} />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByText("page.cashier.receipt.split"));
    await waitFor(() =>
      expect(screen.getByText("page.cashier.receipt.splitTitle")).toBeInTheDocument()
    );

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByText("page.cashier.receipt.splitTitle")).not.toBeInTheDocument()
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ReceiptModal — split bill only for orders still due (DR-23)", () => {
  beforeEach(() => {
    mockCookieUser = { id: 1, roleType: "admin", store: 7 };
    getSplitBillByOrder.mockReset();
    paySplitBill.mockReset();
  });

  const renderWith = (data, handlers = {}) =>
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
          })
        }>
        <ReceiptModal
          data={data}
          onClose={handlers.onClose || jest.fn()}
          onNewTransaction={handlers.onNewTransaction || jest.fn()}
        />
      </QueryClientProvider>
    );

  test("a paid checkout shows no Split action (the server would refuse it)", async () => {
    renderWith({ ...orderData, paymentStatus: "paid" });
    await screen.findByRole("dialog");

    expect(screen.queryByText("page.cashier.receipt.split")).not.toBeInTheDocument();
    expect(screen.getByText("page.cashier.receipt.paymentSuccess")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.receipt.newTransaction")).toBeInTheDocument();
  });

  test("an unpaid order from the queue opens on the split panel and says it is still due", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: { splits: [], summary: { totalSplits: 0, totalPaid: 0, totalPending: 0 } }
    });
    const onClose = jest.fn();
    const onNewTransaction = jest.fn();
    renderWith({ ...orderData, paymentStatus: "unpaid" }, { onClose, onNewTransaction });

    expect(await screen.findByText("page.cashier.receipt.splitTitle")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.receipt.awaitingPayment")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.receipt.totalDue")).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.receipt.paymentSuccess")).not.toBeInTheDocument();
    expect(screen.queryByText("page.cashier.receipt.paidWith")).not.toBeInTheDocument();

    // Back on the receipt, the primary action closes without clearing the cart.
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByText("page.cashier.receipt.splitTitle")).not.toBeInTheDocument()
    );
    expect(screen.queryByText("page.cashier.receipt.newTransaction")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("common.close"));
    expect(onClose).toHaveBeenCalled();
    expect(onNewTransaction).not.toHaveBeenCalled();
  });

  test("paying the last split marks the bill as paid", async () => {
    getSplitBillByOrder.mockResolvedValue({
      data: {
        splits: [{ id: 1, splitNumber: "SPL001", amount: 100000, status: "pending" }],
        summary: { totalSplits: 1, totalPaid: 0, totalPending: 100000 }
      }
    });
    paySplitBill.mockResolvedValue({ data: { orderComplete: true } });
    renderWith({ ...orderData, paymentStatus: "partial" });

    await waitFor(() => expect(screen.getByText("SPL001")).toBeInTheDocument());
    fireEvent.click(screen.getByText("page.cashier.receipt.splitPay"));
    fireEvent.change(screen.getByLabelText("split-pay-method"), { target: { value: "cash" } });
    fireEvent.click(screen.getByLabelText("page.cashier.receipt.splitPayConfirm"));

    await waitFor(() =>
      expect(screen.getByText("page.cashier.receipt.paymentSuccess")).toBeInTheDocument()
    );
    expect(screen.queryByText("page.cashier.receipt.awaitingPayment")).not.toBeInTheDocument();
  });
});

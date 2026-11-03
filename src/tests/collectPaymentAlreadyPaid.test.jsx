import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { toast } from "sonner";
import CollectPaymentModal from "../page/cashier/components/CollectPaymentModal";
import { getOrderById, updateOrderStatus } from "../services/order";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 9, fullName: "Kasir Uji", roleType: "admin" } }]
}));
jest.mock("../services/order", () => ({
  getOrderById: jest.fn(),
  updateOrderStatus: jest.fn(),
  createOrder: jest.fn(),
  getOrdersByStore: jest.fn()
}));
jest.mock("../services/member", () => ({
  getMemberById: jest.fn(() => Promise.resolve({ data: null })),
  getAllMember: jest.fn()
}));
jest.mock("../components/MemberSearchModal", () => ({
  __esModule: true,
  default: () => null
}));

// DR-23 §K/§M: a settlement retried after its response was lost is refused
// with 409 OUTSTANDING_CHANGED. With the ledger-derived financialState the
// modal tells "already fully paid" apart from "amount stale": it shows the
// paid state and the receipt, and never settles again.

const unpaidOrder = {
  id: 421,
  orderNumber: "CUST-00000421",
  source: "qr",
  store: 7,
  tableId: 11,
  customerId: null,
  paymentStatus: "unpaid",
  paymentMethod: "Tunai",
  status: "served",
  totalPrice: 150000,
  items: [{ id: 1, productName: "Nasi Goreng", quantity: 2, price: 75000, totalPrice: 150000 }]
};
const P = "page.cashier.collectPayment";

const openConfirm = async (props) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <CollectPaymentModal order={unpaidOrder} store={7} {...props} />
    </QueryClientProvider>
  );
  await waitFor(() => screen.getByText(`${P}.payFull`));
  fireEvent.click(screen.getByText(`${P}.payFull`));
  await waitFor(() => screen.getByText(`${P}.confirm`));
  // PGA-06: nothing is preselected and cash needs a counted amount.
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "cash" } });
  fireEvent.click(screen.getByText("page.cashier.exactCash"));
};

beforeEach(() => {
  jest.clearAllMocks();
  getOrderById.mockResolvedValue({ data: unpaidOrder });
});

test("a retry that finds the order fully PAID shows the paid state and its receipt — no second settlement", async () => {
  updateOrderStatus.mockRejectedValue({
    response: {
      status: 409,
      data: {
        code: "OUTSTANDING_CHANGED",
        outstanding: 0,
        financialState: "PAID",
        netPayable: 150000,
        collected: 150000
      }
    }
  });
  const onOpenReceipt = jest.fn();
  const onClose = jest.fn();
  await openConfirm({ onOpenReceipt, onClose });
  fireEvent.click(screen.getByText(`${P}.confirm`));

  await waitFor(() => expect(screen.getByTestId("collect-already-paid")).toBeInTheDocument());
  expect(toast.info).toHaveBeenCalledWith(`${P}.alreadyPaid`);
  expect(toast.error).not.toHaveBeenCalledWith(`${P}.outstandingChanged`);
  expect(screen.queryByText(`${P}.confirm`)).not.toBeInTheDocument();

  getOrderById.mockResolvedValueOnce({
    data: { ...unpaidOrder, paymentStatus: "paid", paymentMethod: "CASH" }
  });
  fireEvent.click(screen.getByText(`${P}.viewReceipt`));
  await waitFor(() => expect(onOpenReceipt).toHaveBeenCalledTimes(1));
  const receipt = onOpenReceipt.mock.calls[0][0];
  expect(receipt).toMatchObject({ id: 421, total: 150000, paymentMethod: "CASH" });
  expect(receipt.tenderDetailUnknown).toBe(true);
  expect(receipt.cashAmount).toBeNull();
  expect(onClose).toHaveBeenCalled();
  expect(updateOrderStatus).toHaveBeenCalledTimes(1);
});

test("an amount that is merely stale (still owed) keeps the existing outstanding-changed path", async () => {
  updateOrderStatus.mockRejectedValue({
    response: {
      status: 409,
      data: {
        code: "OUTSTANDING_CHANGED",
        outstanding: 50000,
        financialState: "PARTIALLY_PAID",
        netPayable: 150000,
        collected: 100000
      }
    }
  });
  await openConfirm({ onOpenReceipt: jest.fn(), onClose: jest.fn() });
  fireEvent.click(screen.getByText(`${P}.confirm`));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(`${P}.outstandingChanged`));
  expect(screen.queryByTestId("collect-already-paid")).not.toBeInTheDocument();
  expect(toast.info).not.toHaveBeenCalled();
});

test("without financialState (deployed BE) an OUTSTANDING_CHANGED is never read as paid", async () => {
  updateOrderStatus.mockRejectedValue({
    response: { status: 409, data: { code: "OUTSTANDING_CHANGED", outstanding: 0 } }
  });
  await openConfirm({ onOpenReceipt: jest.fn(), onClose: jest.fn() });
  fireEvent.click(screen.getByText(`${P}.confirm`));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(`${P}.outstandingChanged`));
  expect(screen.queryByTestId("collect-already-paid")).not.toBeInTheDocument();
});

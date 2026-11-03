import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { toast } from "sonner";
import CollectPaymentModal from "../page/cashier/components/CollectPaymentModal";
import { getOrderById, updateOrderStatus } from "../services/order";
import { getMemberById } from "../services/member";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
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
  getMemberById: jest.fn(),
  getAllMember: jest.fn()
}));

// DR-16: the real MemberSearchModal performs its own member lookup; here it
// is stubbed to return a fixed verified member record so these tests assert
// this modal's wiring (selection -> payload -> conflict handling) rather
// than re-testing the search modal itself (see memberSearchModal.test.jsx).
jest.mock("../components/MemberSearchModal", () => ({
  __esModule: true,
  default: ({ open, onClose, onSelect }) =>
    open ? (
      <div>
        <button
          onClick={() =>
            onSelect({
              id: 77,
              name: "Siti Member",
              phoneNumber: "0812333444",
              totalPoints: 0
            })
          }>
          pick-member-77
        </button>
        <button onClick={onClose}>close-member-search</button>
      </div>
    ) : null
}));

// DR-16 staff-verified member attachment at settlement: an optional,
// server-looked-up member rides the paid payload as customerId; omitted when
// nothing is selected (anonymous stays anonymous); a different member than
// the order's existing one surfaces the 409 MEMBER_MISMATCH conflict.

const guestOrder = {
  id: 421,
  orderNumber: "CUST-00000421",
  source: "qr",
  store: 7,
  tableId: 11,
  customerId: null,
  paymentStatus: "unpaid",
  status: "served",
  totalPrice: 150000,
  items: [{ id: 1, productName: "Nasi Goreng", quantity: 2, price: 25000, totalPrice: 50000 }]
};

const attachedOrder = { ...guestOrder, id: 422, customerId: 55 };

const P = "page.cashier.collectPayment";

const renderModal = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CollectPaymentModal
        order={guestOrder}
        store={7}
        onClose={jest.fn()}
        onOpenReceipt={jest.fn()}
        {...props}
      />
    </QueryClientProvider>
  );
};

const openConfirm = async (props) => {
  renderModal(props);
  await waitFor(() => screen.getByText(`${P}.payFull`));
  fireEvent.click(screen.getByText(`${P}.payFull`));
  await waitFor(() => screen.getByText(`${P}.confirm`));
  // PGA-06: nothing is preselected and cash needs a counted amount.
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "cash" } });
  fireEvent.click(screen.getByText("page.cashier.exactCash"));
};

const attachMember77 = async () => {
  fireEvent.click(screen.getByText(`${P}.member.attach`));
  await waitFor(() => screen.getByText("pick-member-77"));
  fireEvent.click(screen.getByText("pick-member-77"));
  await waitFor(() => screen.getByText("Siti Member"));
};

describe("CollectPaymentModal — DR-16 member attachment at settlement", () => {
  beforeEach(() => {
    getOrderById.mockReset().mockResolvedValue({ data: guestOrder });
    updateOrderStatus.mockReset();
    getMemberById.mockReset().mockResolvedValue({
      data: { id: 55, name: "Budi Member", phoneNumber: "0812000111", totalPoints: 200000 }
    });
    toast.error.mockReset();
    toast.success.mockReset();
  });

  test("DR16-FE-01: a staff-selected member is sent as customerId on settlement", async () => {
    updateOrderStatus.mockResolvedValue({
      data: { ...guestOrder, status: "paid", paymentStatus: "paid", customerId: 77 }
    });
    const onOpenReceipt = jest.fn();
    const onClose = jest.fn();
    await openConfirm({ onOpenReceipt, onClose });
    await attachMember77();
    fireEvent.click(screen.getByText(`${P}.confirm`));

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
    expect(updateOrderStatus.mock.calls[0][0]).toMatchObject({
      id: 421,
      status: "paid",
      paymentMethod: "cash",
      customerId: 77
    });
    await waitFor(() => expect(onOpenReceipt).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  test("DR16-FE-02: no selection omits customerId so anonymous settlement stays anonymous", async () => {
    updateOrderStatus.mockResolvedValue({
      data: { ...guestOrder, status: "paid", paymentStatus: "paid" }
    });
    await openConfirm();
    fireEvent.click(screen.getByText(`${P}.confirm`));

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
    expect(updateOrderStatus.mock.calls[0][0]).not.toHaveProperty("customerId");
  });

  test("DR16-FE-03: 409 MEMBER_MISMATCH surfaces a conflict, refreshes the order, stays retryable", async () => {
    updateOrderStatus.mockRejectedValue({
      response: {
        status: 409,
        data: { code: "MEMBER_MISMATCH", error: "Cannot attach a different member ID" }
      }
    });
    const onOpenReceipt = jest.fn();
    const onClose = jest.fn();
    await openConfirm({ onOpenReceipt, onClose });
    await attachMember77();
    fireEvent.click(screen.getByText(`${P}.confirm`));

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
    // Conflict is shown inline (not a raw backend dump) and toasted.
    await waitFor(() => expect(screen.getByText(`${P}.member.mismatch`)).toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith(`${P}.member.mismatch`);
    // Server-confirmed state is re-fetched; nothing is assumed settled.
    await waitFor(() => expect(getOrderById.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(onOpenReceipt).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(`${P}.confirm`)).not.toBeDisabled());
  });

  test("DR16-FE-04: a merely staged attach does not unlock the points method", async () => {
    await openConfirm();
    await attachMember77();

    // Points redemption is derived from the order's server-confirmed member
    // only — a staged selection cannot redeem in the same settlement (the
    // server would fail it closed with 422), so the option stays disabled.
    expect(screen.getByRole("option", { name: `${P}.method.points` })).toBeDisabled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  test("DR16-FE-05: clearing the selection omits customerId again", async () => {
    updateOrderStatus.mockResolvedValue({
      data: { ...guestOrder, status: "paid", paymentStatus: "paid" }
    });
    await openConfirm();
    await attachMember77();
    fireEvent.click(screen.getByLabelText(`${P}.member.clear`));
    await waitFor(() => expect(screen.getByText(`${P}.member.attach`)).toBeInTheDocument());
    fireEvent.click(screen.getByText(`${P}.confirm`));

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
    expect(updateOrderStatus.mock.calls[0][0]).not.toHaveProperty("customerId");
  });

  test("DR16-FE-06: an already-attached order shows its server-confirmed member", async () => {
    getOrderById.mockReset().mockResolvedValue({ data: attachedOrder });
    await openConfirm({ order: attachedOrder });

    await waitFor(() => expect(getMemberById).toHaveBeenCalledWith({ id: 55 }));
    expect(screen.getByText("Budi Member")).toBeInTheDocument();
    // Change affordance present; nothing staged yet so payload stays omitted.
    expect(screen.getByText(`${P}.member.change`)).toBeInTheDocument();
  });
});

describe("CollectPaymentModal — DR-23 stale settlement conflict", () => {
  beforeEach(() => {
    getOrderById.mockReset().mockResolvedValue({ data: guestOrder });
    updateOrderStatus.mockReset();
    getMemberById.mockReset().mockResolvedValue({ data: null });
    toast.error.mockReset();
  });

  test("DR23-FE-01: 409 OUTSTANDING_CHANGED refreshes and stays retryable", async () => {
    updateOrderStatus.mockRejectedValue({
      response: { status: 409, data: { code: "OUTSTANDING_CHANGED", outstanding: 80000 } }
    });
    const onOpenReceipt = jest.fn();
    const onClose = jest.fn();
    await openConfirm({ onOpenReceipt, onClose });
    fireEvent.click(screen.getByText(`${P}.confirm`));

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith(`${P}.outstandingChanged`);
    // Server-confirmed state is re-fetched; nothing is assumed settled.
    await waitFor(() => expect(getOrderById.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(onOpenReceipt).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(`${P}.confirm`)).not.toBeDisabled());
  });
});

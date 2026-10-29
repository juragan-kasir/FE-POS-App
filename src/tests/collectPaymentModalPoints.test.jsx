import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { toast } from "sonner";
import CollectPaymentModal from "../page/cashier/components/CollectPaymentModal";
import { getOrderById, updateOrderStatus } from "../services/order";
import { getMemberById } from "../services/member";

jest.mock("react-i18next", () => ({
  // Points read "<value> pts" (page.cashier.pointsValue); other keys as-is.
  useTranslation: () => ({
    t: (k, o) => (k === "page.cashier.pointsValue" ? `${o.value} pts` : k)
  })
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
  getMemberById: jest.fn()
}));

// DR-04 P2-1: points settlement redeems the order's full totalPrice from the
// member already attached to the order. The modal shows who/how much, blocks
// guest and insufficient-balance cases (UX only — the server is the
// authority), and sends only { paymentMethod: "points" }.

const memberOrder = {
  id: 321,
  orderNumber: "CUST-00000321",
  source: "qr",
  store: 7,
  customerId: 55,
  paymentStatus: "unpaid",
  status: "served",
  totalPrice: 150000,
  items: []
};
const guestOrder = { ...memberOrder, id: 322, customerId: null };
const richMember = { id: 55, name: "Budi Member", phoneNumber: "0812000111", totalPoints: 200000 };
const poorMember = { ...richMember, totalPoints: 90000 };

const P = "page.cashier.collectPayment";

const renderModal = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CollectPaymentModal
        order={memberOrder}
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
};

const choosePoints = () =>
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "points" } });

describe("CollectPaymentModal — DR-04 P2-1 points settlement", () => {
  beforeEach(() => {
    getOrderById.mockReset().mockResolvedValue({ data: memberOrder });
    updateOrderStatus.mockReset();
    getMemberById.mockReset().mockResolvedValue({ data: richMember });
    toast.error.mockReset();
  });

  test("P21-01: member order shows identity, balance, required points and needs explicit confirmation", async () => {
    updateOrderStatus.mockResolvedValue({ data: { ...memberOrder, paymentStatus: "paid" } });
    await openConfirm();
    choosePoints();

    // Identity assertions are scoped to the points panel: since DR-16 the
    // same member is also shown in the settlement's attach section above.
    const panel = await screen.findByTestId("collect-payment-points-panel");
    expect(getMemberById).toHaveBeenCalledWith({ id: 55 });
    expect(within(panel).getByText("Budi Member")).toBeInTheDocument();
    expect(within(panel).getByText("0812000111")).toBeInTheDocument();
    expect(screen.getByTestId("collect-payment-points-balance")).toHaveTextContent("200.000 pts");
    expect(screen.getByTestId("collect-payment-points-required")).toHaveTextContent("150.000 pts");
    expect(screen.getByTestId("collect-payment-points-redeem")).toHaveTextContent("150.000 pts");

    // Unconfirmed: blocked.
    expect(screen.getByText(`${P}.confirm`)).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText(`${P}.confirm`)).not.toBeDisabled();
  });

  test("P21-02: a confirmed points settlement sends only the payment method", async () => {
    updateOrderStatus.mockResolvedValue({ data: { ...memberOrder, paymentStatus: "paid" } });
    const onOpenReceipt = jest.fn();
    await openConfirm({ onOpenReceipt });
    choosePoints();
    await waitFor(() => screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText(`${P}.confirm`));

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
    const payload = updateOrderStatus.mock.calls[0][0];
    expect(payload).toMatchObject({ id: 321, status: "paid", paymentMethod: "points" });
    expect(payload).not.toHaveProperty("customerId");
    expect(payload).not.toHaveProperty("memberId");
    expect(payload).not.toHaveProperty("redeemedPoints");
    expect(payload).not.toHaveProperty("cashAmount");
    expect(payload).not.toHaveProperty("changeAmount");

    await waitFor(() => expect(onOpenReceipt).toHaveBeenCalled());
    const receipt = onOpenReceipt.mock.calls[0][0];
    expect(receipt.paymentMethod).toBe("points");
    expect(receipt.cashAmount).toBeNull();
  });

  test("P21-03: guest order cannot select points and explains why", async () => {
    getOrderById.mockReset().mockResolvedValue({ data: guestOrder });
    await openConfirm({ order: guestOrder });

    const pointsOption = screen.getByRole("option", { name: `${P}.method.points` });
    expect(pointsOption).toBeDisabled();
    expect(screen.getByText(`${P}.points.unavailableGuest`)).toBeInTheDocument();
    expect(getMemberById).not.toHaveBeenCalled();
  });

  test("P21-04: a guest order whose stated intent is points falls back to cash, not an unsupported points settlement", async () => {
    const guestPointsIntent = { ...guestOrder, paymentMethod: "points" };
    getOrderById.mockReset().mockResolvedValue({ data: guestPointsIntent });
    updateOrderStatus.mockResolvedValue({ data: { ...guestPointsIntent, paymentStatus: "paid" } });
    await openConfirm({ order: guestPointsIntent });

    expect(screen.getByRole("combobox")).toHaveValue("cash");
    expect(screen.queryByTestId("collect-payment-points-panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(`${P}.confirm`));
    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalled());
    expect(updateOrderStatus.mock.calls[0][0].paymentMethod).toBe("cash");
  });

  test("P21-05: insufficient balance blocks confirmation and caps the displayed redemption", async () => {
    getMemberById.mockReset().mockResolvedValue({ data: poorMember });
    await openConfirm();
    choosePoints();

    await waitFor(() => expect(screen.getByText(`${P}.points.insufficient`)).toBeInTheDocument());
    expect(screen.getByTestId("collect-payment-points-redeem")).toHaveTextContent("90.000 pts");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(`${P}.confirm`)).toBeDisabled();
    fireEvent.click(screen.getByText(`${P}.confirm`));
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  test("P21-06: the server's 422 message is surfaced and nothing is shown as paid", async () => {
    updateOrderStatus.mockRejectedValue({
      response: { status: 422, data: { error: "Insufficient point balance" } }
    });
    const onOpenReceipt = jest.fn();
    const onClose = jest.fn();
    await openConfirm({ onOpenReceipt, onClose });
    choosePoints();
    await waitFor(() => screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText(`${P}.confirm`));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Insufficient point balance"));
    expect(onOpenReceipt).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("P21-07: a member that cannot be loaded blocks points settlement", async () => {
    getMemberById.mockReset().mockRejectedValue(new Error("404"));
    await openConfirm();
    choosePoints();

    await waitFor(() =>
      expect(screen.getByText(`${P}.points.memberLoadFailed`)).toBeInTheDocument()
    );
    expect(screen.getByText(`${P}.confirm`)).toBeDisabled();
  });

  test("P21-08: switching away from points and back requires re-confirmation; cash stays unaffected", async () => {
    await openConfirm();
    choosePoints();
    await waitFor(() => screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText(`${P}.confirm`)).not.toBeDisabled();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cash" } });
    expect(screen.queryByTestId("collect-payment-points-panel")).not.toBeInTheDocument();
    expect(screen.getByText(`${P}.confirm`)).not.toBeDisabled();

    choosePoints();
    await waitFor(() => screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(`${P}.confirm`)).toBeDisabled();
  });
});

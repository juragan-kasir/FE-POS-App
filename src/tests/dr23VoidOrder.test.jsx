import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { toast } from "sonner";
import VoidOrderDialog from "../components/organism/VoidOrderDialog";
import OrderQueue from "../page/cashier/components/OrderQueue";
import { getOrdersByStore, updateOrderStatus } from "../services/order";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, d) => (typeof d === "string" ? d : k) })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../services/order", () => ({
  getOrdersByStore: jest.fn(),
  updateOrderStatus: jest.fn()
}));
jest.mock("../services/cash-register", () => ({
  getCurrentCashRegister: jest.fn(() => Promise.resolve({ data: { register: { id: 999 } } }))
}));
jest.mock("../services/socket", () => ({
  useSocket: () => ({ socket: null, connected: false })
}));

// DR-23 §G (BA §35.10): void ends a paid or part-paid order with an
// immediate refund; it needs a reason and the elevated order.void
// capability. The server owns every rule — the UI collects the reason and
// the refund reference and maps each refusal to the field that fixes it.

const order = { id: 88, orderNumber: "POS-000088", store: 7 };

const withClient = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const refusal = (code, error = "refused") => {
  const err = new Error(error);
  err.response = { status: 422, data: { code, error } };
  return err;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("VoidOrderDialog", () => {
  const renderDialog = (props = {}) =>
    withClient(
      <VoidOrderDialog open onOpenChange={jest.fn()} order={order} store={7} {...props} />
    );

  test("an empty reason is refused locally — no request is sent", async () => {
    renderDialog();

    fireEvent.click(screen.getByText("page.voidOrder.confirm"));

    expect(await screen.findByText("page.voidOrder.reasonRequired")).toBeInTheDocument();
    expect(updateOrderStatus).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/page.voidOrder.reasonLabel/)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  test("submits a void with the trimmed reason and refund reference", async () => {
    const onVoided = jest.fn();
    const onOpenChange = jest.fn();
    updateOrderStatus.mockResolvedValue({ data: { ...order, status: "void" } });
    renderDialog({ onVoided, onOpenChange });

    fireEvent.change(screen.getByLabelText(/page.voidOrder.reasonLabel/), {
      target: { value: "  customer charged twice  " }
    });
    fireEvent.change(screen.getByLabelText("page.voidOrder.referenceLabel"), {
      target: { value: " QR-REF-1 " }
    });
    fireEvent.click(screen.getByText("page.voidOrder.confirm"));

    await waitFor(() =>
      expect(updateOrderStatus).toHaveBeenCalledWith({
        id: 88,
        store: 7,
        status: "void",
        reason: "customer charged twice",
        refundReference: "QR-REF-1"
      })
    );
    await waitFor(() => expect(onVoided).toHaveBeenCalledWith(order));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalled();
  });

  test("omits the refund reference when none is entered", async () => {
    updateOrderStatus.mockResolvedValue({ data: {} });
    renderDialog();

    fireEvent.change(screen.getByLabelText(/page.voidOrder.reasonLabel/), {
      target: { value: "wrong order" }
    });
    fireEvent.click(screen.getByText("page.voidOrder.confirm"));

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalled());
    expect(updateOrderStatus.mock.calls[0][0]).not.toHaveProperty("refundReference");
  });

  test("REFERENCE_REQUIRED is shown at the refund reference field and the dialog stays open", async () => {
    const onOpenChange = jest.fn();
    updateOrderStatus.mockRejectedValue(refusal("REFERENCE_REQUIRED"));
    renderDialog({ onOpenChange });

    fireEvent.change(screen.getByLabelText(/page.voidOrder.reasonLabel/), {
      target: { value: "wrong order" }
    });
    fireEvent.click(screen.getByText("page.voidOrder.confirm"));

    expect(await screen.findByText("page.voidOrder.referenceRequired")).toBeInTheDocument();
    expect(screen.getByLabelText("page.voidOrder.referenceLabel")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  test.each([
    ["REGISTER_REQUIRED", "page.voidOrder.registerRequired"],
    ["REFUND_REGISTER_ATTRIBUTION_UNAVAILABLE", "page.voidOrder.registerAttribution"],
    ["FORBIDDEN", "page.voidOrder.forbidden"]
  ])("%s is shown as an actionable form alert", async (code, key) => {
    updateOrderStatus.mockRejectedValue(refusal(code));
    renderDialog();

    fireEvent.change(screen.getByLabelText(/page.voidOrder.reasonLabel/), {
      target: { value: "wrong order" }
    });
    fireEvent.click(screen.getByText("page.voidOrder.confirm"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(key);
  });
});

describe("OrderQueue — DR-23 void entry point", () => {
  const partialOrder = {
    id: 71,
    orderNumber: "CUST-000071",
    status: "served",
    paymentStatus: "partial",
    source: "qr",
    tableId: 2,
    totalQuantity: 1,
    createdAt: new Date().toISOString(),
    cashRegisterId: 999,
    items: []
  };

  const showQueue = async (o, props) => {
    getOrdersByStore.mockImplementation(({ status }) =>
      Promise.resolve({ data: status === o.status ? [o] : [] })
    );
    withClient(
      <OrderQueue store={7} onLoadOrder={jest.fn()} onCollectPayment={jest.fn()} {...props} />
    );
    await waitFor(() =>
      expect(screen.getByText(`#${o.orderNumber.slice(-5)}`)).toBeInTheDocument()
    );
  };

  test("a part-paid order offers void to a void-capable user and opens the dialog", async () => {
    await showQueue(partialOrder, { canVoid: true });

    fireEvent.click(screen.getByText("page.voidOrder.action"));

    expect(await screen.findByLabelText(/page.voidOrder.reasonLabel/)).toBeInTheDocument();
    // cancel is not offered once money was collected
    expect(screen.queryByLabelText("page.cashier.orderQueue.cancel")).not.toBeInTheDocument();
  });

  test("void is hidden without the capability", async () => {
    await showQueue(partialOrder, { canVoid: false });
    expect(screen.queryByText("page.voidOrder.action")).not.toBeInTheDocument();
  });

  test("an unpaid order offers cancel, not void", async () => {
    await showQueue(
      { ...partialOrder, id: 72, orderNumber: "CUST-000072", paymentStatus: "unpaid" },
      { canVoid: true }
    );
    expect(screen.queryByText("page.voidOrder.action")).not.toBeInTheDocument();
    expect(screen.getByLabelText("page.cashier.orderQueue.cancel")).toBeInTheDocument();
  });

  test("a daily-counter order number shows its sequence on the card", async () => {
    getOrdersByStore.mockImplementation(({ status }) =>
      Promise.resolve({
        data:
          status === partialOrder.status
            ? [{ ...partialOrder, orderNumber: "ORD-7-261119-0042" }]
            : []
      })
    );
    withClient(<OrderQueue store={7} onLoadOrder={jest.fn()} onCollectPayment={jest.fn()} />);
    expect(await screen.findByText("#0042")).toBeInTheDocument();
    expect(screen.queryByText("#-0042")).not.toBeInTheDocument();
  });
});

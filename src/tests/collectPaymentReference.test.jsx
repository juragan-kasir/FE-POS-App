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
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 9, fullName: "Kasir Uji", roleType: "admin" } }]
}));
jest.mock("../services/type-payment", () =>
  jest.requireActual("./helpers/storePaymentTypes").storePaymentTypesMock()
);
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
jest.mock("../components/MemberSearchModal", () => ({
  __esModule: true,
  default: () => null
}));

// DR-23 §D / §M: a manually confirmed non-cash settlement carries its
// payment reference (every method but cash and points — the same set the
// backend's requiresTenderReference enforces with 422 REFERENCE_REQUIRED).

const P = "page.cashier.collectPayment";
const order = {
  id: 321,
  orderNumber: "CUST-00000321",
  source: "qr",
  store: 7,
  tableId: 10,
  customerId: null,
  paymentStatus: "unpaid",
  paymentMethod: null,
  status: "served",
  totalPrice: 150000,
  items: [{ id: 1, productName: "Nasi Goreng", quantity: 2, price: 75000, totalPrice: 150000 }]
};

const renderModal = async ({ freshOrder = order, ...props } = {}) => {
  getOrderById.mockResolvedValue({ data: freshOrder });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const handlers = { onClose: jest.fn(), onOpenReceipt: jest.fn(), ...props };
  render(
    <QueryClientProvider client={queryClient}>
      <CollectPaymentModal order={freshOrder} store={7} {...handlers} />
    </QueryClientProvider>
  );
  await waitFor(() => screen.getByText(`${P}.payFull`));
  fireEvent.click(screen.getByText(`${P}.payFull`));
  await waitFor(() => screen.getByText(`${P}.confirm`));
  return handlers;
};

const confirmButton = () => screen.getByText(`${P}.confirm`).closest("button");
const referenceInput = () => document.getElementById("collect-payment-reference");
const chooseMethod = (method) =>
  fireEvent.change(screen.getByRole("combobox"), { target: { value: method } });
const typeReference = (value) => fireEvent.change(referenceInput(), { target: { value } });
const paidResponse = { data: { ...order, status: "paid", paymentStatus: "paid" } };

beforeEach(() => {
  jest.clearAllMocks();
  getOrderById.mockReset();
  updateOrderStatus.mockReset();
});

describe("cash", () => {
  test("shows no reference input and settles without a referenceNumber", async () => {
    updateOrderStatus.mockResolvedValue(paidResponse);
    await renderModal();
    chooseMethod("cash");
    fireEvent.click(screen.getByText("page.cashier.exactCash"));
    expect(referenceInput()).not.toBeInTheDocument();
    expect(confirmButton()).not.toBeDisabled();

    fireEvent.click(confirmButton());
    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
    const payload = updateOrderStatus.mock.calls[0][0];
    expect(payload.paymentMethod).toBe("cash");
    expect(payload).not.toHaveProperty("referenceNumber");
  });

  test("a reference typed for another method is never sent with cash", async () => {
    updateOrderStatus.mockResolvedValue(paidResponse);
    await renderModal();
    chooseMethod("qris");
    typeReference("QR-1");
    chooseMethod("cash");
    fireEvent.click(screen.getByText("page.cashier.exactCash"));
    expect(referenceInput()).not.toBeInTheDocument();
    fireEvent.click(confirmButton());
    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
    expect(updateOrderStatus.mock.calls[0][0]).not.toHaveProperty("referenceNumber");
  });
});

describe("non-cash methods that require a reference", () => {
  test.each(["qris", "debit", "credit", "transfer", "e-wallet", "other"])(
    "%s: the input is shown, confirm waits for a non-blank reference, and it is sent trimmed",
    async (method) => {
      updateOrderStatus.mockResolvedValue(paidResponse);
      await renderModal();
      chooseMethod(method);

      expect(referenceInput()).toBeInTheDocument();
      expect(confirmButton()).toBeDisabled();
      typeReference("   ");
      expect(confirmButton()).toBeDisabled();
      fireEvent.click(confirmButton());
      expect(updateOrderStatus).not.toHaveBeenCalled();

      typeReference("  REF-12345  ");
      expect(confirmButton()).not.toBeDisabled();
      fireEvent.click(confirmButton());
      await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(1));
      const payload = updateOrderStatus.mock.calls[0][0];
      expect(payload).toMatchObject({ paymentMethod: method, referenceNumber: "REF-12345" });
      expect(payload).not.toHaveProperty("cashAmount");
    }
  );

  test("PGA-06: a QRIS intent is not preselected; the reference is asked once staff pick QRIS", async () => {
    updateOrderStatus.mockResolvedValue(paidResponse);
    await renderModal({ freshOrder: { ...order, paymentMethod: "qris" } });
    expect(referenceInput()).not.toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    chooseMethod("qris");
    expect(referenceInput()).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });
});

describe("reference wording", () => {
  test('the "other" method asks for a payment description, not an external reference', async () => {
    await renderModal();
    chooseMethod("other");
    expect(screen.getByText(`${P}.reference.otherLabel`)).toBeInTheDocument();
    expect(referenceInput()).toHaveAttribute("placeholder", `${P}.reference.otherPlaceholder`);
    expect(screen.getByText(`${P}.reference.otherHint`)).toBeInTheDocument();
    expect(screen.queryByText(`${P}.reference.label`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${P}.reference.hint`)).not.toBeInTheDocument();
  });

  test("non-cash transaction methods keep the payment-reference wording", async () => {
    await renderModal();
    chooseMethod("qris");
    expect(screen.getByText(`${P}.reference.label`)).toBeInTheDocument();
    expect(referenceInput()).toHaveAttribute("placeholder", `${P}.reference.placeholder`);
    expect(screen.getByText(`${P}.reference.hint`)).toBeInTheDocument();
    expect(screen.queryByText(`${P}.reference.otherLabel`)).not.toBeInTheDocument();
  });
});

describe("points", () => {
  test("needs no reference (internal loyalty entry)", async () => {
    getMemberById.mockResolvedValue({ data: { id: 55, name: "Budi", totalPoints: 500000 } });
    await renderModal({ freshOrder: { ...order, customerId: 55 } });
    chooseMethod("points");
    expect(referenceInput()).not.toBeInTheDocument();
  });
});

describe("failed settlement", () => {
  test("409 DUPLICATE_REFERENCE marks the reference field (BA 004)", async () => {
    updateOrderStatus.mockRejectedValueOnce({
      response: { status: 409, data: { code: "DUPLICATE_REFERENCE" } }
    });
    const { onClose } = await renderModal();
    chooseMethod("qris");
    typeReference("QR-DUP");
    fireEvent.click(confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(`${P}.reference.duplicate`));
    expect(screen.getByRole("alert")).toHaveTextContent(`${P}.reference.duplicate`);
    expect(referenceInput()).toHaveAttribute("aria-invalid", "true");
    expect(referenceInput()).toHaveValue("QR-DUP");
    expect(onClose).not.toHaveBeenCalled();

    typeReference("QR-NEW");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("422 REFERENCE_REQUIRED on OTHER asks for a description, not a reference (BA 003)", async () => {
    updateOrderStatus.mockRejectedValueOnce({
      response: { status: 422, data: { code: "REFERENCE_REQUIRED" } }
    });
    await renderModal();
    chooseMethod("other");
    typeReference("Voucher kantor");
    fireEvent.click(confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(`${P}.reference.otherRequired`));
    expect(screen.getByRole("alert")).toHaveTextContent(`${P}.reference.otherRequired`);
    expect(toast.error).not.toHaveBeenCalledWith(`${P}.reference.required`);
  });

  test("422 REFERENCE_REQUIRED shows the inline error, keeps the typed values and the modal open", async () => {
    updateOrderStatus.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          error: "referenceNumber is required for QRIS settlement",
          code: "REFERENCE_REQUIRED"
        }
      }
    });
    const { onClose, onOpenReceipt } = await renderModal();
    chooseMethod("qris");
    typeReference("QR-OLD");
    fireEvent.click(confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(`${P}.reference.required`));
    expect(screen.getByRole("alert")).toHaveTextContent(`${P}.reference.required`);
    expect(referenceInput()).toHaveValue("QR-OLD");
    expect(referenceInput()).toHaveAttribute("aria-invalid", "true");
    expect(onClose).not.toHaveBeenCalled();
    expect(onOpenReceipt).not.toHaveBeenCalled();

    // correcting the field clears the error; the retry sends the new value
    updateOrderStatus.mockResolvedValueOnce(paidResponse);
    typeReference("QR-NEW");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(confirmButton());
    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(2));
    expect(updateOrderStatus.mock.calls[1][0].referenceNumber).toBe("QR-NEW");
    await waitFor(() => expect(onOpenReceipt).toHaveBeenCalledTimes(1));
  });

  test("any other failure keeps the reference so the same settlement can be retried", async () => {
    updateOrderStatus.mockRejectedValueOnce(new Error("Network Error"));
    await renderModal();
    chooseMethod("transfer");
    typeReference("TRF-9001");
    fireEvent.click(confirmButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Network Error"));
    expect(referenceInput()).toHaveValue("TRF-9001");

    updateOrderStatus.mockResolvedValueOnce(paidResponse);
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledTimes(2));
    expect(updateOrderStatus.mock.calls[1][0]).toMatchObject({
      paymentMethod: "transfer",
      referenceNumber: "TRF-9001"
    });
  });
});

describe("with the M1 already-paid recovery", () => {
  test("a non-cash retry that finds the order PAID shows the paid state, not a reference error", async () => {
    updateOrderStatus.mockRejectedValueOnce({
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
    await renderModal();
    chooseMethod("qris");
    typeReference("QR-LOST-RESPONSE");
    fireEvent.click(confirmButton());

    await waitFor(() => expect(screen.getByTestId("collect-already-paid")).toBeInTheDocument());
    expect(toast.info).toHaveBeenCalledWith(`${P}.alreadyPaid`);
    expect(toast.error).not.toHaveBeenCalledWith(`${P}.reference.required`);
    expect(updateOrderStatus).toHaveBeenCalledTimes(1);
    expect(updateOrderStatus.mock.calls[0][0].referenceNumber).toBe("QR-LOST-RESPONSE");
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import CheckoutModal from "../page/cashier/components/CheckoutModal";
import { createOrder, quoteOrder } from "../services/order";
import { toast } from "sonner";
import { serverQuote } from "./helpers/checkoutQuote";
import { classifyCreateError } from "../state/checkout-attempt";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "kasir" } }]
}));

jest.mock("../services/order", () => ({
  quoteOrder: jest.fn(),
  createOrder: jest.fn()
}));
jest.mock("../services/customer", () => ({
  getAllCustomer: jest.fn(() => Promise.resolve({ data: [] })),
  addCustomer: jest.fn()
}));
jest.mock("../services/discount", () => ({
  getAllDiscount: jest.fn(() => Promise.resolve({ data: [] })),
  lookupDiscountByCode: jest.fn()
}));
jest.mock("../services/member-tier", () => ({
  getAllMemberTier: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("../services/type-payment", () => ({
  getAllTypePayment: jest.fn(() =>
    Promise.resolve({
      data: [
        { type: "cash", name: "Cash", status: "active" },
        { type: "debit", name: "Debit", status: "active" },
        { type: "transfer", name: "Transfer", status: "active" },
        { type: "other", name: "Lainnya", status: "active" },
        { type: "qris", name: "QRIS", status: "active" }
      ]
    })
  )
}));
jest.mock("../services/member", () => ({
  getMemberById: jest.fn(() => Promise.resolve({ data: {} }))
}));
jest.mock("../services/table", () => ({
  getTableAvailability: jest.fn(() => Promise.resolve({ data: { tables: [] } })),
  getTablesWithActiveOrders: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("../utils/customerDisplayBoard", () => ({
  dispatchDisplayEvent: jest.fn(),
  DISPLAY_EVENT_TYPES: { QRIS_PAYMENT_REQUEST: "QRIS_PAYMENT_REQUEST" }
}));

// DR-23 §D (BA gap G-02): a counter sale paid by card, transfer, e-wallet or
// QRIS carries the payment's reference; "other" carries a description. Cash
// carries none. The server refuses a reused reference (409
// DUPLICATE_REFERENCE) before writing anything.

const REF_LABEL = "page.cashier.collectPayment.reference.label";
const OTHER_LABEL = "page.cashier.collectPayment.reference.otherLabel";
const confirmButton = () => screen.getByText("page.cashier.confirmPayment").closest("button");
const qrisConfirmButton = () =>
  screen.getByText("page.cashier.qris.confirmReceived").closest("button");

const renderModal = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckoutModal
        items={[
          {
            id: "p1",
            cartKey: "p1_",
            nameProduct: "Bakso Halus",
            price: 20000,
            count: 1,
            totalPrice: 20000,
            priceAuthoritative: true,
            priceOverridden: false
          }
        ]}
        store="1"
        cashierName="Kasir"
        cashierId={1}
        onClose={jest.fn()}
        onTableChange={jest.fn()}
        onComplete={jest.fn()}
      />
    </QueryClientProvider>
  );
};

const refusal = (status, code) => {
  const err = new Error(String(status));
  err.response = { status, data: { code, message: code } };
  return err;
};

const pickMethod = async (label) => {
  fireEvent.click(await screen.findByText(label));
};

beforeEach(() => {
  quoteOrder.mockReset();
  createOrder.mockReset();
  toast.error.mockClear();
  quoteOrder.mockImplementation((payload) => Promise.resolve(serverQuote(payload)));
  createOrder.mockResolvedValue({ data: { id: 7, totalPrice: 20000, subTotal: 20000, items: [] } });
});

describe("Counter sale payment reference (DR-23 §D)", () => {
  test("cash needs no reference and sends none", async () => {
    renderModal();
    await pickMethod("Cash");
    expect(screen.queryByLabelText(REF_LABEL)).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Rp 0"), { target: { value: "20000" } });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0]).not.toHaveProperty("referenceNumber");
  });

  test("debit cannot be confirmed until a reference is typed, then sends it trimmed", async () => {
    renderModal();
    await pickMethod("Debit");
    const input = await screen.findByLabelText(REF_LABEL);
    await waitFor(() => expect(quoteOrder).toHaveBeenCalled());
    expect(confirmButton()).toBeDisabled();

    fireEvent.change(input, { target: { value: "   " } });
    expect(confirmButton()).toBeDisabled();

    fireEvent.change(input, { target: { value: "  APPR-778  " } });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0]).toMatchObject({
      paymentMethod: "debit",
      referenceNumber: "APPR-778"
    });
  });

  test("bank transfer sends its reference", async () => {
    renderModal();
    await pickMethod("Transfer");
    fireEvent.change(await screen.findByLabelText(REF_LABEL), { target: { value: "TRF-1" } });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0]).toMatchObject({
      paymentMethod: "transfer",
      referenceNumber: "TRF-1"
    });
  });

  test('"other" asks for a description and sends it as the reference', async () => {
    renderModal();
    await pickMethod("Lainnya");
    expect(screen.queryByLabelText(REF_LABEL)).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText(OTHER_LABEL), {
      target: { value: "voucher perusahaan" }
    });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0]).toMatchObject({
      paymentMethod: "other",
      referenceNumber: "voucher perusahaan"
    });
  });

  test("QRIS asks for the reference on the confirmation step, after the QR is shown", async () => {
    renderModal();
    await pickMethod("QRIS");
    // no reference before the customer has paid
    expect(screen.queryByLabelText(REF_LABEL)).not.toBeInTheDocument();
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await screen.findByText("page.cashier.qris.confirmReceived");

    expect(qrisConfirmButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(REF_LABEL), { target: { value: "QRIS-555" } });
    expect(qrisConfirmButton()).not.toBeDisabled();
    fireEvent.click(qrisConfirmButton());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0]).toMatchObject({
      paymentMethod: "qris",
      referenceNumber: "QRIS-555"
    });
  });

  test("QRIS confirmation says it is a manual confirmation, not a scanned code", async () => {
    renderModal();
    await pickMethod("QRIS");
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await screen.findByText("page.cashier.qris.confirmReceived");

    expect(screen.getByText("page.cashier.qris.manualTitle")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.qris.confirmWarning")).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.qris.onBoard")).not.toBeInTheDocument();
  });

  test("a reused QRIS reference keeps the pending QRIS so the cashier can correct it", async () => {
    createOrder.mockRejectedValueOnce(refusal(409, "DUPLICATE_REFERENCE"));
    renderModal();
    await pickMethod("QRIS");
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await screen.findByText("page.cashier.qris.confirmReceived");
    fireEvent.change(screen.getByLabelText(REF_LABEL), { target: { value: "QRIS-OLD" } });
    fireEvent.click(qrisConfirmButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("page.cashier.collectPayment.reference.duplicate")
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "page.cashier.collectPayment.reference.duplicate"
    );
    // still on the QRIS confirmation; the corrected reference goes through
    expect(screen.getByText("page.cashier.qris.confirmReceived")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(REF_LABEL), { target: { value: "QRIS-NEW" } });
    fireEvent.click(qrisConfirmButton());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(2));
    expect(createOrder.mock.calls[1][0].referenceNumber).toBe("QRIS-NEW");
  });

  test("a server REFERENCE_REQUIRED refusal points at the field", async () => {
    createOrder.mockRejectedValueOnce(refusal(422, "REFERENCE_REQUIRED"));
    renderModal();
    await pickMethod("Debit");
    fireEvent.change(await screen.findByLabelText(REF_LABEL), { target: { value: "X" } });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("page.cashier.collectPayment.reference.required")
    );
    expect(screen.getByLabelText(REF_LABEL)).toHaveAttribute("aria-invalid", "true");
  });
});

describe("DUPLICATE_REFERENCE classification", () => {
  test("is a definitive refusal (nothing written), not an unconfirmed 409", () => {
    expect(classifyCreateError(refusal(409, "DUPLICATE_REFERENCE"))).toEqual({
      kind: "refused",
      code: "DUPLICATE_REFERENCE"
    });
  });
});

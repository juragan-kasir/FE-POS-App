import React from "react";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import CheckoutModal from "../page/cashier/components/CheckoutModal";
import { createOrder, quoteOrder } from "../services/order";
import { toast } from "sonner";
import { serverQuote } from "./helpers/checkoutQuote";
import { dispatchDisplayEvent } from "../utils/customerDisplayBoard";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "cashier" } }]
}));

jest.mock("../services/order", () => ({
  // DR-11 / DR-17: the checkout pays against the server quote.
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
        { type: "card", name: "Card", status: "active" },
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

// DR-11 / DR-17 (BA §35.7): one backend resolver — the checkout displays
// the server's quote for the exact pricing inputs it will submit, pays
// against it, and offers payment only for a quote of the CURRENT inputs.

const confirmButton = () => screen.getByText("page.cashier.confirmPayment").closest("button");

// `client` lets a test drive react-query itself (e.g. a same-key refetch).
const newQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
const renderModal = ({ items, onApplyServerPrices, onComplete, client } = {}) => {
  const queryClient = client || newQueryClient();
  const ui = (lines) => (
    <QueryClientProvider client={queryClient}>
      <CheckoutModal
        items={
          lines || [
            {
              id: "p1",
              cartKey: "p1_",
              nameProduct: "Kopi",
              price: 100000,
              count: 1,
              totalPrice: 100000,
              priceAuthoritative: true,
              priceOverridden: false
            }
          ]
        }
        store="1"
        cashierName="Kasir"
        cashierId={1}
        onClose={jest.fn()}
        onTableChange={jest.fn()}
        onComplete={onComplete || jest.fn()}
        onApplyServerPrices={onApplyServerPrices}
      />
    </QueryClientProvider>
  );
  const utils = render(ui(items));
  return { ...utils, rerenderWith: (lines) => utils.rerender(ui(lines)) };
};

// W3-2 409 body, as returned by both POST /order/quote and /order/create.
const priceChanged409 = (items) => {
  const err = new Error("409");
  err.response = {
    status: 409,
    data: {
      code: "PRICE_CHANGED",
      message: "One or more item prices changed. Please review the updated prices and resubmit.",
      items
    }
  };
  return err;
};

beforeEach(() => {
  quoteOrder.mockReset();
  createOrder.mockReset();
  toast.error.mockClear();
  toast.success.mockClear();
  createOrder.mockResolvedValue({
    data: { id: 9, totalPrice: 99900, subTotal: 100000, items: [] }
  });
});

describe("CheckoutModal — server quote", () => {
  test("shows the server's discount, tax and total and settles cash change against that total", async () => {
    quoteOrder.mockImplementation((payload) =>
      Promise.resolve(
        serverQuote(payload, {
          subTotal: 100000,
          discountAmount: 10000,
          discountSource: "tier",
          taxRate: 11,
          taxAmount: 9900,
          totalPrice: 99900
        })
      )
    );
    renderModal();

    expect(await screen.findByText("Rp 99.900")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.quote.tierDiscount")).toBeInTheDocument();
    expect(screen.getByText("-Rp 10.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 9.900")).toBeInTheDocument();

    // the quote request carries exactly the pricing inputs of the sale
    const quoted = quoteOrder.mock.calls[0][0];
    expect(quoted).toMatchObject({
      store: "1",
      redeemedPoints: 0,
      discountId: null,
      customerId: null
    });
    expect(quoted.items[0]).toMatchObject({ product: "p1", quantity: 1 });

    fireEvent.click(await screen.findByText("Cash"));
    fireEvent.change(screen.getByPlaceholderText("Rp 0"), { target: { value: "100000" } });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());

    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    const payload = createOrder.mock.calls[0][0];
    expect(payload.cashAmount).toBe(100000);
    expect(payload.changeAmount).toBe(100);
  });

  test("a failed quote blocks payment, shows the server reason and can be retried", async () => {
    const err = new Error("422");
    err.response = {
      status: 422,
      data: { error: "PPN tax configuration is missing", code: "PPN_MISSING" }
    };
    quoteOrder.mockRejectedValueOnce(err);
    renderModal();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("PPN tax configuration is missing");
    fireEvent.click(await screen.findByText("Card"));
    expect(confirmButton()).toBeDisabled();

    quoteOrder.mockImplementation((payload) => Promise.resolve(serverQuote(payload)));
    fireEvent.click(screen.getByText("page.cashier.quote.retry"));

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    expect(quoteOrder).toHaveBeenCalledTimes(2);
  });

  test("changing a pricing input blocks payment until the server re-quotes it", async () => {
    quoteOrder.mockImplementation((payload) => Promise.resolve(serverQuote(payload)));
    renderModal();
    fireEvent.click(await screen.findByText("Card"));
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());

    let release;
    quoteOrder.mockImplementation(
      (payload) =>
        new Promise((resolve) => {
          release = () => resolve(serverQuote(payload, { taxAmount: 0 }));
        })
    );
    fireEvent.change(screen.getByPlaceholderText("page.cashier.promoCodePlaceholder"), {
      target: { value: "HEMAT" }
    });

    await waitFor(() => expect(screen.getByTestId("checkout-quote-pending")).toBeInTheDocument());
    expect(confirmButton()).toBeDisabled();
    await waitFor(() => expect(quoteOrder.mock.calls.at(-1)[0].promoCode).toBe("HEMAT"));

    release();
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
  });

  test("a tier member's tier is not stacked on top of a discount the server did not apply", async () => {
    // The server applied only the explicit discount; nothing tier-related
    // may appear on screen even though the member has a tier.
    quoteOrder.mockImplementation((payload) =>
      Promise.resolve(
        serverQuote(payload, {
          subTotal: 100000,
          discountAmount: 5000,
          discountSource: "discount",
          totalPrice: 95000
        })
      )
    );
    renderModal();

    expect(await screen.findByText("Rp 95.000")).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.quote.tierDiscount")).not.toBeInTheDocument();
    expect(screen.getByText("-Rp 5.000")).toBeInTheDocument();
  });
});

// P1 hotfix: POST /order/quote enforces the same W3-2 409 PRICE_CHANGED
// contract as /order/create. A generic retry would resend the same stale
// expectedPrice lines and fail again, so the quote-stage mismatch is routed
// into the existing apply-updated-prices flow and payment stays blocked
// until a fresh quote matches the displayed total.
describe("CheckoutModal — quote-stage PRICE_CHANGED", () => {
  test("routes the mismatch into the apply flow; payment waits for a fresh matching quote", async () => {
    quoteOrder.mockRejectedValueOnce(
      priceChanged409([{ index: 0, productId: "p1", expectedPrice: 100000, currentPrice: 110000 }])
    );
    const onApplyServerPrices = jest.fn();
    const { rerenderWith } = renderModal({ onApplyServerPrices });

    const panel = await screen.findByTestId("price-change-panel");
    expect(panel).toHaveAttribute("role", "alert");
    expect(within(panel).getByText("page.cashier.priceChanged.title")).toBeInTheDocument();
    expect(within(panel).getByText("Kopi")).toBeInTheDocument();
    expect(within(panel).getByText("Rp 100.000")).toBeInTheDocument();
    expect(within(panel).getByText("Rp 110.000")).toBeInTheDocument();

    // payment blocked, nothing applied, and no blind retry that would
    // resend the same stale prices in a loop.
    expect(confirmButton()).toBeDisabled();
    expect(onApplyServerPrices).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("page.cashier.priceChanged.title");
    expect(screen.queryByText("page.cashier.quote.retry")).not.toBeInTheDocument();
    expect(quoteOrder).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("page.cashier.priceChanged.apply"));
    expect(onApplyServerPrices).toHaveBeenCalledTimes(1);
    expect(onApplyServerPrices).toHaveBeenCalledWith([{ cartKey: "p1_", price: 110000 }]);
    expect(screen.getByTestId("price-change-panel")).toHaveAttribute("role", "status");

    // the parent applies the server prices; the new inputs are re-quoted
    // and only the fresh matching total can be paid.
    quoteOrder.mockImplementation((payload) => Promise.resolve(serverQuote(payload)));
    rerenderWith([
      {
        id: "p1",
        cartKey: "p1_",
        nameProduct: "Kopi",
        price: 110000,
        count: 1,
        totalPrice: 110000,
        priceAuthoritative: true,
        priceOverridden: false
      }
    ]);

    expect((await screen.findAllByText("Rp 110.000")).length).toBeGreaterThan(0);
    fireEvent.click(await screen.findByText("Card"));
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0].items[0].expectedPrice).toBe(110000);
  });

  test("a 409 without the PRICE_CHANGED contract keeps the generic failure path", async () => {
    const err = new Error("409");
    err.response = {
      status: 409,
      data: { message: "idempotencyKey already used with a different payload" }
    };
    quoteOrder.mockRejectedValueOnce(err);
    renderModal();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("idempotencyKey already used with a different payload");
    expect(screen.queryByTestId("price-change-panel")).not.toBeInTheDocument();
    expect(screen.getByText("page.cashier.quote.retry")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalledWith("page.cashier.priceChanged.title");
    expect(confirmButton()).toBeDisabled();

    fireEvent.click(await screen.findByText("Card"));
    expect(confirmButton()).toBeDisabled();
    quoteOrder.mockImplementation((payload) => Promise.resolve(serverQuote(payload)));
    fireEvent.click(screen.getByText("page.cashier.quote.retry"));
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
  });

  test("an identical quote PRICE_CHANGED is surfaced once, with no refetch loop", async () => {
    quoteOrder.mockRejectedValue(
      priceChanged409([{ index: 0, productId: "p1", expectedPrice: 100000, currentPrice: 110000 }])
    );
    renderModal();
    await screen.findByTestId("price-change-panel");

    // further interaction re-renders without new inputs: no re-toast,
    // no refetch, still exactly one panel.
    fireEvent.click(await screen.findByText("Card"));
    fireEvent.click(await screen.findByText("Cash"));

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("page.cashier.priceChanged.title");
    expect(quoteOrder).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId("price-change-panel")).toHaveLength(1);
    expect(confirmButton()).toBeDisabled();
  });
});

// A cart line as the parent renders it after applying a server price.
const kopiAt = (price, count = 1) => ({
  id: "p1",
  cartKey: "p1_",
  nameProduct: "Kopi",
  price,
  count,
  totalPrice: price * count,
  priceAuthoritative: true,
  priceOverridden: false
});
const mismatch = (expectedPrice, currentPrice) =>
  priceChanged409([{ index: 0, productId: "p1", expectedPrice, currentPrice }]);

describe("CheckoutModal — D1 repeated quote-stage PRICE_CHANGED", () => {
  // Shared opening: 100k -> 110k surfaced and applied by the cashier.
  const applyFirstMismatch = async () => {
    quoteOrder.mockRejectedValueOnce(mismatch(100000, 110000));
    const onApplyServerPrices = jest.fn();
    const utils = renderModal({ onApplyServerPrices });
    await screen.findByTestId("price-change-panel");
    fireEvent.click(screen.getByText("page.cashier.priceChanged.apply"));
    expect(onApplyServerPrices).toHaveBeenLastCalledWith([{ cartKey: "p1_", price: 110000 }]);
    return { ...utils, onApplyServerPrices };
  };

  test("a second, different mismatch after an applied change re-opens the apply flow", async () => {
    const { rerenderWith, onApplyServerPrices } = await applyFirstMismatch();

    // the price moved again before the re-quote of the applied price
    quoteOrder.mockRejectedValueOnce(mismatch(110000, 120000));
    rerenderWith([kopiAt(110000)]);

    await waitFor(() =>
      expect(screen.getByTestId("price-change-panel")).toHaveAttribute("role", "alert")
    );
    const panel = screen.getByTestId("price-change-panel");
    expect(within(panel).getByText("Rp 110.000")).toBeInTheDocument();
    expect(within(panel).getByText("Rp 120.000")).toBeInTheDocument();
    expect(quoteOrder).toHaveBeenCalledTimes(2);
    expect(quoteOrder.mock.calls[1][0].items[0].expectedPrice).toBe(110000);
    expect(toast.error).toHaveBeenCalledTimes(2);
    // no blind Retry of the stale 110k, and nothing payable
    expect(screen.queryByText("page.cashier.quote.retry")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByText("Card"));
    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(createOrder).not.toHaveBeenCalled();

    // re-renders with the same 409 never re-surface it (no loop)
    fireEvent.click(await screen.findByText("Cash"));
    fireEvent.click(await screen.findByText("Card"));
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(quoteOrder).toHaveBeenCalledTimes(2);
    expect(screen.getAllByTestId("price-change-panel")).toHaveLength(1);

    // applying the new price re-quotes; only the fresh quote is payable
    fireEvent.click(screen.getByText("page.cashier.priceChanged.apply"));
    expect(onApplyServerPrices).toHaveBeenLastCalledWith([{ cartKey: "p1_", price: 120000 }]);
    quoteOrder.mockImplementation((payload) => Promise.resolve(serverQuote(payload)));
    rerenderWith([kopiAt(120000)]);
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0].items[0].expectedPrice).toBe(120000);
  });

  test("an unrelated 409 after an applied change keeps the generic retry path", async () => {
    const { rerenderWith } = await applyFirstMismatch();
    const conflict = new Error("409");
    conflict.response = {
      status: 409,
      data: { message: "idempotencyKey already used with a different payload" }
    };
    quoteOrder.mockRejectedValueOnce(conflict);
    rerenderWith([kopiAt(110000)]);

    const alert = await screen.findByText("idempotencyKey already used with a different payload");
    expect(alert.closest("[role='alert']")).toBeInTheDocument();
    expect(screen.getByTestId("price-change-panel")).toHaveAttribute("role", "status");
    expect(toast.error).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByText("Card"));
    expect(confirmButton()).toBeDisabled();

    quoteOrder.mockImplementation((payload) => Promise.resolve(serverQuote(payload)));
    fireEvent.click(screen.getByText("page.cashier.quote.retry"));
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
  });

  test("a failed refresh after an applied change never falls back to the stale quote", async () => {
    const { rerenderWith } = await applyFirstMismatch();
    const failure = new Error("500");
    failure.response = { status: 500, data: { error: "quote unavailable" } };
    quoteOrder.mockRejectedValueOnce(failure);
    rerenderWith([kopiAt(110000)]);

    await screen.findByText("quote unavailable");
    fireEvent.click(await screen.findByText("Card"));
    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(createOrder).not.toHaveBeenCalled();
    // the old price survives only as the struck-through "was" price
    expect(
      screen.queryAllByText("Rp 100.000").every((el) => el.classList.contains("line-through"))
    ).toBe(true);
  });
});

describe("CheckoutModal — D2 pending QRIS is bound to its checkout", () => {
  // DR-24 D-01: the cashier tax toggle is removed, so every quote carries
  // the resolved outlet rate (11 % here) — no payload can switch it off.
  const taxAware = (payload) =>
    Promise.resolve(serverQuote(payload, { taxRate: 11, taxAmount: 11000, totalPrice: 111000 }));
  const qrisConfirm = () => screen.queryByText("page.cashier.qris.confirmReceived");
  const deferred = () => {
    let resolve;
    const promise = new Promise((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };

  // Selects QRIS, waits for a current quote and starts the pending flow.
  const startQris = async () => {
    fireEvent.click(await screen.findByText("QRIS"));
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await screen.findByText("page.cashier.qris.confirmReceived");
    // DR-23 §D: the QRIS reference is entered once the customer has paid.
    fireEvent.change(screen.getByLabelText("page.cashier.collectPayment.reference.label"), {
      target: { value: "QR-REF-1" }
    });
  };

  beforeEach(() => {
    dispatchDisplayEvent.mockClear();
    quoteOrder.mockImplementation(taxAware);
  });

  test("unchanged checkout: QRIS confirms exactly the quoted payload", async () => {
    renderModal();
    await startQris();
    expect(dispatchDisplayEvent).toHaveBeenCalledTimes(1);
    expect(dispatchDisplayEvent.mock.calls[0][0]).toMatchObject({
      type: "QRIS_PAYMENT_REQUEST",
      total: 111000,
      paymentMethod: "qris"
    });

    fireEvent.click(qrisConfirm());
    fireEvent.click(qrisConfirm());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0]).toMatchObject({
      paymentMethod: "qris",
      referenceNumber: "QR-REF-1"
    });
    expect(screen.queryByTestId("qris-invalidated")).not.toBeInTheDocument();
  });

  // Regression: a SUCCESSFUL QRIS showed the red "QRIS dibatalkan karena
  // checkout berubah" toast. CashierPage's onComplete closes the modal
  // (useState, batched) and resets the cart (zustand → useSyncExternalStore,
  // flushed synchronously), so the modal rendered once more with an empty
  // cart while the QRIS was still pending — which the D2 guard read as a
  // checkout change.
  test("a confirmed QRIS never reports itself as cancelled when the cart is reset", async () => {
    const { create } = jest.requireActual("zustand");
    const useCart = create(() => ({
      items: [
        {
          id: "p1",
          cartKey: "p1_",
          nameProduct: "Kopi",
          price: 100000,
          count: 1,
          totalPrice: 100000,
          priceAuthoritative: true,
          priceOverridden: false
        }
      ]
    }));
    const onComplete = jest.fn();
    const CashierLike = () => {
      const items = useCart((st) => st.items);
      const [open, setOpen] = React.useState(true);
      return open ? (
        <CheckoutModal
          items={items}
          store="1"
          cashierName="Kasir"
          cashierId={1}
          onClose={jest.fn()}
          onTableChange={jest.fn()}
          onComplete={(result) => {
            onComplete(result);
            setOpen(false);
            useCart.setState({ items: [] });
          }}
        />
      ) : null;
    };
    render(
      <QueryClientProvider client={newQueryClient()}>
        <CashierLike />
      </QueryClientProvider>
    );
    await startQris();
    fireEvent.click(qrisConfirm());
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalledWith("page.cashier.qris.invalidated");
    expect(toast.success).toHaveBeenCalledWith("page.cashier.transactionSuccess");
  });

  test("a promo code change while QRIS is pending voids it", async () => {
    renderModal();
    await startQris();
    fireEvent.change(screen.getByPlaceholderText("page.cashier.promoCodePlaceholder"), {
      target: { value: "HEMAT" }
    });
    await waitFor(() => expect(qrisConfirm()).not.toBeInTheDocument());
    expect(screen.getByTestId("qris-invalidated")).toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
  });

  test("a quantity or price change while QRIS is pending voids it", async () => {
    const { rerenderWith } = renderModal();
    await startQris();
    rerenderWith([kopiAt(100000, 2)]);
    await waitFor(() => expect(qrisConfirm()).not.toBeInTheDocument());
    expect(screen.getByTestId("qris-invalidated")).toBeInTheDocument();

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await screen.findByText("page.cashier.qris.confirmReceived");
    rerenderWith([kopiAt(105000, 2)]);
    await waitFor(() => expect(qrisConfirm()).not.toBeInTheDocument());
    expect(createOrder).not.toHaveBeenCalled();
  });

  test("switching tender while QRIS is pending drops it without leaving a confirmable payload", async () => {
    renderModal();
    await startQris();
    fireEvent.click(screen.getByText("Card"));
    fireEvent.click(screen.getByText("QRIS"));
    expect(qrisConfirm()).not.toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
  });

  test("a create-stage PRICE_CHANGED on QRIS confirm clears the pending flow and flags the QR", async () => {
    createOrder.mockRejectedValueOnce(mismatch(100000, 110000));
    renderModal();
    await startQris();
    fireEvent.click(qrisConfirm());
    await screen.findByTestId("price-change-panel");
    expect(qrisConfirm()).not.toBeInTheDocument();
    expect(screen.getByTestId("qris-invalidated")).toBeInTheDocument();
    expect(createOrder).toHaveBeenCalledTimes(1);
  });

  test("confirm-time guard: a QRIS whose quote is re-validating is refused, then a new flow proceeds", async () => {
    const client = newQueryClient();
    renderModal({ client });
    await startQris();

    // Same checkout, so the eager snapshot check has nothing to void — but
    // react-query re-validates the same quote key (as on a network
    // reconnect), so at confirmation the quote is not current.
    const revalidation = deferred();
    quoteOrder.mockImplementationOnce(() => revalidation.promise);
    act(() => {
      client.invalidateQueries(["checkout-quote"]);
    });
    await waitFor(() => expect(quoteOrder).toHaveBeenCalledTimes(2));
    expect(quoteOrder.mock.calls[1][0]).toEqual(quoteOrder.mock.calls[0][0]);
    expect(qrisConfirm()).toBeInTheDocument();
    expect(screen.queryByTestId("qris-invalidated")).not.toBeInTheDocument();

    fireEvent.click(qrisConfirm());
    expect(createOrder).not.toHaveBeenCalled();
    expect(qrisConfirm()).not.toBeInTheDocument();
    expect(screen.getByTestId("qris-invalidated")).toHaveAttribute("role", "alert");
    expect(toast.error).toHaveBeenCalledWith("page.cashier.qris.invalidated");

    // once the quote is current again, a new QRIS flow confirms normally
    await act(async () => {
      revalidation.resolve(await taxAware(quoteOrder.mock.calls[1][0]));
    });
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    fireEvent.click(confirmButton());
    await screen.findByText("page.cashier.qris.confirmReceived");
    expect(dispatchDisplayEvent).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("qris-invalidated")).not.toBeInTheDocument();
    fireEvent.click(qrisConfirm());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0]).toMatchObject({ paymentMethod: "qris" });
  });

  test("an equal checkout re-rendered with new cart objects keeps the pending QRIS valid", async () => {
    const { rerenderWith } = renderModal();
    await startQris();
    // new array and line objects, same content: the snapshot compares
    // values, not object identity
    rerenderWith([kopiAt(100000)]);
    expect(qrisConfirm()).toBeInTheDocument();
    expect(screen.queryByTestId("qris-invalidated")).not.toBeInTheDocument();
    fireEvent.click(qrisConfirm());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(quoteOrder).toHaveBeenCalledTimes(1);
  });

  test("a quote re-check PRICE_CHANGED while QRIS is pending voids the QR and opens the apply flow", async () => {
    const client = newQueryClient();
    const onApplyServerPrices = jest.fn();
    const { rerenderWith } = renderModal({ client, onApplyServerPrices });
    await startQris();

    // same checkout re-checked by react-query; the server now reports a
    // price change for the very lines the pending QRIS was issued for
    quoteOrder.mockRejectedValueOnce(mismatch(100000, 110000));
    act(() => {
      client.invalidateQueries(["checkout-quote"]);
    });
    const panel = await screen.findByTestId("price-change-panel");
    expect(panel).toHaveAttribute("role", "alert");
    expect(within(panel).getByText("Rp 110.000")).toBeInTheDocument();
    expect(qrisConfirm()).not.toBeInTheDocument();
    expect(screen.getByTestId("qris-invalidated")).toHaveAttribute("role", "alert");
    // one notification for the one event (the create-stage convention)
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("page.cashier.priceChanged.title");
    expect(createOrder).not.toHaveBeenCalled();

    // re-renders neither re-notify nor re-query (no loop)
    fireEvent.click(screen.getByText("Card"));
    fireEvent.click(screen.getByText("QRIS"));
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(quoteOrder).toHaveBeenCalledTimes(2);
    expect(screen.getAllByTestId("price-change-panel")).toHaveLength(1);
    expect(screen.getAllByTestId("qris-invalidated")).toHaveLength(1);
    expect(confirmButton()).toBeDisabled();

    // apply -> fresh quote -> a NEW QRIS flow is the only way to pay
    fireEvent.click(screen.getByText("page.cashier.priceChanged.apply"));
    expect(onApplyServerPrices).toHaveBeenLastCalledWith([{ cartKey: "p1_", price: 110000 }]);
    rerenderWith([kopiAt(110000)]);
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    expect(createOrder).not.toHaveBeenCalled();
    fireEvent.click(confirmButton());
    await screen.findByText("page.cashier.qris.confirmReceived");
    expect(dispatchDisplayEvent).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("qris-invalidated")).not.toBeInTheDocument();
    fireEvent.click(qrisConfirm());
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0].items[0].expectedPrice).toBe(110000);
  });

  test("a quote PRICE_CHANGED with no QRIS pending shows no QR-invalid alert", async () => {
    quoteOrder.mockRejectedValueOnce(mismatch(100000, 110000));
    renderModal();
    await screen.findByTestId("price-change-panel");
    expect(screen.queryByTestId("qris-invalidated")).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import CheckoutModal from "../page/cashier/components/CheckoutModal";
import { createOrder } from "../services/order";
import { getAllCustomer } from "../services/customer";
import { getAllDiscount } from "../services/discount";
import { getAllTypePayment } from "../services/type-payment";
import { getAllMember, getMemberById } from "../services/member";
import { waitForCheckoutQuote } from "./helpers/checkoutQuote";

// Phase 20 Batch 1: Member Search + Redeem Points payment flow. The search
// modal (MemberSearchModal), the "page.cashier.ui.searchCustomer"/"page.cashier.ui.changeCustomer" wiring,
// the points display, the redeem input, and the redeemedPoints payload field
// were already implemented (PR #79) — this suite is the missing permanent
// regression coverage for that existing, already-working flow, not a new
// implementation. It exercises the real CheckoutModal + MemberSearchModal
// integration, not a mock of either.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "cashier" }, activeStore: "1" }]
}));

jest.mock("../services/order", () => ({
  // DR-11 / DR-17: the checkout pays against the server quote.
  quoteOrder: jest.fn((payload) =>
    Promise.resolve(jest.requireActual("./helpers/checkoutQuote").serverQuote(payload))
  ),
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
      data: [{ type: "cash", name: "Cash", status: "active" }]
    })
  )
}));
jest.mock("../services/member", () => ({
  getAllMember: jest.fn(),
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

const budi = { id: 1, name: "Budi Santoso", phoneNumber: "081234", point: 120, status: "Aktif" };
const siti = { id: 2, name: "Siti Aminah", phoneNumber: "081235", point: 0, status: "Aktif" };

const renderModal = (onComplete = jest.fn(), items, subtotal = 100000) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckoutModal
        items={
          items || [{ id: "p1", nameProduct: "Kopi", price: 100000, count: 1, totalPrice: 100000 }]
        }
        subtotal={subtotal}
        taxRate={0}
        store="1"
        cashierName="Kasir"
        cashierId={1}
        onClose={jest.fn()}
        onTableChange={jest.fn()}
        onComplete={onComplete}
      />
    </QueryClientProvider>
  );
};

const openSearchAndPick = async (member) => {
  getAllMember.mockResolvedValue({ data: [member] });
  fireEvent.click(screen.getByText("page.cashier.ui.searchCustomer"));
  await waitFor(() =>
    expect(screen.getByText("component.memberSearchModal.ui.searchMember")).toBeInTheDocument()
  );
  fireEvent.change(screen.getByPlaceholderText("component.memberSearchModal.ui.memberName"), {
    target: { value: member.name }
  });
  fireEvent.click(screen.getByText("common.search"));
  await waitFor(() => expect(screen.getByText(member.name)).toBeInTheDocument());
  fireEvent.click(screen.getByText(member.name));
};

describe("CheckoutModal — member search opens and selection is reflected (Phase 20)", () => {
  beforeEach(() => {
    getAllCustomer.mockResolvedValue({ data: [] });
    getAllDiscount.mockResolvedValue({ data: [] });
    getMemberById.mockResolvedValue({ data: { totalPoints: 120 } });
  });

  test("Payment Modal shows 'page.cashier.ui.searchCustomer' and no member selected initially", async () => {
    renderModal();
    expect(await screen.findByText("page.cashier.ui.searchCustomer")).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.ui.changeCustomer")).not.toBeInTheDocument();
  });

  test("clicking Cari Pelanggan opens the Member Search Modal", async () => {
    renderModal();
    fireEvent.click(await screen.findByText("page.cashier.ui.searchCustomer"));
    expect(
      await screen.findByText("component.memberSearchModal.ui.searchMember")
    ).toBeInTheDocument();
  });

  test("selecting a member closes the search modal and shows name, member number and points in the Payment Modal", async () => {
    renderModal();
    await openSearchAndPick(budi);

    expect(
      screen.queryByText("component.memberSearchModal.ui.searchMember")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText(/081234/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/120/).length).toBeGreaterThan(0));
    expect(screen.getByText("page.cashier.ui.changeCustomer")).toBeInTheDocument();
  });
});

describe("CheckoutModal — redeem points UX follows the existing points>0 contract (Phase 20)", () => {
  beforeEach(() => {
    getAllCustomer.mockResolvedValue({ data: [] });
    getAllDiscount.mockResolvedValue({ data: [] });
  });

  test("a member with 0 points never shows the redeem option", async () => {
    getMemberById.mockResolvedValue({ data: { totalPoints: 0 } });
    renderModal();
    await openSearchAndPick(siti);
    await waitFor(() => expect(screen.getByText("Siti Aminah")).toBeInTheDocument());
    expect(screen.queryByText("page.memberLoyalty.tabs.redeem")).not.toBeInTheDocument();
  });

  test("a member with points > 0 shows the redeem option with the available balance", async () => {
    getMemberById.mockResolvedValue({ data: { totalPoints: 120 } });
    renderModal();
    await openSearchAndPick(budi);
    expect(await screen.findByText("page.memberLoyalty.tabs.redeem")).toBeInTheDocument();
    expect(screen.getAllByText(/120/).length).toBeGreaterThan(0);
  });

  test("redeem input is capped at the member's balance, never negative, digits only", async () => {
    getMemberById.mockResolvedValue({ data: { totalPoints: 120 } });
    renderModal();
    await openSearchAndPick(budi);
    const redeemInput = await screen.findByPlaceholderText("0");

    fireEvent.change(redeemInput, { target: { value: "-999" } });
    // The minus sign is stripped by the digit-only filter — "999" survives
    // and is then capped at the member's balance (120), never at the raw
    // negative/oversized input.
    expect(redeemInput.value).toBe("120");

    fireEvent.change(redeemInput, { target: { value: "50" } });
    expect(redeemInput.value).toBe("50");
    expect(screen.getByText(/page.cashier.ui.discountRp 50/)).toBeInTheDocument();
  });

  test("redeem input is also capped at the payable total, never producing a negative payable amount", async () => {
    getMemberById.mockResolvedValue({ data: { totalPoints: 999999 } });
    renderModal(
      jest.fn(),
      [{ id: "p1", nameProduct: "Kopi", price: 5000, count: 1, totalPrice: 5000 }],
      5000
    );
    await openSearchAndPick({ ...budi, point: 999999 });
    const redeemInput = await screen.findByPlaceholderText("0");

    fireEvent.change(redeemInput, { target: { value: "999999" } });
    // Total payable here is 5000 (subtotal, no tax/discount) — the cap must
    // be the total, not the member's much larger balance.
    expect(redeemInput.value).toBe("5.000");
  });

  test("switching to a different member resets the previous redeem amount and shows the new member's points", async () => {
    getMemberById.mockResolvedValueOnce({ data: { totalPoints: 120 } });
    renderModal();
    await openSearchAndPick(budi);
    const redeemInput = await screen.findByPlaceholderText("0");
    fireEvent.change(redeemInput, { target: { value: "50" } });
    expect(redeemInput.value).toBe("50");

    getMemberById.mockResolvedValueOnce({ data: { totalPoints: 0 } });
    fireEvent.click(screen.getByText("page.cashier.ui.changeCustomer"));
    await openSearchAndPick(siti);

    await waitFor(() => expect(screen.getByText("Siti Aminah")).toBeInTheDocument());
    // Siti has 0 points — the redeem section (and Budi's stale 50) must be
    // completely gone, not merely re-rendered with a leftover value.
    expect(screen.queryByText("page.memberLoyalty.tabs.redeem")).not.toBeInTheDocument();
    expect(screen.queryByText(/page.cashier.ui.discountRp 50/)).not.toBeInTheDocument();
  });
});

describe("CheckoutModal — payment payload carries member/redeem fields from the real BE contract (Phase 20)", () => {
  beforeEach(() => {
    getAllCustomer.mockResolvedValue({ data: [] });
    getAllDiscount.mockResolvedValue({ data: [] });
    getAllTypePayment.mockResolvedValue({
      data: [{ type: "cash", name: "Cash", status: "active" }]
    });
    getMemberById.mockResolvedValue({ data: { totalPoints: 120 } });
    createOrder.mockClear();
    createOrder.mockResolvedValue({
      data: { id: 1, totalPrice: 50000, subTotal: 100000, items: [] }
    });
  });

  test("selected member and redeemed points are sent using the existing customerId/customerName/redeemedPoints fields", async () => {
    renderModal();
    await openSearchAndPick(budi);
    const redeemInput = await screen.findByPlaceholderText("0");
    fireEvent.change(redeemInput, { target: { value: "50" } });

    fireEvent.click(await screen.findByText("Cash"));
    // Redeeming 50 of a 100,000 total only reduces the remaining payable
    // amount to 99,950 — the cash tendered must cover that, not an
    // arbitrary smaller amount, or the (correct) insufficient-cash guard
    // blocks submission before createOrder is ever called.
    fireEvent.change(screen.getByPlaceholderText("Rp 0"), { target: { value: "100000" } });
    await waitForCheckoutQuote();
    fireEvent.click(screen.getByText("page.cashier.confirmPayment"));

    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    const payload = createOrder.mock.calls[0][0];
    expect(payload.customerId).toBe(budi.id);
    expect(payload.customerName).toBe(budi.name);
    expect(payload.redeemedPoints).toBe(50);
    // No invented field names — only what the BE controller actually reads.
    expect(payload).not.toHaveProperty("redeemAmount");
    expect(payload).not.toHaveProperty("memberId");
  });

  test("no member selected sends redeemedPoints 0 and a null customerId, never a stale value", async () => {
    renderModal();
    fireEvent.click(await screen.findByText("Cash"));
    fireEvent.change(screen.getByPlaceholderText("Rp 0"), { target: { value: "100000" } });
    await waitForCheckoutQuote();
    fireEvent.click(screen.getByText("page.cashier.confirmPayment"));

    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    const payload = createOrder.mock.calls[0][0];
    expect(payload.customerId).toBeNull();
    expect(payload.redeemedPoints).toBe(0);
  });

  test("a backend payment failure does not report success or clear the selected member", async () => {
    createOrder.mockRejectedValue({
      response: { data: { message: "Insufficient point balance" } }
    });
    renderModal();
    await openSearchAndPick(budi);

    fireEvent.click(await screen.findByText("Cash"));
    fireEvent.change(screen.getByPlaceholderText("Rp 0"), { target: { value: "100000" } });
    await waitForCheckoutQuote();
    fireEvent.click(screen.getByText("page.cashier.confirmPayment"));

    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    // The member selection must still be visible — a rejected mutation must
    // never be treated as a successful checkout.
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
  });
});

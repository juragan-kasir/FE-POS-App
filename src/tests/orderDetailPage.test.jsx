import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// UX #7: a sale has its own page (items, charges, payment, status history),
// and documents that refer to it link there.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue ?? k, i18n: { language: "id" } })
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 1 } }]
}));
jest.mock("@/services/order", () => ({ getOrderById: jest.fn() }));
jest.mock("@/services/split-bill", () => ({ getSplitBillByOrder: jest.fn() }));
jest.mock("@/services/sales-return", () => ({
  getSalesReturnById: jest.fn(),
  getAllSalesReturn: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: [{ id: 1, name: "Toko Pusat" }] } })
}));

import { getOrderById } from "@/services/order";
import { getSplitBillByOrder } from "@/services/split-bill";
import { getSalesReturnById } from "@/services/sales-return";
import DetailOrder, { canReturnOrder } from "../page/order/DetailOrder";
import DetailSalesReturn from "../page/sales-return/DetailSalesReturn";

const order = {
  id: 77,
  orderNumber: "INV-077",
  store: 1,
  status: "paid",
  paymentStatus: "paid",
  paymentMethod: "cash",
  cashierName: "Sari",
  customerName: "Budi",
  source: "pos",
  table: { name: "Meja 3" },
  subTotal: 40000,
  discountAmount: 5000,
  taxRate: 11,
  taxAmount: 3850,
  totalPrice: 38850,
  splitCount: 1,
  createdAt: "2026-10-29T03:00:00.000Z",
  items: [
    {
      id: 1,
      productName: "Bakso Urat",
      quantity: 2,
      price: 20000,
      totalPrice: 40000,
      options: ["Pedas"],
      modifiers: [{ name: "Extra Bihun" }],
      notes: "tanpa seledri"
    }
  ],
  statusHistory: [
    { id: 2, status: "paid", createdAt: "2026-10-29T03:05:00.000Z" },
    { id: 1, status: "pending", createdAt: "2026-10-29T03:00:00.000Z" }
  ]
};

const renderAt = (url, element, path) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => jest.clearAllMocks());

test("shows the sale: items with choices, charges, payment and status history", async () => {
  getOrderById.mockResolvedValue({ data: order });
  renderAt("/order/detail?id=77", <DetailOrder />, "/order/detail");

  expect(await screen.findByText("Bakso Urat")).toBeInTheDocument();
  expect(screen.getByText("Pedas, Extra Bihun")).toBeInTheDocument();
  expect(screen.getByText("tanpa seledri")).toBeInTheDocument();
  expect(screen.getByText("Toko Pusat")).toBeInTheDocument();
  expect(screen.getByText("Meja 3")).toBeInTheDocument();
  expect(screen.getByText("- Rp 5.000")).toBeInTheDocument();
  expect(screen.getByText("Rp 38.850")).toBeInTheDocument();
  expect(screen.getByText("page.order.detail.tax (11%)")).toBeInTheDocument();
  // History oldest first.
  const items = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(items[0]).toMatch(/^pending/);
  expect(items[1]).toMatch(/^paid/);
  // A paid sale can be returned from here.
  expect(screen.getByRole("link", { name: /page.order.detail.createReturn/ })).toHaveAttribute(
    "href",
    "/sales-return/create?orderId=77"
  );
  expect(getSplitBillByOrder).not.toHaveBeenCalled();
});

test("a split bill lists its parts", async () => {
  getOrderById.mockResolvedValue({ data: { ...order, splitCount: 2 } });
  getSplitBillByOrder.mockResolvedValue({
    data: [
      { id: 1, splitNumber: 1, amount: 20000, paymentMethod: "cash", status: "paid" },
      { id: 2, splitNumber: 2, amount: 18850, paymentMethod: "qris", status: "unpaid" }
    ]
  });
  renderAt("/order/detail?id=77", <DetailOrder />, "/order/detail");
  expect(await screen.findByText("#2 · qris")).toBeInTheDocument();
});

test("not found vs failed to load", async () => {
  getOrderById.mockRejectedValue({ response: { status: 404, data: {} } });
  const { unmount } = renderAt("/order/detail?id=9", <DetailOrder />, "/order/detail");
  expect(await screen.findByText("page.order.detail.notFound")).toBeInTheDocument();
  unmount();

  getOrderById.mockRejectedValue({ response: { status: 500, data: {} } });
  renderAt("/order/detail?id=9", <DetailOrder />, "/order/detail");
  expect(await screen.findByRole("button", { name: /common.tryAgain/ })).toBeInTheDocument();
});

test("only a paid, not voided sale offers a return", () => {
  expect(canReturnOrder(order)).toBe(true);
  expect(canReturnOrder({ ...order, paymentStatus: "unpaid" })).toBe(false);
  expect(canReturnOrder({ ...order, status: "void" })).toBe(false);
});

test("the sales return detail links its order", async () => {
  getSalesReturnById.mockResolvedValue({
    data: {
      id: 3,
      returnNumber: "SR-1",
      order: 77,
      items: [],
      createdAt: "2026-10-29T03:00:00.000Z"
    }
  });
  getOrderById.mockResolvedValue({ data: order });
  renderAt("/sales-return/detail?id=3", <DetailSalesReturn />, "/sales-return/detail");
  expect(await screen.findByRole("link", { name: "INV-077" })).toHaveAttribute(
    "href",
    "/order/detail?id=77"
  );
});

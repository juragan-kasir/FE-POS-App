import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

// UX #1: related documents link to each other — GR ↔ PO, purchase return →
// PO, and a sales return names the order it came from.

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
jest.mock("@/services/index", () => ({
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));
jest.mock("@/services/goods-receipt", () => ({
  getGoodsReceiptById: jest.fn(),
  getGoodsReceiptByPO: jest.fn()
}));
jest.mock("@/services/sales-return", () => ({ getSalesReturnById: jest.fn() }));
jest.mock("@/services/order", () => ({ getOrderById: jest.fn() }));
jest.mock("@/services/purchase-return", () => ({
  getPurchaseReturnById: jest.fn(),
  getReturnsByPO: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/purchase-payment", () => ({
  getPaymentsByPO: jest.fn(() => Promise.resolve({ data: [] })),
  deletePayment: jest.fn(),
  recordPayment: jest.fn()
}));
jest.mock("@/services/purchase-order", () => ({
  getPurchaseOrderById: jest.fn(),
  returnPurchaseOrder: jest.fn(),
  resolveReturnedBy: (user, name) => user?.id ?? (name || null)
}));

import { getGoodsReceiptById, getGoodsReceiptByPO } from "@/services/goods-receipt";
import { getSalesReturnById } from "@/services/sales-return";
import { getOrderById } from "@/services/order";
import { getPurchaseReturnById } from "@/services/purchase-return";
import { getPurchaseOrderById } from "@/services/purchase-order";
import DetailGoodsReceipt from "../page/goods-receipt/DetailGoodsReceipt";
import DetailSalesReturn from "../page/sales-return/DetailSalesReturn";
import DetailPurchaseReturn from "../page/purchase-return/DetailPurchaseReturn";
import DetailPurchaseOrder from "../page/purchase-order/DetailPurchaseOrder";

const Where = () => {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
};

const renderAt = (url, element) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={url.split("?")[0]} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

test("goods receipt detail links its PO number to the PO", async () => {
  getGoodsReceiptById.mockResolvedValue({
    data: {
      id: 5,
      receiptNumber: "GR-001",
      purchaseOrderId: 42,
      purchaseOrderData: { orderNumber: "PO-042" },
      status: "completed",
      items: [],
      purchaseOrderItems: []
    }
  });
  renderAt("/goods-receipt/detail?id=5", <DetailGoodsReceipt />);

  const link = await screen.findByRole("link", { name: "PO-042" });
  expect(link).toHaveAttribute("href", "/purchase-order/detail?id=42");
});

test("purchase return detail links its PO", async () => {
  getPurchaseReturnById.mockResolvedValue({
    data: {
      id: 11,
      returnNumber: "PR-1",
      status: "pending",
      purchaseOrder: 42,
      items: [],
      createdAt: "2026-10-01T00:00:00.000Z"
    }
  });
  renderAt("/purchase-return/detail?id=11", <DetailPurchaseReturn />);

  const link = await screen.findByRole("link", { name: "PO-42" });
  expect(link).toHaveAttribute("href", "/purchase-order/detail?id=42");
});

test("sales return detail names the order and customer it came from", async () => {
  getSalesReturnById.mockResolvedValue({
    data: {
      id: 3,
      returnNumber: "SR-1",
      order: 77,
      refundAmount: 15000,
      createdAt: "2026-10-01T00:00:00.000Z",
      items: []
    }
  });
  getOrderById.mockResolvedValue({
    data: { id: 77, orderNumber: "INV-077", customerName: "Budi" }
  });
  renderAt("/sales-return/detail?id=3", <DetailSalesReturn />);

  expect(await screen.findByText("INV-077")).toBeInTheDocument();
  expect(screen.getByText("Budi")).toBeInTheDocument();
  expect(getOrderById).toHaveBeenCalledWith(77);
});

test("PO detail lists its goods receipts, each opening the receipt", async () => {
  getPurchaseOrderById.mockResolvedValue({
    data: { id: 42, orderNumber: "PO-042", status: "ordered", items: [], totalAmount: 0 }
  });
  getGoodsReceiptByPO.mockResolvedValue({
    data: [
      {
        id: 5,
        receiptNumber: "GR-001",
        status: "completed",
        receivedDate: "2026-10-02",
        items: [{}, {}]
      }
    ]
  });
  renderAt("/purchase-order/detail?id=42", <DetailPurchaseOrder />);

  expect(await screen.findByText("page.purchaseOrder.detail.receipts")).toBeInTheDocument();
  expect(getGoodsReceiptByPO).toHaveBeenCalledWith("42");
  fireEvent.click(await screen.findByText("GR-001"));
  await waitFor(() =>
    expect(screen.getByTestId("where")).toHaveTextContent("/goods-receipt/detail?id=5")
  );
});

test("PO detail offers Receive Goods for an ordered PO, prefilled with the PO", async () => {
  getPurchaseOrderById.mockResolvedValue({
    data: { id: 42, orderNumber: "PO-042", status: "ordered", items: [], totalAmount: 0 }
  });
  getGoodsReceiptByPO.mockResolvedValue({ data: [] });
  renderAt("/purchase-order/detail?id=42", <DetailPurchaseOrder />);

  expect(await screen.findByText("page.purchaseOrder.detail.noReceipt")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /page.purchaseOrder.detail.receiveGoods/ }));
  await waitFor(() =>
    expect(screen.getByTestId("where")).toHaveTextContent("/add-goods-receipt?poId=42")
  );
});

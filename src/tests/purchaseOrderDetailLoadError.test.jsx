import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// UX #6: a PO that failed to load showed "PO tidak ditemukan", and payment /
// return / receipt lists that failed to load showed as empty.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue ?? k, i18n: { language: "id" } })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
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
jest.mock("@/services/goods-receipt", () => ({ getGoodsReceiptByPO: jest.fn() }));
jest.mock("@/services/purchase-return", () => ({ getReturnsByPO: jest.fn() }));
jest.mock("@/services/purchase-payment", () => ({
  getPaymentsByPO: jest.fn(),
  deletePayment: jest.fn(),
  recordPayment: jest.fn()
}));
jest.mock("@/services/purchase-order", () => ({
  getPurchaseOrderById: jest.fn(),
  returnPurchaseOrder: jest.fn(),
  resolveReturnedBy: (user, name) => user?.id ?? (name || null)
}));

import { getGoodsReceiptByPO } from "@/services/goods-receipt";
import { getReturnsByPO } from "@/services/purchase-return";
import { getPaymentsByPO } from "@/services/purchase-payment";
import { getPurchaseOrderById } from "@/services/purchase-order";
import DetailPurchaseOrder from "../page/purchase-order/DetailPurchaseOrder";

const po = { id: 42, orderNumber: "PO-042", status: "ordered", items: [], totalAmount: 0 };
const httpError = (status) => Object.assign(new Error("x"), { response: { status, data: {} } });

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/purchase-order/detail?id=42"]}>
        <Routes>
          <Route path="/purchase-order/detail" element={<DetailPurchaseOrder />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  getPaymentsByPO.mockResolvedValue({ data: [] });
  getReturnsByPO.mockResolvedValue({ data: [] });
  getGoodsReceiptByPO.mockResolvedValue({ data: [] });
});

test("a failed load offers a retry instead of claiming the PO doesn't exist", async () => {
  getPurchaseOrderById.mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce({ data: po });
  renderPage();

  const retry = await screen.findByRole("button", { name: /common.tryAgain/ });
  expect(screen.queryByText("page.purchaseOrder.detail.notFound")).toBeNull();

  fireEvent.click(retry);
  expect(await screen.findAllByText("PO-042")).not.toHaveLength(0);
  expect(getPurchaseOrderById).toHaveBeenCalledTimes(2);
});

test("a 404 still says the PO was not found", async () => {
  getPurchaseOrderById.mockRejectedValue(httpError(404));
  renderPage();
  expect(await screen.findByText("page.purchaseOrder.detail.notFound")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /common.tryAgain/ })).toBeNull();
});

test("related lists that failed to load say so, with a retry", async () => {
  getPurchaseOrderById.mockResolvedValue({ data: po });
  getGoodsReceiptByPO.mockRejectedValueOnce(httpError(500)).mockResolvedValue({ data: [] });
  renderPage();

  expect(await screen.findByText("common.loadErrorPartial")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /common.retry/ }));
  await waitFor(() => expect(screen.queryByText("common.loadErrorPartial")).toBeNull());
});

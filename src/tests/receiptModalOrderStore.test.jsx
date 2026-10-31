import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import ReceiptModal from "../page/cashier/components/ReceiptModal";
import { getLocationById } from "@/services/location";
import { getInvoiceSetting } from "@/services/invoice";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));
jest.mock("@/utils/thermalPrint", () => ({ printReceipt: jest.fn() }));
jest.mock("@/services/invoice", () => ({
  getInvoiceSetting: jest.fn(() => Promise.resolve({ data: {} }))
}));
jest.mock("@/services/location", () => ({
  getLocationById: jest.fn(() => Promise.resolve({ data: {} }))
}));
jest.mock("@/services/general", () => ({
  getProvinces: jest.fn(() => Promise.resolve([])),
  getCities: jest.fn(() => Promise.resolve([])),
  getDistricts: jest.fn(() => Promise.resolve([])),
  getVillages: jest.fn(() => Promise.resolve([])),
  getPostalCode: jest.fn(() => Promise.resolve([]))
}));
jest.mock("@/services/type-payment", () => ({
  getAllTypePayment: jest.fn(() =>
    Promise.resolve({ data: [{ type: "cash", name: "Cash", status: "active" }] })
  )
}));
jest.mock("../services/split-bill", () => ({
  createSplitBill: jest.fn(() => Promise.resolve({ data: [] })),
  getSplitBillByOrder: jest.fn(() => Promise.resolve({ data: null })),
  paySplitBill: jest.fn(),
  cancelSplitBill: jest.fn(),
  mergeSplitBills: jest.fn()
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "super_admin", store: 1 }, activeStore: 1 }]
}));

const renderModal = (orderData) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
        })
      }>
      <ReceiptModal data={orderData} onClose={jest.fn()} onNewTransaction={jest.fn()} />
    </QueryClientProvider>
  );

describe("ReceiptModal store header comes from the order", () => {
  beforeEach(() => {
    getLocationById.mockClear();
    getInvoiceSetting.mockClear();
  });

  test("an order of store 2 prints store 2 even while another store is active", async () => {
    renderModal({ id: 1, orderNumber: "ORD-1", total: 1000, items: [], store: 2 });
    await waitFor(() => expect(getLocationById).toHaveBeenCalledWith({ id: 2 }));
    expect(getInvoiceSetting).toHaveBeenCalledWith(2);
    expect(getLocationById).not.toHaveBeenCalledWith({ id: 1 });
  });

  test("a store object on the order is read by its id", async () => {
    renderModal({
      id: 2,
      orderNumber: "ORD-2",
      total: 1000,
      items: [],
      store: { id: 5, name: "X" }
    });
    await waitFor(() => expect(getLocationById).toHaveBeenCalledWith({ id: 5 }));
  });

  test("without a store on the order the active store is used", async () => {
    renderModal({ id: 3, orderNumber: "ORD-3", total: 1000, items: [] });
    await waitFor(() => expect(getLocationById).toHaveBeenCalledWith({ id: 1 }));
  });
});

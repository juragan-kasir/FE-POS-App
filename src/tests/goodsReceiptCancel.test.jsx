import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import GoodsReceiptList from "../page/goods-receipt/GoodsReceiptList";
import { getAllGoodsReceipt, changeGoodsReceiptStatus } from "../services/goods-receipt";
import { getAllLocation } from "../services/location";
import { toast } from "sonner";

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      const dict = {
        "page.goodsReceipt.list.title": "Goods Receipt",
        "page.goodsReceipt.list.cancelReceipt": "Cancel Receipt",
        "page.goodsReceipt.list.cancelConfirm": "Yes, Cancel Receipt",
        "page.goodsReceipt.list.modal.cancelTitle": "Cancel Goods Receipt",
        "page.goodsReceipt.list.modal.cancelDescription": "Cancel receipt {{receiptNumber}}?",
        "page.goodsReceipt.list.toast.cancelSuccess": "Goods receipt cancelled",
        "page.goodsReceipt.list.toast.cancelSuccessDesc": "Stock reversed",
        "page.goodsReceipt.list.toast.cancelError": "Failed to cancel goods receipt",
        "page.goodsReceipt.list.table.actions": "Actions",
        "common.delete": "Delete",
        "common.view": "View",
        "common.actions": "Actions"
      };
      let s = dict[k] || (typeof opts === "string" ? opts : k);
      const params = typeof opts === "object" && opts ? opts : {};
      for (const [key, value] of Object.entries(params)) {
        s = s.replaceAll(`{{${key}}}`, String(value));
      }
      return s;
    }
  })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 9, fullName: "Admin Uji", roleType: "admin" } }]
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn()
}));

jest.mock("../hooks/useGlobalStoreFilter", () => ({
  useGlobalStoreFilter: () => ["all", jest.fn()]
}));

jest.mock("../utils/permission", () => ({
  canAccess: () => true,
  parseAccessMenu: (v) => v
}));

jest.mock("../services/goods-receipt", () => ({
  getAllGoodsReceipt: jest.fn(),
  deleteGoodsReceipt: jest.fn(),
  exportGoodsReceipt: jest.fn(),
  changeGoodsReceiptStatus: jest.fn()
}));

jest.mock("../services/location", () => ({
  getAllLocation: jest.fn()
}));

const draftReceipt = {
  id: 21,
  receiptNumber: "GR-000021",
  status: "draft",
  items: [],
  storeData: { name: "Toko Uji" }
};

const completedReceipt = {
  id: 22,
  receiptNumber: "GR-000022",
  status: "completed",
  items: [],
  storeData: { name: "Toko Uji" }
};

const renderList = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <GoodsReceiptList />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

// Radix dropdown triggers do not open on synthetic mouse events in jsdom
// (no @testing-library/user-event installed here); keyboard Enter does.
const openRowMenu = () => {
  const trigger = screen.getByRole("button", { name: "Actions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" });
  fireEvent.keyUp(trigger, { key: "Enter", code: "Enter" });
};

beforeEach(() => {
  jest.clearAllMocks();
  getAllLocation.mockResolvedValue({ data: [] });
});

test("draft rows expose a cancel action; completed rows do not", async () => {
  getAllGoodsReceipt.mockResolvedValueOnce({
    data: [draftReceipt, completedReceipt],
    meta: { total: 2 }
  });
  renderList();

  expect(await screen.findByText("GR-000021")).toBeInTheDocument();
  expect(screen.getByText("GR-000022")).toBeInTheDocument();
  // Only the draft row renders an overflow menu (view + edit + delete +
  // cancel); the completed row has a single inline view action and no menu.
  expect(screen.getAllByRole("button", { name: "Actions" }).length).toBe(1);
  openRowMenu();
  expect(await screen.findByText("Cancel Receipt")).toBeInTheDocument();
  expect(screen.getAllByText("Cancel Receipt").length).toBe(1);
});

test("confirming cancel calls the status endpoint with cancelled and refetches", async () => {
  getAllGoodsReceipt
    .mockResolvedValueOnce({ data: [draftReceipt], meta: { total: 1 } })
    .mockResolvedValueOnce({
      data: [{ ...draftReceipt, status: "cancelled" }],
      meta: { total: 1 }
    });
  changeGoodsReceiptStatus.mockResolvedValueOnce({ data: { id: 21, status: "cancelled" } });
  renderList();

  expect(await screen.findByText("GR-000021")).toBeInTheDocument();
  openRowMenu();
  fireEvent.click(await screen.findByText("Cancel Receipt"));
  expect(await screen.findByText("Cancel Goods Receipt")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Yes, Cancel Receipt"));

  await waitFor(() => expect(changeGoodsReceiptStatus).toHaveBeenCalledWith(21, "cancelled"));
  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith(
      "Goods receipt cancelled",
      expect.objectContaining({ description: "Stock reversed" })
    )
  );
});

test("failed cancel surfaces the server message and keeps the draft row", async () => {
  getAllGoodsReceipt.mockResolvedValueOnce({ data: [draftReceipt], meta: { total: 1 } });
  changeGoodsReceiptStatus.mockRejectedValueOnce({
    response: { data: { message: 'Cannot change status from "draft"' } }
  });
  renderList();

  expect(await screen.findByText("GR-000021")).toBeInTheDocument();
  openRowMenu();
  fireEvent.click(await screen.findByText("Cancel Receipt"));
  fireEvent.click(await screen.findByText("Yes, Cancel Receipt"));

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "Failed to cancel goods receipt",
      expect.objectContaining({ description: 'Cannot change status from "draft"' })
    )
  );
  expect(getAllGoodsReceipt).toHaveBeenCalled();
});

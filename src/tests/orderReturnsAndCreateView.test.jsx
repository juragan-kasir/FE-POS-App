import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

// Follow-up to BE #279: department/position creates now return the record
// (→ "Lihat Detail"), and sales returns can be listed per order (→ the
// order detail page shows its returns).

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue ?? k, i18n: { language: "id" } })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 1 } }]
}));
jest.mock("@/hooks/useUserSession", () => ({ useUserSession: () => null }));
jest.mock("@/contexts/StoreContext", () => ({ useStore: () => null }));
jest.mock("@/services/order", () => ({ getOrderById: jest.fn() }));
jest.mock("@/services/split-bill", () => ({ getSplitBillByOrder: jest.fn() }));
jest.mock("@/services/sales-return", () => ({ getAllSalesReturn: jest.fn() }));
jest.mock("@/services/department", () => ({
  addDepartment: jest.fn(),
  getAllDepartment: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/position", () => ({ addPosition: jest.fn() }));
jest.mock("@/queries/useLocations", () => ({ useLocations: () => ({ data: { data: [] } }) }));
jest.mock("@/components/organism/UserGuide", () => () => null);

import { toast } from "sonner";
import { getOrderById } from "@/services/order";
import { getAllSalesReturn } from "@/services/sales-return";
import { addDepartment } from "@/services/department";
import { addPosition } from "@/services/position";
import DetailOrder from "../page/order/DetailOrder";
import AddDepartment from "../page/department/AddDepartment";
import AddPosition from "../page/position/AddPosition";

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

beforeEach(() => jest.clearAllMocks());

describe("order detail lists its returns", () => {
  const order = {
    id: 77,
    orderNumber: "INV-077",
    status: "paid",
    paymentStatus: "paid",
    items: [],
    statusHistory: [],
    totalPrice: 0
  };

  test("only this order's returns, each linking to the return", async () => {
    getOrderById.mockResolvedValue({ data: order });
    // An API without the orderId filter would also send other orders' returns.
    getAllSalesReturn.mockResolvedValue({
      data: [
        { id: 3, order: 77, returnNumber: "SR-3", status: "approved", refundAmount: 15000 },
        { id: 4, order: 99, returnNumber: "SR-4", status: "pending", refundAmount: 9000 }
      ]
    });
    renderAt("/order/detail?id=77", <DetailOrder />);

    expect(await screen.findByRole("link", { name: "SR-3" })).toHaveAttribute(
      "href",
      "/sales-return/detail?id=3"
    );
    expect(screen.queryByText("SR-4")).toBeNull();
    expect(getAllSalesReturn).toHaveBeenCalledWith({ orderId: "77", limit: 50 });
  });

  test("no returns yet", async () => {
    getOrderById.mockResolvedValue({ data: order });
    getAllSalesReturn.mockResolvedValue({ data: [] });
    renderAt("/order/detail?id=77", <DetailOrder />);
    expect(await screen.findByText("page.order.detail.noReturns")).toBeInTheDocument();
  });
});

describe("Lihat Detail after creating a department / position", () => {
  const saveDraft = async (draftLabel, confirmLabel) => {
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(draftLabel) }));
    fireEvent.click(await screen.findByRole("button", { name: confirmLabel }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    return toast.success.mock.calls.at(-1)[1].action;
  };

  test("department", async () => {
    addDepartment.mockResolvedValue({ success: true, data: { id: 5 } });
    renderAt("/add-department", <AddDepartment />);
    const action = await saveDraft("common.saveAsDraft", "common.yesSaveDraft");
    expect(action.label).toBe("common.viewDetail");
    action.onClick();
    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent("/detail-department?id=5")
    );
  });

  test("position", async () => {
    addPosition.mockResolvedValue({ success: true, data: { id: 8 } });
    renderAt("/add-position", <AddPosition />);
    const action = await saveDraft(
      "page.position.button.saveDraft",
      "page.position.add.draftConfirm"
    );
    action.onClick();
    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent("/detail-position?positionID=8")
    );
  });

  test("an API that returns no record offers no action", async () => {
    addDepartment.mockResolvedValue({ success: true, message: "ok" });
    renderAt("/add-department", <AddDepartment />);
    expect(await saveDraft("common.saveAsDraft", "common.yesSaveDraft")).toBeUndefined();
  });
});

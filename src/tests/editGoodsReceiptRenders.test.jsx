import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import EditGoodsReceipt from "../page/goods-receipt/EditGoodsReceipt";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("id=3"), jest.fn()]
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("react-cookie", () => ({ useCookies: () => [{ user: { id: 1, roleType: "admin" } }] }));
jest.mock("@/contexts/StoreContext", () => ({ useStore: () => ({ isSuperAdmin: false }) }));
jest.mock("@/queries/useLocations", () => ({ useLocations: () => ({ data: undefined }) }));
jest.mock("@/services/goods-receipt", () => ({
  getGoodsReceiptById: jest.fn(() => new Promise(() => {})),
  getGoodsReceiptByPO: jest.fn(() => new Promise(() => {})),
  editGoodsReceipt: jest.fn()
}));
jest.mock("@/services/purchase-order", () => ({
  getAllPurchaseOrder: jest.fn(() => new Promise(() => {})),
  getPurchaseOrderById: jest.fn(() => new Promise(() => {}))
}));
jest.mock("@/services/ingredient", () => ({ getAllIngredients: jest.fn() }));
jest.mock("@/services/employee", () => ({ getAllEmployee: jest.fn() }));
jest.mock(
  "@/components/organism/UserGuide",
  () =>
    function UserGuideStub() {
      return <div />;
    }
);

test("Edit Penerimaan Barang renders instead of throwing on its first render", () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditGoodsReceipt />
    </QueryClientProvider>
  );
  expect(screen.getByText("page.goodsReceipt.edit.title")).toBeInTheDocument();
});

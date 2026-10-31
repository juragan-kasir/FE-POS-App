import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddGoodsReceipt from "../page/goods-receipt/AddGoodsReceipt";
import EditGoodsReceipt from "../page/goods-receipt/EditGoodsReceipt";
import { addGoodsReceipt, editGoodsReceipt, getGoodsReceiptById } from "../services/goods-receipt";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

let mockSearch = "poId=50";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams(mockSearch), jest.fn()]
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 4 } }]
}));
jest.mock("@/contexts/StoreContext", () => ({ useStore: () => ({ isSuperAdmin: false }) }));
jest.mock("@/queries/useLocations", () => ({ useLocations: () => ({ data: undefined }) }));
jest.mock("@/lib/unsaved-changes-store", () => ({
  ...jest.requireActual("@/lib/unsaved-changes-store"),
  markSaved: jest.fn()
}));

const poDetail = {
  id: 50,
  orderNumber: "PO-0050",
  store: 4,
  orderDate: "2026-10-01T02:00:00.000Z",
  additionalCost: 0,
  items: [
    {
      id: 501,
      ingredient: 21,
      ingredientName: "Daging Sapi",
      product: null,
      quantity: 10,
      receivedQuantity: 4,
      returnedQty: 0,
      unit: "kg",
      price: 120000,
      conversionToBase: 1000
    }
  ]
};

jest.mock("@/services/goods-receipt", () => ({
  addGoodsReceipt: jest.fn(),
  editGoodsReceipt: jest.fn(),
  getGoodsReceiptById: jest.fn(),
  getGoodsReceiptByPO: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/purchase-order", () => ({
  getAllPurchaseOrder: jest.fn(() => Promise.resolve({ data: [] })),
  getPurchaseOrderById: jest.fn(() => Promise.resolve({ data: poDetail }))
}));
jest.mock("@/services/product", () => ({
  getAllProduct: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/employee", () => ({
  getAllEmployee: jest.fn(() => Promise.resolve({ data: [{ id: 7, fullName: "Budi" }] }))
}));
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <div>{children}</div>,
  TabsContent: ({ children }) => <div>{children}</div>
}));
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: function DatePickerStub({ id, date, setDate }) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      <input
        data-testid={`date-${id || "picker"}`}
        value={
          date instanceof Date
            ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
            : ""
        }
        onChange={(e) =>
          setDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)
        }
      />
    );
  }
}));
jest.mock(
  "@/components/organism/MissingFieldsModal",
  () =>
    function MissingFieldsModalStub({ open, fields }) {
      return open ? <div data-testid="missing-fields">{fields.join(",")}</div> : null;
    }
);
jest.mock(
  "@/components/organism/UserGuide",
  () =>
    function UserGuideStub() {
      return <div />;
    }
);

const renderPage = (Page) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>
  );
};

const type = (element, value) => fireEvent.change(element, { target: { value } });
const qtyInput = (page) =>
  screen.getAllByPlaceholderText(`page.goodsReceipt.${page}.placeholder.qty`)[0];
const byId = (id) => document.getElementById(id);

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = "poId=50";
  addGoodsReceipt.mockResolvedValue({ data: { id: 70 } });
  editGoodsReceipt.mockResolvedValue({ data: { id: 70 } });
});

describe("AddGoodsReceipt — characterization", () => {
  test("is sent with exactly these fields", async () => {
    renderPage(AddGoodsReceipt);
    await waitFor(() => expect(qtyInput("add")).toBeTruthy());
    type(qtyInput("add"), "5");
    type(byId("add-goods-receipt-surat-jalan"), " SJ-01 ");
    type(byId("add-goods-receipt-tax-invoice-no"), "FP-9");
    type(byId("add-goods-receipt-shipping-cost"), "15000");
    fireEvent.click(screen.getByText("page.goodsReceipt.add.form.save"));
    fireEvent.click(await screen.findByText("page.goodsReceipt.add.confirmModal.confirm"));
    await waitFor(() => expect(addGoodsReceipt).toHaveBeenCalledTimes(1));
    const [payload, files] = addGoodsReceipt.mock.calls[0];
    expect(files).toEqual([]);
    expect(payload).toEqual({
      purchaseOrderId: 50,
      receivedDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      notes: "",
      pic: null,
      suratJalan: "SJ-01",
      taxInvoiceNo: "FP-9",
      shippingCost: 15000,
      idempotencyKey: expect.any(String),
      status: "completed",
      items: [
        {
          purchaseOrderItem: 501,
          ingredient: 21,
          ingredientName: "Daging Sapi",
          product: null,
          qtyReceived: 5,
          unit: "kg",
          conditionNotes: "",
          batchNumber: null,
          expiryDate: null,
          costPrice: 120000,
          conversionToBase: 1000
        }
      ]
    });
  });

  test("a quantity above what is still open is capped at the remaining", async () => {
    renderPage(AddGoodsReceipt);
    await waitFor(() => expect(qtyInput("add")).toBeTruthy());
    type(qtyInput("add"), "9");
    expect(qtyInput("add")).toHaveValue("6");
  });

  test("a draft is sent with status draft", async () => {
    renderPage(AddGoodsReceipt);
    await waitFor(() => expect(qtyInput("add")).toBeTruthy());
    type(qtyInput("add"), "2");
    fireEvent.click(screen.getByText("common.saveAsDraft"));
    fireEvent.click(await screen.findByText("common.yesSaveDraft"));
    await waitFor(() => expect(addGoodsReceipt).toHaveBeenCalledTimes(1));
    expect(addGoodsReceipt.mock.calls[0][0].status).toBe("draft");
  });
});

const loadedReceipt = {
  id: 70,
  purchaseOrderId: 50,
  store: 4,
  receivedDate: "2026-10-05",
  notes: "Datang sore",
  suratJalan: "SJ-01",
  taxInvoiceNo: "",
  shippingCost: "15000.00",
  picData: { id: 7, fullName: "Budi", userName: "budi" },
  documentation: JSON.stringify(["https://cdn.example.com/a.jpg"]),
  items: [
    {
      id: 701,
      purchaseOrderItem: 501,
      ingredientName: "Daging Sapi",
      product: null,
      qtyReceived: 5,
      unit: "kg",
      conditionNotes: "",
      batchNumber: "B1",
      expiryDate: "2026-12-01",
      costPrice: 120000,
      conversionToBase: 1000
    }
  ]
};

describe("EditGoodsReceipt — characterization", () => {
  beforeEach(() => {
    mockSearch = "id=70";
    getGoodsReceiptById.mockResolvedValue({ data: loadedReceipt });
  });

  test("saving lists the purchase order as missing although one is loaded", async () => {
    renderPage(EditGoodsReceipt);
    await screen.findByDisplayValue("Datang sore");
    fireEvent.click(screen.getByText("page.goodsReceipt.edit.form.save"));
    expect(await screen.findByTestId("missing-fields")).toHaveTextContent(
      "page.goodsReceipt.edit.form.purchaseOrder"
    );
    expect(editGoodsReceipt).not.toHaveBeenCalled();
  });

  test("a draft of an unchanged receipt is sent back as loaded", async () => {
    renderPage(EditGoodsReceipt);
    await screen.findByDisplayValue("Datang sore");
    fireEvent.click(screen.getByText("common.saveAsDraft"));
    fireEvent.click(await screen.findByText("common.yesSaveDraft"));
    await waitFor(() => expect(editGoodsReceipt).toHaveBeenCalledTimes(1));
    const [id, payload, files] = editGoodsReceipt.mock.calls[0];
    expect(id).toBe("70");
    expect(files).toEqual([]);
    expect(payload).toEqual({
      receivedDate: "2026-10-05",
      notes: "Datang sore",
      pic: 7,
      suratJalan: "SJ-01",
      taxInvoiceNo: null,
      shippingCost: 15000,
      status: "draft",
      items: [
        {
          purchaseOrderItem: 501,
          ingredient: null,
          ingredientName: "Daging Sapi",
          product: null,
          qtyReceived: 5,
          unit: "kg",
          conditionNotes: "",
          batchNumber: "B1",
          expiryDate: "2026-12-01",
          costPrice: 120000,
          conversionToBase: 1000
        }
      ],
      documentation: ["https://cdn.example.com/a.jpg"]
    });
  });
});

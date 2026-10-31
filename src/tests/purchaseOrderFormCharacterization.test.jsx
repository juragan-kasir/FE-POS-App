import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddPurchaseOrder from "../page/purchase-order/AddPurchaseOrder";
import EditPurchaseOrder from "../page/purchase-order/EditPurchaseOrder";
import {
  addPurchaseOrder,
  editPurchaseOrder,
  getPurchaseOrderById
} from "../services/purchase-order";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams("id=60"), jest.fn()]
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 4 } }]
}));
jest.mock("@/contexts/StoreContext", () => ({ useStore: () => ({ setActiveStore: jest.fn() }) }));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: [{ id: 4, name: "Toko Pusat" }] }, isLoading: false })
}));
jest.mock("@/services/purchase-order", () => ({
  addPurchaseOrder: jest.fn(),
  editPurchaseOrder: jest.fn(),
  getPurchaseOrderById: jest.fn()
}));
jest.mock("@/services/supplier", () => ({
  getAllSupplier: jest.fn(() =>
    Promise.resolve({
      data: [
        {
          id: 5,
          name: "PT Daging",
          paymentType: "cbd",
          products: [
            { id: 11, productId: 90, name: "Daging Sapi", unit: "kg", price: 120000 },
            { id: 12, productId: 91, name: "Tulang", unit: "kg", price: 30000 }
          ]
        }
      ]
    })
  )
}));
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/employee", () => ({
  getAllEmployee: jest.fn(() => Promise.resolve({ data: [{ id: 7, fullName: "Budi" }] }))
}));
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ id, options, value, onChange, placeholder, disabled }) {
    return (
      <select
        id={id}
        aria-label={placeholder}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}>
        <option value="" />
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
}));
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: function DatePickerStub({ id, date, setDate }) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      <input
        data-testid={`date-${id}`}
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
jest.mock("@/components/ui/time-picker", () => ({
  TimePicker: function TimePickerStub({ id, value, onChange }) {
    return (
      <input data-testid={`time-${id}`} value={value} onChange={(e) => onChange(e.target.value)} />
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
const supplierSelect = (gIdx = 0) => document.getElementById(`po-group-${gIdx}-supplier`);
const itemSelects = () => screen.getAllByLabelText("page.purchaseOrder.add.placeholder.selectItem");
const qtyInputs = () =>
  [...document.querySelectorAll('input[inputmode="decimal"]')].filter(
    (el) => el.placeholder === "0" && el.className.includes("w-20 mx-auto")
  );

const pickPic = () => {
  const pic = document.getElementById("po-pic");
  fireEvent.focus(pic);
  type(pic, "Bu");
  fireEvent.mouseDown(screen.getByText("Budi"));
};

const atLocal = (date, h, m) => {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};

beforeEach(() => {
  jest.clearAllMocks();
  addPurchaseOrder.mockResolvedValue({ data: { id: 61 } });
  editPurchaseOrder.mockResolvedValue({ data: { id: 60 } });
});

const typeDigitByDigit = (getInput, digits) => {
  digits.split("").forEach((digit) => {
    const input = getInput();
    type(input, `${input.value}${digit}`);
  });
};

describe("AddPurchaseOrder — rupiah inputs", () => {
  test("a price, discount and extra cost typed digit by digit keep their thousands", async () => {
    renderPage(AddPurchaseOrder);
    await waitFor(() => expect(supplierSelect().options.length).toBeGreaterThan(1));
    type(supplierSelect(), "5");
    type(itemSelects()[0], "sp-11");
    const priceInput = () =>
      screen
        .getAllByPlaceholderText("page.purchaseOrder.add.rpPlaceholder")
        .find((el) => el.className.includes("w-36 ml-auto"));
    type(priceInput(), "");
    typeDigitByDigit(priceInput, "15000");
    typeDigitByDigit(() => document.getElementById("add-purchase-order-discount"), "12500");
    typeDigitByDigit(() => document.getElementById("add-purchase-order-additional-cost"), "20000");
    await waitFor(() => expect(document.getElementById("po-pic")).toBeTruthy());
    pickPic();
    fireEvent.click(screen.getByText("page.purchaseOrder.add.savePo"));
    fireEvent.click(await screen.findByText("common.yes"));
    await waitFor(() => expect(addPurchaseOrder).toHaveBeenCalledTimes(1));
    const payload = addPurchaseOrder.mock.calls[0][0];
    expect(payload.items[0].price).toBe(15000);
    expect(payload.discount).toBe(12500);
    expect(payload.additionalCost).toBe(20000);
  });
});

describe("AddPurchaseOrder — characterization", () => {
  const fillOrder = async () => {
    await waitFor(() => expect(supplierSelect().options.length).toBeGreaterThan(1));
    type(supplierSelect(), "5");
    type(itemSelects()[0], "sp-11");
    type(qtyInputs()[0], "2");
    type(screen.getByTestId("date-add-purchase-order-po-date"), "2026-11-02");
    type(screen.getByTestId("time-add-purchase-order-time"), "09:30");
    await waitFor(() => expect(document.getElementById("po-pic")).toBeTruthy());
    pickPic();
  };

  test("is sent with exactly these fields", async () => {
    renderPage(AddPurchaseOrder);
    await fillOrder();
    type(document.getElementById("add-purchase-order-notes"), "Kirim pagi");
    fireEvent.click(screen.getByText("page.purchaseOrder.add.savePo"));
    fireEvent.click(await screen.findByText("common.yes"));
    await waitFor(() => expect(addPurchaseOrder).toHaveBeenCalledTimes(1));
    expect(addPurchaseOrder.mock.calls[0][0]).toEqual({
      store: "4",
      notes: "Kirim pagi",
      discount: 0,
      taxRate: 0,
      additionalCost: 0,
      overDeliveryTolerance: 10,
      status: "pending",
      dueDate: null,
      pic: 7,
      paymentMethod: "cash",
      tenor: 0,
      dpPercent: 0,
      orderDate: atLocal(new Date(2026, 10, 2), 9, 30),
      items: [
        {
          product: 90,
          ingredient: null,
          ingredientName: "Daging Sapi",
          quantity: 2,
          price: 120000,
          unit: "kg",
          conversionToBase: 1,
          supplier: 5
        }
      ],
      createdBy: 1
    });
  });

  test("a draft keeps empty rows and is sent with status draft", async () => {
    renderPage(AddPurchaseOrder);
    await fillOrder();
    fireEvent.click(screen.getByText("page.purchaseOrder.add.form.addItem"));
    fireEvent.click(screen.getByText("page.purchaseOrder.add.saveDraft"));
    fireEvent.click(await screen.findByText("page.purchaseOrder.add.draftConfirm"));
    await waitFor(() => expect(addPurchaseOrder).toHaveBeenCalledTimes(1));
    const payload = addPurchaseOrder.mock.calls[0][0];
    expect(payload.status).toBe("draft");
    expect(payload.items).toHaveLength(2);
    expect(payload.items[1]).toEqual({
      product: null,
      ingredient: null,
      ingredientName: null,
      quantity: 1,
      price: 0,
      unit: "pcs",
      conversionToBase: 1,
      supplier: 5
    });
  });

  test("without any item the missing field is listed and nothing is sent", async () => {
    renderPage(AddPurchaseOrder);
    await waitFor(() => expect(supplierSelect().options.length).toBeGreaterThan(1));
    fireEvent.click(screen.getByText("page.purchaseOrder.add.savePo"));
    expect(await screen.findByTestId("missing-fields")).toHaveTextContent(
      "page.purchaseOrder.add.itemSection"
    );
    expect(addPurchaseOrder).not.toHaveBeenCalled();
  });

  test("discount and tax rate are sent as entered", async () => {
    renderPage(AddPurchaseOrder);
    await fillOrder();
    type(document.getElementById("add-purchase-order-discount"), "5000");
    type(document.getElementById("add-purchase-order-tax-rate"), "11");
    fireEvent.click(screen.getByText("page.purchaseOrder.add.savePo"));
    fireEvent.click(await screen.findByText("common.yes"));
    await waitFor(() => expect(addPurchaseOrder).toHaveBeenCalledTimes(1));
    expect(addPurchaseOrder.mock.calls[0][0]).toMatchObject({ discount: 5000, taxRate: 11 });
  });
});

const loadedOrder = {
  id: 60,
  orderNumber: "PO-0060",
  status: "pending",
  store: 4,
  pic: 7,
  picData: { fullName: "Budi" },
  notes: "Kirim pagi",
  discount: 5000,
  taxRate: 11,
  additionalCost: 2000,
  additionalCostNotes: "Ongkir",
  overDeliveryTolerance: 5,
  orderDate: new Date(2026, 10, 2, 9, 30).toISOString(),
  dueDate: null,
  paymentMethod: "cash",
  tenor: 0,
  dpPercent: 0,
  items: [
    {
      product: 90,
      ingredient: null,
      ingredientName: "Daging Sapi",
      productData: { nameProduct: "Daging Sapi" },
      quantity: 2,
      price: 120000,
      unit: "kg",
      conversionToBase: 1,
      supplier: 5,
      receivedQuantity: 0
    },
    {
      product: 91,
      ingredient: null,
      ingredientName: "Tulang",
      productData: { nameProduct: "Tulang" },
      quantity: 3,
      price: 30000,
      unit: "kg",
      conversionToBase: 1,
      supplier: 5,
      receivedQuantity: 0
    }
  ]
};

const loadedPayload = {
  store: 4,
  notes: "Kirim pagi",
  pic: 7,
  discount: 5000,
  taxRate: 11,
  additionalCost: 2000,
  additionalCostNotes: "Ongkir",
  overDeliveryTolerance: 5,
  paymentMethod: "cash",
  tenor: 0,
  dpPercent: 0,
  orderDate: new Date(2026, 10, 2, 9, 30),
  items: [
    {
      product: 90,
      ingredient: null,
      ingredientName: "Daging Sapi",
      quantity: 2,
      price: 120000,
      unit: "kg",
      conversionToBase: 1,
      supplier: 5
    },
    {
      product: 91,
      ingredient: null,
      ingredientName: "Tulang",
      quantity: 3,
      price: 30000,
      unit: "kg",
      conversionToBase: 1,
      supplier: 5
    }
  ]
};

describe("EditPurchaseOrder — characterization", () => {
  const waitForLoaded = async () => {
    await screen.findByDisplayValue("Kirim pagi");
    await waitFor(() => expect(itemSelects()[0].value).toBe("sp-11"));
  };

  test("an unchanged pending order is sent back as loaded, without status", async () => {
    getPurchaseOrderById.mockResolvedValue({ data: loadedOrder });
    renderPage(EditPurchaseOrder);
    await waitForLoaded();
    fireEvent.click(screen.getByText("page.purchaseOrder.edit.saveChanges"));
    fireEvent.click(await screen.findByText("common.yes"));
    await waitFor(() => expect(editPurchaseOrder).toHaveBeenCalledTimes(1));
    expect(editPurchaseOrder.mock.calls[0][0]).toBe("60");
    expect(editPurchaseOrder.mock.calls[0][1]).toEqual(loadedPayload);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/purchase-order"));
  });

  test("saving a loaded draft as final activates it", async () => {
    getPurchaseOrderById.mockResolvedValue({ data: { ...loadedOrder, status: "draft" } });
    renderPage(EditPurchaseOrder);
    await waitForLoaded();
    fireEvent.click(screen.getByText("page.purchaseOrder.edit.saveChanges"));
    fireEvent.click(await screen.findByText("common.yes"));
    await waitFor(() => expect(editPurchaseOrder).toHaveBeenCalledTimes(1));
    expect(editPurchaseOrder.mock.calls[0][1].status).toBe("pending");
  });

  test("a changed quantity is sent", async () => {
    getPurchaseOrderById.mockResolvedValue({ data: loadedOrder });
    renderPage(EditPurchaseOrder);
    await waitForLoaded();
    type(qtyInputs()[1], "4");
    fireEvent.click(screen.getByText("page.purchaseOrder.edit.saveChanges"));
    fireEvent.click(await screen.findByText("common.yes"));
    await waitFor(() => expect(editPurchaseOrder).toHaveBeenCalledTimes(1));
    expect(editPurchaseOrder.mock.calls[0][1].items[1].quantity).toBe(4);
  });

  test("money fields are locked once goods were received", async () => {
    getPurchaseOrderById.mockResolvedValue({
      data: {
        ...loadedOrder,
        items: [{ ...loadedOrder.items[0], receivedQuantity: 1 }, loadedOrder.items[1]]
      }
    });
    renderPage(EditPurchaseOrder);
    await waitForLoaded();
    expect(document.getElementById("edit-purchase-order-discount")).toBeDisabled();
    expect(document.getElementById("edit-purchase-order-tax-rate")).toBeDisabled();
    expect(document.getElementById("edit-purchase-order-additional-cost")).toBeDisabled();
  });
});

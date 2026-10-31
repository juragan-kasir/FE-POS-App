import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddGoodsRequest from "../page/goods-request/AddGoodsRequest";
import EditGoodsRequest from "../page/goods-request/EditGoodsRequest";
import { addGoodsRequest, editGoodsRequest, getGoodsRequestById } from "../services/goods-request";

// UX audit #12 (goods-request pair), step A: pins down what Tambah and Edit
// Permintaan Barang send and refuse, before the two forms are brought
// together. These must pass unchanged after that.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("id=11"), jest.fn()]
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 1, fullName: "Admin" } }]
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: undefined, isLoading: false })
}));
jest.mock("@/services/goods-request", () => ({
  addGoodsRequest: jest.fn(),
  editGoodsRequest: jest.fn(),
  getGoodsRequestById: jest.fn()
}));
jest.mock("@/services/supplier", () => ({
  getAllSupplier: jest.fn(() =>
    Promise.resolve({
      data: [
        {
          id: 5,
          name: "PT Daging Segar",
          status: "active",
          products: [{ id: 21, name: "Daging Sapi", unit: "kg", productId: null }]
        }
      ]
    })
  )
}));
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ id, options, onChange, placeholder }) {
    return (
      <div data-testid={id || placeholder}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
}));
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: function DatePickerStub({ id, date, setDate }) {
    return (
      <input
        data-testid={id}
        value={
          date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
                date.getDate()
              ).padStart(2, "0")}`
            : ""
        }
        onChange={(e) => setDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
      />
    );
  }
}));
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

const setDate = (id, value) => fireEvent.change(screen.getByTestId(id), { target: { value } });

beforeEach(() => {
  jest.clearAllMocks();
  addGoodsRequest.mockResolvedValue({ data: { id: 30 } });
  editGoodsRequest.mockResolvedValue({ data: { id: 11 } });
});

describe("AddGoodsRequest — characterization", () => {
  const fillOneItem = async () => {
    const supplierBox = await screen.findByTestId("goods-request-group-0-supplier");
    fireEvent.click(await within(supplierBox).findByText("PT Daging Segar"));
    fireEvent.click(await screen.findByText("Daging Sapi"));
    const qty = screen.getAllByPlaceholderText("0")[0];
    fireEvent.change(qty, { target: { value: "5" } });
  };

  test("a request with one item is sent with these fields", async () => {
    renderPage(AddGoodsRequest);
    setDate("goods-request-date", "2026-11-01");
    setDate("goods-request-needed-date", "2026-11-03");
    await fillOneItem();
    fireEvent.click(screen.getByText("page.goodsRequest.add.form.save"));
    fireEvent.click(await screen.findByText("page.goodsRequest.add.confirmModal.confirm"));
    await waitFor(() => expect(addGoodsRequest).toHaveBeenCalledTimes(1));
    expect(addGoodsRequest.mock.calls[0][0]).toEqual({
      store: 1,
      requestedBy: "",
      requestDate: "2026-11-01",
      neededDate: "2026-11-03",
      notes: "",
      // A supplier catalog item is sent by name; the supplier id goes as
      // the string the form holds.
      items: [
        {
          ingredient: null,
          ingredientName: "Daging Sapi",
          product: null,
          productName: null,
          supplier: "5",
          qty: 5,
          unit: "kg",
          notes: null
        }
      ]
    });
  });

  test("without a needed date nothing is sent", async () => {
    renderPage(AddGoodsRequest);
    await fillOneItem();
    fireEvent.click(screen.getByText("page.goodsRequest.add.form.save"));
    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen.queryByText("page.goodsRequest.add.confirmModal.confirm")
    ).not.toBeInTheDocument();
    expect(addGoodsRequest).not.toHaveBeenCalled();
  });

  test("a needed date before the request date is refused", async () => {
    renderPage(AddGoodsRequest);
    setDate("goods-request-date", "2026-11-05");
    setDate("goods-request-needed-date", "2026-11-03");
    await fillOneItem();
    fireEvent.click(screen.getByText("page.goodsRequest.add.form.save"));
    await new Promise((r) => setTimeout(r, 50));
    expect(addGoodsRequest).not.toHaveBeenCalled();
  });
});

describe("EditGoodsRequest — characterization", () => {
  const seeded = {
    id: 11,
    store: 1,
    requestedBy: "Andi",
    requestDate: "2026-11-01",
    neededDate: "2026-11-03",
    notes: "Untuk akhir pekan",
    status: "pending",
    items: [
      {
        ingredient: null,
        ingredientName: "Daging Sapi",
        product: null,
        productName: null,
        supplier: 5,
        qty: 5,
        unit: "kg",
        notes: ""
      }
    ]
  };

  const saveEdit = async () => {
    fireEvent.click(screen.getByText("page.goodsRequest.edit.form.save"));
    fireEvent.click(await screen.findByText("page.goodsRequest.edit.confirmModal.confirm"));
  };

  test("an unchanged request is sent back as loaded", async () => {
    getGoodsRequestById.mockResolvedValue({ data: seeded });
    renderPage(EditGoodsRequest);
    await screen.findByDisplayValue("Andi");
    await saveEdit();
    await waitFor(() => expect(editGoodsRequest).toHaveBeenCalledTimes(1));
    const [id, payload] = editGoodsRequest.mock.calls[0];
    expect(String(id)).toBe("11");
    expect(payload).toEqual({
      requestedBy: "Andi",
      requestDate: "2026-11-01",
      neededDate: "2026-11-03",
      notes: "Untuk akhir pekan",
      items: [
        {
          ingredient: null,
          ingredientName: "Daging Sapi",
          product: null,
          productName: null,
          supplier: 5,
          qty: 5,
          unit: "kg",
          notes: null
        }
      ]
    });
  });

  test("a needed date before the request date is refused", async () => {
    getGoodsRequestById.mockResolvedValue({ data: seeded });
    renderPage(EditGoodsRequest);
    await screen.findByDisplayValue("Andi");
    setDate("edit-goods-request-needed-date", "2026-10-30");
    await saveEdit();
    await new Promise((r) => setTimeout(r, 50));
    expect(editGoodsRequest).not.toHaveBeenCalled();
  });
});

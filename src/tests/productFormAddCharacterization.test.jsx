import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddProduct from "../page/product/AddProduct";
import { addProduct } from "../services/product";
import { getAllLocation } from "../services/location";

// UX audit #12, step A: pins down what Tambah Produk sends and how it
// guides the user, before AddProduct/EditProduct are merged into one form.
// These tests must pass unchanged after that refactor.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(""), jest.fn()]
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));
let mockUser = { id: 42, roleType: "super_admin", store: null };
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: mockUser }]
}));
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(() => Promise.resolve({ data: [] })),
  addIngredient: jest.fn()
}));
jest.mock("@/services/product", () => ({
  addProduct: jest.fn(),
  getIngredients: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/stock", () => ({
  checkStockOpnameExists: jest.fn(() => Promise.resolve({ data: { exists: true } }))
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [{ id: 7, name: "Toko A" }] }))
}));
jest.mock("@/services/tax-config", () => ({
  getAllTaxConfig: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [{ id: 5, name: "Minuman" }] }))
}));
jest.mock("@/hooks/useUnsavedChanges", () => ({ useUnsavedChanges: jest.fn() }));
jest.mock(
  "@/components/organism/UserGuide",
  () =>
    function UserGuideStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/organism/MissingFieldsModal",
  () =>
    function MissingFieldsModalStub({ open, fields }) {
      return open ? <div data-testid="missing-fields">{fields.join(",")}</div> : null;
    }
);
jest.mock(
  "../page/product/ProductPreview",
  () =>
    function ProductPreviewStub() {
      return null;
    }
);
jest.mock(
  "@/components/organism/ProductImageGallery",
  () =>
    function ProductImageGalleryStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/organism/StoreSelectCard",
  () =>
    function StoreSelectCardStub({ onChange }) {
      return (
        <button type="button" onClick={() => onChange([7])}>
          pick-store-7
        </button>
      );
    }
);
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ options, value, onChange, placeholder }) {
    return (
      <div data-testid={placeholder} data-field-value={value ?? ""}>
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AddProduct />
    </QueryClientProvider>
  );
};

const fillStep1 = async ({ store = true } = {}) => {
  if (store) fireEvent.click(screen.getByText("pick-store-7"));
  fireEvent.change(screen.getByPlaceholderText("page.product.form.namePlaceholder"), {
    target: { value: "Es Teh" }
  });
  fireEvent.click(await screen.findByText("Minuman"));
  await waitFor(() =>
    expect(screen.getByTestId("page.product.form.categoryPlaceholder")).toHaveAttribute(
      "data-field-value",
      "5"
    )
  );
};

const toLastStep = async () => {
  fireEvent.click(screen.getByText("page.product.form.next"));
  // The price label isn't bound to its input (no FormControl), so find the
  // input inside the label's form item.
  const label = await screen.findByText(/^page\.product\.form\.price/, { selector: "label" });
  const price = label.parentElement.querySelector("input");
  fireEvent.change(price, { target: { value: "15000" } });
  fireEvent.click(screen.getByText("page.product.form.next"));
  return screen.findByText("page.product.form.save");
};

const sent = () => {
  const payload = addProduct.mock.calls.at(-1)[0];
  return payload instanceof FormData ? Object.fromEntries(payload.entries()) : payload;
};

describe("AddProduct — characterization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addProduct.mockResolvedValue({ data: { id: 99 } });
    getAllLocation.mockResolvedValue({ data: [{ id: 7, name: "Toko A" }] });
    mockUser = { id: 42, roleType: "super_admin", store: null };
  });

  test("a complete product is sent with these fields, then offers its detail page", async () => {
    renderPage();
    await fillStep1();
    fireEvent.click(await toLastStep());
    fireEvent.click(await screen.findByText("page.product.form.saveConfirm"));
    await waitFor(() => expect(addProduct).toHaveBeenCalledTimes(1));

    expect(sent()).toMatchObject({
      nameProduct: "Es Teh",
      category: "5",
      stores: JSON.stringify([7]),
      price: "15000",
      status: "active",
      tipeProduk: "menu",
      inventoryMode: "stocked",
      unit: "pcs",
      baseUnit: "pcs",
      conversionFactor: "1",
      isAvailable: "true",
      isOption: "false",
      hasModifiers: "false",
      options: "[]",
      modifiers: "[]",
      priceTiers: "[]",
      createdBy: "42"
    });

    fireEvent.click(await screen.findByText("common.viewDetail"));
    expect(mockNavigate).toHaveBeenCalledWith("/detail-product/99");
  });

  test("next is refused while step 1 is incomplete", async () => {
    renderPage();
    fireEvent.click(screen.getByText("page.product.form.next"));
    expect(
      screen.queryByText(/^page\.product\.form\.price/, { selector: "label" })
    ).not.toBeInTheDocument();
  });

  test("a super admin starts on Semua Toko, which saves every visible store", async () => {
    getAllLocation.mockResolvedValue({
      data: [
        { id: 7, name: "Toko A" },
        { id: 8, name: "Toko B" }
      ]
    });
    renderPage();
    await fillStep1({ store: false });
    fireEvent.click(await toLastStep());
    fireEvent.click(await screen.findByText("page.product.form.saveConfirm"));
    await waitFor(() => expect(addProduct).toHaveBeenCalledTimes(1));
    expect(sent().stores).toBe(JSON.stringify([7, 8]));
  });

  test("an account without a store gets the store listed as missing, and nothing is sent", async () => {
    mockUser = { id: 43, roleType: "admin", store: null };
    renderPage();
    await fillStep1({ store: false });
    fireEvent.click(await toLastStep());
    expect(await screen.findByTestId("missing-fields")).toBeInTheDocument();
    expect(addProduct).not.toHaveBeenCalled();
  });

  test("a draft is sent with status draft", async () => {
    renderPage();
    await fillStep1();
    fireEvent.click(screen.getByText("page.product.form.saveDraft"));
    fireEvent.click(await screen.findByText("page.product.form.saveDraftConfirm"));
    await waitFor(() => expect(addProduct).toHaveBeenCalledTimes(1));
    expect(sent()).toMatchObject({ nameProduct: "Es Teh", status: "draft" });
  });

  test("conversion factor: editable for different units, back to 1 for the same unit", async () => {
    renderPage();
    // The optional-info section (units live there) opens from an icon button.
    const heading = screen.getByText("page.product.form.optionalInfo");
    fireEvent.click(
      heading.closest("div.flex.items-center.justify-between").querySelector("button")
    );
    const factorLabel = await screen.findByText("page.product.form.conversionFactor");
    const factor = () => factorLabel.parentElement.querySelector("input");
    expect(factor()).toBeDisabled();
    expect(factor()).toHaveValue(1);

    fireEvent.click(screen.getByText("page.product.form.baseUnitGram"));
    await waitFor(() => expect(factor()).not.toBeDisabled());
    fireEvent.change(factor(), { target: { value: "24" } });
    expect(factor()).toHaveValue(24);

    fireEvent.click(screen.getByText("page.product.form.baseUnitPcs"));
    await waitFor(() => expect(factor()).toBeDisabled());
    await waitFor(() => expect(factor()).toHaveValue(1));
  });
});

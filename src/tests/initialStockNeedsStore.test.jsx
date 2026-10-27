import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddProduct from "../page/product/AddProduct";
import { addProduct } from "@/services/product";
import { initialStockNeedsStore, usesProductStock } from "@/lib/inventory-mode";

// jsdom lacks ResizeObserver; Radix popover/use-size mounts one on step 3.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;

// BA finding #2 (Waroeng Bakso dummy, 2026-10-17): a product saved with an
// initial stock and no store ("Semua Toko") stranded the number — every
// outlet view reads the outlet's own stock row (0 without one), so the list
// showed 0 and the sale was refused while the edit form still showed the
// value. The form (and the API) now require a specific store for an opening
// stock unless the product does not use its own stock (make_to_order).

describe("initialStockNeedsStore", () => {
  test("stocked/hybrid product with stock and no store needs one", () => {
    expect(initialStockNeedsStore({ stock: 100, inventoryMode: "stocked" }, [])).toBe(true);
    expect(initialStockNeedsStore({ stock: "100", inventoryMode: "stocked" }, [])).toBe(true);
    expect(initialStockNeedsStore({ stock: 100, inventoryMode: "hybrid" }, [])).toBe(true);
    expect(initialStockNeedsStore({ stock: 100 }, [])).toBe(true); // default mode is stocked
  });

  test("no stock or a specific store is fine", () => {
    expect(initialStockNeedsStore({ stock: 0, inventoryMode: "stocked" }, [])).toBe(false);
    expect(initialStockNeedsStore({ stock: "", inventoryMode: "stocked" }, [])).toBe(false);
    expect(initialStockNeedsStore({ stock: 100, inventoryMode: "stocked" }, ["A1"])).toBe(false);
  });

  test("make_to_order does not use product stock — never needs a store", () => {
    expect(initialStockNeedsStore({ stock: 100, inventoryMode: "make_to_order" }, [])).toBe(false);
    expect(usesProductStock({ inventoryMode: "make_to_order" })).toBe(false);
  });
});

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams(""), jest.fn()]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { roleType: "super_admin" } }]
}));

// The product form's inventory-item picker (BRD phase 3) loads ingredients.
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(() => Promise.resolve({ data: [] })),
  addIngredient: jest.fn()
}));
jest.mock("@/services/product", () => ({
  addProduct: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
  getIngredients: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/stock", () => ({
  checkStockOpnameExists: jest.fn(() => Promise.resolve({ data: { exists: true } }))
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/tax-config", () => ({
  getAllTaxConfig: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [{ id: 5, name: "Drinks" }] }))
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
    function MissingFieldsModalStub() {
      return null;
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
        <div>
          <button type="button" onClick={() => onChange(["A1"])}>
            pick-store-A
          </button>
        </div>
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AddProduct />
    </QueryClientProvider>
  );
};

// Drive the wizard to the final save-confirmation click. Every field the
// save gate requires (name, category, price) is filled; stock is passed by
// the caller. The store card stub exposes a "pick-store-A" button, standing
// in for the real store picker; without clicking it the form stays on
// "Semua Toko" (empty selectedStores), which is exactly the BA's case.
// The form's inputs are not htmlFor-associated with their labels (no
// FormControl in these FormItems), so getByLabelText cannot find them. The
// label's direct text node is the i18n key; walk to the FormItem and take
// its input instead.
const fieldInput = (label) => {
  const labelEl = screen.getByText(label);
  const item = labelEl.closest("div.space-y-2") || labelEl.parentElement;
  const input = item.querySelector("input");
  if (!input) throw new Error(`No input found for ${label}`);
  return input;
};

const saveWithStock = async (stock) => {
  renderPage();

  fireEvent.change(screen.getByPlaceholderText("page.product.form.namePlaceholder"), {
    target: { value: "Bakso Uji" }
  });
  fireEvent.click(await screen.findByText("Drinks"));

  // Step 1 → 2
  fireEvent.click(screen.getByText("page.product.form.next"));

  fireEvent.change(fieldInput("page.product.form.price"), {
    target: { value: "15000" }
  });
  if (stock !== undefined) {
    fireEvent.change(fieldInput("page.product.form.stock"), {
      target: { value: String(stock) }
    });
  }

  // Step 2 → 3
  fireEvent.click(screen.getByText("page.product.form.next"));

  // Save → confirm modal → confirm
  fireEvent.click(screen.getByText("page.product.form.save"));
  fireEvent.click(await screen.findByText("page.product.form.saveConfirm"));
};

describe("AddProduct — opening stock requires a specific store", () => {
  beforeEach(() => {
    addProduct.mockClear();
  });

  test("stock on 'Semua Toko' is blocked with a field error and nothing is sent", async () => {
    await saveWithStock(100);

    expect(await screen.findByText("page.product.form.stockRequiresStore")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(addProduct).not.toHaveBeenCalled();
  });

  test("no stock on 'Semua Toko' still saves (global catalog product)", async () => {
    await saveWithStock("");

    await waitFor(() => expect(addProduct).toHaveBeenCalledTimes(1));
  });

  test("stock with a specific store saves", async () => {
    renderPage();

    fireEvent.click(screen.getByText("pick-store-A"));
    fireEvent.change(screen.getByPlaceholderText("page.product.form.namePlaceholder"), {
      target: { value: "Bakso Uji" }
    });
    fireEvent.click(await screen.findByText("Drinks"));
    fireEvent.click(screen.getByText("page.product.form.next"));
    fireEvent.change(fieldInput("page.product.form.price"), {
      target: { value: "15000" }
    });
    fireEvent.change(fieldInput("page.product.form.stock"), {
      target: { value: "100" }
    });
    fireEvent.click(screen.getByText("page.product.form.next"));
    fireEvent.click(screen.getByText("page.product.form.save"));
    fireEvent.click(await screen.findByText("page.product.form.saveConfirm"));

    await waitFor(() => expect(addProduct).toHaveBeenCalledTimes(1));
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import EditProduct from "../page/product/EditProduct";
import { getProductById } from "../services/product";
import { getAllCategoryActive } from "../services/category";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("id=1"), jest.fn()]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "super_admin", store: "A1" } }]
}));

const seededProduct = {
  id: 1,
  nameProduct: "Kopi",
  category: 5,
  price: 20000,
  costPrice: 10000,
  stock: 10,
  minStock: 0,
  unit: "pcs",
  baseUnit: "pcs",
  conversionFactor: 1,
  status: "active",
  isAvailable: true,
  isOption: false,
  hasModifiers: false,
  store: ["A1"],
  images: [],
  image: null,
  composition: [],
  options: [],
  modifiers: [],
  priceTiers: []
};

// The product form's inventory-item picker (BRD phase 3) loads ingredients.
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(() => Promise.resolve({ data: [] })),
  addIngredient: jest.fn()
}));
jest.mock("@/services/product", () => ({
  getProductById: jest.fn(),
  editProduct: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
  getIngredients: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/category", () => ({
  getAllCategoryActive: jest.fn()
}));
jest.mock("@/services/tax-config", () => ({
  getAllTaxConfig: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() =>
    Promise.resolve({
      data: [
        { id: "A1", name: "Toko A" },
        { id: "B1", name: "Toko B" }
      ]
    })
  )
}));
jest.mock("@/services/price-store", () => ({
  getProductPriceByStore: jest.fn(() => Promise.resolve({ data: { storePrices: [] } })),
  updateProductPriceByStore: jest.fn()
}));
jest.mock("@/services/stock", () => ({
  checkStockOpnameExists: jest.fn(() => Promise.resolve({ data: { exists: true } }))
}));
jest.mock("@/services/bom", () => ({
  getBomByProduct: jest.fn(() => Promise.resolve(null))
}));
jest.mock(
  "@/components/organism/UserGuide",
  () =>
    function UserGuideStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/organism/abort-controller",
  () =>
    function AbortControllerStub() {
      return <div />;
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

// A minimal controllable stub: exposes buttons that call onChange with a
// specific store array, standing in for the real store-picker UI.
jest.mock(
  "@/components/organism/StoreSelectCard",
  () =>
    function StoreSelectCardStub({ onChange }) {
      return (
        <div>
          <button type="button" onClick={() => onChange(["A1"])}>
            pick-store-A
          </button>
          <button type="button" onClick={() => onChange(["B1"])}>
            pick-store-B
          </button>
        </div>
      );
    }
);

// Exposes react-hook-form's real `field.value` via a data attribute so the
// test observes the actual form state, not a native <select>'s own
// auto-blanking (which would coincidentally look "reset" even if the
// underlying field value still silently held the stale id).
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
      <EditProduct />
    </QueryClientProvider>
  );
  return queryClient;
};

// Regression coverage for the EditProduct counterpart of the AddProduct
// store/category desync bug (see addProductStoreSwitch.test.jsx). AddProduct
// clears `category`/`composition` when the selected store changes
// (prevFirstStoreRef guard); EditProduct never got the equivalent fix, so a
// super-admin switching a product's store mid-edit keeps the OLD store's
// category id in the submitted payload even though it does not exist for
// the new store.
describe("EditProduct — category selection resets on store switch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProductById.mockResolvedValue({ data: seededProduct });
    getAllCategoryActive.mockImplementation(({ location }) => {
      if (location === "A1") {
        return Promise.resolve({ data: [{ id: 5, name: "Drinks (Store A)" }] });
      }
      if (location === "B1") {
        return Promise.resolve({ data: [{ id: 9, name: "Snacks (Store B)" }] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  test("switching store clears a category loaded for the previous store", async () => {
    renderPage();

    await screen.findByDisplayValue("Kopi");

    // Product loaded with category 5, tied to Store A.
    await waitFor(() =>
      expect(screen.getByTestId("page.product.form.categoryPlaceholder")).toHaveAttribute(
        "data-field-value",
        "5"
      )
    );

    // Switch the product to Store B.
    fireEvent.click(screen.getByText("pick-store-B"));
    await waitFor(() => expect(screen.getByText("Snacks (Store B)")).toBeInTheDocument());

    // Store A's category id must not survive the switch to Store B.
    await waitFor(() =>
      expect(screen.getByTestId("page.product.form.categoryPlaceholder")).toHaveAttribute(
        "data-field-value",
        ""
      )
    );
  });
});

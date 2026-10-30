import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import EditProduct from "../page/product/EditProduct";
import { getProductById, editProduct } from "../services/product";
import { getProductPriceByStore } from "../services/price-store";

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
  useCookies: () => [{ user: { id: 1, roleType: "super_admin", store: "1" } }]
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
  store: ["1"],
  images: [],
  image: null,
  composition: [],
  options: [],
  modifiers: [],
  priceTiers: []
};

// Single-store account (bakso_admin in production): one visible store.
// The product form's inventory-item picker (BRD phase 3) loads ingredients.
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(() => Promise.resolve({ data: [] })),
  addIngredient: jest.fn()
}));
jest.mock("@/services/product", () => ({
  getProductById: jest.fn(),
  editProduct: jest.fn(),
  getIngredients: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [{ id: 5, name: "Drinks" }] }))
}));
jest.mock("@/services/tax-config", () => ({
  getAllTaxConfig: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() =>
    Promise.resolve({
      data: [{ id: 1, name: "Toko A" }]
    })
  )
}));
jest.mock("@/services/price-store", () => ({
  getProductPriceByStore: jest.fn(),
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
  "@/components/organism/StoreSelectCard",
  () =>
    function StoreSelectCardStub({ onChange, onAllStoresChange }) {
      return (
        <div>
          <button type="button" onClick={() => onAllStoresChange(true)}>
            pick-all-stores
          </button>
          <button type="button" onClick={() => onChange([1])}>
            pick-store-1
          </button>
        </div>
      );
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

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <EditProduct />
    </QueryClientProvider>
  );
};

const sent = () => {
  const p = editProduct.mock.calls.at(-1)[0];
  return p instanceof FormData ? Object.fromEntries(p.entries()) : p;
};

const renameAndSave = async () => {
  fireEvent.change(await screen.findByDisplayValue("Kopi"), { target: { value: "Kopi Susu" } });
  fireEvent.click(screen.getByText("page.product.form.next"));
  fireEvent.click(await screen.findByText("page.product.form.next"));
  fireEvent.click(await screen.findByText("page.product.form.saveEdit"));
  fireEvent.click(await screen.findByText("common.yesSave"));
  await waitFor(() => expect(editProduct).toHaveBeenCalledTimes(1));
  return sent();
};

const fieldInput = (labelKey) =>
  screen
    .getByText(new RegExp(`^${labelKey.replace(/\./g, "\\.")}`), { selector: "label" })
    .parentElement.querySelector("input");

// UX audit #12, step A: pins down how Edit Produk loads a product and what it
// sends back, before AddProduct/EditProduct are merged into one form. These
// tests must pass unchanged after that refactor. (Store handling on save is
// pinned in productStoreAssignment.test.jsx.)
describe("EditProduct — characterization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProductPriceByStore.mockResolvedValue({ data: { storePrices: [] } });
    editProduct.mockResolvedValue({ data: { id: 1 } });
  });

  test("loads the product's values into the form", async () => {
    getProductById.mockResolvedValue({ data: seededProduct });
    renderPage();
    expect(await screen.findByDisplayValue("Kopi")).toBeInTheDocument();
    fireEvent.click(screen.getByText("page.product.form.next"));
    await screen.findByText(/^page\.product\.form\.price/, { selector: "label" });
    expect(fieldInput("page.product.form.price")).toHaveValue("20.000");
  });

  test("a rename sends the loaded values back with the new name", async () => {
    getProductById.mockResolvedValue({ data: seededProduct });
    renderPage();
    const payload = await renameAndSave();
    expect(payload).toMatchObject({
      id: "1",
      nameProduct: "Kopi Susu",
      category: "5",
      price: "20000",
      costPrice: "10000",
      stock: "10",
      minStock: "0",
      inventoryMode: "stocked",
      unit: "pcs",
      baseUnit: "pcs",
      conversionFactor: "1",
      status: "active",
      isAvailable: "true",
      tipeProduk: "menu",
      isOption: "false",
      hasModifiers: "false",
      options: "[]",
      modifiers: "[]",
      priceTiers: "[]",
      modifiedBy: "1"
    });
    expect(payload.stores).toBeUndefined();
  });

  test("variants, add-ons and price tiers survive an edit unchanged", async () => {
    const options = [{ name: "Ukuran", options: [{ name: "L", price: 2000 }] }];
    const modifiers = [{ name: "Es", price: 1000 }];
    const priceTiers = [{ minQty: 10, price: 18000 }];
    getProductById.mockResolvedValue({
      data: { ...seededProduct, isOption: true, hasModifiers: true, options, modifiers, priceTiers }
    });
    renderPage();
    const payload = await renameAndSave();
    expect(payload).toMatchObject({ isOption: "true", hasModifiers: "true" });
    expect(JSON.parse(payload.options)).toEqual(options);
    expect(JSON.parse(payload.modifiers)).toEqual(modifiers);
    expect(JSON.parse(payload.priceTiers)).toEqual(priceTiers);
  });
});

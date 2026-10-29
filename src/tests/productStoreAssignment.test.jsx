import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import EditProduct from "../page/product/EditProduct";
import { getProductById, editProduct } from "../services/product";
import { getProductPriceByStore } from "../services/price-store";
import { storesForSave } from "../lib/product-stores";

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
  return queryClient;
};

const save = async () => {
  await screen.findByDisplayValue("Kopi");
  fireEvent.change(screen.getByDisplayValue("Kopi"), { target: { value: "Kopi Susu" } });
  fireEvent.click(screen.getByText("page.product.form.next"));
  fireEvent.click(await screen.findByText("page.product.form.next"));
  fireEvent.click(await screen.findByText("page.product.form.saveEdit"));
  fireEvent.click(await screen.findByText("common.yesSave"));
  await waitFor(() => expect(editProduct).toHaveBeenCalled());
  return editProduct.mock.calls.at(-1)[0];
};
const sentStores = (payload) =>
  payload instanceof FormData ? payload.get("stores") : payload.stores;

// Production 10-29: bakso_admin (one store) renamed a product and got "a
// sellable product must be assigned to at least one store of one tenant" —
// a product with no store rows read as "Semua Toko" and was saved with an
// empty store list.
describe("EditProduct — store assignment on save", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProductPriceByStore.mockResolvedValue({ data: { storePrices: [] } });
    editProduct.mockResolvedValue({ data: { id: 1 } });
  });

  test("renaming a product with no store rows leaves its stores alone", async () => {
    getProductById.mockResolvedValue({ data: { ...seededProduct, store: [] } });
    renderPage();
    const payload = await save();
    expect(sentStores(payload)).toBeNull();
  });

  test("renaming a store-assigned product doesn't resend its stores", async () => {
    getProductById.mockResolvedValue({ data: seededProduct });
    renderPage();
    expect(sentStores(await save())).toBeNull();
  });

  test('choosing "Semua Toko" saves every visible store, never an empty list', async () => {
    getProductById.mockResolvedValue({ data: seededProduct });
    renderPage();
    await screen.findByDisplayValue("Kopi");
    fireEvent.click(screen.getByText("pick-all-stores"));
    expect(sentStores(await save())).toBe(JSON.stringify([1]));
  });
});

describe("storesForSave", () => {
  test('"Semua Toko" means the visible stores; a pick is kept as is', () => {
    const locations = [{ id: 1 }, { id: 2 }];
    expect(storesForSave({ allStores: true, selectedStores: [], locations })).toEqual([1, 2]);
    expect(storesForSave({ allStores: false, selectedStores: [2], locations })).toEqual([2]);
    expect(
      storesForSave({ allStores: true, selectedStores: [], locations: [], userStore: 7 })
    ).toEqual([7]);
  });
});

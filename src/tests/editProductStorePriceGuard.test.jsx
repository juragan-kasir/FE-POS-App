import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import EditProduct from "../page/product/EditProduct";
import { getProductById, editProduct } from "../services/product";
import { getProductPriceByStore, updateProductPriceByStore } from "../services/price-store";

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
      data: [
        { id: 1, name: "Toko A" },
        { id: 2, name: "Toko B" }
      ]
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
    function StoreSelectCardStub() {
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

// Regression coverage for Phase 9 P1 finding F9-25. The main "Save" button
// sent only the general product payload — the per-store price section edits
// live in local state and went to the backend only via each row's own Save
// button — so a user editing a store price and then saving the product saw
// that store price silently discarded. Reverting the guard in handleSave
// makes this test fail (editProduct is called and no warning appears).
describe("EditProduct — store prices are not silently lost on main save (F9-25)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProductById.mockResolvedValue({ data: seededProduct });
    getProductPriceByStore.mockResolvedValue({
      data: {
        storePrices: [
          { storeId: "1", storeName: "Toko A", price: "25000" },
          { storeId: "2", storeName: "Toko B", price: "26000" }
        ]
      }
    });
    updateProductPriceByStore.mockResolvedValue({ data: { success: true } });
    editProduct.mockResolvedValue({ data: { id: 1 } });
  });

  test("main save without editing store prices proceeds without a dirty warning", async () => {
    renderPage();
    await screen.findByDisplayValue("Kopi");

    fireEvent.click(screen.getByText("page.product.form.next"));
    fireEvent.click(await screen.findByText("page.product.form.next"));
    fireEvent.click(await screen.findByText("page.product.form.saveEdit"));
    fireEvent.click(await screen.findByText("common.yesSave"));

    await waitFor(() => expect(editProduct).toHaveBeenCalled());
  });

  test("main save with an unsaved store-price edit is blocked and warns instead of discarding", async () => {
    renderPage();
    await screen.findByDisplayValue("Kopi");

    fireEvent.click(screen.getByText("page.product.form.next"));
    const saveStoreButtons = await screen.findAllByText("page.product.form.saveStorePrice");
    const row = saveStoreButtons[0].closest("div.flex");
    const storePriceInput = within(row).getByRole("spinbutton");
    fireEvent.change(storePriceInput, { target: { value: "30000" } });

    fireEvent.click(screen.getByText("page.product.form.next"));
    fireEvent.click(await screen.findByText("page.product.form.saveEdit"));
    fireEvent.click(await screen.findByText("common.yesSave"));

    await waitFor(() =>
      expect(screen.getByText(/page\.product\.form\.unsavedStorePrices/)).toBeInTheDocument()
    );
    expect(editProduct).not.toHaveBeenCalled();
  });
});

describe("EditProduct — per-store price save speaks the canonical JSON contract (F9-25)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProductById.mockResolvedValue({ data: seededProduct });
    getProductPriceByStore.mockResolvedValue({
      data: {
        storePrices: [
          { storeId: "1", storeName: "Toko A", price: "25000" },
          { storeId: "2", storeName: "Toko B", price: "26000" }
        ]
      }
    });
    updateProductPriceByStore.mockResolvedValue({ data: { success: true } });
    editProduct.mockResolvedValue({ data: { id: 1 } });
  });

  const renderAndEditRow = async () => {
    renderPage();
    await screen.findByDisplayValue("Kopi");
    fireEvent.click(screen.getByText("page.product.form.next"));
    const saveStoreButtons = await screen.findAllByText("page.product.form.saveStorePrice");
    const row = saveStoreButtons[0].closest("div.flex");
    const storePriceInput = within(row).getByRole("spinbutton");
    fireEvent.change(storePriceInput, { target: { value: "30000" } });
    return { row };
  };

  test("saves a per-store price with the canonical JSON payload, not FormData", async () => {
    const { row } = await renderAndEditRow();
    fireEvent.click(within(row).getByText("page.product.form.saveStorePrice"));

    await waitFor(() => expect(updateProductPriceByStore).toHaveBeenCalled());
    expect(updateProductPriceByStore).toHaveBeenCalledWith({
      productId: "1",
      storePrices: [{ storeId: "1", price: "30000" }]
    });
  });

  test("a successful per-store save advances the baseline so the main save proceeds", async () => {
    let callCount = 0;
    getProductPriceByStore.mockImplementation(() => {
      callCount += 1;
      const price = callCount === 1 ? "25000" : "30000";
      return Promise.resolve({
        data: {
          storePrices: [
            { storeId: "1", storeName: "Toko A", price },
            { storeId: "2", storeName: "Toko B", price: "26000" }
          ]
        }
      });
    });
    renderPage();
    await screen.findByDisplayValue("Kopi");
    fireEvent.click(screen.getByText("page.product.form.next"));

    const saveStoreButtons = await screen.findAllByText("page.product.form.saveStorePrice");
    const row = saveStoreButtons[0].closest("div.flex");
    const storePriceInput = within(row).getByRole("spinbutton");
    fireEvent.change(storePriceInput, { target: { value: "30000" } });
    fireEvent.click(within(row).getByText("page.product.form.saveStorePrice"));

    await waitFor(() => expect(updateProductPriceByStore).toHaveBeenCalled());
    await waitFor(() => expect(callCount).toBeGreaterThan(1));

    fireEvent.click(await screen.findByText("page.product.form.next"));
    fireEvent.click(await screen.findByText("page.product.form.saveEdit"));
    fireEvent.click(await screen.findByText("common.yesSave"));

    await waitFor(() => expect(editProduct).toHaveBeenCalled());
    expect(screen.queryByText(/page\.product\.form\.unsavedStorePrices/)).not.toBeInTheDocument();
  });

  test("a failed per-store save keeps the baseline dirty so the main save stays blocked", async () => {
    updateProductPriceByStore.mockRejectedValueOnce({
      response: { data: { message: "server error" } }
    });
    const { row } = await renderAndEditRow();
    fireEvent.click(within(row).getByText("page.product.form.saveStorePrice"));

    await waitFor(() => expect(screen.getByText("common.ok")).toBeInTheDocument());
    fireEvent.click(screen.getByText("common.ok"));

    fireEvent.click(await screen.findByText("page.product.form.next"));
    fireEvent.click(await screen.findByText("page.product.form.saveEdit"));
    fireEvent.click(await screen.findByText("common.yesSave"));

    await waitFor(() =>
      expect(screen.getByText(/page\.product\.form\.unsavedStorePrices/)).toBeInTheDocument()
    );
    expect(editProduct).not.toHaveBeenCalled();
  });
});

// Production 10-30 (browser check): the server lists only stores that
// already have their own price, so a product with none showed "Memuat harga
// toko…" forever and no store could be given a price from this page.
describe("EditProduct — Harga per Toko for a product without store prices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProductById.mockResolvedValue({ data: seededProduct });
    updateProductPriceByStore.mockResolvedValue({ data: { success: true } });
    editProduct.mockResolvedValue({ data: { id: 1 } });
  });

  const openPricing = async () => {
    renderPage();
    await screen.findByDisplayValue("Kopi");
    fireEvent.click(screen.getByText("page.product.form.next"));
  };

  test("lists every store, empty, instead of loading forever; a typed price can be saved", async () => {
    getProductPriceByStore.mockResolvedValue({ data: { storePrices: [] } });
    await openPricing();

    const saveButtons = await screen.findAllByText("page.product.form.saveStorePrice");
    expect(screen.queryByText("page.product.form.loadingStorePrices")).not.toBeInTheDocument();
    expect(saveButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByText("page.product.form.storePriceUsesBase").length).toBe(
      saveButtons.length
    );

    const row = saveButtons[0].closest("div.flex");
    const save = saveButtons[0].closest("button");
    expect(save).toBeDisabled();
    fireEvent.change(within(row).getByRole("spinbutton"), { target: { value: "21000" } });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);
    await waitFor(() => expect(updateProductPriceByStore).toHaveBeenCalled());
    expect(updateProductPriceByStore.mock.calls[0][0].storePrices[0].price).toBe("21000");
  });

  test("a typed but unsaved price for such a store blocks the main save", async () => {
    getProductPriceByStore.mockResolvedValue({ data: { storePrices: [] } });
    await openPricing();
    const saveButtons = await screen.findAllByText("page.product.form.saveStorePrice");
    fireEvent.change(within(saveButtons[0].closest("div.flex")).getByRole("spinbutton"), {
      target: { value: "21000" }
    });
    fireEvent.click(screen.getByText("page.product.form.next"));
    fireEvent.click(await screen.findByText("page.product.form.saveEdit"));
    fireEvent.click(await screen.findByText("common.yesSave"));
    await waitFor(() =>
      expect(screen.getByText(/page\.product\.form\.unsavedStorePrices/)).toBeInTheDocument()
    );
    expect(editProduct).not.toHaveBeenCalled();
  });

  test("a failed load says so and offers a retry", async () => {
    getProductPriceByStore.mockRejectedValue(new Error("boom"));
    await openPricing();
    expect(await screen.findByText("page.product.form.storePricesLoadFailed")).toBeInTheDocument();
    getProductPriceByStore.mockResolvedValue({ data: { storePrices: [] } });
    fireEvent.click(screen.getByText("common.retry"));
    expect(await screen.findAllByText("page.product.form.saveStorePrice")).not.toHaveLength(0);
  });
});

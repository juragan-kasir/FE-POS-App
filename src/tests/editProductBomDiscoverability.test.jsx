import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import EditProduct from "../page/product/EditProduct";
import { getProductById } from "../services/product";
import { getBomByProduct } from "../services/bom";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
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
  tipeProduk: "menu",
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
jest.mock("@/services/bom", () => ({
  getBomByProduct: jest.fn()
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
  getProductPriceByStore: jest.fn(() => Promise.resolve({ data: { storePrices: [] } })),
  updateProductPriceByStore: jest.fn()
}));
jest.mock("@/services/stock", () => ({
  checkStockOpnameExists: jest.fn(() => Promise.resolve({ data: { exists: true } }))
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

// Phase 21 Batch 3 — P2: the "Komposisi" section on EditProduct now surfaces
// a discoverability affordance pointing at BOM, the system that actually
// drives ingredient stock deduction — Komposisi itself is unchanged and
// stays display/reference-only.
describe("EditProduct — BOM discoverability from the Komposisi section", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProductById.mockResolvedValue({ data: seededProduct });
  });

  test("no existing BOM: shows a create-BOM action that preselects this product", async () => {
    getBomByProduct.mockResolvedValue(null);
    renderPage();

    await screen.findByDisplayValue("Kopi");
    const createButton = await screen.findByText("page.product.form.createBom");

    fireEvent.click(createButton);
    expect(mockNavigate).toHaveBeenCalledWith("/bom/add?productId=1");
  });

  test("existing BOM: shows a manage-BOM action that links to that BOM's detail page", async () => {
    getBomByProduct.mockResolvedValue({ data: { id: 42, productId: 1 } });
    renderPage();

    await screen.findByDisplayValue("Kopi");
    const manageButton = await screen.findByText("page.product.form.manageBom");

    fireEvent.click(manageButton);
    expect(mockNavigate).toHaveBeenCalledWith("/bom/detail?id=42");
  });

  // BA finding #3: the recipe is owned by the BOM — no manual editor here.
  test("no BOM yet: says so and offers no manual composition editor", async () => {
    getBomByProduct.mockResolvedValue(null);
    renderPage();

    await screen.findByDisplayValue("Kopi");
    await waitFor(() => expect(screen.getByText("page.product.form.noBomYet")).toBeInTheDocument());
    expect(screen.queryByText("page.product.form.compositionBomNotice")).not.toBeInTheDocument();
    expect(screen.queryByText("page.product.form.addIngredient")).not.toBeInTheDocument();
  });

  test("existing BOM: shows the BOM recipe read-only, in base units", async () => {
    getProductById.mockResolvedValue({
      data: {
        ...seededProduct,
        composition: [
          { ingredientId: 7, name: "Bakso Halus", qty: 5, unit: "butir" },
          { ingredientId: 8, name: "Mie Kuning", qty: 1, unit: "porsi" }
        ]
      }
    });
    getBomByProduct.mockResolvedValue({ data: { id: 42, productId: 1 } });
    renderPage();

    await screen.findByDisplayValue("Kopi");
    expect(await screen.findByText("Bakso Halus")).toBeInTheDocument();
    expect(screen.getByText("5 butir")).toBeInTheDocument();
    expect(screen.getByText("1 porsi")).toBeInTheDocument();
    expect(screen.getByText("page.product.form.recipeFromBom")).toBeInTheDocument();
  });
});

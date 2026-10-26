import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useForm } from "react-hook-form";
import { QueryClient, QueryClientProvider } from "react-query";
import { Form } from "@/components/ui/form";
import ProductPriceCostFields from "../page/product/ProductPriceCostFields";
import AddBom from "../page/bom/AddBom";
import { addBom } from "../services/bom";
import { getAllIngredients } from "../services/ingredient";
import { getAllSupplier } from "../services/supplier";
import { effectiveHpp, pickRecipeCosting, recipeCosting } from "../lib/recipe-costing";

// BRD "Harga Modal, HPP, Resep/BOM & Stok" phase 1: a recipe product has one
// HPP — recipe cost / yield, with a status — and the product form's margin
// and food cost use it; the manual Harga Modal is only a provisional
// estimate while the recipe is incomplete.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("productId=1"), jest.fn()]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts && "value" in opts ? `${k}:${opts.value}` : k)
  })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: "1" } }]
}));
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ options, value, onChange, placeholder }) {
    return (
      <div data-testid={placeholder} data-field-value={value ?? ""}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
}));
jest.mock("@/services/bom", () => ({
  addBom: jest.fn(),
  editBom: jest.fn(),
  getBomById: jest.fn()
}));
jest.mock("@/services/product", () => ({
  getAllProduct: jest.fn(() =>
    Promise.resolve({
      data: [{ id: 1, nameProduct: "Bakso Halus", sku: "BKS-1", price: 15000, costPrice: 6000 }]
    })
  )
}));
jest.mock("@/services/ingredient", () => ({ getAllIngredients: jest.fn() }));
jest.mock("@/services/supplier", () => ({ getAllSupplier: jest.fn() }));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));

describe("recipe-costing rule (mirrors BE itemCostService)", () => {
  const ingredients = new Map([
    [1, { name: "Bakso", costPrice: 25000, conversionFactor: 25 }],
    [2, { name: "Susu", costPrice: 45600, conversionFactor: 1000 }],
    [3, { name: "Keju", costPrice: 0, conversionFactor: 1 }]
  ]);

  test("AC-03: Rp75.000 of ingredients for 10 portions → Rp7.500 a portion", () => {
    expect(
      recipeCosting({
        lines: [{ ingredientId: 1, qty: 75 }],
        ingredientById: ingredients,
        yieldQty: 10,
        price: 15000
      })
    ).toMatchObject({
      status: "auto",
      recipeTotalCost: 75000,
      hppPerPortion: 7500,
      foodCostPercent: 50,
      marginPercent: 50,
      grossProfit: 7500
    });
  });

  test("AC-04: milk Rp45.600 / 1.000 ml, 100 ml → Rp4.560", () => {
    expect(
      recipeCosting({ lines: [{ ingredientId: 2, qty: 100 }], ingredientById: ingredients })
        .hppPerPortion
    ).toBe(4560);
  });

  test("AC-02: incomplete recipe → provisional with an estimate, unavailable without", () => {
    const lines = [
      { ingredientId: 1, qty: 5 },
      { ingredientId: 3, qty: 20 }
    ];
    expect(recipeCosting({ lines, ingredientById: ingredients, estimate: 6000 })).toMatchObject({
      status: "provisional",
      hppPerPortion: 6000,
      missingCost: [{ ingredientId: 3, name: "Keju" }]
    });
    expect(recipeCosting({ lines, ingredientById: ingredients }).status).toBe("unavailable");
  });

  test("effectiveHpp: stocked uses Harga Modal, recipe modes use the complete recipe", () => {
    const recipe = { status: "auto", hppPerPortion: 7500 };
    expect(effectiveHpp({ inventoryMode: "stocked", costPrice: 6000, recipe })).toEqual({
      hpp: 6000,
      status: "auto"
    });
    expect(effectiveHpp({ inventoryMode: "make_to_order", costPrice: 6000, recipe })).toEqual({
      hpp: 7500,
      status: "auto"
    });
    expect(
      effectiveHpp({
        inventoryMode: "make_to_order",
        costPrice: 6000,
        recipe: { status: "unavailable" }
      })
    ).toEqual({ hpp: 6000, status: "provisional" });
    expect(effectiveHpp({ inventoryMode: "hybrid", costPrice: "", recipe: null })).toEqual({
      hpp: null,
      status: "unavailable"
    });
  });

  test("pickRecipeCosting picks the outlet's recipe, or the only one", () => {
    const costing = { recipes: [{ store: 1 }, { store: 2 }] };
    expect(pickRecipeCosting(costing, "2")).toEqual({ store: 2 });
    expect(pickRecipeCosting(costing, null)).toBeNull();
    expect(pickRecipeCosting({ recipes: [{ store: 5 }] }, null)).toEqual({ store: 5 });
  });
});

const PriceCostHarness = ({ defaults, costing, storeId }) => {
  const form = useForm({ defaultValues: defaults });
  return (
    <Form {...form}>
      <ProductPriceCostFields form={form} costing={costing} storeId={storeId} />
    </Form>
  );
};

describe("ProductPriceCostFields — one HPP behind margin and food cost", () => {
  const autoRecipe = {
    bomId: 9,
    store: 1,
    storeName: "Pusat",
    status: "auto",
    yieldQty: 10,
    recipeTotalCost: 75000,
    hppPerPortion: 7500,
    foodCostPercent: 50,
    marginPercent: 50,
    grossProfit: 7500,
    missingCost: []
  };

  test("BRD §8.1: a recipe product shows margin 50 % from the recipe, not 60 % from Harga Modal", () => {
    render(
      <PriceCostHarness
        defaults={{ price: 15000, costPrice: 6000, inventoryMode: "make_to_order" }}
        costing={{ recipes: [autoRecipe] }}
        storeId={1}
      />
    );
    expect(screen.getByTestId("price-margin-chip")).toHaveTextContent(
      "page.recipeHpp.marginChip:50"
    );
    expect(screen.getByText("page.recipeHpp.estimateLabel")).toBeInTheDocument();
    expect(screen.queryByTestId("cost-food-cost-chip")).not.toBeInTheDocument();
    const summary = screen.getByTestId("recipe-hpp-summary");
    expect(within(summary).getByTestId("hpp-status")).toHaveAttribute("data-status", "auto");
    expect(within(summary).getByTestId("recipe-hpp-hppPerPortion")).toHaveTextContent("7.500");
    expect(within(summary).getByTestId("recipe-hpp-margin")).toHaveTextContent("50%");
  });

  test("an incomplete recipe uses the estimate and says so", () => {
    render(
      <PriceCostHarness
        defaults={{ price: 15000, costPrice: 6000, inventoryMode: "make_to_order" }}
        costing={{
          recipes: [
            {
              ...autoRecipe,
              status: "unavailable",
              hppPerPortion: null,
              missingCost: [{ ingredientId: 3, name: "Keju" }]
            }
          ]
        }}
        storeId={1}
      />
    );
    expect(screen.getByTestId("price-margin-chip")).toHaveTextContent(
      "page.recipeHpp.marginChipEstimated:60"
    );
    expect(screen.getByTestId("hpp-status")).toHaveAttribute("data-status", "provisional");
    expect(screen.getByText("page.recipeHpp.missingCost")).toBeInTheDocument();
  });

  test("a stocked product keeps Harga Modal: margin and food cost from it", () => {
    render(
      <PriceCostHarness defaults={{ price: 5000, costPrice: 3000, inventoryMode: "stocked" }} />
    );
    expect(screen.getByText("page.product.form.costPrice")).toBeInTheDocument();
    expect(screen.getByTestId("price-margin-chip")).toHaveTextContent(
      "page.recipeHpp.marginChip:40"
    );
    expect(screen.getByTestId("cost-food-cost-chip")).toHaveTextContent(
      "page.recipeHpp.foodCostChip:60"
    );
    expect(screen.queryByTestId("recipe-hpp-summary")).not.toBeInTheDocument();
  });

  test("a new recipe product explains the HPP comes after the recipe", () => {
    render(
      <PriceCostHarness
        defaults={{ price: 15000, costPrice: "", inventoryMode: "make_to_order" }}
      />
    );
    expect(screen.getByText("page.recipeHpp.afterSave")).toBeInTheDocument();
    expect(screen.queryByTestId("price-margin-chip")).not.toBeInTheDocument();
  });
});

describe("AddBom — recipe yield and live HPP", () => {
  const renderPage = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AddBom />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAllIngredients.mockResolvedValue({
      data: [
        {
          id: 21,
          name: "Bakso",
          unit: "kg",
          baseUnit: "butir",
          conversionFactor: 25,
          costPrice: 25000,
          status: "active"
        },
        {
          id: 22,
          name: "Keju",
          unit: "pack",
          baseUnit: "g",
          conversionFactor: 200,
          costPrice: 0,
          status: "active"
        }
      ]
    });
    getAllSupplier.mockResolvedValue({ data: [] });
    addBom.mockResolvedValue({ success: true });
  });

  const pick = async (name) => {
    const box = (await screen.findAllByTestId("page.bom.add.form.selectIngredient"))[0];
    await waitFor(() => expect(within(box).getByText(name)).toBeInTheDocument());
    fireEvent.click(within(box).getByText(name));
  };

  test("a 10-portion pot previews Rp7.500 a portion and saves totalQty 10", async () => {
    renderPage();
    await pick("Bakso");
    fireEvent.change(screen.getByPlaceholderText("page.bom.add.placeholder.qty"), {
      target: { value: "75" }
    });
    fireEvent.change(screen.getByLabelText("page.bom.add.form.yield"), {
      target: { value: "10" }
    });
    await waitFor(() =>
      expect(screen.getByTestId("recipe-hpp-hppPerPortion")).toHaveTextContent("7.500")
    );
    expect(screen.getByTestId("hpp-status")).toHaveAttribute("data-status", "auto");
    expect(screen.getByTestId("recipe-hpp-margin")).toHaveTextContent("50%");

    fireEvent.click(screen.getByText("page.bom.add.form.save"));
    await waitFor(() => expect(addBom).toHaveBeenCalledTimes(1));
    expect(addBom.mock.calls[0][0]).toMatchObject({ productId: 1, totalQty: 10 });
  });

  test("an ingredient without a purchase price makes the HPP provisional", async () => {
    renderPage();
    await pick("Keju");
    fireEvent.change(screen.getByPlaceholderText("page.bom.add.placeholder.qty"), {
      target: { value: "20" }
    });
    await waitFor(() =>
      expect(screen.getByTestId("hpp-status")).toHaveAttribute("data-status", "provisional")
    );
    expect(screen.getByText("page.recipeHpp.missingCost")).toBeInTheDocument();
    expect(screen.getByTestId("recipe-hpp-hppPerPortion")).toHaveTextContent("6.000");
  });
});

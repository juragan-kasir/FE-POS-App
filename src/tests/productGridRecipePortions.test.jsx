import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import ProductGrid from "../page/cashier/components/ProductGrid";
import { orderList } from "../state/order-list";
import { remainingRecipePortions, recipePortionsFor } from "../lib/recipe-availability";

// BRD "Harga Modal, HPP, Resep/BOM & Stok" phase 2: a recipe product on the
// cashier grid is limited by the portions its ingredients still make after
// what is in the cart (BR-05, FR-11), never by its own product stock (AC-07),
// and cannot be added once none are left (BR-06, blokir).

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts && typeof opts === "object" && "count" in opts ? `${k}:${opts.count}` : k)
  })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [] }))
}));

// BRD §8.3 Cappuccino — kopi 500 g / 10 g, susu 1.000 ml / 100 ml, gula 200 g / 10 g;
// Latte uses 150 ml susu per cup.
const AVAILABILITY = {
  store: 1,
  products: [
    {
      productId: 1,
      portions: 10,
      limitingIngredientIds: [12],
      requirements: [
        { ingredientId: 11, perPortion: 10 },
        { ingredientId: 12, perPortion: 100 },
        { ingredientId: 13, perPortion: 10 }
      ]
    },
    {
      productId: 2,
      portions: 6,
      limitingIngredientIds: [12],
      requirements: [{ ingredientId: 12, perPortion: 150 }]
    }
  ],
  ingredients: [
    { id: 11, name: "Kopi", stock: 500, baseUnit: "g" },
    { id: 12, name: "Susu", stock: 1000, baseUnit: "ml" },
    { id: 13, name: "Gula", stock: 200, baseUnit: "g" }
  ]
};

describe("remainingRecipePortions", () => {
  test("§8.3: Cappuccino makes 10, limited by susu", () => {
    const map = remainingRecipePortions(AVAILABILITY, []);
    expect(map.get(1)).toEqual({ portions: 10, limitingIngredients: [{ id: 12, name: "Susu" }] });
    expect(map.get(2).portions).toBe(6);
  });

  test("FR-11: the cart draws on the shared susu balance", () => {
    // 4 cappuccino = 400 ml → 600 ml left: 6 cappuccino, 4 latte.
    const map = remainingRecipePortions(AVAILABILITY, [{ id: 1, count: 4 }]);
    expect(map.get(1).portions).toBe(6);
    expect(map.get(2).portions).toBe(4);
    const full = remainingRecipePortions(AVAILABILITY, [
      { id: 1, count: 4 },
      { id: 2, count: 4 }
    ]);
    expect(full.get(1).portions).toBe(0);
    expect(full.get(2).portions).toBe(0);
  });

  test("recipePortionsFor: stocked, bundle and not-loaded are not recipe-limited", () => {
    const map = remainingRecipePortions(AVAILABILITY, []);
    expect(recipePortionsFor({ id: 1, inventoryMode: "stocked" }, map, true)).toBeNull();
    expect(recipePortionsFor({ id: 1, inventoryMode: "make_to_order" }, map, false)).toBeNull();
    expect(
      recipePortionsFor({ id: 1, isBundle: true, inventoryMode: "make_to_order" }, map, true)
    ).toBeNull();
    // A recipe product the server did not list has no active recipe here.
    expect(recipePortionsFor({ id: 99, inventoryMode: "make_to_order" }, map, true)).toEqual({
      portions: 0,
      limitingIngredients: []
    });
  });
});

const PRODUCTS = [
  {
    id: 1,
    nameProduct: "Cappuccino",
    sku: "CAP",
    price: 20000,
    stock: 0,
    inventoryMode: "make_to_order"
  },
  {
    id: 2,
    nameProduct: "Latte",
    sku: "LAT",
    price: 22000,
    stock: 0,
    inventoryMode: "make_to_order"
  },
  {
    id: 3,
    nameProduct: "Es Kopi Baru",
    sku: "NEW",
    price: 15000,
    stock: 0,
    inventoryMode: "make_to_order"
  },
  { id: 4, nameProduct: "Air Mineral", sku: "AIR", price: 5000, stock: 8, inventoryMode: "stocked" }
];

const renderGrid = (recipeAvailability = AVAILABILITY) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductGrid
        products={PRODUCTS}
        allProducts={PRODUCTS}
        isLoading={false}
        search=""
        onSearchChange={jest.fn()}
        barcode=""
        onBarcodeChange={jest.fn()}
        categoryId=""
        onCategoryChange={jest.fn()}
        store="1"
        recipeAvailability={recipeAvailability}
      />
    </QueryClientProvider>
  );
};

const tile = (name) => screen.getByText(name).closest("button");

describe("ProductGrid — recipe portions", () => {
  beforeEach(() => {
    orderList.setState({ order: [] });
  });

  test("AC-07: a recipe product with 0 own stock shows its portions and can be sold", async () => {
    renderGrid();
    await waitFor(() =>
      expect(screen.getAllByTestId("recipe-portions")[0]).toHaveTextContent(
        "page.cashier.product.portionsLeft:10"
      )
    );
    expect(tile("Cappuccino")).not.toBeDisabled();
    fireEvent.click(tile("Cappuccino"));
    expect(orderList.getState().order).toEqual([expect.objectContaining({ id: 1, count: 1 })]);
  });

  test("a recipe product without an active recipe here is out of ingredients", async () => {
    renderGrid();
    await waitFor(() => expect(tile("Es Kopi Baru")).toBeDisabled());
    expect(screen.getAllByText("page.cashier.product.ingredientsOut").length).toBeGreaterThan(0);
    expect(tile("Air Mineral")).not.toBeDisabled();
  });

  test("BR-06: once the cart uses the last susu, both menus stop being sellable", async () => {
    renderGrid();
    await waitFor(() => expect(screen.getAllByTestId("recipe-portions")).toHaveLength(2));
    act(() => {
      orderList.setState({
        order: [
          { id: 1, cartKey: "1_", count: 4, price: 20000, totalPrice: 80000 },
          { id: 2, cartKey: "2_", count: 4, price: 22000, totalPrice: 88000 }
        ]
      });
    });
    await waitFor(() => expect(tile("Cappuccino")).toBeDisabled());
    expect(tile("Latte")).toBeDisabled();
    fireEvent.click(tile("Cappuccino"));
    expect(orderList.getState().order.find((i) => i.id === 1).count).toBe(4);
  });

  test("if availability cannot be loaded, the grid does not block recipe products", async () => {
    renderGrid(null);
    expect(tile("Es Kopi Baru")).not.toBeDisabled();
    expect(screen.queryByTestId("recipe-portions")).not.toBeInTheDocument();
  });
});

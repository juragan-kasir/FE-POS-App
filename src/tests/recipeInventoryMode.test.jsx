import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import ProductGrid from "../page/cashier/components/ProductGrid";
import ProductDetailModal from "../page/cashier/components/ProductDetailModal";
import InventoryModeField from "../page/product/InventoryModeField";
import { INVENTORY_MODES, usesProductStock } from "../lib/inventory-mode";
import { orderList } from "../state/order-list";

// Per-recipe stock (e.g. bakso: stock kept per ingredient type, every sale
// deducts what the menu's recipe uses). A make_to_order menu is limited by its
// ingredients — checked by the server (409 INGREDIENT_STOCK_CONFLICT) — never
// by its own, usually zero, product stock.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));
jest.mock("../services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("../utils/image", () => ({
  optimizeImage: jest.fn((url) => url)
}));

const recipeMenu = {
  id: 1,
  nameProduct: "Mie Bakso Urat",
  sku: "BKS-1",
  price: 20000,
  stock: 0,
  minStock: 5,
  inventoryMode: "make_to_order"
};
const soldOut = {
  id: 2,
  nameProduct: "Es Teh Botol",
  sku: "ETB-1",
  price: 5000,
  stock: 0,
  inventoryMode: "stocked"
};

const renderGrid = (products) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ProductGrid
        products={products}
        allProducts={products}
        isLoading={false}
        search=""
        onSearchChange={jest.fn()}
        barcode=""
        onBarcodeChange={jest.fn()}
        categoryId=""
        onCategoryChange={jest.fn()}
        store="1"
      />
    </QueryClientProvider>
  );

const tile = (name) => screen.getByText(name).closest("button");

describe("usesProductStock", () => {
  test.each([
    [{ inventoryMode: "stocked" }, true],
    [{ inventoryMode: "hybrid" }, true],
    [{}, true],
    [{ inventoryMode: "make_to_order" }, false]
  ])("%j → %p", (product, expected) => {
    expect(usesProductStock(product)).toBe(expected);
  });
});

describe("cashier grid — recipe menus are never blocked by product stock", () => {
  beforeEach(() => orderList.setState({ order: [] }));

  test("a make_to_order menu with 0 product stock can be added to the cart", () => {
    renderGrid([recipeMenu, soldOut]);
    expect(tile("Mie Bakso Urat")).not.toBeDisabled();
    fireEvent.click(tile("Mie Bakso Urat"));
    expect(orderList.getState().order.map((o) => o.id)).toEqual([1]);
  });

  test("a stocked product with 0 stock is still blocked", () => {
    renderGrid([recipeMenu, soldOut]);
    expect(tile("Es Teh Botol")).toBeDisabled();
    expect(screen.getAllByText("page.cashier.product.outOfStock")).toHaveLength(1);
  });

  test("the detail modal shows no product-stock figure for a recipe menu", () => {
    render(
      <ProductDetailModal
        open
        product={recipeMenu}
        onOpenChange={jest.fn()}
        onAddToCart={jest.fn()}
      />
    );
    expect(screen.queryByText("page.product.form.stock")).not.toBeInTheDocument();
  });
});

describe("InventoryModeField", () => {
  const renderField = (props) =>
    render(
      <MemoryRouter>
        <InventoryModeField onChange={jest.fn()} {...props} />
      </MemoryRouter>
    );

  test("offers the selectable modes and reports the choice", () => {
    const onChange = jest.fn();
    renderField({ value: "stocked", onChange });
    expect(screen.getAllByRole("radio")).toHaveLength(INVENTORY_MODES.length - 1);
    const recipeRadio = screen
      .getAllByRole("radio")
      .find((radio) => radio.getAttribute("value") === "make_to_order");
    fireEvent.click(recipeRadio);
    expect(onChange).toHaveBeenCalledWith("make_to_order");
  });

  test("a recipe mode warns that a BOM is required and links to it for a saved product", () => {
    renderField({ value: "make_to_order", productId: 12 });
    expect(screen.getByText(/page.product.form.inventoryMode.recipeRequired/)).toBeInTheDocument();
    expect(screen.getByText("page.product.form.inventoryMode.recipeLink")).toHaveAttribute(
      "href",
      "/bom/add?productId=12"
    );
  });

  test("the stocked mode shows no recipe warning", () => {
    renderField({ value: "stocked" });
    expect(screen.queryByText(/recipeRequired/)).not.toBeInTheDocument();
  });

  // BRD phase 4F: hybrid is retired.
  test("hybrid is not offered to a product that does not have it", () => {
    renderField({ value: "stocked", savedMode: "stocked" });
    const values = screen.getAllByRole("radio").map((r) => r.getAttribute("value"));
    expect(values).toEqual(["stocked", "make_to_order", "inventory_item"]);
    expect(
      screen.queryByText("page.product.form.inventoryMode.hybridRetired")
    ).not.toBeInTheDocument();
  });

  test("a hybrid product keeps the option, with a note to move off it", () => {
    renderField({ value: "hybrid", savedMode: "hybrid" });
    const hybrid = screen.getAllByRole("radio").find((r) => r.getAttribute("value") === "hybrid");
    expect(hybrid).toBeChecked();
    expect(screen.getByText("page.product.form.inventoryMode.hybridRetired")).toBeInTheDocument();
  });
});

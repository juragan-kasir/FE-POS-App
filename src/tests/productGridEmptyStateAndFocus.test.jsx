import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import ProductGrid from "../page/cashier/components/ProductGrid";
import { getAllCategoryActive } from "../services/category";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock("../services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [] }))
}));

const products = [{ id: 1, nameProduct: "Product A", sku: "SKU-001", price: 10000, stock: 5 }];

// Mirrors how CashierPage drives ProductGrid: search/categoryId/refocusSignal
// live in the parent, so this harness reproduces just enough of that to
// exercise the empty-state branching and the imperative refocus signal.
const Harness = ({ initialRefocusSignal = 0, catalog = products, onAddProduct }) => {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [refocusSignal, setRefocusSignal] = useState(initialRefocusSignal);
  return (
    <>
      <button type="button" onClick={() => setRefocusSignal((n) => n + 1)}>
        bump-refocus
      </button>
      <ProductGrid
        products={search || categoryId ? [] : catalog}
        allProducts={catalog}
        refocusSignal={refocusSignal}
        isLoading={false}
        search={search}
        onSearchChange={setSearch}
        barcode=""
        onBarcodeChange={jest.fn()}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        store="1"
        onAddProduct={onAddProduct}
      />
    </>
  );
};

const renderGrid = (props) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness {...props} />
    </QueryClientProvider>
  );
};

describe("ProductGrid empty state", () => {
  beforeEach(() => getAllCategoryActive.mockClear());

  test("a store with products shows the catalog, not an empty state", () => {
    renderGrid();
    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.noProducts")).not.toBeInTheDocument();
  });

  test("an active search with zero matches shows the search-specific empty state with a clear action", () => {
    renderGrid();
    fireEvent.change(screen.getByPlaceholderText("page.cashier.searchPlaceholder"), {
      target: { value: "zzz" }
    });

    expect(screen.getByText("page.cashier.noSearchResults")).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.noProducts")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("page.cashier.clearSearchFilters"));
    expect(screen.getByPlaceholderText("page.cashier.searchPlaceholder").value).toBe("");
    expect(screen.getByText("Product A")).toBeInTheDocument();
  });

  test("a store with no products says so (not 'try another keyword') and offers Tambah Produk", () => {
    const onAddProduct = jest.fn();
    renderGrid({ catalog: [], onAddProduct });

    expect(screen.getByText("page.cashier.catalogEmpty")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.catalogEmptyDescAdmin")).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.noProductsDesc")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("page.cashier.addProduct"));
    expect(onAddProduct).toHaveBeenCalledTimes(1);
  });

  test("staff who cannot add products are told to ask an admin, with no add button", () => {
    renderGrid({ catalog: [] });

    expect(screen.getByText("page.cashier.catalogEmpty")).toBeInTheDocument();
    expect(screen.getByText("page.cashier.catalogEmptyDescStaff")).toBeInTheDocument();
    expect(screen.queryByText("page.cashier.addProduct")).not.toBeInTheDocument();
  });
});

describe("ProductGrid refocus signal", () => {
  test("bumping refocusSignal returns focus to the visible search input", () => {
    renderGrid();
    const input = screen.getByPlaceholderText("page.cashier.searchPlaceholder");
    input.blur();
    expect(input).not.toHaveFocus();

    fireEvent.click(screen.getByText("bump-refocus"));
    expect(input).toHaveFocus();
  });

  test("does not steal focus on initial mount", () => {
    renderGrid();
    const input = screen.getByPlaceholderText("page.cashier.searchPlaceholder");
    expect(input).not.toHaveFocus();
  });
});

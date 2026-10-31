import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import ProductGrid from "../page/cashier/components/ProductGrid";
import { orderList } from "../state/order-list";
import { getAllCategoryActive } from "../services/category";
import { toast } from "sonner";
import { matchesProductCode, productTextMatches } from "../lib/product-code";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock("../services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [] }))
}));

const susu = {
  id: 1,
  nameProduct: "Susu UHT 1L",
  sku: "PRD-00001",
  barcode: "8991234567890",
  price: 18000,
  stock: 5,
  category: 10
};
const roti = {
  id: 2,
  nameProduct: "Roti Tawar",
  sku: "PRD-00002",
  barcode: "8990000000002",
  price: 15000,
  stock: 5,
  category: 10
};

const Harness = ({ products, allProducts = products, search = "", onSearchChange, ...rest }) => {
  const [barcode, setBarcode] = useState("");
  return (
    <ProductGrid
      products={products}
      allProducts={allProducts}
      isLoading={false}
      search={search}
      onSearchChange={onSearchChange || jest.fn()}
      barcode={barcode}
      onBarcodeChange={setBarcode}
      categoryId=""
      onCategoryChange={jest.fn()}
      store="1"
      {...rest}
    />
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

const cartHas = (id) => orderList.getState().order.some((i) => i.id === id);

describe("product code matching", () => {
  test("matches the manufacturer barcode as well as the internal SKU", () => {
    expect(matchesProductCode(susu, "8991234567890")).toBe(true);
    expect(matchesProductCode(susu, " prd-00001 ")).toBe(true);
    expect(matchesProductCode(susu, "899123")).toBe(false);
    expect(matchesProductCode(susu, "")).toBe(false);
  });

  test("text search also finds a product by barcode", () => {
    expect(productTextMatches(susu, "89912345")).toBe(true);
    expect(productTextMatches(susu, "uht")).toBe(true);
    expect(productTextMatches(susu, "")).toBe(true);
    expect(productTextMatches(roti, "uht")).toBe(false);
  });
});

describe("ProductGrid scanning by barcode", () => {
  beforeEach(() => {
    orderList.setState({ order: [] });
    toast.error.mockClear();
    getAllCategoryActive.mockImplementation(() => Promise.resolve({ data: [] }));
  });

  test("a scanned EAN barcode adds the product in barcode mode", async () => {
    renderGrid({ products: [susu, roti] });
    fireEvent.click(screen.getByLabelText("page.cashier.barcodePlaceholder"));
    const input = screen.getByPlaceholderText("page.cashier.barcodePlaceholder");

    fireEvent.change(input, { target: { value: "8990000000002" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(cartHas(2)).toBe(true));
    expect(input.value).toBe("");
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("the live lookup fallback also matches by barcode", async () => {
    const lookup = jest.fn(() => Promise.resolve([susu]));
    renderGrid({ products: [roti], allProducts: [roti], onRemoteBarcodeLookup: lookup });
    fireEvent.click(screen.getByLabelText("page.cashier.barcodePlaceholder"));
    const input = screen.getByPlaceholderText("page.cashier.barcodePlaceholder");

    fireEvent.change(input, { target: { value: "8991234567890" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(cartHas(1)).toBe(true));
    expect(lookup).toHaveBeenCalledWith("8991234567890");
  });
});

describe("ProductGrid search box Enter", () => {
  beforeEach(() => {
    orderList.setState({ order: [] });
    toast.error.mockClear();
    getAllCategoryActive.mockImplementation(() => Promise.resolve({ data: [] }));
  });

  test("Enter adds the only search result and clears the search", async () => {
    const onSearchChange = jest.fn();
    renderGrid({ products: [roti], allProducts: [susu, roti], search: "roti", onSearchChange });
    const input = screen.getByPlaceholderText("page.cashier.searchPlaceholder");

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(cartHas(2)).toBe(true));
    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("Enter with several results adds nothing and keeps the search", async () => {
    const onSearchChange = jest.fn();
    renderGrid({ products: [susu, roti], search: "r", onSearchChange });
    const input = screen.getByPlaceholderText("page.cashier.searchPlaceholder");

    fireEvent.keyDown(input, { key: "Enter" });

    await new Promise((r) => setTimeout(r, 0));
    expect(orderList.getState().order).toHaveLength(0);
    expect(onSearchChange).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("Enter does not add an out-of-stock single result", async () => {
    const onSearchChange = jest.fn();
    const habis = { ...roti, stock: 0 };
    renderGrid({ products: [habis], search: "roti", onSearchChange });
    const input = screen.getByPlaceholderText("page.cashier.searchPlaceholder");

    fireEvent.keyDown(input, { key: "Enter" });

    await new Promise((r) => setTimeout(r, 0));
    expect(orderList.getState().order).toHaveLength(0);
    expect(onSearchChange).not.toHaveBeenCalled();
  });
});

describe("ProductGrid empty category groups", () => {
  beforeEach(() => {
    getAllCategoryActive.mockImplementation(() =>
      Promise.resolve({
        data: [
          { id: 10, nameCategory: "Sembako" },
          { id: 11, nameCategory: "Rokok" }
        ]
      })
    );
  });

  const groupHeadings = () =>
    screen.queryAllByRole("heading", { level: 3 }).map((h) => h.textContent);

  test("while searching, categories without a match are hidden", async () => {
    renderGrid({ products: [roti], search: "roti" });
    await waitFor(() => expect(groupHeadings()).toEqual(["Sembako"]));
    expect(screen.queryByText("page.cashier.ui.noProductsYet")).not.toBeInTheDocument();
  });

  test("without a search, empty categories still show", async () => {
    renderGrid({ products: [roti], search: "" });
    await waitFor(() => expect(groupHeadings()).toEqual(["Sembako", "Rokok"]));
    expect(screen.getByText("page.cashier.ui.noProductsYet")).toBeInTheDocument();
  });
});

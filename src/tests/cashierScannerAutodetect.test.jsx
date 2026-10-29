import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import ProductGrid from "../page/cashier/components/ProductGrid";
import { orderList } from "../state/order-list";
import { createScanTracker, listenForScans } from "../page/cashier/scanner";
import { toast } from "sonner";

// UX #4: a scan works without switching to "barcode mode" first — typed into
// the search box, or with no field focused at all.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [] }))
}));

const key = (k, extra = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...extra
});

describe("createScanTracker", () => {
  test("a fast burst ending in Enter is a scan", () => {
    const tr = createScanTracker();
    "SKU-001".split("").forEach((c, i) => tr.key(key(c), 1000 + i * 5));
    expect(tr.key(key("Enter"), 1040)).toBe("SKU-001");
  });

  test("human-speed typing is not a scan", () => {
    const tr = createScanTracker();
    "SKU-001".split("").forEach((c, i) => tr.key(key(c), 1000 + i * 150));
    expect(tr.key(key("Enter"), 2200)).toBeNull();
  });

  test("too short, or with a modifier, is not a scan", () => {
    const tr = createScanTracker();
    tr.key(key("a"), 0);
    tr.key(key("b"), 5);
    expect(tr.key(key("Enter"), 10)).toBeNull();
    "abcd".split("").forEach((c, i) => tr.key(key(c), 100 + i * 5));
    tr.key(key("c", { ctrlKey: true }), 125);
    expect(tr.key(key("Enter"), 130)).toBeNull();
  });
});

describe("listenForScans", () => {
  let now;
  beforeEach(() => {
    now = 1000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });
  afterEach(() => jest.restoreAllMocks());

  const typeOnWindow = (text, gap = 5) => {
    for (const c of text) {
      now += gap;
      window.dispatchEvent(new KeyboardEvent("keydown", { key: c }));
    }
    now += gap;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  };

  test("catches a scan with no field focused, not while a dialog is open", () => {
    const onScan = jest.fn();
    const stop = listenForScans(onScan);
    typeOnWindow("SKU-002");
    expect(onScan).toHaveBeenCalledWith("SKU-002");

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    typeOnWindow("SKU-003");
    expect(onScan).toHaveBeenCalledTimes(1);
    dialog.remove();
    stop();
  });
});

const products = [
  { id: 1, nameProduct: "Product A", sku: "SKU-001", price: 10000, stock: 5 },
  { id: 2, nameProduct: "Product B", sku: "SKU-002", price: 20000, stock: 5 }
];

const Harness = ({ onRemoteBarcodeLookup }) => {
  const [search, setSearch] = useState("");
  return (
    <ProductGrid
      products={products}
      allProducts={products}
      isLoading={false}
      search={search}
      onSearchChange={setSearch}
      barcode=""
      onBarcodeChange={jest.fn()}
      categoryId=""
      onCategoryChange={jest.fn()}
      store="1"
      onRemoteBarcodeLookup={onRemoteBarcodeLookup}
    />
  );
};

const renderGrid = (props = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness {...props} />
    </QueryClientProvider>
  );

describe("ProductGrid search box takes scans", () => {
  let now;
  beforeEach(() => {
    orderList.setState({ order: [] });
    toast.error.mockClear();
    now = 1000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });
  afterEach(() => jest.restoreAllMocks());

  // Type like a scanner (5 ms per key) or a person (200 ms per key).
  const typeInto = (input, text, gap) => {
    let value = "";
    for (const c of text) {
      now += gap;
      fireEvent.keyDown(input, { key: c });
      value += c;
      fireEvent.change(input, { target: { value } });
    }
    now += gap;
    fireEvent.keyDown(input, { key: "Enter" });
  };

  test("a scanned SKU goes straight to the cart and clears the search", async () => {
    renderGrid();
    const input = screen.getByPlaceholderText("page.cashier.searchPlaceholder");
    typeInto(input, "SKU-002", 5);

    await waitFor(() =>
      expect(orderList.getState().order.some((i) => i.sku === "SKU-002")).toBe(true)
    );
    expect(input).toHaveValue("");
  });

  test("an unknown scanned code says so; a typed search that matches no SKU stays quiet", async () => {
    const remote = jest.fn(() => Promise.resolve([]));
    renderGrid({ onRemoteBarcodeLookup: remote });
    const input = screen.getByPlaceholderText("page.cashier.searchPlaceholder");

    typeInto(input, "NOPE-999", 5);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("page.cashier.barcodeNotFound"));
    expect(remote).toHaveBeenCalledWith("NOPE-999");

    toast.error.mockClear();
    remote.mockClear();
    fireEvent.change(input, { target: { value: "" } });
    typeInto(input, "kopi", 200);
    await new Promise((r) => setTimeout(r, 20));
    expect(toast.error).not.toHaveBeenCalled();
    expect(remote).not.toHaveBeenCalled();
    expect(input).toHaveValue("kopi");
    expect(orderList.getState().order).toHaveLength(0);
  });
});

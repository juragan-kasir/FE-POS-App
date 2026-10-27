import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useForm } from "react-hook-form";
import { QueryClient, QueryClientProvider } from "react-query";
import { Form } from "@/components/ui/form";
import ProductPriceCostFields from "../page/product/ProductPriceCostFields";
import InventoryLinkField, { LinkedItemList } from "../page/product/InventoryLinkField";
import ProductGrid from "../page/cashier/components/ProductGrid";
import { orderList } from "../state/order-list";
import { addIngredient, getAllIngredients } from "../services/ingredient";
import { usesProductStock } from "../lib/inventory-mode";
import {
  linkAvailableUnits,
  linkUnitCost,
  linksFromProduct,
  linksPayload,
  missingLinkStores
} from "../lib/inventory-link";

// BRD "Harga Modal, HPP, Resep/BOM & Stok" phase 3: a finished good sold as
// it is (Le Minerale) takes its stock, cost and minimum from one inventory
// item per outlet (BR-01/BR-02, FR-02/FR-06/FR-07) — inventoryMode
// "inventory_item". The form asks for the item, never for stock or cost.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  )
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      if (!opts || typeof opts !== "object") return k;
      if ("count" in opts) return `${k}:${opts.count}`;
      if ("value" in opts) return `${k}:${opts.value}`;
      return k;
    }
  })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
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
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(),
  addIngredient: jest.fn()
}));
jest.mock("../services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [] }))
}));

// Le Minerale bought per dus of 24 at Rp72.000 → Rp3.000 per pcs.
const LE_MINERALE = {
  id: 11,
  name: "Le Minerale",
  stock: 24,
  minStock: 30,
  unit: "dus",
  baseUnit: "pcs",
  conversionFactor: 24,
  costPrice: 72000,
  status: "active"
};

const withQuery = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("inventory-link rules", () => {
  test("FR-02: cost of one sold unit is the item cost per base unit × qty", () => {
    expect(linkUnitCost(LE_MINERALE, 1)).toBe(3000);
    expect(linkUnitCost(LE_MINERALE, 6)).toBe(18000);
    expect(linkUnitCost({ ...LE_MINERALE, costPrice: 0 }, 1)).toBeNull();
  });

  test("units it can still sell", () => {
    expect(linkAvailableUnits(LE_MINERALE, 1)).toBe(24);
    expect(linkAvailableUnits(LE_MINERALE, 6)).toBe(4);
    expect(linkAvailableUnits({ stock: 0 }, 1)).toBe(0);
  });

  test("every outlet needs an item; the payload carries the selling outlets only", () => {
    const links = [
      { store: "1", ingredientId: "11", qty: 6 },
      { store: "3", ingredientId: "31", qty: "" }
    ];
    expect(missingLinkStores(links, ["1", "2"])).toEqual(["2"]);
    expect(linksPayload(links, ["1"])).toEqual([{ store: 1, ingredientId: 11, qty: 6 }]);
    expect(linksPayload(links, ["3"])).toEqual([{ store: 3, ingredientId: 31, qty: 1 }]);
    expect(linksFromProduct({ inventoryLinks: [{ store: 1, ingredientId: 11, qty: 6 }] })).toEqual([
      { store: "1", ingredientId: "11", qty: 6 }
    ]);
  });

  test("a linked product never uses its own stock", () => {
    expect(usesProductStock({ inventoryMode: "inventory_item" })).toBe(false);
    expect(usesProductStock({ inventoryMode: "hybrid" })).toBe(true);
    expect(usesProductStock({})).toBe(true);
  });
});

describe("InventoryLinkField (FR-06/FR-07)", () => {
  beforeEach(() => {
    getAllIngredients.mockResolvedValue({
      data: [LE_MINERALE, { ...LE_MINERALE, id: 12, status: "inactive" }]
    });
    addIngredient.mockReset();
  });

  const Harness = ({ initial = [] }) => {
    const [links, setLinks] = React.useState(initial);
    return (
      <>
        <InventoryLinkField
          stores={[{ id: "1", name: "Pusat" }]}
          value={links}
          onChange={setLinks}
          productName="Le Minerale 600ml"
        />
        <output data-testid="links">{JSON.stringify(links)}</output>
      </>
    );
  };

  test("picking the item shows its stock, minimum and cost read-only", async () => {
    withQuery(<Harness />);
    await waitFor(() => expect(screen.getByText("Le Minerale (pcs)")).toBeInTheDocument());
    expect(getAllIngredients).toHaveBeenCalledWith({ store: "1", limit: 999 });
    fireEvent.click(screen.getByText("Le Minerale (pcs)"));
    const summary = await screen.findByTestId("inventory-link-summary");
    expect(summary).toHaveTextContent("24 pcs");
    expect(summary).toHaveTextContent("30 pcs");
    expect(summary).toHaveTextContent("Rp 3.000");
    expect(JSON.parse(screen.getByTestId("links").textContent)).toEqual([
      { store: "1", qty: 1, ingredientId: "11" }
    ]);
  });

  test("Q6: a pack uses several base units per sold unit", async () => {
    withQuery(<Harness initial={[{ store: "1", ingredientId: "11", qty: 1 }]} />);
    const summary = await screen.findByTestId("inventory-link-summary");
    fireEvent.change(screen.getByLabelText(/page.product.form.inventoryLink.qty/), {
      target: { value: "6" }
    });
    await waitFor(() => expect(summary).toHaveTextContent("Rp 18.000"));
    expect(within(summary).getByText("4")).toBeInTheDocument();
  });

  test("FR-07: an item created here is linked at once", async () => {
    addIngredient.mockResolvedValue({ data: { id: 99, name: "Le Minerale 600ml" } });
    withQuery(<Harness />);
    fireEvent.click(await screen.findByText("page.product.form.inventoryLink.createItem"));
    expect(screen.getByLabelText("page.product.form.inventoryLink.create.name")).toHaveValue(
      "Le Minerale 600ml"
    );
    fireEvent.change(screen.getByLabelText("page.product.form.inventoryLink.create.stock"), {
      target: { value: "24" }
    });
    fireEvent.click(screen.getByText("page.product.form.inventoryLink.create.save"));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("links").textContent)).toEqual([
        { store: "1", qty: 1, ingredientId: "99" }
      ])
    );
    expect(addIngredient).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Le Minerale 600ml", store: 1, stock: 24, status: "active" })
    );
  });

  test("no outlet picked yet asks for one", () => {
    withQuery(<InventoryLinkField stores={[]} value={[]} onChange={jest.fn()} />);
    expect(screen.getByText("page.product.form.inventoryLink.needsStore")).toBeInTheDocument();
  });
});

const PriceCostHarness = ({ defaults, linkedCost }) => {
  const form = useForm({ defaultValues: defaults });
  return (
    <Form {...form}>
      <ProductPriceCostFields form={form} linkedCost={linkedCost} />
    </Form>
  );
};

describe("ProductPriceCostFields — linked finished good (FR-02, AC-05)", () => {
  test("no Harga Modal input: the item cost is read-only and behind the margin", () => {
    render(
      <PriceCostHarness
        defaults={{ inventoryMode: "inventory_item", price: 5000, costPrice: 9999 }}
        linkedCost={3000}
      />
    );
    expect(screen.queryByText("page.product.form.costPrice")).not.toBeInTheDocument();
    expect(screen.getByTestId("linked-cost")).toHaveValue("3.000");
    expect(screen.getByTestId("linked-cost")).toHaveAttribute("readonly");
    expect(screen.getByTestId("price-margin-chip")).toHaveTextContent(
      "page.recipeHpp.marginChip:40"
    );
    expect(screen.getByTestId("cost-food-cost-chip")).toHaveTextContent(
      "page.recipeHpp.foodCostChip:60"
    );
  });

  test("an item without a purchase price says so and shows no margin", () => {
    render(
      <PriceCostHarness
        defaults={{ inventoryMode: "inventory_item", price: 5000 }}
        linkedCost={null}
      />
    );
    expect(screen.getByText("page.product.form.inventoryLink.costMissing")).toBeInTheDocument();
    expect(screen.queryByTestId("price-margin-chip")).not.toBeInTheDocument();
  });
});

describe("LinkedItemList (product detail)", () => {
  test("lists each outlet's item with its balance and cost", () => {
    render(
      <LinkedItemList
        links={[
          {
            bomId: 1,
            store: 1,
            storeName: "Pusat",
            ingredientId: 11,
            ingredientName: "Le Minerale",
            qty: 6,
            baseUnit: "pcs",
            stock: 24,
            minStock: 30,
            unitCost: 18000
          }
        ]}
      />
    );
    const list = screen.getByTestId("linked-item-list");
    expect(within(list).getByText("Le Minerale").closest("a")).toHaveAttribute(
      "href",
      "/detail-ingredient?id=11"
    );
    expect(list).toHaveTextContent("× 6 pcs");
    expect(list).toHaveTextContent("Rp 18.000");
  });
});

describe("cashier grid — linked finished good (AC-06)", () => {
  const PRODUCTS = [
    {
      id: 1,
      nameProduct: "Le Minerale",
      sku: "LM",
      price: 5000,
      stock: 0,
      inventoryMode: "inventory_item"
    },
    {
      id: 2,
      nameProduct: "Le Minerale Pak 6",
      sku: "LM6",
      price: 27000,
      stock: 0,
      inventoryMode: "inventory_item"
    }
  ];
  const availability = (stock) => ({
    store: 1,
    products: [
      {
        productId: 1,
        portions: stock,
        limitingIngredientIds: [11],
        requirements: [{ ingredientId: 11, perPortion: 1 }]
      },
      {
        productId: 2,
        portions: Math.floor(stock / 6),
        limitingIngredientIds: [11],
        requirements: [{ ingredientId: 11, perPortion: 6 }]
      }
    ],
    ingredients: [{ id: 11, name: "Le Minerale", stock, baseUnit: "pcs" }]
  });
  const renderGrid = (recipeAvailability) =>
    withQuery(
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
    );
  const tile = (name) => screen.getByText(name).closest("button");

  beforeEach(() => orderList.setState({ order: [] }));

  test("shows the item stock as units, not portions, and sells despite 0 own stock", async () => {
    renderGrid(availability(24));
    await waitFor(() =>
      expect(screen.getAllByTestId("recipe-portions")[0]).toHaveTextContent(
        "page.cashier.product.itemStockLeft:24"
      )
    );
    expect(screen.queryByText(/portionsLeft/)).not.toBeInTheDocument();
    fireEvent.click(tile("Le Minerale"));
    expect(orderList.getState().order).toEqual([expect.objectContaining({ id: 1, count: 1 })]);
  });

  test("an empty item is out of stock (not out of ingredients)", async () => {
    renderGrid(availability(0));
    await waitFor(() => expect(tile("Le Minerale")).toBeDisabled());
    expect(screen.getAllByText("page.cashier.product.outOfStock").length).toBeGreaterThan(0);
    expect(screen.queryByText("page.cashier.product.ingredientsOut")).not.toBeInTheDocument();
  });
});

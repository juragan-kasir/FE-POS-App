import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import AdjustIngredientStockModal from "../page/ingredient/components/AdjustIngredientStockModal";
import IngredientStockSummary from "../page/ingredient/components/IngredientStockSummary";
import BomList from "../page/bom/BomList";
import { adjustIngredientStock, getIngredientStockSummary } from "@/services/ingredient";
import { getAllBom } from "@/services/bom";

// Warung inventory MVP: opening stock goes through the audited adjust-stock
// endpoint, never-entered stock is shown as unknown (not 0), the remaining-
// stock view keeps ingredient pieces apart from menu portions, and the recipe
// list says which recipes actually deduct stock.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn()
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (opts?.name ? `${k}:${opts.name}` : k) })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: "1" } }]
}));
jest.mock("@/utils/permission", () => ({ canAccess: () => true }));
jest.mock("@/queries/useLocations", () => ({ useLocations: () => ({ data: undefined }) }));
jest.mock("@/services/ingredient", () => ({
  adjustIngredientStock: jest.fn(),
  getIngredientStockSummary: jest.fn()
}));
jest.mock("@/services/bom", () => ({
  getAllBom: jest.fn(),
  deleteBom: jest.fn()
}));

const wrap = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
};

beforeEach(() => jest.clearAllMocks());

describe("AdjustIngredientStockModal", () => {
  const uninitialized = {
    id: 11,
    name: "Bakso Halus/Polos",
    stock: "0.0000",
    unit: "pcs",
    baseUnit: "pcs",
    openingStockRecorded: false
  };

  test("never-entered stock is shown as unknown and defaults to an opening count", async () => {
    adjustIngredientStock.mockResolvedValue({ data: { quantityBefore: 0, quantityAfter: 83 } });
    const onClose = jest.fn();
    wrap(<AdjustIngredientStockModal ingredient={uninitialized} onClose={onClose} />);

    expect(screen.getByText("page.ingredient.stockState.uninitialized")).toBeInTheDocument();
    expect(screen.getByText("page.ingredient.adjust.descriptionOpening")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/page.ingredient.adjust.quantity/), {
      target: { value: "83" }
    });
    fireEvent.click(screen.getByText("page.ingredient.adjust.save"));

    await waitFor(() =>
      expect(adjustIngredientStock).toHaveBeenCalledWith(11, {
        type: "set",
        quantity: 83,
        notes: "page.ingredient.adjust.openingNote"
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("an empty or invalid quantity is refused before any request", async () => {
    wrap(<AdjustIngredientStockModal ingredient={uninitialized} onClose={jest.fn()} />);
    fireEvent.click(screen.getByText("page.ingredient.adjust.save"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "page.ingredient.adjust.errorQuantity"
    );
    expect(adjustIngredientStock).not.toHaveBeenCalled();
  });

  test("a server stock conflict keeps the modal open with an understandable message", async () => {
    adjustIngredientStock.mockRejectedValue({
      response: { status: 409, data: { code: "INGREDIENT_STOCK_CONFLICT", message: "raw" } }
    });
    const onClose = jest.fn();
    wrap(
      <AdjustIngredientStockModal
        ingredient={{ ...uninitialized, stock: "5.0000", openingStockRecorded: true }}
        onClose={onClose}
      />
    );
    expect(screen.getByText("5 pcs")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/page.ingredient.adjust.quantity/), {
      target: { value: "2" }
    });
    fireEvent.click(screen.getByText("page.ingredient.adjust.save"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "page.ingredient.adjust.errorInsufficient"
    );
    expect(adjustIngredientStock).toHaveBeenCalledWith(11, {
      type: "add",
      quantity: 2,
      notes: null
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("IngredientStockSummary", () => {
  test("asks a global admin to pick a store instead of mixing stores", async () => {
    const onStoreChange = jest.fn();
    wrap(
      <IngredientStockSummary
        store="all"
        needsStore
        isSuperAdmin
        locations={[{ id: "loc-01", name: "Toko Pusat" }]}
        storeFilter="all"
        onStoreChange={onStoreChange}
      />
    );
    expect(screen.getByText("page.ingredient.summary.pickStore")).toBeInTheDocument();
    expect(screen.getByLabelText("page.ingredient.summary.startDate")).toBeInTheDocument();
    expect(screen.getByLabelText("page.ingredient.summary.endDate")).toBeInTheDocument();
    expect(getIngredientStockSummary).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "Toko Pusat" }));

    expect(onStoreChange).toHaveBeenCalledWith("1");
  });

  test("shows ledger figures, unknown opening stock as a dash, and menu portions separately", async () => {
    getIngredientStockSummary.mockResolvedValue({
      data: {
        items: [
          {
            id: 1,
            name: "Bakso Urat",
            unit: "pcs",
            openingStockRecorded: true,
            openingBalance: 30,
            consumed: 4,
            restored: 0,
            adjusted: 0,
            counted: 0,
            received: 0,
            other: 0,
            closingBalance: 26,
            lastCountedAt: null
          },
          {
            id: 2,
            name: "Cup",
            unit: "pcs",
            openingStockRecorded: false,
            openingBalance: 0,
            consumed: 0,
            restored: 0,
            adjusted: 0,
            counted: 0,
            received: 0,
            other: 0,
            closingBalance: 0,
            lastCountedAt: null
          }
        ],
        menuSold: [{ productId: 9, productName: "BAKSO URAT", quantity: 2 }]
      }
    });
    wrap(<IngredientStockSummary store="1" />);

    const urat = (await screen.findByText("Bakso Urat")).closest("tr");
    expect(within(urat).getByText("30")).toBeInTheDocument();
    expect(within(urat).getByText("4")).toBeInTheDocument();
    expect(within(urat).getByText("26")).toBeInTheDocument();

    const cup = screen.getByText("Cup").closest("tr");
    expect(within(cup).getByText("page.ingredient.stockState.uninitialized")).toBeInTheDocument();
    expect(within(cup).getAllByText("—")).toHaveLength(2);

    const menu = screen.getByText("BAKSO URAT").closest("tr");
    expect(within(menu).getByText("2")).toBeInTheDocument();
    expect(getIngredientStockSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        store: "1",
        startDate: expect.any(String),
        endDate: expect.any(String)
      })
    );
  });

  test("shows a legacy non-zero value as unverified instead of hiding it as unknown", async () => {
    getIngredientStockSummary.mockResolvedValue({
      data: {
        items: [
          {
            id: 3,
            name: "Jeruk",
            unit: "pcs",
            openingStockRecorded: false,
            stockState: "unrecorded",
            openingBalance: 20,
            consumed: 0,
            restored: 0,
            adjusted: 0,
            counted: 0,
            received: 0,
            other: 0,
            closingBalance: 20,
            lastCountedAt: null
          }
        ],
        menuSold: []
      }
    });
    wrap(<IngredientStockSummary store="1" />);

    const jeruk = (await screen.findByText("Jeruk")).closest("tr");
    expect(within(jeruk).getByText("page.ingredient.stockState.unrecorded")).toBeInTheDocument();
    expect(within(jeruk).getAllByText("20")).toHaveLength(2);
    expect(within(jeruk).queryByText("—")).not.toBeInTheDocument();
  });
});

describe("BomList recipe status", () => {
  test("says which recipes deduct stock and shows the per-portion composition", async () => {
    getAllBom.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Resep BAKSO URAT",
          status: "active",
          notes: "",
          productData: { nameProduct: "BAKSO URAT" },
          lines: [
            {
              id: 10,
              qty: 2,
              unit: "pcs",
              ingredientId: 1,
              ingredientData: { name: "Bakso Urat" }
            },
            {
              id: 11,
              qty: 2,
              unit: "pcs",
              ingredientId: 2,
              ingredientData: { name: "Bakso Halus/Polos" }
            }
          ]
        },
        {
          id: 2,
          name: "Resep ES TEH",
          status: "draft",
          notes: "PENDING KONFIRMASI: resep belum diberikan",
          productData: { nameProduct: "ES TEH" },
          lines: [{ id: 12, qty: 1, unit: "pcs", ingredientId: 3, ingredientData: { name: "Cup" } }]
        }
      ],
      pagination: { total: 2, totalPages: 1 }
    });
    wrap(<BomList />);

    const active = (await screen.findByText("Resep BAKSO URAT")).closest("tr");
    expect(within(active).getByText("page.bom.list.deductsStock")).toBeInTheDocument();
    expect(within(active).getByText("Bakso Urat")).toBeInTheDocument();
    expect(within(active).getByText("Bakso Halus/Polos")).toBeInTheDocument();

    const draft = screen.getByText("Resep ES TEH").closest("tr");
    expect(within(draft).getByText("common.draft")).toBeInTheDocument();
    expect(within(draft).getByText("page.bom.list.notDeductingStock")).toBeInTheDocument();
    expect(
      within(draft).getByText("PENDING KONFIRMASI: resep belum diberikan")
    ).toBeInTheDocument();
    expect(within(active).queryByText("page.bom.list.pendingConfirmation")).not.toBeInTheDocument();
  });

  test("flags an active recipe whose notes carry an unresolved owner question", async () => {
    getAllBom.mockResolvedValue({
      data: [
        {
          id: 3,
          name: "Resep MIE AYAM CHEESE",
          status: "active",
          notes: "PENDING KONFIRMASI: jumlah keju per porsi belum dikonfirmasi",
          productData: { nameProduct: "MIE AYAM CHEESE" },
          lines: [{ id: 13, qty: 1, unit: "pcs", ingredientId: 4, ingredientData: { name: "Mie" } }]
        }
      ],
      pagination: { total: 1, totalPages: 1 }
    });
    wrap(<BomList />);

    const row = (await screen.findByText("Resep MIE AYAM CHEESE")).closest("tr");
    expect(within(row).getByText("common.active")).toBeInTheDocument();
    expect(within(row).getByText("page.bom.list.pendingConfirmation")).toBeInTheDocument();
  });
});

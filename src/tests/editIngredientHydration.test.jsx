import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import EditIngredient from "../page/ingredient/EditIngredient";
import { getIngredientById } from "@/services/ingredient";

// Production 10-29: /edit-ingredient?id=7 opened with its fields empty.
// (Mocks adapted from ingredientStockDecimal.test.jsx.) BA finding #5 (Waroeng Bakso dummy, 2026-10-17): an ingredient saved with
// stock 400 showed as 400.000. ingredient.stock is DECIMAL(10,4), so the API
// returns "400.0000"; printed raw it reads as four hundred thousand, and the
// edit form's digit-only filter turned it into 4000000.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("id=7"), jest.fn()]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));
let mockCookies = { user: { id: 1, roleType: "admin", store: "1" } };
jest.mock("react-cookie", () => ({
  useCookies: () => [mockCookies]
}));
// Render every tab panel so the stock field is reachable without driving
// Radix's pointer events.
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <button type="button">{children}</button>,
  TabsContent: ({ children }) => <div>{children}</div>
}));
jest.mock("@/services/ingredient", () => ({
  getIngredientById: jest.fn(),
  editIngredient: jest.fn(),
  getProductNamesByFilters: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/supplier", () => ({
  getAllSupplier: jest.fn(() =>
    Promise.resolve({ data: [{ id: 3, name: "PT Daging", status: "active", products: [] }] })
  )
}));
jest.mock("@/services/ingredientCategory", () => ({
  getAllIngredientCategory: jest.fn(() =>
    Promise.resolve({ data: [{ id: 4, name: "Daging", status: "active" }] })
  )
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [{ id: 1, name: "Toko Bakso" }] }))
}));

const saved = {
  id: 7,
  name: "Daging Sapi",
  supplier: 3,
  category: 4,
  // A carton of 24 — the unit's default hint is ×50, which must not replace it.
  unit: "karton",
  baseUnit: "pcs",
  conversionFactor: "24.0000",
  stock: "12.0000",
  minStock: 2,
  costPrice: 120000,
  status: "active",
  store: 1
};

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EditIngredient />
    </QueryClientProvider>
  );

describe.each([
  ["store admin", { id: 1, roleType: "admin", store: "1" }],
  ["single-store super admin (bakso_admin)", { id: 16, roleType: "super_admin", store: null }]
])("Edit ingredient opens with its saved values — %s", (_, user) => {
  beforeEach(() => {
    mockCookies = { user };
    getIngredientById.mockResolvedValue({ data: saved });
  });

  test("name, unit and prices stay filled after loading", async () => {
    renderPage();
    expect(await screen.findByDisplayValue("Daging Sapi")).toBeInTheDocument();
    // Give the follow-up renders (store/supplier/category watchers) a chance.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByDisplayValue("Daging Sapi")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByDisplayValue("120.000")).toBeInTheDocument());
    // Supplier and category keep their saved picks (not the placeholders).
    const pickers = screen.getAllByRole("combobox").map((el) => el.textContent);
    expect(pickers).toContain("PT Daging");
    expect(pickers).toContain("Daging");
    expect(pickers.join(" ")).not.toMatch(/supplierPlaceholder|categoryPlaceholder/);
    // The saved conversion (karton = 24 pcs) is not replaced by the hint (50).
    expect(screen.getByDisplayValue("24")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("50")).toBeNull();
  });
});

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import EditIngredient from "../page/ingredient/EditIngredient";
import { getIngredientById } from "@/services/ingredient";

// The dependent resets still follow the user's own changes after the fix
// for /edit-ingredient opening with its fields cleared.
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
// A native <select> per Combobox (named by its placeholder) to drive picks.
jest.mock("@/components/ui/combobox", () => ({
  Combobox: ({ options, value, onChange, placeholder }) => (
    <select aria-label={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="" />
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
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
  getAllLocation: jest.fn(() =>
    Promise.resolve({
      data: [
        { id: 1, name: "Toko Bakso" },
        { id: 2, name: "Toko Dua" }
      ]
    })
  )
}));

const saved = {
  id: 7,
  name: "Daging Sapi",
  supplier: 3,
  category: 4,
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

beforeEach(() => getIngredientById.mockResolvedValue({ data: saved }));

test("changing the unit applies its conversion hint", async () => {
  mockCookies = { user: { id: 1, roleType: "admin", store: "1" } };
  renderPage();
  expect(await screen.findByDisplayValue("24")).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue("page.ingredient.form.unitKarton"), {
    target: { value: "lusin" }
  });
  await waitFor(() => expect(screen.getByDisplayValue("12")).toBeInTheDocument());
});

test("changing the store clears supplier, category and name", async () => {
  mockCookies = { user: { id: 16, roleType: "super_admin", store: null } };
  renderPage();
  expect(await screen.findByDisplayValue("Daging Sapi")).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue("Toko Bakso"), { target: { value: "2" } });
  await waitFor(() => expect(screen.queryByDisplayValue("Daging Sapi")).toBeNull());
  expect(screen.queryByDisplayValue("PT Daging")).toBeNull();
});

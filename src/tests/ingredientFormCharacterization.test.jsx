import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddIngredient from "../page/ingredient/AddIngredient";
import EditIngredient from "../page/ingredient/EditIngredient";
import {
  addIngredient,
  editIngredient,
  getIngredientById,
  getProductNamesByFilters
} from "../services/ingredient";
import { getAllSupplier } from "../services/supplier";

// first, and the form offers an explicit choice between "Tanpa supplier"
// (market / in-house: no supplier field, the name is typed in) and "Dari
// supplier" (supplier required, the name can come from its catalog).

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
let mockUser = { id: 1, roleType: "admin", store: 1 };
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: mockUser }]
}));
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <button type="button">{children}</button>,
  TabsContent: ({ children }) => <div>{children}</div>
}));
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ options, onChange, placeholder, disabled }) {
    return (
      <div data-testid={placeholder} data-disabled={!!disabled}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
}));
// Skip the confirm dialog: a valid submit saves straight away.
jest.mock("@/hooks/useConfirmSubmit", () => ({
  useConfirmSubmit: (form, onConfirm) => ({
    handleSubmit: form.handleSubmit((values) => onConfirm(values)),
    confirmModal: () => ({ open: false })
  })
}));
jest.mock("@/services/ingredient", () => ({
  addIngredient: jest.fn(),
  editIngredient: jest.fn(),
  getIngredientById: jest.fn(),
  getProductNamesByFilters: jest.fn()
}));
jest.mock("@/services/supplier", () => ({
  getAllSupplier: jest.fn()
}));
jest.mock("@/services/ingredientCategory", () => ({
  getAllIngredientCategory: jest.fn(() =>
    Promise.resolve({ data: [{ id: 3, name: "Bahan Bakso", status: "active" }] })
  )
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: undefined, isLoading: false })
}));

const renderPage = (Page = AddIngredient) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 1, roleType: "admin", store: 1 };
  getAllSupplier.mockResolvedValue({
    data: [{ id: 5, name: "PT Daging Segar", status: "active" }]
  });
  getProductNamesByFilters.mockResolvedValue({ data: [] });
  addIngredient.mockResolvedValue({ success: true });
});

const seeded = {
  id: 7,
  name: "Daging Sapi",
  supplier: 5,
  category: 3,
  unit: "kg",
  baseUnit: "gram",
  conversionFactor: "1000",
  stock: "12",
  minStock: 2,
  costPrice: 120000,
  status: "active",
  store: 1
};

const pickCategoryAndName = async (name = "Bakso Halus") => {
  const categoryBox = await screen.findByTestId("page.ingredient.form.categoryPlaceholder");
  fireEvent.click(await within(categoryBox).findByText("Bahan Bakso"));
  fireEvent.change(screen.getByPlaceholderText("page.ingredient.form.nameFreePlaceholder"), {
    target: { value: name }
  });
};

// UX audit #12 (ingredient pair), step A: pins down exactly what Tambah and
// Edit Bahan Baku send, before the two forms share their fields. These must
// pass unchanged after that refactor. Source (with/without supplier),
// hydration and store/unit side effects are pinned in
// ingredientWithoutSupplier, editIngredientHydration and
// editIngredientUserChanges.
describe("AddIngredient — characterization", () => {
  test("a new ingredient is sent with exactly these fields", async () => {
    renderPage();
    await pickCategoryAndName();
    fireEvent.click(screen.getByText("page.ingredient.form.saveButton"));
    await waitFor(() => expect(addIngredient).toHaveBeenCalledTimes(1));
    expect(addIngredient.mock.calls[0][0]).toEqual({
      name: "Bakso Halus",
      supplier: null,
      category: 3,
      unit: "pcs",
      baseUnit: "pcs",
      conversionFactor: "1",
      stock: 0,
      minStock: 0,
      costPrice: 0,
      isActive: true,
      store: 1,
      status: "active"
    });
  });

  test("switched off, it is sent as inactive", async () => {
    renderPage();
    await pickCategoryAndName();
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("page.ingredient.form.saveButton"));
    await waitFor(() => expect(addIngredient).toHaveBeenCalledTimes(1));
    expect(addIngredient.mock.calls[0][0]).toMatchObject({ isActive: false, status: "inactive" });
  });

  test("a draft is sent as status draft, without a store", async () => {
    renderPage();
    await pickCategoryAndName();
    fireEvent.click(screen.getByText("common.saveAsDraft"));
    fireEvent.click(await screen.findByText("common.yesSaveDraft"));
    await waitFor(() => expect(addIngredient).toHaveBeenCalledTimes(1));
    expect(addIngredient.mock.calls[0][0]).toMatchObject({
      name: "Bakso Halus",
      status: "draft",
      store: null
    });
  });
});

describe("EditIngredient — characterization", () => {
  test("a rename sends the loaded values back, without stock", async () => {
    getIngredientById.mockResolvedValue({ data: seeded });
    editIngredient.mockResolvedValue({ success: true });
    renderPage(EditIngredient);
    fireEvent.change(await screen.findByDisplayValue("Daging Sapi"), {
      target: { value: "Daging Sapi Has" }
    });
    fireEvent.click(screen.getByText("page.ingredient.form.saveButton"));
    await waitFor(() => expect(editIngredient).toHaveBeenCalledTimes(1));
    const [id, payload] = editIngredient.mock.calls[0];
    expect(String(id)).toBe("7");
    expect(payload).toMatchObject({
      name: "Daging Sapi Has",
      supplier: 5,
      category: 3,
      unit: "kg",
      baseUnit: "gram",
      minStock: 2,
      costPrice: 120000,
      isActive: true,
      store: 1,
      status: "active"
    });
    expect(Number(payload.conversionFactor)).toBe(1000);
    expect(payload).not.toHaveProperty("stock");
  });

  test("an inactive ingredient stays inactive when saved", async () => {
    getIngredientById.mockResolvedValue({ data: { ...seeded, status: "inactive" } });
    editIngredient.mockResolvedValue({ success: true });
    renderPage(EditIngredient);
    await screen.findByDisplayValue("Daging Sapi");
    fireEvent.click(screen.getByText("page.ingredient.form.saveButton"));
    await waitFor(() => expect(editIngredient).toHaveBeenCalledTimes(1));
    expect(editIngredient.mock.calls[0][1]).toMatchObject({ isActive: false, status: "inactive" });
  });
});

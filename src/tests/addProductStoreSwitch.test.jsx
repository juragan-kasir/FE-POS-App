import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddProduct from "../page/product/AddProduct";
import { getAllCategoryActive } from "@/services/category";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams(""), jest.fn()]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { roleType: "super_admin", store: "A1" } }]
}));

// The product form's inventory-item picker (BRD phase 3) loads ingredients.
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(() => Promise.resolve({ data: [] })),
  addIngredient: jest.fn()
}));
jest.mock("@/services/product", () => ({
  addProduct: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
  getIngredients: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/stock", () => ({
  checkStockOpnameExists: jest.fn(() => Promise.resolve({ data: { exists: true } }))
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/tax-config", () => ({
  getAllTaxConfig: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/hooks/useUnsavedChanges", () => ({ useUnsavedChanges: jest.fn() }));

jest.mock(
  "@/components/organism/UserGuide",
  () =>
    function UserGuideStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/organism/MissingFieldsModal",
  () =>
    function MissingFieldsModalStub() {
      return null;
    }
);
jest.mock(
  "../page/product/ProductPreview",
  () =>
    function ProductPreviewStub() {
      return null;
    }
);
jest.mock(
  "@/components/organism/ProductImageGallery",
  () =>
    function ProductImageGalleryStub() {
      return <div />;
    }
);

// A minimal controllable stub: exposes buttons that call onChange with a
// specific store array, standing in for the real store-picker UI.
jest.mock(
  "@/components/organism/StoreSelectCard",
  () =>
    function StoreSelectCardStub({ onChange }) {
      return (
        <div>
          <button type="button" onClick={() => onChange(["A1"])}>
            pick-store-A
          </button>
          <button type="button" onClick={() => onChange(["B1"])}>
            pick-store-B
          </button>
        </div>
      );
    }
);

// IMPORTANT: this is deliberately NOT a native <select>. An earlier version
// of this test used one, and it accidentally "passed" even with the real
// fix reverted — a native <select whose value doesn't match any <option>
// falls back to a blank display on its own, which coincidentally LOOKS
// like the field got reset even when the underlying react-hook-form
// `field.value` still silently holds the stale id. This stub exposes
// `field.value` directly via a data attribute so the test observes the
// actual form state the reset effect writes to, not an unrelated native
// <select> rendering quirk.
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ options, value, onChange, placeholder }) {
    return (
      <div data-testid={placeholder} data-field-value={value ?? ""}>
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
}));

jest.mock("@/services/category", () => ({
  getAllCategoryActive: jest.fn()
}));

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AddProduct />
    </QueryClientProvider>
  );
  return queryClient;
};

// Regression coverage for a real tenant/store correctness bug: the
// `category` (and `composition`) selections were never reset when
// `selectedStores` changed, so a category id belonging to Store A could
// silently survive a switch to Store B and get submitted against the
// wrong store. Reverting the `prevFirstStoreRef` effect in
// AddProduct.jsx makes the first test below fail — the category field's
// actual react-hook-form value (exposed here via data-field-value, not a
// native <select>'s own auto-blanking, which masked this exact defect in
// an earlier draft of this test) would still read "5" after switching to
// Store B.
describe("AddProduct — category selection resets on store switch", () => {
  beforeEach(() => {
    getAllCategoryActive.mockImplementation(({ location }) => {
      if (location === "A1") {
        return Promise.resolve({ data: [{ id: 5, name: "Drinks (Store A)" }] });
      }
      if (location === "B1") {
        return Promise.resolve({ data: [{ id: 9, name: "Snacks (Store B)" }] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  test("switching store clears a category selected under the previous store", async () => {
    renderPage();

    fireEvent.click(screen.getByText("pick-store-A"));

    await screen.findByTestId("page.product.form.categoryPlaceholder");
    await waitFor(() => expect(screen.getByText("Drinks (Store A)")).toBeInTheDocument());

    // Select Store A's category.
    fireEvent.click(screen.getByText("Drinks (Store A)"));
    await waitFor(() =>
      expect(screen.getByTestId("page.product.form.categoryPlaceholder")).toHaveAttribute(
        "data-field-value",
        "5"
      )
    );

    // Switch to Store B.
    fireEvent.click(screen.getByText("pick-store-B"));
    await waitFor(() => expect(screen.getByText("Snacks (Store B)")).toBeInTheDocument());

    // The stale Store A category id must not survive the switch — checking
    // the real field value, not just what options happen to be listed.
    await waitFor(() =>
      expect(screen.getByTestId("page.product.form.categoryPlaceholder")).toHaveAttribute(
        "data-field-value",
        ""
      )
    );
  });

  test("does not reset the category on first mount (only on an actual store change)", async () => {
    renderPage();

    fireEvent.click(screen.getByText("pick-store-A"));

    await screen.findByTestId("page.product.form.categoryPlaceholder");
    await waitFor(() => expect(screen.getByText("Drinks (Store A)")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Drinks (Store A)"));
    await waitFor(() =>
      expect(screen.getByTestId("page.product.form.categoryPlaceholder")).toHaveAttribute(
        "data-field-value",
        "5"
      )
    );

    // Re-picking the SAME store must not clear the selection.
    fireEvent.click(screen.getByText("pick-store-A"));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId("page.product.form.categoryPlaceholder")).toHaveAttribute(
      "data-field-value",
      "5"
    );
  });
});

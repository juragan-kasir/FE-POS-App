import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("@/services/purchase-order", () => ({ addPurchaseOrder: jest.fn() }));
jest.mock("@/services/supplier", () => ({
  getAllSupplier: jest.fn(() => Promise.resolve({ data: [{ id: 7, name: "Supplier A" }] }))
}));
jest.mock("@/services/ingredient", () => ({
  getAllIngredients: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/employee", () => ({
  getAllEmployee: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({
    data: {
      data: [
        { id: 1, name: "Toko 1" },
        { id: 2, name: "Toko 2" }
      ]
    },
    isLoading: false
  })
}));
jest.mock("@/components/organism/UserGuide", () => () => null);
// A native <select> per Combobox, named by its placeholder, keeps the picks
// deterministic without driving the cmdk popover.
jest.mock("@/components/ui/combobox", () => ({
  Combobox: ({ options, value, onChange, placeholder, disabled }) => (
    <select
      aria-label={placeholder}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}>
      <option value="" />
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: "id" } })
}));
jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ activeStoreId: "", activeStoreName: "", setActiveStore: jest.fn() })
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "super_admin", store: "" } }]
}));

import AddPurchaseOrder from "@/page/purchase-order/AddPurchaseOrder";

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AddPurchaseOrder />
      </MemoryRouter>
    </QueryClientProvider>
  );

const storeSelect = () => screen.getByLabelText("page.purchaseOrder.add.selectStore");
const supplierSelect = () => screen.getByLabelText("page.purchaseOrder.add.selectSupplier");

describe("AddPurchaseOrder store change", () => {
  test("switches store right away while no supplier or item is filled", async () => {
    renderPage();
    fireEvent.change(storeSelect(), { target: { value: "1" } });
    fireEvent.change(storeSelect(), { target: { value: "2" } });

    expect(storeSelect()).toHaveValue("2");
    expect(screen.queryByText("page.purchaseOrder.add.changeStoreTitle")).toBeNull();
  });

  test("asks before wiping a picked supplier; cancel keeps it, confirm clears it", async () => {
    renderPage();
    fireEvent.change(storeSelect(), { target: { value: "1" } });
    await waitFor(() => expect(supplierSelect()).not.toBeDisabled());
    await screen.findByRole("option", { name: "Supplier A" });
    fireEvent.change(supplierSelect(), { target: { value: "7" } });
    expect(supplierSelect()).toHaveValue("7");

    fireEvent.change(storeSelect(), { target: { value: "2" } });
    expect(await screen.findByText("page.purchaseOrder.add.changeStoreTitle")).toBeInTheDocument();
    expect(storeSelect()).toHaveValue("1");

    fireEvent.click(screen.getByRole("button", { name: "common.no" }));
    await waitFor(() =>
      expect(screen.queryByText("page.purchaseOrder.add.changeStoreTitle")).toBeNull()
    );
    expect(storeSelect()).toHaveValue("1");
    expect(supplierSelect()).toHaveValue("7");

    fireEvent.change(storeSelect(), { target: { value: "2" } });
    fireEvent.click(
      await screen.findByRole("button", { name: "page.purchaseOrder.add.changeStoreConfirm" })
    );
    await waitFor(() => expect(storeSelect()).toHaveValue("2"));
    expect(supplierSelect()).toHaveValue("");
  });
});

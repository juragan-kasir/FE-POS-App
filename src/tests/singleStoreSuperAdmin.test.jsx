import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import StoreFilter from "@/components/ui/StoreFilter";
import StoreSelectCard from "@/components/organism/StoreSelectCard";

// A super_admin with exactly one store has nothing to choose: the header
// shows the store instead of a switcher, list filters disappear, and form
// store pickers fill themselves — without turning a "Semua Toko" record
// (global, also covers stores added later) into a single-store one.

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));

const mockLocations = { list: [] };
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: mockLocations.list } })
}));
jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({
    activeStoreId: "",
    activeStoreName: "",
    setActiveStore: jest.fn(),
    isSuperAdmin: true
  })
}));

const ONE = [{ id: 7, name: "Warung Pusat" }];
const TWO = [...ONE, { id: 8, name: "Cabang Timur" }];
const t = (k) => k;

const card = (props) => (
  <StoreSelectCard
    locations={ONE}
    selectedStores={[]}
    onChange={jest.fn()}
    isSuperAdmin
    t={t}
    navigate={jest.fn()}
    storeInfoLabel="Toko:"
    {...props}
  />
);

test("the list store filter is hidden with one store and shown with two", () => {
  const { container, rerender } = render(
    <StoreFilter locations={ONE} isSuperAdmin onChange={jest.fn()} t={t} />
  );
  expect(container).toBeEmptyDOMElement();
  rerender(<StoreFilter locations={TWO} isSuperAdmin onChange={jest.fn()} t={t} />);
  expect(container).not.toBeEmptyDOMElement();
});

test("a form store picker selects the only store by itself", async () => {
  const onChange = jest.fn();
  render(card({ onChange }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith([7]));
  expect(screen.getByText("Warung Pusat")).toBeInTheDocument();
  expect(screen.queryByText("page.category.form.storeSection.specificTab")).toBeNull();
});

test("a record set to all stores keeps that meaning", () => {
  const onChange = jest.fn();
  render(card({ onChange, allStores: true }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByText("page.category.form.storeSection.allStores")).toBeInTheDocument();
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DataTable from "../components/ui/DataTable";
import TableToolbar from "../components/ui/TableToolbar";

// UX #12: an empty list says whether nothing exists yet (and offers to add
// one) or whether the filters matched nothing (and offers to reset them).

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

const columns = [{ header: "Nama", accessor: "name" }];

test("no data yet: message plus the add action", () => {
  const onAdd = jest.fn();
  render(
    <DataTable
      columns={columns}
      data={[]}
      emptyAction={{ label: "Tambah Produk", onClick: onAdd }}
      toolbar={<TableToolbar onReset={jest.fn()} isFiltered={false} />}
    />
  );
  expect(screen.getByText("common.noData")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Tambah Produk/ }));
  expect(onAdd).toHaveBeenCalled();
});

test("filters matched nothing: says so and resets, without the add action", () => {
  const onReset = jest.fn();
  render(
    <DataTable
      columns={columns}
      data={[]}
      emptyAction={{ label: "Tambah Produk", onClick: jest.fn() }}
      toolbar={<TableToolbar onReset={onReset} isFiltered />}
    />
  );
  expect(screen.getByText("dataTable.noMatchTitle")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Tambah Produk/ })).toBeNull();
  // The toolbar has its own reset; the empty state offers one in place.
  const resets = screen.getAllByRole("button", { name: /common.resetFilter/ });
  fireEvent.click(resets.at(-1));
  expect(onReset).toHaveBeenCalled();
});

test("no action without emptyAction (e.g. no permission to add)", () => {
  render(<DataTable columns={columns} data={[]} />);
  expect(screen.getByText("common.noData")).toBeInTheDocument();
  expect(screen.queryByRole("button")).toBeNull();
});

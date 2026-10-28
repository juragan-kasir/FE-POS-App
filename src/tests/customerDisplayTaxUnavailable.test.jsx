import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import CustomerDisplayBoard from "../page/customer-display-board";
import { CART_MIRROR_KEY } from "../utils/customerDisplayBoard";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (typeof opts === "string" ? opts : k) })
}));

jest.mock("@/state/theme", () => ({
  useThemeStore: () => ({ toggleTheme: jest.fn() })
}));

jest.mock("@/hooks/useThemeEffect", () => ({
  useThemeEffect: jest.fn()
}));

jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: [] } })
}));

beforeAll(() => {
  document.documentElement.requestFullscreen = jest.fn(() => Promise.resolve());
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    CART_MIRROR_KEY,
    JSON.stringify({
      items: [{ cartKey: "1_", nameProduct: "Kopi", count: 1, totalPrice: 10000 }],
      subtotal: 10000,
      taxRate: null,
      taxAmount: null,
      total: null,
      taxUnavailable: true,
      totalItems: 1,
      tableName: ""
    })
  );
});

test("the customer sees an unavailable total instead of a zero-tax promise", () => {
  render(
    <MemoryRouter initialEntries={["/?store=1"]}>
      <CustomerDisplayBoard />
    </MemoryRouter>
  );

  expect(screen.getByText("page.customerDisplayBoard.taxUnavailable")).toBeInTheDocument();
  expect(screen.getByText("page.customerDisplayBoard.totalPending")).toBeInTheDocument();
  expect(screen.getAllByText("—").length).toBeGreaterThan(0);
});

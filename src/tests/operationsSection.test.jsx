import React from "react";
import fs from "fs";
import { render, screen } from "@testing-library/react";
import OperationsSection from "@/components/dashboard-super-admin/OperationsSection";

// Resolve keys against the runtime dictionary (public/locales) so assertions
// use the real ID copy users see.
const RUNTIME_ID = JSON.parse(fs.readFileSync("public/locales/id/translation.json", "utf8"));
const mockLocale = new Map(Object.entries(RUNTIME_ID));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      const v = mockLocale.get(k);
      if (typeof v !== "string") return k;
      return v.replace(/{{\s*(\w+)\s*}}/g, (m, name) =>
        opts && opts[name] != null ? String(opts[name]) : m
      );
    },
    i18n: { language: "id" }
  })
}));

describe("OperationsSection", () => {
  test("renders only known production statuses with a positive count", () => {
    const { container } = render(
      <OperationsSection
        operations={{
          production: { draft: 0, in_progress: 2, completed: 1 },
          lowStockItems: [],
          lowStockCount: 0,
          stockValue: 1000000,
          cashRegister: { open: 1, closed: 0 },
          queueWaiting: 2,
          reservationsToday: 1
        }}
      />
    );
    expect(screen.getByText(/Berjalan/)).toBeTruthy();
    expect(screen.getByText(/Selesai/)).toBeTruthy();
    expect(container.textContent).not.toContain("Draft:");
  });

  test("does not render unknown/prototype status keys and does not crash", () => {
    const production = {};
    Object.defineProperty(production, "__proto__", {
      value: 5,
      enumerable: true,
      configurable: true
    });
    production.constructor = 3;

    const { container } = render(
      <OperationsSection
        operations={{
          production,
          lowStockItems: [],
          lowStockCount: 0,
          stockValue: 0,
          cashRegister: { open: 0, closed: 0 },
          queueWaiting: 0,
          reservationsToday: 0
        }}
      />
    );
    expect(screen.getByText("Tidak ada")).toBeTruthy();
    expect(container.textContent).not.toContain("undefined");
  });

  test("renders an empty state when no operations data is provided", () => {
    render(<OperationsSection operations={undefined} />);
    expect(screen.getByText("Semua stok aman")).toBeTruthy();
  });
});

/* global __dirname */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Boxes } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { matchRouteTips } from "@/lib/page-tips";

// Findings from the 10-30 browser check of development.

const readLocale = (lng) =>
  JSON.parse(
    fs.readFileSync(path.resolve(__dirname, `../../public/locales/${lng}/translation.json`), "utf8")
  );
const ID = readLocale("id");
const EN = readLocale("en");

const cardOf = (label) => screen.getByText(label).closest("div").parentElement;

describe("StatCard: alert cards don't alarm on zero", () => {
  test.each(["inactive", "draft", "red", "expiring", "warning"])(
    "%s with 0 renders neutral",
    (variant) => {
      render(<StatCard label="L" value={0} icon={Boxes} variant={variant} />);
      expect(cardOf("L").className).toMatch(/\bbg-muted\b/);
    }
  );

  test("a formatted zero ('Rp 0') is a zero too", () => {
    render(<StatCard label="L" value="Rp 0" icon={Boxes} variant="inactive" />);
    expect(cardOf("L").className).toMatch(/\bbg-muted\b/);
  });

  test("a non-zero inactive card is a red tint, not a solid block", () => {
    render(<StatCard label="L" value={3} icon={Boxes} variant="inactive" />);
    const cls = cardOf("L").className;
    expect(cls).toMatch(/\bbg-red-50\b/);
    expect(cls).toMatch(/dark:bg-red-950/);
    expect(cls).not.toMatch(/\bbg-red-600\b/);
  });

  test("'warning' is a real variant (it used to fall back to default)", () => {
    render(<StatCard label="L" value={2} icon={Boxes} variant="warning" />);
    expect(cardOf("L").className).toMatch(/\bbg-amber-50\b/);
  });
});

describe("cashier labels", () => {
  test("every page.cashier key used by the cashier resolves in id and en", () => {
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        return e.isDirectory() ? walk(full) : /\.jsx?$/.test(e.name) ? [full] : [];
      });
    const keys = new Set();
    for (const file of walk(path.resolve(__dirname, "../page/cashier"))) {
      for (const m of fs
        .readFileSync(file, "utf8")
        .matchAll(/\bt\(\s*"(page\.cashier\.[\w.]+)"/g)) {
        keys.add(m[1]);
      }
    }
    const missing = [...keys].filter((k) => !(k in ID) || !(k in EN));
    expect(missing).toEqual([]);
  });

  test("parking, order type and queue labels are Indonesian", () => {
    expect(ID["page.cashier.parkCart"]).toBe("Tahan Keranjang");
    expect(ID["page.cashier.modal.orderType"]).toBe("Tipe Pesanan");
    expect(ID["page.cashier.modal.dineIn"]).toBe("Makan di Tempat");
    expect(ID["page.cashier.modal.takeAway"]).toBe("Bawa Pulang");
    expect(ID["page.cashier.orderQueue.table"]).toBe("Meja");
  });
});

describe("route tips", () => {
  const tipsKeys = {
    "/expense": ["tips.expense"],
    "/product": ["tips.product"],
    "/detail-product": ["tips.product"]
  };

  test("own path and sub-paths match", () => {
    expect(matchRouteTips(tipsKeys, "/expense")).toEqual(["tips.expense"]);
    expect(matchRouteTips(tipsKeys, "/detail-product/19")).toEqual(["tips.product"]);
  });

  test("a mere prefix doesn't (404 pages and unrelated routes)", () => {
    expect(matchRouteTips(tipsKeys, "/expense-list")).toBeUndefined();
    expect(matchRouteTips(tipsKeys, "/production-order")).toBeUndefined();
  });
});

test("the expense page is called Pengeluaran, like its menu", () => {
  expect(ID["page.expense.list.title"]).toBe("Pengeluaran");
  expect(ID["page.expense.button.add"]).toBe("Tambah Pengeluaran");
  const biaya = Object.entries(ID).filter(
    ([k, v]) => k.startsWith("page.expense.") && /\bbiaya\b/i.test(v)
  );
  expect(biaya).toEqual([]);
});

/* global __dirname */
import fs from "fs";
import path from "path";

// Phone/tablet layout guards. Dialogs used to run edge to edge on phones
// (w-full), and stat-card grids stayed 3–4 columns wide on a 375px screen.

const SRC = path.resolve(__dirname, "..");

// Grids that stay multi-column on purpose: small option/tile pickers, step
// tabs, photo thumbnails, the kitchen screen (large display only), and
// scaled previews.
const COMPACT_ON_PURPOSE = new Set([
  "page/category/AddCategory.jsx", // quick icon tiles
  "page/category/EditCategory.jsx",
  "page/product/AddProduct.jsx", // 3 step tabs
  "page/product/EditProduct.jsx",
  "page/goods-receipt/EditGoodsReceipt.jsx", // photo thumbnails
  "page/invoice/InvoicePage.jsx", // 3-option segmented pickers
  "page/kitchen-display/index.jsx",
  "components/ui/time-picker.jsx",
  "components/report/ReportPreview.jsx"
]);

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "tests" ? [] : walk(full);
    return /\.jsx$/.test(entry.name) ? [full] : [];
  });

test("dialogs keep a gutter on phones", () => {
  const dialog = fs.readFileSync(path.join(SRC, "components/ui/dialog.jsx"), "utf8");
  const content = dialog.slice(dialog.indexOf("const DialogContent"));
  expect(content).toMatch(/w-\[calc\(100%-2rem\)\] max-w-lg/);
  expect(content.slice(0, content.indexOf("{...props}"))).not.toMatch(/\bw-full\b/);
});

test("3–6 column grids collapse on small screens", () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file);
    if (COMPACT_ON_PURPOSE.has(rel)) continue;
    const code = fs.readFileSync(file, "utf8");
    for (const m of code.matchAll(/className="([^"]*)"/g)) {
      const cls = m[1];
      if (!/(?<![\w:-])grid-cols-[3-6](?![\w-])/.test(cls)) continue;
      // Responsive at a breakpoint, or inside a scrolling min-width strip.
      if (/(sm|md|lg|xl|desk):grid-cols-/.test(cls) || /min-w-\[/.test(cls)) continue;
      offenders.push(`${rel}:${code.slice(0, m.index).split("\n").length}`);
    }
  }
  expect(offenders).toEqual([]);
});

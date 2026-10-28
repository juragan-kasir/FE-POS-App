/* global __dirname */
import fs from "fs";
import path from "path";

// Screen text is at least 12px (text-xs). 741 uses of text-[8–11px] across
// 151 files made labels, table meta and badges hard to read on the POS
// screens. Allowed below 12px: the customer-app phone mockups and paper
// previews (scaled simulations), and a count inside a fixed 16–20px circle.

const SRC = path.resolve(__dirname, "..");
const SCALED_PREVIEWS = new Set([
  "page/product/ProductPreview.jsx",
  "page/category/CategoryPreviewModal.jsx",
  "components/document/SpdDocument.jsx",
  "components/report/ReportPreview.jsx"
]);
const FIXED_BADGE =
  /(?<![\w-])[hw]-[345](?:\.5)?(?![\w.-]).*(?<![\w-])[hw]-[345](?:\.5)?(?![\w.-])|min-w-\[1[0-8]px\]|h-\[1[0-8]px\]/;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "tests" ? [] : walk(full);
    return /\.jsx?$/.test(entry.name) ? [full] : [];
  });

test("no screen text below 12px outside scaled previews and count badges", () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file);
    if (SCALED_PREVIEWS.has(rel)) continue;
    fs.readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/text-\[(8|9|10|11)px\]/.test(line) && !FIXED_BADGE.test(line)) {
          offenders.push(`${rel}:${i + 1}`);
        }
      });
  }
  expect(offenders).toEqual([]);
});

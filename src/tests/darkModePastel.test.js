/* eslint-disable no-undef */
import fs from "fs";
import path from "path";
import { buttonVariants } from "@/components/ui/button";

// Light pastel backgrounds (bg-*-50/100/200) render as bright blocks in dark
// mode unless the same class string also sets a dark: background. Printed
// documents and previews of printed output are light by design.

const SRC = path.join(__dirname, "..");
const PASTEL =
  /(?<![\w:-])(?:hover:)?bg-(red|green|blue|amber|emerald|yellow|orange|purple|violet|rose|sky|indigo|teal|cyan|pink|lime|gray|slate)-(50|100|200)\b/;
const EXEMPT = /\/(tests|document)\/|Preview|thermal|print/i;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.jsx$/.test(e.name) ? [full] : [];
  });

test("pastel backgrounds also define a dark-mode background", () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    if (EXEMPT.test(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:className|class)=\{?[`"]([^`"]*)[`"]/g)) {
      const tokens = m[1].split(/\s+/);
      const plain = tokens.some((t) => PASTEL.test(t) && !t.startsWith("hover:"));
      const hover = tokens.some((t) => PASTEL.test(t) && t.startsWith("hover:"));
      const missing =
        (plain && !tokens.some((t) => t.startsWith("dark:bg-"))) ||
        (hover && !tokens.some((t) => t.startsWith("dark:hover:bg-")));
      if (missing) {
        offenders.push(`${path.relative(SRC, file)}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});

test("tinted button variants have dark-mode colors", () => {
  for (const variant of ["danger", "general", "import", "draft"]) {
    expect(buttonVariants({ variant })).toMatch(/dark:bg-/);
  }
});

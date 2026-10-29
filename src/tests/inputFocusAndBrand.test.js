/* global __dirname, require */
import fs from "fs";
import path from "path";
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// Brand: the primary color is emerald-700 (emerald-500 on dark), and the icon
// inside an input turns emerald-600 while the input has focus.

const SRC = path.resolve(__dirname, "..");
const INPUTS = new Set(["input", "Input", "textarea", "Textarea", "CurrencyInput", "DateInput"]);

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "tests" ? [] : walk(full);
    return /\.jsx$/.test(e.name) ? [full] : [];
  });

const classOf = (opening) => {
  const attr = opening.attributes.find((a) => a.name?.name === "className");
  if (!attr) return "";
  if (attr.value?.type === "StringLiteral") return attr.value.value;
  const e = attr.value?.expression;
  if (e?.type === "StringLiteral") return e.value;
  if (e?.type === "TemplateLiteral") return e.quasis.map((q) => q.value.cooked).join(" ");
  return "<expr>";
};

test("primary is emerald-700 (emerald-500 on dark)", () => {
  const css = fs.readFileSync(path.join(SRC, "index.css"), "utf8");
  const light = css.slice(0, css.indexOf(".dark {"));
  const dark = css.slice(css.indexOf(".dark {"));
  expect(light).toMatch(/--primary: 163 94% 24%;/);
  expect(dark).toMatch(/--primary: 160 84% 39%;/);
});

test("an icon inside an input turns emerald-600 on focus", () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    const ast = parser.parse(fs.readFileSync(file, "utf8"), {
      sourceType: "module",
      plugins: ["jsx"],
      errorRecovery: true
    });
    traverse(ast, {
      JSXElement(p) {
        const kids = p.node.children.filter((c) => c.type === "JSXElement");
        if (!kids.some((k) => INPUTS.has(k.openingElement.name.name))) return;
        for (const k of kids) {
          const name = k.openingElement.name.name || "";
          const cls = classOf(k.openingElement);
          if (!/^[A-Z]/.test(name) || INPUTS.has(name) || !/(^|\s)absolute(\s|$)/.test(cls))
            continue;
          const groupOk = /(^|\s)group(\s|$)/.test(classOf(p.node.openingElement));
          if (!groupOk || !cls.includes("group-focus-within:text-emerald-600")) {
            offenders.push(`${path.relative(SRC, file)}:${k.loc.start.line} ${name}`);
          }
        }
      }
    });
  }
  expect(offenders).toEqual([]);
});

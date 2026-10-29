/* global __dirname */
import fs from "fs";
import path from "path";

// Raw <button>s (tiles, chips, icon buttons that don't use the Button
// component) need an explicit type — inside a form the default is "submit" —
// and icon-only ones need an accessible name.

const SRC = path.resolve(__dirname, "..");

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "tests" ? [] : walk(full);
    return entry.name.endsWith(".jsx") ? [full] : [];
  });

// Opening tag + body of every raw <button>, with JSX braces balanced.
const rawButtons = (source) => {
  const found = [];
  const re = /<button\b/g;
  let m;
  while ((m = re.exec(source))) {
    let i = m.index + m[0].length;
    let depth = 0;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const end = source.indexOf("</button>", i);
    found.push({
      tag: source.slice(m.index, i + 1),
      body: source.slice(i + 1, end),
      line: source.slice(0, m.index).split("\n").length
    });
  }
  return found;
};

const isIconOnly = (body) => {
  if (body.includes("sr-only")) return false;
  const withoutIcons = body
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<[A-Z]\w*(?:\s[^<>]*?)?\/>/g, "")
    .replace(/<\/?\w+[^>]*>/g, "");
  return withoutIcons.trim() === "";
};

const files = walk(SRC);

test("every raw <button> declares its type", () => {
  const offenders = files.flatMap((file) =>
    rawButtons(fs.readFileSync(file, "utf8"))
      .filter(({ tag }) => !/\stype=/.test(tag) && !tag.includes("{..."))
      .map(({ line }) => `${path.relative(SRC, file)}:${line}`)
  );
  expect(offenders).toEqual([]);
});

test("icon-only raw <button>s have an accessible name", () => {
  const offenders = files.flatMap((file) =>
    rawButtons(fs.readFileSync(file, "utf8"))
      .filter(
        ({ tag, body }) =>
          !/aria-label|aria-labelledby|title=|\{\.\.\./.test(tag) && isIconOnly(body)
      )
      .map(({ line }) => `${path.relative(SRC, file)}:${line}`)
  );
  expect(offenders).toEqual([]);
});

/* global __dirname */
import fs from "fs";
import path from "path";

const ROUTES_DIR = path.resolve(__dirname, "../routes");
const PAGES_DIR = path.resolve(__dirname, "../page");

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (full.endsWith(".jsx")) out.push(full);
  }
  return out;
};

const routePaths = new Set(
  fs.readdirSync(ROUTES_DIR).flatMap((file) => {
    const source = fs.readFileSync(path.join(ROUTES_DIR, file), "utf8");
    return [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
  })
);

const lineAt = (source, index) => source.slice(0, index).split("\n").length;

const deadLinks = [];
for (const file of walk(PAGES_DIR)) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(path.resolve(__dirname, ".."), file);

  for (const match of source.matchAll(/backLink="(\/[^"]*)"/g)) {
    if (!routePaths.has(match[1])) {
      deadLinks.push(`${relative}:${lineAt(source, match.index)} backLink="${match[1]}"`);
    }
  }

  for (const match of source.matchAll(/href:\s*"(\/[^"]*)"/g)) {
    if (!routePaths.has(match[1])) {
      deadLinks.push(`${relative}:${lineAt(source, match.index)} href="${match[1]}"`);
    }
  }

  for (const match of source.matchAll(/navigate\(\s*[`"'](\/[^`"'$]*)[`"']\s*\)/g)) {
    const target = match[1].split("?")[0].split("#")[0];
    if (!routePaths.has(target)) {
      deadLinks.push(`${relative}:${lineAt(source, match.index)} navigate("${match[1]}")`);
    }
  }
}

describe("navigation targets", () => {
  test("every literal backLink, breadcrumb href, and static navigate points to a declared route", () => {
    expect(deadLinks).toEqual([]);
  });
});

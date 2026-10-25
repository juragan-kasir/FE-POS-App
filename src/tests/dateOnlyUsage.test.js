/* global __dirname */
import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(__dirname, "..");
const SCAN_DIRS = ["page", "utils"];

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
};

const DATE_ONLY_PATTERNS = [
  /toISOString\(\)[\s\S]{0,20}\.split\(\s*["']T["']\s*\)\s*\[\s*0\s*\]/,
  /toISOString\(\)[\s\S]{0,20}\.slice\(\s*0\s*,\s*10\s*\)/
];

const lineAt = (source, index) => source.slice(0, index).split("\n").length;

const offenders = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(SRC_DIR, dir))) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of DATE_ONLY_PATTERNS) {
      for (const match of source.matchAll(new RegExp(pattern.source, "g"))) {
        offenders.push(
          `${path.relative(SRC_DIR, file)}:${lineAt(source, match.index)} ${match[0].trim()}`
        );
      }
    }
  }
}

describe("date-only payloads", () => {
  test("no page or util derives a calendar date by converting through UTC", () => {
    expect(offenders).toEqual([]);
  });
});

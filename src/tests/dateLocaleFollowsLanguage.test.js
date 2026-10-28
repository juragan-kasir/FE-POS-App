/* global __dirname */
import fs from "fs";
import path from "path";
import i18next from "i18next";
import { dateLocale } from "@/lib/locale";

// Dates and times used to be formatted with a hardcoded "id-ID", so an
// English UI still showed "29 Okt 2026". They now read dateLocale(); money
// and quantities keep the Indonesian format. Printed documents keep theirs.

afterEach(() => i18next.changeLanguage("id"));

test("dateLocale follows the active language", async () => {
  expect(dateLocale()).toBe("id-ID");
  await i18next.changeLanguage("en");
  expect(dateLocale()).toBe("en-US");
});

const SRC = path.resolve(__dirname, "..");
const PRINT_DIRS = ["components/document", "components/receipt", "components/report"];
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "tests" ? [] : walk(full);
    return /\.jsx?$/.test(e.name) ? [full] : [];
  });

test("no screen date is formatted with a hardcoded id-ID", () => {
  const offenders = walk(SRC)
    .filter((f) => !PRINT_DIRS.some((d) => path.relative(SRC, f).startsWith(d)))
    .flatMap((f) =>
      fs
        .readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => [line, i])
        .filter(([line]) => /toLocale(Date|Time)String\(\s*"id-ID"/.test(line))
        .map(([, i]) => `${path.relative(SRC, f)}:${i + 1}`)
    );
  expect(offenders).toEqual([]);
});

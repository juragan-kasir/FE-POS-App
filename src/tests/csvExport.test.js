import { toCsv } from "@/lib/csv";

// User List "Ekspor CSV" had no handler; it now exports the loaded rows
// through toCsv. Cells are quoted when needed and a leading = + - @ is
// neutralised so a spreadsheet does not run it as a formula.

const columns = [
  { header: "Nama", value: (r) => r.name },
  { header: "Email", value: (r) => r.email }
];

test("header row then one line per row", () => {
  expect(toCsv([{ name: "Budi", email: "b@x.id" }], columns)).toBe("Nama,Email\r\nBudi,b@x.id");
});

test("commas, quotes and newlines are quoted", () => {
  const csv = toCsv([{ name: 'Toko "A", Pusat', email: "a\nb" }], columns);
  expect(csv.split("\r\n")[1]).toBe('"Toko ""A"", Pusat","a\nb"');
});

test("formula-looking cells are prefixed with a quote", () => {
  const csv = toCsv([{ name: "=HYPERLINK(1)", email: "@cmd" }], columns);
  expect(csv.split("\r\n")[1]).toBe("'=HYPERLINK(1),'@cmd");
});

test("missing values become empty cells", () => {
  expect(toCsv([{ name: null }], columns).split("\r\n")[1]).toBe(",");
});

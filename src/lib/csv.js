// Client-side CSV for lists whose data is already on the page.
// A cell starting with = + - @ (or tab/CR) is prefixed with ' so a
// spreadsheet shows it as text instead of running it as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// columns: [{ header, value: (row) => any }]
export const toCsv = (rows, columns) =>
  [columns.map((c) => cell(c.header)), ...rows.map((r) => columns.map((c) => cell(c.value(r))))]
    .map((line) => line.join(","))
    .join("\r\n");

// The BOM lets Excel read UTF-8 names correctly.
export const downloadCsv = (filename, csv) => {
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

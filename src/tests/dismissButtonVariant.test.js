/* eslint-disable no-undef */
import fs from "fs";
import path from "path";

// Red ("danger") marks a destructive action. Cancel / back / close / "no"
// buttons only dismiss, so they must not be red: next to a red "Batal" the
// user can't tell which button deletes. Destructive "cancel the document"
// actions (Batalkan transfer, Ya, batalkan) keep their own specific keys.

const SRC = path.join(__dirname, "..");
const DISMISS_KEY =
  /^(common\.(cancel|back|close|no)|breadcrumb\.back|.*\.(back|backButton|backToList|close|cancel|cancelButton|deleteNo|confirmPriceOverrideNo|\w+Cancel))$/;
// "Cancel" keys that cancel a record (a destructive action), not a dialog.
const DESTRUCTIVE_CANCEL = new Set([
  "page.goodsRequest.list.cancel",
  "page.stockTransfer.detail.cancel",
  "page.cashier.receipt.splitCancel"
]);
const isDismiss = (key) => DISMISS_KEY.test(key) && !DESTRUCTIVE_CANCEL.has(key);

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "tests" ? [] : walk(full);
    return /\.jsx$/.test(e.name) ? [full] : [];
  });

test("dismiss buttons are not styled as destructive", () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, "utf8");
    const re = /<Button\b[^>]*variant="danger"[^>]*>([\s\S]*?)<\/Button>/g;
    let m;
    while ((m = re.exec(src))) {
      const keys = [...m[1].matchAll(/t\(\s*"([^"]+)"/g)].map((k) => k[1]);
      if (keys.length && keys.every(isDismiss)) {
        offenders.push(`${path.relative(SRC, file)}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});

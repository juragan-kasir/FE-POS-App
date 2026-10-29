/* global __dirname */
import fs from "fs";
import path from "path";

// A <label>/<Label> either names its control through htmlFor or wraps it.
// Text that only titles a group of buttons or a read-only value is a <p>
// (with role="group" + aria-labelledby on the group), not a label.

const SRC = path.resolve(__dirname, "..");
const CONTROL =
  /<(Input|input|Textarea|textarea|select|Select|Switch|Checkbox|RadioGroupItem|Combobox)\b/;
// FormLabel (react-hook-form) binds itself through FormItem context.
const LABEL = /<(label|Label)\b/g;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "tests" ? [] : walk(full);
    return entry.name.endsWith(".jsx") ? [full] : [];
  });

const unboundLabels = (source) => {
  const found = [];
  let m;
  while ((m = LABEL.exec(source))) {
    let i = m.index + m[0].length;
    let depth = 0;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const tag = source.slice(m.index, i + 1);
    if (/htmlFor|\{\.\.\./.test(tag) || tag.endsWith("/>")) continue;
    const body = source.slice(i + 1, source.indexOf(`</${m[1]}>`, i));
    if (CONTROL.test(body)) continue;
    found.push(source.slice(0, m.index).split("\n").length);
  }
  return found;
};

test("every label is bound to a control", () => {
  const offenders = walk(SRC).flatMap((file) =>
    unboundLabels(fs.readFileSync(file, "utf8")).map(
      (line) => `${path.relative(SRC, file)}:${line}`
    )
  );
  expect(offenders).toEqual([]);
});

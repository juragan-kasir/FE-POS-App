// Bring a form field into view by its visible label, so a "required field is
// empty" notice can take the user straight to the field instead of leaving
// them to hunt for it. Labels are matched on their text (the trailing "*" of
// required fields ignored); the field is the label's `htmlFor` target, or the
// first control next to the label.

const FOCUSABLE = [
  'input:not([type="hidden"]):not([disabled])',
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[role="combobox"]',
  "button:not([disabled])"
].join(", ");

const HIGHLIGHT = ["ring-2", "ring-destructive", "ring-offset-2"];
const HIGHLIGHT_MS = 2000;

const normalize = (text) =>
  String(text || "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const controlForLabel = (label) => {
  if (label.htmlFor) {
    const target = document.getElementById(label.htmlFor);
    if (target) return target;
  }
  // The control sits beside the label, inside the same field wrapper.
  let box = label.parentElement;
  for (let depth = 0; box && depth < 3; depth += 1, box = box.parentElement) {
    const control = [...box.querySelectorAll(FOCUSABLE)].find((el) => !label.contains(el));
    if (control) return control;
  }
  return null;
};

export const findFieldByLabel = (labelText, root = document) => {
  const wanted = normalize(labelText);
  if (!wanted) return null;
  const labels = [...root.querySelectorAll("label")];
  const exact = labels.filter((l) => normalize(l.textContent) === wanted);
  const loose = labels.filter((l) => normalize(l.textContent).startsWith(wanted));
  for (const label of [...exact, ...loose]) {
    const control = controlForLabel(label);
    if (control) return control;
  }
  return null;
};

// A field inside an inactive tab isn't rendered; open the tab named `tabTitle`.
const openTab = (tabTitle) => {
  const wanted = normalize(tabTitle);
  if (!wanted) return false;
  const tab = [...document.querySelectorAll('[role="tab"]')].find((el) =>
    normalize(el.textContent).includes(wanted)
  );
  if (!tab || tab.getAttribute("aria-selected") === "true") return false;
  // Radix tabs switch on mousedown; plain tab buttons on click.
  tab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
  tab.click();
  return true;
};

const reveal = (el) => {
  el.scrollIntoView?.({ behavior: "smooth", block: "center" });
  el.focus?.({ preventScroll: true });
  el.classList.add(...HIGHLIGHT);
  setTimeout(() => el.classList.remove(...HIGHLIGHT), HIGHLIGHT_MS);
};

// Scroll to and focus the field labelled `labelText` (opening its tab first
// when needed). Returns whether a field was found; the caller falls back to
// the top of the page otherwise.
export const focusFieldByLabel = (labelText, { tabTitle } = {}) => {
  const field = findFieldByLabel(labelText);
  if (field) {
    reveal(field);
    return true;
  }
  if (openTab(tabTitle)) {
    // Let the tab panel render before looking again.
    setTimeout(() => {
      const inTab = findFieldByLabel(labelText);
      if (inTab) reveal(inTab);
    }, 50);
    return true;
  }
  return false;
};

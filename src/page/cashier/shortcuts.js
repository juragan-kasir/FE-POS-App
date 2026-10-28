// Kasir keyboard shortcuts. A key presses the on-screen control marked
// data-shortcut="<name>", so it obeys that control's own rules (Bayar stays
// disabled with an empty cart or an unavailable tax rate, Simpan while a
// park is in flight). F1/F3/F5/F6/F7/F11/F12 are left to the browser.
export const CASHIER_SHORTCUTS = { F2: "search", F4: "checkout", F8: "park", F9: "tables" };

// The cart renders twice (desktop column and mobile drawer): prefer the copy
// that is laid out on screen.
const isShown = (el) => el.offsetParent !== null;

export const pressShortcut = (name, root = document) => {
  const controls = [...root.querySelectorAll(`[data-shortcut="${name}"]`)].filter(
    (el) => !el.disabled
  );
  const control = controls.find(isShown) || controls[0];
  if (!control) return false;
  if (control.matches("input, textarea")) {
    control.focus();
    control.select?.();
  } else {
    control.click();
  }
  return true;
};

// Returns true when the key was a shortcut and has been handled. Nothing
// fires while a dialog (checkout, receipt, confirmations) is open.
export const handleCashierShortcut = (event, root = document) => {
  const name = CASHIER_SHORTCUTS[event.key];
  if (!name || event.ctrlKey || event.metaKey || event.altKey) return false;
  if (root.querySelector('[role="dialog"], [role="alertdialog"]')) return false;
  event.preventDefault();
  pressShortcut(name, root);
  return true;
};

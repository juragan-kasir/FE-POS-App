// Barcode scanners act as a keyboard: they type the code far faster than a
// person (a few ms per character) and end with Enter. Telling the two apart
// lets the cashier scan without first switching to "barcode mode", and
// catches a scan made while no field has focus (e.g. right after tapping a
// product), whose keys used to go nowhere.

// Longest gap between two characters of one scan. Human typing is well
// above this even when fast.
export const SCAN_MAX_GAP_MS = 50;
export const SCAN_MIN_LENGTH = 3;

// Tracks the characters typed in one burst. `key(e, now)` records a keydown
// and, on Enter, returns the scanned code when the burst looked like a
// scanner (else null).
export const createScanTracker = ({
  maxGapMs = SCAN_MAX_GAP_MS,
  minLength = SCAN_MIN_LENGTH
} = {}) => {
  let chars = "";
  let last = 0;
  return {
    key(event, now = Date.now()) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        chars = "";
        return null;
      }
      if (event.key === "Enter") {
        const fast = now - last <= maxGapMs * 2;
        const code = chars;
        chars = "";
        return fast && code.length >= minLength ? code : null;
      }
      if (event.key.length !== 1) return null;
      chars = now - last <= maxGapMs ? chars + event.key : event.key;
      last = now;
      return null;
    },
    reset() {
      chars = "";
    }
  };
};

const isEditable = (el) =>
  !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

// Window-level listener for scans made while no field has focus. Inactive
// while a dialog is open, so checkout/receipt keystrokes are never taken.
export const listenForScans = (onScan, { root = document, target = window } = {}) => {
  const tracker = createScanTracker();
  const handler = (event) => {
    if (isEditable(event.target) || root.querySelector('[role="dialog"], [role="alertdialog"]')) {
      tracker.reset();
      return;
    }
    const code = tracker.key(event);
    if (code) {
      event.preventDefault();
      onScan(code);
    }
  };
  target.addEventListener("keydown", handler);
  return () => target.removeEventListener("keydown", handler);
};

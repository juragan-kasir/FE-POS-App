import { useEffect } from "react";

// The add action of a page sits in the PageHeader actions and carries a
// plus-family icon or an "add" label (Tambah/Buat · Add/Create).
const ADD_ICONS =
  "svg.lucide-plus, svg.lucide-circle-plus, svg.lucide-square-plus, svg.lucide-user-plus, svg.lucide-file-plus";
const ADD_LABEL = /^\+?\s*(tambah|buat|add|create)\b/i;

export const findAddAction = (root = document) =>
  [...root.querySelectorAll("[data-page-actions] button, [data-page-actions] a")].find(
    (el) =>
      !el.disabled && (el.querySelector(ADD_ICONS) || ADD_LABEL.test((el.textContent || "").trim()))
  ) || null;

// ponytail: global keyboard shortcuts, no per-page config needed
// upgrade: add configurable key-to-action map if more shortcuts are needed
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "s") {
        e.preventDefault();
        document.querySelector('[type="submit"]')?.click();
      }

      // Ctrl/Cmd+N presses the page's own add button: the first enabled
      // header action carrying a plus icon. A page without one does nothing —
      // guessing `/add-<page>` sent 22 list pages (e.g. /bundle, /tenant) to 404.
      if (mod && e.key === "n") {
        e.preventDefault();
        findAddAction()?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
};

export default useKeyboardShortcuts;

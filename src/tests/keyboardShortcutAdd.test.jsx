import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { Plus, UserPlus, Download } from "lucide-react";
import useKeyboardShortcuts, { findAddAction } from "@/hooks/useKeyboardShortcuts";

// Ctrl/Cmd+N used to guess `/add-<page>` and sent 22 list pages (e.g.
// /bundle → /add-bundle, /tenant → /add-tenant) to the 404 page. It now
// presses the page's own add button in the PageHeader actions, or does
// nothing.

const Shortcuts = ({ children }) => {
  useKeyboardShortcuts();
  return children;
};

const renderActions = (actions) =>
  render(
    <Shortcuts>
      <div data-page-actions>{actions}</div>
    </Shortcuts>
  );

test("Ctrl+N presses the plus-icon add button, not the other actions", () => {
  const exportClick = jest.fn();
  const addClick = jest.fn();
  renderActions(
    <>
      <button onClick={exportClick}>
        <Download /> Export
      </button>
      <button onClick={addClick}>
        <Plus /> Tambah Bundle
      </button>
    </>
  );
  fireEvent.keyDown(window, { key: "n", ctrlKey: true });
  expect(addClick).toHaveBeenCalledTimes(1);
  expect(exportClick).not.toHaveBeenCalled();
});

test("a UserPlus icon or an add label also counts", () => {
  const { unmount } = renderActions(
    <button>
      <UserPlus /> Member
    </button>
  );
  expect(findAddAction()).not.toBeNull();
  unmount();
  renderActions(<button>Buat Retur</button>);
  expect(findAddAction()?.textContent).toBe("Buat Retur");
});

test("a page without an add action stays put and presses nothing", () => {
  const exportClick = jest.fn();
  const before = window.location.href;
  renderActions(
    <button onClick={exportClick}>
      <Download /> Export
    </button>
  );
  fireEvent.keyDown(window, { key: "n", ctrlKey: true });
  expect(findAddAction()).toBeNull();
  expect(exportClick).not.toHaveBeenCalled();
  expect(window.location.href).toBe(before);
});

test("a disabled add button is skipped", () => {
  renderActions(
    <button disabled>
      <Plus /> Tambah
    </button>
  );
  expect(findAddAction()).toBeNull();
});

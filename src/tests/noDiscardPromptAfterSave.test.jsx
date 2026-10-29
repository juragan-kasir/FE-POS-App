/* global __dirname */
import React, { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MutationCache, QueryClient, QueryClientProvider, useMutation } from "react-query";
import { createMemoryRouter, RouterProvider, Outlet, useNavigate } from "react-router-dom";
import { UnsavedChangesProvider, useUnsavedChangesGuard } from "../contexts/UnsavedChangesContext";
import { markAllClean, markSaved, resumeGuard, getDirty } from "../lib/unsaved-changes-store";

// Production 10-29: after a successful Edit Produk save, going back to the
// list asked "Batalkan Perubahan?". A save is followed by refetches and
// re-hydration that mark the form dirty again; and eight forms that save
// with a plain `await` never cleared the marks at all.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue ?? k })
}));

const GUARD = "Batalkan Perubahan?";

// A form that is dirty, saves through react-query, then — like a refetch
// re-hydrating it — marks itself dirty again before going back to the list.
const FakeForm = () => {
  const navigate = useNavigate();
  const { registerDirty } = useUnsavedChangesGuard();
  const [rehydrated, setRehydrated] = useState(0);
  useEffect(() => {
    registerDirty("fake-form", true);
    return () => registerDirty("fake-form", false);
  }, [registerDirty, rehydrated]);
  const save = useMutation(() => Promise.resolve({ data: { id: 1 } }), {
    onSuccess: () => setRehydrated((n) => n + 1)
  });
  return (
    <div>
      <input aria-label="name" />
      <button type="button" onClick={() => save.mutate()}>
        save
      </button>
      {save.isSuccess && (
        <button type="button" onClick={() => navigate("/list")}>
          ok
        </button>
      )}
      <button type="button" onClick={() => navigate("/list")}>
        sidebar-link
      </button>
    </div>
  );
};

const renderApp = () => {
  const router = createMemoryRouter(
    [
      {
        element: (
          <UnsavedChangesProvider>
            <Outlet />
          </UnsavedChangesProvider>
        ),
        children: [
          { path: "/form", element: <FakeForm /> },
          { path: "/list", element: <p>the list</p> }
        ]
      }
    ],
    { initialEntries: ["/form"] }
  );
  // Same cache hook as src/index.jsx.
  const client = new QueryClient({
    mutationCache: new MutationCache({ onSuccess: () => markSaved() })
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  resumeGuard();
  markAllClean();
});

test("unsaved form still asks before leaving", async () => {
  renderApp();
  fireEvent.click(screen.getByText("sidebar-link"));
  expect(await screen.findByText(GUARD)).toBeInTheDocument();
});

test("after a successful save it goes straight back to the list, even when re-marked dirty", async () => {
  renderApp();
  fireEvent.click(screen.getByText("save"));
  fireEvent.click(await screen.findByText("ok"));
  expect(await screen.findByText("the list")).toBeInTheDocument();
  expect(screen.queryByText(GUARD)).toBeNull();
});

test("editing again after the save brings the guard back", async () => {
  renderApp();
  fireEvent.click(screen.getByText("save"));
  await screen.findByText("ok");
  expect(getDirty()).toBe(false);
  fireEvent.input(screen.getByLabelText("name"), { target: { value: "x" } });
  await waitFor(() => expect(getDirty()).toBe(true));
  fireEvent.click(screen.getByText("sidebar-link"));
  expect(await screen.findByText(GUARD)).toBeInTheDocument();
});

test("every form that saves with a plain await marks the save", () => {
  const pageDir = path.resolve(__dirname, "../page");
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory()
        ? walk(full)
        : /^(Add|Edit|Create)\w*\.jsx$/.test(e.name)
          ? [full]
          : [];
    });
  const missing = walk(pageDir)
    .filter((file) => {
      const code = fs.readFileSync(file, "utf8");
      const plainSave =
        /await\s+(add|edit|create|update|transfer)\w*\(/.test(code) ||
        /createExpenses\(/.test(code);
      return plainSave && !/markSaved\(\)|markAllClean\(\)/.test(code);
    })
    .map((file) => path.relative(pageDir, file));
  expect(missing).toEqual([]);
});

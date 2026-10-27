import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router-dom";
import { UnsavedChangesProvider } from "../contexts/UnsavedChangesContext";
import { markAllClean } from "../lib/unsaved-changes-store";
import AddDepartment from "../page/department/AddDepartment";

// jsdom lacks ResizeObserver, which the Radix Switch on the form requires.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

// UX #7: Cancel on a clean form leaves at once; on an edited form the page
// asks once — confirming it must not raise the router-level "Batalkan
// Perubahan?" guard as a second prompt.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue ?? k })
}));
jest.mock("@/hooks/useUserSession", () => ({ useUserSession: () => null }));
jest.mock("@/contexts/StoreContext", () => ({ useStore: () => null }));
jest.mock("@/services/department", () => ({ addDepartment: jest.fn() }));

const GLOBAL_GUARD_TITLE = "Batalkan Perubahan?";

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
          { path: "/add-department", element: <AddDepartment /> },
          { path: "/department-list", element: <p>department list</p> }
        ]
      }
    ],
    { initialEntries: ["/add-department"] }
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

beforeEach(() => markAllClean());

test("Cancel on an untouched form goes straight to the list", async () => {
  renderApp();
  fireEvent.click(await screen.findByRole("button", { name: /common.cancel/ }));

  expect(await screen.findByText("department list")).toBeInTheDocument();
  expect(screen.queryByText("modal.cancelTitle")).toBeNull();
  expect(screen.queryByText(GLOBAL_GUARD_TITLE)).toBeNull();
});

test("confirming Cancel on an edited form leaves after a single prompt", async () => {
  renderApp();
  const [name] = await screen.findAllByRole("textbox");
  fireEvent.change(name, { target: { value: "Dapur" } });

  fireEvent.click(screen.getByRole("button", { name: /common.cancel/ }));
  fireEvent.click(await screen.findByRole("button", { name: "modal.yesCancel" }));

  expect(await screen.findByText("department list")).toBeInTheDocument();
  expect(screen.queryByText(GLOBAL_GUARD_TITLE)).toBeNull();
});

test("Cancel on an edited form asks first and stays on the form", async () => {
  renderApp();
  const [name] = await screen.findAllByRole("textbox");
  fireEvent.change(name, { target: { value: "Dapur" } });

  fireEvent.click(screen.getByRole("button", { name: /common.cancel/ }));
  expect(await screen.findByText("modal.cancelTitle")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("department list")).toBeNull());
});

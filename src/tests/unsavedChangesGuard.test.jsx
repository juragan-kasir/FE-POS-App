import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMemoryRouter, Outlet, RouterProvider, useNavigate } from "react-router-dom";
import { getDirty, markAllClean, setDirty, subscribe } from "../lib/unsaved-changes-store";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key })
}));

jest.mock("@/components/organism/modal", () => ({
  __esModule: true,
  default: ({ open, title, confirmText, cancelText, onConfirm, onOpenChange }) =>
    open ? (
      <div role="dialog">
        <span>{title}</span>
        <button type="button" onClick={() => onConfirm?.()}>
          {confirmText}
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          {cancelText}
        </button>
      </div>
    ) : null
}));

import { UnsavedChangesProvider, useUnsavedChangesGuard } from "../contexts/UnsavedChangesContext";
import { Form } from "../components/ui/form";
import { useForm } from "react-hook-form";

describe("unsaved-changes store", () => {
  beforeEach(() => markAllClean());

  test("tracks multiple dirty owners and clears all", () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    setDirty("a", true);
    setDirty("b", true);
    expect(getDirty()).toBe(true);

    markAllClean();
    expect(getDirty()).toBe(false);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});

const FormPage = () => {
  const navigate = useNavigate();
  const { registerDirty } = useUnsavedChangesGuard();

  React.useEffect(() => {
    registerDirty("form-page", true);
    return () => registerDirty("form-page", false);
  }, [registerDirty]);

  return (
    <div>
      <p>Form page</p>
      <button type="button" onClick={() => navigate("/list")}>
        Open list
      </button>
    </div>
  );
};

const RhfPage = () => {
  const form = useForm({ defaultValues: { name: "" } });
  const navigate = useNavigate();

  return (
    <Form {...form}>
      <input aria-label="name" {...form.register("name")} />
      <button type="button" onClick={() => navigate("/list")}>
        Open list
      </button>
    </Form>
  );
};

const CleanPage = () => {
  const navigate = useNavigate();
  return (
    <div>
      <p>Clean page</p>
      <button type="button" onClick={() => navigate("/list")}>
        Open list
      </button>
    </div>
  );
};

const Root = () => (
  <UnsavedChangesProvider>
    <Outlet />
  </UnsavedChangesProvider>
);

const renderRouter = (initialPath = "/form") => {
  const router = createMemoryRouter(
    [
      {
        element: <Root />,
        children: [
          { path: "/form", element: <FormPage /> },
          { path: "/clean", element: <CleanPage /> },
          { path: "/rhf", element: <RhfPage /> },
          { path: "/list", element: <p>List page</p> }
        ]
      }
    ],
    { initialEntries: [initialPath] }
  );
  render(<RouterProvider router={router} />);
  return router;
};

describe("UnsavedChangesProvider navigation block", () => {
  beforeEach(() => markAllClean());

  test("blocks navigation from a dirty page, cancel stays, confirm proceeds", async () => {
    renderRouter();

    fireEvent.click(screen.getByRole("button", { name: "Open list" }));

    await screen.findByRole("dialog");
    expect(screen.getByText("Form page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "unsavedChanges.stay" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Form page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open list" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "unsavedChanges.discard" }));

    expect(await screen.findByText("List page")).toBeInTheDocument();
  });

  test("react-hook-form dirty state blocks navigation", async () => {
    renderRouter("/rhf");

    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Budi" } });
    fireEvent.click(screen.getByRole("button", { name: "Open list" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "unsavedChanges.discard" }));
    expect(await screen.findByText("List page")).toBeInTheDocument();
  });

  test("a clean page navigates without a dialog", async () => {
    renderRouter("/clean");

    fireEvent.click(screen.getByRole("button", { name: "Open list" }));

    expect(await screen.findByText("List page")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

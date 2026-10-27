import React from "react";
import { render, screen, fireEvent, waitFor, renderHook } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { useFormExit } from "../hooks/useLeaveGuard";
import { getDirty, markAllClean } from "../lib/unsaved-changes-store";
import EditDepartment from "../page/department/EditDepartment";

// jsdom lacks ResizeObserver, which the Radix Switch on the form requires.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

// UX-04: every Add/Edit form asked "discard changes?" even when nothing was
// typed. useFormExit leaves straight to the list for a clean form and only
// confirms when something changed.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

jest.mock("@/hooks/useUserSession", () => ({
  useUserSession: () => null
}));

jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => null
}));

jest.mock("@/services/department", () => ({
  editDepartment: jest.fn(),
  getDepartmentById: jest.fn(() =>
    Promise.resolve({ data: { id: 7, name: "Dapur", description: "", status: "active" } })
  )
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams("id=7")]
}));

describe("useFormExit (UX-04)", () => {
  // Minimal stand-in for a react-hook-form instance.
  const fakeForm = ({ isDirty = false, values = {}, defaults = {} } = {}) => ({
    formState: { isDirty, defaultValues: defaults },
    getValues: () => values
  });
  const cleanForm = fakeForm({
    values: { name: "A", on: true },
    defaults: { on: true, name: "A" }
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    markAllClean();
  });

  test("clean form navigates straight to the target", () => {
    const confirm = jest.fn();
    const { result } = renderHook(() => useFormExit("/list", confirm, cleanForm));

    result.current.request();

    expect(mockNavigate).toHaveBeenCalledWith("/list");
    expect(confirm).not.toHaveBeenCalled();
  });

  test("dirty form asks for confirmation and does not navigate", () => {
    const confirm = jest.fn();
    const { result } = renderHook(() => useFormExit("/list", confirm, fakeForm({ isDirty: true })));

    result.current.request();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("values differing from defaults confirm even while the isDirty snapshot is stale", () => {
    const confirm = jest.fn();
    const form = fakeForm({ values: { name: "Baru" }, defaults: { name: "Lama" } });
    const { result } = renderHook(() => useFormExit("/list", confirm, form));

    result.current.request();

    expect(confirm).toHaveBeenCalledTimes(1);
  });

  test("input outside react-hook-form (useState fields) counts as a change", () => {
    const confirm = jest.fn();
    const { result } = renderHook(() => useFormExit("/list", confirm, cleanForm));
    const input = document.createElement("input");
    document.body.appendChild(input);

    fireEvent.input(input, { target: { value: "x" } });
    result.current.request();

    expect(confirm).toHaveBeenCalledTimes(1);
    input.remove();
  });

  test("picking a combobox option counts as a change; other clicks do not", () => {
    const confirm = jest.fn();
    const { result } = renderHook(() => useFormExit("/list", confirm, cleanForm));
    const button = document.createElement("button");
    const option = document.createElement("div");
    option.setAttribute("role", "option");
    document.body.append(button, option);

    fireEvent.click(button);
    result.current.request();
    expect(confirm).not.toHaveBeenCalled();

    fireEvent.click(option);
    result.current.request();
    expect(confirm).toHaveBeenCalledTimes(1);
    button.remove();
    option.remove();
  });

  test("without a react-hook-form instance it always confirms", () => {
    const confirm = jest.fn();
    const { result } = renderHook(() => useFormExit("/list", confirm));

    result.current.request();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("registers the form's dirty state in the shared store; leave() clears it", () => {
    const { result, rerender } = renderHook(({ form }) => useFormExit("/list", jest.fn(), form), {
      initialProps: { form: cleanForm }
    });
    expect(getDirty()).toBe(false);

    rerender({ form: fakeForm({ isDirty: true }) });
    expect(getDirty()).toBe(true);

    result.current.leave();
    expect(getDirty()).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith("/list");
  });
});

describe("EditDepartment leave flow (UX-04 pilot)", () => {
  const renderPage = () =>
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <EditDepartment />
      </QueryClientProvider>
    );

  beforeEach(() => mockNavigate.mockClear());

  test("back arrow on an untouched loaded record goes straight to the list", async () => {
    renderPage();
    await screen.findByDisplayValue("Dapur");

    fireEvent.click(screen.getByRole("button", { name: "common.back" }));

    expect(mockNavigate).toHaveBeenCalledWith("/department-list");
    expect(screen.queryByText("modal.cancelTitle")).not.toBeInTheDocument();
  });

  test("after an edit, Cancel asks before discarding and does not navigate", async () => {
    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Dapur"), { target: { value: "Dapur Baru" } });

    fireEvent.click(screen.getByRole("button", { name: /common.cancel/ }));

    await waitFor(() => expect(screen.getByText("modal.cancelTitle")).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

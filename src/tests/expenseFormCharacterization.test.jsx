import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddExpense from "../page/expense/AddExpense";
import EditExpense from "../page/expense/EditExpense";
import { addExpense, editExpense, getExpenseById } from "../services/expense";

// UX audit #12 (expense pair), step A: pins down what Tambah and Edit
// Pengeluaran send for a single expense, before the two forms share their
// fields. The payload builders are unit-tested in expensePayload.test.js;
// these cover the pages around them and must pass unchanged after the
// refactor.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("id=40"), jest.fn()]
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 1 } }]
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: undefined, isLoading: false })
}));
jest.mock("@/services/expense", () => ({
  addExpense: jest.fn(),
  bulkAddExpenses: jest.fn(),
  editExpense: jest.fn(),
  getExpenseById: jest.fn(),
  getExpenseCategories: jest.fn(() =>
    Promise.resolve({ data: [{ id: 7, name: "Listrik", status: "active" }] })
  )
}));
jest.mock("@/services/employee", () => ({
  getAllEmployee: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }) => (
    <select value={value ?? ""} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>
}));
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: function DatePickerStub({ date, setDate }) {
    return (
      <input
        data-testid="date-picker"
        value={
          date instanceof Date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
                date.getDate()
              ).padStart(2, "0")}`
            : ""
        }
        onChange={(e) =>
          setDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)
        }
      />
    );
  }
}));
jest.mock(
  "@/components/organism/MissingFieldsModal",
  () =>
    function MissingFieldsModalStub({ open, fields }) {
      return open ? <div data-testid="missing-fields">{fields.join(",")}</div> : null;
    }
);
jest.mock(
  "@/components/organism/UserGuide",
  () =>
    function UserGuideStub() {
      return <div />;
    }
);

const renderPage = (Page) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>
  );
};

const categorySelect = () =>
  screen.getAllByRole("combobox").find((s) => [...s.options].some((o) => o.text === "Listrik"));

beforeEach(() => {
  jest.clearAllMocks();
  addExpense.mockResolvedValue({ data: { id: 50 } });
  editExpense.mockResolvedValue({ data: { id: 40 } });
});

const fillSingleExpense = async () => {
  await waitFor(() => expect(categorySelect()).toBeTruthy());
  fireEvent.change(categorySelect(), { target: { value: "7" } });
  fireEvent.change(screen.getAllByTestId("date-picker")[0], { target: { value: "2026-10-20" } });
  // By the key's tail: Tambah and Edit use different keys with the same text.
  fireEvent.change(screen.getByPlaceholderText(/\.descriptionPlaceholder$/), {
    target: { value: "Token listrik" }
  });
  // "0", or the key whose text is "0" (Edit's amount placeholder).
  fireEvent.change(screen.getAllByPlaceholderText(/^(0|.*\.amountPlaceholder)$/)[0], {
    target: { value: "250000" }
  });
};

describe("AddExpense — characterization (single expense)", () => {
  test("is sent with exactly these fields", async () => {
    renderPage(AddExpense);
    await fillSingleExpense();
    fireEvent.click(screen.getByText("button.save"));
    fireEvent.click(await screen.findByText("common.yesSave"));
    await waitFor(() => expect(addExpense).toHaveBeenCalledTimes(1));
    expect(addExpense.mock.calls[0][0]).toEqual({
      store: 1,
      date: "2026-10-20",
      status: "pending",
      frequency: "once",
      paymentMethod: "cash",
      categoryId: "7",
      description: "Token listrik",
      amount: 250000
    });
  });

  test("without an amount the missing field is listed and nothing is sent", async () => {
    renderPage(AddExpense);
    await waitFor(() => expect(categorySelect()).toBeTruthy());
    fireEvent.change(categorySelect(), { target: { value: "7" } });
    fireEvent.click(screen.getByText("button.save"));
    expect(await screen.findByTestId("missing-fields")).toBeInTheDocument();
    expect(addExpense).not.toHaveBeenCalled();
  });

  test("a draft is sent with status draft", async () => {
    renderPage(AddExpense);
    await fillSingleExpense();
    fireEvent.click(screen.getByText("page.expense.add.saveAsDraft"));
    fireEvent.click(await screen.findByText("page.expense.add.draftConfirm"));
    await waitFor(() => expect(addExpense).toHaveBeenCalledTimes(1));
    expect(addExpense.mock.calls[0][0]).toMatchObject({ status: "draft", amount: 250000 });
  });
});

describe("EditExpense — characterization", () => {
  test("an unchanged expense is sent back as loaded", async () => {
    getExpenseById.mockResolvedValue({
      data: {
        id: 40,
        category: 7,
        description: "Token listrik",
        amount: 250000,
        date: "2026-10-30",
        notes: "",
        payee: "PLN",
        employeeId: null,
        paymentMethod: "bank",
        frequency: "once",
        recurringEndDate: null,
        status: "pending",
        store: 1
      }
    });
    renderPage(EditExpense);
    await screen.findByDisplayValue("Token listrik");
    fireEvent.click(screen.getByText("page.expense.edit.save"));
    fireEvent.click(await screen.findByText("common.yesSave"));
    await waitFor(() => expect(editExpense).toHaveBeenCalledTimes(1));
    expect(editExpense.mock.calls[0][0]).toEqual({
      id: "40",
      categoryId: "7",
      description: "Token listrik",
      amount: 250000,
      date: "2026-10-30",
      payee: "PLN",
      paymentMethod: "bank",
      frequency: "once",
      store: 1,
      status: "pending"
    });
  });
});

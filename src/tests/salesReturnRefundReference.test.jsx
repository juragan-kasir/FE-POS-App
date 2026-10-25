import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import SalesReturnList from "../page/sales-return/SalesReturnList";
import { approveSalesReturn, getAllSalesReturn } from "@/services/sales-return";

// BA gap 009 (DR-23 §D/§G): approving a non-cash refund asks for its
// reference (OTHER: a description); a cash refund keeps the plain confirm.

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn()
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "super_admin", store: null } }]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/useGlobalStoreFilter", () => ({
  useGlobalStoreFilter: () => ["all", jest.fn()]
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [{ id: 3, name: "Toko" }] }))
}));
jest.mock("@/services/sales-return", () => ({
  getAllSalesReturn: jest.fn(),
  approveSalesReturn: jest.fn(() => Promise.resolve({ success: true })),
  rejectSalesReturn: jest.fn()
}));
jest.mock(
  "@/components/ui/PageHeader",
  () =>
    function PageHeaderStub({ title }) {
      return <h1>{title}</h1>;
    }
);
jest.mock(
  "@/components/ui/StoreFilter",
  () =>
    function StoreFilterStub() {
      return null;
    }
);
jest.mock(
  "@/components/ui/DataTable",
  () =>
    function DataTableStub({ columns, data }) {
      return (
        <table>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} data-testid={`row-${row.id}`}>
                {columns.map((c, i) => (
                  <td key={i}>{c.render ? c.render(row) : null}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
);
jest.mock(
  "@/components/ui/TableActions",
  () =>
    function TableActionsStub({ items }) {
      return (
        <div>
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <button key={i.label} onClick={i.onClick}>
                {i.label}
              </button>
            ))}
        </div>
      );
    }
);

const row = (overrides) => ({
  id: 1,
  returnNumber: "RET-1",
  status: "pending",
  refundAmount: 20000,
  refundMethod: "cash",
  createdAt: "2026-10-16T00:00:00Z",
  ...overrides
});

const renderList = (rows) => {
  getAllSalesReturn.mockResolvedValue({ data: rows, pagination: { total: rows.length } });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <SalesReturnList />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

const clickApprove = async (id) => {
  const r = await screen.findByTestId(`row-${id}`);
  fireEvent.click(within(r).getByText("common.approve"));
  return screen.findByRole("dialog");
};

beforeEach(() => jest.clearAllMocks());

test("a QRIS refund asks for its reference and sends it", async () => {
  renderList([row({ id: 7, refundMethod: "qris" })]);
  const dialog = await clickApprove(7);
  const confirm = within(dialog).getByRole("button", {
    name: "page.salesReturn.list.modal.approveConfirm"
  });

  fireEvent.click(confirm);
  expect(
    await within(dialog).findByText("page.salesReturn.list.modal.referenceRequired")
  ).toBeInTheDocument();
  expect(approveSalesReturn).not.toHaveBeenCalled();

  fireEvent.change(within(dialog).getByLabelText(/page.salesReturn.list.modal.referenceLabel/), {
    target: { value: "QR-REF-1" }
  });
  fireEvent.click(confirm);
  await waitFor(() => expect(approveSalesReturn).toHaveBeenCalledTimes(1));
  expect(approveSalesReturn.mock.calls[0][0]).toEqual({ id: 7, refundReference: "QR-REF-1" });
});

test("an OTHER refund asks for a description", async () => {
  renderList([row({ id: 8, refundMethod: "other" })]);
  const dialog = await clickApprove(8);
  expect(
    within(dialog).getByLabelText(/page.salesReturn.list.modal.otherLabel/)
  ).toBeInTheDocument();
});

test("a cash refund keeps the plain confirmation", async () => {
  renderList([row({ id: 9, refundMethod: "cash" })]);
  const dialog = await clickApprove(9);
  expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "page.salesReturn.list.modal.approveConfirm" })
  );
  await waitFor(() => expect(approveSalesReturn).toHaveBeenCalledWith(9));
});

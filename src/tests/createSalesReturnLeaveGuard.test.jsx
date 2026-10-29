import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router-dom";
import { UnsavedChangesProvider } from "../contexts/UnsavedChangesContext";
import { markAllClean } from "../lib/unsaved-changes-store";
import CreateSalesReturn from "../page/sales-return/CreateSalesReturn";
import { getOrderById } from "@/services/order";

// UX #5: return items are picked with +/- buttons; leaving after picking
// them used to drop the selection without a word.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => (typeof o === "string" ? o : (o?.defaultValue ?? k)) })
}));
jest.mock("react-cookie", () => ({ useCookies: () => [{ user: { id: 42 } }] }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/services/order", () => ({
  getOrderById: jest.fn(),
  getOrdersByStore: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/sales-return", () => ({ returnOrder: jest.fn() }));
jest.mock("@/services/type-payment", () => ({
  getAllTypePayment: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/inventory", () => ({
  getBatches: jest.fn(() => Promise.resolve({ data: [] }))
}));
// A plain link stands in for the header's Kembali / the sidebar.
jest.mock(
  "@/components/ui/PageHeader",
  () =>
    function PageHeaderStub() {
      const { Link: RouterLink } = jest.requireActual("react-router-dom");
      return <RouterLink to="/sales-return">back-to-list</RouterLink>;
    }
);

const GUARD_TITLE = "Batalkan Perubahan?";

const order = {
  id: 1,
  orderNumber: "ORD-1",
  paymentStatus: "paid",
  paymentMethod: "cash",
  totalPrice: 20000,
  items: [
    { id: 100, product: 5, productName: "Widget", quantity: 2, totalPrice: 20000, unit: "pcs" }
  ]
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
          { path: "/sales-return/create", element: <CreateSalesReturn /> },
          { path: "/sales-return", element: <p>sales return list</p> }
        ]
      }
    ],
    { initialEntries: ["/sales-return/create?orderId=1"] }
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  markAllClean();
  getOrderById.mockResolvedValue({ data: order });
});

test("nothing picked: leaving goes straight to the list", async () => {
  renderApp();
  await screen.findByText("Widget");
  fireEvent.click(screen.getByText("back-to-list"));
  expect(await screen.findByText("sales return list")).toBeInTheDocument();
  expect(screen.queryByText(GUARD_TITLE)).toBeNull();
});

test("an item picked: leaving asks first, and Tetap di Form keeps the selection", async () => {
  renderApp();
  await screen.findByText("Widget");
  fireEvent.click(screen.getByText(/page.salesReturn.create.add/));

  fireEvent.click(screen.getByText("back-to-list"));
  expect(await screen.findByText(GUARD_TITLE)).toBeInTheDocument();
  expect(screen.queryByText("sales return list")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Tetap di Form" }));
  await waitFor(() => expect(screen.queryByText(GUARD_TITLE)).toBeNull());
  expect(screen.queryByText("sales return list")).toBeNull();
});

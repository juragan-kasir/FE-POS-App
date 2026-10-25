import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key })
}));

jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: [] }, isLoading: false })
}));

jest.mock("@/services/employee", () => ({
  getAllEmployee: jest.fn(() => Promise.resolve({ data: [] }))
}));

jest.mock("@/services/business-trip", () => ({
  addBusinessTrip: jest.fn(),
  editBusinessTrip: jest.fn(),
  getBusinessTripById: jest.fn(() =>
    Promise.resolve({
      data: {
        id: 9,
        store: 1,
        employees: [],
        budgetItems: [],
        destination: "Bandung",
        tripPurpose: "",
        departureDate: "2026-10-20",
        returnDate: "2026-10-21",
        budget: 0,
        notes: ""
      }
    })
  )
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}));

import AddBusinessTrip from "../page/business-trip/AddBusinessTrip";
import EditBusinessTrip from "../page/business-trip/EditBusinessTrip";

const renderPage = (Component) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Component />
    </QueryClientProvider>
  );

const backButton = () => screen.getByRole("button", { name: "common.back" });

beforeEach(() => mockNavigate.mockClear());

describe("AddBusinessTrip unsaved changes", () => {
  test("clean form goes back without a discard prompt", () => {
    renderPage(AddBusinessTrip);

    fireEvent.click(backButton());

    expect(mockNavigate).toHaveBeenCalledWith("/business-trip");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("dirty form asks before discarding", async () => {
    renderPage(AddBusinessTrip);

    fireEvent.change(screen.getByPlaceholderText("page.businessTrip.add.form.destination"), {
      target: { value: "Bandung" }
    });
    fireEvent.click(backButton());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("EditBusinessTrip unsaved changes", () => {
  test("clean form goes back without a discard prompt", () => {
    renderPage(EditBusinessTrip);

    fireEvent.click(backButton());

    expect(mockNavigate).toHaveBeenCalledWith("/business-trip");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("dirty form asks before discarding", async () => {
    renderPage(EditBusinessTrip);

    fireEvent.change(screen.getByPlaceholderText("page.businessTrip.add.form.destination"), {
      target: { value: "Surabaya" }
    });
    fireEvent.click(backButton());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

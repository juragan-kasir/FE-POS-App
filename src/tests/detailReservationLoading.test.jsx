import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DetailReservation from "../page/reservation/DetailReservation";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key })
}));

jest.mock("@/hooks/useUserSession", () => ({
  useUserSession: () => ({ fullName: "Admin" })
}));

jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ activeStoreName: "Toko" })
}));

jest.mock("@/services/reservation", () => ({
  getReservationById: jest.fn(() => new Promise(() => {}))
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <MemoryRouter initialEntries={["/reservation/1"]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/reservation/:id" element={<DetailReservation />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("DetailReservation loading state", () => {
  test("renders the loading state before reservation data arrives", () => {
    renderPage();

    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });
});

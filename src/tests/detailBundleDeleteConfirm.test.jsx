import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key })
}));

jest.mock("@/hooks/useUserSession", () => ({
  useUserSession: () => ({ fullName: "Admin" })
}));

jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ activeStoreName: "Toko" })
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "super_admin", store: 1 } }]
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

jest.mock("@/services/productBundle", () => ({
  getBundleById: jest.fn(() =>
    Promise.resolve({
      data: {
        id: 1,
        name: "Paket Hemat",
        sku: "PKT-1",
        status: "active",
        items: []
      }
    })
  ),
  deleteBundle: jest.fn(() => Promise.resolve({})),
  changeBundleStatus: jest.fn(() => Promise.resolve({}))
}));

import DetailBundle from "../page/bundle/DetailBundle";
import { deleteBundle } from "@/services/productBundle";

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <MemoryRouter initialEntries={["/bundle/1"]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/bundle/:id" element={<DetailBundle />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("DetailBundle delete confirmation", () => {
  beforeEach(() => {
    deleteBundle.mockClear();
    mockNavigate.mockClear();
  });

  test("asks for confirmation before deleting a bundle", async () => {
    renderPage();

    await screen.findAllByText("Paket Hemat");
    fireEvent.click(screen.getByRole("button", { name: "common.delete" }));

    expect(deleteBundle).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "common.confirmDelete" }));

    await waitFor(() => expect(deleteBundle).toHaveBeenCalledWith(1));
  });
});

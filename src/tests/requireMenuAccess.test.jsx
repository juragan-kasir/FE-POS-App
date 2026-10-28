import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";

jest.mock("@/services/session", () => ({
  endSession: jest.fn(() => Promise.resolve()),
  SESSION_END_REASON: { LOGOUT: "logout" }
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: "id", changeLanguage: jest.fn() } })
}));

let mockUser = { id: 1, userName: "ani", roleType: "admin", store: 1 };
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: mockUser }, jest.fn(), jest.fn()]
}));
jest.mock("@/hooks/useUserSession", () => ({ useUserSession: () => mockUser }));
jest.mock("@/assets/logo-sidebar.png", () => "logo.png");

sessionStorage.clear();

import { RequireMenuAccess } from "@/components/ui/RequireRole";

const renderGuard = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <RequireMenuAccess href="/location-list">
          <span>HALAMAN-LOKASI</span>
        </RequireMenuAccess>
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  sessionStorage.clear();
  mockUser = { id: 1, userName: "ani", roleType: "admin", store: 1 };
});

describe("RequireMenuAccess", () => {
  test("super_admin bypasses without accessMenu", () => {
    mockUser = { id: 2, roleType: "super_admin", store: null };
    renderGuard();
    expect(screen.getByText("HALAMAN-LOKASI")).toBeInTheDocument();
  });

  test("admin with menu access passes", () => {
    sessionStorage.setItem(
      "user",
      JSON.stringify({
        ...mockUser,
        accessMenu: [{ menu: "/location-list", view: true, read: true }]
      })
    );
    renderGuard();
    expect(screen.getByText("HALAMAN-LOKASI")).toBeInTheDocument();
  });

  test("admin without menu access sees AccessDenied", () => {
    renderGuard();
    expect(screen.getByText("error.forbiddenTitle")).toBeInTheDocument();
    expect(screen.queryByText("HALAMAN-LOKASI")).not.toBeInTheDocument();
  });
});

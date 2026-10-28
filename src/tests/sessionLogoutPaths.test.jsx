/* eslint-disable no-undef */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";

// Every explicit logout (Header, Sidebar, access-denied screen) goes through
// the one session boundary with identical arguments, and none of them keeps
// a partial cleanup of its own.

const mockEndSession = jest.fn(() => Promise.resolve());
jest.mock("@/services/session", () => ({
  endSession: (...args) => mockEndSession(...args),
  SESSION_END_REASON: { LOGOUT: "logout", EXPIRED: "expired" }
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: "id", changeLanguage: jest.fn() } })
}));

const mockUser = { id: 1, userName: "ani", fullName: "Ani", roleType: "admin", store: 1 };
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: mockUser }, jest.fn(), jest.fn()]
}));

jest.mock("@/utils/endpoints", () => ({ ENDPOINT: { BASE_URL: "http://api.test" } }));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/notification", () => ({
  getUnreadCount: jest.fn(() => Promise.resolve({ data: { count: 0 } }))
}));
jest.mock("@/services/socket", () => ({ useSocket: () => ({}) }));
jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({
    activeStoreId: 1,
    activeStoreName: "Store A",
    setActiveStore: jest.fn(),
    isSuperAdmin: false,
    userRole: "admin"
  })
}));
jest.mock("@/hooks/useThemeEffect", () => ({ useThemeEffect: () => {} }));
jest.mock("@/hooks/useUserSession", () => ({ useUserSession: () => mockUser }));
jest.mock("@/assets/logo-sidebar.png", () => "logo.png");

const renderWithApp = (ui) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

const confirmLogout = async () => {
  fireEvent.click(await screen.findByText("header.logoutYes"));
  await waitFor(() => expect(mockEndSession).toHaveBeenCalledTimes(1));
};

beforeEach(() => mockEndSession.mockClear());

describe("explicit logout paths → one session boundary", () => {
  test("Header: user menu → Logout → confirm", async () => {
    const Header = require("@/components/layout/Header").default;
    const { container } = renderWithApp(<Header />);

    const desktopMenu = container.querySelector('[data-tour="header-user"]');
    fireEvent.click(desktopMenu.querySelector("button"));
    fireEvent.click(screen.getAllByText("header.logout")[0]);
    await confirmLogout();

    expect(mockEndSession).toHaveBeenCalledWith({ reason: "logout", revoke: true });
  });

  test("Sidebar: Logout → confirm", async () => {
    const Sidebar = require("@/components/layout/Sidebar").default;
    renderWithApp(<Sidebar collapsed={false} />);

    fireEvent.click(screen.getAllByText("header.logout")[0]);
    await confirmLogout();

    expect(mockEndSession).toHaveBeenCalledWith({ reason: "logout", revoke: true });
  });

  test("access-denied screen: Logout", () => {
    const { RequireRole } = require("@/components/ui/RequireRole");
    renderWithApp(
      <RequireRole roles={["super_admin"]} excludeSuperAdmin>
        <div>secret</div>
      </RequireRole>
    );

    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("header.logout"));

    expect(mockEndSession).toHaveBeenCalledTimes(1);
    expect(mockEndSession).toHaveBeenCalledWith({ reason: "logout", revoke: true });
  });
});

describe("no logout path keeps its own partial cleanup", () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");

  test.each([
    "components/layout/Header.jsx",
    "components/layout/Sidebar.jsx",
    "components/ui/RequireRole.jsx",
    "App.jsx"
  ])("%s", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/removeCookie\(/);
    expect(source).not.toMatch(/sessionStorage\.removeItem/);
    expect(source).not.toMatch(/resetOrder\(/);
    expect(source).not.toMatch(/logOut\(/);
    expect(source).not.toMatch(/auth:session-expired/);
    expect(source).not.toMatch(/localStorage\.clear|sessionStorage\.clear/);
  });

  test("services/index.js no longer owns a separate expiry lifecycle", () => {
    const source = read("services/index.js");
    expect(source).not.toMatch(/sessionExpiredFired|logoutInProgress|auth:session-expired/);
    expect(source).not.toMatch(/document\.cookie\s*=/);
    expect(source).toMatch(/endSession\(/);
  });
});

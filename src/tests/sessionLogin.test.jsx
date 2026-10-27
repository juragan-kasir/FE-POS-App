import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { toast } from "sonner";
import { login } from "@/services/auth";
import * as session from "@/services/session";
import LoginPage from "@/page/auth/login";

// jsdom has no ResizeObserver; the Radix checkbox on the login form needs one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

// Login side of the session boundary: a successful login boots the app fresh
// with a full page navigation, a login response landing while a session ends
// writes nothing, and the one-time notice left by the boundary is shown once
// and deleted.

jest.mock("@/assets/logo-full.webp", () => "logo-full.webp");
jest.mock("@/assets/logo-full-dark.webp", () => "logo-full-dark.webp");
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, ready: true, i18n: { changeLanguage: jest.fn() } })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockSetCookie = jest.fn();
jest.mock("react-cookie", () => ({
  useCookies: () => [{}, (...args) => mockSetCookie(...args)]
}));

jest.mock("@/services/auth", () => ({ login: jest.fn() }));
jest.mock("@/hooks/useThemeEffect", () => ({ useThemeEffect: () => {} }));
jest.mock("@/components/organism/AuthGuideModal", () => () => null);

let mockEnding = false;
jest.mock("@/services/session", () => {
  const actual = jest.requireActual("@/services/session");
  return { ...actual, isSessionEnding: () => mockEnding };
});

const renderLogin = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

const submitLogin = () => {
  fireEvent.change(screen.getByPlaceholderText("translation:placeholder.input.login.username"), {
    target: { value: "ani" }
  });
  fireEvent.change(screen.getByPlaceholderText("translation:placeholder.input.login.password"), {
    target: { value: "secret" }
  });
  fireEvent.click(screen.getByText("translation:btnLogin"));
};

let navigate;

beforeEach(() => {
  mockEnding = false;
  mockSetCookie.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  login.mockReset();
  login.mockResolvedValue({
    token: "token-B",
    user: { id: 2, userName: "budi", roleType: "admin", store: 2, accessMenu: [] }
  });
  sessionStorage.clear();
  navigate = jest.spyOn(session.sessionNavigation, "replace").mockImplementation(() => {});
});

afterEach(() => navigate.mockRestore());

describe("login success → fresh boot", () => {
  test("stores the new credentials, then replaces the document with the role dashboard", async () => {
    renderLogin();
    submitLogin();

    await waitFor(() =>
      expect(mockSetCookie).toHaveBeenCalledWith("token", "token-B", { path: "/" })
    );
    const userCookie = mockSetCookie.mock.calls.find(([name]) => name === "user");
    expect(userCookie[1]).toMatchObject({ id: 2, store: 2 });
    expect(userCookie[1]).not.toHaveProperty("accessMenu");
    expect(JSON.parse(sessionStorage.getItem("user"))).toMatchObject({ id: 2 });

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1), { timeout: 3500 });
    expect(navigate).toHaveBeenCalledWith("/dashboard-admin");
  });

  test("a login response landing while a session ends writes nothing and navigates nowhere", async () => {
    renderLogin();
    mockEnding = true;
    submitLogin();

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 2300));

    expect(mockSetCookie).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("user")).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("one-time session notice", () => {
  test("a logout notice is shown once and deleted", async () => {
    sessionStorage.setItem(session.SESSION_NOTICE_KEY, "logout");
    renderLogin();

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith("header.logoutSuccessTitle", {
      id: "session-end-notice"
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBeNull();
  });

  test("an expired notice is shown once and deleted", async () => {
    sessionStorage.setItem(session.SESSION_NOTICE_KEY, "expired");
    renderLogin();

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error.mock.calls[0][0]).toBe("Sesi Berakhir");
    expect(toast.success).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBeNull();
  });

  test("no notice, no toast", async () => {
    renderLogin();
    await new Promise((r) => setTimeout(r, 0));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

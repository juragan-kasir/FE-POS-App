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
  localStorage.clear();
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
    expect(toast.error.mock.calls[0][0]).toBe("page.auth.ui.sessionEnded");
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

describe("remember me", () => {
  const expSeconds = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const jwtWithExp = (exp) => `h.${btoa(JSON.stringify({ exp }))}.s`;

  afterEach(() => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  test("checked: sends rememberMe, persists cookies until the token expires, keeps a local user copy", async () => {
    const token = jwtWithExp(expSeconds);
    login.mockResolvedValue({
      token,
      user: { id: 2, userName: "budi", roleType: "admin", store: 2, accessMenu: [{ id: 1 }] }
    });
    renderLogin();
    fireEvent.click(screen.getByRole("checkbox"));
    submitLogin();

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login.mock.calls[0][0]).toMatchObject({ rememberMe: true });
    await waitFor(() =>
      expect(mockSetCookie).toHaveBeenCalledWith("token", token, {
        path: "/",
        expires: new Date(expSeconds * 1000)
      })
    );
    const userCookie = mockSetCookie.mock.calls.find(([name]) => name === "user");
    expect(userCookie[2]).toEqual({ path: "/", expires: new Date(expSeconds * 1000) });
    expect(localStorage.getItem("session-remember-me")).toBe("true");
    expect(JSON.parse(localStorage.getItem("session-remembered-user"))).toMatchObject({
      id: 2,
      accessMenu: [{ id: 1 }]
    });
  });

  test("unchecked: sends rememberMe false, session cookies only, forgets a previous remembered user", async () => {
    localStorage.setItem("session-remember-me", "true");
    localStorage.setItem("session-remembered-user", JSON.stringify({ id: 1 }));
    renderLogin();
    submitLogin();

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login.mock.calls[0][0]).toMatchObject({ rememberMe: false });
    await waitFor(() =>
      expect(mockSetCookie).toHaveBeenCalledWith("token", "token-B", { path: "/" })
    );
    expect(localStorage.getItem("session-remember-me")).toBeNull();
    expect(localStorage.getItem("session-remembered-user")).toBeNull();
  });

  test("a still-valid remembered session skips the login form after a browser restart", async () => {
    document.cookie = `token=${jwtWithExp(expSeconds)}; path=/`;
    localStorage.setItem("session-remember-me", "true");
    localStorage.setItem("session-remembered-user", JSON.stringify({ id: 2, roleType: "admin" }));
    renderLogin();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard-admin"));
  });

  test("an expired token stays on the login form", async () => {
    document.cookie = `token=${jwtWithExp(Math.floor(Date.now() / 1000) - 60)}; path=/`;
    localStorage.setItem("session-remembered-user", JSON.stringify({ id: 2, roleType: "admin" }));
    renderLogin();

    await new Promise((r) => setTimeout(r, 0));
    expect(navigate).not.toHaveBeenCalled();
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import LoginPage from "@/page/auth/login";
import { authRoutes } from "@/routes/auth.routes";
import { isPublicRegistrationEnabled } from "@/utils/publicRegistration";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

// DR-24 D-08: staff accounts are created by the store owner, so public
// sign-up is closed unless a build sets VITE_PUBLIC_REGISTRATION_ENABLED=true
// (injected as __PUBLIC_REGISTRATION__ by vite.config.js).

jest.mock("@/assets/logo-full.webp", () => "logo-full.webp");
jest.mock("@/assets/logo-full-dark.webp", () => "logo-full-dark.webp");
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, ready: true, i18n: { changeLanguage: jest.fn() } })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-cookie", () => ({ useCookies: () => [{}, jest.fn()] }));
jest.mock("@/services/auth", () => ({ login: jest.fn() }));
jest.mock("@/hooks/useThemeEffect", () => ({ useThemeEffect: () => {} }));
jest.mock("@/components/organism/AuthGuideModal", () => () => null);

const renderLogin = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

const registerRoute = () =>
  React.Children.toArray(authRoutes.props.children).find((r) => r.props.path === "/register");

afterEach(() => {
  delete globalThis.__PUBLIC_REGISTRATION__;
});

describe("public registration (D-08)", () => {
  test("is closed unless the build flag is exactly true", () => {
    expect(isPublicRegistrationEnabled()).toBe(false);
    globalThis.__PUBLIC_REGISTRATION__ = "true";
    expect(isPublicRegistrationEnabled()).toBe(false);
    globalThis.__PUBLIC_REGISTRATION__ = true;
    expect(isPublicRegistrationEnabled()).toBe(true);
  });

  test("login shows 'ask the owner' instead of a sign-up link when closed", () => {
    renderLogin();
    expect(screen.getByText("page.login.accountFromOwner")).toBeInTheDocument();
    expect(screen.queryByText(/registerNow/)).not.toBeInTheDocument();
  });

  test("login offers sign-up when the build opens it", () => {
    globalThis.__PUBLIC_REGISTRATION__ = true;
    renderLogin();
    expect(screen.getByText(/registerNow/)).toBeInTheDocument();
    expect(screen.queryByText("page.login.accountFromOwner")).not.toBeInTheDocument();
  });

  test("/register sends old links back to login when closed", () => {
    // the route element is decided when the routes module is evaluated
    const element = registerRoute().props.element;
    expect(element.type).toBe(Navigate);
    expect(element.props.to).toBe("/");
  });
});

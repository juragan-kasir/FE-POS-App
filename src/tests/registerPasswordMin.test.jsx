import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import RegisterPage from "../page/auth/register";
import { register } from "@/services/auth";

// The register form asks for the same password minimum as the server
// (registerSchema: 6 characters) — it used to accept 4.

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: null })
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/services/auth", () => ({ register: jest.fn(() => Promise.resolve({})) }));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [{ id: 1, name: "Toko" }] })),
  getPublicLocations: jest.fn(() => Promise.resolve({ data: [{ id: 1, name: "Toko" }] }))
}));
jest.mock("@/state/translation", () => ({
  translationSelect: () => ({ translation: "id", updateTranslation: jest.fn() })
}));
jest.mock("@/state/theme", () => ({ useThemeStore: () => ({ toggleTheme: jest.fn() }) }));
jest.mock("@/hooks/useThemeEffect", () => ({ useThemeEffect: jest.fn() }));
jest.mock(
  "@/components/organism/AuthGuideModal",
  () =>
    function AuthGuideModalStub() {
      return null;
    }
);
jest.mock(
  "@/components/organism/policy-dialog",
  () =>
    function PolicyDialogStub() {
      return null;
    }
);
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ onChange }) {
    return (
      <button type="button" onClick={() => onChange?.("1")}>
        pick-store
      </button>
    );
  }
}));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RegisterPage />
    </QueryClientProvider>
  );

const fill = (placeholder, value) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

const submitWith = async (password) => {
  renderPage();
  fill("translation:placeholder.input.register.username", "kasir_baru");
  fill("translation:placeholder.input.register.email", "kasir@test.com");
  fill("translation:placeholder.input.register.password", password);
  fill("translation:placeholder.input.register.confirmationPassword", password);
  fireEvent.click(await screen.findByText("pick-store"));
  fireEvent.click(screen.getByRole("button", { name: "translation:btnCreateAcc" }));
};

beforeEach(() => jest.clearAllMocks());

test("the password hint says 6 characters", () => {
  renderPage();
  expect(screen.getByText("common.passwordMin6")).toBeInTheDocument();
});

test("a 5-character password is refused with the minimum-length message", async () => {
  await submitWith("abcde");
  expect(
    await screen.findByText("translation:formError.input.register.passwordMin")
  ).toBeInTheDocument();
  expect(register).not.toHaveBeenCalled();
});

test("a 6-character password passes the length rule", async () => {
  await submitWith("abcdef");
  await waitFor(() =>
    expect(
      screen.queryByText("translation:formError.input.register.passwordMin")
    ).not.toBeInTheDocument()
  );
});

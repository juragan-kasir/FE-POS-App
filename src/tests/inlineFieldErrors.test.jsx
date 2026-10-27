import React from "react";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { z } from "zod";
import { getFieldErrors } from "../lib/validation";
import { useFieldErrors } from "../hooks/useFieldErrors";
import AddMember from "../page/member/AddMember";

// UX #6: useState-based forms only listed empty fields in a modal; the
// message now also sits under each field and clears once the field is fixed.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue ?? k })
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 1 } }]
}));
jest.mock("@/services/member", () => ({ addMember: jest.fn() }));
jest.mock("@/services/member-tier", () => ({
  getAllMemberTier: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/components/organism/UserGuide", () => () => null);

const t = (k, o) => o?.defaultValue ?? k;

describe("getFieldErrors", () => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(1).max(4, "Max 4 characters"),
    price: z.coerce.number().min(1, "Harga harus diisi"),
    birthDate: z.date(),
    pin: z.string().min(6)
  });

  test("maps zod issues to short user messages, one per field", () => {
    expect(
      getFieldErrors(
        { name: "", email: "x", phone: "12345", price: 0, birthDate: undefined, pin: "12" },
        schema,
        t
      )
    ).toEqual({
      name: "Wajib diisi",
      email: "Format email tidak valid",
      phone: "Maksimal 4 karakter",
      price: "Wajib diisi",
      birthDate: "Wajib diisi",
      pin: "Minimal 6 karakter"
    });
  });

  test("valid values have no errors", () => {
    expect(
      getFieldErrors(
        { name: "A", email: "", phone: "12", price: 5, birthDate: new Date(), pin: "123456" },
        schema,
        t
      )
    ).toEqual({});
  });
});

describe("useFieldErrors", () => {
  const schema = z.object({ name: z.string().min(1) });

  test("stays quiet until showErrors, then follows the values", () => {
    const { result, rerender } = renderHook(({ values }) => useFieldErrors(values, schema), {
      initialProps: { values: { name: "" } }
    });
    expect(result.current.errors).toEqual({});

    act(() => result.current.showErrors());
    expect(result.current.errors).toEqual({ name: "Wajib diisi" });

    rerender({ values: { name: "Budi" } });
    expect(result.current.errors).toEqual({});
  });
});

describe("AddMember inline errors", () => {
  const renderPage = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AddMember />
        </MemoryRouter>
      </QueryClientProvider>
    );

  test("no message before saving; after a failed save each empty field says so", () => {
    renderPage();
    expect(screen.queryByText("Wajib diisi")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /page.member.button.save/ }));

    expect(screen.getAllByText("Wajib diisi").length).toBeGreaterThanOrEqual(3);
    const name = document.querySelector('input[name="name"]');
    expect(name).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(name, { target: { value: "Budi" } });
    expect(name).toHaveAttribute("aria-invalid", "false");
  });
});

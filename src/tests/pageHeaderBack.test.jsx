import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key })
}));

jest.mock("@/hooks/useUserSession", () => ({
  useUserSession: () => ({ fullName: "Budi" })
}));

jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ activeStoreName: "Toko A" })
}));

import PageHeader from "../components/ui/PageHeader";

describe("PageHeader back button", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    window.history.replaceState({ idx: 0 }, "");
  });

  test("uses history back when there is an in-app entry to return to", () => {
    window.history.replaceState({ idx: 2 }, "");
    render(<PageHeader title="Detail" backLink="/list" />);

    fireEvent.click(screen.getByRole("button", { name: "common.back" }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test("falls back to backLink on a direct landing", () => {
    window.history.replaceState({ idx: 0 }, "");
    render(<PageHeader title="Detail" backLink="/list" />);

    fireEvent.click(screen.getByRole("button", { name: "common.back" }));

    expect(mockNavigate).toHaveBeenCalledWith("/list");
  });

  test("onBack takes precedence", () => {
    window.history.replaceState({ idx: 2 }, "");
    const onBack = jest.fn();
    render(<PageHeader title="Form" backLink="/list" onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "common.back" }));

    expect(onBack).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

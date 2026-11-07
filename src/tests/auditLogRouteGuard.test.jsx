import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes } from "react-router-dom";

jest.mock("@/services/session", () => ({
  endSession: jest.fn(() => Promise.resolve()),
  SESSION_END_REASON: { LOGOUT: "logout" }
}));

let mockRoleType = "kasir";

jest.mock("react-cookie", () => ({
  useCookies: () => [
    { user: { id: 7, userName: "kasir", roleType: mockRoleType, store: 1 } },
    jest.fn(),
    jest.fn()
  ]
}));

import { settingsRoutes } from "@/routes/settings.routes";

const renderRoute = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{settingsRoutes}</Routes>
    </MemoryRouter>
  );

describe("PGA-25: /audit-log route guard", () => {
  test("a kasir never sees the audit-log shell", () => {
    mockRoleType = "kasir";
    renderRoute("/audit-log");
    expect(screen.getByText("error.forbiddenTitle")).toBeInTheDocument();
    expect(screen.queryByText("page.auditLog.searchPlaceholder")).not.toBeInTheDocument();
  });

  test("an admin never sees the audit-log shell", () => {
    mockRoleType = "admin";
    renderRoute("/audit-log");
    expect(screen.getByText("error.forbiddenTitle")).toBeInTheDocument();
  });
});

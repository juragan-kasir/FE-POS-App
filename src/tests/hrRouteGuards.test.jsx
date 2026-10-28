import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes } from "react-router-dom";

jest.mock("@/services/session", () => ({
  endSession: jest.fn(() => Promise.resolve()),
  SESSION_END_REASON: { LOGOUT: "logout" }
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [
    { user: { id: 7, userName: "kasir", roleType: "kasir", store: 1 } },
    jest.fn(),
    jest.fn()
  ]
}));

import { hrRoutes } from "@/routes/hr.routes";
import { businessTripRoutes } from "@/routes/businessTrip.routes";

const adminOnlyPaths = [
  "/user-list",
  "/add-user",
  "/employee-list",
  "/detail-employee",
  "/add-employee",
  "/edit-employee",
  "/position-list",
  "/detail-position",
  "/add-position",
  "/edit-position",
  "/department-list",
  "/detail-department",
  "/add-department",
  "/edit-department",
  "/shift-list",
  "/detail-shift",
  "/add-shift",
  "/edit-shift",
  "/shift-template-list",
  "/detail-shift-template",
  "/add-shift-template",
  "/edit-shift-template",
  "/business-trip",
  "/add-business-trip",
  "/edit-business-trip",
  "/business-trip/detail"
];

const renderRoute = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {hrRoutes}
        {businessTripRoutes}
      </Routes>
    </MemoryRouter>
  );

describe("admin-only route guards", () => {
  test.each(adminOnlyPaths)("%s denies a kasir account", (path) => {
    renderRoute(path);
    expect(screen.getByText("error.forbiddenTitle")).toBeInTheDocument();
  });
});

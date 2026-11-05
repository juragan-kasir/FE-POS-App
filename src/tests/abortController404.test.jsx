import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AbortController from "../components/organism/abort-controller";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

describe("AbortController — PGA-27 404 shown as not found, not server error", () => {
  test("a 404 reads as not found", () => {
    render(
      <AbortController
        refetch={jest.fn()}
        error={{ response: { status: 404, data: {} } }}
      />
    );
    expect(screen.getByText("error.notFoundTitle")).toBeInTheDocument();
    expect(screen.queryByText("error.internalServerError")).not.toBeInTheDocument();
  });

  test("a 404 does not show a retry button", () => {
    render(
      <AbortController
        refetch={jest.fn()}
        error={{ response: { status: 404, data: {} } }}
      />
    );
    expect(
      screen.queryByRole("button", { name: /common.tryAgain/ })
    ).not.toBeInTheDocument();
  });

  test("a 500 still shows server error with retry", () => {
    render(
      <AbortController
        refetch={jest.fn()}
        error={{ response: { status: 500, data: {} } }}
      />
    );
    expect(screen.getByText("error.internalServerError")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /common.tryAgain/ })
    ).toBeInTheDocument();
  });
});

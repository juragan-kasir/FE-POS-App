import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useLocation } from "react-router-dom";
import { usePageParam } from "../hooks/usePageParam";

const Probe = () => {
  const [page, setPage] = usePageParam();
  const location = useLocation();

  return (
    <>
      <span data-testid="page">{page}</span>
      <span data-testid="search">{location.search}</span>
      <button type="button" onClick={() => setPage(2)}>
        two
      </button>
      <button type="button" onClick={() => setPage(1)}>
        one
      </button>
      <button type="button" onClick={() => setPage((current) => current + 1)}>
        next
      </button>
    </>
  );
};

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
    </MemoryRouter>
  );

describe("usePageParam", () => {
  test("reads ?page while preserving other params", () => {
    renderAt("/list?location=7&page=2");
    expect(screen.getByTestId("page")).toHaveTextContent("2");
  });

  test.each(["/list?page=0", "/list?page=abc", "/list?page=-3", "/list"])(
    "normalizes an invalid page in %s to 1",
    (entry) => {
      renderAt(entry);
      expect(screen.getByTestId("page")).toHaveTextContent("1");
    }
  );

  test("writes page and preserves unrelated params", () => {
    renderAt("/list?location=7");

    fireEvent.click(screen.getByRole("button", { name: "two" }));

    expect(screen.getByTestId("page")).toHaveTextContent("2");
    expect(screen.getByTestId("search").textContent).toContain("location=7");
    expect(screen.getByTestId("search").textContent).toContain("page=2");
  });

  test("removes page when returning to the first page", () => {
    renderAt("/list?location=7&page=3");

    fireEvent.click(screen.getByRole("button", { name: "one" }));

    expect(screen.getByTestId("page")).toHaveTextContent("1");
    expect(screen.getByTestId("search").textContent).not.toContain("page=");
  });

  test("accepts a functional updater", () => {
    renderAt("/list?page=2");

    fireEvent.click(screen.getByRole("button", { name: "next" }));

    expect(screen.getByTestId("page")).toHaveTextContent("3");
  });
});

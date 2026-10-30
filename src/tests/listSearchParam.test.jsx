/* eslint-disable no-undef */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider, Link, useLocation } from "react-router-dom";
import { usePageParam, useSearchParam } from "@/hooks/usePageParam";

// List pages keep their search text in the URL (?q=) beside ?page=, so going
// to a detail page and back restores both. Uses a data router, like the app:
// there two setSearchParams calls in one event overwrite each other.

const List = () => {
  const [page, setPage] = usePageParam();
  const [search, setSearch] = useSearchParam();
  const location = useLocation();
  return (
    <div>
      <p data-testid="url">{location.search}</p>
      <p data-testid="state">{`${search}|${page}`}</p>
      <button type="button" onClick={() => setPage(3)}>
        page3
      </button>
      <button type="button" onClick={() => setSearch("kopi susu")}>
        search
      </button>
      <button type="button" onClick={() => setSearch("")}>
        clear
      </button>
      <Link to="/detail?id=1">detail</Link>
    </div>
  );
};

const Detail = () => (
  <button type="button" onClick={() => router.navigate(-1)}>
    back
  </button>
);

let router;
const renderList = (initial = "/list?store=7") => {
  router = createMemoryRouter(
    [
      { path: "/list", element: <List /> },
      { path: "/detail", element: <Detail /> }
    ],
    { initialEntries: [initial] }
  );
  render(<RouterProvider router={router} />);
};

describe("useSearchParam", () => {
  test("a new search goes to page 1 in the same URL write and keeps other params", async () => {
    renderList();
    fireEvent.click(screen.getByText("page3"));
    expect(await screen.findByText("|3")).toBeInTheDocument();

    fireEvent.click(screen.getByText("search"));
    expect(await screen.findByText("kopi susu|1")).toBeInTheDocument();
    const params = new URLSearchParams(screen.getByTestId("url").textContent);
    expect(params.get("q")).toBe("kopi susu");
    expect(params.get("store")).toBe("7");
    expect(params.has("page")).toBe(false);
  });

  test("search and page survive a trip to a detail page and back", async () => {
    renderList("/list?q=teh&page=2");
    expect(screen.getByTestId("state")).toHaveTextContent("teh|2");

    fireEvent.click(screen.getByText("detail"));
    fireEvent.click(await screen.findByText("back"));

    expect(await screen.findByText("teh|2")).toBeInTheDocument();
  });

  test("clearing the search removes ?q", async () => {
    renderList("/list?q=teh&page=2");
    await act(async () => fireEvent.click(screen.getByText("clear")));
    expect(screen.getByTestId("url").textContent).toBe("");
    expect(screen.getByTestId("state")).toHaveTextContent("|1");
  });
});

describe("paginated list pages keep their search in the URL", () => {
  const pageDir = path.join(__dirname, "../page");
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? walk(full) : /\.jsx?$/.test(e.name) ? [full] : [];
    });

  test("no page with usePageParam holds its search text in useState", () => {
    const offenders = walk(pageDir).filter((file) => {
      const src = fs.readFileSync(file, "utf8");
      return (
        src.includes("usePageParam(") &&
        /const \[(search|searchTerm|searchQuery), set\w+\] = useState\(/.test(src)
      );
    });
    expect(offenders.map((f) => path.relative(pageDir, f))).toEqual([]);
  });
});

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const parsePage = (raw) => {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const usePageParam = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));

  const setPage = useCallback(
    (value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const resolved = typeof value === "function" ? value(parsePage(prev.get("page"))) : value;
          const safe = Number.isInteger(resolved) && resolved > 0 ? resolved : 1;

          if (safe === 1) next.delete("page");
          else next.set("page", String(safe));

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return [page, setPage];
};

// The list's search text, kept in the URL (?q=) next to ?page= so it is still
// there when the user comes back from a detail page. Setting it also returns
// to page 1 in the same URL write: two setSearchParams calls in one event
// overwrite each other (each starts from the URL as it was rendered), so a
// following setPage(1) would drop the new search text.
export const useSearchParam = (key = "q") => {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) || "";

  const setValue = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          const text = typeof next === "function" ? next(prev.get(key) || "") : next;
          if (text) params.set(key, text);
          else params.delete(key);
          params.delete("page");
          return params;
        },
        { replace: true }
      );
    },
    [key, setSearchParams]
  );

  return [value, setValue];
};

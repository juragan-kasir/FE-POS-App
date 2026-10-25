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

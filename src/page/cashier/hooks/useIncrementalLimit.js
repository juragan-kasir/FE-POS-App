import { useCallback, useEffect, useRef, useState } from "react";

const canObserve = () => typeof window !== "undefined" && "IntersectionObserver" in window;

export const useIncrementalLimit = ({ resetKey, step, rootMargin }) => {
  const isIncremental = canObserve();
  const [state, setState] = useState({ key: resetKey, limit: step });
  const limit = state.key === resetKey ? state.limit : step;
  const sentinelRef = useRef(null);

  const showMore = useCallback(
    () => setState({ key: resetKey, limit: limit + step }),
    [resetKey, limit, step]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!isIncremental || !sentinel) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) showMore();
      },
      { rootMargin }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isIncremental, showMore, rootMargin]);

  return { limit: isIncremental ? limit : Infinity, sentinelRef, showMore };
};

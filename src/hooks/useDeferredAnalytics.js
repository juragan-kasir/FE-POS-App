import { useEffect } from "react";
import { loadAnalytics } from "@/lib/analytics";

const ANALYTICS_LOAD_DELAY_MS = 1500;

export const useDeferredAnalytics = () => {
  useEffect(() => {
    const timer = setTimeout(loadAnalytics, ANALYTICS_LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
};

import React, { useEffect, useState } from "react";
import { useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Queries mounted on the current screen that ended in an error.
const failedActiveQueries = (cache) =>
  cache.getAll().filter((q) => q.state.status === "error" && q.getObserversCount() > 0);

// Page-level notice for a screen without its own error state: when any of its
// queries fails (e.g. the store or supplier list of a form), a dropdown or
// table would otherwise just look empty. Retry refetches only the failed ones.
const LoadErrorBanner = ({ className = "" }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();
  const [failed, setFailed] = useState(() => failedActiveQueries(cache));

  useEffect(() => {
    setFailed(failedActiveQueries(cache));
    return cache.subscribe(() => setFailed(failedActiveQueries(cache)));
  }, [cache]);

  if (failed.length === 0) return null;

  const retry = () => failed.forEach((q) => q.fetch().catch(() => {}));
  const retrying = failed.some((q) => q.state.isFetching);

  return (
    <div
      role="alert"
      data-load-error
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 ${className}`}>
      <AlertTriangle size={18} className="text-destructive shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm text-foreground">{t("common.loadErrorPartial")}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 self-start sm:self-auto"
        onClick={retry}
        disabled={retrying}>
        <RefreshCw size={14} className={retrying ? "animate-spin" : ""} aria-hidden="true" />
        {t("common.retry")}
      </Button>
    </div>
  );
};

export default LoadErrorBanner;

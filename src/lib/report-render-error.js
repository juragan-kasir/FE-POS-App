import { isChunkLoadError } from "@/lib/chunk-load-error";

export const reportRenderError = (error, componentStack) => {
  if (isChunkLoadError(error)) return;
  import("@sentry/react")
    .then((Sentry) => Sentry.captureException(error, { contexts: { react: { componentStack } } }))
    .catch((importError) => console.error(importError));
};

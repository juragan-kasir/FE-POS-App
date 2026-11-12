import { useEffect } from "react";
import { isJustSaved } from "@/lib/unsaved-changes-store";

export function useUnsavedChanges(isDirty) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      if (isJustSaved()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

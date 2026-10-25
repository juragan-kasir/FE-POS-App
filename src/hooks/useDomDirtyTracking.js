import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useUnsavedChangesGuard } from "@/contexts/UnsavedChangesContext";

export const useDomDirtyTracking = ({ enabled = true } = {}) => {
  const { registerDirty } = useUnsavedChangesGuard();
  const id = useId();
  const [node, setNode] = useState(null);
  const dirtyRef = useRef(false);

  const ref = useCallback((element) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (!node || !enabled) return undefined;

    const markDirty = () => {
      if (dirtyRef.current) return;
      dirtyRef.current = true;
      registerDirty(id, true);
    };

    const markClean = () => {
      dirtyRef.current = false;
      registerDirty(id, false);
    };

    node.addEventListener("input", markDirty);
    node.addEventListener("change", markDirty);
    node.addEventListener("submit", markClean);

    return () => {
      node.removeEventListener("input", markDirty);
      node.removeEventListener("change", markDirty);
      node.removeEventListener("submit", markClean);
      markClean();
    };
  }, [node, enabled, id, registerDirty]);

  return ref;
};

import { useCallback, useEffect, useRef, useState } from "react";

// The POS welcome modal greets a brand-new account once per browser. Both
// dashboards decide what "everything is still empty" means; this hook owns
// the shared "already seen" flag so dismissing it on one dashboard keeps it
// closed on the other.
export const POS_WELCOME_SEEN_KEY = "pos-welcome-seen";

const readSeen = () => {
  try {
    return localStorage.getItem(POS_WELCOME_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const writeSeen = () => {
  try {
    localStorage.setItem(POS_WELCOME_SEEN_KEY, "1");
  } catch {
    // Storage blocked: the modal may show again next visit, nothing breaks.
  }
};

// `isEmpty` must only be true once the data behind it has loaded without
// error — a failed request reads as zeros and must not count as a new account.
export const usePosWelcome = (isEmpty) => {
  const [open, setOpen] = useState(false);
  const seen = useRef(readSeen());

  useEffect(() => {
    if (isEmpty && !seen.current) setOpen(true);
  }, [isEmpty]);

  const onOpenChange = useCallback((next) => {
    setOpen(next);
    if (!next) {
      seen.current = true;
      writeSeen();
    }
  }, []);

  return { open, onOpenChange };
};

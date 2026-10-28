import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import { ChevronDown } from "lucide-react";

const STORAGE_PREFIX = "pos.panel.";

const readOpen = (storageKey, fallback) => {
  if (!storageKey) return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    return raw === null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
};

const writeOpen = (storageKey, open) => {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, open ? "1" : "0");
  } catch {
    // storage unavailable (private mode, blocked site data): state stays in memory
  }
};

// Show/hide section in the /support FAQ style: an icon + title row with a
// rotating chevron; the body renders only while open. `storageKey` remembers
// the choice per device (a per-viewer convenience, never authoritative).
const CollapsiblePanel = ({
  title,
  icon: Icon,
  count,
  defaultOpen = true,
  storageKey,
  className = "",
  children
}) => {
  const [open, setOpen] = useState(() => readOpen(storageKey, defaultOpen));
  const bodyId = useId();

  const toggle = () => {
    setOpen((prev) => {
      writeOpen(storageKey, !prev);
      return !prev;
    });
  };

  return (
    <section className={className}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="w-full flex items-center justify-between gap-4 px-4 lg:px-6 py-2 text-left hover:text-primary transition-colors">
        <span className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={16} className="text-primary shrink-0" aria-hidden="true" />}
          <span className="text-sm font-semibold text-foreground truncate">{title}</span>
          {count != null && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div id={bodyId}>{children}</div>}
    </section>
  );
};

CollapsiblePanel.propTypes = {
  title: PropTypes.node.isRequired,
  icon: PropTypes.elementType,
  count: PropTypes.number,
  defaultOpen: PropTypes.bool,
  storageKey: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node
};

export default CollapsiblePanel;

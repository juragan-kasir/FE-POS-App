import * as React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

// Field-length standard (BA DR-28): an input with a maxLength shows how many
// characters are used of the maximum; at the maximum the border turns red and
// a line says so. Typing stops there (the native maxLength).

const TEXT_TYPES = new Set([undefined, "", "text", "search", "email", "tel", "url"]);

export const hasLengthCounter = (maxLength, type) =>
  Number.isInteger(maxLength) && maxLength > 0 && TEXT_TYPES.has(type);

const lengthOf = (value) => (value === undefined || value === null ? 0 : String(value).length);

// Tracks the length of a controlled (`value`) or uncontrolled (register /
// defaultValue) field and returns a ref to merge onto the element.
export const useLengthCount = ({ value, defaultValue, onChange, forwardedRef }) => {
  const innerRef = React.useRef(null);
  const [length, setLength] = React.useState(() => lengthOf(value ?? defaultValue));

  React.useEffect(() => {
    if (value !== undefined) setLength(lengthOf(value));
  }, [value]);

  // an uncontrolled field can be filled without a change event (form reset)
  React.useEffect(() => {
    if (value === undefined && innerRef.current) {
      const current = innerRef.current.value.length;
      setLength((prev) => (prev === current ? prev : current));
    }
  });

  const ref = React.useCallback(
    (node) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );

  const handleChange = React.useCallback(
    (event) => {
      setLength(event.target.value.length);
      onChange?.(event);
    },
    [onChange]
  );

  return { ref, length, handleChange };
};

export const LengthCounter = ({ length, maxLength, id, className }) => {
  const { t } = useTranslation();
  const atLimit = length >= maxLength;
  return (
    <div
      id={id}
      className={cn("mt-1 flex items-start justify-between gap-2 text-xs", className)}
      aria-live="polite">
      <span className={cn("text-destructive", !atLimit && "invisible")}>
        {t("common.maxLengthReached")}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          atLimit ? "text-destructive font-medium" : "text-muted-foreground"
        )}>
        {length}/{maxLength}
      </span>
    </div>
  );
};

export const atLimitClass = "border-destructive focus-visible:ring-destructive";

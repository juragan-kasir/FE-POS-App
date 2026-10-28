import * as React from "react";

import { cn } from "@/lib/utils";
import {
  LengthCounter,
  atLimitClass,
  hasLengthCounter,
  useLengthCount
} from "@/components/ui/length-counter";

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// A text input with a maxLength shows a character counter (BA DR-28);
// `containerClassName` styles the wrapper that holds input + counter, and
// `unstyled` keeps a hand-styled input's own classes (no base classes);
// `showCount={false}` keeps a plain capped input (e.g. a short numeric text).
const CountedInput = React.forwardRef(
  (
    {
      className,
      containerClassName,
      unstyled,
      type,
      maxLength,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const counted = useLengthCount({ value, defaultValue, onChange, forwardedRef: ref });
    const counterId = React.useId();
    const atLimit = counted.length >= maxLength;
    return (
      // The counter hangs in a zero-height box below the input and mb-5 reserves
      // its line, so a wrapper that centers an icon with top-1/2 still centers it
      // on the input: in flow, the counter made the wrapper taller and the icon
      // sat low. This div stays unpositioned so the input never covers that icon.
      <div className={cn("mb-5 w-full", containerClassName)}>
        <input
          type={type}
          className={cn(!unstyled && inputClass, className, atLimit && atLimitClass)}
          ref={counted.ref}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={counted.handleChange}
          {...props}
          aria-describedby={cn(props["aria-describedby"], counterId)}
        />
        <div className="relative h-0">
          <LengthCounter
            id={counterId}
            length={counted.length}
            maxLength={maxLength}
            className="absolute inset-x-0 top-0"
          />
        </div>
      </div>
    );
  }
);
CountedInput.displayName = "CountedInput";

const Input = React.forwardRef(
  ({ className, containerClassName, unstyled, showCount = true, type, ...props }, ref) => {
    if (showCount && hasLengthCounter(props.maxLength, type)) {
      return (
        <CountedInput
          ref={ref}
          type={type}
          className={className}
          containerClassName={containerClassName}
          unstyled={unstyled}
          {...props}
        />
      );
    }
    return (
      <input type={type} className={cn(!unstyled && inputClass, className)} ref={ref} {...props} />
    );
  }
);
Input.displayName = "Input";

export { Input };

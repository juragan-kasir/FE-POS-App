import * as React from "react";
import i18next from "i18next";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DateInput = React.forwardRef(
  ({ value, onChange, className, type = "date", ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && value !== "";

    const handleClear = (e) => {
      e.stopPropagation();
      if (onChange) {
        onChange({ target: { value: "" } });
      }
    };

    return (
      <div className={cn("relative", className)}>
        <input
          ref={ref}
          type={type}
          value={value || ""}
          onChange={onChange}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
          {...props}
        />
        {hasValue && (
          <button
            aria-label={i18next.t("common.clear")}
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer">
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };

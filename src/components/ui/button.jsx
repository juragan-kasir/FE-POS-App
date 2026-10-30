import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Confirm/save actions: the brand primary (emerald), not a second green.
        success: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Tinted variants: light tint in light mode, a dark tint (not a bright
        // pastel block) in dark mode.
        danger:
          "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 dark:hover:bg-red-950/70",
        general:
          "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 dark:hover:bg-blue-950/70",
        import:
          "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 dark:hover:bg-emerald-950/70",
        draft:
          "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900 dark:hover:bg-amber-950/70",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

// `disabledReason` explains why a disabled button can't be used: it becomes the
// hover tooltip and the accessible description. It is ignored while loading or
// when the button is enabled.
const Button = React.forwardRef(
  (
    { className, variant, size, asChild = false, loading, disabledReason, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const disabled = Boolean(props.disabled || loading);
    const reason = disabled && !loading && disabledReason ? disabledReason : undefined;
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          reason && "disabled:pointer-events-auto disabled:cursor-not-allowed"
        )}
        ref={ref}
        aria-busy={loading || undefined}
        title={reason}
        {...props}
        disabled={disabled}>
        {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

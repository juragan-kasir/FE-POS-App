import React from "react";
import { cn } from "@/lib/utils";

// Inline error under a field of a useState-based form (see useFieldErrors);
// react-hook-form forms use FormMessage instead.
export function FieldError({ message, className }) {
  if (!message) return null;
  return <p className={cn("text-xs font-medium text-destructive mt-1", className)}>{message}</p>;
}

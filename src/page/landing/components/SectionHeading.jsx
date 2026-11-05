import React from "react";

import { cn } from "@/lib/utils";

export const SectionEyebrow = ({ children, className }) => (
  <p className={cn("text-[13px] font-semibold uppercase tracking-[0.08em]", className)}>
    {children}
  </p>
);

export const SectionTitle = ({ children, className }) => (
  <h2
    className={cn(
      "text-balance font-jk-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.025em]",
      className
    )}>
    {children}
  </h2>
);

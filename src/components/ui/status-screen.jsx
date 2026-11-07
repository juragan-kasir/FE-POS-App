import React from "react";
import { cn } from "@/lib/utils";

export const StatusScreen = ({ mark, title, description, isFullScreen, children }) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-4 px-4 text-center",
      isFullScreen ? "min-h-screen bg-background" : "min-h-[50vh]"
    )}>
    {mark}
    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
    <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{children}</div>
  </div>
);

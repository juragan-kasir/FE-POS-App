import React from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

export const PageLoader = ({ isFullScreen, className }) => {
  const { t, ready } = useTranslation();

  return (
    <div
      role="status"
      aria-label={ready ? t("common.loading.page") : undefined}
      className={cn(
        "flex items-center justify-center",
        isFullScreen ? "min-h-screen" : "min-h-[50vh]",
        className
      )}>
      <Loading fullscreen={false} />
    </div>
  );
};

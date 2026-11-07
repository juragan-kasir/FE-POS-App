import React from "react";
import { AlertTriangle, CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusScreen } from "@/components/ui/status-screen";
import { LANDING_PATH } from "@/constants/routes";
import { isChunkLoadError } from "@/lib/chunk-load-error";

const handleReload = () => window.location.reload();

const ErrorFallback = ({ error, onRetry, isFullScreen }) => {
  const { t } = useTranslation();
  const isLoadFailure = isChunkLoadError(error);
  const Icon = isLoadFailure ? CloudOff : AlertTriangle;
  const shouldRetryInPlace = onRetry && !isLoadFailure;

  return (
    <StatusScreen
      isFullScreen={isFullScreen}
      mark={
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-muted/60 text-destructive shadow-sm">
          <Icon className="h-10 w-10" strokeWidth={1.5} />
        </div>
      }
      title={t(
        isLoadFailure
          ? "component.errorBoundary.ui.loadFailedTitle"
          : "component.errorBoundary.ui.somethingWentWrong"
      )}
      description={t(
        isLoadFailure
          ? "component.errorBoundary.ui.loadFailedDescription"
          : "component.errorBoundary.ui.description"
      )}>
      <Button onClick={shouldRetryInPlace ? onRetry : handleReload}>
        {t(
          shouldRetryInPlace
            ? "component.errorBoundary.ui.tryAgain"
            : "component.errorBoundary.ui.reload"
        )}
      </Button>
      {isFullScreen && (
        <a href={LANDING_PATH} className={buttonVariants({ variant: "outline" })}>
          {t("page.login.backToHome")}
        </a>
      )}
    </StatusScreen>
  );
};

export default ErrorFallback;

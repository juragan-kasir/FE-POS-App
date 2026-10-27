import { safeGet } from "@/lib/safe-lookup";
import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  confirm: AlertTriangle
};

const iconColorMap = {
  success: "text-green-500",
  error: "text-red-500",
  confirm: "text-amber-500"
};

const KNOWN_TYPES = Object.keys(iconMap);

export default function Modal({
  open,
  onOpenChange,
  type = "confirm",
  title,
  description,
  icon: IconOverride,
  confirmText,
  cancelText,
  confirmVariant,
  onConfirm,
  onCancel,
  secondaryText,
  onSecondary,
  loading,
  isLoading,
  className,
  children
}) {
  const { t } = useTranslation();
  const isKnownType = KNOWN_TYPES.includes(type);
  const isForm = type === "form";
  // `loading` is the real prop; `isLoading` has repeatedly been passed by
  // mistake at call sites (mutation.isLoading naming bleeding into the prop
  // name) and was silently dropped, leaving the confirm button armed for
  // duplicate submits during the request. Accept it as a fallback so a
  // future typo degrades to "worked anyway" instead of "silently disabled
  // nothing" while still surfacing the mistake in dev.
  const resolvedLoading = loading ?? isLoading;
  if (isLoading !== undefined && loading === undefined) {
    // A plain console.warn rather than a build-tool dev-mode check: this
    // component is imported by many Jest test files that don't go through
    // Vite's `import.meta.env` transform, and the warning is harmless (and
    // should never fire again post-fix) if it ever reaches a production
    // console.
    console.warn(
      "[Modal] received `isLoading` — this prop is `loading`. Falling back to `isLoading` for now; rename it at the call site."
    );
  }

  const defaultText = {
    success: { confirm: t("common.ok") },
    error: { confirm: t("common.ok") },
    confirm: { cancel: t("common.cancel") },
    form: { cancel: t("common.cancel"), confirm: t("common.save") }
  };

  const defaultDescription = {
    success: t("modal.successDescription"),
    error: t("modal.errorDescription"),
    confirm: t("modal.confirmDescription")
  };

  const Icon = isKnownType ? IconOverride || safeGet(iconMap, type) : null;
  const isNotification = type === "success" || type === "error";
  const confirmLabel = confirmText || safeGet(defaultText, type)?.confirm || t("common.confirm");
  const cancelLabel = cancelText || safeGet(defaultText, type)?.cancel || t("common.cancel");
  const desc = description || safeGet(defaultDescription, type, "");

  const confirmBtnVariant =
    confirmVariant || (type === "error" ? "destructive" : type === "form" ? "success" : "default");

  const confirmBtnClass = type === "success" ? "bg-green-600 hover:bg-green-700 text-white" : "";

  const handleClose = () => onOpenChange?.(false);

  const handleConfirm = async () => {
    // `await` on a non-Promise value resolves immediately to that value, so
    // this handles both conventions identically: a synchronous `onConfirm`
    // returning `false` (existing usage, e.g. SupplierScoreList.jsx) and an
    // async `onConfirm` that only resolves to `false` after its own
    // validation/try-catch runs (e.g. edit-profile-modal,
    // supplier-payment-modal) — previously an async handler's Promise was
    // never `=== false`, so the modal closed immediately on click
    // regardless of validation failures or in-flight requests.
    const result = await onConfirm?.();
    if (result === false) return;
    handleClose();
  };

  // Optional extra action beside the confirm button, e.g. "Lihat Detail" on a
  // "created" notice whose confirm goes back to the list.
  const handleSecondary = () => {
    onSecondary?.();
    handleClose();
  };

  const handleCancel = () => {
    onCancel?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent withX={false} className={cn("sm:max-w-[500px]", className)}>
        {isKnownType ? (
          <>
            <DialogHeader className="items-center text-center gap-0">
              <div className={cn("mb-4", safeGet(iconColorMap, type))}>
                <Icon className="w-16 h-16" strokeWidth={1.5} />
              </div>
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
              {desc && (
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {desc}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="flex justify-center gap-3 mt-4">
              {!isNotification && (
                <Button type="button" variant="danger" onClick={handleCancel}>
                  {cancelLabel}
                </Button>
              )}
              {secondaryText && onSecondary && (
                <Button type="button" variant="outline" onClick={handleSecondary}>
                  {secondaryText}
                </Button>
              )}
              <Button
                type="button"
                variant={confirmBtnVariant}
                className={confirmBtnClass}
                disabled={resolvedLoading}
                onClick={handleConfirm}>
                {resolvedLoading ? t("common.loading") : confirmLabel}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
              {desc && (
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {desc}
                </DialogDescription>
              )}
            </DialogHeader>
            {/* DialogContent caps at max-h-[90vh] with no scroll of its own — on a
                short viewport a form with several fields clipped past the fold
                instead of scrolling. max-h here is the dialog's cap minus roughly
                the header+footer+padding, so the fields scroll while the title and
                confirm/cancel buttons stay put and visible. */}
            <div className="py-4 max-h-[65vh] overflow-y-auto">{children}</div>
            {isForm && (
              <div className="flex justify-end gap-3">
                <Button type="button" variant="danger" onClick={handleCancel}>
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={confirmBtnVariant}
                  className={confirmBtnClass}
                  disabled={resolvedLoading}
                  onClick={handleConfirm}>
                  {resolvedLoading ? t("common.loading") : confirmLabel}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

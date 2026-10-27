import React, { useEffect, useRef } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { focusFieldByLabel } from "@/utils/focusField";

// Lists the required fields that are still empty. Closing it takes the user
// to the first of them (or the one they clicked) instead of the page top.
export default function MissingFieldsModal({ open, onOpenChange, fields = [], items }) {
  const { t } = useTranslation();
  const grouped = Array.isArray(items) && items.length > 0;
  const firstTarget = grouped
    ? { label: items[0]?.fields?.[0], tabTitle: items[0]?.title }
    : { label: fields[0] };
  // The field to jump to once the dialog has closed.
  const target = useRef(null);
  // Radix also runs the close handler when the dialog unmounts (e.g. the
  // page navigated away); there is no field to go to then.
  const unmounted = useRef(false);
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);

  const goTo = (label, tabTitle) => {
    target.current = { label, tabTitle };
    onOpenChange(false);
  };

  const jumpAfterClose = (event) => {
    // Radix would return focus to the button that opened the dialog.
    event.preventDefault();
    if (unmounted.current) return;
    const { label, tabTitle } = target.current || firstTarget;
    target.current = null;
    if (!focusFieldByLabel(label, { tabTitle })) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const fieldRow = (field, index, tabTitle) => (
    <button
      key={index}
      type="button"
      onClick={() => goTo(field, tabTitle)}
      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg bg-destructive/5 border border-destructive/10 text-left hover:bg-destructive/10 transition-colors">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold shrink-0">
        {index + 1}
      </span>
      <span className="flex-1 text-sm font-medium text-foreground">{field}</span>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent withX={false} className="sm:max-w-[425px]" onCloseAutoFocus={jumpAfterClose}>
        <DialogHeader className="items-center text-center gap-0">
          <div className="mb-4 text-amber-500">
            <AlertTriangle className="w-16 h-16" strokeWidth={1.5} />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {t("missingFields.title", { defaultValue: "Field Wajib Kosong" })}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {t("missingFields.description", {
              defaultValue:
                "Lengkapi field berikut sebelum menyimpan. Klik untuk langsung ke field."
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[300px] overflow-y-auto space-y-3">
          {grouped ? (
            items.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.stepNum != null && (
                      <>
                        {t("missingFields.tab", {
                          number: group.stepNum,
                          defaultValue: `Tab ${group.stepNum}`
                        })}
                        <span className="mx-1.5 text-border">•</span>
                      </>
                    )}
                    {group.title}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.fields.map((field, index) => fieldRow(field, index, group.title))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-2">{fields.map((field, index) => fieldRow(field, index))}</div>
          )}
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={() => onOpenChange(false)} className="px-8">
            {t("missingFields.fillNow", { defaultValue: "Isi Sekarang" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

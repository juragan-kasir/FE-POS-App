import { safeGet } from "@/lib/safe-lookup";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { policyContent } from "@/constants/policy-content";

const PolicyDialog = ({ type, open, onOpenChange }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "id";

  const content =
    safeGet(safeGet(policyContent, type), lang) || safeGet(safeGet(policyContent, type), "id");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-5 md:px-6 pt-5 md:pt-6 pb-3 border-b border-border">
          <DialogTitle className="text-lg md:text-xl font-semibold text-foreground">
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-muted-foreground">
            {type === "privacy"
              ? lang === "id"
                ? "Bagaimana kami melindungi data Anda"
                : "How we protect your data"
              : lang === "id"
                ? "Ketentuan penggunaan platform"
                : "Platform usage terms"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="px-5 md:px-6 py-4 max-h-[50vh]">
          <div className="space-y-4 md:space-y-5">
            {content.sections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-sm md:text-base font-semibold text-foreground mb-1.5">
                  {idx + 1}. {section.heading}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="px-5 md:px-6 py-3 md:py-4 border-t border-border flex justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              className="bg-foreground text-background hover:bg-foreground/90 px-5 py-2 rounded-lg text-sm font-medium transition-all">
              <span>{t("policy.understand")}</span>
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyDialog;

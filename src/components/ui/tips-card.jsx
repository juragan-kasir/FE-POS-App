import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "tips-dismissed-";

const variantStyles = {
  default: "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
  info: "bg-gradient-to-br from-blue-500 to-blue-600 text-white",
  warning: "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
};

const variantIcons = {
  default: Lightbulb,
  info: Info,
  warning: AlertTriangle
};

const TipsCard = ({ tips = [], title: titleProp, variant = "default", className, dismissKey }) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissKey) return false;
    try {
      return localStorage.getItem(STORAGE_PREFIX + dismissKey) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!dismissKey) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + dismissKey, dismissed);
    } catch {
      /* noop */
    }
  }, [dismissed, dismissKey]);

  if (dismissed) return null;

  const title = titleProp ?? t("common.tips");
  const Icon = safeGet(variantIcons, variant);
  return (
    <div
      className={cn(
        "rounded-xl p-5 flex flex-col relative group",
        safeGet(variantStyles, variant, ""),
        className
      )}>
      {dismissKey && (
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 hover:bg-black/10 transition-opacity">
          <X size={14} />
        </button>
      )}
      <div className="flex items-center gap-2 mb-3">
        <Icon size={20} className="opacity-80" />
        <h4 className="text-sm font-bold uppercase tracking-wider opacity-80">{title}</h4>
      </div>
      <div className="flex-1">
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
              <span className="opacity-60 mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export { TipsCard };

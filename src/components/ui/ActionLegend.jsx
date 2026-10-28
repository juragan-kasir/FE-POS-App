import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const ActionLegend = ({ items = [], className }) => {
  const { t } = useTranslation();
  if (!items || items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 border-b border-border bg-muted/30",
        className
      )}>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("common.legend")}
      </span>
      {items.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.icon && <item.icon size={13} className="text-foreground" />}
          {item.label}
        </span>
      ))}
    </div>
  );
};

export default ActionLegend;

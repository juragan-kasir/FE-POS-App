import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeGet } from "@/lib/safe-lookup";
import DynamicIcon from "@/components/ui/DynamicIcon";

const variantStyles = {
  default: {
    card: "bg-card border border-border",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    subtitle: "text-primary",
    label: "text-muted-foreground",
    value: "text-foreground"
  },
  active: {
    card: "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    iconColor: "text-green-600 dark:text-green-400",
    subtitle: "text-green-600 dark:text-green-400",
    label: "text-green-700 dark:text-green-400",
    value: "text-green-900 dark:text-green-100"
  },
  // inactive/draft used to be solid red/amber blocks — louder than every
  // other card even when they counted nothing. Tinted like the rest.
  inactive: {
    card: "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    iconColor: "text-red-600 dark:text-red-400",
    subtitle: "text-red-600 dark:text-red-400",
    label: "text-red-700 dark:text-red-400",
    value: "text-red-900 dark:text-red-100"
  },
  draft: {
    card: "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    subtitle: "text-amber-600 dark:text-amber-400",
    label: "text-amber-700 dark:text-amber-400",
    value: "text-amber-900 dark:text-amber-100"
  },
  gray: {
    card: "bg-muted dark:bg-muted/20 border border-border dark:border-border",
    iconBg: "bg-muted dark:bg-muted",
    iconColor: "text-muted-foreground dark:text-muted-foreground",
    subtitle: "text-muted-foreground dark:text-muted-foreground",
    label: "text-muted-foreground dark:text-muted-foreground",
    value: "text-foreground dark:text-foreground"
  },
  blue: {
    card: "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    subtitle: "text-blue-600 dark:text-blue-400",
    label: "text-blue-700 dark:text-blue-400",
    value: "text-blue-900 dark:text-blue-100"
  },
  yellow: {
    card: "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    subtitle: "text-yellow-600 dark:text-yellow-400",
    label: "text-yellow-700 dark:text-yellow-400",
    value: "text-yellow-900 dark:text-yellow-100"
  },
  red: {
    card: "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    iconColor: "text-red-600 dark:text-red-400",
    subtitle: "text-red-600 dark:text-red-400",
    label: "text-red-700 dark:text-red-400",
    value: "text-red-900 dark:text-red-100"
  },
  gold: {
    card: "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    subtitle: "text-amber-600 dark:text-amber-400",
    label: "text-amber-600 dark:text-amber-400",
    value: "text-amber-900 dark:text-amber-100"
  },
  expiring: {
    card: "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    iconColor: "text-orange-600 dark:text-orange-400",
    subtitle: "text-orange-600 dark:text-amber-400",
    label: "text-orange-600 dark:text-amber-400",
    value: "text-orange-900 dark:text-orange-100"
  }
};

// Pages already pass "warning" (e.g. pending expenses); it had no style and
// silently fell back to default.
variantStyles.warning = variantStyles.gold;

// Cards that flag a problem (inactive, draft, rejected, expiring) stay
// neutral while they count nothing, so a zero doesn't look like an alert.
const ALERT_VARIANTS = new Set(["inactive", "draft", "red", "expiring", "warning"]);
const isZero = (value) => {
  if (typeof value === "number") return value === 0;
  if (typeof value !== "string") return false;
  const digits = value.replace(/[^0-9]/g, "");
  return digits !== "" && Number(digits) === 0;
};

const StatCard = ({
  label,
  value,
  icon,
  subtitle,
  variant = "default",
  isLoading = false,
  "data-tour": dataTour,
  className = ""
}) => {
  const effective = ALERT_VARIANTS.has(variant) && isZero(value) ? "gray" : variant;
  const s = safeGet(variantStyles, effective, variantStyles.default); // ponytail: akses aman anti object-injection
  return (
    <div
      data-tour={dataTour}
      className={`${s.card} p-6 rounded-xl flex justify-between items-start gap-4 group hover:shadow-md transition-shadow ${className}`}>
      <div>
        <p className={`text-xs font-semibold ${s.label} uppercase tracking-wider`}>{label}</p>
        {isLoading ? (
          <Skeleton className="h-8 w-24 my-1.5" />
        ) : (
          <h3 className={`text-3xl font-bold ${s.value}`}>{value}</h3>
        )}
        {isLoading ? (
          <Skeleton className="h-3 w-32 mt-1" />
        ) : (
          subtitle && (
            <p className={`text-xs font-semibold ${s.subtitle} flex items-center gap-1 mt-1`}>
              {subtitle}
            </p>
          )
        )}
      </div>
      <div
        className={`w-14 h-14 rounded-2xl ${s.iconBg} flex items-center justify-center ${s.iconColor} group-hover:scale-110 transition-transform`}>
        {isLoading ? (
          <Skeleton className="w-7 h-7 rounded-lg" />
        ) : (
          <DynamicIcon icon={icon} size={28} />
        )}
      </div>
    </div>
  );
};

export default StatCard;

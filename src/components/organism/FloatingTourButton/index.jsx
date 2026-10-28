import React from "react";
import { LifeBuoy, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTourStore } from "@/state/tour";
import { useCookies } from "react-cookie";

const STORAGE_KEY = "floating-tour-dismissed";

const FloatingTourButton = () => {
  const { t } = useTranslation();
  const { startTour, isActive } = useTourStore();
  const [cookie] = useCookies();
  const [dismissed, setDismissed] = React.useState(() => {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  const user = cookie?.user;
  const role = user?.roleType || "";
  if (role !== "super_admin") return null;
  if (dismissed) return null;
  if (isActive) return null;

  const handleDismiss = (e) => {
    e.stopPropagation();
    window.localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-30 flex items-end gap-2 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <button
        onClick={handleDismiss}
        title={t("tour.hide")}
        className="mb-1 p-1.5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent shadow-md transition-colors">
        <X size={14} />
      </button>
      <button
        onClick={() => startTour()}
        data-tour="floating-tour"
        title={t("guide.dashboard.startTour", { defaultValue: "Mulai Tur Panduan" })}
        className="group flex items-center gap-2.5 pl-3 pr-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-foreground/20 group-hover:bg-primary-foreground/30 transition-colors">
          <LifeBuoy size={18} className="animate-pulse" />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs font-medium opacity-80 uppercase tracking-wider">
            {t("tour.brand")}
          </span>
          <span className="text-sm font-semibold">{t("tour.startGuide")}</span>
        </div>
      </button>
    </div>
  );
};

export default FloatingTourButton;

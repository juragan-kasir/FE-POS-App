import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Route, Map } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTourStore } from "@/state/tour";
import { superAdminSteps } from "./steps";
import GuidePanel from "./GuidePanel";

const SpotlightOverlay = ({ target }) => {
  const [rect, setRect] = useState(null);

  const update = useCallback(() => {
    if (!target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(target);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height
        });
      }
    }
  }, [target]);

  useEffect(() => {
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  if (!rect) return null;

  const P = 12;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* Top strip */}
      <div
        className="absolute left-0 right-0 bg-black/50 pointer-events-auto"
        style={{ top: 0, height: Math.max(0, rect.top - P) }}
      />
      {/* Bottom strip */}
      <div
        className="absolute left-0 right-0 bg-black/50 pointer-events-auto"
        style={{ top: rect.top + rect.height + P, bottom: 0 }}
      />
      {/* Left strip */}
      <div
        className="absolute bg-black/50 pointer-events-auto"
        style={{
          top: rect.top - P,
          left: 0,
          width: Math.max(0, rect.left - P),
          height: rect.height + P * 2
        }}
      />
      {/* Right strip */}
      <div
        className="absolute bg-black/50 pointer-events-auto"
        style={{
          top: rect.top - P,
          right: 0,
          width: `calc(100% - ${rect.left + rect.width + P}px)`,
          height: rect.height + P * 2
        }}
      />
      {/* Spotlight border glow */}
      <div
        className="absolute rounded-lg pointer-events-none"
        style={{
          top: rect.top - P - 1,
          left: rect.left - P - 1,
          width: rect.width + P * 2 + 2,
          height: rect.height + P * 2 + 2,
          boxShadow: "0 0 0 2px hsl(var(--primary)), 0 0 20px hsla(var(--primary), 0.4)"
        }}
      />
    </div>
  );
};

const SuperAdminTour = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const navigate = useNavigate();
  const user = cookie?.user;
  const role = user?.roleType;
  const isSuperAdmin = role === "super_admin";

  const [showMenu, setShowMenu] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const {
    isActive,
    currentStep,
    isMinimized,
    startTour,
    nextStep,
    prevStep,
    endTour,
    toggleMinimized
  } = useTourStore();

  const step = superAdminSteps.at(currentStep);
  const totalSteps = superAdminSteps.length;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const Icon = step?.icon;
  const hasSpotlight = !!step?.target;

  const handleNext = () => {
    const nextIdx = currentStep + 1;
    const nextStepData = superAdminSteps.at(nextIdx);
    nextStep();
    if (nextStepData?.page) {
      navigate(nextStepData.page);
    }
  };

  const handlePrev = () => {
    // ponytail: .at(-1) wrap-around — guard indeks non-negatif agar tetap undefined
    const prevIdx = currentStep - 1;
    const prevStepData = prevIdx >= 0 ? superAdminSteps.at(prevIdx) : undefined;
    prevStep();
    if (prevStepData?.page) {
      navigate(prevStepData.page);
    }
  };

  const handleStart = () => {
    setShowMenu(false);
    startTour();
    const firstStepData = superAdminSteps[0];
    if (firstStepData?.page) {
      navigate(firstStepData.page);
    }
  };

  const handleFinish = () => {
    endTour();
    navigate("/dashboard-super-admin");
  };

  const handleFabClick = () => {
    if (isActive) {
      toggleMinimized();
    } else if (showGuide) {
      setShowGuide(false);
    } else {
      setShowMenu((prev) => !prev);
    }
  };

  const handleOpenGuide = () => {
    setShowMenu(false);
    setShowGuide(true);
  };

  const handleCloseGuide = () => {
    setShowGuide(false);
  };

  const handleFabBlur = () => {
    setTimeout(() => setShowMenu(false), 200);
  };

  if (!isSuperAdmin) return null;

  return (
    <>
      {/* Spotlight overlay */}
      {isActive && !isMinimized && hasSpotlight && (
        <SpotlightOverlay
          key={`spotlight-${currentStep}`}
          target={step.target}
          stepIndex={currentStep}
        />
      )}

      {/* Floating help button */}
      {(!isActive || isMinimized) && (
        <div className="fixed bottom-24 right-8 z-[20] flex flex-col items-end gap-2">
          {/* FAB menu popover */}
          {showMenu && (
            <div className="mb-2 bg-background border rounded-xl shadow-xl overflow-hidden min-w-[200px]">
              <button
                type="button"
                onClick={handleStart}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors text-left">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Route size={16} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t("guide.menu.tour")}</p>
                  <p className="text-xs text-muted-foreground">{t("guide.menu.tourDesc")}</p>
                </div>
              </button>
              <div className="border-t" />
              <button
                type="button"
                onClick={handleOpenGuide}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors text-left">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <BookOpen size={16} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t("guide.menu.guide")}</p>
                  <p className="text-xs text-muted-foreground">{t("guide.menu.guideDesc")}</p>
                </div>
              </button>
            </div>
          )}
          {/* FAB button */}
          <button
            type="button"
            onClick={handleFabClick}
            onBlur={handleFabBlur}
            className="p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
            title={t("translation:guide.dashboard.fabTitle")}>
            <Map size={22} />
          </button>
        </div>
      )}

      {/* Guide Panel */}
      {showGuide && <GuidePanel onClose={handleCloseGuide} />}

      {/* Tour panel */}
      {isActive && !isMinimized && step && (
        <div className="fixed bottom-6 right-6 z-[70] w-[340px] sm:w-[380px]">
          <Card className="shadow-2xl border border-primary/20 overflow-hidden bg-background">
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                {t("translation:guide.dashboard.step", {
                  current: currentStep + 1,
                  total: totalSteps
                })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleMinimized}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title={t("translation:guide.dashboard.minimize")}>
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title={t("translation:guide.dashboard.close")}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base leading-tight mb-1.5 text-foreground">
                    {t(`translation:${step.titleKey}`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`translation:${step.descKey}`)}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 pb-4 pt-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={isFirst}
                onClick={handlePrev}
                className="gap-1 text-xs">
                <ChevronLeft size={14} />
                {t("translation:guide.dashboard.prev")}
              </Button>

              {isLast ? (
                <Button size="sm" onClick={handleFinish} className="gap-1 text-xs">
                  {t("translation:guide.dashboard.finish")}
                </Button>
              ) : (
                <Button size="sm" onClick={handleNext} className="gap-1 text-xs">
                  {t(`translation:${step.actionKey}`)}
                  <ChevronRight size={14} />
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default SuperAdminTour;

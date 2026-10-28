import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorizontalOverflow } from "@/hooks/useHorizontalOverflow";

// Scrollbars are hidden app-wide (index.css), and our users drive the POS
// with a desktop mouse (no trackpad swipe), so an overflowing table needs an
// explicit, clickable way to move sideways. While (and only while) content
// overflows, this shows:
//   - a control bar above the table with a hint and ◀ ▶ buttons (each
//     disabled once that side is fully scrolled),
//   - a grabbable scrollbar under the table (.scrollbar-visible),
//   - an edge fade on each side that still hides columns,
// and makes the viewport a labelled, focusable region so keyboard users can
// scroll it with the arrow keys. Nothing here is printed.
const FADE_FROM = {
  card: { left: "from-card", right: "from-card" },
  background: { left: "from-background", right: "from-background" }
};

// One click moves most of a viewport, keeping a strip of the previous
// columns in view as an anchor.
const STEP_RATIO = 0.8;
const MIN_STEP_PX = 120;

const ScrollButton = ({ direction, label, disabled, onClick, testId }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    data-testid={testId}
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:border-border disabled:bg-card disabled:text-muted-foreground disabled:opacity-50 disabled:shadow-none">
    {direction === "left" ? (
      <ChevronLeft size={18} aria-hidden="true" />
    ) : (
      <ChevronRight size={18} aria-hidden="true" />
    )}
  </button>
);

ScrollButton.propTypes = {
  direction: PropTypes.oneOf(["left", "right"]).isRequired,
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  testId: PropTypes.string
};

const HorizontalScrollArea = ({
  children,
  label,
  className,
  viewportClassName,
  fade = "card",
  viewportRef,
  contentKey,
  testIdPrefix,
  controls = true,
  fill = false
}) => {
  const { t } = useTranslation();
  const { ref, canScrollLeft, canScrollRight, overflowing } = useHorizontalOverflow(contentKey);
  const fadeFrom = FADE_FROM[fade] || FADE_FROM.card;
  const testId = (part) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);

  const setViewport = useCallback(
    (node) => {
      ref.current = node;
      if (typeof viewportRef === "function") viewportRef(node);
      else if (viewportRef) viewportRef.current = node;
    },
    [ref, viewportRef]
  );

  const scrollByStep = (dir) => {
    const el = ref.current;
    if (!el) return;
    const left = dir * Math.max(MIN_STEP_PX, Math.round(el.clientWidth * STEP_RATIO));
    if (typeof el.scrollBy === "function") el.scrollBy({ left, behavior: "smooth" });
    else el.scrollLeft += left;
  };

  return (
    <div className={cn(fill && "flex flex-col", className)}>
      {controls && overflowing && (
        <div
          data-testid={testId("controls")}
          className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-3 py-1.5 print:hidden">
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <MoveHorizontal size={14} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{t("common.tableScrollHint")}</span>
            <kbd className="hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-sans text-xs font-medium text-muted-foreground lg:inline">
              {t("common.tableScrollShortcut")}
            </kbd>
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <ScrollButton
              direction="left"
              label={t("common.scrollTableLeft")}
              disabled={!canScrollLeft}
              onClick={() => scrollByStep(-1)}
              testId={testId("scroll-left")}
            />
            <ScrollButton
              direction="right"
              label={t("common.scrollTableRight")}
              disabled={!canScrollRight}
              onClick={() => scrollByStep(1)}
              testId={testId("scroll-right")}
            />
          </div>
        </div>
      )}
      <div className={cn("relative", fill && "min-h-0 flex-1")}>
        {canScrollLeft && (
          <div
            data-testid={testId("fade-left")}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r to-transparent print:hidden",
              fadeFrom.left
            )}
          />
        )}
        {canScrollRight && (
          <div
            data-testid={testId("fade-right")}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l to-transparent print:hidden",
              fadeFrom.right
            )}
          />
        )}
        <div
          ref={setViewport}
          data-testid={testId("viewport")}
          role={overflowing ? "region" : undefined}
          aria-label={overflowing ? label || t("common.horizontalScrollRegion") : undefined}
          tabIndex={overflowing ? 0 : undefined}
          className={cn(
            "overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            fill && "h-full overflow-y-auto",
            overflowing && "scrollbar-visible",
            viewportClassName
          )}>
          {children}
        </div>
      </div>
    </div>
  );
};

HorizontalScrollArea.propTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.string,
  className: PropTypes.string,
  viewportClassName: PropTypes.string,
  fade: PropTypes.oneOf(["card", "background"]),
  viewportRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  contentKey: PropTypes.any,
  testIdPrefix: PropTypes.string,
  // Set false only where another control already scrolls the area.
  controls: PropTypes.bool,
  // Fill a height-constrained flex parent and scroll vertically too.
  fill: PropTypes.bool
};

export default HorizontalScrollArea;

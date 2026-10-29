import React, { useEffect, useMemo, useState } from "react";
import { Check, Clock, PartyPopper, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { secureRandom } from "@/utils/secureRandom";

const CONFETTI_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#a855f7",
  "#ef4444",
  "#14b8a6"
];

const Confetti = ({ count = 36 }) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: secureRandom() * 100,
        delay: secureRandom() * 0.8,
        duration: 2.2 + secureRandom() * 1.6,
        size: 6 + secureRandom() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: secureRandom() * 360,
        drift: (secureRandom() - 0.5) * 140
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
            transform: `rotate(${p.rotate}deg)`
          }}
        />
      ))}
    </div>
  );
};

const AUTO_DISMISS_MS = 6000;

const ThankYouModal = ({ event, onDismiss }) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [closing, setClosing] = useState(false);

  const orderNumber = event?.orderNumber || event?.invoice || "";
  const total = Number(event?.total) || 0;

  useEffect(() => {
    if (!event) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        handleClose();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [event?.eventId]);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center p-6 bg-background/70 backdrop-blur-md transition-opacity duration-300 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}>
      <Confetti />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("page.customerDisplayBoard.thankYou.title")}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden transition-all duration-300 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.close")}
            className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="relative p-8 sm:p-10 text-center">
          <div className="relative inline-flex mb-6">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 thank-you-pop">
              <Check size={48} strokeWidth={3} className="text-white" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <PartyPopper size={20} className="text-primary" />
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
              {t("page.customerDisplayBoard.thankYou.badge")}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight mb-3">
            {t("page.customerDisplayBoard.thankYou.title")}
          </h2>

          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("page.customerDisplayBoard.thankYou.desc")}
          </p>

          {orderNumber && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2">
              <Clock size={16} className="text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                {t("page.customerDisplayBoard.thankYou.orderNo")}:
              </span>
              <span className="font-mono font-bold text-foreground">{orderNumber}</span>
            </div>
          )}

          {total > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("page.customerDisplayBoard.thankYou.total")}:
              </span>
              <span className="text-2xl font-black text-primary tabular-nums">
                {formatIDR(total)}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="mt-8 w-full sm:w-auto sm:min-w-[220px] h-12 rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            {t("page.customerDisplayBoard.thankYou.dismiss")}
          </button>

          <div className="mt-6 mx-auto w-full max-w-[280px] h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            {t("page.customerDisplayBoard.thankYou.autoClose")}
          </p>
        </div>
      </div>
    </div>
  );
};

const formatIDR = (val) => `Rp ${(val || 0).toLocaleString("id-ID")}`;

export default ThankYouModal;

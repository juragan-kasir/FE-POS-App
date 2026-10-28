import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const AUTO_DISMISS_MS = 180000;

const formatIDR = (val) => `Rp ${(val || 0).toLocaleString("id-ID")}`;

const QrisPaymentModal = ({ event, onDismiss }) => {
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);

  const total = Number(event?.total) || 0;
  const tableName = event?.tableName || "";
  const qrValue =
    event?.qrValue || `QRIS|${event?.store || ""}|${total}|${event?.eventId || Date.now()}`;
  useEffect(() => {
    const timer = setTimeout(handleClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [event?.eventId]);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[85] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md transition-opacity duration-300 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("page.customerDisplayBoard.qris.title")}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden transition-all duration-300 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={handleClose}
            aria-label={t("common.close")}
            className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="relative p-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Smartphone size={18} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
              QRIS
            </span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-foreground leading-tight mb-2">
            {t("page.customerDisplayBoard.qris.title")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            {t("page.customerDisplayBoard.qris.desc")}
          </p>

          {tableName && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("page.customerDisplayBoard.table")}:
              </span>
              <span className="font-bold text-foreground">{tableName}</span>
            </div>
          )}

          <div className="mx-auto w-fit p-5 bg-white rounded-2xl border border-border/60 shadow-lg">
            <QRCodeSVG
              value={qrValue}
              size={220}
              level="M"
              marginSize={0}
              fgColor="#111111"
              bgColor="#ffffff"
            />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-muted-foreground">
              {t("page.customerDisplayBoard.qris.total")}
            </p>
            <p className="text-4xl font-black text-primary tabular-nums mt-1">{formatIDR(total)}</p>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/70">
            {t("page.customerDisplayBoard.qris.autoClose")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QrisPaymentModal;

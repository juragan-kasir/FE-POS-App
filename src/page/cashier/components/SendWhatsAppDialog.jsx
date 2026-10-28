import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getInvoiceWhatsAppText } from "@/services/invoice";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const P = "page.cashier.receipt";

// wa.me wants the number with country code, digits only. Indonesian local
// forms (08…, 8…) are mapped to 62…; WhatsApp itself rejects a number that
// is not on WhatsApp.
export const toWhatsAppNumber = (raw) => {
  let digits = String(raw || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return /^[1-9][0-9]{9,14}$/.test(digits) ? digits : null;
};

// Sends the receipt to the member/customer on WhatsApp. Primary path: a
// wa.me link that opens the WhatsApp already on this device (app on
// phone/iPad, Desktop or Web) with the message prefilled — the cashier
// taps Send there. The message is fetched when the dialog opens so the link
// is a plain tap (iOS Safari blocks opening apps after an async request).
const SendWhatsAppDialog = ({ orderId, defaultPhone = "", onClose }) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState(defaultPhone);
  const [phoneError, setPhoneError] = useState(null);

  const textQuery = useQuery(["invoice-wa-text", orderId], () => getInvoiceWhatsAppText(orderId), {
    staleTime: 0,
    refetchOnWindowFocus: false
  });
  const text = textQuery.data?.data?.text || "";
  const waNumber = toWhatsAppNumber(phone);

  // Empty number = let the cashier pick the contact inside WhatsApp; a
  // typed number must be valid.
  const numberProblem = phone.trim() !== "" && !waNumber;
  const guardNumber = (e) => {
    if (numberProblem) {
      e?.preventDefault();
      setPhoneError(t(`${P}.waInvalidPhone`));
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const linkReady = !!text && !textQuery.isLoading;
  const encoded = encodeURIComponent(text);
  const href = waNumber
    ? `https://wa.me/${waNumber}?text=${encoded}`
    : numberProblem
      ? "#"
      : `https://wa.me/?text=${encoded}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-0" withX={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-emerald-600" />
            <DialogTitle className="font-bold">{t(`${P}.sendWATitle`)}</DialogTitle>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="wa-phone"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t(`${P}.waPhoneLabel`)}
            </label>
            <Input
              id="wa-phone"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              placeholder={t(`${P}.phonePlaceholder`)}
              aria-invalid={!!phoneError || undefined}
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ""));
                setPhoneError(null);
              }}
              maxLength={FIELD_LIMITS.PHONE}
            />
            {phoneError ? (
              <p role="alert" className="text-xs text-destructive">
                {phoneError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t(`${P}.waPhoneHint`)}</p>
            )}
          </div>

          {textQuery.isError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <span>{t(`${P}.waTextError`)}</span>
              <Button size="sm" variant="outline" onClick={() => textQuery.refetch()}>
                {t(`${P}.waRetry`)}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t(`${P}.waDirectHint`)}</p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/50 p-4">
          {linkReady ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={guardNumber}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
              <MessageCircle size={16} />
              {t(`${P}.waOpenManual`)}
            </a>
          ) : (
            <Button disabled loading={textQuery.isLoading} className="w-full">
              {t(`${P}.waOpenManual`)}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

SendWhatsAppDialog.propTypes = {
  orderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  defaultPhone: PropTypes.string,
  onClose: PropTypes.func.isRequired
};

export default SendWhatsAppDialog;

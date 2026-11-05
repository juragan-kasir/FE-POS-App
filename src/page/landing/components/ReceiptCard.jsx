import React from "react";
import { useTranslation } from "react-i18next";

import { SAMPLE_RECEIPT } from "@/constants/landing";
import { cn } from "@/lib/utils";
import { formatRupiahPlain } from "@/utils/formatter-currency";

const ReceiptRow = ({ label, amount, isStrong = false }) => (
  <div className={cn("flex items-baseline justify-between gap-3", isStrong && "font-medium")}>
    <dt>{label}</dt>
    <dd className="tabular-nums">{formatRupiahPlain(amount)}</dd>
  </div>
);

const ReceiptCard = ({ className }) => {
  const { t } = useTranslation();

  return (
    <aside
      aria-label={t("landing.receipt.label")}
      className={cn(
        "jk-receipt w-[272px] bg-[#FFFDF7] px-5 py-7 font-jk-mono text-[12.5px] leading-[1.7] text-jk-ink",
        className
      )}>
      <p className="text-center text-[13px] font-medium">{t("landing.receipt.store")}</p>
      <p className="mb-3 text-center text-[11px] text-jk-stone">{t("landing.receipt.sample")}</p>
      <dl className="border-y border-dashed border-jk-ink/40 py-2">
        {SAMPLE_RECEIPT.lines.map((line) => (
          <ReceiptRow key={line.id} label={t(line.labelKey)} amount={line.amount} />
        ))}
      </dl>
      <dl className="pt-2">
        <ReceiptRow label={t("landing.receipt.subtotal")} amount={SAMPLE_RECEIPT.subtotal} />
        <ReceiptRow label={t("landing.receipt.tax")} amount={SAMPLE_RECEIPT.tax} />
        <ReceiptRow label={t("landing.receipt.total")} amount={SAMPLE_RECEIPT.total} isStrong />
      </dl>
    </aside>
  );
};

export default ReceiptCard;

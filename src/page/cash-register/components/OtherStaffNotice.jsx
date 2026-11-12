import React from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";

const P = "page.cashRegister.otherStaff";

const activityParts = (person, t, formatAmount, hideAmounts) => {
  const parts = [];
  if (person.salesCount > 0) {
    parts.push(
      hideAmounts
        ? t(`${P}.salesCount`, { count: person.salesCount })
        : t(`${P}.sales`, { count: person.salesCount, amount: formatAmount(person.salesAmount) })
    );
  }
  if (person.refundCount > 0) {
    parts.push(
      hideAmounts
        ? t(`${P}.refundsCount`, { count: person.refundCount })
        : t(`${P}.refunds`, {
            count: person.refundCount,
            amount: formatAmount(person.refundAmount)
          })
    );
  }
  return parts.join(" · ");
};

const OtherStaffNotice = ({ otherStaff = [], formatAmount, hideAmounts = false }) => {
  const { t } = useTranslation();
  const people = otherStaff.filter((person) => person.salesCount > 0 || person.refundCount > 0);
  if (people.length === 0) return null;

  return (
    <div
      role="note"
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5 text-sm">
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <Users size={16} aria-hidden="true" className="text-amber-600" />
        {t(`${P}.title`)}
      </p>
      <p className="text-xs text-muted-foreground">{t(`${P}.hint`)}</p>
      <ul className="space-y-0.5">
        {people.map((person) => (
          <li key={person.userId} className="flex justify-between gap-3 text-xs">
            <span className="font-medium text-foreground">{person.fullName || "-"}</span>
            <span className="text-muted-foreground text-right">
              {activityParts(person, t, formatAmount, hideAmounts)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OtherStaffNotice;

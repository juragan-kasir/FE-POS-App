import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/utils/receiptDocument";

const NON_DIGITS = /[^0-9]/g;

export const splitCashTender = (input, amountDue) => {
  const cashReceived = input === "" ? null : Number(input);
  const covers = cashReceived !== null && cashReceived >= amountDue;
  return {
    cashReceived,
    covers,
    changeAmount: covers ? cashReceived - amountDue : 0
  };
};

const SplitCashTender = ({ id, amountDue, value, onChange }) => {
  const { t } = useTranslation();
  const { cashReceived, covers, changeAmount } = splitCashTender(value, amountDue);
  const isShort = cashReceived !== null && !covers;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium">
        {t("page.cashier.cashAmount")}
      </label>
      <div className="flex items-center gap-2">
        <Input
          unstyled
          id={id}
          inputMode="numeric"
          placeholder={String(amountDue)}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(NON_DIGITS, ""))}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 text-xs"
          onClick={() => onChange(String(amountDue))}>
          {t("page.cashier.exactCash")}
        </Button>
      </div>
      {isShort ? (
        <p className="text-xs text-destructive">
          {t("page.cashier.collectPayment.cashInsufficient")}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("page.cashier.change")}: {formatRupiah(changeAmount)}
        </p>
      )}
    </div>
  );
};

SplitCashTender.propTypes = {
  id: PropTypes.string.isRequired,
  amountDue: PropTypes.number.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

export default SplitCashTender;

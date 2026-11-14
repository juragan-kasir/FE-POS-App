import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CASH_REGISTER_PATHS } from "@/constants/cashRegister";

const CashierShiftNotice = ({ store, register, isLoading, canOpenRegister }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!store || isLoading || register) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm lg:px-6">
      <LockKeyhole size={16} aria-hidden="true" className="shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 text-foreground">{t("page.cashier.shift.closedNotice")}</p>
      {canOpenRegister && (
        <Button
          type="button"
          size="sm"
          className="rounded-lg"
          onClick={() => navigate(CASH_REGISTER_PATHS.open)}>
          {t("page.cashier.shift.open")}
        </Button>
      )}
    </div>
  );
};

CashierShiftNotice.propTypes = {
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  register: PropTypes.object,
  isLoading: PropTypes.bool,
  canOpenRegister: PropTypes.bool
};

export default CashierShiftNotice;

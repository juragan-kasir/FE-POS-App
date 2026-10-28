import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, CheckCircle2, Clock, ShieldCheck, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/organism/modal";
import { decideCashVariance } from "@/services/cash-register";
import { VARIANCE_STATUS, varianceDecisionErrorKind } from "@/utils/varianceApproval";

// DR-15 cash-variance decision UI. Status is always shown as text plus an
// icon (never color alone); the decision itself is confirmed in a dialog and
// the backend response/refetch is the only source of the resulting status.

// Explicit selection per backend enum value (no dynamic key lookup).
const badgeConfig = (status) => {
  switch (status) {
    case VARIANCE_STATUS.PENDING:
      return {
        labelKey: "page.cashRegister.variance.status.pendingApproval",
        icon: Clock,
        className: "bg-amber-100 text-amber-900 border-amber-300"
      };
    case VARIANCE_STATUS.APPROVED:
      return {
        labelKey: "page.cashRegister.variance.status.approved",
        icon: CheckCircle2,
        className: "bg-green-100 text-green-800 border-green-300"
      };
    case VARIANCE_STATUS.REJECTED:
      return {
        labelKey: "page.cashRegister.variance.status.rejected",
        icon: XCircle,
        className: "bg-red-100 text-red-800 border-red-300"
      };
    case VARIANCE_STATUS.AUTO_APPROVED:
      return {
        labelKey: "page.cashRegister.variance.status.autoApproved",
        icon: ShieldCheck,
        className: "bg-muted text-muted-foreground border-border"
      };
    default:
      return null;
  }
};

export const varianceNoteKey = (status) => {
  switch (status) {
    case VARIANCE_STATUS.PENDING:
      return "page.cashRegister.variance.note.pending";
    case VARIANCE_STATUS.APPROVED:
      return "page.cashRegister.variance.note.approved";
    case VARIANCE_STATUS.REJECTED:
      return "page.cashRegister.variance.note.rejected";
    case VARIANCE_STATUS.AUTO_APPROVED:
      return "page.cashRegister.variance.note.autoApproved";
    default:
      return null;
  }
};

const errorKey = (kind) => {
  switch (kind) {
    case "conflict":
      return "page.cashRegister.variance.error.conflict";
    case "forbidden":
      return "page.cashRegister.variance.error.forbidden";
    case "failed":
      return "page.cashRegister.variance.error.failed";
    default:
      return "page.cashRegister.variance.error.network";
  }
};

export const VarianceApprovalBadge = ({ status }) => {
  const { t } = useTranslation();
  const cfg = badgeConfig(status);
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${cfg.className}`}>
      <Icon size={12} aria-hidden="true" />
      {t(cfg.labelKey)}
    </span>
  );
};

VarianceApprovalBadge.propTypes = {
  status: PropTypes.string
};

// Stops clicks/keys inside the controls (and their portalled dialog, whose
// React events still bubble through this tree) from activating a clickable
// parent such as a DataTable row.
const stop = (e) => e.stopPropagation();

export const VarianceDecisionControls = ({ registerId, varianceLabel, onDecided }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // The chosen decision outlives the open flag so the dialog keeps its copy
  // while it animates closed.
  const [dialog, setDialog] = useState({ open: false, decision: "approve" });
  // Guards against several confirm clicks landing before the mutation's
  // loading state has re-rendered the dialog.
  const inFlightRef = useRef(false);
  const mutation = useMutation((value) => decideCashVariance(registerId, value));
  const busy = mutation.isLoading;

  const refresh = () => {
    queryClient.invalidateQueries(["cash-register-history"]);
    queryClient.invalidateQueries(["cash-register-z-report", registerId]);
  };

  const submit = async () => {
    if (!dialog.open || inFlightRef.current) return false;
    inFlightRef.current = true;
    const approve = dialog.decision === "approve";
    try {
      const res = await mutation.mutateAsync(dialog.decision);
      toast.success(
        t(
          approve
            ? "page.cashRegister.variance.toast.approved"
            : "page.cashRegister.variance.toast.rejected"
        )
      );
      onDecided?.(
        res?.data?.varianceApprovalStatus ||
          (approve ? VARIANCE_STATUS.APPROVED : VARIANCE_STATUS.REJECTED)
      );
      refresh();
    } catch (err) {
      const kind = varianceDecisionErrorKind(err);
      toast.error(t(errorKey(kind)));
      if (kind === "conflict") refresh();
    } finally {
      inFlightRef.current = false;
    }
    return undefined;
  };

  const approve = dialog.decision === "approve";

  return (
    <div className="flex items-center justify-center gap-2" onClick={stop} onKeyDown={stop}>
      <Button
        type="button"
        variant="success"
        size="sm"
        className="h-11 min-w-[44px] px-4 gap-1.5"
        disabled={busy}
        onClick={() => setDialog({ open: true, decision: "approve" })}>
        <Check size={16} aria-hidden="true" />
        {t("page.cashRegister.variance.approve")}
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="h-11 min-w-[44px] px-4 gap-1.5"
        disabled={busy}
        onClick={() => setDialog({ open: true, decision: "reject" })}>
        <X size={16} aria-hidden="true" />
        {t("page.cashRegister.variance.reject")}
      </Button>
      <Modal
        type="confirm"
        open={dialog.open}
        onOpenChange={(o) => !o && setDialog((d) => ({ ...d, open: false }))}
        title={t(
          approve
            ? "page.cashRegister.variance.approveTitle"
            : "page.cashRegister.variance.rejectTitle"
        )}
        description={t(
          approve
            ? "page.cashRegister.variance.approveDesc"
            : "page.cashRegister.variance.rejectDesc",
          { amount: varianceLabel || "-" }
        )}
        confirmText={t(
          approve
            ? "page.cashRegister.variance.approveConfirm"
            : "page.cashRegister.variance.rejectConfirm"
        )}
        confirmVariant={approve ? "success" : "destructive"}
        loading={busy}
        onConfirm={submit}
      />
    </div>
  );
};

VarianceDecisionControls.propTypes = {
  registerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  varianceLabel: PropTypes.string,
  onDecided: PropTypes.func
};

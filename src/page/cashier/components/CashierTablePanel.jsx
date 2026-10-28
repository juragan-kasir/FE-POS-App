import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { toast } from "sonner";
import { Armchair, X, RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getCashierTables, releaseCashierTable } from "@/services/table";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const P = "page.cashier.tables";

export const cashierTablesKey = (store) => ["cashier-tables", String(store || "")];

const STATUS_STYLE = {
  occupied: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  reserved: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  maintenance: "bg-muted text-foreground"
};

const QUICK_REASONS = ["reasonGuestsLeft", "reasonWrongTable", "reasonReservationCancelled"];

const formatRupiah = (n) => `Rp${Number(n || 0).toLocaleString("id-ID")}`;

// Cashier table panel (client request, BA C-16 amended 2026-10-20): put a
// table back to "available" — guests left, a table picked or reserved by
// mistake. Which tables the caller may reset is decided by the server
// (a kasir never resets a table with an unpaid order); a reason is required.
const CashierTablePanel = ({ store, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [targets, setTargets] = useState(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);

  const tablesQuery = useQuery(cashierTablesKey(store), () => getCashierTables(store), {
    enabled: !!store,
    staleTime: 0
  });
  const notAvailable = (tablesQuery.data?.data || []).filter((tb) => tb.status !== "available");
  const resettable = notAvailable.filter((tb) => tb.canRelease);

  const release = useMutation(
    async ({ tables, why }) => {
      const results = [];
      for (const table of tables) {
        try {
          await releaseCashierTable({ id: table.id, reason: why, storeId: store });
          results.push({ table, ok: true });
        } catch (err) {
          results.push({ table, ok: false, code: err?.response?.data?.code });
        }
      }
      return results;
    },
    {
      onSuccess: (results) => {
        const ok = results.filter((r) => r.ok);
        const failed = results.filter((r) => !r.ok);
        if (ok.length) toast.success(t(`${P}.toastReleased`, { count: ok.length }));
        if (failed.length) {
          toast.error(t(`${P}.toastFailed`, { count: failed.length }), {
            description: failed
              .map((r) => `${r.table.name}: ${t(`${P}.blocked.${r.code}`, r.code || "")}`)
              .join(", ")
          });
        }
        // Prefix match: the panel, the cashier badge and the checkout table
        // picker all refresh, whatever form the store id was keyed with.
        ["cashier-tables", "table-availability", "table-active-orders"].forEach((key) =>
          queryClient.invalidateQueries([key])
        );
        setTargets(null);
        setReason("");
      }
    }
  );

  const confirm = () => {
    const why = reason.trim();
    if (!why) {
      setReasonError(true);
      return;
    }
    release.mutate({ tables: targets, why });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !release.isLoading && onClose()}>
      <DialogContent
        className="max-w-md max-h-[85vh] flex flex-col overflow-hidden p-0"
        withX={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Armchair size={18} className="text-primary" />
            <DialogTitle className="font-bold">{t(`${P}.title`)}</DialogTitle>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent">
            <X size={16} />
          </button>
        </div>

        {targets ? (
          <div className="p-5 space-y-3 overflow-y-auto">
            <p className="text-sm">
              {t(`${P}.confirmText`, {
                tables: targets.map((tb) => tb.name).join(", ")
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setReason(t(`${P}.${key}`));
                    setReasonError(false);
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary">
                  {t(`${P}.${key}`)}
                </button>
              ))}
            </div>
            <label htmlFor="table-release-reason" className="block text-xs font-semibold">
              {t(`${P}.reasonLabel`)} <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="table-release-reason"
              rows={2}
              maxLength={FIELD_LIMITS.DESCRIPTION}
              value={reason}
              aria-invalid={reasonError || undefined}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(false);
              }}
            />
            {reasonError && (
              <p role="alert" className="text-xs text-destructive">
                {t(`${P}.reasonRequired`)}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                disabled={release.isLoading}
                onClick={() => setTargets(null)}>
                {t("common.cancel")}
              </Button>
              <Button className="flex-1" loading={release.isLoading} onClick={confirm}>
                {t(`${P}.confirm`)}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {tablesQuery.isLoading && (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="animate-spin" size={20} />
              </div>
            )}
            {tablesQuery.isError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-2 text-sm text-destructive">
                <span>{t(`${P}.loadError`)}</span>
                <Button size="sm" variant="outline" onClick={() => tablesQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              </div>
            )}
            {tablesQuery.isSuccess && notAvailable.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t(`${P}.allAvailable`)}
              </p>
            )}
            {resettable.length > 1 && (
              <Button variant="outline" className="w-full" onClick={() => setTargets(resettable)}>
                <RotateCcw size={14} />
                {t(`${P}.resetAll`, { count: resettable.length })}
              </Button>
            )}
            {notAvailable.map((tb) => (
              <div
                key={tb.id}
                data-testid={`cashier-table-${tb.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tb.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[tb.status] || STATUS_STYLE.maintenance}`}>
                      {t(`page.table.status.${tb.status}`, tb.status)}
                    </span>
                  </div>
                  {tb.unpaidOrders?.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`${P}.unpaid`)}{" "}
                      {tb.unpaidOrders
                        .map((o) => `${o.orderNumber} (${formatRupiah(o.totalPrice)})`)
                        .join(", ")}
                    </p>
                  )}
                  {!tb.canRelease && tb.blockedReason && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <AlertCircle size={12} />
                      {t(`${P}.blocked.${tb.blockedReason}`)}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={!tb.canRelease}
                  onClick={() => setTargets([tb])}>
                  {t(`${P}.release`)}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

CashierTablePanel.propTypes = {
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired
};

export default CashierTablePanel;

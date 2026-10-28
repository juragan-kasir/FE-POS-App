import React from "react";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { cancelShiftSwap } from "@/services/shiftSwap";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

const isSwapQuery = (query) => {
  const key = query.queryKey;
  return (
    Array.isArray(key) && key.some((k) => typeof k === "string" && k.toLowerCase().includes("swap"))
  );
};

const CancelSwapDialog = ({ open, onOpenChange, swap, onSuccess }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation(cancelShiftSwap, {
    onSuccess: (data) => {
      toast.success("Pembatalan Berhasil", {
        description: "Permintaan tukar shift telah dibatalkan."
      });
      queryClient.invalidateQueries({
        predicate: isSwapQuery,
        refetchActive: true
      });
      onSuccess?.(data);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Gagal Membatalkan", {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const handleCancel = () => {
    if (!swap) return;
    cancelMutation.mutate({ id: swap.id });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-primary" />
            {t("page.shift.ui.cancelShiftSwap")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("page.shift.ui.cancelThisShiftSwapRequest")}
          </DialogDescription>
        </DialogHeader>

        {swap && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground flex items-center flex-wrap gap-x-2 gap-y-1">
              <span>{swap.requesterUser?.fullName || `Karyawan #${swap.requesterId}`}</span>
              <ArrowRightLeft size={13} className="text-primary shrink-0" />
              <span>{swap.targetUser?.fullName || `Karyawan #${swap.targetId}`}</span>
            </p>
            {swap.note && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{swap.note}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={cancelMutation.isLoading}
            onClick={() => onOpenChange(false)}>
            {t("common.no")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={cancelMutation.isLoading}
            onClick={handleCancel}>
            {cancelMutation.isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRightLeft size={14} />
            )}
            {cancelMutation.isLoading ? "Membatalkan..." : "Ya, Batalkan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelSwapDialog;

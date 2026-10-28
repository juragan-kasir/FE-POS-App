import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Clock, Utensils, ShoppingBag, PlayCircle, XCircle, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { getParkedCarts, resumeParkedCart, cancelParkedCart } from "@/services/parked-cart";
import { Skeleton } from "@/components/ui/skeleton";
import CollapsiblePanel from "@/components/ui/CollapsiblePanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

const ParkedCartCard = ({ cart, onResume, onCancel, isBusy }) => {
  const { t } = useTranslation();
  const isDineIn = !!cart.tableId;
  const isExpired = cart.status === "expired";

  return (
    <div
      className={`shrink-0 w-60 bg-card border rounded-xl p-3.5 transition-all ${
        isExpired ? "border-border/40 opacity-60" : "border-border/60 hover:border-primary/50"
      }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-foreground">#{cart.id}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${
            isExpired ? "bg-muted-foreground" : "bg-amber-500"
          }`}>
          {isExpired
            ? t("page.cashier.parkedCart.expired", "Expired")
            : t("page.cashier.parkedCart.active", "Parked")}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        {isDineIn ? <Utensils size={12} /> : <ShoppingBag size={12} />}
        <span>
          {isDineIn
            ? `${t("page.cashier.orderQueue.table")} ${cart.table?.name || cart.tableId}`
            : t("page.cashier.orderQueue.takeaway")}
        </span>
      </div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs text-muted-foreground">
          {cart.displayTotalItems || 0} {t("page.cashier.orderQueue.items")}
        </span>
        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
          <Clock size={10} />
          {timeAgo(cart.createdAt)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isBusy || isExpired}
          onClick={() => onResume(cart)}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <PlayCircle size={13} />
          {t("page.cashier.parkedCart.resume", "Resume")}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onCancel(cart)}
          aria-label={t("page.cashier.parkedCart.cancel", "Cancel")}
          className="flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <XCircle size={15} />
        </button>
      </div>
    </div>
  );
};

ParkedCartCard.propTypes = {
  cart: PropTypes.object.isRequired,
  onResume: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isBusy: PropTypes.bool
};

const ParkedCartSkeleton = () => (
  <div className="flex gap-3 px-4 mt-3 lg:px-6">
    {[1, 2].map((i) => (
      <div
        key={i}
        className="shrink-0 w-60 bg-card border border-border/60 rounded-xl p-3.5 space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-full" />
      </div>
    ))}
  </div>
);

// Query-cache isolation: the key includes `store`, so React Query keeps a
// separate cache entry per store — switching stores can never render a
// stale store's list. Mutation-response isolation is separate: each
// mutation captures `storeAtInvocation` synchronously before the request
// starts, and its onSuccess invalidates/reports against that captured
// store, never whatever `store` happens to be selected when the response
// arrives later.
const ParkedCartPanel = ({ store, onResumed, hasCartItems }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [pendingResumeCart, setPendingResumeCart] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery(
    ["parked-carts", store],
    () => getParkedCarts({ store, status: "active" }),
    { enabled: !!store, refetchInterval: 30000 }
  );

  const resumeMutation = useMutation(
    (id) => {
      const storeAtInvocation = store;
      return resumeParkedCart(id).then((res) => ({ res, storeAtInvocation }));
    },
    {
      onMutate: (id) => setBusyId(id),
      onSuccess: ({ res, storeAtInvocation }) => {
        queryClient.invalidateQueries(["parked-carts", storeAtInvocation]);
        onResumed(res.data);
      },
      onError: (err) => {
        toast.error(t("page.cashier.parkedCart.resumeFailed", "Could not resume cart"), {
          description: err?.response?.data?.message || err.message
        });
      },
      onSettled: () => setBusyId(null)
    }
  );

  const cancelMutation = useMutation(
    (id) => {
      const storeAtInvocation = store;
      return cancelParkedCart(id).then(() => storeAtInvocation);
    },
    {
      onMutate: (id) => setBusyId(id),
      onSuccess: (storeAtInvocation) => {
        queryClient.invalidateQueries(["parked-carts", storeAtInvocation]);
        toast.success(t("page.cashier.parkedCart.cancelled", "Parked cart cancelled"));
      },
      onError: (err) => {
        toast.error(t("page.cashier.parkedCart.cancelFailed", "Could not cancel cart"), {
          description: err?.response?.data?.message || err.message
        });
      },
      onSettled: () => setBusyId(null)
    }
  );

  const carts = data?.data || [];

  // Resuming wipes the live cart client-side once the server confirms —
  // that confirmation already transitions the parked cart server-side
  // (it never rolls back), so the "will this destroy my in-progress
  // sale" check must happen BEFORE calling resume, not after.
  const requestResume = (cart) => {
    if (hasCartItems) {
      setPendingResumeCart(cart);
    } else {
      resumeMutation.mutate(cart.id);
    }
  };

  if (!store) return null;

  if (isLoading) return <ParkedCartSkeleton />;

  if (isError) {
    return (
      <div className="px-4 lg:px-6 mt-3">
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs text-muted-foreground hover:text-foreground underline">
          {t("page.cashier.parkedCart.loadError", "Could not load parked carts — retry")}
        </button>
      </div>
    );
  }

  return (
    <>
      {carts.length > 0 && (
        <CollapsiblePanel
          title={t("page.cashier.parkedCart.title")}
          icon={PauseCircle}
          count={carts.length}
          storageKey="cashier.parkedCarts"
          className="shrink-0 mt-3">
          <div className="overflow-x-auto scrollbar-none mt-1">
            <div className="flex gap-3 px-4 lg:px-6 pb-1">
              {carts.map((cart) => (
                <ParkedCartCard
                  key={cart.id}
                  cart={cart}
                  onResume={requestResume}
                  onCancel={(c) => cancelMutation.mutate(c.id)}
                  isBusy={busyId === cart.id}
                />
              ))}
            </div>
          </div>
        </CollapsiblePanel>
      )}

      <Dialog
        open={!!pendingResumeCart}
        onOpenChange={(open) => !open && setPendingResumeCart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("page.cashier.parkedCart.resumeConfirmTitle", "Resume parked cart?")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "page.cashier.parkedCart.resumeConfirmDesc",
                "Your current cart has items. Resuming will replace it with the parked cart."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="danger" onClick={() => setPendingResumeCart(null)}>
              {t("page.cashier.cancel", "Cancel")}
            </Button>
            <Button
              variant="success"
              onClick={() => {
                resumeMutation.mutate(pendingResumeCart.id);
                setPendingResumeCart(null);
              }}>
              {t("page.cashier.parkedCart.resume", "Resume")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

ParkedCartPanel.propTypes = {
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onResumed: PropTypes.func.isRequired,
  hasCartItems: PropTypes.bool
};

export default ParkedCartPanel;

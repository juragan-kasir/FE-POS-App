import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { toast } from "sonner";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getOrdersByStore, updateOrderStatus } from "@/services/order";
import { readSeenIds, writeSeenIds } from "@/lib/session-seen";

const P = "page.cashier.qrAlert";

const seenKey = (store) => `qr-order-alert-seen:${store}`;

const rupiah = (n) => `Rp${Number(n || 0).toLocaleString("id-ID")}`;

// Client request: a new QR (table) order pops up on the cashier screen.
// Reads the same pending-order cache as the order queue (same query key and
// shape), so it adds no requests while the queue is mounted. Each order is
// shown once per browser session; "Nanti" leaves it in the queue's Pending
// column. Accept/reject are the same transitions as QR order management.
const IncomingQrOrderAlert = ({ store, actor }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [seen, setSeen] = useState(() => readSeenIds(seenKey(store)));
  const [confirmReject, setConfirmReject] = useState(false);

  const { data: pending } = useQuery(
    ["cashier-orders-pending", store],
    async () => {
      const res = await getOrdersByStore({ location: store, status: "pending", limit: 50 });
      return res?.data || [];
    },
    { enabled: !!store, refetchInterval: 30000 }
  );

  const queue = useMemo(
    () =>
      (pending || [])
        .filter((o) => o.source === "qr" && !seen.has(String(o.id)))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [pending, seen]
  );
  const order = queue[0];

  const markSeen = (id) => {
    setConfirmReject(false);
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      writeSeenIds(seenKey(store), next);
      return next;
    });
  };

  const refreshQueues = () => {
    ["pending", "preparing", "confirmed"].forEach((s) =>
      queryClient.invalidateQueries([`cashier-orders-${s}`, store])
    );
  };

  const changeStatus = useMutation(
    ({ target, status }) =>
      updateOrderStatus({
        id: target.id,
        store,
        status,
        ...(status === "cancelled" ? { notes: "Ditolak oleh kasir" } : {}),
        changedBy: actor?.id,
        changedByName: actor?.name
      }),
    {
      onSuccess: (_res, { target, status }) => {
        toast.success(
          t(
            status === "cancelled" ? "page.customerOrder.rejected" : "page.customerOrder.accepted",
            {
              orderNumber: target.orderNumber
            }
          )
        );
        markSeen(target.id);
        refreshQueues();
      },
      onError: (err, { status }) => {
        toast.error(
          err?.response?.data?.message ||
            t(
              status === "cancelled"
                ? "page.customerOrder.rejectFailed"
                : "page.customerOrder.acceptFailed"
            )
        );
      }
    }
  );

  if (!order) return null;

  const busy = changeStatus.isLoading;
  const items = order.items || [];
  const tableName = order.table?.name || order.tableName || order.tableId || "-";

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && markSeen(order.id)}>
      <DialogContent className="max-w-sm p-0" withX={false} data-testid="qr-order-alert">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <QrCode size={18} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="font-bold leading-tight">{t(`${P}.title`)}</DialogTitle>
            {queue.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {t(`${P}.position`, { index: 1, total: queue.length })}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{t("page.customerOrder.table")}</p>
              <p className="font-semibold">{tableName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t(`${P}.orderNumber`)}</p>
              <p className="font-semibold">{order.orderNumber}</p>
            </div>
            {order.customerName && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">{t(`${P}.customer`)}</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
            )}
          </div>

          <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between gap-2 px-3 py-2">
                <span>
                  {it.quantity}× {it.productName}
                  {it.notes && (
                    <span className="block text-xs text-muted-foreground">{it.notes}</span>
                  )}
                </span>
                <span className="font-mono">{rupiah(it.totalPrice)}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between font-semibold">
            <span>{t(`${P}.total`)}</span>
            <span>{rupiah(order.totalPrice)}</span>
          </div>
          {order.paymentMethod && (
            <p className="text-xs text-muted-foreground">
              {t(`${P}.paymentIntent`, { method: order.paymentMethod })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/50 p-4">
          {confirmReject ? (
            <>
              <p className="text-sm">
                {t(`${P}.rejectConfirm`, { orderNumber: order.orderNumber })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => setConfirmReject(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  loading={busy}
                  onClick={() => changeStatus.mutate({ target: order, status: "cancelled" })}>
                  {t(`${P}.rejectYes`)}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                loading={busy}
                onClick={() => changeStatus.mutate({ target: order, status: "preparing" })}>
                {t(`${P}.accept`)}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => setConfirmReject(true)}>
                  {t(`${P}.reject`)}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => markSeen(order.id)}>
                  {t(`${P}.later`)}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

IncomingQrOrderAlert.propTypes = {
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  actor: PropTypes.shape({ id: PropTypes.any, name: PropTypes.string })
};

export default IncomingQrOrderAlert;

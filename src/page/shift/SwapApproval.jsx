import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock,
  Inbox,
  Loader2,
  MessageSquareText,
  Store,
  X,
  XCircle
} from "lucide-react";
import { getShiftSwaps, updateShiftSwapStatus } from "@/services/shiftSwap";
import { safeGet } from "@/lib/safe-lookup";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import PageHeader from "@/components/ui/PageHeader";
import { useTranslation } from "react-i18next";

const fmt = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const fmtTime = (t) => (t ? String(t).slice(0, 5) : "??:??");

const fmtDateTime = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const EmpAvatar = ({ emp, size = "w-10 h-10" }) => {
  const name = emp?.fullName || emp?.userName || "?";
  if (emp?.image) {
    return (
      <img
        src={emp.image}
        alt={name}
        className={`${size} rounded-full object-cover shrink-0 bg-muted`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const roleLabel = (u) =>
  u?.positionData?.name || u?.departmentData?.name || u?.roleType || "Karyawan";

const statusBadge = (status) => {
  const map = {
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    approved:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    rejected:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    expired: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-muted text-muted-foreground border-border"
  };
  const labels = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
    expired: "Kedaluwarsa",
    cancelled: "Dibatalkan"
  };
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${safeGet(map, status, map.pending)}`}>
      {safeGet(labels, status, status)}
    </span>
  );
};

const shiftLabel = (s) => {
  if (!s) return "-";
  return `${s.name || "-"} (${fmtTime(s.startTime)} - ${fmtTime(s.endTime)})`;
};

const DAY_MS = 86400000;

const toISODate = (d) => {
  const dd = new Date(d);
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(
    dd.getDate()
  ).padStart(2, "0")}`;
};

// Panel audit: "siapa menukar dengan siapa" dalam 30 hari terakhir (approved)
const AuditTrailPanel = ({ store, locations }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState(() => toISODate(new Date(Date.now() - 30 * DAY_MS)));
  const [toDate, setToDate] = useState(() => toISODate(new Date()));

  const { data, isLoading, isFetching } = useQuery(
    ["shift-swap-audit", store, fromDate, toDate],
    () =>
      getShiftSwaps({
        store,
        page: 1,
        pageSize: 100,
        status: "approved",
        from: fromDate,
        to: toDate
      }),
    { enabled: open, keepPreviousData: true }
  );

  const trail = data?.data || [];
  const days = trail.reduce((acc, sw) => {
    const d = fmt(sw.decidedAt || sw.createdAt);
    const list = acc.has(d) ? acc.get(d) : [];
    list.push(sw);
    return acc.set(d, list);
  }, new Map());

  const locationName = (sid) => locations.find((l) => String(l.id) === String(sid))?.name || null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ArrowRightLeft size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("page.shift.ui.shiftSwapAuditLast30")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("page.shift.ui.summaryOfApprovedSwapsWho")}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-primary">
          {open ? "Sembunyikan" : "Detail"}
        </span>
      </button>

      {open && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("page.stockTransfer.list.header.from")}</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value || fromDate)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span>sampai</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value || toDate)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {isFetching && <Loader2 size={14} className="text-primary animate-spin" />}
            <span className="text-xs text-muted-foreground">
              {trail.length} {t("page.shift.ui.approvedSwaps")}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : trail.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {t("page.shift.ui.noApprovedSwapsInThis")}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(days)
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .map(([day, items]) => (
                  <div key={day}>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                      {day}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((sw) => (
                        <div
                          key={sw.id || sw._id}
                          className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs">
                          <EmpAvatar emp={sw.requesterUser} size="w-8 h-8" />
                          <span className="font-medium text-foreground truncate">
                            {sw.requesterUser?.fullName || "?"}
                          </span>
                          <ArrowRightLeft size={12} className="text-primary shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {sw.targetUser?.fullName || "?"}
                          </span>
                          <EmpAvatar emp={sw.targetUser} size="w-8 h-8" />
                          <span className="ml-auto shrink-0 text-muted-foreground">
                            {locationName(sw.store) || `Toko #${sw.store || "-"}`} ·{" "}
                            {fmt(sw.tanggal_mulai)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SwapApproval = ({ user, store, locations }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [decisionTarget, setDecisionTarget] = useState(null);

  const isAuthorized = user?.roleType === "super_admin" || user?.roleType === "admin";

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["shift-swaps", store, page, pageSize, status],
    () => getShiftSwaps({ store, page, pageSize, status }),
    { keepPreviousData: true, enabled: isAuthorized }
  );

  const swaps = data?.data || [];
  const stats = data?.stats || {};
  const pagination = data?.pagination || {};
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPage || Math.ceil(total / pageSize) || 1;

  const decideMutation = useMutation(
    ({ id, decision }) => updateShiftSwapStatus({ id, status: decision }),
    {
      onMutate: async ({ id, decision }) => {
        await queryClient.cancelQueries({ queryKey: ["shift-swaps"] });
        const snapshot = queryClient.getQueriesData({ queryKey: ["shift-swaps"] });

        // Optimistic: update semua halaman query shift-swaps sekaligus.
        queryClient.setQueriesData({ queryKey: ["shift-swaps"] }, (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((sw) =>
              String(sw.id || sw._id) === String(id) ? { ...sw, status: decision } : sw
            )
          };
        });
        return { snapshot };
      },
      onSuccess: (_res, vars) => {
        toast.success("Berhasil", {
          description:
            vars.decision === "approved"
              ? "Permintaan ubah jadwal disetujui."
              : "Permintaan ubah jadwal ditolak."
        });
        setDecisionTarget(null);
      },
      onError: (err, _vars, ctx) => {
        // Rollback ke state sebelum decision
        (ctx?.snapshot || []).forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
        toast.error("Gagal", { description: err?.response?.data?.message || err.message });
      },
      onSettled: () => {
        setDecisionTarget(null);
        queryClient.invalidateQueries(["shift-swaps"]);
      }
    }
  );

  const locationName = (sid) => locations.find((l) => String(l.id) === String(sid))?.name || null;

  const confirmDecide = () => {
    if (decisionTarget) {
      decideMutation.mutate({
        id: decisionTarget.swap.id || decisionTarget.swap._id,
        decision: decisionTarget.decision
      });
    }
  };

  const statItem = (label, value, cls) => (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${cls || "text-foreground"}`}>{value}</p>
    </div>
  );

  const emptyState = !isLoading && swaps.length === 0 && !isError;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: "Dashboard",
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: "Shift" },
          { label: "Swap Approval" }
        ]}
        title={t("page.shift.list.tabSwap")}
        description={t("page.shift.ui.manageShiftSwapRequests")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {statItem("Menunggu", stats.pending || 0, "text-amber-600 dark:text-amber-400")}
        {statItem("Disetujui", stats.approved || 0, "text-green-600 dark:text-green-400")}
        {statItem("Ditolak", stats.rejected || 0, "text-red-600 dark:text-red-400")}
        {statItem("Kedaluwarsa", stats.expired || 0, "text-muted-foreground")}
        {statItem("Total", stats.total || 0, "text-foreground")}
      </div>

      {isAuthorized && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="swap-approval-status"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("common.status")}
            </label>
            <Combobox
              id="swap-approval-status"
              options={[
                { value: "pending", label: "Menunggu" },
                { value: "approved", label: "Disetujui" },
                { value: "rejected", label: "Ditolak" },
                { value: "expired", label: "Kedaluwarsa" },
                { value: "", label: "Semua" }
              ]}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              placeholder={t("page.shift.ui.selectStatus")}
              searchPlaceholder="Cari..."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("page.shift.ui.showingScheduleChangeRequestsFor")}{" "}
            <span className="font-medium text-foreground">
              {locationName(store) || `Toko #${store || "-"}`}
            </span>
          </p>
        </div>
      )}

      {isError ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("page.shift.ui.failedToLoadScheduleChange")}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            {t("common.refresh")}
          </Button>
        </div>
      ) : isLoading || isFetching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      ) : emptyState ? (
        <div className="rounded-xl border border-dashed border-border p-12 flex flex-col items-center justify-center text-center gap-3 bg-card">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Inbox size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t("page.shift.ui.noScheduleChangeRequestsYet")}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {t("page.shift.ui.employeeShiftSwapRequestsAppear")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {swaps.map((sw) => {
            const reqUser = sw.requesterUser || null;
            const tgtUser = sw.targetUser || null;
            return (
              <div
                key={sw.id || sw._id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground min-w-0">
                    <Store size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {locationName(sw.store) || `Toko #${sw.store || "-"}`}
                    </span>
                  </div>
                  {statusBadge(sw.status)}
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="min-w-0">
                    <EmpAvatar emp={reqUser} />
                    <p className="font-medium text-sm text-foreground truncate mt-1.5">
                      {reqUser?.fullName || reqUser?.userName || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{roleLabel(reqUser)}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1 font-mono">
                      {shiftLabel(sw.requesterShift)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center px-1">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <ArrowRightLeft size={14} />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">TUKAR</span>
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="flex justify-end">
                      <EmpAvatar emp={tgtUser} />
                    </div>
                    <p className="font-medium text-sm text-foreground truncate mt-1.5">
                      {tgtUser?.fullName || tgtUser?.userName || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{roleLabel(tgtUser)}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1 font-mono">
                      {shiftLabel(sw.targetShift)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays size={12} className="shrink-0" />
                    <span>
                      {fmt(sw.tanggal_mulai)} – {fmt(sw.tanggal_selesai)}
                    </span>
                  </div>
                  {sw.note && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MessageSquareText size={12} className="shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{sw.note}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={11} className="shrink-0" />
                    <span>
                      {t("page.shift.ui.submitted")} {fmtDateTime(sw.createdAt)}
                    </span>
                  </div>
                  {sw.status !== "pending" && sw.decidedByUser && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {sw.status === "approved" ? (
                        <BadgeCheck size={11} className="shrink-0 text-green-500" />
                      ) : (
                        <XCircle size={11} className="shrink-0 text-red-500" />
                      )}
                      <span>
                        {t("page.shift.ui.decidedBy")}{" "}
                        {sw.decidedByUser.fullName || sw.decidedByUser.userName} ·{" "}
                        {fmtDateTime(sw.decidedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {sw.status === "pending" && (
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setDecisionTarget({ swap: sw, decision: "rejected" })}>
                      <X size={14} />
                      {t("common.reject")}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setDecisionTarget({ swap: sw, decision: "approved" })}>
                      <Check size={14} />
                      {t("page.customerOrder.accept")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {total} {t("page.shift.ui.requestsPage")} {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>
              {t("guide.auth.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}>
              {t("page.shift.swap.next")}
            </Button>
          </div>
        </div>
      )}

      {isAuthorized && <AuditTrailPanel store={store} locations={locations} />}

      <Modal
        type="confirm"
        open={!!decisionTarget}
        onOpenChange={(open) => !open && setDecisionTarget(null)}
        title={
          decisionTarget?.decision === "approved"
            ? "Terima permintaan ubah jadwal?"
            : "Tolak permintaan ubah jadwal?"
        }
        description={
          decisionTarget?.decision === "approved"
            ? `Anda akan menyetujui tukar jadwal ${
                decisionTarget?.swap?.requesterUser?.fullName || "pemohon"
              } dengan ${decisionTarget?.swap?.targetUser?.fullName || "target"}.`
            : `Permintaan tukar jadwal dari ${
                decisionTarget?.swap?.requesterUser?.fullName || "pemohon"
              } akan ditolak.`
        }
        confirmText={decisionTarget?.decision === "approved" ? "Terima" : "Tolak"}
        loading={decideMutation.isLoading}
        onConfirm={confirmDecide}
      />
      {decideMutation.isLoading && (
        <Loading fullscreen size="lg" label={t("page.shift.ui.savingDecision")} />
      )}
    </div>
  );
};

export default SwapApproval;

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  AlarmClock,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleDashed,
  Clock,
  Inbox,
  Landmark,
  Loader2,
  MessageSquareText,
  Store,
  Timer,
  X,
  XCircle
} from "lucide-react";
import { getOvertimes, updateOvertimeStatus, postOvertimePayroll } from "@/services/overtime";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { safeGet } from "@/lib/safe-lookup";
import { useUserSession } from "@/hooks/useUserSession";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { todayDateOnly } from "@/utils/dateOnly";
import { dateLocale } from "@/lib/locale";

const fmt = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" });
};

const fmtDateTime = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(dateLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const durationLabel = (d) => {
  const v = Number(d) || 0;
  return `${v % 1 === 0 ? v : v.toFixed(2).replace(".", ",")} jam`;
};

const fmtMoney = (v) => Number(v || 0).toLocaleString("id-ID");

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
    cancelled: "bg-muted text-muted-foreground border-border"
  };
  const labels = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
    cancelled: "Dibatalkan"
  };
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${safeGet(map, status, map.pending)}`}>
      {safeGet(labels, status, status)}
    </span>
  );
};

const OvertimeApproval = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = useUserSession() || cookie?.user || {};
  const isSuperAdmin = user?.roleType === "super_admin";

  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [payrollTarget, setPayrollTarget] = useState(null);
  const [payrollMonth, setPayrollMonth] = useState(() => todayDateOnly().slice(0, 7));

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locData?.data || [];
  const store = isSuperAdmin ? (storeFilter !== "all" ? storeFilter : "") : user?.store || "";
  const locationName = (sid) => locations.find((l) => String(l.id) === String(sid))?.name || null;

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["overtime-approvals", store, page, status],
    () => getOvertimes({ store, page, pageSize, status }),
    { keepPreviousData: true, enabled: isSuperAdmin ? true : !!store }
  );

  const rows = data?.data || [];
  const stats = data?.stats || {};
  const pagination = data?.pagination || {};
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPage || Math.ceil(total / pageSize) || 1;

  const decideMutation = useMutation(
    ({ id, decision, note }) => updateOvertimeStatus({ id, status: decision, note }),
    {
      onSuccess: (_res, vars) => {
        toast.success(t("common.success"), {
          description:
            vars.decision === "approved"
              ? "Pengajuan lembur disetujui."
              : "Pengajuan lembur ditolak."
        });
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err?.response?.data?.message || err.message
        });
      },
      onSettled: () => {
        setDecisionTarget(null);
        setDecisionNote("");
        queryClient.invalidateQueries(["overtime-approvals"]);
      }
    }
  );

  const payrollMutation = useMutation(
    ({ store: s, month }) => postOvertimePayroll({ store: s, month }),
    {
      onSuccess: (res) => {
        toast.success(t("common.success"), {
          description: `${res?.data?.posted || 0} lembur diposting, total Rp ${fmtMoney(
            res?.data?.totalAmount
          )}.`
        });
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err?.response?.data?.message || err.message
        });
      },
      onSettled: () => {
        setPayrollTarget(null);
        queryClient.invalidateQueries(["overtime-approvals"]);
      }
    }
  );

  const confirmDecide = () => {
    if (!decisionTarget) return;
    decideMutation.mutate({
      id: decisionTarget.ot.id,
      decision: decisionTarget.decision,
      note: decisionNote || null
    });
  };

  const statItem = (label, value, cls) => (
    <div className="bg-card rounded-xl border border-border p-4">
      <span className="text-xs text-muted-foreground block">{label}</span>
      <p className={`text-2xl font-bold mt-1 ${cls || "text-foreground"}`}>{value}</p>
    </div>
  );

  const emptyState = !isLoading && rows.length === 0 && !isError;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: "SDM" },
          { label: "Lembur", i18nKey: "sidebar.overtime" }
        ]}
        title={t("page.overtime.ui.overtimeApproval")}
        description={t("page.overtime.ui.reviewOvertimeRequestsDecideOn")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {statItem("Menunggu", stats.pending || 0, "text-amber-600 dark:text-amber-400")}
        {statItem("Disetujui", stats.approved || 0, "text-green-600 dark:text-green-400")}
        {statItem("Ditolak", stats.rejected || 0, "text-red-600 dark:text-red-400")}
        {statItem("Dibatalkan", stats.cancelled || 0, "text-muted-foreground")}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {isSuperAdmin && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="overtime-approval-store"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("document.store")}
              </label>
              <Combobox
                id="overtime-approval-store"
                options={[
                  { value: "all", label: t("header.allStore") },
                  ...locations.map((l) => ({ value: String(l.id), label: l.name }))
                ]}
                value={storeFilter}
                onChange={(v) => {
                  setGlobalStoreFilter(v);
                  setPage(1);
                }}
                placeholder={t("page.table.form.storePlaceholder")}
                searchPlaceholder="Cari toko..."
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="overtime-approval-status"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("common.status")}
            </label>
            <Combobox
              id="overtime-approval-status"
              options={[
                { value: "pending", label: t("common.pending") },
                { value: "approved", label: t("businessTrip.status.approved") },
                { value: "rejected", label: t("businessTrip.status.rejected") },
                { value: "cancelled", label: t("page.delivery.stats.cancelled") },
                { value: "", label: t("common.all") }
              ]}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              placeholder={t("page.overtime.ui.selectStatus")}
              searchPlaceholder="Cari..."
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("page.overtime.ui.showingOvertimeRequestsFor")}{" "}
          <span className="font-medium text-foreground">
            {locationName(store) || `Toko #${store || "-"}`}
          </span>
        </p>
      </div>

      {isError ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("page.overtime.ui.failedToLoadOvertimeRequests")}
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
            {t("page.overtime.ui.noOvertimeRequestsYet2")}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {t("page.overtime.ui.employeeOvertimeRequestsAppearHere")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((ot) => {
            const emp = ot.employee || null;
            return (
              <div
                key={ot.id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground min-w-0">
                    <Store size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {locationName(ot.store) || `Toko #${ot.store || "-"}`}
                    </span>
                  </div>
                  {statusBadge(ot.status)}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <EmpAvatar emp={emp} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {emp?.fullName || emp?.userName || `Karyawan #${ot.employee_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{roleLabel(emp)}</p>
                  </div>
                  <span className="ml-auto shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      <Timer size={12} />
                      {durationLabel(ot.duration_hours)}
                    </span>
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays size={12} className="shrink-0" />
                    {fmt(ot.date)}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock size={12} className="shrink-0" />
                    {String(ot.start_time || "").slice(0, 5)} -{" "}
                    {String(ot.end_time || "").slice(0, 5)}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground sm:col-span-2">
                    <AlarmClock size={12} className="shrink-0" />
                    {ot.shift?.name || "Shift"} ({String(ot.shift?.startTime || "-").slice(0, 5)} -{" "}
                    {String(ot.shift?.endTime || "-").slice(0, 5)})
                  </div>
                </div>

                {ot.note && (
                  <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MessageSquareText size={12} className="shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{ot.note}</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CircleDashed size={11} className="shrink-0" />
                    <span>
                      {t("page.overtime.ui.submitted")} {fmtDateTime(ot.createdAt)}
                    </span>
                  </div>
                  {ot.decidedByUser && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {ot.status === "approved" ? (
                        <BadgeCheck size={11} className="shrink-0 text-green-500" />
                      ) : (
                        <XCircle size={11} className="shrink-0 text-red-500" />
                      )}
                      <span>
                        {t("page.overtime.ui.decidedBy")}{" "}
                        {ot.decidedByUser.fullName || ot.decidedByUser.userName} ·{" "}
                        {fmtDateTime(ot.decidedAt)}
                      </span>
                    </div>
                  )}
                  {ot.accounting_status === "posted" && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                      <Landmark size={11} className="shrink-0" />
                      <span>
                        {t("page.overtime.ui.postedToAccounting")}
                        {(ot.postedAt && ` · ${fmtDateTime(ot.postedAt)}`) || ""}
                      </span>
                    </div>
                  )}
                </div>

                {ot.status === "pending" && (
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => {
                        setDecisionNote("");
                        setDecisionTarget({ ot, decision: "rejected" });
                      }}>
                      <X size={14} />
                      {t("common.reject")}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setDecisionNote("");
                        setDecisionTarget({ ot, decision: "approved" });
                      }}>
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
            {total} {t("page.overtime.ui.requestsPage")} {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>
              {t("common.ui.previous")}
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

      {/* Closing payroll */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Landmark size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("page.overtime.ui.closeOvertimePayroll")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("page.overtime.ui.combineAllApprovedOvertimeIn")}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="overtime-approval-period"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("page.promo.list.period")}
            </label>
            <Input
              id="overtime-approval-period"
              type="month"
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="sm:w-44"
            />
          </div>
          <Button
            className="gap-2"
            disabled={!payrollMonth || payrollMutation.isLoading}
            disabledReason={
              payrollMutation.isLoading ? undefined : t("page.overtime.disabledReason.selectMonth")
            }
            onClick={() => setPayrollTarget(payrollMonth)}>
            {payrollMutation.isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Landmark size={16} />
            )}
            {t("page.overtime.ui.postPayroll")}
          </Button>
        </div>
      </div>

      <Modal
        type="confirm"
        open={decisionTarget?.decision === "approved"}
        onOpenChange={(open) => !open && setDecisionTarget(null)}
        title={t("page.overtime.ui.approveThisOvertimeRequest")}
        description={`Anda akan menyetujui lembur ${
          decisionTarget?.ot?.employee?.fullName || "karyawan"
        } pada ${fmt(decisionTarget?.ot?.date)} selama ${durationLabel(
          decisionTarget?.ot?.duration_hours
        )}.`}
        confirmText="Terima"
        loading={decideMutation.isLoading}
        onConfirm={confirmDecide}
      />

      <Modal
        type="form"
        open={decisionTarget?.decision === "rejected"}
        onOpenChange={(open) => !open && setDecisionTarget(null)}
        title={t("page.overtime.ui.rejectThisOvertimeRequest")}
        description={`Lembur ${
          decisionTarget?.ot?.employee?.fullName || "karyawan"
        } pada ${fmt(decisionTarget?.ot?.date)} akan ditolak.`}
        confirmText="Tolak"
        confirmVariant="destructive"
        loading={decideMutation.isLoading}
        onConfirm={confirmDecide}
        onCancel={() => setDecisionTarget(null)}>
        <Textarea
          rows={3}
          placeholder={t("page.overtime.ui.rejectionReasonOptional")}
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          maxLength={FIELD_LIMITS.DESCRIPTION}
        />
      </Modal>

      <Modal
        type="confirm"
        open={!!payrollTarget}
        onOpenChange={(open) => !open && setPayrollTarget(null)}
        title={`Posting payroll lembur ${payrollTarget}?`}
        description={`Seluruh lembur disetujui dan belum diposting pada ${payrollTarget} akan
          dihitung biayanya dan dibuatkan jurnal akuntansi. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Posting"
        loading={payrollMutation.isLoading}
        onConfirm={() => payrollMutation.mutate({ store, month: payrollTarget })}
      />
      {(decideMutation.isLoading || payrollMutation.isLoading) && (
        <Loading fullscreen size="lg" label={t("common.saving")} />
      )}
    </div>
  );
};

export default OvertimeApproval;

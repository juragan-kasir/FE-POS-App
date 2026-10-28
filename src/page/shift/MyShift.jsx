import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CalendarClock,
  CalendarDays,
  Clock,
  Clock3,
  Store,
  RefreshCcw,
  Fingerprint,
  LogOut,
  CheckCircle2,
  CircleDashed,
  XCircle,
  Loader2
} from "lucide-react";
import { getAllShift } from "@/services/shift";
import { getMyAttendance } from "@/services/attendance";
import { getShiftSwaps } from "@/services/shiftSwap";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/ui/StatCard";
import { useUserSession } from "@/hooks/useUserSession";
import SwapShiftModal from "./SwapShiftModal";
import CancelSwapDialog from "./CancelSwapDialog";
import AttendanceModal from "@/components/organism/AttendanceModal";
import { safeGet } from "@/lib/safe-lookup";
import PageHeader from "@/components/ui/PageHeader";
import { DEFAULT_SHIFT_TYPE, SHIFT_TYPE_LABELS, SHIFT_TYPES } from "@/constants/shiftTypes";
import { useLocations } from "@/queries/useLocations";

const DAY_MS = 86400000;

const fmtDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const hoursBetween = (start, end) => {
  const [ah, am] = (start || "").split(":").map(Number);
  const [bh, bm] = (end || "").split(":").map(Number);
  if ([ah, am, bh, bm].some((n) => isNaN(n))) return null;
  let minutes = bh * 60 + bm - (ah * 60 + am);
  if (minutes <= 0) minutes += 1440;
  return minutes / 60;
};

const nowHM = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

const isShiftWindowNow = (s) => {
  const now = nowHM();
  const start = (s?.jam_mulai || "").slice(0, 5);
  const end = (s?.jam_selesai || "").slice(0, 5);
  if (!start || !end || start.length !== 5 || end.length !== 5) return false;
  if (start <= end) return now >= start && now <= end;
  return now >= start || now <= end;
};

const MetadataTile = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
    <Icon size={14} className="shrink-0 text-muted-foreground/70" />
    <span className="font-medium text-foreground/90">{children}</span>
  </span>
);

const MyShift = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = useUserSession() || cookie?.user || {};
  const [swapShift, setSwapShift] = useState(null);
  const [cancelSwap, setCancelSwap] = useState(null);
  const [attendanceShift, setAttendanceShift] = useState(null);

  const currentUserId = user?.id;
  const storeId = user?.store || "";

  const { data: myAttData, refetch: refetchAttendance } = useQuery(
    ["my-shift-attendance", currentUserId],
    () => getMyAttendance(),
    { enabled: !!currentUserId, retry: 0 }
  );

  const myAtt = Array.isArray(myAttData?.data) ? myAttData.data : [];
  const hasCheckedIn = myAtt.some((r) => r.type === "check-in" && r.status !== "cancelled");
  const hasCheckedOut = myAtt.some((r) => r.type === "check-out" && r.status !== "cancelled");

  const { data, isLoading, isError, isFetching, refetch } = useQuery(
    ["my-shift", storeId],
    () => getAllShift({ store: storeId, page: 1, limit: 100, statusShift: "active" }),
    {
      enabled: !!storeId,
      retry: 0
    }
  );

  const allShifts = data?.data || data?.shifts || [];

  const rows = allShifts.filter((s) =>
    (s.karyawan || []).some((k) => String(k) === String(currentUserId))
  );

  const {
    data: swapData,
    isLoading: swapLoading,
    refetch: refetchSwaps
  } = useQuery(
    ["my-shift-swaps", storeId],
    () => getShiftSwaps({ store: storeId, page: 1, pageSize: 50, status: "", mine: 1 }),
    {
      enabled: !!storeId && !!currentUserId,
      retry: 0,
      refetchInterval: 30000
    }
  );

  const seenApprovedRef = useRef(new Set());
  const swapToastInitRef = useRef(false);

  const mySwaps = useMemo(() => {
    const swapRows = Array.isArray(swapData?.data) ? swapData.data : [];
    return swapRows
      .filter(
        (s) =>
          String(s.requesterId) === String(currentUserId) ||
          String(s.targetId) === String(currentUserId)
      )
      .sort((a, b) => {
        const order = { pending: 0, approved: 1, rejected: 2, cancelled: 3 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [swapData, currentUserId]);

  useEffect(() => {
    const approved = mySwaps.filter((s) => s.status === "approved");
    if (!approved.length) return;
    if (!swapToastInitRef.current) {
      approved.forEach((s) => seenApprovedRef.current.add(s.id));
      swapToastInitRef.current = true;
      return;
    }
    approved.forEach((s) => {
      if (seenApprovedRef.current.has(s.id)) return;
      seenApprovedRef.current.add(s.id);
      const other =
        String(s.requesterId) === String(currentUserId) ? s.requesterUser : s.targetUser;
      toast.success("Pertukaran Shift Berhasil", {
        description: `Pertukaran shift kamu dengan ${
          other?.fullName || "rekan kerja"
        } telah disetujui.`
      });
    });
  }, [mySwaps, currentUserId]);

  const { data: locData } = useLocations("active", { enabled: !!storeId });

  const locName = (sid) => {
    if (sid == null || sid === "") return "";
    const loc = (locData?.data || []).find((l) => String(l.id) === String(sid));
    return loc?.name || "";
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStart = today.getTime();
  const dayEnd = dayStart + DAY_MS;

  const category = (s) => {
    const start = new Date(s.tanggal_mulai);
    const startT = isNaN(start.getTime()) ? null : start.getTime();
    const end = s.tanggal_selesai ? new Date(s.tanggal_selesai) : null;
    const endT = end && !isNaN(end.getTime()) ? new Date(end).setHours(23, 59, 59, 999) : null;
    if (startT !== null && startT > dayEnd) return "upcoming";
    if (endT !== null && endT < dayStart) return "past";
    return "ongoing";
  };

  const grouped = { ongoing: [], upcoming: [], past: [] };
  rows.forEach((s) => grouped[category(s)].push(s));
  Object.keys(grouped).forEach((k) =>
    safeGet(grouped, k)?.sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai))
  );

  const swappableShifts = [...grouped.ongoing, ...grouped.upcoming];

  const relDays = (s) => {
    const start = new Date(s.tanggal_mulai);
    start.setHours(0, 0, 0, 0);
    const diff = Math.round((start.getTime() - dayStart) / DAY_MS);
    if (diff < 0) return null;
    if (diff === 0) return t("page.shift.myShift.relToday");
    if (diff === 1) return t("page.shift.myShift.relTomorrow");
    return t("page.shift.myShift.relDays", { count: diff });
  };

  const badgeCls = {
    ongoing: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    past: "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
  };
  const dotCls = {
    ongoing: "bg-green-500 animate-pulse",
    upcoming: "bg-blue-500",
    past: "bg-muted-foreground/50"
  };

  const statusLabel = (s, cat) => {
    if (cat === "past") return t("page.shift.myShift.relEnded");
    if (cat === "ongoing") return relDays(s) || t("page.shift.myShift.relOngoing");
    return relDays(s) || t("page.shift.myShift.relSoon");
  };

  const renderCard = (s, cat) => {
    const name = locName(s.store);
    const dur = hoursBetween(s.jam_mulai, s.jam_selesai);
    return (
      <div
        key={s.id}
        className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-sm">
            <Clock size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground truncate">{s.nama_shift || "-"}</p>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold capitalize">
                {SHIFT_TYPES.includes(s.tipe_shift)
                  ? safeGet(SHIFT_TYPE_LABELS, s.tipe_shift, s.tipe_shift)
                  : safeGet(SHIFT_TYPE_LABELS, DEFAULT_SHIFT_TYPE, DEFAULT_SHIFT_TYPE)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
              <Store size={12} className="shrink-0" />
              {name || t("page.shift.myShift.allStore")}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${safeGet(badgeCls, cat, "")}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${safeGet(dotCls, cat, "")}`} />
              {statusLabel(s, cat)}
            </span>
            {cat === "ongoing" && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  hasCheckedIn && hasCheckedOut
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : hasCheckedIn
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
                }`}>
                {hasCheckedIn && hasCheckedOut ? (
                  <>
                    <CheckCircle2 size={10} />
                    {t("page.shift.ui.clockInOut")}
                  </>
                ) : hasCheckedIn ? (
                  <>
                    <CheckCircle2 size={10} />
                    {t("page.shift.ui.clockedInNotClockedOut")}
                  </>
                ) : (
                  <>
                    <CircleDashed size={10} />
                    {t("page.shift.ui.notClockedIn")}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 bg-muted/40 border-t border-border/50 text-[13px]">
          <MetadataTile icon={Clock3}>
            <span className="font-mono">
              {s.jam_mulai?.slice(0, 5)} - {s.jam_selesai?.slice(0, 5)}
            </span>
          </MetadataTile>
          <span className="hidden sm:block text-border">|</span>
          <MetadataTile icon={CalendarDays}>
            {fmtDate(s.tanggal_mulai)}
            {s.tanggal_selesai ? ` – ${fmtDate(s.tanggal_selesai)}` : ""}
          </MetadataTile>
          {dur !== null && (
            <>
              <span className="hidden sm:block text-border">|</span>
              <MetadataTile icon={CalendarClock}>
                {t("page.shift.myShift.duration", {
                  hours: dur % 1 === 0 ? dur : dur.toFixed(1)
                })}
              </MetadataTile>
            </>
          )}
          {cat !== "past" && (
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {cat === "ongoing" && isShiftWindowNow(s) && (
                <Button
                  size="sm"
                  disabled={hasCheckedIn && hasCheckedOut}
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setAttendanceShift(s)}>
                  {hasCheckedIn && hasCheckedOut ? (
                    "Sudah Absen"
                  ) : hasCheckedIn ? (
                    <>
                      <LogOut size={13} />
                      {t("page.shift.ui.clockOut")}
                    </>
                  ) : (
                    <>
                      <Fingerprint size={13} />
                      {t("page.shift.ui.clockIn")}
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setSwapShift(s)}>
                <ArrowRightLeft size={13} className="text-primary" />
                {t("page.shift.myShift.swap")}
              </Button>
            </span>
          )}
        </div>
      </div>
    );
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-8 py-14 text-center">
          <CalendarClock size={32} className="text-destructive/70" />
          <p className="text-sm font-semibold text-destructive">{t("page.shift.myShift.error")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { i18nKey: "page.shift.myShift.title" }
        ]}
        title={t("page.shift.myShift.title")}
        description={t("page.shift.myShift.subtitle")}
        backLink="/shift-list"
        onBack={() => {}}>
        {!isLoading && rows.length > 0 && (
          <>
            {swappableShifts.length > 0 && (
              <Button size="sm" onClick={() => setSwapShift({})}>
                <ArrowRightLeft size={14} />
                {t("page.shift.myShift.swap")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCcw size={14} className={isFetching ? "animate-spin" : ""} />
              {t("page.shift.myShift.refresh")}
            </Button>
          </>
        )}
      </PageHeader>

      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 -mt-2">
          <Loader2 size={13} className="animate-spin text-primary" />
          <span>{t("page.shift.myShift.refreshing")}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/20 px-8 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <CalendarClock size={26} className="text-muted-foreground/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t("page.shift.myShift.empty")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("page.shift.myShift.emptyHint")}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
            <StatCard
              label={t("page.shift.myShift.statTotal")}
              value={rows.length}
              icon={CalendarClock}
              variant="default"
            />
            <StatCard
              label={t("page.shift.myShift.statOngoing")}
              value={grouped.ongoing.length}
              icon={Clock}
              variant="active"
            />
            <StatCard
              label={t("page.shift.myShift.statUpcoming")}
              value={grouped.upcoming.length}
              icon={CalendarDays}
              variant="blue"
            />
          </div>

          {[
            ["ongoing", "secOngoing"],
            ["upcoming", "secUpcoming"],
            ["past", "secPast"]
          ].map(([cat, secKey]) => {
            const list = safeGet(grouped, cat, []);
            if (list.length === 0) return null;
            return (
              <section key={cat} className="mb-8 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    {t(`page.shift.myShift.${secKey}`)}
                  </h2>
                  <span className="rounded-full bg-muted text-muted-foreground text-xs font-semibold px-2 py-0.5">
                    {list.length}
                  </span>
                </div>
                <div className="space-y-3">{list.map((s) => renderCard(s, cat))}</div>
              </section>
            );
          })}
        </>
      )}

      {!swapLoading && mySwaps.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ArrowRightLeft size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("page.shift.ui.shiftSwaps")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mySwaps.filter((s) => s.status === "pending").length}{" "}
                  {t("page.shift.ui.inProgress")}{" "}
                  {mySwaps.filter((s) => s.status === "approved").length} berhasil
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mySwaps.map((s) => {
              const isRequester = String(s.requesterId) === String(currentUserId);
              const requester = s.requesterUser?.fullName || `Karyawan #${s.requesterId}`;
              const target = s.targetUser?.fullName || `Karyawan #${s.targetId}`;
              const statusCfg =
                s.status === "pending"
                  ? {
                      label: "Sedang Diproses",
                      cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      icon: Loader2
                    }
                  : s.status === "approved"
                    ? {
                        label: "Berhasil",
                        cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        icon: CheckCircle2
                      }
                    : s.status === "rejected"
                      ? {
                          label: "Ditolak",
                          cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          icon: XCircle
                        }
                      : {
                          label: "Dibatalkan",
                          cls: "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground",
                          icon: CircleDashed
                        };
              const StatusIcon = statusCfg.icon;
              const dateTxt = s.tanggal_mulai
                ? s.tanggal_mulai === s.tanggal_selesai
                  ? new Date(`${s.tanggal_mulai}T00:00:00`).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })
                  : `${new Date(`${s.tanggal_mulai}T00:00:00`).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short"
                    })} – ${new Date(`${s.tanggal_selesai}T00:00:00`).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}`
                : "-";
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 ${
                    s.status === "approved"
                      ? "border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-900/10"
                      : "border-border bg-muted/20"
                  }`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.cls}`}>
                      {s.status === "pending" ? (
                        <StatusIcon size={12} className="animate-spin" />
                      ) : (
                        <StatusIcon size={12} />
                      )}
                      {statusCfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{dateTxt}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground flex items-center flex-wrap gap-x-2 gap-y-1">
                    <span>{requester}</span>
                    <ArrowRightLeft size={14} className="text-primary shrink-0" />
                    <span>{target}</span>
                  </p>
                  {s.note && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{s.note}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isRequester ? "Kamu mengajukan" : "Diajukan untukmu"} ·{" "}
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "-"}
                  </p>
                  {s.status === "pending" && (
                    <div className="mt-3 pt-2 border-t border-border/60 flex justify-end">
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-600 dark:hover:text-red-400"
                        onClick={() => setCancelSwap(s)}>
                        <XCircle size={13} />
                        {t("page.goodsRequest.list.cancel")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SwapShiftModal
        open={!!swapShift}
        onOpenChange={(v) => {
          if (!v) setSwapShift(null);
        }}
        storeId={storeId}
        currentUserId={currentUserId}
        swappableShifts={swappableShifts}
        allShifts={allShifts}
        initialShift={swapShift && swapShift.id ? swapShift : null}
        onSuccess={() => refetchSwaps()}
      />

      <CancelSwapDialog
        open={!!cancelSwap}
        onOpenChange={(v) => {
          if (!v) setCancelSwap(null);
        }}
        swap={cancelSwap}
        onSuccess={(res) => {
          const updated = res?.data;
          if (updated?.id) {
            queryClient.setQueryData(["my-shift-swaps", storeId], (old) => {
              const rows = Array.isArray(old?.data) ? [...old.data] : [];
              const idx = rows.findIndex((r) => String(r.id) === String(updated.id));
              if (idx >= 0) rows.splice(idx, 1, updated);
              else rows.unshift(updated);
              return { ...old, data: rows };
            });
          }
          refetchSwaps();
        }}
      />

      <AttendanceModal
        open={!!attendanceShift}
        onOpenChange={(v) => {
          if (!v) setAttendanceShift(null);
        }}
        type={hasCheckedIn && !hasCheckedOut ? "check-out" : "check-in"}
        storeId={storeId}
        storeName={attendanceShift ? locName(attendanceShift.store) : ""}
        shiftId={attendanceShift?.id}
        shiftName={attendanceShift?.nama_shift}
        onSuccess={() => refetchAttendance()}
      />
    </div>
  );
};

export default MyShift;

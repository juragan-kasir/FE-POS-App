import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquareText,
  Store,
  Users
} from "lucide-react";
import { resolveKaryawan } from "./shiftMembers";
import { getAllEmployee } from "@/services/employee";
import { createShiftSwap } from "@/services/shiftSwap";
import { safeGet } from "@/lib/safe-lookup";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Textarea } from "@/components/ui/textarea";
import { dateLocale } from "@/lib/locale";

const fmtTime = (t) => (t ? String(t).slice(0, 5) : "??:??");

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtDateShort = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale(), {
        day: "numeric",
        month: "short"
      })
    : "-";

const listDates = (fromISO, toISO) => {
  const start = fromISO ? new Date(`${fromISO}T00:00:00`) : null;
  const end = toISO ? new Date(`${toISO}T00:00:00`) : null;
  if (!start && !end) return [];
  const a = start || end;
  const b = end || start;
  const out = [];
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    out.push(toISODate(d));
  }
  return out;
};

const shiftPart = (start) => {
  const h = parseInt(String(start || "").slice(0, 2), 10);
  if (isNaN(h)) return "pagi";
  if (h < 12) return "pagi";
  if (h < 18) return "siang";
  return "malam";
};

// Apakah sebuah shift mencakup tanggal tsb (memperhitungkan rentang mulai-selesai)
const shiftCoversDate = (s, date) => {
  if (!date) return true;
  const t = new Date(`${date}T00:00:00`).getTime();
  const from = s.tanggal_mulai ? new Date(`${s.tanggal_mulai}T00:00:00`).getTime() : null;
  const to = s.tanggal_selesai
    ? new Date(`${s.tanggal_selesai}T00:00:00`).setHours(23, 59, 59, 999)
    : null;
  if (from !== null && t < from) return false;
  if (to !== null && t > to) return false;
  return true;
};

// Shift LAIN milik user yang bentrok pada tanggal tsb (selain shift yang dipilih)
const busyShiftsOf = ({ shifts, userId, date, excludeShiftId }) =>
  (shifts || []).filter((s) => {
    if (String(s.id) === String(excludeShiftId)) return false;
    if (!(s.karyawan || []).some((k) => String(k) === String(userId))) return false;
    return shiftCoversDate(s, date);
  });

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

const roleOf = (emp) =>
  emp?.positionData?.name || emp?.departmentData?.name || emp?.roleType || null;

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des"
];
const WEEKDAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Kalender bulanan untuk melihat ketersediaan rekan kerja sebelum swap.
const AvailabilityCalendar = ({ month, busyDates, selectedDate, onSelectDate, disabledDates }) => {
  const { t } = useTranslation();
  const year = month.getFullYear();
  const mIdx = month.getMonth();
  const first = new Date(year, mIdx, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">
          {safeGet(MONTHS_ID, mIdx, mIdx)} {year}
        </p>
        <span className="text-xs text-muted-foreground font-medium">
          {busyDates.size > 0
            ? t("page.shift.swap.busyDays", { count: busyDates.size })
            : t("page.shift.swap.allFree")}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS_ID.map((w) => (
          <span key={w} className="text-xs font-semibold text-muted-foreground">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const iso = toISODate(new Date(year, mIdx, d));
          const busy = busyDates.has(iso);
          const disabled = disabledDates?.length > 0 && !disabledDates.includes(iso);
          const selected = selectedDate === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate?.(iso)}
              className={`aspect-square w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : busy
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    : disabled
                      ? "bg-muted/40 text-muted-foreground/30 cursor-not-allowed"
                      : "bg-muted/60 text-foreground hover:bg-accent"
              }`}>
              {d}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/60">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded bg-amber-100 dark:bg-amber-900/40 inline-block" />
          {t("page.shift.ui.hasAnotherShift")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded bg-muted inline-block" />
          {t("page.shift.ui.canSwap")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded bg-primary inline-block" />
          {t("page.shift.ui.selected")}
        </span>
      </div>
    </div>
  );
};

const SwapShiftModal = ({
  open,
  onOpenChange,
  storeId,
  currentUserId,
  swappableShifts,
  allShifts,
  initialShift,
  onSuccess
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState("target");
  const [ownShiftId, setOwnShiftId] = useState(null);
  const [targetShiftId, setTargetShiftId] = useState(null);
  const [coworkerId, setCoworkerId] = useState(null);
  const [note, setNote] = useState("");
  const [swapDate, setSwapDate] = useState(null);
  const [calOpen, setCalOpen] = useState(false);

  const candidateOwn = swappableShifts.filter((s) => s.id != null);

  useEffect(() => {
    if (!open) return;
    const firstId = initialShift?.id ?? candidateOwn[0]?.id ?? null;
    setOwnShiftId(firstId);
    setTargetShiftId(null);
    setCoworkerId(null);
    setNote("");
    setStep("target");
    const s = allShifts.find((x) => String(x.id) === String(firstId));
    const dates = s ? listDates(s.tanggal_mulai, s.tanggal_selesai) : [];
    const today = toISODate(new Date());
    setSwapDate(dates.includes(today) ? today : dates[0] || null);
  }, [open, initialShift?.id]);

  const ownShift = allShifts.find((s) => String(s.id) === String(ownShiftId));
  const ownPart = ownShift ? shiftPart(ownShift.jam_mulai) : "";
  const ownDates = useMemo(
    () => (ownShift ? listDates(ownShift.tanggal_mulai, ownShift.tanggal_selesai) : []),
    [ownShift]
  );
  const dateValid = ownDates.length === 0 || ownDates.includes(swapDate);

  const applyOwnId = (id) => {
    setOwnShiftId(id);
    setTargetShiftId(null);
    const s = allShifts.find((x) => String(x.id) === String(id));
    const dates = s ? listDates(s.tanggal_mulai, s.tanggal_selesai) : [];
    const today = toISODate(new Date());
    setSwapDate(dates.includes(today) ? today : dates[0] || null);
  };

  const targetOptions = useMemo(() => {
    if (!ownShiftId) return [];
    return allShifts.filter((s) => {
      if (String(s.id) !== String(ownShiftId) && shiftPart(s.jam_mulai) !== ownPart) {
        if (!s.tanggal_mulai && !s.tanggal_selesai) return true;
        const from = s.tanggal_mulai || swapDate || "";
        const to = s.tanggal_selesai || from;
        return swapDate ? swapDate >= from && swapDate <= to : true;
      }
      return false;
    });
  }, [allShifts, ownShiftId, ownPart, swapDate]);

  const targetShift = allShifts.find((s) => String(s.id) === String(targetShiftId));

  const { data: empData, isLoading: empLoading } = useQuery(
    ["shift-swap-employees"],
    () => getAllEmployee({ limit: 200 }),
    { enabled: open }
  );
  const employees = empData?.data || empData?.employees || [];

  const coworkers = useMemo(() => {
    if (!targetShift) return [];
    return resolveKaryawan(targetShift.karyawan, employees).filter((row) => {
      const emp = row.emp;
      if (!emp) return false;
      if (String(emp.id) === String(currentUserId)) return false;
      return storeId ? String(emp.store) === String(storeId) : true;
    });
  }, [targetShift, employees, currentUserId, storeId]);

  const targetBusyShifts = useMemo(() => {
    if (!coworkerId || !swapDate || !targetShift) return [];
    return busyShiftsOf({
      shifts: allShifts,
      userId: coworkerId,
      date: swapDate,
      excludeShiftId: targetShift.id
    });
  }, [coworkerId, swapDate, targetShift, allShifts]);

  // Kumpulan tanggal "sibuk" dari kalender utk rekan yang sedang dipilih
  const coworkerBusyDates = useMemo(() => {
    const set = new Set();
    if (!coworkerId || !targetShift) return set;
    busyShiftsOf({
      shifts: allShifts,
      userId: coworkerId,
      date: null,
      excludeShiftId: targetShift.id
    }).forEach((s) => listDates(s.tanggal_mulai, s.tanggal_selesai).forEach((d) => set.add(d)));
    return set;
  }, [coworkerId, targetShift, allShifts]);

  const calMonth = useMemo(() => {
    const base = swapDate ? new Date(`${swapDate}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [swapDate, calOpen]);

  const partLabel = (part) =>
    part === "siang"
      ? t("page.shift.swap.partSiang")
      : part === "malam"
        ? t("page.shift.swap.partMalam")
        : t("page.shift.swap.partPagi");

  const hasMultipleOwn = candidateOwn.length > 1;

  const swapMutation = useMutation(createShiftSwap, {
    onSuccess: () => {
      toast.success(t("page.shift.swap.title"), {
        description: t("page.shift.swap.success")
      });
      queryClient.invalidateQueries(["my-shift", storeId]);
      queryClient.invalidateQueries(["shift-swaps-stats"]);
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(t("common.failed"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const canSubmit =
    !!ownShiftId &&
    !!targetShiftId &&
    !!coworkerId &&
    !!swapDate &&
    dateValid &&
    !swapMutation.isLoading;

  const applyTarget = (sid) => {
    setTargetShiftId(sid);
    setCoworkerId(null);
    setStep("coworker");
  };

  const steps = [t("page.shift.swap.chooseTarget"), t("page.shift.swap.chooseCoworker")];
  const stepIdx = step === "target" ? 0 : 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] sm:max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-primary" />
            {t("page.shift.swap.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("page.shift.swap.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-4">
          {steps.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <ChevronRight size={13} className="text-muted-foreground/50" />}
              <span
                className={`rounded-full px-2.5 py-1 ${
                  i === stepIdx
                    ? "bg-primary/10 text-primary"
                    : i < stepIdx
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                }`}>
                {i < stepIdx ? <Check size={11} className="inline mr-1" /> : null}
                {label}
              </span>
            </React.Fragment>
          ))}
        </div>

        {step === "target" ? (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t("page.shift.swap.yourShift")}
              </p>
              {hasMultipleOwn ? (
                <select
                  value={ownShiftId ?? ""}
                  onChange={(e) => {
                    applyOwnId(e.target.value || null);
                  }}
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
                  {candidateOwn.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_shift || "-"} · {fmtTime(s.jam_mulai)} - {fmtTime(s.jam_selesai)} ·{" "}
                      {partLabel(shiftPart(s.jam_mulai))}
                    </option>
                  ))}
                </select>
              ) : ownShift ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {ownShift.nama_shift || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {fmtTime(ownShift.jam_mulai)} - {fmtTime(ownShift.jam_selesai)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold px-2.5 py-1">
                    {partLabel(ownPart)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("page.shift.swap.noEligible")}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" />
                  {t("page.shift.swap.chooseDate")}
                </h3>
                {ownDates.length > 0 && !dateValid && (
                  <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold px-2 py-0.5">
                    {t("page.shift.swap.dateOutOfRange")}
                  </span>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mb-2.5">
                {t("page.shift.swap.chooseDateHint")}
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2">
                {(ownDates.length ? ownDates : [toISODate(new Date())]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSwapDate(d)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      swapDate === d
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                        : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent/40"
                    }`}>
                    {fmtDateShort(d)}
                  </button>
                ))}
                <input
                  type="date"
                  value={swapDate ?? ""}
                  min={ownDates[0] || undefined}
                  max={ownDates[ownDates.length - 1] || undefined}
                  onChange={(e) => setSwapDate(e.target.value || null)}
                  className="h-9 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {t("page.shift.swap.chooseTarget")}
              </h3>
              <span className="rounded-full bg-muted text-muted-foreground text-xs font-semibold px-2 py-0.5">
                {targetOptions.length}
              </span>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mb-3">
              {t("page.shift.swap.chooseTargetHint", {
                part: partLabel(ownPart)
              })}
            </DialogDescription>

            {targetOptions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <Store size={26} className="text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">{t("page.shift.swap.noTargets")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {targetOptions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applyTarget(s.id)}
                    className={`rounded-xl border p-3.5 text-left transition-colors ${
                      String(targetShiftId) === String(s.id)
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent/40"
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {s.nama_shift || "-"}
                      </p>
                      <span className="shrink-0 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold px-2 py-0.5">
                        {partLabel(shiftPart(s.jam_mulai))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-1.5">
                      {fmtTime(s.jam_mulai)} - {fmtTime(s.jam_selesai)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Users size={12} className="shrink-0" />
                      {t("page.shift.swap.empCount", {
                        count: (s.karyawan || []).length
                      })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                <Clock size={14} className="text-primary shrink-0" />
                <div className="leading-tight">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    {t("page.shift.swap.yourShift")}
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {ownShift?.nama_shift || "-"}{" "}
                    <span className="text-muted-foreground font-mono">
                      · {fmtTime(ownShift?.jam_mulai)} - {fmtTime(ownShift?.jam_selesai)}
                    </span>
                  </p>
                </div>
              </div>
              <ArrowRightLeft size={16} className="text-muted-foreground shrink-0" />
              <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground">
                <Calendar size={12} className="text-primary" />
                {swapDate ? fmtDateShort(swapDate) : "-"}
              </div>
              <ArrowRightLeft size={16} className="text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2">
                <Clock size={14} className="text-primary shrink-0" />
                <div className="leading-tight">
                  <p className="text-xs text-primary uppercase font-semibold">
                    {t("page.shift.swap.targetShift")}
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {targetShift?.nama_shift || "-"}{" "}
                    <span className="text-muted-foreground font-mono">
                      · {fmtTime(targetShift?.jam_mulai)} - {fmtTime(targetShift?.jam_selesai)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-1">
              {t("page.shift.swap.chooseCoworker")}
            </h3>
            <DialogDescription className="text-xs text-muted-foreground mb-3">
              {t("page.shift.swap.chooseCoworkerHint")}
            </DialogDescription>

            <button
              type="button"
              onClick={() => setCalOpen((v) => !v)}
              className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
              <Calendar size={13} className="text-primary" />
              {calOpen
                ? t("page.shift.swap.calendarHide")
                : t("page.shift.swap.calendarShow", {
                    name: coworkerId
                      ? employees.find((e) => String(e.id) === String(coworkerId))?.fullName || ""
                      : ""
                  })}
            </button>

            {calOpen && (
              <div className="mb-4">
                <AvailabilityCalendar
                  month={calMonth}
                  busyDates={coworkerBusyDates}
                  selectedDate={swapDate}
                  onSelectDate={(iso) => setSwapDate(iso)}
                  disabledDates={ownDates.length > 0 ? ownDates : []}
                />
              </div>
            )}

            {empLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : coworkers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <Users size={26} className="text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">{t("page.shift.swap.noCoworkers")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {coworkers.map(({ key, emp }) => {
                  const role = roleOf(emp);
                  const active = String(coworkerId) === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCoworkerId(emp.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/50 hover:bg-accent/40"
                      }`}>
                      <EmpAvatar emp={emp} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {emp.fullName || emp.userName || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{role || "-"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold px-2 py-0.5">
                          {t("page.shift.swap.coworkerOn")}
                        </span>
                        <div
                          className={`mt-1.5 w-5 h-5 mx-auto rounded-full border flex items-center justify-center transition-colors ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}>
                          {active && <Check size={12} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {coworkerId && targetBusyShifts.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-3.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    size={16}
                    className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {t("page.shift.swap.conflictTitle")}
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
                      {t("page.shift.swap.conflictDesc", { count: targetBusyShifts.length })}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {targetBusyShifts.map((bs) => (
                        <li
                          key={bs.id}
                          className="flex items-center gap-2 text-xs font-medium text-amber-700/90 dark:text-amber-400/90">
                          <Clock size={11} className="shrink-0" />
                          <span className="truncate">{bs.nama_shift || "-"}</span>
                          <span className="font-mono text-xs text-amber-600/80 dark:text-amber-400/70 shrink-0">
                            {fmtTime(bs.jam_mulai)} - {fmtTime(bs.jam_selesai)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="swap-shift-modal-note"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                {t("page.shift.swap.note")}
              </label>
              <div className="group relative">
                <MessageSquareText
                  size={15}
                  className="absolute left-3 top-3 text-muted-foreground/70 transition-colors group-focus-within:text-emerald-600"
                />
                <Textarea
                  id="swap-shift-modal-note"
                  unstyled
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("page.shift.swap.notePlaceholder")}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  maxLength={FIELD_LIMITS.DESCRIPTION}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-border">
          <div>
            {step === "coworker" && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setStep("target");
                  setCoworkerId(null);
                }}>
                {t("page.shift.swap.back")}
              </Button>
            )}
          </div>
          {step === "target" ? (
            <Button
              size="sm"
              disabled={!targetShiftId || !dateValid}
              disabledReason={t("page.shift.swap.disabledReason.selectTarget")}
              onClick={() => setStep("coworker")}>
              {t("page.shift.swap.next")}
              <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              disabled={!canSubmit}
              disabledReason={
                swapMutation.isLoading
                  ? undefined
                  : t("page.shift.swap.disabledReason.selectCoworker")
              }
              onClick={() =>
                swapMutation.mutate({
                  requesterShiftId: ownShiftId,
                  targetShiftId,
                  targetId: coworkerId,
                  tanggal_mulai: swapDate,
                  tanggal_selesai: swapDate,
                  note: note.trim() || undefined
                })
              }>
              {swapMutation.isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowRightLeft size={14} />
              )}
              {swapMutation.isLoading
                ? t("page.shift.swap.submitting")
                : t("page.shift.swap.submit")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SwapShiftModal;

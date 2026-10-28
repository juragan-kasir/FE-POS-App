import React, { useState, useMemo } from "react";
import { useQuery } from "react-query";
import {
  CalendarDays,
  Clock,
  Users,
  Store,
  Briefcase,
  Building2,
  Save,
  RefreshCcw,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllEmployee } from "@/services/employee";
import { formatDateOnly, parseDateOnly } from "@/utils/dateOnly";
import { cn } from "@/lib/utils";
import { resolveKaryawan, groupKaryawanByStore, splitKaryawanByStore } from "./shiftMembers";
import { useTranslation } from "react-i18next";

const ExtendShiftModal = ({ open, onOpenChange, shift, locationName, onSave, isSaving }) => {
  const { t } = useTranslation();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const initialMulai = useMemo(() => {
    if (!shift?.tanggal_mulai) return null;
    return parseDateOnly(shift.tanggal_mulai);
  }, [shift?.tanggal_mulai]);

  const initialSelesai = useMemo(() => {
    if (!shift?.tanggal_selesai) return null;
    return parseDateOnly(shift.tanggal_selesai);
  }, [shift?.tanggal_selesai]);

  const [tanggalMulai, setTanggalMulai] = useState(initialMulai);
  const [tanggalSelesai, setTanggalSelesai] = useState(initialSelesai);
  const [tipeShift, setTipeShift] = useState(shift?.tipe_shift || "harian");
  const [errorMsg, setErrorMsg] = useState("");

  React.useEffect(() => {
    if (open) {
      setTanggalMulai(initialMulai);
      setTanggalSelesai(initialSelesai);
      setTipeShift(shift?.tipe_shift || "harian");
      setErrorMsg("");
    }
  }, [open, initialMulai, initialSelesai, shift?.tipe_shift]);

  const isExpired = useMemo(() => {
    if (!shift?.tanggal_selesai) return false;
    const end = parseDateOnly(shift.tanggal_selesai);
    return end < today;
  }, [shift?.tanggal_selesai, today]);

  const isMingguan = tipeShift === "mingguan";

  const { data: empData, isLoading: empLoading } = useQuery(
    ["employees-shift-lookup", shift?.id],
    () => getAllEmployee({ limit: 100 }),
    { enabled: !!open }
  );

  const allEmps = useMemo(() => empData?.data || empData?.employees || [], [empData]);

  const memberRows = useMemo(
    () => resolveKaryawan(shift?.karyawan, allEmps),
    [shift?.karyawan, allEmps]
  );

  const resolvedCount = memberRows.filter((r) => r.emp).length;
  const unknownCount = memberRows.length - resolvedCount;
  const { matching, mismatch } = useMemo(
    () => splitKaryawanByStore(memberRows, shift?.store),
    [memberRows, shift?.store]
  );
  const storeGroups = useMemo(() => groupKaryawanByStore(matching), [matching]);
  const mismatchGroups = useMemo(() => groupKaryawanByStore(mismatch), [mismatch]);

  const validate = () => {
    if (!tanggalMulai) return "Tanggal mulai wajib diisi.";
    const mulai = new Date(tanggalMulai);
    mulai.setHours(0, 0, 0, 0);
    if (isMingguan) {
      if (!tanggalSelesai) return "Tanggal selesai wajib diisi untuk shift mingguan.";
      const selesai = new Date(tanggalSelesai);
      selesai.setHours(0, 0, 0, 0);
      if (selesai < mulai) return "Tanggal selesai tidak boleh sebelum tanggal mulai.";
      if (selesai < today) return "Tanggal selesai tidak boleh di masa lalu.";
    }
    return "";
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }
    const mulai = new Date(tanggalMulai);
    mulai.setHours(0, 0, 0, 0);
    let selesai = null;
    if (isMingguan) {
      selesai = new Date(tanggalSelesai);
      selesai.setHours(0, 0, 0, 0);
    }
    onSave({
      tanggal_mulai: formatDateOnly(mulai),
      tanggal_selesai: selesai ? formatDateOnly(selesai) : null,
      tipe_shift: tipeShift
    });
  };

  const daysLeft = useMemo(() => {
    if (!shift?.tanggal_selesai) return null;
    const end = parseDateOnly(shift.tanggal_selesai);
    const diff = Math.ceil((end - today) / 86400000);
    return diff;
  }, [shift?.tanggal_selesai, today]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <RefreshCcw size={20} className="text-primary" />
            {t("page.shift.list.extend")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("page.shift.ui.extendOrAdjustThisShift")}
          </DialogDescription>
        </DialogHeader>

        {/* Shift summary */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-4 bg-muted/30 border-b border-border">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{shift?.nama_shift || "-"}</p>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock size={11} className="shrink-0" />
                    {shift?.jam_mulai?.slice(0, 5)} - {shift?.jam_selesai?.slice(0, 5)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Store size={11} className="shrink-0" />
                    {locationName || `Toko #${shift?.store || "-"}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize",
                  isMingguan
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                )}>
                {tipeShift}
              </span>
              {shift?.tipe_shift === "mingguan" && daysLeft !== null && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    daysLeft <= 2
                      ? "text-red-600 dark:text-red-400"
                      : daysLeft <= 5
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                  )}>
                  {isExpired ? "Shift telah berakhir" : `${daysLeft} hari lagi berakhir`}
                </span>
              )}
            </div>
          </div>
        </div>

        {isExpired && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>{t("page.shift.ui.thisShiftIsPastIts")}</p>
          </div>
        )}

        {/* Date fields */}
        <div className="rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <CalendarDays size={14} />
            {t("page.shift.ui.validPeriod")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="extend-shift-modal-start-date"
                className="block text-sm font-medium text-foreground mb-1.5">
                {t("page.profile.startDate")} <span className="text-destructive">*</span>
              </label>
              <DatePicker
                id="extend-shift-modal-start-date"
                date={tanggalMulai}
                setDate={setTanggalMulai}
                minDate={today}
                placeholder={t("page.accounting.filter.pickDate")}
              />
              {!tanggalMulai && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {t("fieldError.required")}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="extend-shift-modal-tanggal-selesai"
                className="block text-sm font-medium text-foreground mb-1.5">
                {t("page.productionOrder.detail.tanggalSelesai")}
              </label>
              <div
                className={cn(
                  "transition-opacity duration-200",
                  !isMingguan && "opacity-50 pointer-events-none"
                )}>
                <DatePicker
                  id="extend-shift-modal-tanggal-selesai"
                  date={tanggalSelesai}
                  setDate={isMingguan ? setTanggalSelesai : () => {}}
                  minDate={tanggalMulai || today}
                  placeholder={t("page.accounting.filter.pickDate")}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isMingguan ? "Atur tanggal berakhir shift" : "Hanya untuk shift mingguan"}
              </p>
            </div>
          </div>
        </div>

        {/* Tipe shift */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t("page.shift.ui.shiftType")} <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            {["harian", "mingguan"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTipeShift(type)}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-2",
                  tipeShift === type
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}>
                {type === "harian" ? "Harian" : "Mingguan"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Info size={11} className="shrink-0" />
            {isMingguan
              ? "Shift berjalan mingguan dengan tanggal selesai."
              : "Hanya untuk shift mingguan"}
          </p>
        </div>

        {/* Employee list */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
            <Users size={14} className="text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("page.shift.ui.employeesInThisShift")}
            </span>
            <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {matching.length}
            </span>
          </div>
          {empLoading ? (
            <div className="p-3 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : matching.length === 0 ? (
            <div className="p-6 text-center">
              <Users size={24} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {t("page.shift.ui.noEmployeesInThisShift")}
              </p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto divide-y divide-border/60">
              {storeGroups.map((g) => (
                <div key={g.key}>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-muted sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                    {g.iconType === "missing" ? (
                      <Users size={12} className="shrink-0 text-muted-foreground" />
                    ) : (
                      <Store size={12} className="shrink-0 text-primary" />
                    )}
                    <p className="flex-1 min-w-0 truncate text-xs font-semibold text-muted-foreground">
                      {g.label}
                    </p>
                    <span className="shrink-0 ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-md bg-background border border-border text-xs font-bold text-muted-foreground">
                      {g.members.length}
                    </span>
                  </div>
                  {g.members.map(({ key, emp }) =>
                    emp ? (
                      <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                        {emp.image ? (
                          <img
                            src={emp.image}
                            alt={emp.fullName || emp.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {(emp.fullName || emp.name || "?")[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {emp.fullName || emp.name || "-"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {emp.positionData?.name && (
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <Briefcase size={10} className="shrink-0" />
                                <span className="truncate">{emp.positionData.name}</span>
                              </span>
                            )}
                            {emp.departmentData?.name && (
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <Building2 size={10} className="shrink-0" />
                                <span className="truncate">{emp.departmentData.name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={key}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs text-muted-foreground">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Users size={14} className="opacity-50" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground/70">
                            {t("page.shift.ui.employee")}
                            {key}
                          </p>
                          <p className="text-xs">{t("page.shift.ui.notFoundInTheEmployee")}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 text-xs font-medium">
                          {t("page.shift.ui.notFound")}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
          {mismatch.length > 0 && (
            <div className="px-4 py-2 border-t border-amber-200/70 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/10">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                <Info size={11} className="shrink-0 mt-0.5" />
                <span>
                  {mismatch.length} {t("page.shift.ui.employees")}
                  {mismatchGroups.map((g) => g.label || "Tidak ditemukan").join(", ")}
                  {t("page.shift.ui.doNotMatchThisShift")}
                </span>
              </p>
            </div>
          )}
          {!empLoading && unknownCount > 0 && (
            <div className="px-4 py-2 bg-muted/40 border-t border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info size={11} className="shrink-0" />
                {resolvedCount === 0
                  ? "Belum ada data karyawan yang cocok. Pastikan data karyawan tersedia pada toko ini."
                  : `${resolvedCount} karyawan terisi, ${unknownCount} ID tidak ditemukan di daftar karyawan.`}
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="danger" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="success"
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2">
            {isSaving ? (
              <>
                <RefreshCcw size={14} className="animate-spin" />
                {t("common.saving")}
              </>
            ) : (
              <>
                <Save size={14} />
                {t("page.shift.ui.saveExtension")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendShiftModal;

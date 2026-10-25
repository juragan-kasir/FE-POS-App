import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { AlarmClock, CalendarDays, Clock, Inbox, Loader2, Send, Store, Timer } from "lucide-react";
import { getShiftDropdown } from "@/services/shift";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { getOvertimes, createOvertime, cancelOvertime } from "@/services/overtime";
import { safeGet } from "@/lib/safe-lookup";
import { todayDateOnly } from "@/utils/dateOnly";
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

const fmtDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

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

const hoursBetween = (start, end) => {
  const normal = (v) => {
    const [hh, mm] = String(v || "")
      .split(":")
      .map(Number);
    const mins = hh * 60 + mm;
    return Number.isNaN(mins) ? null : mins;
  };
  const a = normal(start);
  const b = normal(end);
  if (a === null || b === null) return null;
  let diff = b - a;
  if (diff === 0) return null;
  if (diff < 0) diff += 1440;
  return Math.round((diff / 60) * 100) / 100;
};

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
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${safeGet(map, status, map.pending)}`}>
      {safeGet(labels, status, status)}
    </span>
  );
};

const durationLabel = (d) => {
  const v = Number(d) || 0;
  return `${v % 1 === 0 ? v : v.toFixed(2).replace(".", ",")} jam`;
};

const MyOvertime = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = useUserSession() || cookie?.user || {};
  const isSuperAdmin = user?.roleType === "super_admin";
  const storeId = isSuperAdmin ? user?.defaultStoreId || user?.store || "" : user?.store || "";

  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locData?.data || [];
  const effectiveStore = isSuperAdmin ? (storeFilter !== "all" ? storeFilter : "") : storeId;
  const locationName = (sid) => locations.find((l) => String(l.id) === String(sid))?.name || null;

  const [page, setPage] = useState(1);
  const pageSize = 6;

  const {
    data: myData,
    isLoading,
    isFetching,
    isError,
    refetch
  } = useQuery(
    ["my-overtime", effectiveStore, page],
    () => getOvertimes({ store: effectiveStore, page, pageSize, mine: 1 }),
    { keepPreviousData: true, enabled: isSuperAdmin ? true : !!effectiveStore }
  );

  const rows = myData?.data || [];
  const stats = myData?.stats || {};
  const pagination = myData?.pagination || {};
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPage || Math.ceil(total / pageSize) || 1;

  const { data: shiftData } = useQuery(
    ["overtime-shift-options", effectiveStore],
    () => getShiftDropdown({ store: effectiveStore, statusShift: "active" }),
    { enabled: isSuperAdmin ? true : !!effectiveStore }
  );
  const allShifts = shiftData?.data || [];
  const myShifts = allShifts.filter((s) =>
    (s.karyawan || []).some((k) => String(k) === String(user?.id))
  );
  const shiftOptions = myShifts.map((s) => ({
    value: String(s.id),
    label: `${s.shiftName} (${String(s.startTime || "").slice(0, 5)} - ${String(
      s.endTime || ""
    ).slice(0, 5)})`
  }));

  const [form, setForm] = useState({
    shift_id: "",
    date: todayDateOnly(),
    start_time: "",
    end_time: "",
    note: ""
  });
  const [cancelTarget, setCancelTarget] = useState(null);

  const duration = hoursBetween(form.start_time, form.end_time);
  const canSubmit =
    form.shift_id &&
    form.date &&
    form.start_time &&
    form.end_time &&
    duration !== null &&
    duration > 0;

  const createMutation = useMutation(createOvertime, {
    onSuccess: (res) => {
      toast.success("Berhasil", { description: res?.message || "Pengajuan lembur dikirim." });
      setForm((f) => ({ ...f, start_time: "", end_time: "", note: "" }));
      queryClient.invalidateQueries(["my-overtime"]);
    },
    onError: (err) => {
      toast.error("Gagal", { description: err?.response?.data?.message || err.message });
    }
  });

  const cancelMutation = useMutation(cancelOvertime, {
    onSuccess: (res) => {
      toast.success("Berhasil", { description: res?.message || "Pengajuan dibatalkan." });
      setCancelTarget(null);
      queryClient.invalidateQueries(["my-overtime"]);
    },
    onError: (err) => {
      toast.error("Gagal", { description: err?.response?.data?.message || err.message });
    }
  });

  const handleSubmit = () => {
    if (!canSubmit) return;
    createMutation.mutate({
      store: effectiveStore,
      shift_id: Number(form.shift_id),
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      note: form.note || null
    });
  };

  const statItem = (label, value, cls) => (
    <div className="bg-card rounded-xl border border-border p-4">
      <span className="text-xs text-muted-foreground block">{label}</span>
      <p className={`text-2xl font-bold mt-1 ${cls || "text-foreground"}`}>{value}</p>
    </div>
  );

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
        title="Lembur Saya"
        description="Ajukan lembur berdasarkan shift aktif dan pantau status pengajuan."
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {statItem("Menunggu", stats.pending || 0, "text-amber-600 dark:text-amber-400")}
        {statItem("Disetujui", stats.approved || 0, "text-green-600 dark:text-green-400")}
        {statItem("Ditolak", stats.rejected || 0, "text-red-600 dark:text-red-400")}
        {statItem("Total", total || 0, "text-foreground")}
      </div>

      {isSuperAdmin && (
        <div className="flex flex-col gap-1.5 max-w-xs">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Toko
          </label>
          <Combobox
            options={[
              { value: "all", label: "Semua Toko" },
              ...locations.map((l) => ({ value: String(l.id), label: l.name }))
            ]}
            value={storeFilter}
            onChange={(v) => {
              setGlobalStoreFilter(v);
              setPage(1);
            }}
            placeholder="Pilih toko"
            searchPlaceholder="Cari toko..."
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form pengajuan */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-4 h-fit">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <AlarmClock size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Ajukan Lembur</h2>
              <p className="text-xs text-muted-foreground">
                Tentukan shift, tanggal, dan jam lembur Anda.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Shift
            </label>
            <Combobox
              options={shiftOptions}
              value={form.shift_id}
              onChange={(v) => setForm((f) => ({ ...f, shift_id: v }))}
              placeholder={myShifts.length ? "Pilih shift" : "Tidak ada shift aktif"}
              searchPlaceholder="Cari shift..."
            />
            {myShifts.length === 0 && (
              <p className="text-[11px] text-red-500">
                Anda belum terdaftar di shift aktif toko ini.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tanggal
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Durasi (auto)
              </label>
              <div className="h-9 rounded-lg border border-border bg-muted/30 px-3 flex items-center text-sm font-medium text-foreground">
                {duration !== null && duration > 0 ? durationLabel(duration) : "-"}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Jam Mulai
              </label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Jam Selesai
              </label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Catatan
            </label>
            <Textarea
              rows={3}
              placeholder="Alasan / detail pekerjaan lembur (opsional)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
          </div>

          <Button
            variant="success"
            className="w-full sm:w-auto gap-2"
            disabled={!canSubmit || createMutation.isLoading}
            onClick={handleSubmit}>
            {createMutation.isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Kirim Pengajuan
          </Button>
        </div>

        {/* Riwayat */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Clock size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Riwayat Pengajuan</h2>
                <p className="text-xs text-muted-foreground">
                  {locationName(effectiveStore) || `Toko #${effectiveStore || "-"}`}
                </p>
              </div>
            </div>
            {isFetching && <Loader2 size={14} className="text-primary animate-spin" />}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Gagal memuat riwayat lembur.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                Muat Ulang
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 flex flex-col items-center justify-center text-center gap-2">
              <Inbox size={20} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada pengajuan lembur.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rows.map((ot) => (
                <div
                  key={ot.id}
                  className="rounded-xl border border-border bg-muted/20 p-3.5 text-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Store size={12} className="shrink-0" />
                      <span className="truncate">
                        {ot.shift?.name || `Shift #${ot.shift_id || "-"}`} ·{" "}
                        {String(ot.shift?.startTime || "-").slice(0, 5)} -{" "}
                        {String(ot.shift?.endTime || "-").slice(0, 5)}
                      </span>
                    </div>
                    {statusBadge(ot.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays size={12} className="shrink-0" />
                      {fmtDate(ot.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Timer size={12} className="shrink-0" />
                      {String(ot.start_time || "").slice(0, 5)} -{" "}
                      {String(ot.end_time || "").slice(0, 5)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <Clock size={12} className="shrink-0" />
                      {durationLabel(ot.duration_hours)}
                    </span>
                  </div>
                  {ot.note && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{ot.note}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground">
                      Diajukan {fmtDateTime(ot.createdAt)}
                    </p>
                    {ot.status === "pending" && (
                      <Button
                        size="sm"
                        variant="danger"
                        className="h-7 px-2.5 text-[11px] text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => setCancelTarget(ot)}>
                        Batalkan
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {total > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {total} pengajuan · halaman {page} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}>
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}>
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        type="confirm"
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Batalkan pengajuan lembur?"
        description={`Pengajuan lembur ${
          cancelTarget?.shift?.name || ""
        } pada ${fmtDate(cancelTarget?.date)} akan dibatalkan.`}
        confirmText="Batalkan Pengajuan"
        loading={cancelMutation.isLoading}
        onConfirm={() => cancelMutation.mutate({ id: cancelTarget.id })}
      />
      {(createMutation.isLoading || cancelMutation.isLoading) && (
        <Loading fullscreen size="lg" label="Menyimpan..." />
      )}
    </div>
  );
};

export default MyOvertime;

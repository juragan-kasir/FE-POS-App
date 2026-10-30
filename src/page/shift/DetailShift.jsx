import React, { useMemo } from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Edit3,
  Calendar,
  Clock,
  Users,
  Store,
  BadgeCheck,
  Hash,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getShiftById } from "@/services/shift";
import { getAllEmployee } from "@/services/employee";
import { getAttendanceByShift } from "@/services/attendance";
import { resolveKaryawan, splitKaryawanByStore } from "./shiftMembers";
import { cn } from "@/lib/utils";
import { safeGet } from "@/lib/safe-lookup";
import { DEFAULT_SHIFT_TYPE, SHIFT_TYPE_LABELS, SHIFT_TYPES } from "@/constants/shiftTypes";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import { dateLocale } from "@/lib/locale";

const statusBadge = (status, t) => {
  if (status === "active" || status === true || status === 1)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
        {t("common.active")}
      </span>
    );
  if (status === "draft")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        {t("common.draft")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
      {t("common.inactive")}
    </span>
  );
};

const fmtDate = (d, withTime = false) =>
  d
    ? new Date(d).toLocaleDateString(dateLocale(), {
        day: "numeric",
        month: "long",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
      })
    : "-";

const InfoRow = ({ icon: Icon, label, children, iconClass }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-medium rounded-lg border border-border/60 bg-background px-3 py-2.5",
        iconClass
      )}>
      <Icon size={14} className={iconClass || "text-muted-foreground"} />
      {children}
    </div>
  </div>
);

const fmtClock = (absenAt) =>
  absenAt
    ? new Date(absenAt).toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })
    : "-";

const presenceBadge = ({ done, doneLabel, notDoneLabel }) =>
  done ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-semibold">
      <CheckCircle2 size={11} />
      {doneLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-xs font-semibold">
      <XCircle size={11} />
      {notDoneLabel}
    </span>
  );

const DetailShift = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["shifts-detail", id],
    () => getShiftById(id),
    { enabled: !!id }
  );

  const shift = data?.data;

  const { data: empQuery } = useQuery(
    ["employees-shift-detail"],
    () => getAllEmployee({ limit: 100 }),
    {
      enabled: !!shift
    }
  );
  const employee = useMemo(() => empQuery?.data || empQuery?.employees || [], [empQuery]);
  const memberRows = useMemo(
    () => resolveKaryawan(shift?.karyawan, employee),
    [shift?.karyawan, employee]
  );
  const { matching, mismatch } = useMemo(
    () => splitKaryawanByStore(memberRows, shift?.store),
    [memberRows, shift?.store]
  );
  const mismatchGroups = useMemo(() => {
    const byTarget = new Map();
    mismatch.forEach((row) => {
      const label =
        row.emp?.storeData?.name || t("common.ui.storeNumber", { id: row.emp?.store ?? "-" });
      byTarget.set(label, (byTarget.get(label) || 0) + 1);
    });
    return [...byTarget].map(([label, count]) => ({ label, count }));
  }, [mismatch]);
  const resolvedCount = matching.filter((r) => r.emp).length;

  const { data: locQuery } = useLocations();
  const locationName = useMemo(
    () => locQuery?.data?.find((l) => String(l.id) === String(shift?.store))?.name || null,
    [locQuery?.data, shift?.store]
  );

  const { data: attQuery } = useQuery(["shift-attendance", id], () => getAttendanceByShift(id), {
    enabled: !!shift?.id,
    retry: 0
  });
  const attendanceRows = Array.isArray(attQuery?.data) ? attQuery.data : [];

  const attendanceMap = useMemo(() => {
    const map = new Map();
    const todayStr = new Date().toLocaleDateString("en-CA");
    attendanceRows.forEach((r) => {
      const d = new Date(r.absenAt);
      if (isNaN(d.getTime())) return;
      if (d.toLocaleDateString("en-CA") !== todayStr) return;
      if (r.status === "cancelled") return;
      const uid = String(r.userId);
      if (!map.has(uid)) map.set(uid, { checkIn: null, checkOut: null });
      const cur = map.get(uid);
      const ts = d.getTime();
      if (r.type === "check-in") {
        if (!cur.checkIn || ts < new Date(cur.checkIn.absenAt).getTime()) {
          cur.checkIn = r;
        }
      } else if (r.type === "check-out") {
        if (!cur.checkOut || ts > new Date(cur.checkOut.absenAt).getTime()) {
          cur.checkOut = r;
        }
      }
    });
    return map;
  }, [attendanceRows]);

  const counts = useMemo(() => {
    const masuk = memberRows.filter((row) => attendanceMap.get(String(row.id))?.checkIn).length;
    const keluar = memberRows.filter((row) => attendanceMap.get(String(row.id))?.checkOut).length;
    return {
      total: memberRows.length,
      masuk,
      keluar,
      belumMasuk: memberRows.length - masuk,
      belumKeluar: memberRows.length - keluar
    };
  }, [memberRows, attendanceMap]);

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.shift.ui.shiftIdNotFound")}</p>
      </div>
    );

  if (isLoading)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );

  if (isError || !shift)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.shift.ui.shiftNotFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="outline" onClick={() => navigate("/shift-list")}>
          {t("common.back")}
        </Button>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Breadcrumb */}
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.shift.list.title"),
            href: "/shift-list",
            i18nKey: "page.shift.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={shift.nama_shift || "-"}
        description={
          <span className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Store size={13} />
            {locationName || t("common.ui.storeNumber", { id: shift.store || "-" })}
            <span className="text-muted-foreground/50">•</span>
            {statusBadge(shift.status, t)}
          </span>
        }
        backLink="/shift-list"
        dynamicInfo={false}>
        <Button variant="outline" onClick={() => navigate(`/edit-shift?id=${id}`)}>
          <Edit3 size={14} className="mr-1.5" />
          {t("common.edit")}
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Info Card */}
        <Card className="p-5 col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
            <BadgeCheck size={16} />
            {t("page.shift.ui.shiftInformation")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            <InfoRow icon={Hash} label="ID">
              <span className="font-mono">#{shift.id}</span>
            </InfoRow>
            <InfoRow icon={Store} label={t("document.store")} iconClass="text-primary">
              {locationName || t("common.ui.storeNumber", { id: shift.store || t("common.all") })}
            </InfoRow>
            <InfoRow icon={CalendarDays} label={t("page.shift.table.name")}>
              {shift.nama_shift || "-"}
            </InfoRow>
            <InfoRow icon={RefreshCcw} label={t("page.shift.ui.shiftType")}>
              <span className="capitalize">
                {SHIFT_TYPES.includes(shift.tipe_shift)
                  ? safeGet(SHIFT_TYPE_LABELS, shift.tipe_shift, shift.tipe_shift)
                  : safeGet(SHIFT_TYPE_LABELS, DEFAULT_SHIFT_TYPE, DEFAULT_SHIFT_TYPE)}
              </span>
            </InfoRow>
            <InfoRow icon={BadgeCheck} label={t("page.shift.table.status")}>
              {statusBadge(shift.status, t)}
            </InfoRow>
            <InfoRow icon={Calendar} label={t("page.profile.startDate")}>
              {fmtDate(shift.tanggal_mulai)}
            </InfoRow>
            <InfoRow icon={Calendar} label={t("page.productionOrder.detail.tanggalSelesai")}>
              {fmtDate(shift.tanggal_selesai)}
            </InfoRow>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Schedule */}
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">
              <Clock size={14} />
              {t("page.shift.ui.timeSchedule")}
            </div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-primary/5 rounded-lg p-3.5">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.shift.form.startTime")}
                  </p>
                  <p className="text-2xl font-bold font-mono text-primary">
                    {shift.jam_mulai?.slice(0, 5) || "-"}
                  </p>
                </div>
                <div className="h-10 w-8 flex items-center justify-center text-xl text-muted-foreground/40">
                  →
                </div>
                <div className="flex-1 bg-primary/5 rounded-lg p-3.5">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.shift.form.endTime")}
                  </p>
                  <p className="text-2xl font-bold font-mono text-primary">
                    {shift.jam_selesai?.slice(0, 5) || "-"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Karyawan & Absensi */}
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">
              <Users size={14} />
              {t("sidebar.employee")}
              <span className="ml-auto inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
                {matching.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("page.shift.ui.openTheFullTableBelow")}
            </p>
          </Card>

          {/* Metadata */}
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">
              <BadgeCheck size={14} />
              {t("breadcrumb.history")}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users size={11} className="shrink-0" />
                <span className="whitespace-nowrap">
                  {t("page.shift.ui.createdBy")}{" "}
                  <span className="text-foreground/70 font-medium">
                    {shift.createdByUser?.fullName || shift.createdByUser?.userName || "-"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCcw size={11} className="shrink-0" />
                <span className="whitespace-nowrap">
                  {t("page.shift.ui.modifiedBy")}{" "}
                  <span className="text-foreground/70 font-medium">
                    {shift.modifiedByUser?.fullName || shift.modifiedByUser?.userName || "-"}
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t("page.shift.table.createdAt") || "Dibuat"}
                </span>
                <span className="font-medium">{fmtDate(shift.createdAt, true)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("page.table.table.updatedAt")}</span>
                <span className="font-medium">{fmtDate(shift.updatedAt, true)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Karyawan & Absensi */}
      <Card className="p-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">
              {t("page.shift.ui.employeesAttendance")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("page.shift.ui.employeeClockInClockOut")}
              {fmtDate(new Date().toISOString())})
            </p>
          </div>
          <span className="ml-auto inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-full bg-primary/10 text-primary text-sm font-bold">
            {counts.total}
          </span>
        </div>

        {/* Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("common.ui.totalEmployees")}
            </p>
            <p className="text-xl font-bold text-foreground mt-0.5">{counts.total}</p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
              {t("page.shift.ui.clockIn")}
            </p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-0.5">
              {counts.masuk}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
              {t("page.shift.ui.notClockedIn2")}
            </p>
            <p className="text-xl font-bold text-red-700 dark:text-red-400 mt-0.5">
              {counts.belumMasuk}
            </p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
              {t("page.shift.ui.clockOut2")}
            </p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-0.5">
              {counts.keluar}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              {t("page.shift.ui.notClockedOut")}
            </p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">
              {counts.belumKeluar}
            </p>
          </div>
        </div>

        {mismatch.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
              <Store size={11} className="shrink-0 mt-0.5" />
              <span>
                {mismatch.length} {t("page.shift.ui.employeesDoNotMatchThis")}
                {mismatchGroups.map((g) => `${g.label} (${g.count})`).join(", ")}
                {t("page.shift.ui.adjustTheShiftMembersOn")}
              </span>
            </p>
          </div>
        )}
        {resolvedCount > 0 && resolvedCount < matching.length && (
          <p className="mb-4 text-xs text-muted-foreground">
            {resolvedCount} {t("common.ui.of")} {matching.length}{" "}
            {t("page.shift.ui.employeesFoundInTheEmployee")}
          </p>
        )}

        {memberRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-10 text-center">
            <Users size={22} className="text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">
              {t("page.shift.ui.noEmployeesInThisShift2")}
            </p>
          </div>
        ) : (
          <HorizontalScrollArea>
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground w-10">
                    {t("page.position.table.no")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("sidebar.employee")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("userName")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("page.employee.form.role")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("document.position")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("sidebar.departemen")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("document.store")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("page.shift.ui.clockIn")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("page.shift.ui.clockInTime")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("page.shift.ui.clockOut2")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("page.shift.ui.clockOutTime")}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("page.shift.ui.attendance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((row, idx) => {
                  const emp = row.emp;
                  const att = attendanceMap.get(String(row.id)) || {};
                  const checkIn = att.checkIn || null;
                  const checkOut = att.checkOut || null;
                  return (
                    <tr key={row.key} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        {emp ? (
                          <div className="flex items-center gap-2.5 min-w-0">
                            {emp.image ? (
                              <img
                                src={emp.image}
                                alt={emp.fullName || emp.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold">
                                  {(emp.fullName || emp.name || "?")[0]}
                                </span>
                              </div>
                            )}
                            <span className="truncate font-medium text-foreground">
                              {emp.fullName || emp.name || "-"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t("page.shift.ui.employee")}
                            {row.key}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{emp?.userName || "-"}</td>
                      <td className="px-3 py-2.5 capitalize text-muted-foreground">
                        {emp?.roleType || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {emp?.positionData?.name || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {emp?.departmentData?.name || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {emp
                          ? emp.storeData?.name ||
                            t("common.ui.storeNumber", { id: emp.store ?? "-" })
                          : "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        {checkIn
                          ? presenceBadge({ done: true, doneLabel: t("page.shift.ui.done") })
                          : presenceBadge({ done: false, notDoneLabel: t("page.shift.ui.notYet") })}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">
                        {fmtClock(checkIn?.absenAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        {checkOut ? (
                          presenceBadge({ done: true, doneLabel: t("page.shift.ui.done") })
                        ) : checkIn ? (
                          presenceBadge({ done: false, notDoneLabel: t("page.shift.ui.notYet") })
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">
                        {fmtClock(checkOut?.absenAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        {checkIn && checkOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-semibold">
                            <CheckCircle2 size={11} />
                            {t("page.shift.ui.fullyPresent")}
                          </span>
                        ) : checkIn ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-xs font-semibold">
                            <LogIn size={11} />
                            {t("page.shift.ui.notOutYet")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-xs font-semibold">
                            <LogOut size={11} />
                            {t("page.shift.ui.notInYet")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </HorizontalScrollArea>
        )}
      </Card>
    </div>
  );
};

export default DetailShift;

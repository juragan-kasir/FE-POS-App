import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useQuery, useQueryClient } from "react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  Store,
  Wallet,
  Receipt,
  Bell,
  Calculator,
  ArrowRight,
  ArrowRightLeft,
  RefreshCcw,
  Target,
  ShoppingCart,
  CheckCircle2,
  CircleDashed,
  XCircle,
  TrendingUp,
  Fingerprint,
  LogOut,
  Loader2
} from "lucide-react";
import { getAllShift } from "@/services/shift";
import { getCurrentCashRegister } from "@/services/cash-register";
import { getAllNotifications, getUnreadCount } from "@/services/notification";
import { getDashboardSummary } from "@/services/dashboard";
import { getMyAttendance } from "@/services/attendance";
import { getShiftSwaps } from "@/services/shiftSwap";
import { useUserSession } from "@/hooks/useUserSession";
import { hasMenuAccess } from "@/utils/permission";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/ui/StatCard";
import NoStore from "@/components/ui/NoStore";
import AttendanceModal from "@/components/organism/AttendanceModal";
import SwapShiftModal from "@/page/shift/SwapShiftModal";
import CancelSwapDialog from "@/page/shift/CancelSwapDialog";
import { safeGet } from "@/lib/safe-lookup";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import { useTranslation } from "react-i18next";

const DAY_MS = 86400000;

const fmtCurrency = (num) => formatCurrencyRupiah(Number(num || 0));

const fmtTime = (hhmm) => (hhmm ? String(hhmm).slice(0, 5) : "-");

const todayLong = () =>
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

const nowHM = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
};

const DashboardUser = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = useUserSession() || cookie?.user || {};

  const storeId = cookie?.activeStore || user?.store;
  const currentUserId = user?.id;
  // ponytail: ringkasan penjualan hanya tampil bila accessMenu punya akses "dashboard"
  const canSales = hasMenuAccess(user, "/dashboard-super-admin", ["view"]);
  // ponytail: widget POS / status kas / shift disesuaikan dengan accessMenu user
  const canPos = hasMenuAccess(user, "/home", ["view"]);
  const canKas = hasMenuAccess(user, "/cash-register/current", ["view"]);
  const canMyShift = hasMenuAccess(user, "/my-shift", ["view"]);

  const [attendanceType, setAttendanceType] = useState(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [cancelSwap, setCancelSwap] = useState(null);
  const seenApprovedRef = useRef(new Set());
  const swapToastInitRef = useRef(false);

  const { data: myAttData, refetch: refetchAttendance } = useQuery(
    ["dashboard-user-attendance", currentUserId],
    () => getMyAttendance(),
    { enabled: !!currentUserId, retry: 0 }
  );

  const myAtt = Array.isArray(myAttData?.data) ? myAttData.data : [];
  const hasCheckedIn = myAtt.some((r) => r.type === "check-in" && r.status !== "cancelled");
  const hasCheckedOut = myAtt.some((r) => r.type === "check-out" && r.status !== "cancelled");

  const {
    data: shiftData,
    isLoading: shiftLoading,
    refetch: refetchShift
  } = useQuery(
    ["dashboard-user-shift", storeId],
    () => getAllShift({ store: storeId, page: 1, limit: 100, statusShift: "active" }),
    { enabled: !!storeId, retry: 0 }
  );

  const {
    data: kasData,
    isLoading: kasLoading,
    refetch: refetchKas
  } = useQuery(["dashboard-user-kas", storeId], () => getCurrentCashRegister(storeId), {
    enabled: !!storeId && canKas,
    refetchInterval: storeId && canKas ? 30000 : false
  });

  const { data: unreadData } = useQuery(["dashboard-user-unread"], () => getUnreadCount(), {
    retry: 0
  });

  const { data: notifData, isLoading: notifLoading } = useQuery(
    ["dashboard-user-notif", storeId],
    () => getAllNotifications({ limit: 5, store: storeId ? String(storeId) : undefined }),
    { enabled: !!storeId, retry: 0 }
  );

  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary
  } = useQuery(
    ["dashboard-user-summary", storeId],
    () => getDashboardSummary({ filter: "daily" }),
    { enabled: !!storeId && canSales, retry: 0 }
  );

  const allShifts = shiftData?.data || shiftData?.shifts || [];
  const myShifts = useMemo(
    () =>
      (Array.isArray(allShifts) ? allShifts : []).filter((s) =>
        (s.karyawan || []).some((k) => String(k) === String(currentUserId))
      ),
    [allShifts, currentUserId]
  );

  const todayShift = useMemo(() => {
    if (!myShifts.length) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dayStart = now.getTime();
    const dayEnd = dayStart + DAY_MS;
    return (
      myShifts.find((s) => {
        const start = new Date(s.tanggal_mulai);
        if (isNaN(start.getTime())) return false;
        const end = s.tanggal_selesai ? new Date(s.tanggal_selesai) : null;
        const endT = end && !isNaN(end.getTime()) ? new Date(end).setHours(23, 59, 59, 999) : null;
        return start.getTime() <= dayEnd && (endT == null || endT >= dayStart);
      }) || null
    );
  }, [myShifts]);

  const shiftActive = useMemo(() => {
    if (!todayShift) return null;
    const now = nowHM();
    const start = fmtTime(todayShift.jam_mulai);
    const end = fmtTime(todayShift.jam_selesai);
    if (!start || !end) return null;
    if (start <= end) return now >= start && now <= end;
    return now >= start || now <= end;
  }, [todayShift]);

  const {
    data: swapData,
    isLoading: swapLoading,
    refetch: refetchSwaps
  } = useQuery(
    ["dashboard-user-swaps", storeId],
    () => getShiftSwaps({ store: storeId, page: 1, pageSize: 50, status: "", mine: 1 }),
    {
      enabled: !!storeId && !!currentUserId && canMyShift,
      retry: 0,
      refetchInterval: 30000
    }
  );

  const mySwaps = useMemo(() => {
    const rows = Array.isArray(swapData?.data) ? swapData.data : [];
    return rows
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
      toast.success(t("page.dashboardUser.ui.shiftSwapDone"), {
        description: `Pertukaran shift kamu dengan ${
          other?.fullName || "rekan kerja"
        } telah disetujui.`
      });
    });
  }, [mySwaps, currentUserId]);

  const swappableShifts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return myShifts.filter((s) => {
      const end = s.tanggal_selesai ? new Date(s.tanggal_selesai) : null;
      const endT = end && !isNaN(end.getTime()) ? end.setHours(23, 59, 59, 999) : null;
      return endT == null || endT >= now.getTime();
    });
  }, [myShifts]);

  const reg = kasData?.data?.register || kasData?.data || null;
  const kasOpen = !!reg;
  const currentSales = kasData?.data?.currentSales ?? reg?.totalSales ?? 0;
  const expectedCash = kasData?.data?.expectedCash ?? 0;
  const totalTransactions = kasData?.data?.totalTransactions ?? 0;

  const unread = unreadData?.data?.unreadCount || 0;
  const notifications = notifData?.data || [];

  const summary = summaryData?.data || {};
  const totalSales = Number(summary.totalSales || 0);
  const totalOrders = Number(summary.totalOrders || 0);
  const dailyTarget = Number(summary.dailyTarget || 0);
  const averageOrderValue = Number(summary.averageOrderValue || 0);
  const targetProgress =
    dailyTarget > 0 ? Math.min(100, Math.round((totalSales / dailyTarget) * 100)) : 0;
  const bestSellers = Array.isArray(summary.bestSellers) ? summary.bestSellers : [];

  if (!storeId) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <NoStore />
      </div>
    );
  }

  const roleName = user?.roleName || user?.roleType || "";
  const positionName = user?.positionName || "";
  const storeName = user?.storeName || summary?.storeInfo?.name || "";
  const shortName = (user?.fullName || "").split(" ")[0] || user?.fullName || "";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <LoadErrorBanner />
      {/* Greeting */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{todayLong()}</p>
            <h1 className="mt-1 text-2xl lg:text-3xl font-bold text-foreground">
              {greeting()}, {shortName}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              {roleName && (
                <span className="inline-flex items-center gap-1.5">
                  <Receipt size={14} className="text-primary/70" />
                  {roleName}
                </span>
              )}
              {positionName && (
                <span className="inline-flex items-center gap-1.5">
                  <Wallet size={14} className="text-primary/70" />
                  {positionName}
                </span>
              )}
              {storeName && (
                <span className="inline-flex items-center gap-1.5">
                  <Store size={14} className="text-primary/70" />
                  {storeName}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canPos && (
              <Button size="sm" onClick={() => navigate("/home")}>
                <Calculator size={15} className="mr-1.5" />
                {t("page.dashboardUser.ui.openCashierPos")}
              </Button>
            )}
            {canMyShift && (
              <Button size="sm" variant="outline" onClick={() => navigate("/my-shift")}>
                <CalendarDays size={15} className="mr-1.5" />
                {t("sidebar.myShift")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Row 1: shift, kas, notifikasi */}
      <div
        className={`grid grid-cols-1 gap-5 ${
          canMyShift && canKas
            ? "lg:grid-cols-3"
            : canMyShift || canKas
              ? "lg:grid-cols-2"
              : "lg:grid-cols-1"
        }`}>
        {/* Shift hari ini */}
        {canMyShift && (
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarClock size={18} />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("page.dashboardUser.ui.todaySShift")}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => navigate("/my-shift")}>
                {t("common.view")}
                <ArrowRight size={13} />
              </Button>
            </div>

            {shiftLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : todayShift ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-foreground">
                    {todayShift.nama_shift || "Shift"}
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold capitalize">
                    {todayShift.tipe_shift || "harian"}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Clock3 size={14} className="shrink-0 text-muted-foreground/70" />
                    <span className="font-mono font-medium text-foreground/90">
                      {fmtTime(todayShift.jam_mulai)} - {fmtTime(todayShift.jam_selesai)}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays size={14} className="shrink-0 text-muted-foreground/70" />
                    {new Date(todayShift.tanggal_mulai).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                  <p className="flex items-center gap-2">
                    <Store size={14} className="shrink-0 text-muted-foreground/70" />
                    {todayShift.storeName || todayShift.store || "Semua toko"}
                  </p>
                </div>
                <div className="mt-auto pt-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      shiftActive === true
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : shiftActive === false
                          ? "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                    {shiftActive === true ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {t("page.dashboardUser.ui.inProgress")}
                      </>
                    ) : shiftActive === false ? (
                      <>
                        <CheckCircle2 size={13} />
                        {t("page.dashboardUser.ui.finished")}
                      </>
                    ) : (
                      <>
                        <CircleDashed size={13} />
                        {t("page.dashboardUser.ui.waitingForStartTime")}
                      </>
                    )}
                  </span>
                  {shiftActive === true && (
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      disabled={hasCheckedIn && hasCheckedOut}
                      onClick={() =>
                        setAttendanceType(hasCheckedIn && !hasCheckedOut ? "check-out" : "check-in")
                      }>
                      {hasCheckedIn && hasCheckedOut ? (
                        "Sudah absen hari ini"
                      ) : hasCheckedIn ? (
                        <>
                          <LogOut size={14} className="mr-1.5" />
                          {t("page.dashboardUser.ui.clockOut")}
                        </>
                      ) : (
                        <>
                          <Fingerprint size={14} className="mr-1.5" />
                          {t("page.dashboardUser.ui.clockIn")}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <CalendarClock size={22} className="text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("page.dashboardUser.ui.noShiftToday")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("page.dashboardUser.ui.checkYourShiftScheduleIn")}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/my-shift")}>
                  {t("page.dashboardUser.ui.openMyShift")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Status kas */}
        {canKas && (
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    kasOpen
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                  <Wallet size={18} />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("page.dashboardUser.ui.registerStatus")}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => navigate("/cash-register/current")}>
                {t("page.location.form.openStatus")}
                <ArrowRight size={13} />
              </Button>
            </div>

            {kasLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : kasOpen ? (
              <>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {t("page.dashboardUser.ui.registerOpen")}
                </span>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("sidebar.penjualan")}
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {fmtCurrency(currentSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("sidebar.transaksi")}
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {totalTransactions}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("page.dashboardUser.ui.expectedCash")}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {fmtCurrency(expectedCash)}
                  </p>
                </div>
                {reg?.openedAt && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("page.cashRegister.xz.openedAt")}{" "}
                    {new Date(reg.openedAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate("/cash-register/current")}>
                    {t("page.dashboardUser.ui.viewRegister")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-semibold">
                  <CircleDashed size={13} />
                  {t("page.dashboardUser.ui.registerNotOpen")}
                </span>
                <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">
                  {t("page.dashboardUser.ui.openTheRegisterWithA")}
                </p>
                <div className="mt-auto pt-4">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => navigate("/cash-register/current")}>
                    {t("page.dashboardUser.ui.openRegisterNow")}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Notifikasi */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 w-[18px] min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-semibold text-foreground">{t("sidebar.notification")}</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => navigate("/notification")}>
              {t("common.all")}
              <ArrowRight size={13} />
            </Button>
          </div>

          {notifLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <Bell size={20} className="text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">
                {t("page.notification.empty")}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.slice(0, 4).map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                    n.isRead ? "border-border/60 bg-muted/30" : "border-primary/20 bg-primary/5"
                  }`}>
                  <span
                    className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${
                      n.isRead ? "bg-muted-foreground/40" : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {n.title || "Notifikasi"}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {n.message || n.description || n.storeName || ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-4">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/notification")}>
              {t("page.dashboardUser.ui.viewAllNotifications")}
              {unread > 0 && (
                <span className="ml-1.5 rounded-full bg-red-500 text-white text-xs px-1.5 py-0.5 font-bold">
                  {unread}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Pertukaran Shift */}
      {canMyShift && !swapLoading && mySwaps.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ArrowRightLeft size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("page.dashboardUser.ui.shiftSwaps")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mySwaps.filter((s) => s.status === "pending").length}{" "}
                  {t("page.dashboardUser.ui.inProgress2")}{" "}
                  {mySwaps.filter((s) => s.status === "approved").length} berhasil
                </p>
              </div>
            </div>
            {swappableShifts.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setSwapModalOpen(true)}>
                <ArrowRightLeft size={14} />
                {t("page.shift.swap.title")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mySwaps.map((s) => {
              const isRequester = String(s.requesterId) === String(currentUserId);
              const requester = s.requesterUser?.fullName || `Karyawan #${s.requesterId}`;
              const target = s.targetUser?.fullName || `Karyawan #${s.targetId}`;
              const statusCfg =
                s.status === "pending"
                  ? {
                      label: t("page.dashboardUser.ui.inProgress3"),
                      cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      icon: Loader2
                    }
                  : s.status === "approved"
                    ? {
                        label: t("common.success"),
                        cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        icon: CheckCircle2
                      }
                    : s.status === "rejected"
                      ? {
                          label: t("businessTrip.status.rejected"),
                          cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          icon: XCircle
                        }
                      : {
                          label: t("page.delivery.stats.cancelled"),
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

      {/* Quick actions */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingCart size={18} />
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("page.dashboard.quickActions")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {canPos && (
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-left hover:bg-accent hover:shadow-sm transition-all group">
              <Calculator size={18} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {t("page.dashboardUser.ui.openCashierPos")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("page.dashboardUser.ui.startServingCustomers")}
                </p>
              </div>
            </button>
          )}
          {canMyShift && (
            <button
              type="button"
              onClick={() => navigate("/my-shift")}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-left hover:bg-accent hover:shadow-sm transition-all group">
              <CalendarDays size={18} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{t("sidebar.myShift")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("page.dashboardUser.ui.scheduleShiftSwaps")}
                </p>
              </div>
            </button>
          )}
          {canKas && (
            <button
              type="button"
              onClick={() => navigate("/cash-register/current")}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-left hover:bg-accent hover:shadow-sm transition-all group">
              <Wallet size={18} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {t("page.dashboardUser.ui.cashRegister")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("page.dashboardUser.ui.openCloseYourRegister")}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Ringkasan penjualan — hanya jika accessMenu punya "dashboard" */}
      {canSales && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("page.dashboardUser.ui.storeSalesToday")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {storeName || summary?.storeInfo?.name || ""} • {todayLong()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={summaryLoading}
              onClick={() => {
                refetchShift();
                refetchKas();
                if (canSales) refetchSummary();
              }}>
              <RefreshCcw size={14} className="mr-1.5" />
              {t("page.dashboard.refresh")}
            </Button>
          </div>

          {summaryLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label={t("page.dashboard.stats.totalSales")}
                  value={fmtCurrency(totalSales)}
                  icon={TrendingUp}
                  variant="default"
                />
                <StatCard
                  label={t("sidebar.transaksi")}
                  value={totalOrders}
                  icon={Receipt}
                  variant="active"
                />
                <StatCard
                  label={t("page.dashboardUser.ui.averageTransaction")}
                  value={fmtCurrency(averageOrderValue)}
                  icon={ShoppingCart}
                  variant="blue"
                />
                <StatCard
                  label={t("page.dashboardUser.ui.targetProgress")}
                  value={`${targetProgress}%`}
                  icon={Target}
                  variant={targetProgress >= 100 ? "active" : "gold"}
                />
              </div>

              {dailyTarget > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>
                      {t("page.dashboardUser.ui.todaySTarget")} {fmtCurrency(dailyTarget)}
                    </span>
                    <span className="font-semibold text-foreground">
                      {fmtCurrency(totalSales)} ({targetProgress}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                      style={{ width: `${targetProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {bestSellers.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-bold text-foreground mb-2">
                    {t("page.dashboardUser.ui.todaySBestSellers")}
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bestSellers.slice(0, 4).map((b) => (
                      <li
                        key={b.productId || safeGet(b, "productName")}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
                        <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                          {b.productName || "Produk"}
                        </span>
                        <span className="shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5">
                          {b.quantity || 0} terjual
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <AttendanceModal
        open={!!attendanceType}
        onOpenChange={(v) => {
          if (!v) setAttendanceType(null);
        }}
        type={attendanceType || "check-in"}
        storeId={storeId}
        storeName={user?.storeName || ""}
        shiftId={todayShift?.id}
        shiftName={todayShift?.nama_shift}
        onSuccess={() => refetchAttendance()}
      />

      <SwapShiftModal
        open={swapModalOpen}
        onOpenChange={setSwapModalOpen}
        storeId={storeId}
        currentUserId={currentUserId}
        swappableShifts={swappableShifts}
        allShifts={myShifts}
        initialShift={null}
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
            queryClient.setQueryData(["dashboard-user-swaps", storeId], (old) => {
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
    </div>
  );
};

export default DashboardUser;

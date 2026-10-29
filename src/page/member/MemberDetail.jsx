import React, { useState } from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMemberById, getMemberPointHistory } from "@/services/member";
import { getAllMemberTier } from "@/services/member-tier";
import { Button } from "@/components/ui/button";
import {
  Stars,
  Users,
  Edit3,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Trophy,
  BellRing,
  ReceiptText,
  ChevronLeft,
  CheckCircle,
  Star,
  ShoppingBag,
  Banknote,
  TrendingUp,
  Minus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { dateLocale } from "@/lib/locale";

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const avatarBg = (name) => {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700"
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const MemberDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactionPage, setTransactionPage] = useState(1);
  const [pointPage, setPointPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery(
    ["member-detail", id, transactionPage],
    () => getMemberById({ id, page: transactionPage, limit: 5 }),
    {
      enabled: !!id
    }
  );

  const { data: tierData } = useQuery(["member-tiers"], () => getAllMemberTier(), {});

  const { data: pointData, isLoading: pointLoading } = useQuery(
    ["member-point-history", id, pointPage],
    () => getMemberPointHistory({ id, page: pointPage }),
    { enabled: !!id }
  );

  const member = data?.data || data?.member || data;
  const tiers = tierData?.data || [];
  const currentTier = tiers.find((t) => t.id === member?.tier) || {};
  const level = {
    bg: "bg-primary/10 text-primary border border-primary/20",
    label: currentTier.name || t("page.member.detail.levelSilver"),
    color: currentTier.color || "#f59e0b"
  };

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-8 w-56" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col items-center">
              <Skeleton className="w-24 h-24 rounded-full mb-4" />
              <Skeleton className="h-6 w-36 mb-2" />
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-5 w-28 rounded-full mb-4" />
              <div className="w-full space-y-4 border-t border-border pt-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex flex-col space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="bg-foreground p-4">
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm">
              <div className="p-4 border-b border-border flex justify-between">
                <Skeleton className="h-8 w-32 rounded" />
                <Skeleton className="h-8 w-28 rounded" />
              </div>
              <HorizontalScrollArea>
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      {[...Array(6)].map((_, i) => (
                        <th key={i} className="px-4 py-3">
                          <Skeleton className="h-3 w-20" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...Array(5)].map((_, r) => (
                      <tr key={r}>
                        {[...Array(6)].map((_, c) => (
                          <td key={c} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <Users size={48} />
        <p>{t("page.cashier.modal.memberNotFound")}</p>
        <Button variant="danger" onClick={() => navigate("/member-list")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const name = member.name || "-";
  const transactions = member.transactions || [];
  const totalTransactions = member.transactionPagination?.total || transactions.length || 0;
  const totalSpent = member.totalSpent || 0;
  const count = totalTransactions;
  const visitFrequency = count;
  const averageSpending = count > 0 ? totalSpent / count : 0;
  const points = member.points ?? member.totalPoints ?? 0;
  const sortedTiers = [...tiers]
    .filter((t) => t.status === "active")
    .sort((a, b) => a.minPoints - b.minPoints);
  const nextTierObj = sortedTiers.find((t) => t.id !== member?.tier && t.minPoints > points);
  const nextTier = nextTierObj?.name || "-";
  const pointsRemaining = nextTierObj ? Math.max(0, nextTierObj.minPoints - points) : 0;
  const expiringPoints = member.expiringPoints || 1200;
  const expiringDate = member.expiringDate || "31 Dec 2023";
  const memberId = member.memberId || member.code || "-";
  const phone = member.phone || member.phoneNumber || "-";
  const email = member.email || "-";
  const address = member.address || "-";
  const joinDate = member.joinDate || member.createdAt || "-";
  const formattedJoinDate =
    joinDate !== "-"
      ? new Date(joinDate).toLocaleDateString(dateLocale(), {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      : "-";

  const stats = [
    {
      label: t("page.member.detail.totalTransactions"),
      value: `${totalTransactions}`,
      IconComponent: ReceiptText,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      trend: `${totalSpent > 0 ? formatCurrency(totalSpent) : "Rp 0"} total belanja`,
      TrendIconComponent: Banknote,
      trendColor: "text-foreground"
    },
    {
      label: t("page.member.detail.visitFrequency"),
      value: `${visitFrequency} kali`,
      IconComponent: Calendar,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-700",
      trend: "",
      TrendIconComponent: TrendingUp,
      trendColor: "text-foreground"
    },
    {
      label: t("page.member.detail.averageSpending"),
      value: formatCurrency(averageSpending),
      IconComponent: ShoppingBag,
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
      trend: "",
      TrendIconComponent: Minus,
      trendColor: "text-foreground"
    }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.member"), href: "/member-list", i18nKey: "breadcrumb.member" },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : name}
        description={t("page.member.ui.memberDetails")}
        backLink="/member-list"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate(`/edit-member?id=${id}`)}>
            <Edit3 size={14} className="mr-1.5" />
            {t("common.edit")}
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 flex flex-col items-center">
            <div className="relative mb-4">
              <div
                className={`w-24 h-24 rounded-full border-4 border-background shadow-md ${avatarBg(name)} flex items-center justify-center text-2xl font-bold`}>
                {getInitials(name)}
              </div>
              <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1 border-2 border-card">
                <CheckCircle size={14} className="text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground text-center">{name}</h3>
            <p className="text-sm font-mono text-muted-foreground mb-3">{memberId}</p>
            <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold mb-4">
              {t("page.member.detail.memberActive")}
            </span>
            <div className="w-full space-y-4 border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-muted-foreground text-base" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {t("page.member.detail.joinedDate")}
                  </span>
                  <span className="text-sm font-medium">{formattedJoinDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-muted-foreground text-base" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {t("page.member.detail.emailAddress")}
                  </span>
                  <span className="text-sm font-medium">{email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-muted-foreground text-base" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {t("page.member.detail.phoneNumber")}
                  </span>
                  <span className="text-sm font-medium">{phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-muted-foreground text-base" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {t("page.member.detail.address")}
                  </span>
                  <span className="text-sm font-medium">{address}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="bg-foreground text-background p-4 flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-background" />
                <span className="text-sm font-semibold">
                  {t("page.member.detail.membershipStatus")}
                </span>
              </div>
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: level.color + "20",
                  color: level.color,
                  borderColor: level.color + "40",
                  borderWidth: 1
                }}>
                <Star size={14} />
                {level.label}
              </span>
            </div>
            <div className="p-3 sm:p-4 space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {t("page.member.detail.totalPoints")}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {points.toLocaleString()} {t("page.member.ui.pts")}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${Math.min(80, (points / (points + pointsRemaining)) * 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("page.member.detail.nextTier", {
                    tier: nextTier,
                    points: pointsRemaining.toLocaleString()
                  })}
                </p>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex items-center gap-3">
                <BellRing size={18} className="text-destructive text-base" />
                <div>
                  <p className="text-xs font-bold text-destructive">
                    {t("page.member.detail.pointsExpiringSoon")}
                  </p>
                  <p className="text-xs text-destructive">
                    {t("page.member.detail.pointsExpireOn", {
                      count: expiringPoints.toLocaleString(),
                      date: expiringDate
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => {
              const StatIcon = stat.IconComponent;
              const TrendIcon = stat.TrendIconComponent;
              return (
                <div
                  key={stat.label}
                  className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <span className="text-xs font-semibold text-muted-foreground block mb-3">
                    {stat.label}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-foreground">{stat.value}</span>
                    <div className={`${stat.iconBg} ${stat.iconColor} p-2 rounded-lg`}>
                      {StatIcon && <StatIcon size={18} />}
                    </div>
                  </div>
                  {stat.trend && (
                    <div className="mt-3 flex items-center">
                      {TrendIcon && <TrendIcon size={14} className={`mr-1 ${stat.trendColor}`} />}
                      <span className={`text-xs font-semibold ${stat.trendColor}`}>
                        {stat.trend}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="flex border-b border-border overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("transactions")}
                className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === "transactions"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}>
                {t("page.cashRegister.detail.transactionHistory")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("points")}
                className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === "points"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}>
                {t("page.member.pointHistory.pointActivity")}
              </button>
            </div>

            {activeTab === "transactions" && (
              <HorizontalScrollArea>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("page.member.detail.tableTransactionId")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("page.member.detail.tableDate")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("page.member.detail.tableStore")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                        {t("page.member.detail.tableTotalAmount")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                        {t("page.member.detail.tableStatus")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                          <ReceiptText size={36} className="text-4xl block mb-2" />
                          {t("page.member.pointHistory.noTransaction")}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((trx, idx) => (
                        <tr key={trx.id || idx} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-foreground">
                            {trx.code || trx.invoice || `#TRX-${idx.toString().padStart(8, "0")}`}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {trx.date
                              ? new Date(trx.date).toLocaleDateString(dateLocale(), {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })
                              : "-"}
                            {trx.time && (
                              <>
                                , <span className="text-xs">{trx.time}</span>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {trx.store || trx.storeName || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-foreground text-right">
                            {formatCurrency(trx.amount || trx.total || 0)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2.5 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full">
                              {trx.status || t("common.completed")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            )}

            {activeTab === "points" && (
              <>
                <HorizontalScrollArea>
                  {pointLoading ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border">
                          {[
                            t("page.member.detail.pointHistoryTable.date"),
                            t("page.member.detail.pointHistoryTable.description"),
                            t("page.member.detail.pointHistoryTable.points"),
                            t("page.member.detail.pointHistoryTable.balance")
                          ].map((_, i) => (
                            <th key={i} className="px-4 py-3">
                              <Skeleton className="h-3 w-16" />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...Array(4)].map((_, r) => (
                          <tr key={r}>
                            {[...Array(4)].map((_, c) => (
                              <td key={c} className="px-4 py-3">
                                <Skeleton className="h-4 w-full" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border">
                          <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("page.member.detail.pointHistoryTable.date")}
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("page.member.detail.pointHistoryTable.description")}
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                            {t("page.member.detail.pointHistoryTable.points")}
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                            {t("page.member.detail.pointHistoryTable.balance")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(pointData?.data || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-12 text-center text-muted-foreground">
                              <Stars size={36} className="mx-auto mb-2 opacity-30" />
                              <p className="text-sm">
                                {t("page.member.detail.pointHistoryTable.empty")}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          (pointData?.data || []).map((pt, idx) => (
                            <tr key={pt.id || idx} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {pt.date || pt.createdAt
                                  ? new Date(pt.date || pt.createdAt).toLocaleDateString(
                                      dateLocale(),
                                      {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric"
                                      }
                                    )
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {pt.notes || pt.description || pt.reason || "-"}
                              </td>
                              <td
                                className={`px-4 py-3 text-sm font-bold text-right ${(pt.pointsChange || pt.points) > 0 ? "text-green-600" : "text-red-600"}`}>
                                {(pt.pointsChange || pt.points) > 0 ? "+" : ""}
                                {(pt.pointsChange || pt.points)?.toLocaleString() || 0}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-right text-foreground">
                                {(pt.pointsAfter || pt.balance)?.toLocaleString() || "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </HorizontalScrollArea>
                <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    {t("page.member.ui.showing")} {(pointData?.data || []).length} dari{" "}
                    {pointData?.pagination?.total || pointData?.total || 0}{" "}
                    {t("page.member.ui.pointActivities")}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label={t("common.previousPage")}
                      onClick={() => setPointPage(Math.max(1, pointPage - 1))}
                      disabled={pointPage <= 1}
                      className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
                      <ChevronLeft size={20} className="text-lg" />
                    </button>
                    <span
                      aria-current="page"
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">
                      {pointPage}
                    </span>
                    <button
                      type="button"
                      aria-label={t("common.nextPage")}
                      onClick={() => setPointPage(pointPage + 1)}
                      disabled={pointPage >= (pointData?.pagination?.totalPages || 1)}
                      className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
                      <ChevronRight size={20} className="text-lg" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "transactions" && (
              <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {t("page.member.ui.showing")} {transactions.length} dari{" "}
                  {member?.transactionPagination?.total || 0} transaksi
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={t("common.previousPage")}
                    onClick={() => setTransactionPage(Math.max(1, transactionPage - 1))}
                    disabled={transactionPage <= 1}
                    className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
                    <ChevronLeft size={20} className="text-lg" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("common.nextPage")}
                    onClick={() => setTransactionPage(transactionPage + 1)}
                    disabled={transactionPage >= (member?.transactionPagination?.totalPages || 1)}
                    className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
                    <ChevronRight size={20} className="text-lg" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetail;

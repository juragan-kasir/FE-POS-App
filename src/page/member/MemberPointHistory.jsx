import React, { useState } from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMemberById, getMemberPointHistory } from "@/services/member";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import AbortController from "@/components/organism/abort-controller";
import { Receipt, Users, ReceiptText, Star } from "lucide-react";
import TableActionLegend from "@/components/ui/TableActionLegend";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const MemberPointHistory = () => {
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

  const { data: pointData, isLoading: pointLoading } = useQuery(
    ["member-point-history", id, pointPage],
    () => getMemberPointHistory({ id, page: pointPage }),
    { enabled: !!id }
  );

  const member = data?.data || data?.member || data;
  const transactions = member?.transactions || [];
  const name = member?.name || "-";
  const points = member?.points ?? member?.totalPoints ?? 0;

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <Users size={48} className="text-5xl" />
        <p>{t("page.cashier.modal.memberNotFound")}</p>
        <Button variant="danger" onClick={() => navigate("/member-list")}>
          {t("page.member.pointHistory.back")}
        </Button>
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
          {
            label: t("page.member.pointHistory.backToList"),
            href: "/member-list",
            i18nKey: "page.member.pointHistory.backToList"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={name}
        description={`Total Poin: ${points.toLocaleString()}`}
        backLink="/member-list"
        dynamicInfo={false}
      />

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex border-b border-border px-4">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "transactions"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}>
            {t("page.member.pointHistory.transactionHistory")}
          </button>
          <button
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
                    {t("page.member.pointHistory.transactionId")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.member.pointHistory.date")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.member.pointHistory.store")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    {t("page.member.pointHistory.totalAmount")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    {t("page.member.pointHistory.status")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    {t("page.member.pointHistory.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
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
                          ? new Date(trx.date).toLocaleDateString("id-ID", {
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
                      <td className="px-4 py-3 text-center">
                        <button className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-all">
                          <Receipt size={20} className="text-lg" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border flex justify-between items-center bg-muted/10">
              <p className="text-xs text-muted-foreground">
                {t("page.member.ui.showing")} {transactions.length} dari{" "}
                {member?.transactionPagination?.total || 0} transaksi
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setTransactionPage(Math.max(1, transactionPage - 1))}
                  disabled={transactionPage <= 1}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {t("page.member.pointHistory.previous")}
                </button>
                <button
                  onClick={() => setTransactionPage(transactionPage + 1)}
                  disabled={transactionPage >= (member?.transactionPagination?.totalPages || 1)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {t("page.member.pointHistory.next")}
                </button>
              </div>
            </div>
          </HorizontalScrollArea>
        )}

        {activeTab === "points" && (
          <HorizontalScrollArea>
            {pointLoading ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {[
                      t("page.member.pointHistory.date"),
                      t("page.member.pointHistory.description"),
                      t("page.member.pointHistory.points"),
                      t("page.member.pointHistory.balance")
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
                      {t("page.member.pointHistory.date")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.member.pointHistory.description")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                      {t("page.member.pointHistory.points")}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                      {t("page.member.pointHistory.balance")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(pointData?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        <Star size={36} className="text-4xl block mb-2" />
                        <p className="text-sm">{t("page.member.pointHistory.noActivity")}</p>
                      </td>
                    </tr>
                  ) : (
                    (pointData?.data || []).map((pt, idx) => (
                      <tr key={pt.id || idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pt.date || pt.createdAt
                            ? new Date(pt.date || pt.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })
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
            <div className="px-4 py-3 border-t border-border flex justify-between items-center bg-muted/10">
              <p className="text-xs text-muted-foreground">
                {t("page.member.ui.showing")} {(pointData?.data || []).length} dari{" "}
                {pointData?.pagination?.total || pointData?.total || 0}{" "}
                {t("page.member.ui.pointActivities")}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPointPage(Math.max(1, pointPage - 1))}
                  disabled={pointPage <= 1}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {t("page.member.pointHistory.previous")}
                </button>
                <button
                  onClick={() => setPointPage(pointPage + 1)}
                  disabled={pointPage >= (pointData?.pagination?.totalPages || 1)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {t("page.member.pointHistory.next")}
                </button>
              </div>
            </div>
          </HorizontalScrollArea>
        )}
      </div>

      <TableActionLegend className="mt-4" items={[{ icon: Receipt, label: t("common.view") }]} />
    </div>
  );
};

export default MemberPointHistory;

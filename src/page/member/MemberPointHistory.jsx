import React, { useState } from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMemberById, getMemberPointHistory } from "@/services/member";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import AbortController from "@/components/organism/abort-controller";
import { Users, ReceiptText, Star } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const MemberPointHistory = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactionPage, setTransactionPage] = useState(1);
  const [pointPage, setPointPage] = useState(1);

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["member-detail", id, transactionPage],
    () => getMemberById({ id, page: transactionPage, limit: 5 }),
    {
      enabled: !!id
    }
  );

  const {
    data: pointData,
    isLoading: pointLoading,
    isError: pointError,
    refetch: refetchPoints
  } = useQuery(
    ["member-point-history", id, pointPage],
    () => getMemberPointHistory({ id, page: pointPage }),
    { enabled: !!id }
  );

  const member = data?.data || data?.member || data;
  const transactions = member?.transactions || [];
  const name = member?.name || "-";
  const points = member?.points ?? member?.totalPoints ?? 0;

  const locale = i18n.language === "en" ? "en-US" : "id-ID";
  const shortDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      : "-";

  const transactionColumns = [
    {
      header: t("page.member.pointHistory.transactionId"),
      render: (trx, idx) => (
        <span className="font-mono text-foreground">
          {trx.code || trx.invoice || `#TRX-${idx.toString().padStart(8, "0")}`}
        </span>
      )
    },
    {
      header: t("page.member.pointHistory.date"),
      render: (trx) => (
        <span className="text-muted-foreground">
          {shortDate(trx.date)}
          {trx.time && <span className="text-xs">, {trx.time}</span>}
        </span>
      )
    },
    {
      header: t("page.member.pointHistory.store"),
      render: (trx) => (
        <span className="text-muted-foreground">{trx.store || trx.storeName || "-"}</span>
      )
    },
    {
      header: t("page.member.pointHistory.totalAmount"),
      align: "right",
      render: (trx) => (
        <span className="font-bold text-foreground">
          {formatCurrency(trx.amount || trx.total || 0)}
        </span>
      )
    },
    {
      header: t("page.member.pointHistory.status"),
      align: "center",
      render: (trx) => (
        <span className="px-2.5 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full">
          {trx.status || t("common.completed")}
        </span>
      )
    }
  ];

  const pointColumns = [
    {
      header: t("page.member.pointHistory.date"),
      render: (pt) => (
        <span className="text-muted-foreground">{shortDate(pt.date || pt.createdAt)}</span>
      )
    },
    {
      header: t("page.member.pointHistory.description"),
      render: (pt) => pt.notes || pt.description || pt.reason || "-"
    },
    {
      header: t("page.member.pointHistory.points"),
      align: "right",
      render: (pt) => {
        const change = pt.pointsChange || pt.points;
        return (
          <span className={`font-bold ${change > 0 ? "text-green-600" : "text-red-600"}`}>
            {change > 0 ? "+" : ""}
            {change?.toLocaleString() || 0}
          </span>
        );
      }
    },
    {
      header: t("page.member.pointHistory.balance"),
      align: "right",
      render: (pt) => (
        <span className="font-semibold text-foreground">
          {(pt.pointsAfter || pt.balance)?.toLocaleString() || "-"}
        </span>
      )
    }
  ];

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
        description={t("page.member.pointHistory.totalPoints", { points: points.toLocaleString() })}
        backLink="/member-list"
        dynamicInfo={false}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transactions">
            {t("page.member.pointHistory.transactionHistory")}
          </TabsTrigger>
          <TabsTrigger value="points">{t("page.member.pointHistory.pointActivity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <DataTable
            columns={transactionColumns}
            data={transactions}
            isLoading={isFetching}
            rowKey={(trx) => trx.id || trx.code}
            emptyIcon={ReceiptText}
            emptyMessage={t("page.member.pointHistory.noTransaction")}
            pagination={{
              page: transactionPage,
              totalPages: member?.transactionPagination?.totalPages || 1,
              total: member?.transactionPagination?.total || transactions.length,
              pageSize: 5,
              onPageChange: setTransactionPage
            }}
          />
        </TabsContent>

        <TabsContent value="points">
          <DataTable
            columns={pointColumns}
            data={pointData?.data || []}
            isLoading={pointLoading}
            isError={pointError}
            onRetry={refetchPoints}
            rowKey={(pt) => pt.id || pt.createdAt}
            emptyIcon={Star}
            emptyMessage={t("page.member.pointHistory.noActivity")}
            pagination={{
              page: pointPage,
              totalPages: pointData?.pagination?.totalPages || 1,
              total: pointData?.pagination?.total || pointData?.total || 0,
              onPageChange: setPointPage
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemberPointHistory;

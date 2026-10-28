import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { safeGet } from "@/lib/safe-lookup";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import NoStore from "@/components/ui/NoStore";
import { Receipt, Wallet, Building2, CheckCircle, XCircle, FileEdit, Clock3 } from "lucide-react";
import StoreFilter from "@/components/ui/StoreFilter";
import { getARList, getARAging, recordARPayment } from "@/services/accounts-receivable";
import { newPurchasePaymentKey } from "@/utils/paymentIdempotency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/DataTable";
import { TipsCard } from "@/components/ui/tips-card";
import Modal from "@/components/organism/modal";
import { toast } from "sonner";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const STATUS_LABELS = {
  UNPAID: { label: "Belum Dibayar", color: "bg-yellow-100 text-yellow-800" },
  PARTIAL: { label: "Sebagian", color: "bg-blue-100 text-blue-800" },
  PAID: { label: "Lunas", color: "bg-green-100 text-green-800" },
  OVERDUE: { label: "Jatuh Tempo", color: "bg-red-100 text-red-800" }
};

const statusLabelKeys = { UNPAID: "unpaid", PARTIAL: "partial", PAID: "paid", OVERDUE: "overdue" };

const AccountsReceivableList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  // F-IDEM-1-style dedup: one stable reference per payment attempt (opened
  // when the modal opens, reused across retries within that attempt, never
  // reused for a later, unrelated payment) — see recordARPayment's BE
  // contract, which dedupes on (arId, reference).
  const [payReference, setPayReference] = useState("");

  const { data: locData, isLoading: isLoadingLocations } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["ar-list", page, limit, statusFilter, storeFilter],
    () =>
      getARList({
        page,
        limit,
        status: statusFilter || undefined,
        store: isSuperAdmin
          ? storeFilter && storeFilter !== "all"
            ? storeFilter
            : ""
          : user?.store
      }),
    { keepPreviousData: true }
  );

  const { data: agingData } = useQuery(["ar-aging"], () => getARAging(), {
    refetchInterval: 60000
  });

  const payMutation = useMutation(({ id, payload }) => recordARPayment(id, payload), {
    onSuccess: () => {
      toast.success(t("page.accountsReceivable.list.toast.paymentSuccess"));
      setPayModal(null);
      setPayAmount("");
      setPayReference("");
      refetch();
    },
    onError: (err) =>
      toast.error(err?.message || t("page.accountsReceivable.list.toast.paymentError"))
  });

  const arList = data?.data || [];
  const pagination = data?.pagination || {};
  const agingBuckets = agingData?.data?.buckets || {};
  const grandTotal = agingData?.data?.grandTotal || 0;

  const columns = [
    {
      header: t("page.accountsReceivable.list.header.invoice"),
      render: (ar) => (
        <span
          className="font-medium text-primary cursor-pointer hover:underline"
          onClick={() => navigate(`/accounts-receivable/detail?id=${ar.id}`)}>
          {ar.invoiceNo || `AR-${ar.id}`}
        </span>
      )
    },
    {
      header: t("page.accountsReceivable.list.header.pelanggan"),
      render: (ar) => ar.customerName || ar.orderData?.customerName || "-"
    },
    {
      header: t("page.accountsReceivable.list.header.total"),
      render: (ar) => formatCurrencyRupiah(ar.totalAmount || 0)
    },
    {
      header: t("page.accountsReceivable.list.header.terbayar"),
      render: (ar) => formatCurrencyRupiah(ar.paidAmount || 0)
    },
    {
      header: t("page.accountsReceivable.list.header.sisa"),
      render: (ar) => (
        <span className="font-semibold">{formatCurrencyRupiah(ar.outstandingAmount || 0)}</span>
      )
    },
    {
      header: t("page.accountsReceivable.list.header.jatuhTempo"),
      render: (ar) =>
        ar.dueDate
          ? new Date(ar.dueDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })
          : "-"
    },
    {
      header: t("page.accountsReceivable.list.header.status"),
      render: (ar) => {
        const rawStatus =
          ar.status === "OVERDUE" || (ar.status !== "PAID" && ar.overdueDays > 0)
            ? "OVERDUE"
            : ar.status || "UNPAID";
        const st = safeGet(STATUS_LABELS, rawStatus, STATUS_LABELS.UNPAID);
        return (
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${st.color}`}>
            {t(
              `page.accountsReceivable.list.status.${safeGet(statusLabelKeys, rawStatus) || rawStatus.toLowerCase()}`
            )}
            {ar.overdueDays > 0 && ` (+${ar.overdueDays}h)`}
          </span>
        );
      }
    },
    {
      header: t("page.accountsReceivable.list.header.aksi"),
      legend: [{ icon: Wallet, label: t("page.accountsReceivable.list.payButton") }],
      render: (ar) =>
        ar.status !== "PAID" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPayModal(ar);
              setPayAmount(String(ar.outstandingAmount || 0));
              setPayReference(newPurchasePaymentKey());
            }}>
            <Wallet size={14} className="mr-1" /> {t("page.accountsReceivable.list.payButton")}
          </Button>
        )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.accountsReceivable.list.breadcrumb") }
        ]}
        title={t("page.accountsReceivable.list.title")}
        description={t("page.accountsReceivable.list.subtitle")}
      />

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isFetching || isLoading ? (
            <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                  <Skeleton className="h-8 w-28 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1">
                <StatCard
                  label={t("page.accountsReceivable.list.totalPiutang")}
                  value={formatCurrencyRupiah(grandTotal)}
                  icon={Building2}
                  variant="default"
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(agingBuckets).map(([key, bucket]) => {
                  const lk = key.toLowerCase();
                  const icon = lk.includes("paid")
                    ? CheckCircle
                    : lk.includes("overdue")
                      ? XCircle
                      : lk.includes("unpaid")
                        ? FileEdit
                        : lk.includes("partial")
                          ? Clock3
                          : Building2;
                  const variant = lk.includes("paid")
                    ? "active"
                    : lk.includes("overdue")
                      ? "inactive"
                      : lk.includes("unpaid")
                        ? "draft"
                        : "default";
                  return (
                    <StatCard
                      key={key}
                      label={bucket.label}
                      value={formatCurrencyRupiah(bucket.total)}
                      icon={icon}
                      variant={variant}
                    />
                  );
                })}
              </div>
            </>
          )}

          {isSuperAdmin &&
            (isLoadingLocations || isLoading || isFetching ? (
              <Skeleton className="h-9 w-48 rounded-md" />
            ) : (
              <StoreFilter
                locations={locData?.data || locData?.locations || []}
                value={storeFilter}
                onChange={(v) => {
                  setGlobalStoreFilter(v);
                  setPage(1);
                }}
              />
            ))}

          <div className="flex items-center gap-2">
            {["", "UNPAID", "PARTIAL", "PAID", "OVERDUE"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}>
                {s
                  ? t(`page.accountsReceivable.list.status.${safeGet(statusLabelKeys, s) || s}`)
                  : t("page.accountsReceivable.list.filterAll")}
              </button>
            ))}
          </div>

          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div>
              <DataTable
                columns={columns}
                data={arList}
                isLoading={isLoading || isFetching}
                emptyMessage={t("page.accountsReceivable.list.emptyMessage")}
                emptyIcon={Receipt}
                pagination={{
                  page,
                  totalPages: pagination.totalPages || 1,
                  total: pagination.total || 0,
                  onPageChange: setPage,
                  pageSize: limit,
                  onPageSizeChange: (v) => {
                    setLimit(v);
                    setPage(1);
                  }
                }}
              />
            </div>
          )}

          {payModal && (
            <Modal
              open={!!payModal}
              onOpenChange={() => {
                setPayModal(null);
                setPayAmount("");
                setPayReference("");
              }}
              title={t("page.accountsReceivable.list.modal.title")}
              description={`${t("page.accountsReceivable.list.modal.invoice")}: ${payModal.invoiceNo} | ${t("page.accountsReceivable.list.modal.sisa")}: ${formatCurrencyRupiah(payModal.outstandingAmount)}`}
              confirmText={t("page.accountsReceivable.list.modal.confirm")}
              onConfirm={() => {
                if (!payAmount || Number(payAmount) <= 0) {
                  toast.error(t("page.accountsReceivable.list.validation.noAmount"));
                  return;
                }
                if (Number(payAmount) > Number(payModal.outstandingAmount)) {
                  toast.error(t("page.accountsReceivable.list.validation.exceedsAmount"));
                  return;
                }
                payMutation.mutate({
                  id: payModal.id,
                  payload: { amount: payAmount, reference: payReference }
                });
              }}
              loading={payMutation.isLoading}>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="accounts-receivable-list-amount-label"
                    className="text-sm font-medium">
                    {t("page.accountsReceivable.list.modal.amountLabel")}
                  </label>
                  <Input
                    id="accounts-receivable-list-amount-label"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={t("page.accountsReceivable.list.modal.amountPlaceholder")}
                  />
                </div>
              </div>
            </Modal>
          )}

          <div>
            <TipsCard
              tips={[
                t("page.accountsReceivable.list.tips.1"),
                t("page.accountsReceivable.list.tips.2"),
                t("page.accountsReceivable.list.tips.3"),
                t("page.accountsReceivable.list.tips.4")
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AccountsReceivableList;

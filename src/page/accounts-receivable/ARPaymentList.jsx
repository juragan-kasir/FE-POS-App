import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useQuery, useMutation } from "react-query";
import { useTranslation } from "react-i18next";
import { Receipt, Wallet, Building2, CheckCircle, XCircle, FileEdit, Clock3 } from "lucide-react";
import { getARList, getARAging, recordARPayment } from "@/services/accounts-receivable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/organism/modal";
import { toast } from "sonner";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import i18next from "i18next";

const STATUS_LABELS = {
  UNPAID: {
    get label() {
      return i18next.t("page.accountsReceivable.list.status.unpaid");
    },
    color: "bg-yellow-100 text-yellow-800"
  },
  PARTIAL: {
    get label() {
      return i18next.t("page.supplier.detail.status.ordered");
    },
    color: "bg-blue-100 text-blue-800"
  },
  PAID: {
    get label() {
      return i18next.t("page.expense.list.statusPaid");
    },
    color: "bg-green-100 text-green-800"
  },
  OVERDUE: {
    get label() {
      return i18next.t("page.apDashboard.po.dueDate");
    },
    color: "bg-red-100 text-red-800"
  }
};
const statusLabelKeys = { UNPAID: "unpaid", PARTIAL: "partial", PAID: "paid", OVERDUE: "overdue" };

const ARPaymentList = () => {
  const { t } = useTranslation();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState("UNPAID");
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const { data, isLoading, isError, refetch } = useQuery(
    ["ar-payment-list", page, limit, statusFilter],
    () => getARList({ page, limit, status: statusFilter || undefined }),
    { keepPreviousData: true }
  );

  const { data: agingData } = useQuery(["ar-aging-payment"], () => getARAging(), {
    refetchInterval: 60000
  });

  const payMutation = useMutation(({ id, payload }) => recordARPayment(id, payload), {
    onSuccess: () => {
      toast.success(t("page.accountsReceivable.list.toast.paymentSuccess"));
      setPayModal(null);
      setPayAmount("");
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
      render: (ar) => <span className="font-medium">{ar.invoiceNo || `AR-${ar.id}`}</span>
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
            onClick={() => {
              setPayModal(ar);
              setPayAmount(String(ar.outstandingAmount || 0));
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
          { label: t("page.accountsReceivable.payment.title") }
        ]}
        title={t("page.accountsReceivable.payment.title")}
        description={t("page.accountsReceivable.payment.description")}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={t("page.accountsReceivable.totalReceivable")}
          value={formatCurrencyRupiah(grandTotal)}
          icon={Building2}
          variant="default"
        />
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

      <div className="flex items-center gap-2">
        {["", "UNPAID", "PARTIAL", "OVERDUE"].map((s, idx) => (
          <button
            key={idx}
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
        <DataTable
          columns={columns}
          data={arList}
          isLoading={isLoading}
          emptyMessage={t("page.accountsReceivable.ui.noReceivablesToPay")}
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
      )}

      {payModal && (
        <Modal
          open={!!payModal}
          onOpenChange={() => {
            setPayModal(null);
            setPayAmount("");
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
            payMutation.mutate({ id: payModal.id, payload: { amount: payAmount } });
          }}
          loading={payMutation.isLoading}>
          <div className="space-y-3">
            <div>
              <label htmlFor="arpayment-list-amount-label" className="text-sm font-medium">
                {t("page.accountsReceivable.list.modal.amountLabel")}
              </label>
              <Input
                id="arpayment-list-amount-label"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={t("page.accountsReceivable.list.modal.amountPlaceholder")}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ARPaymentList;

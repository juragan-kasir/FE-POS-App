import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  Tag,
  User,
  Calendar,
  FileText,
  CreditCard,
  Receipt,
  Edit3,
  Wallet,
  BadgeCheck,
  Building2,
  MapPin,
  Hash,
  CircleDollarSign,
  History,
  XCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getExpenseById, markExpensePaid, markExpenseUnpaid } from "@/services/expense";
import { getEmployeeById } from "@/services/employee";
import { parseSalary } from "@/lib/utils";
import { todayDateOnly } from "@/utils/dateOnly";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import AbortController from "@/components/organism/abort-controller";
import Modal from "@/components/organism/modal";
import PageHeader from "@/components/ui/PageHeader";
import { isSalaryCategoryName } from "@/lib/salary-category";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const statusBadge = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
};

const getStatusLabel = (t) => ({
  draft: t("page.expense.detail.statusDraft"),
  pending: t("page.expense.detail.statusPending"),
  approved: t("page.expense.detail.statusApproved"),
  rejected: t("page.expense.detail.statusRejected")
});

const fmtDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

const fmtRp = (val) => {
  const n = parseSalary(val);
  return n > 0 ? `Rp ${n.toLocaleString("id-ID")}` : "-";
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
      <Icon size={14} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground truncate">{value || "-"}</p>
    </div>
  </div>
);

const DetailExpense = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [paidModal, setPaidModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: "",
    paymentMethod: "cash",
    note: ""
  });

  const { data, isLoading, isError, refetch } = useQuery(
    ["expense", id],
    () => getExpenseById(id),
    { enabled: !!id }
  );

  const item = data?.data;

  const paidMutation = useMutation(
    ({ expenseId, payload }) => markExpensePaid(expenseId, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["expense", id]);
        toast.success(t("page.expense.detail.toast.paidSuccess"), {
          description: t("page.expense.detail.toast.paidDescription")
        });
      },
      onError: (err) => {
        toast.error(t("page.expense.list.toast.error"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  const unpaidMutation = useMutation(markExpenseUnpaid, {
    onSuccess: () => {
      queryClient.invalidateQueries(["expense", id]);
      toast.success(t("page.expense.detail.toast.unpaidSuccess"), {
        description: t("page.expense.detail.toast.unpaidDescription")
      });
    },
    onError: (err) => {
      toast.error(t("page.expense.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const openPaidModal = () => {
    setPaymentForm({
      paymentDate: todayDateOnly(),
      paymentMethod: item?.paymentMethod || "cash",
      note: ""
    });
    setPaidModal(true);
  };

  const handleMarkPaid = () => {
    paidMutation.mutate({
      expenseId: id,
      payload: {
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod || item?.paymentMethod || "cash",
        note: paymentForm.note || null
      }
    });
  };

  const { data: employeeData, isLoading: employeeLoading } = useQuery(
    ["expense-employee-detail", item?.employeeId],
    () => getEmployeeById({ id: item.employeeId }),
    { enabled: !!item?.employeeId }
  );
  const employeeDetail = employeeData?.data;
  const isSalary = isSalaryCategoryName(item?.categoryData?.name);

  if (isError) return <AbortController refetch={refetch} />;

  return (
    <div>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            { label: t("breadcrumb.expense"), href: "/expense", i18nKey: "breadcrumb.expense" },
            { label: t("breadcrumb.detail") }
          ]}
          title={
            isLoading
              ? t("common.loading")
              : item?.description || t("page.expense.detail.fallbackTitle")
          }
          description={
            item?.expenseNumber ? `${item.expenseNumber} — ${fmtDate(item?.date)}` : undefined
          }
          backLink="/expense"
          dynamicInfo={false}>
          {!isLoading && (
            <Button variant="outline" onClick={() => navigate(`/edit-expense?id=${id}`)}>
              <Edit3 size={14} className="mr-1.5" />
              {t("common.edit")}
            </Button>
          )}
        </PageHeader>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 space-y-4">
                <Skeleton className="h-5 w-36" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-6">
              <Card className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
              <Card className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </Card>
            </div>
          </div>
        ) : !item ? (
          <p className="text-center text-muted-foreground py-12">
            {t("page.expense.detail.notFound")}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold text-foreground mb-6">
                  {t("page.expense.detail.infoTitle")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.expenseNumber")}
                    </p>
                    <p className="text-sm font-medium">{item.expenseNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.status")}
                    </p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[item.status] || statusBadge.pending}`}>
                      {getStatusLabel(t)[item.status] || item.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.category")}
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Tag size={14} className="text-muted-foreground" />
                      {item.categoryData?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.amount")}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      Rp {Number(item.amount || 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.paymentMethod")}
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1 capitalize">
                      <CreditCard size={14} className="text-muted-foreground" />
                      {item.paymentMethod || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.payee")}
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <User size={14} className="text-muted-foreground" />
                      {item.payee || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.employee")}
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <User size={14} className="text-muted-foreground" />
                      {item.employee?.fullName || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.date")}
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Calendar size={14} className="text-muted-foreground" />
                      {fmtDate(item.date)}
                    </p>
                  </div>
                </div>
              </div>

              {item.employeeId && (
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Wallet size={16} className="text-primary" />
                    <h3 className="text-base font-semibold text-foreground">
                      {isSalary
                        ? t("page.expense.detail.salaryTitle")
                        : t("page.expense.detail.employeeTitle")}
                    </h3>
                    {isSalary && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-primary/10 text-primary">
                        {t("page.expense.form.salary.badge")}
                      </span>
                    )}
                  </div>

                  {employeeLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                      </div>
                    </div>
                  ) : employeeDetail ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          {employeeDetail.image ? (
                            <AvatarImage src={employeeDetail.image} alt={employeeDetail.fullName} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {(employeeDetail.fullName || "K").slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {employeeDetail.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {employeeDetail.employeeID ||
                              t("page.expense.detail.employeeId") + ` #${employeeDetail.id}`}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailRow
                          icon={BadgeCheck}
                          label={t("page.expense.form.salary.position")}
                          value={employeeDetail.positionData?.name}
                        />
                        <DetailRow
                          icon={Building2}
                          label={t("page.expense.form.salary.department")}
                          value={employeeDetail.departmentData?.name}
                        />
                        <DetailRow
                          icon={MapPin}
                          label={t("page.expense.form.salary.store")}
                          value={employeeDetail.storeData?.name}
                        />
                        <DetailRow
                          icon={Hash}
                          label={t("page.expense.form.salary.employeeId")}
                          value={employeeDetail.employeeID}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <CircleDollarSign size={12} />
                          {t("page.expense.form.salary.salaryInfo")}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              {t("page.expense.form.salary.monthlySalary")}
                            </p>
                            <p className="text-base font-bold text-primary">
                              {fmtRp(employeeDetail.monthlySalary)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-background p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              {t("page.expense.form.salary.dailySalary")}
                            </p>
                            <p className="text-base font-bold text-foreground">
                              {fmtRp(employeeDetail.dailySalary)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {item.employee?.fullName || "-"}
                    </p>
                  )}
                </div>
              )}

              {item.notes && (
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText size={16} /> {t("page.expense.detail.notes")}
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}

              {item.receipt && (
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                  <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Receipt size={16} /> {t("page.expense.detail.receipt")}
                  </h3>
                  <img
                    src={item.receipt}
                    alt={t("page.expense.detail.receiptAlt")}
                    className="max-w-md rounded-lg border"
                  />
                </div>
              )}

              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History size={16} className="text-primary" />
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.expense.detail.paymentLogTitle")}
                  </h3>
                  {item.isPaid && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-teal-100 text-teal-700">
                      {t("page.expense.list.statusPaid")}
                    </span>
                  )}
                </div>

                {item.payments?.length > 0 ? (
                  <div className="space-y-3">
                    {item.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">{fmtRp(p.amount)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fmtDate(p.paymentDate)}
                          </p>
                          {p.note && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {p.note}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 capitalize">
                            {p.paymentMethod || "-"}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("page.expense.detail.paymentBy")}{" "}
                            {p.createdByUser?.fullName || p.createdByUser?.userName || "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("page.expense.detail.paymentLogEmpty")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  {t("page.expense.detail.timeInfo")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.created")}
                    </p>
                    <p className="text-sm">{fmtDate(item.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("page.expense.detail.updated")}
                    </p>
                    <p className="text-sm">{fmtDate(item.updatedAt)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User size={16} /> {t("page.expense.detail.creator")}
                </h3>
                <p className="text-sm font-medium">
                  {item.creator?.fullName || item.creator?.name || "-"}
                </p>
              </div>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  {t("page.expense.detail.actions")}
                </h3>
                <div className="space-y-3">
                  {item.status === "approved" && (
                    <>
                      {item.isPaid ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          disabled={unpaidMutation.isLoading}
                          onClick={() => unpaidMutation.mutate(id)}>
                          <XCircle size={14} className="mr-1.5" />
                          {t("page.expense.detail.markUnpaidBtn")}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant="success"
                          disabled={paidMutation.isLoading}
                          onClick={openPaidModal}>
                          <BadgeCheck size={14} className="mr-1.5" />
                          {t("page.expense.detail.markPaidBtn")}
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => navigate(`/edit-expense?id=${item.id}`)}>
                    {t("page.expense.detail.editBtn")}
                  </Button>
                  <Button className="w-full" variant="danger" onClick={() => navigate("/expense")}>
                    {t("page.expense.detail.backToList")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Modal
          open={paidModal}
          onOpenChange={(v) => {
            if (!v) setPaidModal(false);
          }}
          type="form"
          title={t("page.expense.detail.paymentFormTitle")}
          description={t("page.expense.detail.paymentFormDesc")}
          confirmText={t("page.expense.detail.paymentFormSubmit")}
          loading={paidMutation.isLoading}
          onConfirm={handleMarkPaid}
          onCancel={() => setPaidModal(false)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment-date">{t("page.expense.detail.paymentFormDate")}</Label>
              <DateInput
                id="payment-date"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("page.expense.detail.paymentFormMethod")}</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(v) => setPaymentForm((f) => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("page.expense.form.paymentMethodPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("page.expense.form.paymentMethodCash")}</SelectItem>
                  <SelectItem value="bank">{t("page.expense.form.paymentMethodBank")}</SelectItem>
                  <SelectItem value="e-wallet">
                    {t("page.expense.form.paymentMethodEWallet")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-note">{t("page.expense.detail.paymentFormNote")}</Label>
              <Textarea
                id="payment-note"
                rows={3}
                placeholder={t("page.expense.detail.paymentFormNotePlaceholder")}
                value={paymentForm.note}
                onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
                maxLength={FIELD_LIMITS.DESCRIPTION}
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default DetailExpense;

import React, { useState } from "react";
import { usePageParam, useSearchParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Tag,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  Wallet,
  FileEdit,
  Sun,
  CalendarDays,
  CalendarRange,
  Calendar,
  Users,
  BellRing,
  BadgeCheck,
  Archive,
  ArchiveRestore
} from "lucide-react";
import { format } from "date-fns";
import {
  getAllExpenses,
  approveExpense,
  rejectExpense,
  getExpenseCategories,
  getExpenseSummary,
  generateSalaryExpenses,
  markExpensePaid,
  markExpenseUnpaid,
  setExpenseActive,
  getUpcomingPayments
} from "@/services/expense";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import { useTranslation } from "react-i18next";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import NoStore from "@/components/ui/NoStore";
import StoreFilter from "@/components/ui/StoreFilter";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import { safeGet } from "@/lib/safe-lookup";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";
import { dateLocale } from "@/lib/locale";

const ExpenseList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useSearchParam();
  const [statusFilter, setStatusFilter] = useState("all");
  const [isActiveFilter, setIsActiveFilter] = useState("active");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState(null);
  const [salaryModal, setSalaryModal] = useState(false);

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/expense";
  const locationParam = storeFilter !== "all" ? storeFilter : isSuperAdmin ? "" : user?.store || "";

  const hasActiveFilter =
    search ||
    statusFilter !== "all" ||
    isActiveFilter !== "active" ||
    categoryFilter !== "all" ||
    startDate ||
    endDate ||
    storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setIsActiveFilter("active");
    setCategoryFilter("all");
    setStartDate(null);
    setEndDate(null);
    setGlobalStoreFilter("all");
  };

  const { data: locData, isLoading: isLoadingLocations } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data: categoriesData } = useQuery(["expense-categories"], () => getExpenseCategories(), {
    staleTime: 300000
  });
  const categories = categoriesData?.data || [];

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery(
    ["expense-summary", locationParam],
    () => getExpenseSummary({ location: locationParam }),
    {
      staleTime: 60000
    }
  );
  const summary = summaryData?.data || {};
  const periods = summary?.periods || {};

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    [
      "expenses",
      page,
      limit,
      search,
      statusFilter,
      isActiveFilter,
      categoryFilter,
      storeFilter,
      startDate,
      endDate
    ],
    () =>
      getAllExpenses({
        location: locationParam,
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        isActive: isActiveFilter === "archived" ? "false" : undefined,
        categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined
      }),
    { keepPreviousData: true }
  );

  const approveMutation = useMutation(approveExpense, {
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      toast.success(t("page.expense.list.toast.approveSuccess"), {
        description: t("page.expense.list.toast.approveDescription")
      });
    },
    onError: (err) => {
      toast.error(t("page.expense.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const rejectMutation = useMutation(rejectExpense, {
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      toast.success(t("page.expense.list.toast.rejectSuccess"), {
        description: t("page.expense.list.toast.rejectDescription")
      });
    },
    onError: (err) => {
      toast.error(t("page.expense.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const salaryMutation = useMutation(generateSalaryExpenses, {
    onSuccess: (res) => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-summary"]);
      toast.success(
        res?.data?.created > 0
          ? t("page.expense.list.toast.salarySuccess", {
              count: res.data.created,
              skipped: res.data.skipped
            })
          : t("page.expense.list.toast.salarySkipped", { skipped: res.data.skipped }),
        { description: res?.message || "" }
      );
    },
    onError: (err) => {
      toast.error(t("page.expense.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const paidMutation = useMutation((id) => markExpensePaid(id, {}), {
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-upcoming"]);
      toast.success(t("page.expense.list.toast.paidSuccess"), {
        description: t("page.expense.list.toast.paidDescription")
      });
    },
    onError: (err) => {
      toast.error(t("page.expense.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const unpaidMutation = useMutation(markExpenseUnpaid, {
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-upcoming"]);
      toast.success(t("page.expense.list.toast.unpaidSuccess"), {
        description: t("page.expense.list.toast.unpaidDescription")
      });
    },
    onError: (err) => {
      toast.error(t("page.expense.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const activeMutation = useMutation(({ id, isActive }) => setExpenseActive(id, isActive), {
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["expense-summary"]);
      queryClient.invalidateQueries(["expense-upcoming"]);
      const activating = variables.isActive;
      toast.success(
        activating
          ? t("page.expense.list.toast.restoreSuccess")
          : t("page.expense.list.toast.archiveSuccess"),
        {
          description: activating
            ? t("page.expense.list.toast.restoreDescription")
            : t("page.expense.list.toast.archiveDescription")
        }
      );
    },
    onError: (err) => {
      toast.error(t("page.expense.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const { data: upcomingData } = useQuery(
    ["expense-upcoming", locationParam],
    () => getUpcomingPayments({ location: locationParam, days: 7 }),
    { staleTime: 60000 }
  );
  const upcoming = upcomingData?.data || [];
  const upcomingCount = upcoming.length;

  const handleGenerateSalary = () => {
    const currentMonth = format(new Date(), "yyyy-MM");
    salaryMutation.mutate({
      store: locationParam,
      month: currentMonth,
      paymentMethod: "cash",
      employeeIds: []
    });
    setSalaryModal(false);
  };

  const expenses = data?.data || [];
  const pagination = data?.pagination || {};
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;
  const stats = data?.stats || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(dateLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getPaymentLabel = (method) => {
    const labels = {
      cash: t("page.expense.form.paymentMethodCash"),
      bank: t("page.expense.form.paymentMethodBank"),
      "e-wallet": t("page.expense.form.paymentMethodEWallet")
    };
    return safeGet(labels, method, method || "-");
  };

  const getStatusBadge = (status) => {
    if (status === "draft") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {t("page.expense.list.statusDraft")}
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
          {t("page.expense.list.statusPending")}
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          {t("page.expense.list.statusRejected")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
        {t("page.expense.list.statusApproved")}
      </span>
    );
  };

  const columns = [
    {
      header: t("page.expense.table.description"),
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            <Tag size={14} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{item.description || "-"}</span>
            {item.frequency && (
              <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mt-0.5 dark:bg-blue-950/40 dark:text-blue-300">
                {t("page.expense.list.recurring")} ·{" "}
                {t(
                  `page.expense.form.frequency${item.frequency.charAt(0).toUpperCase()}${item.frequency.slice(1)}`
                )}
              </span>
            )}
            {item.payee && (
              <span className="text-xs text-muted-foreground mt-0.5">
                {t("page.expense.form.payee")}: {item.payee}
              </span>
            )}
            {item.employee?.fullName && (
              <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 mt-0.5 dark:bg-teal-950/40 dark:text-teal-300">
                <Users size={10} />
                {item.employee.fullName}
              </span>
            )}
            {item.paymentMethod && (
              <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 mt-0.5 dark:bg-purple-950/40 dark:text-purple-300">
                {getPaymentLabel(item.paymentMethod)}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: t("page.expense.table.category"),
      render: (item) => item.categoryData?.name || item.category?.name || "-"
    },
    {
      header: t("page.expense.table.amount"),
      accessor: "amount",
      align: "right",
      render: (item) => <span className="font-medium">{formatCurrency(item.amount)}</span>
    },
    {
      header: t("page.expense.table.status"),
      align: "center",
      render: (item) => (
        <div className="flex flex-col items-center gap-1">
          {getStatusBadge(item.status)}
          {item.status === "approved" && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                item.isPaid ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
              }`}>
              {item.isPaid
                ? t("page.expense.list.statusPaid")
                : t("page.expense.list.statusUnpaid")}
            </span>
          )}
          {item.isActive === false && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
              {t("page.expense.list.statusArchived")}
            </span>
          )}
        </div>
      )
    },
    {
      header: t("page.expense.table.date"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
      )
    },
    {
      header: t("common.createdBy"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.createdByUser?.fullName || item.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("common.modifiedBy"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.modifiedByUser?.fullName || item.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("common.createdAt"),
      render: (item) => {
        if (!item.createdAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(item.createdAt);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString(dateLocale(), {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}{" "}
            {d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("common.updatedAt"),
      render: (item) => {
        if (!item.updatedAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(item.updatedAt);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString(dateLocale(), {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}{" "}
            {d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("page.expense.table.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: CheckCircle, label: t("common.approve") },
        { icon: XCircle, label: t("common.reject") },
        { icon: BadgeCheck, label: t("page.expense.list.markPaid") },
        { icon: Archive, label: t("page.expense.list.archive") },
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          visible={2}
          items={[
            ...(item.status === "pending" && canAccess(user, MENU_KEY, "edit")
              ? [
                  {
                    label: t("common.approve"),
                    icon: CheckCircle,
                    disabled: approveMutation.isLoading,
                    onClick: () => setConfirmAction({ type: "approve", item })
                  },
                  {
                    label: t("common.reject"),
                    icon: XCircle,
                    danger: true,
                    disabled: rejectMutation.isLoading,
                    onClick: () => setConfirmAction({ type: "reject", item })
                  }
                ]
              : []),
            ...(item.status === "approved" && canAccess(user, MENU_KEY, "edit")
              ? [
                  {
                    label: item.isPaid
                      ? t("page.expense.list.markUnpaid")
                      : t("page.expense.list.markPaid"),
                    icon: BadgeCheck,
                    disabled: paidMutation.isLoading || unpaidMutation.isLoading,
                    onClick: () => setConfirmAction({ type: item.isPaid ? "unpaid" : "paid", item })
                  }
                ]
              : []),
            ...(canAccess(user, MENU_KEY, "edit")
              ? [
                  {
                    label: item.isActive
                      ? t("page.expense.list.archive")
                      : t("page.expense.list.restore"),
                    icon: item.isActive ? Archive : ArchiveRestore,
                    disabled: activeMutation.isLoading,
                    onClick: () =>
                      setConfirmAction({ type: item.isActive ? "archive" : "restore", item })
                  },
                  {
                    label: t("common.view"),
                    icon: Eye,
                    onClick: () => navigate(`/detail-expense?id=${item.id || item._id}`)
                  },
                  {
                    label: t("common.edit"),
                    icon: Edit,
                    onClick: () => navigate(`/edit-expense?id=${item.id || item._id}`)
                  }
                ]
              : [])
          ]}
        />
      )
    }
  ];

  const confirmConfig = {
    approve: {
      title: t("page.expense.list.confirmApproveTitle"),
      desc: t("page.expense.list.confirmApproveDesc"),
      text: t("page.expense.list.confirmApprove"),
      destructive: false
    },
    reject: {
      title: t("page.expense.list.confirmRejectTitle"),
      desc: t("page.expense.list.confirmRejectDesc"),
      text: t("page.expense.list.confirmReject"),
      destructive: true
    },
    paid: {
      title: t("page.expense.list.confirmPaidTitle"),
      desc: t("page.expense.list.confirmPaidDesc"),
      text: t("page.expense.list.confirmPaid"),
      destructive: false
    },
    unpaid: {
      title: t("page.expense.list.confirmUnpaidTitle"),
      desc: t("page.expense.list.confirmUnpaidDesc"),
      text: t("page.expense.list.confirmUnpaid"),
      destructive: true
    },
    archive: {
      title: t("page.expense.list.confirmArchiveTitle"),
      desc: t("page.expense.list.confirmArchiveDesc"),
      text: t("page.expense.list.confirmArchive"),
      destructive: true
    },
    restore: {
      title: t("page.expense.list.confirmRestoreTitle"),
      desc: t("page.expense.list.confirmRestoreDesc"),
      text: t("page.expense.list.confirmRestore"),
      destructive: false
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.expense.list.title") }
        ]}
        title={t("page.expense.list.title")}
        description={t("page.expense.list.description")}>
        {canAccess(user, MENU_KEY, "add") && !!locationParam && (
          <Button
            variant="outline"
            onClick={() => setSalaryModal(true)}
            disabled={salaryMutation.isLoading}
            className="gap-2">
            <Users size={18} />
            {salaryMutation.isLoading
              ? t("button.processing")
              : t("page.expense.list.generateSalary")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button variant="success" onClick={() => navigate("/add-expense")} className="gap-2">
            <Plus size={18} />
            {t("page.expense.button.add")}
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <>
          {locData && (locData?.data || []).length === 0 ? (
            <NoStore />
          ) : (
            <>
              {isFetching || isLoading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
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
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard
                      label={t("page.expense.list.total")}
                      value={total}
                      icon={Wallet}
                      variant="default"
                    />
                    <StatCard
                      label={t("page.expense.list.draft")}
                      value={stats.draft || 0}
                      icon={FileEdit}
                      variant="draft"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      label={t("page.expense.list.pending")}
                      value={stats.pending || 0}
                      icon={FileEdit}
                      variant="warning"
                    />
                    <StatCard
                      label={t("page.expense.list.approved")}
                      value={stats.approved || 0}
                      icon={CheckCircle}
                      variant="active"
                    />
                    <StatCard
                      label={t("page.expense.list.rejected")}
                      value={stats.rejected || 0}
                      icon={XCircle}
                      variant="inactive"
                    />
                  </div>
                </div>
              )}

              {isFetching || isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.expense.list.periodTitle")}
                    </h3>
                    {isSummaryLoading && <Skeleton className="h-3 w-24" />}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label={t("page.expense.list.period.daily")}
                      value={formatCurrency(periods.daily)}
                      icon={Sun}
                      variant="yellow"
                    />
                    <StatCard
                      label={t("page.expense.list.period.weekly")}
                      value={formatCurrency(periods.weekly)}
                      icon={CalendarDays}
                      variant="blue"
                    />
                    <StatCard
                      label={t("page.expense.list.period.monthly")}
                      value={formatCurrency(periods.monthly)}
                      icon={CalendarRange}
                      variant="default"
                    />
                    <StatCard
                      label={t("page.expense.list.period.yearly")}
                      value={formatCurrency(periods.yearly)}
                      icon={Calendar}
                      variant="gold"
                    />
                  </div>
                </div>
              )}

              {upcomingCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <BellRing size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {t("page.expense.list.upcomingTitle")}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      {t("page.expense.list.upcomingDesc", { count: upcomingCount })}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {upcoming.slice(0, 5).map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => navigate(`/detail-expense?id=${p.id}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-background border border-amber-300 dark:border-amber-700 text-xs font-medium text-amber-800 dark:text-amber-200 hover:border-amber-400 transition-colors">
                          <Calendar size={12} className="shrink-0" />
                          <span className="truncate max-w-[180px]">{p.description || "-"}</span>
                          <span className="text-amber-500 dark:text-amber-400 whitespace-nowrap">
                            · {t("page.expense.list.upcomingDue")} {formatDate(p.nextDueDate)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <TableToolbar
                title={t("page.expense.list.title")}
                onReset={resetFilters}
                isFiltered={hasActiveFilter}>
                {isLoadingLocations || isLoading || isFetching ? (
                  [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-full" />)
                ) : (
                  <div className="grid *:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    <SearchInput
                      value={search}
                      onChange={(val) => {
                        setSearch(val);
                      }}
                      placeholder={t("page.expense.list.search")}
                      isLoading={isFetching}
                    />
                    {isSuperAdmin && (
                      <StoreFilter
                        locations={locData?.data || []}
                        value={storeFilter}
                        onChange={(v) => {
                          setGlobalStoreFilter(v);
                          setPage(1);
                        }}
                        isSuperAdmin={isSuperAdmin}
                        t={t}
                      />
                    )}
                    <Combobox
                      options={[
                        { value: "all", label: t("common.all") },
                        { value: "draft", label: t("page.expense.list.statusDraft") },
                        { value: "pending", label: t("page.expense.list.statusPending") },
                        { value: "approved", label: t("page.expense.list.statusApproved") },
                        { value: "rejected", label: t("page.expense.list.statusRejected") }
                      ]}
                      value={statusFilter}
                      onChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                      }}
                      placeholder={t("common.status")}
                      searchPlaceholder={t("common.search.generic")}
                    />
                    <Combobox
                      options={[
                        { value: "active", label: t("page.expense.list.filterActive") },
                        { value: "archived", label: t("page.expense.list.filterArchived") }
                      ]}
                      value={isActiveFilter}
                      onChange={(v) => {
                        setIsActiveFilter(v);
                        setPage(1);
                      }}
                      placeholder={t("page.expense.list.filter.isActive")}
                      searchPlaceholder={t("common.search.generic")}
                    />
                    <Combobox
                      options={[
                        { value: "all", label: t("common.all") },
                        ...categories.map((c) => ({
                          value: c.id,
                          label: c.name
                        }))
                      ]}
                      value={categoryFilter}
                      onChange={(v) => {
                        setCategoryFilter(v);
                        setPage(1);
                      }}
                      placeholder={t("page.expense.list.filter.category")}
                      searchPlaceholder={t("common.search.category")}
                    />
                  </div>
                )}
              </TableToolbar>

              <div>
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.expense.button.add"),
                          onClick: () => navigate("/add-expense")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={expenses}
                  isLoading={isLoading || isFetching}
                  emptyMessage={t("page.expense.list.empty")}
                  emptyIcon={DollarSign}
                  pagination={{
                    page,
                    totalPages,
                    total,
                    onPageChange: setPage,
                    pageSize: limit,
                    onPageSizeChange: (v) => {
                      setLimit(v);
                      setPage(1);
                    }
                  }}
                />
              </div>
            </>
          )}
        </>
      )}

      <Modal
        open={!!confirmAction}
        onOpenChange={(v) => {
          if (!v) setConfirmAction(null);
        }}
        type="confirm"
        title={confirmConfig[confirmAction?.type]?.title}
        description={confirmConfig[confirmAction?.type]?.desc}
        confirmText={confirmConfig[confirmAction?.type]?.text}
        confirmVariant={confirmConfig[confirmAction?.type]?.destructive ? "destructive" : "default"}
        loading={
          approveMutation.isLoading ||
          rejectMutation.isLoading ||
          paidMutation.isLoading ||
          unpaidMutation.isLoading ||
          activeMutation.isLoading
        }
        onConfirm={() => {
          if (!confirmAction) return;
          const id = confirmAction.item.id || confirmAction.item._id;
          if (confirmAction.type === "approve") approveMutation.mutate(id);
          else if (confirmAction.type === "reject") rejectMutation.mutate(id);
          else if (confirmAction.type === "paid") paidMutation.mutate(id);
          else if (confirmAction.type === "unpaid") unpaidMutation.mutate(id);
          else if (confirmAction.type === "archive") activeMutation.mutate({ id, isActive: false });
          else if (confirmAction.type === "restore") activeMutation.mutate({ id, isActive: true });
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <Modal
        type="confirm"
        open={salaryModal}
        onOpenChange={setSalaryModal}
        title={t("page.expense.list.confirmSalaryTitle")}
        description={t("page.expense.list.confirmSalaryDesc", {
          month: format(new Date(), "MMMM yyyy")
        })}
        confirmText={t("page.expense.list.confirmSalaryButton")}
        confirmVariant="default"
        loading={salaryMutation.isLoading}
        onConfirm={handleGenerateSalary}
        onCancel={() => setSalaryModal(false)}
      />
    </div>
  );
};

export default ExpenseList;

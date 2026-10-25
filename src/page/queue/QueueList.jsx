import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { Users, Clock, UserCheck, XCircle, Timer } from "lucide-react";
import { toast } from "sonner";
import { getQueueList, getQueueStats, updateQueueStatus } from "@/services/queue";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import TableToolbar from "@/components/ui/TableToolbar";
import Modal from "@/components/organism/modal";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "seated", label: "Seated" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
  { value: "expired", label: "Expired" }
];

const priorityOptions = [
  { value: "all", label: "All" },
  { value: "normal", label: "Normal" },
  { value: "vip", label: "VIP" },
  { value: "elderly", label: "Elderly" },
  { value: "pregnant", label: "Pregnant" },
  { value: "disabled", label: "Disabled" }
];

const statusBadge = (status) => {
  const map = {
    waiting:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
    seated:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
    cancelled:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
    no_show:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    expired:
      "bg-muted text-muted-foreground dark:bg-gray-900/30 dark:text-muted-foreground border border-gray-200 dark:border-gray-800"
  };
  return safeGet(map, status, "bg-muted text-muted-foreground");
};

const priorityBadge = (priority) => {
  const map = {
    normal: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    vip: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    elderly: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    pregnant: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
    disabled: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
  };
  return safeGet(map, priority, "bg-muted text-muted-foreground");
};

const QueueList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [seatedTarget, setSeatedTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const isFiltered =
    storeFilter !== "all" || search !== "" || statusFilter !== "all" || priorityFilter !== "all";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setPage(1);
  };

  const user = cookie?.user;

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["queue-list", page, limit, storeFilter, search, statusFilter, priorityFilter],
    () =>
      getQueueList({
        store: storeFilter === "all" ? "" : storeFilter,
        page,
        limit,
        search,
        status: statusFilter,
        priority: priorityFilter
      }),
    { retry: 1, keepPreviousData: true }
  );

  const { data: statsData } = useQuery(
    ["queue-stats", storeFilter],
    () => getQueueStats({ store: storeFilter === "all" ? "" : storeFilter }),
    { retry: 1 }
  );

  const seatMutation = useMutation(
    ({ id, tableId }) => updateQueueStatus(id, { status: "seated", tableId }),
    {
      onSuccess: () => {
        toast.success(t("common.success"), {
          description: "Customer marked as seated"
        });
        queryClient.invalidateQueries(["queue-list"]);
        queryClient.invalidateQueries(["queue-stats"]);
        setSeatedTarget(null);
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  const cancelMutation = useMutation(({ id }) => updateQueueStatus(id, { status: "cancelled" }), {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: "Queue entry cancelled"
      });
      queryClient.invalidateQueries(["queue-list"]);
      queryClient.invalidateQueries(["queue-stats"]);
      setCancelTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const stats = statsData?.data || {};

  const columns = [
    {
      header: t("page.queue.list.queueNumber"),
      accessorKey: "queueNumber",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-foreground">{row.original.queueNumber}</span>
      )
    },
    {
      header: t("page.queue.list.customer"),
      accessorKey: "customerName",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.customerName}</div>
          {row.original.customerPhone && (
            <div className="text-xs text-muted-foreground">{row.original.customerPhone}</div>
          )}
        </div>
      )
    },
    {
      header: t("page.queue.list.partySize"),
      accessorKey: "partySize",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Users size={14} className="text-muted-foreground" />
          <span className="text-sm">{row.original.partySize}</span>
        </div>
      )
    },
    {
      header: t("page.queue.list.priority"),
      accessorKey: "priority",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge(row.original.priority)}`}>
          {row.original.priority?.toUpperCase()}
        </span>
      )
    },
    {
      header: t("page.queue.list.status"),
      accessorKey: "status",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.original.status)}`}>
          {row.original.status?.replace("_", " ")?.toUpperCase()}
        </span>
      )
    },
    {
      header: t("page.queue.list.waitTime"),
      accessorKey: "checkedInAt",
      cell: ({ row }) => {
        const checkedIn = new Date(row.original.checkedInAt);
        const now = new Date();
        const diffMins = Math.round((now - checkedIn) / 60000);
        return (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Timer size={14} />
            <span>{diffMins} min</span>
          </div>
        );
      }
    },
    {
      header: t("common.action"),
      accessorKey: "actions",
      legend: [
        { icon: UserCheck, label: t("common.seat") },
        { icon: XCircle, label: t("common.cancel") }
      ],
      cell: ({ row }) => {
        const item = row.original;
        return (
          <TableActions
            align="center"
            visible={2}
            items={[
              ...(item.status === "waiting"
                ? [
                    {
                      label: t("common.seat"),
                      icon: UserCheck,
                      onClick: () => setSeatedTarget(item)
                    },
                    {
                      label: t("common.cancel"),
                      icon: XCircle,
                      danger: true,
                      onClick: () => setCancelTarget(item)
                    }
                  ]
                : [])
            ]}
          />
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            href:
              user?.roleType === "super_admin"
                ? "/dashboard-super-admin"
                : user?.roleType === "admin"
                  ? "/dashboard-admin"
                  : "/home",
            i18nKey: "breadcrumb.home"
          },
          { i18nKey: "sidebar.queue" }
        ]}
        title={t("page.queue.list.title")}
        description={t("page.queue.list.description")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("page.queue.stats.totalToday")}
          value={stats.totalToday || 0}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          label={t("page.queue.stats.waitingNow")}
          value={stats.waitingNow || 0}
          icon={Clock}
          isLoading={isLoading}
          className="border-yellow-200 dark:border-yellow-800"
        />
        <StatCard
          label={t("page.queue.stats.seatedToday")}
          value={stats.seatedToday || 0}
          icon={UserCheck}
          isLoading={isLoading}
          className="border-green-200 dark:border-green-800"
        />
        <StatCard
          label={t("page.queue.stats.avgWait")}
          value={`${stats.avgWaitMinutes || 0} min`}
          icon={Timer}
          isLoading={isLoading}
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading || isFetching}
          isError={isError}
          onRetry={refetch}
          toolbar={
            <TableToolbar
              title={t("page.queue.list.title")}
              onReset={resetFilters}
              isFiltered={isFiltered}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cari
                </label>
                <SearchInput
                  value={search}
                  onChange={(val) => {
                    setSearch(val);
                    setPage(1);
                  }}
                  placeholder={t("page.queue.list.searchPlaceholder")}
                  className="w-full md:w-64"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter Status
                </label>
                <Combobox
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  placeholder="Filter Status"
                  searchPlaceholder="Cari..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter Priority
                </label>
                <Combobox
                  options={priorityOptions}
                  value={priorityFilter}
                  onChange={(val) => {
                    setPriorityFilter(val);
                    setPage(1);
                  }}
                  placeholder="Filter Priority"
                  searchPlaceholder="Cari..."
                />
              </div>
            </TableToolbar>
          }
          pagination={{
            ...data?.pagination,
            pageSize: limit,
            onPageChange: setPage,
            onPageSizeChange: (v) => {
              setLimit(v);
              setPage(1);
            }
          }}
          emptyMessage={t("page.queue.list.empty")}
        />
      </div>

      {/* Seated Modal */}
      <Modal
        type="confirm"
        open={!!seatedTarget}
        onOpenChange={(open) => !open && setSeatedTarget(null)}
        title={t("page.queue.modal.seatTitle")}
        description={t("page.queue.modal.seatDescription", { name: seatedTarget?.customerName })}
        confirmText={t("page.queue.modal.confirmSeat")}
        onConfirm={() => seatMutation.mutate({ id: seatedTarget?.id })}
        loading={seatMutation.isLoading}
      />

      {/* Cancel Modal */}
      <Modal
        type="confirm"
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={t("page.queue.modal.cancelTitle")}
        description={t("page.queue.modal.cancelDescription", { name: cancelTarget?.customerName })}
        confirmText={t("page.queue.modal.confirmCancel")}
        onConfirm={() => cancelMutation.mutate({ id: cancelTarget?.id })}
        loading={cancelMutation.isLoading}
      />
    </div>
  );
};

export default QueueList;

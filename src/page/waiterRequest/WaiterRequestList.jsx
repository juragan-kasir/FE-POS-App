import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useSocket } from "@/services/socket";
import { useRoomSubscription } from "@/hooks/useRoomSubscription";
import { Bell, Check, X, CheckCheck, Clock, HandPlatter, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getWaiterRequestList, updateWaiterRequestStatus } from "@/services/waiterRequest";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import DataTable from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import TableToolbar from "@/components/ui/TableToolbar";
import StoreFilter from "@/components/ui/StoreFilter";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import { useLocations } from "@/queries/useLocations";
import i18next from "i18next";
import { dateLocale } from "@/lib/locale";

const statusOptions = [
  {
    value: "all",
    get label() {
      return i18next.t("common.all");
    }
  },
  {
    value: "pending",
    get label() {
      return i18next.t("page.expense.list.pending");
    }
  },
  {
    value: "approved",
    get label() {
      return i18next.t("page.expense.list.approved");
    }
  },
  {
    value: "rejected",
    get label() {
      return i18next.t("page.expense.list.rejected");
    }
  },
  {
    value: "done",
    get label() {
      return i18next.t("page.waiterRequest.ui.statusDone");
    }
  }
];

const typeMeta = {
  sendok: {
    get label() {
      return i18next.t("page.waiterRequest.ui.cutlery");
    },
    icon: "🥄"
  },
  tisu: {
    get label() {
      return i18next.t("page.waiterRequest.ui.tissues");
    },
    icon: "🧻"
  },
  refill: {
    get label() {
      return i18next.t("page.waiterRequest.ui.refill");
    },
    icon: "🥤"
  },
  bill: {
    get label() {
      return i18next.t("page.waiterRequest.ui.bill");
    },
    icon: "🧾"
  },
  call: {
    get label() {
      return i18next.t("page.waiterRequest.ui.callWaiter");
    },
    icon: "🧑‍🍳"
  }
};

const statusBadge = (status) => {
  const map = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
    approved:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    rejected:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
    done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
  };
  return safeGet(map, status, "bg-muted text-foreground");
};

const WaiterRequestList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const { socket, connected } = useSocket();
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [doneTarget, setDoneTarget] = useState(null);

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const storeId = isSuperAdmin
    ? storeFilter && storeFilter !== "all"
      ? storeFilter
      : ""
    : cookie?.activeStore || cookie?.user?.store;

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin,
    retry: 1
  });

  const isFiltered = storeFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setStatusFilter("pending");
    setPage(1);
  };

  // F2: room-subscription awareness. `connected` alone must not disable
  // polling — the `store-${storeId}` join can be rejected (or lost on
  // reconnect) while the transport stays up. Polling stays on until the
  // server confirms this exact room (see useRoomSubscription).
  const { roomOk } = useRoomSubscription({
    socket,
    connected,
    roomEvent: "join-store",
    roomKey: storeId || null
  });

  // Realtime updates normally come from the socket (below); when realtime
  // room membership is unconfirmed — no deployment that enables sockets, a
  // client that exists but is not yet / no longer connected, or a connected
  // client whose room join was rejected/is pending/was lost on reconnect —
  // these queries would otherwise never refresh on their own
  // (refetchOnWindowFocus/refetchOnReconnect are off globally — see
  // useSocket), so new/changed requests would only ever appear after a
  // manual reload. Poll only in that fallback case — a live, subscribed
  // connection makes polling redundant. Branching on `connected && roomOk`
  // (not `socket !== null`, and never `connected` alone) is what keeps the
  // fallback alive during disconnected/rejected windows (F2).
  const pollFallback = connected && roomOk ? false : 15000;

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["waiter-request-list", page, limit, storeId, statusFilter],
    () =>
      getWaiterRequestList({
        store: storeId,
        page,
        limit,
        status: statusFilter
      }),
    {
      retry: 1,
      keepPreviousData: true,
      enabled: !!storeId || storeId === "",
      refetchInterval: pollFallback
    }
  );

  const { data: allData } = useQuery(
    ["waiter-request-all", storeId],
    () =>
      getWaiterRequestList({
        store: storeId,
        page: 1,
        limit: 1,
        status: "all"
      }),
    {
      retry: 1,
      enabled: !!storeId || storeId === "",
      refetchInterval: pollFallback
    }
  );

  const { data: pendingData } = useQuery(
    ["waiter-request-pending", storeId],
    () =>
      getWaiterRequestList({
        store: storeId,
        page: 1,
        limit: 1,
        status: "pending"
      }),
    {
      retry: 1,
      enabled: !!storeId || storeId === "",
      refetchInterval: pollFallback
    }
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries(["waiter-request-list"]);
    queryClient.invalidateQueries(["waiter-request-all"]);
    queryClient.invalidateQueries(["waiter-request-pending"]);
  }, [queryClient]);

  useEffect(() => {
    if (socket && storeId) {
      // Domain listeners only — room membership (join-store with ack,
      // join-rejected, leave-store, reconnect re-join) is owned by
      // useRoomSubscription above.
      const onNew = (req) => {
        if (req?.status === "pending") {
          toast.success(t("page.waiterRequest.ui.newWaiterRequest"), {
            description: `${typeMeta[req.type]?.label || req.type} dari meja ${
              req.table?.name || req.tableId || "-"
            }`
          });
        }
        invalidate();
      };
      const onChanged = () => invalidate();
      socket.on("waiter-request:new", onNew);
      socket.on("waiter-request:statusChanged", onChanged);
      // A disconnect/reconnect window (network blip) can silently miss
      // domain events that fired while offline — refetch on every
      // (re)connect, not just on explicit domain events, so a reconnect
      // reconciles state instead of leaving it stale indefinitely.
      const onConnect = () => invalidate();
      socket.on("connect", onConnect);
      return () => {
        socket.off("waiter-request:new", onNew);
        socket.off("waiter-request:statusChanged", onChanged);
        socket.off("connect", onConnect);
      };
    }
  }, [socket, storeId, invalidate]);

  const statusMutation = useMutation(
    ({ id, status, notes }) => updateWaiterRequestStatus(id, { status, notes }),
    {
      onSuccess: () => {
        toast.success(t("common.success"));
        setApproveTarget(null);
        setRejectTarget(null);
        setDoneTarget(null);
        invalidate();
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  const rows = data?.data || [];
  const totalAll = allData?.pagination?.total || 0;
  const totalPending = pendingData?.pagination?.total || 0;

  const columns = [
    {
      header: "No. Request",
      accessorKey: "requestNumber",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-foreground">
          {row.original.requestNumber}
        </span>
      )
    },
    {
      header: "Permintaan",
      accessorKey: "type",
      cell: ({ row }) => {
        const meta = typeMeta[row.original.type] || { label: row.original.type, icon: "🧑‍🍳" };
        return (
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.icon}</span>
            <span className="font-medium text-foreground">{meta.label}</span>
          </div>
        );
      }
    },
    {
      header: "Meja",
      accessorKey: "table",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin size={14} className="text-muted-foreground" />
          <span>
            {row.original.table?.name ||
              (row.original.tableId ? `Meja ${row.original.tableId}` : "-")}
          </span>
        </div>
      )
    },
    {
      header: "Keterangan",
      accessorKey: "notes",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[220px]">
          {row.original.notes || "-"}
        </span>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(row.original.status)}`}>
          {row.original.status?.toUpperCase()}
        </span>
      )
    },
    {
      header: "Waktu",
      accessorKey: "createdAt",
      cell: ({ row }) => {
        const d = new Date(row.original.createdAt);
        return (
          <div className="text-sm text-muted-foreground">
            {d.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" })},{" "}
            {d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
          </div>
        );
      }
    },
    {
      header: t("common.action"),
      accessorKey: "actions",
      legend: [
        { icon: Check, label: t("common.approve") },
        { icon: X, label: t("common.reject") },
        { icon: CheckCheck, label: t("common.completed") }
      ],
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            {item.status === "pending" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600"
                  title={t("common.approve")}
                  onClick={() => setApproveTarget(item)}>
                  <Check size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600"
                  title={t("common.reject")}
                  onClick={() => setRejectTarget(item)}>
                  <X size={16} />
                </Button>
              </>
            )}
            {item.status === "approved" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600"
                title={t("page.waiterRequest.ui.markDone")}
                onClick={() => setDoneTarget(item)}>
                <CheckCheck size={16} />
              </Button>
            )}
          </div>
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
          { i18nKey: "sidebar.waiterRequest" }
        ]}
        title={t("sidebar.waiterRequest")}
        description={t("page.waiterRequest.ui.handleCustomerRequestsToStaff")}>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
          <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          {t("page.auditLog.refresh")}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label={t("page.waiterRequest.stats.total")}
          value={totalAll}
          icon={HandPlatter}
          isLoading={isLoading}
        />
        <StatCard
          label={t("page.waiterRequest.stats.pending")}
          value={totalPending}
          icon={Bell}
          isLoading={isLoading}
          className="border-yellow-200 dark:border-yellow-800"
        />
        <StatCard
          label={t("page.waiterRequest.stats.approved")}
          value={totalPending}
          icon={Clock}
          isLoading={isLoading}
          className="border-blue-200 dark:border-blue-800"
        />
      </div>

      {isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <div className="bg-card rounded-xl border border-border p-4">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            isFetching={isFetching}
            toolbar={
              <TableToolbar
                title={t("page.waiterRequest.ui.waiterRequests")}
                onReset={resetFilters}
                isFiltered={isFiltered}>
                {isSuperAdmin && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.goodsReceipt.detail.store")}
                    </label>
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
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="waiter-request-list-filter-status"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("page.waiterRequest.ui.filterStatus")}
                  </label>
                  <Combobox
                    id="waiter-request-list-filter-status"
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(val) => {
                      setStatusFilter(val);
                      setPage(1);
                    }}
                    placeholder={t("page.waiterRequest.ui.filterStatus")}
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
            emptyMessage={t("page.waiterRequest.ui.noWaiterRequestsYet")}
          />
        </div>
      )}

      {/* Approve Modal */}
      <Modal
        type="confirm"
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title={t("page.waiterRequest.ui.approveRequest")}
        description={`Setujui permintaan "${typeMeta[approveTarget?.type]?.label || approveTarget?.type}" dari meja ${
          approveTarget?.table?.name || approveTarget?.tableId || "-"
        }?`}
        confirmText="Setujui"
        onConfirm={() => statusMutation.mutate({ id: approveTarget?.id, status: "approved" })}
        loading={statusMutation.isLoading}
      />

      {/* Reject Modal */}
      <Modal
        type="confirm"
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title={t("page.waiterRequest.ui.rejectRequest")}
        description={`Tolak permintaan "${typeMeta[rejectTarget?.type]?.label || rejectTarget?.type}" dari meja ${
          rejectTarget?.table?.name || rejectTarget?.tableId || "-"
        }?`}
        confirmText="Tolak"
        confirmVariant="destructive"
        onConfirm={() => statusMutation.mutate({ id: rejectTarget?.id, status: "rejected" })}
        loading={statusMutation.isLoading}
      />

      {/* Done Modal */}
      <Modal
        type="confirm"
        open={!!doneTarget}
        onOpenChange={(open) => !open && setDoneTarget(null)}
        title={t("page.waiterRequest.ui.markDone")}
        description={`Tandai permintaan "${typeMeta[doneTarget?.type]?.label || doneTarget?.type}" dari meja ${
          doneTarget?.table?.name || doneTarget?.tableId || "-"
        } sebagai selesai?`}
        confirmText="Selesai"
        onConfirm={() => statusMutation.mutate({ id: doneTarget?.id, status: "done" })}
        loading={statusMutation.isLoading}
      />
    </div>
  );
};

export default WaiterRequestList;

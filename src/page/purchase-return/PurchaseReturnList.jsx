import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { Eye, CheckCircle, XCircle, ClipboardList, Hourglass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { canAccess } from "@/utils/permission";
import {
  getAllPurchaseReturn,
  approvePurchaseReturn,
  rejectPurchaseReturn
} from "@/services/purchase-return";
import { SearchInput } from "@/components/ui/SearchInput";
import NoStore from "@/components/ui/NoStore";
import StatCard from "@/components/ui/StatCard";
import StoreFilter from "@/components/ui/StoreFilter";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const statusCfg = {
  pending: {
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  approved: {
    class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  rejected: {
    class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
};

const PurchaseReturnList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/purchase-return";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(undefined);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [resolution, setResolution] = useState("credit");

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const locationParam = storeFilter !== "all" ? storeFilter : undefined;
  const dateParam = dateFilter ? format(dateFilter, "yyyy-MM-dd") : undefined;

  const isFiltered =
    storeFilter !== "all" || statusFilter !== "all" || !!dateFilter || search !== "";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setStatusFilter("all");
    setDateFilter(undefined);
    setSearch("");
    setPage(1);
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["purchase-returns", page, limit, search, storeFilter, statusFilter, dateFilter],
    () =>
      getAllPurchaseReturn({
        page,
        limit,
        search: search || undefined,
        store: locationParam,
        status: statusFilter !== "all" ? statusFilter : undefined,
        startDate: dateParam,
        endDate: dateParam
      }),
    { keepPreviousData: true }
  );

  const items = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  const approveMut = useMutation(approvePurchaseReturn, {
    onSuccess: () => {
      toast.success(t("page.purchaseReturn.list.toast.success"), {
        description: t("page.purchaseReturn.list.toast.approveDesc")
      });
      queryClient.invalidateQueries(["purchase-returns"]);
      setActionTarget(null);
      setActionType(null);
      setResolution("credit");
    },
    onError: (err) =>
      toast.error(t("page.purchaseReturn.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const rejectMut = useMutation(rejectPurchaseReturn, {
    onSuccess: () => {
      toast.success(t("page.purchaseReturn.list.toast.success"), {
        description: t("page.purchaseReturn.list.toast.rejectDesc")
      });
      queryClient.invalidateQueries(["purchase-returns"]);
      setActionTarget(null);
      setActionType(null);
    },
    onError: (err) =>
      toast.error(t("page.purchaseReturn.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const columns = [
    {
      header: t("page.purchaseReturn.list.header.returnNo"),
      stickyLeft: true,
      render: (item) => (
        <span className="font-mono text-xs font-bold text-primary">{item.returnNumber}</span>
      )
    },
    {
      header: t("page.purchaseReturn.list.header.store"),
      render: (item) => <span className="text-sm">{item.storeData?.name || "-"}</span>
    },
    {
      header: t("page.purchaseReturn.list.header.items"),
      align: "center",
      render: (item) => <span className="font-mono text-sm">{item.items?.length || 0}</span>
    },
    {
      header: t("page.purchaseReturn.list.header.reason"),
      render: (item) => (
        <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
          {item.reason || "-"}
        </span>
      )
    },
    {
      header: t("page.purchaseReturn.list.header.returnedBy"),
      render: (item) => <span className="text-sm">{item.returnedBy?.name || "-"}</span>
    },
    {
      header: t("page.purchaseReturn.list.header.status"),
      align: "center",
      render: (item) => {
        const sc = statusCfg[item.status] || statusCfg.pending;
        const res = item.resolution;
        return (
          <div className="inline-flex flex-col items-center gap-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sc.class}`}>
              {t(`page.purchaseReturn.status.${item.status}`)}
            </span>
            {res && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  res === "replacement"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                }`}>
                {t(`page.purchaseReturn.resolution.${res}`)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: t("common.createdBy"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.returnedBy?.name || item.returnedBy?.fullName || "-"}
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
            {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}{" "}
            {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
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
      header: t("common.updatedAt"),
      render: (item) => {
        if (!item.updatedAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(item.updatedAt);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}{" "}
            {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("page.purchaseReturn.list.header.aksi"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: CheckCircle, label: t("common.approve") },
        { icon: XCircle, label: t("common.reject") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          visible={2}
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/purchase-return/detail?id=${item.id}`)
            },
            ...(item.status === "pending" && canAccess(user, MENU_KEY, "edit")
              ? [
                  {
                    label: t("common.approve"),
                    icon: CheckCircle,
                    onClick: () => {
                      setResolution("credit");
                      setActionTarget(item.id);
                      setActionType("approve");
                    }
                  },
                  {
                    label: t("common.reject"),
                    icon: XCircle,
                    danger: true,
                    onClick: () => {
                      setActionTarget(item.id);
                      setActionType("reject");
                    }
                  }
                ]
              : [])
          ]}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("page.purchaseReturn.list.breadcrumb.dashboard"),
            href: "/dashboard-super-admin"
          },
          { label: t("page.purchaseReturn.list.title") }
        ]}
        title={t("page.purchaseReturn.list.title")}
        description={t("page.purchaseReturn.list.subtitle")}
      />

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isFetching || isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label={t("page.purchaseReturn.list.title")}
                value={total}
                icon={ClipboardList}
                variant="default"
              />
              <StatCard
                label={t("page.purchaseReturn.status.approved")}
                value={data?.stats?.approved ?? 0}
                icon={CheckCircle}
                variant="active"
              />
              <StatCard
                label={t("page.purchaseReturn.status.pending")}
                value={data?.stats?.pending ?? 0}
                icon={Hourglass}
                variant="draft"
              />
              <StatCard
                label={t("page.purchaseReturn.status.rejected")}
                value={data?.stats?.rejected ?? 0}
                icon={XCircle}
                variant="inactive"
              />
            </div>
          )}

          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div>
              <DataTable
                columns={columns}
                data={items}
                isLoading={isLoading || isFetching}
                emptyMessage={t("page.purchaseReturn.list.emptyMessage")}
                toolbar={
                  <TableToolbar
                    title={t("page.purchaseReturn.list.title")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="purchase-return-list-search"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.purchaseReturn.list.filter.search")}
                      </label>
                      <SearchInput
                        id="purchase-return-list-search"
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.purchaseReturn.list.placeholder.search")}
                        isLoading={isFetching}
                      />
                    </div>
                    {isSuperAdmin && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("page.purchaseReturn.list.filter.store")}
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
                        htmlFor="purchase-return-list-date"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.purchaseReturn.list.filter.date")}
                      </label>
                      <DatePicker
                        id="purchase-return-list-date"
                        date={dateFilter}
                        setDate={(date) => {
                          setDateFilter(date);
                          setPage(1);
                        }}
                        placeholder={t("page.purchaseReturn.list.filter.date")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="purchase-return-list-status"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.purchaseReturn.list.filter.status")}
                      </label>
                      <Combobox
                        id="purchase-return-list-status"
                        options={[
                          {
                            value: "all",
                            label: t("page.purchaseReturn.list.filter.allStatus")
                          },
                          ...Object.keys(statusCfg).map((k) => ({
                            value: k,
                            label: t(`page.purchaseReturn.status.${k}`)
                          }))
                        ]}
                        value={statusFilter}
                        onChange={(val) => {
                          setStatusFilter(val);
                          setPage(1);
                        }}
                        placeholder={t("page.purchaseReturn.list.filter.allStatus")}
                        searchPlaceholder={t("common.search")}
                      />
                    </div>
                  </TableToolbar>
                }
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
          )}

          {actionType === "approve" && (
            <Modal
              type="form"
              open={!!actionTarget}
              onOpenChange={(o) =>
                !o && (setActionTarget(null), setActionType(null), setResolution("credit"))
              }
              title={t("page.purchaseReturn.list.modal.approveTitle")}
              description={t("page.purchaseReturn.list.modal.approveResolutionSub")}
              confirmText={t("page.purchaseReturn.list.modal.approveConfirm")}
              loading={approveMut.isLoading}
              onConfirm={() => approveMut.mutate({ id: actionTarget, resolution })}
              className="sm:max-w-[520px]">
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    value: "credit",
                    label: t("page.purchaseReturn.resolution.credit"),
                    desc: t("page.purchaseReturn.list.modal.approveCreditDesc")
                  },
                  {
                    value: "replacement",
                    label: t("page.purchaseReturn.resolution.replacement"),
                    desc: t("page.purchaseReturn.list.modal.approveReplacementDesc")
                  }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResolution(opt.value)}
                    className={`w-full text-left rounded-xl border-2 p-3.5 transition-colors ${
                      resolution === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}>
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          resolution === opt.value ? "border-primary" : "border-muted-foreground/40"
                        }`}>
                        {resolution === opt.value && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Modal>
          )}

          {actionType === "reject" && (
            <Modal
              type="confirm"
              open={!!actionTarget}
              onOpenChange={(o) => !o && (setActionTarget(null), setActionType(null))}
              title={t("page.purchaseReturn.list.modal.rejectTitle")}
              description={t("page.purchaseReturn.list.modal.rejectDesc")}
              confirmText={t("page.purchaseReturn.list.modal.rejectConfirm")}
              confirmVariant="destructive"
              onConfirm={() => rejectMut.mutate(actionTarget)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PurchaseReturnList;

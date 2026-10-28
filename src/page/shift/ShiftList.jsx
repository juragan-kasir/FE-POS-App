import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Clock3,
  CheckCircle,
  FileEdit,
  XCircle,
  Eye,
  CalendarDays,
  Users,
  RefreshCcw,
  CalendarClock,
  AlertTriangle,
  Store,
  Shuffle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAllShift, deleteShift, editShift } from "@/services/shift";
import { getShiftSwaps } from "@/services/shiftSwap";
import { DEFAULT_SHIFT_TYPE, SHIFT_TYPE_LABELS, SHIFT_TYPES } from "@/constants/shiftTypes";
import { safeGet } from "@/lib/safe-lookup";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import StatCard from "@/components/ui/StatCard";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import ExtendShiftModal from "./ExtendShiftModal";
import SwapApproval from "./SwapApproval";
import TableActions from "@/components/ui/TableActions";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const fmtShort = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" });
};

const ShiftList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [extendTarget, setExtendTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [activeTab, setActiveTab] = useState("shifts");

  const isFiltered = search !== "" || statusFilter !== "all" || storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGlobalStoreFilter("all");
    setPage(1);
  };

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const canDecideSwap = isSuperAdmin || user?.roleType === "admin";
  const MENU_KEY = "/shift-list";
  const locationParam = user?.store || "";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin || activeTab === "approval"
  });

  const effectiveStore = isSuperAdmin ? (storeFilter !== "all" ? storeFilter : "") : locationParam;

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["shifts", page, limit, search, statusFilter, effectiveStore],
    () => getAllShift({ store: effectiveStore, page, limit, statusShift: statusFilter, search }),
    { keepPreviousData: true }
  );

  const { data: swapStatsData } = useQuery(
    ["shift-swaps-stats", effectiveStore],
    () => getShiftSwaps({ store: effectiveStore, page: 1, pageSize: 1, status: "" }),
    { enabled: canDecideSwap }
  );
  const pendingSwaps = swapStatsData?.stats?.pending || 0;

  const deleteMutation = useMutation(deleteShift, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.shift.toast.deleteSuccess") });
      queryClient.invalidateQueries(["shifts"]);
    },
    onError: (err) => {
      toast.error(t("common.failed"), { description: err?.response?.data?.message || err.message });
    }
  });

  const extendMutation = useMutation((payload) => editShift({ id: payload.id, ...payload.data }), {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.shift.ui.shiftPeriodExtended") });
      queryClient.invalidateQueries(["shifts"]);
      setExtendTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.failed"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const shifts = data?.data || [];
  const pagination = data?.pagination || {};
  const total = pagination?.total || pagination?.totalItems || data?.total || 0;
  const totalPages = pagination?.totalPages || Math.ceil(total / limit) || 1;
  const stats = data?.stats || {};
  const statsTotal = stats.total ?? total;
  const isActive = (s) => s === "active" || s === true || s === 1;
  const isInactive = (s) => s === "inactive" || s === false || s === 0;
  const activeCount = stats.active ?? shifts.filter((s) => isActive(s.status)).length;
  const draftCount = stats.draft ?? shifts.filter((s) => s.status === "draft").length;
  const inactiveCount = stats.inactive ?? shifts.filter((s) => isInactive(s.status)).length;

  const todayMidnight = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const expiringShifts = React.useMemo(
    () =>
      shifts.filter((s) => {
        if (!s.tanggal_selesai) return false;
        const end = new Date(s.tanggal_selesai);
        if (isNaN(end.getTime())) return false;
        end.setHours(0, 0, 0, 0);
        const diff = Math.round((end - todayMidnight()) / 86400000);
        return s.status === "active" && diff <= 5;
      }),
    [shifts]
  );

  const handleDelete = (shift) => {
    setDeleteTarget(shift);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const getLocationName = (storeId) =>
    locData?.data?.find((l) => String(l.id) === String(storeId))?.name || null;

  const columns = [
    {
      header: t("page.shift.table.name"),
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            {row.nama_shift?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.nama_shift || "-"}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {SHIFT_TYPES.includes(row.tipe_shift)
                ? safeGet(SHIFT_TYPE_LABELS, row.tipe_shift, row.tipe_shift)
                : safeGet(SHIFT_TYPE_LABELS, DEFAULT_SHIFT_TYPE, DEFAULT_SHIFT_TYPE)}
            </p>
          </div>
        </div>
      )
    },
    {
      header: "Toko",
      render: (row) => {
        const loc = locData?.data?.find((l) => String(l.id) === String(row.store));
        return (
          <span className="text-sm font-medium text-foreground">
            {loc?.name || row.store || "-"}
          </span>
        );
      }
    },
    {
      header: t("page.shift.table.startTime"),
      render: (row) => (
        <span className="font-mono text-sm font-medium">{row.jam_mulai?.slice(0, 5) || "-"}</span>
      )
    },
    {
      header: t("page.shift.table.endTime"),
      render: (row) => (
        <span className="font-mono text-sm font-medium">{row.jam_selesai?.slice(0, 5) || "-"}</span>
      )
    },
    {
      header: "Tanggal",
      render: (row) => (
        <div className="text-sm">
          <div className="flex items-center gap-1.5 text-foreground">
            <CalendarDays size={12} className="shrink-0 text-muted-foreground" />
            <span>
              {row.tanggal_mulai
                ? new Date(row.tanggal_mulai).toLocaleDateString(dateLocale(), {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })
                : "-"}
            </span>
          </div>
          {row.tanggal_selesai && (
            <p className="text-xs text-muted-foreground mt-0.5 ml-4">
              s/d{" "}
              {new Date(row.tanggal_selesai).toLocaleDateString(dateLocale(), {
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </p>
          )}
        </div>
      )
    },
    {
      header: "Karyawan",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Users size={13} className="shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{row.karyawan?.length || 0}</span>
        </div>
      )
    },
    {
      header: t("page.shift.table.status"),
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isActive(row.status)
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : isInactive(row.status)
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}>
          {isActive(row.status)
            ? t("common.active")
            : isInactive(row.status)
              ? t("common.inactive")
              : t("common.draft")}
        </span>
      )
    },
    {
      header: t("common.createdAt"),
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString(dateLocale(), {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
            : "-"}
        </span>
      )
    },
    {
      header: t("common.createdBy"),
      render: (row) => (
        <span className="text-sm">
          {row.createdByUser?.fullName || row.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("common.updatedAt"),
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {row.updatedAt
            ? new Date(row.updatedAt).toLocaleDateString(dateLocale(), {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
            : "-"}
        </span>
      )
    },
    {
      header: t("common.modifiedBy"),
      render: (row) => (
        <span className="text-sm">
          {row.modifiedByUser?.fullName || row.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("common.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.detail") },
        { icon: CalendarClock, label: t("page.discount.list.extend.title") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (row) => (
        <TableActions
          visible={2}
          align="center"
          items={[
            {
              label: t("common.detail"),
              icon: Eye,
              onClick: () => navigate(`/detail-shift?id=${row.id || row._id}`)
            },
            {
              label: t("page.shift.ui.extendShift"),
              icon: CalendarClock,
              onClick: () => setExtendTarget(row),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/edit-shift?id=${row.id || row._id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => handleDelete(row),
              hidden: !canAccess(user, MENU_KEY, "delete")
            }
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
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("page.shift.list.title"), i18nKey: "page.shift.list.title" }
        ]}
        title={t("page.shift.list.title")}
        description={t("page.shift.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-shift")}
            className="gap-2 shrink-0"
            data-tour="shift-add">
            <Plus size={18} />
            {t("breadcrumb.add")}
          </Button>
        )}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto w-fit">
          <TabsTrigger value="shifts" className="gap-2">
            <Clock3 size={15} />
            {t("page.shift.list.tabShift")}
          </TabsTrigger>
          {canDecideSwap && (
            <TabsTrigger value="approval" className="gap-2">
              <Shuffle size={14} />
              {t("page.shift.list.tabSwap")}
              {pendingSwaps > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {pendingSwaps}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="shifts" className="mt-4 space-y-6">
          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <>
              {locData && (locData?.data || []).length === 0 ? (
                <NoStore />
              ) : (
                <>
                  {isFetching || isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <StatCard
                        label={t("page.shift.list.total")}
                        value={statsTotal}
                        icon={Clock3}
                        variant="default"
                      />
                      <StatCard
                        label={t("common.active")}
                        value={activeCount}
                        icon={CheckCircle}
                        variant="active"
                      />
                      <StatCard
                        label={t("common.draft")}
                        value={draftCount}
                        icon={FileEdit}
                        variant="draft"
                      />
                      <StatCard
                        label={t("common.inactive")}
                        value={inactiveCount}
                        icon={XCircle}
                        variant="inactive"
                      />
                    </div>
                  )}

                  {/* Expiring shifts banner */}
                  {expiringShifts.length > 0 && !isFetching && !isLoading && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200/70 dark:border-amber-800/60 bg-amber-100/60 dark:bg-amber-900/20">
                        <AlertTriangle
                          size={15}
                          className="shrink-0 text-amber-600 dark:text-amber-400"
                        />
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          {expiringShifts.length} {t("page.shift.list.expiring")}
                        </p>
                        <span className="ml-auto text-xs text-amber-700/80 dark:text-amber-400/80">
                          {t("page.shift.list.expiringHint")}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3">
                        {expiringShifts.map((s) => {
                          const end = new Date(s.tanggal_selesai);
                          end.setHours(0, 0, 0, 0);
                          const diff = Math.round((end - todayMidnight()) / 86400000);
                          const isPast = diff < 0;
                          const badgeClass = isPast
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : diff <= 1
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                          const storeName = getLocationName(s.store);
                          return (
                            <div
                              key={s.id || s._id}
                              className="rounded-lg bg-background border border-border p-3 group">
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badgeClass}`}>
                                  <Clock size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {s.nama_shift || "-"}
                                    </p>
                                    <span
                                      className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                                      {isPast
                                        ? "Sudah berakhir"
                                        : diff === 0
                                          ? "Hari ini"
                                          : diff === 1
                                            ? "Besok"
                                            : `${diff} hari lagi`}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                                    <Store size={10} className="shrink-0" />
                                    {storeName || `Toko #${s.store || "-"}`}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2.5 pt-2.5 border-t border-border/60 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock3 size={10} className="shrink-0" />
                                  <span className="font-mono">
                                    {s.jam_mulai?.slice(0, 5)} - {s.jam_selesai?.slice(0, 5)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <CalendarDays size={10} className="shrink-0" />
                                  <span>
                                    {s.tanggal_mulai ? fmtShort(s.tanggal_mulai) : "-"} –{" "}
                                    {s.tanggal_selesai ? fmtShort(s.tanggal_selesai) : "-"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Users size={10} className="shrink-0" />
                                  <span>{s.karyawan?.length || 0} karyawan</span>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-2.5 w-full h-7 gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                onClick={() => setExtendTarget(s)}>
                                <RefreshCcw size={11} />
                                {t("page.shift.list.extend")}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div data-tour="shift-table">
                    <DataTable
                      emptyAction={
                        canAccess(user, MENU_KEY, "add")
                          ? { label: t("breadcrumb.add"), onClick: () => navigate("/add-shift") }
                          : undefined
                      }
                      columns={columns}
                      data={shifts}
                      isLoading={isLoading || isFetching}
                      emptyIcon={Clock}
                      emptyMessage={t("page.shift.list.empty")}
                      toolbar={
                        <TableToolbar
                          title={t("page.shift.list.title")}
                          onReset={resetFilters}
                          isFiltered={isFiltered}>
                          {isSuperAdmin && (
                            <div className="flex flex-col gap-1.5">
                              <label
                                htmlFor="shift-list-store"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t("page.goodsReceipt.detail.store")}
                              </label>
                              <Combobox
                                id="shift-list-store"
                                options={[
                                  { value: "all", label: t("page.employee.list.allStores") },
                                  ...(locData?.data || []).map((loc) => ({
                                    value: loc.id,
                                    label: loc.name
                                  }))
                                ]}
                                value={storeFilter}
                                onChange={(v) => {
                                  setGlobalStoreFilter(v);
                                  setPage(1);
                                }}
                                placeholder={t("page.employee.list.allStores")}
                                searchPlaceholder="Cari toko..."
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor="shift-list-status"
                              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {t("common.status")}
                            </label>
                            <Combobox
                              id="shift-list-status"
                              options={[
                                { value: "all", label: t("common.all") },
                                { value: "active", label: t("common.active") },
                                { value: "inactive", label: t("common.inactive") },
                                { value: "draft", label: t("common.draft") }
                              ]}
                              value={statusFilter}
                              onChange={(v) => {
                                setStatusFilter(v);
                                setPage(1);
                              }}
                              placeholder={t("common.all")}
                              searchPlaceholder="Cari..."
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor="shift-list-search"
                              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {t("common.search")}
                            </label>
                            <SearchInput
                              id="shift-list-search"
                              value={search}
                              onChange={(val) => {
                                setSearch(val);
                                setPage(1);
                              }}
                              placeholder={t("page.shift.list.search")}
                              isLoading={isFetching}
                            />
                          </div>
                        </TableToolbar>
                      }
                      pagination={{
                        page,
                        totalPages,
                        total,
                        onPageChange: (p) => setPage(p),
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
        </TabsContent>

        <TabsContent value="approval" className="mt-4">
          <SwapApproval user={user} store={effectiveStore} locations={locData?.data || []} />
        </TabsContent>
      </Tabs>

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.shift.modal.deleteTitle")}
        description={t("page.shift.modal.deleteDesc", { name: deleteTarget?.nama_shift || "" })}
        confirmText={t("page.shift.modal.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      <ExtendShiftModal
        open={!!extendTarget}
        onOpenChange={() => setExtendTarget(null)}
        shift={extendTarget}
        locationName={extendTarget ? getLocationName(extendTarget.store) : null}
        isSaving={extendMutation.isLoading}
        onSave={(data) =>
          extendMutation.mutate({ id: extendTarget?.id || extendTarget?._id, data })
        }
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default ShiftList;

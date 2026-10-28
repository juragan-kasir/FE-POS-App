import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Store,
  Map,
  Target,
  Building2,
  CheckCircle,
  XCircle,
  FileEdit,
  Archive,
  ArchiveRestore
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllLocationTable,
  deleteLocation,
  editLocation,
  archiveLocation,
  reactivateLocation
} from "@/services/location";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/SearchInput";
import { Combobox } from "@/components/ui/combobox";
import Modal from "@/components/organism/modal";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { canAccess } from "@/utils/permission";
import { isAdminRole } from "@/utils/role";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import TableActions from "@/components/ui/TableActions";
import { qk } from "@/queries/keys";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const LocationList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const MENU_KEY = "/location-list";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [archiveModal, setArchiveModal] = useState({
    open: false,
    location: null,
    mode: "archive"
  });
  const [archiveReason, setArchiveReason] = useState("");
  const [targetModal, setTargetModal] = useState({ open: false, location: null, value: 0 });

  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    ["locations", page, limit, search, statusFilter],
    () =>
      getAllLocationTable({
        page,
        limit,
        search: search || undefined,
        statusLocation: statusFilter
      }),
    { retry: 1, keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteLocation, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.location.toast.success") });
      queryClient.invalidateQueries(["locations"]);
      queryClient.invalidateQueries(qk.locations.all());
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.error"), { description: err.message });
      setDeleteTarget(null);
    }
  });

  // DR-24 C-04: archive/reactivate is an elevated action (D-03) — the reason
  // is mandatory and the server audits it and enforces the preconditions.
  const archiveMutation = useMutation(
    ({ mode, id, reason }) =>
      mode === "archive" ? archiveLocation({ id, reason }) : reactivateLocation({ id, reason }),
    {
      onSuccess: () => {
        toast.success(t("common.success"));
        setArchiveModal({ open: false, location: null, mode: "archive" });
        setArchiveReason("");
        queryClient.invalidateQueries(["locations"]);
        queryClient.invalidateQueries(qk.locations.all());
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  const isFiltered = search !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const targetMutation = useMutation(({ id, dailyTarget }) => editLocation({ id, dailyTarget }), {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.location.ui.targetUpdated") });
      setTargetModal({ open: false, location: null, value: 0 });
      queryClient.invalidateQueries(["locations"]);
      queryClient.invalidateQueries(qk.locations.all());
    },
    onError: (err) => toast.error(t("common.error"), { description: err.message })
  });

  const locations = data?.data || data?.locations || [];
  const total = data?.total || data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1;

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget });
    }
  };

  const columns = [
    {
      header: t("page.location.table.storeId"),
      render: (loc) => (
        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
          {loc.storeId || loc.code || `ST-${String(loc.id).padStart(3, "0")}`}
        </span>
      )
    },
    {
      header: t("page.location.table.image"),
      render: (loc) => (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border">
          {loc.image ? (
            <img src={loc.image} alt={loc.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Store size={16} />
            </div>
          )}
        </div>
      )
    },
    {
      header: t("page.location.table.storeName"),
      render: (loc) => (
        <div>
          <p className="font-medium text-foreground">{loc.name}</p>
          <p className="text-xs text-muted-foreground">
            {loc.description || loc.type || "Main Branch"}
          </p>
        </div>
      )
    },
    {
      header: t("page.location.table.category"),
      render: (loc) => (
        <span className="text-sm font-medium text-foreground">{loc.category || "Main Branch"}</span>
      )
    },
    {
      header: t("page.location.table.address"),
      render: (loc) => (
        <p className="text-sm text-muted-foreground max-w-[180px] truncate">{loc.address}</p>
      )
    },
    {
      header: t("page.location.table.province"),
      render: (loc) => (
        <span className="text-xs text-muted-foreground">
          {loc.provinceName || loc.province || "-"}
        </span>
      )
    },
    {
      header: t("page.location.table.city"),
      render: (loc) => (
        <span className="text-xs text-muted-foreground">{loc.cityName || loc.city || "-"}</span>
      )
    },
    {
      header: t("page.location.table.district"),
      render: (loc) => (
        <span className="text-xs text-muted-foreground">
          {loc.districtName || loc.district || "-"}
        </span>
      )
    },
    {
      header: t("page.location.table.village"),
      render: (loc) => (
        <span className="text-xs text-muted-foreground">
          {loc.villageName || loc.village || "-"}
        </span>
      )
    },
    {
      header: t("page.location.table.postalCode"),
      render: (loc) => (
        <span className="font-mono text-xs text-foreground">{loc.postalCode || "-"}</span>
      )
    },
    {
      header: t("page.location.table.phoneNumber"),
      render: (loc) => (
        <span className="font-mono text-xs text-foreground">
          {loc.phoneNumber || loc.phone || "-"}
        </span>
      )
    },
    {
      header: t("page.location.table.status"),
      render: (loc) => {
        const status = loc.status || (loc.isActive ? "active" : "inactive");
        const styles = {
          active:
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
          inactive:
            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
          draft:
            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
        };
        const labels = {
          active: t("common.active"),
          inactive: t("common.inactive"),
          draft: t("common.draft")
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${safeGet(
              styles,
              status,
              styles.inactive
            )}`}>
            {safeGet(labels, status, labels.inactive)}
          </span>
        );
      }
    },
    {
      header: t("page.location.table.socialMedia"),
      render: (loc) => {
        const count = loc.socialMedia?.length || 0;
        return (
          <span className="text-xs text-foreground">
            {count > 0 ? `${count} ${t("page.location.table.socialMedia").toLowerCase()}` : "-"}
          </span>
        );
      }
    },
    {
      header: t("page.location.table.dailyTarget"),
      render: (loc) => (
        <span className="text-xs font-semibold text-foreground">
          {loc.dailyTarget ? `Rp ${Number(loc.dailyTarget).toLocaleString("id-ID")}` : "-"}
        </span>
      )
    },
    {
      header: t("page.location.table.createdBy"),
      render: (loc) => (
        <span className="text-xs text-muted-foreground">{loc.createdByUser?.fullName || "-"}</span>
      )
    },
    {
      header: t("page.location.table.createdAt"),
      render: (loc) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {loc.createdAt
            ? new Date(loc.createdAt).toLocaleDateString("id-ID", {
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
      header: t("page.location.table.modifiedBy"),
      render: (loc) => (
        <span className="text-xs text-muted-foreground">{loc.modifiedByUser?.fullName || "-"}</span>
      )
    },
    {
      header: t("page.location.table.updatedAt"),
      render: (loc) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {loc.updatedAt
            ? new Date(loc.updatedAt).toLocaleDateString("id-ID", {
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
      header: t("common.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Target, label: t("page.location.setTarget") },
        { icon: Edit, label: t("common.edit") },
        { icon: Archive, label: t("page.location.archive") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (loc) => (
        <TableActions
          visible={2}
          align="center"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/detail-location?id=${loc.id || loc._id}`),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            {
              label: t("page.location.setTarget") || "Set Target",
              icon: Target,
              onClick: () =>
                setTargetModal({ open: true, location: loc, value: loc.dailyTarget || 0 }),
              hidden: !canAccess(user, MENU_KEY, "edit") || loc.status !== "active"
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/edit-location?id=${loc.id || loc._id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("page.location.archive"),
              icon: Archive,
              onClick: () => setArchiveModal({ open: true, location: loc, mode: "archive" }),
              hidden:
                loc.status === "archived" ||
                !isAdminRole(user) ||
                !canAccess(user, MENU_KEY, "delete")
            },
            {
              label: t("page.location.reactivate"),
              icon: ArchiveRestore,
              onClick: () => setArchiveModal({ open: true, location: loc, mode: "reactivate" }),
              hidden:
                loc.status !== "archived" ||
                !isAdminRole(user) ||
                !canAccess(user, MENU_KEY, "delete")
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => handleDelete(loc.id || loc._id),
              hidden: !canAccess(user, MENU_KEY, "delete")
            }
          ]}
        />
      )
    }
  ];

  return (
    <div data-tour="page-location" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("page.location.list.title"), i18nKey: "page.location.list.title" }
        ]}
        title={t("page.location.list.title")}
        description={t("page.location.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            data-tour="location-add"
            onClick={() => navigate("/add-location")}
            className="shrink-0">
            <Plus size={18} />
            {t("breadcrumb.add")}
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <div>
          <div className="space-y-6">
            {isLoading ? (
              <>
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
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StatCard
                    label={t("page.location.stats.total")}
                    value={(data?.stats?.total ?? data?.total ?? 0).toLocaleString()}
                    icon={Building2}
                    variant="default"
                    subtitle={t("page.location.stats.totalSub")}
                  />
                  <StatCard
                    label={t("page.location.stats.cities")}
                    value={(data?.stats?.cities ?? 0).toLocaleString()}
                    icon={Map}
                    variant="gold"
                    subtitle={`${(data?.stats?.total ?? 0) > 0 ? Math.round(((data?.stats?.cities ?? 0) / (data?.stats?.total ?? 1)) * 100) : 0}% ${t("page.location.stats.citiesSub")}`}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    label={t("page.location.stats.active")}
                    value={(data?.stats?.active ?? 0).toLocaleString()}
                    icon={CheckCircle}
                    variant="active"
                    subtitle={`${(data?.stats?.total ?? 0) > 0 ? Math.round(((data?.stats?.active ?? 0) / (data?.stats?.total ?? 1)) * 100) : 0}% ${t("page.location.stats.activeSub")}`}
                  />
                  <StatCard
                    label={t("page.location.stats.inactive")}
                    value={(data?.stats?.inactive ?? 0).toLocaleString()}
                    icon={XCircle}
                    variant="inactive"
                    subtitle={t("page.location.stats.inactiveSub")}
                  />
                  <StatCard
                    label={t("page.location.stats.draft")}
                    value={(data?.stats?.draft ?? 0).toLocaleString()}
                    icon={FileEdit}
                    variant="draft"
                    subtitle={t("page.location.stats.draftSub")}
                  />
                </div>
              </>
            )}

            <div data-tour="location-table" className="mt-6">
              <DataTable
                emptyAction={
                  canAccess(user, MENU_KEY, "add")
                    ? { label: t("breadcrumb.add"), onClick: () => navigate("/add-location") }
                    : undefined
                }
                columns={columns}
                data={locations}
                isLoading={isLoading || isFetching}
                emptyMessage={t("page.location.list.empty")}
                toolbar={
                  <TableToolbar
                    title={t("page.location.list.title")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="location-list-search"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.search")}
                      </label>
                      <SearchInput
                        id="location-list-search"
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.location.list.search")}
                        isLoading={isFetching}
                        className="w-full md:w-60"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="location-list-status"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.status")}
                      </label>
                      <Combobox
                        id="location-list-status"
                        options={[
                          { value: "all", label: t("common.all") },
                          { value: "active", label: t("common.active") },
                          { value: "inactive", label: t("common.inactive") },
                          { value: "draft", label: t("common.draft") }
                        ]}
                        value={statusFilter}
                        onChange={(val) => {
                          setStatusFilter(val);
                          setPage(1);
                        }}
                        placeholder={t("common.all")}
                        searchPlaceholder={t("common.all")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.location.button.viewMap")}
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        onClick={() => navigate("/store-geospatial")}>
                        <Map size={14} />
                        {t("page.location.button.viewMap")}
                      </Button>
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

            <div className="mt-6">
              {/* Map Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div
                  className="md:col-span-2 bg-card rounded-xl border border-border p-6 h-48 relative overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors group"
                  onClick={() => navigate("/store-geospatial")}>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 group-hover:from-primary/10 group-hover:to-primary/20 transition-all" />
                  <div className="relative z-10 text-center">
                    <Map size={32} className="text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      {t("page.location.button.viewMap")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.location.button.viewMapDescription")}
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      {t("page.location.button.viewMap")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.location.modal.deleteTitle")}
        description={t("page.location.modal.deleteDesc")}
        confirmText={t("page.location.modal.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />

      <Modal
        type="form"
        open={archiveModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveModal({ open: false, location: null, mode: "archive" });
            setArchiveReason("");
          }
        }}
        title={
          archiveModal.mode === "archive"
            ? t("page.location.archiveTitle")
            : t("page.location.reactivateTitle")
        }
        description={archiveModal.location?.name || ""}
        confirmText={
          archiveModal.mode === "archive"
            ? t("page.location.archive")
            : t("page.location.reactivate")
        }
        loading={archiveMutation.isLoading}
        onConfirm={() => {
          const reason = archiveReason.trim();
          if (!reason) {
            toast.error(t("page.location.archiveReasonRequired"));
            return;
          }
          archiveMutation.mutate({
            mode: archiveModal.mode,
            id: archiveModal.location?.id || archiveModal.location?._id,
            reason
          });
        }}>
        <div className="py-2">
          <label
            htmlFor="location-list-archive-reason"
            className="text-sm font-medium text-foreground mb-1.5 block">
            {t("page.location.archiveReason")}
          </label>
          <Textarea
            id="location-list-archive-reason"
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
            placeholder={t("page.location.archiveReasonPlaceholder")}
            maxLength={FIELD_LIMITS.DESCRIPTION}
          />
        </div>
      </Modal>

      <Modal
        type="form"
        open={targetModal.open}
        onOpenChange={(open) => !open && setTargetModal({ open: false, location: null, value: 0 })}
        title={t("page.location.setTarget") || "Set Daily Target"}
        description={targetModal.location ? `${targetModal.location.name}` : ""}
        loading={targetMutation.isLoading}
        confirmText={t("common.save")}
        onConfirm={() =>
          targetMutation.mutate({
            id: targetModal.location?.id || targetModal.location?._id,
            dailyTarget: Number(targetModal.value) || 0
          })
        }>
        <div className="py-2">
          <label
            htmlFor="location-list-target-amount"
            className="text-sm font-medium text-muted-foreground mb-1 block">
            {t("page.dashboard.targetAmount") || "Target per Hari (Rp)"}
          </label>
          <div className="relative">
            <input
              id="location-list-target-amount"
              type="text"
              value={
                targetModal.value ? `Rp ${Number(targetModal.value).toLocaleString("id-ID")}` : ""
              }
              onChange={(e) =>
                setTargetModal({ ...targetModal, value: e.target.value.replace(/[^0-9]/g, "") })
              }
              placeholder="Rp 0"
              className="w-full h-12 px-4 text-lg font-bold rounded-xl bg-accent/50 border border-border/60 outline-none focus:border-primary/50 transition-colors text-right"
              inputMode="numeric"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LocationList;

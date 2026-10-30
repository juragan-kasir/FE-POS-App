import React, { useState } from "react";
import { usePageParam, useSearchParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Sofa,
  QrCode,
  RotateCcw,
  CheckCircle,
  XCircle,
  FileEdit,
  Utensils
} from "lucide-react";
import {
  getTablesByStore,
  addTable,
  editTable,
  deleteTable,
  updateTableStatus
} from "@/services/table";
import NoStore from "@/components/ui/NoStore";
import StoreFilterField from "@/components/ui/StoreFilterField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import TableQRModal from "@/components/organism/TableQRModal";
import { useTranslation } from "react-i18next";
import { canAccess } from "@/utils/permission";
import { isAdminRole } from "@/utils/role";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import TableActions from "@/components/ui/TableActions";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { dateLocale } from "@/lib/locale";

const statusColors = {
  available: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  occupied: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  reserved: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  maintenance: "bg-muted text-foreground"
};

const TableList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const MENU_KEY = "/table";
  const isSuperAdmin = user?.roleType === "super_admin";
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const locationParam = isSuperAdmin
    ? storeFilter === "all"
      ? ""
      : storeFilter
    : user?.store?.toString() || "";

  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useSearchParam();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [qrTarget, setQrTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState(4);
  const [formArea, setFormArea] = useState("indoor");
  const [formTableType, setFormTableType] = useState("regular");
  const [formStore, setFormStore] = useState("");

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["tables", locationParam, page, limit, search],
    () => getTablesByStore({ location: locationParam, page, limit, search }),
    { keepPreviousData: true }
  );

  const isFiltered = search !== "" || storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setGlobalStoreFilter("all");
  };

  const deleteMutation = useMutation(deleteTable, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.table.toast.deleted") });
      refetch();
    },
    onError: (err) => {
      toast.error(t("common.error"), { description: err?.response?.data?.message || err.message });
    }
  });

  const [statusTarget, setStatusTarget] = useState(null);
  const [releaseReason, setReleaseReason] = useState("");

  // DR-24 C-16 / D-03: releasing a table is an elevated action — the reason
  // is mandatory and the server audits it (admin-only).
  const statusMutation = useMutation(
    ({ id, reason }) => updateTableStatus(id, { status: "available", reason }),
    {
      onSuccess: () => {
        toast.success(t("common.success"));
        setStatusTarget(null);
        setReleaseReason("");
        queryClient.invalidateQueries(["tables"]);
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  const saveMutation = useMutation(editTarget ? editTable : addTable, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: editTarget ? t("page.table.toast.updated") : t("page.table.toast.added")
      });
      setShowAddModal(false);
      setEditTarget(null);
      setFormName("");
      setFormCapacity(4);
      setFormArea("indoor");
      setFormTableType("regular");
      setFormStore("");
      refetch();
    },
    onError: (err) => {
      toast.error(t("common.error"), { description: err?.response?.data?.message || err.message });
    }
  });

  const tables = data?.data || [];
  const pagination = data?.pagination || {};
  const total = pagination?.total || pagination?.totalItems || data?.total || 0;
  const totalPages = pagination?.totalPages || Math.ceil(total / limit) || 1;

  const openEdit = (table) => {
    setEditTarget(table);
    setFormName(table.name || "");
    setFormCapacity(table.capacity || 4);
    setFormArea(table.area || "indoor");
    setFormTableType(table.tableType || "regular");
    setFormStore(table.store?.id ? String(table.store.id) : table.store?.toString() || "");
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error(t("page.table.validation.nameRequired"));
      return;
    }
    const storeId = isSuperAdmin ? formStore : locationParam;
    if (!storeId) {
      toast.error(t("page.table.validation.storeRequired"));
      return;
    }
    const payload = {
      store: storeId,
      name: formName,
      capacity: formCapacity,
      area: formArea,
      tableType: formTableType
    };
    if (editTarget) saveMutation.mutate({ id: editTarget.id || editTarget._id, ...payload });
    else saveMutation.mutate(payload);
  };

  const columns = [
    {
      header: t("page.table.table.name"),
      render: (row) => row.name || row.number || `${t("page.table.table.name")} ${row.id}`
    },
    {
      header: t("page.table.form.store"),
      render: (row) => {
        if (typeof row.store === "object" && row.store !== null) {
          return row.store.name || "-";
        }
        const loc = (locData?.data || []).find((l) => l.id === row.store);
        return loc?.name || row.store || "-";
      }
    },
    {
      header: t("page.table.table.capacity"),
      render: (row) => t("page.table.table.capacityValue", { capacity: row.capacity || "-" })
    },
    {
      header: t("page.table.table.area"),
      render: (row) => (
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
            row.area === "outdoor"
              ? "bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400"
              : row.area === "vip"
                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
          }`}>
          {t(`page.table.area.${row.area || "indoor"}`)}
        </span>
      )
    },
    {
      header: t("page.table.table.tableType"),
      render: (row) => t(`page.table.tableType.${row.tableType || "regular"}`)
    },
    {
      header: t("common.status"),
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${statusColors[row.status] || statusColors.available}`}>
            {t(`page.table.status.${row.status || "available"}`)}
          </span>
          {row.activeReservation && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="font-medium text-foreground">
                {row.activeReservation.customerName}
              </div>
              <div>
                {row.activeReservation.startTime?.slice(0, 5)} -{" "}
                {row.activeReservation.endTime?.slice(0, 5)}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      header: t("common.createdBy"),
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.createdByUser?.fullName || row.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.table.table.createdAt"),
      render: (row) => {
        if (!row.createdAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(row.createdAt);
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
      header: t("common.modifiedBy"),
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.modifiedByUser?.fullName || row.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.table.table.updatedAt"),
      render: (row) => {
        if (!row.updatedAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(row.updatedAt);
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
      header: t("common.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: RotateCcw, label: t("page.table.setAvailable") },
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: QrCode, label: t("common.qr") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (row) => (
        <TableActions
          visible={2}
          align="right"
          items={[
            ...(row.status === "reserved" || row.status === "occupied"
              ? [
                  {
                    label: t("page.table.setAvailable"),
                    icon: RotateCcw,
                    onClick: () => setStatusTarget(row),
                    // DR-24 C-16: staff release is admin-only; the server
                    // enforces it regardless of this visibility gate.
                    hidden: !isAdminRole(user)
                  }
                ]
              : []),
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/detail-table?id=${row.id || row._id}`),
              hidden: !canAccess(user, MENU_KEY, "detail")
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => openEdit(row),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.qr"),
              icon: QrCode,
              onClick: () => setQrTarget(row)
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => setDeleteTarget(row),
              hidden: !canAccess(user, MENU_KEY, "delete")
            }
          ]}
        />
      )
    }
  ];

  const canAddTable =
    canAccess(user, MENU_KEY, "add") && isSuperAdmin && (locData?.data || []).length > 0;
  const openAddTable = () => {
    setShowAddModal(true);
    setEditTarget(null);
    setFormName("");
    setFormCapacity(4);
    setFormArea("indoor");
    setFormTableType("regular");
    setFormStore(isSuperAdmin ? "" : locationParam);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.table"), i18nKey: "breadcrumb.table" }
        ]}
        title={t("page.table.list.title")}
        description={t("page.table.list.description")}>
        {canAddTable && (
          <Button variant="success" onClick={openAddTable} className="gap-2">
            <Plus size={18} />
            {t("page.table.button.add")}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label={t("page.table.stats.total")}
                    value={total}
                    icon={Utensils}
                    variant="default"
                  />
                  <StatCard
                    label={t("page.table.stats.available")}
                    value={data?.stats?.available ?? 0}
                    icon={CheckCircle}
                    variant="active"
                  />
                  <StatCard
                    label={t("page.table.stats.reserved")}
                    value={data?.stats?.reserved ?? 0}
                    icon={FileEdit}
                    variant="draft"
                  />
                  <StatCard
                    label={t("page.table.stats.occupied")}
                    value={data?.stats?.occupied ?? 0}
                    icon={XCircle}
                    variant="inactive"
                  />
                </div>
              )}

              <div data-tour="table-list-table">
                <DataTable
                  columns={columns}
                  data={tables}
                  isLoading={isLoading || isFetching}
                  emptyIcon={Sofa}
                  emptyMessage={t("page.table.list.empty")}
                  emptyAction={
                    canAddTable
                      ? { label: t("page.table.button.add"), onClick: openAddTable }
                      : undefined
                  }
                  toolbar={
                    <TableToolbar
                      title={t("page.table.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <StoreFilterField
                        id="table-list-store-filter"
                        label={t("page.goodsReceipt.detail.store")}
                        locations={locData?.data || []}
                        value={storeFilter}
                        onChange={(val) => {
                          setGlobalStoreFilter(val);
                          setPage(1);
                        }}
                        isSuperAdmin={isSuperAdmin}
                        t={t}
                      />
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="table-list-search"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.search")}
                        </label>
                        <SearchInput
                          id="table-list-search"
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                          }}
                          placeholder={t("page.table.list.search")}
                          isLoading={isFetching}
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
            </>
          )}

          <Modal
            type="form"
            open={showAddModal || editTarget !== null}
            onOpenChange={(open) => {
              if (!open) {
                setShowAddModal(false);
                setEditTarget(null);
              }
            }}
            title={editTarget ? t("page.table.modal.editTitle") : t("page.table.modal.addTitle")}
            confirmText={t("common.save")}
            onConfirm={handleSave}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="table-list-name"
                  className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.table.form.name")}
                </label>
                <Input
                  id="table-list-name"
                  placeholder={t("page.table.form.namePlaceholder")}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={FIELD_LIMITS.SHORT_LABEL}
                />
              </div>
              <div>
                <label
                  htmlFor="table-list-capacity"
                  className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.table.form.capacity")}
                </label>
                <Input
                  id="table-list-capacity"
                  type="number"
                  placeholder="4"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="table-list-area"
                    className="text-sm font-medium text-foreground mb-1.5 block">
                    {t("page.table.form.area")}
                  </label>
                  <Select value={formArea} onValueChange={setFormArea}>
                    <SelectTrigger id="table-list-area">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">{t("page.table.area.indoor")}</SelectItem>
                      <SelectItem value="outdoor">{t("page.table.area.outdoor")}</SelectItem>
                      <SelectItem value="vip">{t("page.table.area.vip")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    htmlFor="table-list-table-type"
                    className="text-sm font-medium text-foreground mb-1.5 block">
                    {t("page.table.form.tableType")}
                  </label>
                  <Select value={formTableType} onValueChange={setFormTableType}>
                    <SelectTrigger id="table-list-table-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">{t("page.table.tableType.regular")}</SelectItem>
                      <SelectItem value="round">{t("page.table.tableType.round")}</SelectItem>
                      <SelectItem value="booth">{t("page.table.tableType.booth")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="table-list-store"
                  className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.table.form.store")}
                </label>
                <Select value={formStore} onValueChange={setFormStore}>
                  <SelectTrigger id="table-list-store">
                    <SelectValue placeholder={t("page.table.form.storePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(locData?.data || []).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Modal>

          <Modal
            type="confirm"
            open={!!deleteTarget}
            onOpenChange={(o) => !o && setDeleteTarget(null)}
            title={t("page.table.modal.deleteTitle")}
            description={t("page.table.modal.deleteDescription", {
              name: deleteTarget?.name || ""
            })}
            confirmText={t("page.table.modal.confirmDelete")}
            loading={deleteMutation.isLoading}
            onConfirm={() => {
              deleteMutation.mutate(deleteTarget.id);
              setDeleteTarget(null);
            }}
          />
          {deleteMutation.isLoading && (
            <Loading fullscreen size="lg" label={t("common.loadingData")} />
          )}
          {saveMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}

          <Modal
            type="form"
            open={!!statusTarget}
            onOpenChange={(o) => {
              if (!o) {
                setStatusTarget(null);
                setReleaseReason("");
              }
            }}
            title={t("page.table.setAvailableTitle")}
            description={t("page.table.setAvailableDesc", { name: statusTarget?.name || "" })}
            confirmText={t("common.yes")}
            loading={statusMutation.isLoading}
            onConfirm={() => {
              const reason = releaseReason.trim();
              if (!reason) {
                toast.error(t("page.table.releaseReasonRequired"));
                return;
              }
              statusMutation.mutate({ id: statusTarget.id, reason });
            }}>
            <label
              htmlFor="table-list-release-reason"
              className="text-sm font-medium text-foreground mb-1.5 block">
              {t("page.table.releaseReason")}
            </label>
            <Textarea
              id="table-list-release-reason"
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder={t("page.table.releaseReasonPlaceholder")}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
          </Modal>

          <TableQRModal
            open={!!qrTarget}
            onOpenChange={(o) => !o && setQrTarget(null)}
            table={qrTarget}
          />
        </>
      )}
    </div>
  );
};

export default TableList;

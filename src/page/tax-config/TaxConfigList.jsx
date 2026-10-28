import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { safeGet } from "@/lib/safe-lookup";
import { getTaxType } from "@/utils/taxDisplay";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Percent,
  Loader2,
  Receipt,
  CheckCircle,
  FileEdit,
  XCircle,
  Table,
  Download,
  Upload,
  Globe,
  Store
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import {
  getAllTaxConfig,
  deleteTaxConfig,
  downloadTaxConfigTemplate,
  downloadTaxConfigExcel
} from "@/services/tax-config";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import StatCard from "@/components/ui/StatCard";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import { applyTaxConfig, getEffectiveTax, uploadTaxConfigExcel } from "@/services/tax-config";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import { useStore } from "@/contexts/StoreContext";
import EffectiveTaxSummary from "@/page/tax-config/components/EffectiveTaxSummary";
import {
  effectiveTaxQueryKey,
  outletNameFor,
  resolveEffectiveTaxScope,
  taxRowScope
} from "@/utils/taxEffective";
import { useLocations } from "@/queries/useLocations";

const typeColors = {
  PPN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PPh: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Non-Pajak": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
};

const TaxConfigList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [applyTarget, setApplyTarget] = useState(null);

  const isFiltered = search !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/tax-list";
  const locationParam = user?.store || "";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  // P1: effective-tax summary for the active outlet context (global scope
  // for a super admin with no outlet selected). Backend-owned and
  // independent of this list's pagination and filters.
  const { activeStoreId, activeStoreName } = useStore();
  const outletLookup = { locations: locData?.data, activeStoreId, activeStoreName };
  const summaryScope = resolveEffectiveTaxScope({ isSuperAdmin, storeId: activeStoreId });

  // D3: the one PPN row checkout charges in this scope (counter and QR alike).
  // Same query as EffectiveTaxSummary (shared cache).
  const { data: effectiveData } = useQuery(
    effectiveTaxQueryKey(summaryScope, "counter"),
    () => getEffectiveTax({ store: summaryScope.store, channel: "counter" }),
    {
      enabled: summaryScope?.kind === "outlet" || summaryScope?.kind === "global",
      retry: false
    }
  );
  const appliedPpnId = effectiveData?.data?.ppn?.rows?.find((r) => r.applied)?.id ?? null;
  const isGlobalSuperAdmin = isSuperAdmin && !user?.store;

  const applyMutation = useMutation((item) => applyTaxConfig(item.id), {
    onSuccess: () => {
      toast.success(t("page.taxConfig.apply.success"));
      queryClient.invalidateQueries(["tax-configs"]);
      queryClient.invalidateQueries(effectiveTaxQueryKey(summaryScope, "counter"));
      queryClient.invalidateQueries(effectiveTaxQueryKey(summaryScope, "qr"));
      setApplyTarget(null);
    },
    onError: (err) => {
      toast.error(t("page.taxConfig.apply.failed"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["tax-configs", page, limit, search, statusFilter],
    () => getAllTaxConfig({ location: locationParam, page, limit, search, status: statusFilter }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteTaxConfig, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.taxConfig.toast.deleteSuccess") });
      queryClient.invalidateQueries(["tax-configs"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), { description: err?.response?.data?.message || err.message });
    }
  });

  const items = data?.data || [];
  const stats = data?.stats || {};
  const total = data?.total || data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1;
  const activeCount = stats.active ?? 0;
  const draftCount = stats.draft ?? 0;
  const inactiveCount = stats.inactive ?? 0;

  const handleDelete = (item) => {
    setDeleteTarget(item);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const columns = [
    { header: t("page.taxConfig.table.name"), accessor: "name" },
    {
      header: t("page.taxConfig.table.type"),
      render: (item) => {
        const taxType = getTaxType(item.name, item.type);
        return (
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase ${safeGet(typeColors, taxType, typeColors["Non-Pajak"])}`}>
            {taxType}
          </span>
        );
      }
    },
    {
      header: t("page.taxConfig.scope.column"),
      render: (item) =>
        taxRowScope(item.store) === "global" ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Globe size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            {t("page.taxConfig.scope.global")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <Store size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            {outletNameFor(item.store, outletLookup) || t("page.taxConfig.scope.outlet")}
          </span>
        )
    },
    {
      header: t("page.taxConfig.table.rate"),
      render: (item) => <span className="font-semibold text-foreground">{item.rate ?? 0}%</span>
    },
    {
      header: t("page.taxConfig.table.description"),
      render: (item) => (
        <span className="text-muted-foreground max-w-[250px] block truncate">
          {item.description || "-"}
        </span>
      )
    },
    {
      header: t("page.taxConfig.apply.column"),
      render: (item) =>
        item.id === appliedPpnId ? (
          <span
            data-testid={`tax-applied-${item.id}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
            <CheckCircle size={12} aria-hidden="true" />
            {t("page.taxConfig.apply.used")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
    },
    {
      header: t("common.status"),
      render: (item) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : item.status === "draft"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
          {item.status === "active"
            ? t("common.active")
            : item.status === "draft"
              ? t("common.draft")
              : t("common.inactive")}
        </span>
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
      header: t("common.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: CheckCircle, label: t("page.taxConfig.apply.action") },
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          visible={2}
          items={[
            {
              label: t("page.taxConfig.apply.action"),
              icon: CheckCircle,
              // Only PPN rows; a global row only for a global super admin
              // (same rule as editing it); never the row already in use.
              hidden:
                !canAccess(user, MENU_KEY, "edit") ||
                item.type !== "ppn" ||
                item.id === appliedPpnId ||
                (item.store == null && !isGlobalSuperAdmin),
              onClick: () => setApplyTarget(item)
            },
            {
              label: t("common.view"),
              icon: Eye,
              hidden: !canAccess(user, MENU_KEY, "detail"),
              onClick: () => navigate(`/detail-tax?id=${item.id || item._id}`)
            },
            {
              label: t("common.edit"),
              icon: Edit,
              hidden: !canAccess(user, MENU_KEY, "edit"),
              onClick: () => navigate(`/edit-tax?id=${item.id || item._id}`)
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              hidden: !canAccess(user, MENU_KEY, "delete"),
              onClick: () => handleDelete(item),
              danger: true
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
          { label: t("page.taxConfig.list.title") }
        ]}
        title={t("page.taxConfig.list.title")}
        description={t("page.taxConfig.list.description")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="outline"
            disabled={isDownloadingTemplate}
            onClick={async () => {
              setIsDownloadingTemplate(true);
              try {
                await downloadTaxConfigTemplate();
                toast.success(t("common.success"), {
                  description: t("page.taxConfig.toast.templateSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.taxConfig.toast.templateError")
                });
              } finally {
                setIsDownloadingTemplate(false);
              }
            }}>
            {isDownloadingTemplate ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Table size={20} className="text-lg mr-1" />
            )}
            {t("page.taxConfig.button.downloadTemplate")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="general"
            disabled={isDownloadingData}
            onClick={async () => {
              setIsDownloadingData(true);
              try {
                await downloadTaxConfigExcel();
                toast.success(t("common.success"), {
                  description: t("page.taxConfig.toast.dataSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.taxConfig.toast.dataError")
                });
              } finally {
                setIsDownloadingData(false);
              }
            }}>
            {isDownloadingData ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Download size={20} className="text-lg mr-1" />
            )}
            {t("page.taxConfig.button.downloadData")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "import") && (
          <Button variant="import" onClick={() => setUploadModalOpen(true)}>
            <Upload size={20} className="text-lg mr-1" />
            {t("page.taxConfig.button.upload")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button variant="success" data-tour="tax-add" onClick={() => navigate("/add-tax")}>
            <Plus size={18} className="mr-1" />
            {t("page.taxConfig.button.add")}
          </Button>
        )}
      </PageHeader>

      <EffectiveTaxSummary
        scope={summaryScope}
        outletName={summaryScope.store ? outletNameFor(summaryScope.store, outletLookup) : null}
        canViewDetail={canAccess(user, MENU_KEY, "detail")}
      />

      {isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <>
          {locData && (locData?.data || []).length === 0 ? (
            <NoStore />
          ) : (
            <>
              {isFetching || isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label={t("page.taxConfig.stats.total")}
                    value={stats.total ?? total}
                    icon={Receipt}
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

              <div data-tour="tax-table">
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.taxConfig.button.add"),
                          onClick: () => navigate("/add-tax")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={items}
                  isLoading={isLoading || isFetching}
                  emptyMessage={t("page.taxConfig.list.empty")}
                  emptyIcon={Percent}
                  toolbar={
                    <TableToolbar
                      title={t("page.taxConfig.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.status")}
                        </label>
                        <Combobox
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
                          {t("common.search")}
                        </label>
                        <SearchInput
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                            setPage(1);
                          }}
                          placeholder={t("page.taxConfig.list.search")}
                          isLoading={isFetching}
                        />
                      </div>
                    </TableToolbar>
                  }
                  pagination={{
                    page,
                    pageSize: limit,
                    totalPages,
                    total,
                    onPageChange: setPage,
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
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("modal.deleteTitle")}
        description={t("page.taxConfig.deleteConfirmDescription", {
          name: deleteTarget?.name || ""
        })}
        confirmText={t("modal.yesDelete")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}

      <Modal
        type="confirm"
        open={!!applyTarget}
        onOpenChange={(open) => !open && !applyMutation.isLoading && setApplyTarget(null)}
        title={t("page.taxConfig.apply.modalTitle")}
        description={t("page.taxConfig.apply.modalDesc", {
          name: applyTarget?.name || "",
          rate: applyTarget?.rate ?? ""
        })}
        confirmText={t("page.taxConfig.apply.action")}
        loading={applyMutation.isLoading}
        onConfirm={() => {
          if (!applyTarget) return undefined;
          applyMutation.mutate(applyTarget);
          return false; // closed by onSuccess
        }}
      />

      <UploadExcelModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        uploadService={uploadTaxConfigExcel}
        queryKey={["tax-configs"]}
        title={t("page.taxConfig.upload.title")}
      />
    </div>
  );
};

export default TaxConfigList;

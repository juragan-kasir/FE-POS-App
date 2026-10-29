import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Package,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  FileEdit,
  SlidersHorizontal
} from "lucide-react";
import {
  getAllIngredients,
  deleteIngredient,
  downloadIngredientTemplate,
  downloadIngredientExcel
} from "@/services/ingredient";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import StatCard from "@/components/ui/StatCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import { TipsCard } from "@/components/ui/tips-card";
import { canAccess } from "@/utils/permission";
import StoreFilterField from "@/components/ui/StoreFilterField";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import { uploadIngredientExcel } from "@/services/ingredient";
import NoStore from "@/components/ui/NoStore";
import { toQuantity, formatQuantity } from "@/utils/quantity";
import { getIngredientStockState } from "@/utils/ingredientStockState";
import { useLocations } from "@/queries/useLocations";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdjustIngredientStockModal from "./components/AdjustIngredientStockModal";
import IngredientStockSummary from "./components/IngredientStockSummary";
import PageHeader from "@/components/ui/PageHeader";
import { dateLocale } from "@/lib/locale";

const statusBadge = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
};

const IngredientList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [search, setSearch] = useState("");
  const [page, setPage] = usePageParam();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [view, setView] = useState("list");
  const pageSize = 10;

  const isFiltered = storeFilter !== "all" || search !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/ingredient";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["ingredients", search, storeFilter, page, statusFilter],
    () =>
      getAllIngredients({
        store: isSuperAdmin
          ? storeFilter && storeFilter !== "all"
            ? storeFilter
            : ""
          : user?.store,
        search,
        page,
        limit: pageSize,
        status: statusFilter
      }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteIngredient, {
    onSuccess: () => {
      toast.success(t("page.ingredient.list.toastSuccess"), {
        description: t("page.ingredient.list.toastDeleteDesc")
      });
      queryClient.invalidateQueries(["ingredients"]);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t("page.ingredient.list.toastError"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const ingredients = data?.data || [];
  const totalItems = data?.pagination?.total ?? data?.totalItems ?? ingredients.length;
  const totalPages = data?.pagination?.totalPages ?? data?.totalPages ?? 1;
  const stats = data?.stats || {};
  const activeCount = stats.active ?? ingredients.filter((i) => i.status === "active").length;
  const draftCount = stats.draft ?? ingredients.filter((i) => i.status === "draft").length;
  const inactiveCount = stats.inactive ?? ingredients.filter((i) => i.status === "inactive").length;

  const fmtDate = (date) =>
    date
      ? new Date(date).toLocaleDateString(dateLocale(), {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "-";

  const columns = [
    {
      header: t("page.ingredient.list.tableNama"),
      render: (item) => <span className="font-medium">{item.name}</span>
    },
    {
      header: t("page.ingredient.list.tableKategori"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.categoryData?.name || "-"}</span>
      )
    },
    {
      header: t("page.ingredient.list.tableStore"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.storeData?.name || "-"}</span>
      )
    },
    {
      header: t("page.ingredient.list.tableSupplier"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.supplierData?.name || "-"}</span>
      )
    },
    {
      header: t("page.ingredient.list.tableUnit"),
      render: (item) => <span className="text-sm">{item.unit || "pcs"}</span>
    },
    {
      header: t("page.ingredient.list.tableKonversi"),
      className: "min-w-[200px]",
      render: (item) => {
        const base = item.baseUnit || item.unit || "pcs";
        const factor = item.conversionFactor || 1;
        return (
          <span className="text-xs text-muted-foreground">
            1 {item.unit || "pcs"} = {factor} {base}
          </span>
        );
      }
    },
    {
      header: t("page.ingredient.list.tableStok"),
      align: "right",
      // Stock is held in the base unit (what recipes deduct). Never entered
      // = unknown, shown as such instead of a 0 that reads as "counted empty".
      // A legacy non-zero value stays visible but is flagged unverified.
      render: (item) => {
        const stockState = getIngredientStockState(item);
        if (stockState === "uninitialized") {
          return (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {t("page.ingredient.stockState.uninitialized")}
            </span>
          );
        }
        return (
          <span className="inline-flex flex-col items-end gap-1">
            <span
              className={`font-mono ${toQuantity(item.stock) <= toQuantity(item.minStock) ? "text-destructive font-semibold" : ""}`}>
              {formatQuantity(item.stock)}{" "}
              <span className="text-xs text-muted-foreground">
                {item.baseUnit || item.unit || "pcs"}
              </span>
            </span>
            {stockState === "unrecorded" && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {t("page.ingredient.stockState.unrecorded")}
              </span>
            )}
          </span>
        );
      }
    },
    {
      header: t("page.ingredient.list.tableMinStok"),
      align: "right",
      className: "min-w-[120px]",
      render: (item) => <span className="font-mono text-muted-foreground">{item.minStock}</span>
    },
    {
      header: t("page.ingredient.list.tableHargaBeli"),
      align: "right",
      className: "min-w-[160px]",
      render: (item) => (
        <span className="font-medium">
          Rp {Number(item.costPrice || 0).toLocaleString("id-ID")}
        </span>
      )
    },
    {
      header: t("page.ingredient.list.tableStatus"),
      render: (item) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[item.status] || statusBadge.draft}`}>
          {item.status === "active"
            ? t("page.ingredient.list.statusActive")
            : item.status === "draft"
              ? t("common.draft")
              : t("page.ingredient.list.statusInactive")}
        </span>
      )
    },
    {
      header: t("common.createdBy"),
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.createdByUser?.fullName || item.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.ingredient.list.tableDibuat"),
      className: "min-w-[180px]",
      render: (item) => (
        <span className="text-xs text-muted-foreground">{fmtDate(item.createdAt)}</span>
      )
    },
    {
      header: t("common.modifiedBy"),
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.modifiedByUser?.fullName || item.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.ingredient.list.tableDiubah"),
      className: "min-w-[180px]",
      render: (item) => (
        <span className="text-xs text-muted-foreground">{fmtDate(item.updatedAt)}</span>
      )
    },
    {
      header: t("page.ingredient.list.tableAksi"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: SlidersHorizontal, label: t("page.ingredient.adjust.action") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/detail-ingredient?id=${item.id}`)
            },
            {
              label: t("page.ingredient.adjust.action"),
              icon: SlidersHorizontal,
              onClick: () => setAdjustTarget(item),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/edit-ingredient?id=${item.id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => setDeleteTarget(item),
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
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.ingredient.list.title") }
        ]}
        title={t("page.ingredient.list.title")}
        description={t("page.ingredient.list.subtitle")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="outline"
            disabled={downloadingTemplate}
            onClick={async () => {
              setDownloadingTemplate(true);
              try {
                await downloadIngredientTemplate();
                toast.success(t("common.success"), {
                  description: t("page.ingredient.list.toastTemplateDesc")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.ingredient.list.toastError")
                });
              } finally {
                setDownloadingTemplate(false);
              }
            }}>
            {downloadingTemplate ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Download size={16} className="mr-1" />
            )}
            {t("page.ingredient.list.btnTemplate")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="general"
            disabled={downloadingData}
            onClick={async () => {
              setDownloadingData(true);
              try {
                await downloadIngredientExcel();
                toast.success(t("common.success"), {
                  description: t("page.ingredient.list.toastExportDesc")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.ingredient.list.toastError")
                });
              } finally {
                setDownloadingData(false);
              }
            }}>
            {downloadingData ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Download size={16} className="mr-1" />
            )}
            {t("page.ingredient.list.btnExport")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "import") && (
          <Button variant="import" onClick={() => setImportModal(true)}>
            <Upload size={16} className="mr-1" />
            {t("page.ingredient.list.btnImport")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-ingredient")}
            className="gap-2 shadow-md">
            <Plus size={18} /> {t("page.ingredient.list.btnAdd")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="list">{t("page.ingredient.tabs.list")}</TabsTrigger>
            <TabsTrigger value="summary">{t("page.ingredient.tabs.summary")}</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-6">
            {view === "summary" && (
              <IngredientStockSummary
                store={isSuperAdmin ? storeFilter : user?.store}
                needsStore={isSuperAdmin && (!storeFilter || storeFilter === "all")}
                isSuperAdmin={isSuperAdmin}
                locations={locData?.data || []}
                storeFilter={storeFilter}
                onStoreChange={(value) => {
                  setGlobalStoreFilter(value);
                  setPage(1);
                }}
              />
            )}
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            {isFetching || isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard
                  label={t("page.ingredient.list.statTotal")}
                  value={totalItems}
                  icon={Package}
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

            <div data-tour="ingredient-table" className="mt-6">
              <DataTable
                emptyAction={
                  canAccess(user, MENU_KEY, "add")
                    ? {
                        label: t("page.ingredient.list.btnAdd"),
                        onClick: () => navigate("/add-ingredient")
                      }
                    : undefined
                }
                columns={columns}
                data={ingredients}
                isLoading={isLoading || isFetching}
                isError={isError}
                onRetry={refetch}
                emptyMessage={t("page.ingredient.list.emptyMessage")}
                emptyIcon={Package}
                pagination={{
                  page,
                  totalPages,
                  total: totalItems,
                  pageSize,
                  onPageChange: setPage
                }}
                toolbar={
                  <TableToolbar
                    title={t("page.ingredient.list.title")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    <StoreFilterField
                      id="ingredient-list-store-filter"
                      label={t("page.goodsReceipt.detail.store")}
                      locations={locData?.data || []}
                      value={storeFilter}
                      onChange={(v) => {
                        setGlobalStoreFilter(v);
                        setPage(1);
                      }}
                      isSuperAdmin={isSuperAdmin}
                      t={t}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="ingredient-list-status"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.status")}
                      </label>
                      <Combobox
                        id="ingredient-list-status"
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
                        searchPlaceholder={t("common.search.generic")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="ingredient-list-search"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.search")}
                      </label>
                      <SearchInput
                        id="ingredient-list-search"
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.ingredient.list.searchPlaceholder")}
                        isLoading={isFetching}
                      />
                    </div>
                  </TableToolbar>
                }
              />
            </div>

            <div>
              <TipsCard
                tips={[
                  t("page.ingredient.list.tips.1"),
                  t("page.ingredient.list.tips.2"),
                  t("page.ingredient.list.tips.3"),
                  t("page.ingredient.list.tips.4")
                ]}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {adjustTarget && (
        <AdjustIngredientStockModal
          ingredient={adjustTarget}
          onClose={() => setAdjustTarget(null)}
        />
      )}

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("page.ingredient.list.modalDeleteTitle")}
        description={t("page.ingredient.list.modalDeleteDesc")}
        confirmText={t("page.ingredient.list.modalDeleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}

      <UploadExcelModal
        open={importModal}
        onOpenChange={setImportModal}
        uploadService={(file) => {
          const fd = new FormData();
          fd.append("file", file);
          return uploadIngredientExcel(fd);
        }}
        queryKey={["ingredients"]}
        title={t("page.ingredient.import.title")}
        subtitle={t("page.ingredient.import.subtitle")}
      />
    </div>
  );
};

export default IngredientList;

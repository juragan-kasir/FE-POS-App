import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Package,
  Loader2,
  FolderOpen,
  CheckCircle,
  XCircle,
  FileEdit,
  Eye,
  Edit,
  Trash2,
  Table,
  Download,
  Upload
} from "lucide-react";
import {
  getAllIngredientCategoryTable,
  deleteIngredientCategory,
  downloadIngredientCategoryTemplate,
  downloadIngredientCategoryExcel
} from "@/services/ingredientCategory";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import { uploadIngredientCategoryExcel } from "@/services/ingredientCategory";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import { TipsCard } from "@/components/ui/tips-card";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "-";
  }
};

const CategoryList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/ingredient-category";
  const [search, setSearch] = useState("");
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["ingredient-categories", page, search, statusFilter],
    () => getAllIngredientCategoryTable({ page, limit, search, status: statusFilter }),
    { keepPreviousData: true }
  );

  const isFiltered = search !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const deleteMutation = useMutation(deleteIngredientCategory, {
    onSuccess: () => {
      toast.success(t("page.ingredientCategory.list.toastSuccess"), {
        description: t("page.ingredientCategory.list.toastSuccessDesc")
      });
      queryClient.invalidateQueries(["ingredient-categories"]);
    },
    onError: (err) => {
      toast.error(t("page.ingredientCategory.list.toastError"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const categories = data?.data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;
  const stats = data?.stats || {};
  const draftCount = stats.draft ?? 0;
  const activeCount = stats.active ?? 0;
  const inactiveCount = stats.inactive ?? 0;
  const statsTotal = stats.total ?? 0;

  const columns = [
    {
      header: t("page.ingredientCategory.list.tableKode"),
      render: (item) => (
        <span className="font-mono text-sm text-foreground">{`#ICAT-${String(item.id).padStart(3, "0")}`}</span>
      )
    },
    {
      header: t("page.ingredientCategory.list.tableNama"),
      render: (item) => (
        <span className="text-sm font-semibold text-foreground">{item.name || "-"}</span>
      )
    },

    {
      header: t("page.ingredientCategory.list.tableStatus"),
      render: (item) => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            item.status === "active"
              ? "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
              : item.status === "draft"
                ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                : "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
          }`}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.status === "active"
                ? "bg-green-500 dark:bg-green-400"
                : item.status === "draft"
                  ? "bg-amber-500 dark:bg-amber-400"
                  : "bg-red-500 dark:bg-red-400"
            }`}
          />
          {item.status === "active"
            ? t("page.ingredientCategory.list.active")
            : item.status === "draft"
              ? t("common.draft")
              : t("page.ingredientCategory.list.inactive")}
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
      header: t("page.ingredientCategory.list.tableDibuat"),
      render: (item) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(item.createdAt)}
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
      header: t("common.updatedAt"),
      render: (item) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(item.updatedAt)}
        </span>
      )
    },
    {
      header: t("page.ingredientCategory.list.tableAksi"),
      align: "right",
      stickyRight: true,
      legend: [
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
              label: t("page.ingredientCategory.list.viewTitle"),
              iconName: "visibility",
              hidden: !canAccess(user, MENU_KEY, "view"),
              onClick: () => navigate(`/detail-ingredient-category?id=${item.id}`)
            },
            {
              label: t("page.ingredientCategory.list.editTitle"),
              iconName: "edit",
              hidden: !canAccess(user, MENU_KEY, "edit"),
              onClick: () => navigate(`/edit-ingredient-category?id=${item.id}`)
            },
            {
              label: t("page.ingredientCategory.list.deleteTitle"),
              iconName: "delete",
              hidden: !canAccess(user, MENU_KEY, "delete"),
              onClick: () => setDeleteTarget(item.id),
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
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.ingredientCategory.list.title") }
        ]}
        title={t("page.ingredientCategory.list.title")}
        description={t("page.ingredientCategory.list.subtitle")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="outline"
            disabled={isDownloadingTemplate}
            onClick={async () => {
              setIsDownloadingTemplate(true);
              try {
                await downloadIngredientCategoryTemplate();
                toast.success(t("common.success"), {
                  description: t("page.ingredientCategory.toast.templateSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.ingredientCategory.toast.templateError")
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
            {t("page.ingredientCategory.button.downloadTemplate")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="general"
            disabled={isDownloadingData}
            onClick={async () => {
              setIsDownloadingData(true);
              try {
                await downloadIngredientCategoryExcel();
                toast.success(t("common.success"), {
                  description: t("page.ingredientCategory.toast.dataSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.ingredientCategory.toast.dataError")
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
            {t("page.ingredientCategory.button.downloadData")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "import") && (
          <Button variant="import" onClick={() => setUploadModalOpen(true)}>
            <Upload size={20} className="text-lg mr-1" />
            {t("page.ingredientCategory.button.upload")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "create") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-ingredient-category")}
            className="shadow-md">
            <Plus size={16} className="mr-1" />
            {t("page.ingredientCategory.list.addButton")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          <div>
            <div>
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
                    label={t("page.ingredientCategory.list.statTotal")}
                    value={statsTotal}
                    icon={FolderOpen}
                    variant="default"
                  />
                  <StatCard
                    label={t("page.ingredientCategory.list.statActive")}
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
                    label={t("page.ingredientCategory.list.statInactive")}
                    value={inactiveCount}
                    icon={XCircle}
                    variant="inactive"
                  />
                </div>
              )}
            </div>

            {isError ? (
              <AbortController refetch={refetch} />
            ) : (
              <div className="mt-6">
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "create")
                      ? {
                          label: t("page.ingredientCategory.list.addButton"),
                          onClick: () => navigate("/add-ingredient-category")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={categories}
                  isLoading={isLoading || isFetching}
                  emptyMessage={t("page.ingredientCategory.list.emptyText")}
                  emptyIcon={Package}
                  toolbar={
                    <TableToolbar
                      title={t("page.ingredientCategory.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("page.ingredientCategory.list.tableStatus")}
                        </label>
                        <Combobox
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Cari
                        </label>
                        <SearchInput
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                            setPage(1);
                          }}
                          placeholder={t("page.ingredientCategory.list.searchPlaceholder")}
                          isLoading={isFetching}
                        />
                      </div>
                    </TableToolbar>
                  }
                  pagination={{
                    page,
                    totalPages,
                    total: statsTotal,
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

            <div className="mt-6">
              <TipsCard
                tips={[
                  t("page.ingredientCategory.list.tips.1"),
                  t("page.ingredientCategory.list.tips.2"),
                  t("page.ingredientCategory.list.tips.3"),
                  t("page.ingredientCategory.list.tips.4")
                ]}
              />
            </div>
          </div>
        </>
      )}

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("page.ingredientCategory.list.modalDeleteTitle")}
        description={t("page.ingredientCategory.list.modalDeleteDesc")}
        confirmText={t("page.ingredientCategory.list.modalDeleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}

      <UploadExcelModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        uploadService={uploadIngredientCategoryExcel}
        queryKey={["ingredient-categories"]}
        title={t("page.ingredientCategory.upload.title")}
        subtitle={t("page.ingredientCategory.upload.subtitle")}
      />
    </div>
  );
};

export default CategoryList;

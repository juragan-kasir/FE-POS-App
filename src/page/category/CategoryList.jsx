import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Loader2,
  FolderOpen,
  CheckCircle,
  XCircle,
  FileEdit,
  Eye,
  Edit,
  Trash2,
  Package,
  Table,
  Download,
  Upload,
  Plus,
  Lightbulb,
  Store
} from "lucide-react";
import DynamicIcon from "@/components/ui/DynamicIcon";
import { useTranslation } from "react-i18next";
import {
  getAllCategoryTable,
  deleteCategory,
  downloadTemplate,
  downloadExcel
} from "@/services/category";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import { uploadExcel } from "@/services/category";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import { canAccess } from "@/utils/permission";
import StatCard from "@/components/ui/StatCard";
import StoreFilter from "@/components/ui/StoreFilter";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";

const categoryIcon = {
  "makanan utama": "restaurant",
  "minuman dingin": "local_bar",
  "snack & dessert": "cookie",
  "kopi & teh panas": "coffee"
};

const getCategoryIcon = (name) => {
  const key = (name || "").toLowerCase();
  return safeGet(categoryIcon, key, "category");
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }) +
      " " +
      d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      })
    );
  } catch {
    return "-";
  }
};

const CategoryList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get("location");
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/category-list";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const isFiltered = storeFilter !== "all" || search !== "" || statusFilter !== "";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["categories", page, limit, search, statusFilter, storeFilter],
    () =>
      getAllCategoryTable({
        page,
        limit,
        search: search || undefined,
        statusCategory: statusFilter || "all",
        location:
          locationParam ||
          (isSuperAdmin
            ? storeFilter && storeFilter !== "all"
              ? storeFilter
              : ""
            : user?.store || "")
      }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteCategory, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.category.toast.deleteSuccess") });
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), { description: err?.response?.data?.message || err.message });
    }
  });

  const categories = data?.data || data?.categories || [];
  const total = data?.total || data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1;

  const statsFromBE = data?.stats || {};
  const hasBEStats =
    statsFromBE.total !== undefined ||
    statsFromBE.active !== undefined ||
    statsFromBE.inactive !== undefined;

  const statsTotal = hasBEStats ? statsFromBE.total || total : total;
  const activeCount = hasBEStats
    ? statsFromBE.active || 0
    : categories.filter((cat) => cat.status === "active" || cat.isActive).length;
  const inactiveCount = hasBEStats
    ? statsFromBE.inactive || 0
    : categories.filter((cat) => cat.status === "inactive" || !cat.isActive).length;
  const draftCount = hasBEStats
    ? statsFromBE.draft || 0
    : categories.filter((cat) => cat.status === "draft").length;

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget });
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: "#",
      render: (cat, idx) => (
        <span className="text-sm font-mono text-muted-foreground">
          {(page - 1) * limit + idx + 1}
        </span>
      )
    },
    {
      header: t("page.category.table.id"),
      render: (cat) => (
        <span className="font-mono text-sm text-foreground">
          {cat.code || cat.idCategory || `#CAT-${String(cat.id || cat._id).padStart(3, "0")}`}
        </span>
      )
    },
    {
      header: t("page.category.table.name"),
      render: (cat) => {
        const parent = categories.find((c) => String(c.id) === String(cat.parentId));
        const description = (cat.description || "").trim();
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <DynamicIcon
                name={cat.image || getCategoryIcon(cat.name)}
                size={20}
                className="text-primary"
              />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: cat.color || "#0f172a" }}
                />
                <span className="truncate">{cat.name}</span>
                {cat.value && (
                  <span
                    title={t("page.category.value")}
                    className="hidden xl:inline-flex text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 shrink-0">
                    {cat.value}
                  </span>
                )}
              </span>
              {description && (
                <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                  {description}
                </span>
              )}
              {!description && parent && (
                <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                  ↳ {parent.name}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: t("page.category.table.store"),
      render: (cat) => {
        const stores = Array.isArray(cat.store) ? cat.store : [];
        if (stores.length === 0)
          return (
            <span className="text-xs text-muted-foreground italic">
              {t("page.category.form.storeSection.allStores")}
            </span>
          );
        const shown = stores.slice(0, 2);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {shown.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-border bg-muted/50 text-foreground/80">
                <Store size={14} className="text-muted-foreground" />
                {s.name || `Store #${s.id}`}
              </span>
            ))}
            {stores.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                +{stores.length - 2}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: t("page.category.table.productCount"),
      render: (cat) => {
        const count = cat.productCount || cat.totalProduct || 0;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              count > 0
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}>
            <Package size={12} />
            {count} {t("page.invoice.item")}
          </span>
        );
      }
    },
    {
      header: t("page.category.table.status"),
      render: (cat) => {
        const s = cat.status || "";
        if (s === "draft") {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
              {t("common.draft")}
            </span>
          );
        }
        const isActive = s === "active" || cat.isActive === true;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isActive
                ? "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                : "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
            }`}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? "bg-green-500 dark:bg-green-400" : "bg-red-500 dark:bg-red-400"
              }`}
            />
            {isActive ? t("common.active") : t("common.inactive")}
          </span>
        );
      }
    },
    {
      header: t("common.createdBy"),
      render: (cat) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {(cat.createdByUser?.fullName || cat.createdByUser?.userName || "?")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span className="text-sm text-muted-foreground">
            {cat.createdByUser?.fullName || cat.createdByUser?.userName || "-"}
          </span>
        </div>
      )
    },
    {
      header: t("page.category.table.createdDate"),
      render: (cat) => (
        <span className="text-sm font-mono text-muted-foreground">{formatDate(cat.createdAt)}</span>
      )
    },
    {
      header: t("common.modifiedBy"),
      render: (cat) => {
        const name = cat.modifiedByUser?.fullName || cat.modifiedByUser?.userName;
        if (!name) return <span className="text-sm text-muted-foreground italic">-</span>;
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-muted text-foreground/70 flex items-center justify-center text-xs font-bold shrink-0">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm text-muted-foreground">{name}</span>
          </div>
        );
      }
    },
    {
      header: t("page.category.table.updatedDate"),
      render: (cat) => (
        <span className="text-sm font-mono text-muted-foreground">{formatDate(cat.updatedAt)}</span>
      )
    },
    {
      header: t("page.category.table.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (cat) => (
        <TableActions
          align="center"
          visible={2}
          items={[
            {
              label: t("common.view"),
              iconName: "visibility",
              hidden: !canAccess(user, MENU_KEY, "view"),
              onClick: () => navigate(`/detail-category?id=${cat.id || cat._id}`)
            },
            {
              label: t("common.edit"),
              iconName: "edit",
              hidden: !canAccess(user, MENU_KEY, "edit"),
              onClick: () => navigate(`/edit-category?id=${cat.id || cat._id}`)
            },
            {
              label: t("common.delete"),
              iconName: "delete",
              hidden: !canAccess(user, MENU_KEY, "delete"),
              onClick: () => handleDelete(cat.id || cat._id),
              danger: true
            }
          ]}
        />
      )
    }
  ];

  return (
    <div data-tour="page-category" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.adminConsole") },
          { label: t("breadcrumb.category") }
        ]}
        title={t("page.category.list.title")}
        description={t("page.category.list.description")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            data-tour="category-download-template"
            variant="outline"
            disabled={isDownloadingTemplate}
            onClick={async () => {
              setIsDownloadingTemplate(true);
              try {
                await downloadTemplate();
                toast.success(t("common.success"), {
                  description: t("page.category.toast.templateSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.category.toast.templateError")
                });
              } finally {
                setIsDownloadingTemplate(false);
              }
            }}>
            {isDownloadingTemplate ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Table size={16} className="mr-1" />
            )}
            {isDownloadingTemplate
              ? t("page.category.button.downloading")
              : t("page.category.button.downloadTemplate")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            data-tour="category-download-data"
            variant="general"
            disabled={isDownloadingData}
            onClick={async () => {
              setIsDownloadingData(true);
              try {
                await downloadExcel();
                toast.success(t("common.success"), {
                  description: t("page.category.toast.dataSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.category.toast.dataError")
                });
              } finally {
                setIsDownloadingData(false);
              }
            }}>
            {isDownloadingData ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Download size={16} className="mr-1" />
            )}
            {isDownloadingData
              ? t("page.category.button.downloading")
              : t("page.category.button.downloadData")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "import") && <span className="w-px h-7 bg-border mx-1" />}
        {canAccess(user, MENU_KEY, "import") && (
          <Button
            data-tour="category-upload"
            variant="import"
            onClick={() => setUploadModalOpen(true)}>
            <Upload size={16} className="mr-1" />
            {t("page.category.button.upload")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            data-tour="category-add"
            onClick={() => navigate("/add-category")}
            className="shadow-md">
            <Plus size={16} className="mr-1" />
            {t("page.category.button.add")}
          </Button>
        )}
      </PageHeader>

      <div>
        <div>
          {locData && (locData?.data || []).length === 0 ? (
            <NoStore />
          ) : (
            <>
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
                    label={t("page.category.list.statsTotal")}
                    value={statsTotal}
                    icon={FolderOpen}
                    variant="default"
                    subtitle={t("page.category.list.statsTotalBadge", { count: categories.length })}
                  />
                  <StatCard
                    label={t("page.category.list.statsActive")}
                    value={activeCount}
                    icon={CheckCircle}
                    variant="active"
                    subtitle={`${statsTotal > 0 ? Math.round((activeCount / statsTotal) * 100) : 0}%`}
                  />
                  <StatCard
                    label={t("page.category.list.statsInactive")}
                    value={inactiveCount}
                    icon={XCircle}
                    variant="inactive"
                    subtitle={`${statsTotal > 0 ? Math.round((inactiveCount / statsTotal) * 100) : 0}%`}
                  />
                  <StatCard
                    label={t("common.draft")}
                    value={draftCount}
                    icon={FileEdit}
                    variant="draft"
                    subtitle={`${statsTotal > 0 ? Math.round((draftCount / statsTotal) * 100) : 0}%`}
                  />
                </div>
              )}

              <div data-tour="category-table" className="mt-6">
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.category.button.add"),
                          onClick: () => navigate("/add-category")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={categories}
                  isLoading={isLoading || isFetching}
                  isError={isError}
                  onRetry={refetch}
                  emptyMessage={t("page.category.list.empty")}
                  toolbar={
                    <TableToolbar
                      title={t("page.category.list.sectionTitle")}
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.search")}
                        </label>
                        <SearchInput
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                            setPage(1);
                          }}
                          placeholder={t("page.category.list.search")}
                          isLoading={isFetching}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("page.category.table.status")}
                        </label>
                        <Combobox
                          options={[
                            { value: "", label: t("page.category.list.statusAll") },
                            { value: "active", label: t("common.active") },
                            { value: "inactive", label: t("common.inactive") }
                          ]}
                          value={statusFilter}
                          onChange={(v) => {
                            setStatusFilter(v);
                            setPage(1);
                          }}
                          placeholder={t("page.category.list.statusAll")}
                          searchPlaceholder="Cari..."
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
                  rowClassName={() => ""}
                />
              </div>

              <div className="bg-gradient-to-br from-primary to-primary/90 rounded-xl p-5 flex flex-col text-primary-foreground mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="opacity-80" />
                  <h4 className="text-sm font-bold uppercase tracking-wider opacity-80">
                    {t("page.category.tips.title")}
                  </h4>
                </div>
                <ul className="space-y-2">
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.category.tips.1")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.category.tips.2")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.category.tips.3")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.category.tips.4")}</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.category.modal.deleteTitle")}
        confirmText={t("page.category.modal.confirmDelete")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
      <UploadExcelModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        uploadService={(file) => {
          const fd = new FormData();
          fd.append("file", file);
          return uploadExcel(fd);
        }}
        queryKey={["categories"]}
        title={t("page.category.upload.title")}
        subtitle={t("page.category.upload.subtitle")}
      />
    </div>
  );
};

export default CategoryList;

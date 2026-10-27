import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  getAllDepartmentTable,
  deleteDepartment,
  downloadDepartmentTemplate,
  downloadDepartmentExcel
} from "@/services/department";
import {
  Loader2,
  Building,
  CheckCircle,
  FileEdit,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Table,
  Download,
  Upload,
  Plus,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import { uploadDepartmentExcel } from "@/services/department";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import { SearchInput } from "@/components/ui/SearchInput";
import { Combobox } from "@/components/ui/combobox";
import NoStore from "@/components/ui/NoStore";
import { canAccess } from "@/utils/permission";
import { useLocations } from "@/queries/useLocations";

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

const DepartmentList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/department-list";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const isFiltered = search !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["departments", page, limit, search, statusFilter],
    () => getAllDepartmentTable({ page, limit, statusRole: statusFilter, search }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteDepartment, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.department.toast.deleteSuccess") });
      queryClient.invalidateQueries(["departments"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const departments = data?.data || [];
  const pagination = data?.pagination || {};
  const stats = data?.stats || {};
  const total = pagination?.total ?? pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages || Math.ceil(total / limit) || 1;

  const handleDelete = (department) => {
    setDeleteTarget(department);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: t("page.department.table.no"),
      render: (_, index) => (
        <span className="text-sm font-mono text-muted-foreground">
          {String(index + 1 + (page - 1) * limit).padStart(2, "0")}
        </span>
      )
    },
    {
      header: t("page.department.table.name"),
      render: (department) => (
        <span className="text-sm font-semibold text-primary">{department.name}</span>
      )
    },
    {
      header: t("page.department.table.description"),
      render: (department) => (
        <p className="text-sm text-muted-foreground max-w-xs truncate">
          {department.description || "-"}
        </p>
      )
    },
    {
      header: t("page.department.table.status"),
      align: "center",
      render: (department) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${
            department.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
              : department.status === "draft"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
          }`}>
          {department.status === "active"
            ? t("common.active")
            : department.status === "draft"
              ? t("common.draft")
              : t("common.inactive")}
        </span>
      )
    },
    {
      header: t("common.createdBy"),
      render: (department) => (
        <span className="text-sm text-muted-foreground">
          {department.createdByUser?.fullName || department.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.department.table.createdDate"),
      render: (department) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(department.createdAt)}
        </span>
      )
    },
    {
      header: t("common.modifiedBy"),
      render: (department) => (
        <span className="text-sm text-muted-foreground">
          {department.modifiedByUser?.fullName || department.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.department.table.updatedDate"),
      render: (department) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(department.updatedAt)}
        </span>
      )
    },
    {
      header: t("page.department.table.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (department) => (
        <TableActions
          align="center"
          visible={2}
          items={[
            {
              label: t("common.view"),
              iconName: "visibility",
              hidden: !canAccess(user, MENU_KEY, "view"),
              onClick: () => navigate(`/detail-department?id=${department.id}`)
            },
            {
              label: t("common.edit"),
              iconName: "edit",
              hidden: !canAccess(user, MENU_KEY, "edit"),
              onClick: () => navigate(`/edit-department?id=${department.id}`)
            },
            {
              label: t("common.delete"),
              iconName: "delete",
              hidden: !canAccess(user, MENU_KEY, "delete"),
              onClick: () => handleDelete(department),
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
          { label: t("breadcrumb.adminConsole") },
          { label: t("page.department.list.title") }
        ]}
        title={t("page.department.list.title")}
        description={t("page.department.list.description")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            data-tour="department-download-template"
            variant="outline"
            disabled={isDownloadingTemplate}
            onClick={async () => {
              setIsDownloadingTemplate(true);
              try {
                await downloadDepartmentTemplate();
                toast.success(t("common.success"), {
                  description: t("page.department.toast.templateSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.department.toast.templateError")
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
              ? t("page.department.button.downloading")
              : t("page.department.button.downloadTemplate")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            data-tour="department-download-data"
            variant="general"
            disabled={isDownloadingData}
            onClick={async () => {
              setIsDownloadingData(true);
              try {
                await downloadDepartmentExcel();
                toast.success(t("common.success"), {
                  description: t("page.department.toast.dataSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.department.toast.dataError")
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
              ? t("page.department.button.downloading")
              : t("page.department.button.downloadData")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "import") && <span className="w-px h-7 bg-border mx-1" />}
        {canAccess(user, MENU_KEY, "import") && (
          <Button
            data-tour="department-upload"
            variant="import"
            onClick={() => setUploadModalOpen(true)}>
            <Upload size={16} className="mr-1" />
            {t("page.department.button.upload")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            data-tour="department-add"
            variant="success"
            onClick={() => navigate("/add-department")}
            className="shadow-md">
            <Plus size={16} className="mr-1" />
            {t("page.department.button.add")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          <div>
            <div>
              {isFetching ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <StatCard
                      label={t("page.department.list.statsTotal")}
                      value={stats?.totalDepartemen ?? total}
                      icon={Building}
                      variant="default"
                      subtitle={t("page.department.list.statsAll")}
                    />
                    <StatCard
                      label={t("page.department.list.statsActive")}
                      value={stats?.totalDepartemenAktif ?? 0}
                      icon={CheckCircle}
                      variant="active"
                      subtitle={`${stats?.totalDepartemen ? Math.round((stats.totalDepartemenAktif / stats.totalDepartemen) * 100) : 0}${t("page.department.list.statsActivePercent")}`}
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <StatCard
                      label={t("page.department.list.statsDraft")}
                      value={stats?.totalDepartemenDraft ?? 0}
                      icon={FileEdit}
                      variant="draft"
                      subtitle={
                        stats?.totalDepartemen
                          ? `${Math.round((stats.totalDepartemenDraft / stats.totalDepartemen) * 100)}%`
                          : "0%"
                      }
                    />
                    <StatCard
                      label={t("page.department.list.statsInactive")}
                      value={stats?.totalDepartemenNonActive ?? 0}
                      icon={XCircle}
                      variant="inactive"
                      subtitle={t("page.department.list.statsAttention")}
                    />
                    <div
                      data-tour="department-stat-nodesc"
                      className="bg-card p-6 rounded-xl shadow-sm border border-border flex justify-between items-center group hover:shadow-md transition-shadow">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {t("page.department.list.statsNoDesc")}
                        </p>
                        <h3 className="text-3xl font-bold text-foreground">
                          {stats?.totalTanpaDeskripsi ?? 0}
                        </h3>
                        <p className="text-xs font-semibold text-destructive flex items-center gap-1 mt-1">
                          <AlertTriangle size={14} />
                          {stats?.totalDepartemen
                            ? Math.round((stats.totalTanpaDeskripsi / stats.totalDepartemen) * 100)
                            : 0}
                          {t("page.department.list.statsNoDescPercent")}
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-destructive-container flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
                        <AlertTriangle size={28} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div data-tour="department-table" className="mt-6">
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.department.button.add"),
                          onClick: () => navigate("/add-department")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={departments}
                  isLoading={isLoading || isFetching}
                  isError={isError}
                  onRetry={refetch}
                  emptyMessage={t("page.department.list.empty")}
                  toolbar={
                    <TableToolbar
                      title={t("page.department.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("page.department.table.status")}
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
                          searchPlaceholder="Cari status..."
                        />
                      </div>
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
                          placeholder={t("page.department.list.search")}
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
                  rowClassName={() => "group"}
                />
              </div>

              <div className="bg-gradient-to-br from-primary to-primary/90 rounded-xl p-5 flex flex-col text-primary-foreground mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="opacity-80" />
                  <h4 className="text-sm font-bold uppercase tracking-wider opacity-80">
                    {t("page.department.tips.title")}
                  </h4>
                </div>
                <ul className="space-y-2">
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.department.tips.1")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.department.tips.2")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.department.tips.3")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.department.tips.4")}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.department.modal.deleteTitle", { name: deleteTarget?.name || "" })}
        description={t("page.department.modal.deleteDesc", { name: deleteTarget?.name || "" })}
        confirmText={t("page.department.modal.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
      <UploadExcelModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        uploadService={uploadDepartmentExcel}
        queryKey={["departments"]}
        title={t("page.department.upload.title")}
        subtitle={t("page.department.upload.subtitle")}
      />
    </div>
  );
};

export default DepartmentList;

import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getAllPositionTable,
  deletePosition,
  downloadPositionTemplate,
  downloadPositionExcel
} from "@/services/position";
import { getAllDepartmentTable } from "@/services/department";
import {
  Loader2,
  Briefcase,
  CheckCircle,
  FileEdit,
  XCircle,
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
import { uploadPositionExcel } from "@/services/position";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import { SearchInput } from "@/components/ui/SearchInput";
import { Combobox } from "@/components/ui/combobox";
import NoStore from "@/components/ui/NoStore";
import { canAccess } from "@/utils/permission";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString(dateLocale(), {
        day: "numeric",
        month: "short",
        year: "numeric"
      }) +
      " " +
      d.toLocaleTimeString(dateLocale(), {
        hour: "2-digit",
        minute: "2-digit"
      })
    );
  } catch {
    return "-";
  }
};

const PositionList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/position-list";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [noDepartmentModal, setNoDepartmentModal] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const isFiltered = search !== "" || statusFilter !== "all" || departmentFilter !== "";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDepartmentFilter("");
    setPage(1);
  };

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data: departmentData } = useQuery(["departments-active"], () =>
    getAllDepartmentTable({ page: 1, limit: 100, statusRole: "active", search: "" })
  );
  const departments = departmentData?.data || departmentData?.departments || [];

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["positions", page, limit, search, statusFilter],
    () =>
      getAllPositionTable({
        page,
        limit,
        statusRole: statusFilter,
        search
      }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deletePosition, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.position.toast.deleted") });
      queryClient.invalidateQueries(["positions"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const positions = data?.data || [];
  const filteredPositions = departmentFilter
    ? positions.filter((p) => {
        const deptName = p.departmentData?.name || p.department || "";
        return deptName === departmentFilter;
      })
    : positions;
  const pagination = data?.pagination || {};
  const stats = data?.stats || {};

  const total = stats.total ?? pagination?.total ?? pagination?.totalItems ?? data?.total ?? 0;

  const activeCount = stats.active ?? 0;

  const draftCount = stats.draft ?? 0;

  const inactiveCount = stats.inactive ?? 0;
  const totalPages = pagination?.totalPages || Math.ceil(total / limit) || 1;

  const handleDelete = (position) => {
    setDeleteTarget(position);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: t("page.position.table.no"),
      render: (_, index) => (
        <span className="text-sm font-mono text-muted-foreground">
          {String(index + 1 + (page - 1) * limit).padStart(2, "0")}
        </span>
      )
    },
    {
      header: t("page.position.table.name"),
      render: (position) => (
        <span className="text-sm font-semibold text-primary">{position.name}</span>
      )
    },
    {
      header: t("page.position.table.department"),
      render: (position) =>
        position.departmentData?.name || position.department ? (
          <span className="inline-block px-2 py-0.5 rounded bg-secondary-fixed/30 text-on-secondary-fixed-variant text-xs font-semibold">
            {position.departmentData?.name || position.department}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
    },
    {
      header: t("page.position.table.description"),
      render: (position) => (
        <p className="text-sm text-muted-foreground max-w-xs truncate">
          {position.description || "-"}
        </p>
      )
    },
    {
      header: t("common.status"),
      align: "center",
      render: (position) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight border ${
            position.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
              : position.status === "draft"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
          }`}>
          {position.status === "active"
            ? t("common.active")
            : position.status === "draft"
              ? t("common.draft")
              : t("common.inactive")}
        </span>
      )
    },
    {
      header: t("common.createdBy"),
      render: (position) => (
        <span className="text-sm text-muted-foreground">
          {position.createdByUser?.fullName || position.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.position.table.createdDate"),
      render: (position) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(position.createdAt)}
        </span>
      )
    },
    {
      header: t("common.modifiedBy"),
      render: (position) => (
        <span className="text-sm text-muted-foreground">
          {position.modifiedByUser?.fullName || position.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.position.table.updatedDate"),
      render: (position) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(position.updatedAt)}
        </span>
      )
    },
    {
      header: t("common.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (position) => (
        <TableActions
          align="center"
          visible={2}
          items={[
            {
              label: t("common.view"),
              iconName: "visibility",
              hidden: !canAccess(user, MENU_KEY, "view"),
              onClick: () => navigate(`/detail-position?positionID=${position.id}`)
            },
            {
              label: t("common.edit"),
              iconName: "edit",
              hidden: !canAccess(user, MENU_KEY, "edit"),
              onClick: () => navigate(`/edit-position?id=${position.id}`)
            },
            {
              label: t("common.delete"),
              iconName: "delete",
              hidden: !canAccess(user, MENU_KEY, "delete"),
              onClick: () => handleDelete(position),
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
          { label: t("page.position.list.title") }
        ]}
        title={t("page.position.list.title")}
        description={t("page.position.list.description")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            data-tour="position-download-template"
            variant="outline"
            disabled={isDownloadingTemplate}
            onClick={async () => {
              if (departments.length === 0) {
                setNoDepartmentModal(true);
                return;
              }
              setIsDownloadingTemplate(true);
              try {
                await downloadPositionTemplate();
                toast.success(t("common.success"), {
                  description: t("page.position.toast.templateDownloaded")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.position.toast.templateDownloadFailed")
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
              ? t("common.downloading")
              : t("page.position.button.downloadTemplate")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            data-tour="position-download-data"
            variant="general"
            disabled={isDownloadingData}
            onClick={async () => {
              setIsDownloadingData(true);
              try {
                await downloadPositionExcel();
                toast.success(t("common.success"), {
                  description: t("page.position.toast.dataDownloaded")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.position.toast.dataDownloadFailed")
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
            {isDownloadingData ? t("common.downloading") : t("page.position.button.downloadData")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "import") && (
          <Button
            data-tour="position-upload"
            variant="import"
            onClick={() => setUploadModalOpen(true)}>
            <Upload size={16} className="mr-1" />
            {t("page.position.button.uploadExcel")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            data-tour="position-add"
            variant="success"
            onClick={() => navigate("/add-position")}
            className="shadow-md">
            <Plus size={16} className="mr-1" />
            {t("page.position.button.add")}
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  <div className="col-span-1 md:col-span-3 lg:col-span-1 bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                    <Skeleton className="h-8 w-28 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  <StatCard
                    label={t("page.position.stats.total")}
                    value={total.toLocaleString()}
                    icon={Briefcase}
                    variant="default"
                    subtitle={t("page.position.stats.totalSub")}
                    className="col-span-1 md:col-span-3 lg:col-span-1"
                  />
                  <StatCard
                    label={t("page.position.stats.active")}
                    value={activeCount.toLocaleString()}
                    icon={CheckCircle}
                    variant="active"
                    subtitle={`${total > 0 ? Math.round((activeCount / total) * 100) : 0}% ${t("page.position.stats.activeSub")}`}
                  />
                  <StatCard
                    label={t("page.position.stats.draft")}
                    value={draftCount.toLocaleString()}
                    icon={FileEdit}
                    variant="draft"
                  />
                  <StatCard
                    label={t("page.position.stats.inactive")}
                    value={inactiveCount.toLocaleString()}
                    icon={XCircle}
                    variant="inactive"
                    subtitle={t("page.position.stats.inactiveSub")}
                  />
                </div>
              )}

              <div data-tour="position-table" className="mt-6">
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.position.button.add"),
                          onClick: () => navigate("/add-position")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={filteredPositions}
                  isLoading={isLoading || isFetching}
                  isError={isError}
                  onRetry={refetch}
                  emptyMessage={t("page.position.list.empty")}
                  toolbar={
                    <TableToolbar
                      title={t("page.position.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="position-list-status"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.status")}
                        </label>
                        <Combobox
                          id="position-list-status"
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
                        <label
                          htmlFor="position-list-department"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("page.position.table.department")}
                        </label>
                        <Combobox
                          id="position-list-department"
                          options={[
                            {
                              value: "",
                              label: `${t("common.all")} ${t("page.position.table.department")}`
                            },
                            ...departments.map((dept) => ({ value: dept.name, label: dept.name }))
                          ]}
                          value={departmentFilter}
                          onChange={(v) => {
                            setDepartmentFilter(v);
                            setPage(1);
                          }}
                          placeholder={`${t("common.all")} ${t("page.position.table.department")}`}
                          searchPlaceholder="Cari departemen..."
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="position-list-search"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.search")}
                        </label>
                        <SearchInput
                          id="position-list-search"
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                            setPage(1);
                          }}
                          placeholder={t("page.position.list.search")}
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
                  onRowClick={(position) => navigate(`/detail-position?positionID=${position.id}`)}
                />
              </div>

              <div className="bg-gradient-to-br from-primary to-primary/90 rounded-xl p-5 flex flex-col text-primary-foreground mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="opacity-80" />
                  <h4 className="text-sm font-bold uppercase tracking-wider opacity-80">
                    {t("page.position.list.tips")}
                  </h4>
                </div>
                <ul className="space-y-2">
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.position.list.tip1")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.position.list.tip2")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.position.list.tip3")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.position.list.tip4")}</span>
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
        title={t("page.position.modal.deleteTitle", { name: deleteTarget?.name || "" })}
        description={t("page.position.modal.deleteDesc", { name: deleteTarget?.name || "" })}
        confirmText={t("page.position.modal.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
      <UploadExcelModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        uploadService={uploadPositionExcel}
        queryKey={["positions"]}
        title={t("page.position.button.uploadExcel")}
      />
      <Modal
        type="confirm"
        open={noDepartmentModal}
        onOpenChange={setNoDepartmentModal}
        title={t("page.position.modal.noDepartment.title")}
        description={t("page.position.modal.noDepartment.description")}
        confirmText={t("page.position.button.addDepartment")}
        onConfirm={() => setTimeout(() => navigate("/add-department"), 150)}
      />
    </div>
  );
};

export default PositionList;

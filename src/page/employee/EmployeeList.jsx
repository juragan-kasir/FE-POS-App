import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { getAllEmployee, deleteEmployee } from "@/services/employee";
import { getAllPositionTable } from "@/services/position";
import { getAllDepartmentTable } from "@/services/department";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import PageHeader from "@/components/ui/PageHeader";
import {
  User,
  Users,
  CheckCircle,
  FileEdit,
  XCircle,
  Eye,
  Edit,
  Trash2,
  MapPin,
  UserPlus,
  Lightbulb
} from "lucide-react";
import NoStore from "@/components/ui/NoStore";
import { useTranslation } from "react-i18next";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import StatCard from "@/components/ui/StatCard";
import { canAccess } from "@/utils/permission";
import { useLocations } from "@/queries/useLocations";

const positionColors = {
  manager: "bg-primary text-primary-foreground",
  kasir: "bg-muted text-muted-foreground",
  admin: "bg-muted text-muted-foreground",
  staff: "bg-muted text-muted-foreground",
  supervisor: "bg-muted text-foreground"
};

const getPositionClass = (position) => {
  const pos = typeof position === "string" ? position.toLowerCase() : "";
  return safeGet(positionColors, pos, "bg-muted text-muted-foreground");
};

const EmployeeList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/employee-list";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { t } = useTranslation();

  const isFiltered =
    search !== "" || locationFilter !== "" || positionFilter !== "" || departmentFilter !== "";

  const resetFilters = () => {
    setSearch("");
    setLocationFilter("");
    setPositionFilter("");
    setDepartmentFilter("");
    setPage(1);
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["employees", page, limit, search, locationFilter, positionFilter],
    () =>
      getAllEmployee({ page, limit, search, location: locationFilter, position: positionFilter }),
    { keepPreviousData: true }
  );

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data: positionData } = useQuery(["positions-active"], () =>
    getAllPositionTable({ page: 1, limit: 100, statusRole: "active", search: "" })
  );
  const positions = positionData?.data || positionData?.positions || [];

  const { data: departmentData } = useQuery(["departments-active"], () =>
    getAllDepartmentTable({ page: 1, limit: 100, statusRole: "active", search: "" })
  );
  const departments = departmentData?.data || departmentData?.departments || [];

  const deleteMutation = useMutation(deleteEmployee, {
    onSuccess: () => {
      toast.success(t("page.employee.list.toast.success"), {
        description: t("page.employee.list.toast.successDescription")
      });
      queryClient.invalidateQueries(["employees"]);
    },
    onError: (err) => {
      toast.error(t("page.employee.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const employees = data?.data || data?.employees || [];
  const filteredEmployees = departmentFilter
    ? employees.filter((e) => {
        const deptName = e.departmentData?.name || e.department || "";
        return deptName === departmentFilter;
      })
    : employees;
  const total = data?.total || data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1;
  const stats = data?.stats || {};
  const activeCount = stats.active ?? 0;
  const draftCount = stats.draft ?? 0;
  const inactiveCount = stats.inactive ?? 0;

  const handleDelete = (employee) => {
    setDeleteTarget(employee);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id || deleteTarget._id });
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: t("page.employee.list.photo"),
      render: (row) => (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border">
          {row.image ? (
            <img src={row.image} alt={row.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <User size={16} />
            </div>
          )}
        </div>
      )
    },
    {
      header: t("page.employee.table.id"),
      render: (row) => (
        <span className="text-sm font-mono font-bold text-primary">
          {row.employeeID || row.code || "-"}
        </span>
      )
    },
    {
      header: t("page.employee.table.name"),
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-foreground">{row.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      )
    },
    {
      header: t("page.employee.form.department"),
      render: (row) => (
        <span className="text-sm">{row.departmentData?.name || row.department || "-"}</span>
      )
    },
    {
      header: t("page.employee.table.position"),
      render: (row) => {
        const position = row.positionData?.name || row.role || "staff";
        return (
          <span
            className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${getPositionClass(position)}`}>
            {position === "kasir"
              ? t("page.employee.list.kasir")
              : position.charAt(0).toUpperCase() + position.slice(1)}
          </span>
        );
      }
    },
    {
      header: t("page.employee.form.employmentType"),
      render: (row) => (
        <span className="text-sm">
          {row.employmentType ? t(`page.employee.add.${row.employmentType.replace("-", "")}`) : "-"}
        </span>
      )
    },
    {
      header: t("page.employee.form.phoneNumber"),
      render: (row) => <span className="text-sm">{row.phoneNumber || "-"}</span>
    },
    {
      header: t("page.employee.table.branch"),
      render: (row) => (
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-muted-foreground text-base" />
          <span className="text-sm text-muted-foreground">
            {row.storeData?.name || "belum ada penempatan store"}
          </span>
        </div>
      )
    },
    {
      header: t("page.employee.table.status"),
      align: "center",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight border ${
            row.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
              : row.status === "draft"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
          }`}>
          {row.status === "active"
            ? t("common.active")
            : row.status === "draft"
              ? t("common.draft")
              : t("common.inactive")}
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
      header: t("common.createdAt"),
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "short",
                day: "numeric"
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
      header: t("common.updatedAt"),
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {row.updatedAt
            ? new Date(row.updatedAt).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "short",
                day: "numeric"
              })
            : "-"}
        </span>
      )
    },
    {
      header: t("page.employee.table.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (row) => (
        <TableActions
          align="center"
          items={[
            {
              label: t("page.employee.list.viewDetail"),
              iconName: "visibility",
              onClick: () => navigate(`/detail-employee?employeeID=${row.employeeID}`),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            {
              label: t("page.employee.list.editEmployee"),
              iconName: "edit",
              onClick: () => navigate(`/edit-employee?id=${row.id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("page.employee.list.deleteEmployee"),
              iconName: "delete",
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
    <div data-tour="page-employees" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.management"), i18nKey: "breadcrumb.management" },
          { label: t("page.employee.list.title"), i18nKey: "page.employee.list.title" }
        ]}
        title={t("page.employee.list.title")}
        description={t("page.employee.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            data-tour="employee-add"
            onClick={() => navigate("/add-employee")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg shadow-sm">
            <UserPlus size={20} className="text-lg" />
            {t("page.employee.add.title")}
          </Button>
        )}
      </PageHeader>

      <div>
        {locData && (locData?.data || []).length === 0 ? (
          <NoStore />
        ) : (
          <>
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
                    label={t("page.employee.table.total")}
                    value={total.toLocaleString() || "0"}
                    icon={Users}
                    variant="default"
                    subtitle={t("page.employee.list.subtitle")}
                    className="col-span-1 md:col-span-3 lg:col-span-1"
                  />
                  <StatCard
                    label={t("page.employee.table.active")}
                    value={activeCount.toLocaleString() || "0"}
                    icon={CheckCircle}
                    variant="active"
                    subtitle={`${total > 0 ? Math.round((activeCount / total) * 100) : 0}% ${t("page.employee.table.activeRate")}`}
                  />
                  <StatCard
                    label={t("page.employee.table.draft")}
                    value={draftCount.toLocaleString()}
                    icon={FileEdit}
                    variant="draft"
                  />
                  <StatCard
                    label={t("page.employee.table.inactive")}
                    value={inactiveCount.toLocaleString()}
                    icon={XCircle}
                    variant="inactive"
                    subtitle={t("page.employee.table.attentionNeeded")}
                  />
                </div>
              )}

              <div data-tour="employee-table" className="mt-6">
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.employee.add.title"),
                          onClick: () => navigate("/add-employee")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={filteredEmployees}
                  isLoading={isLoading || isFetching}
                  isError={isError}
                  onRetry={refetch}
                  emptyMessage={t("page.employee.list.empty")}
                  toolbar={
                    <TableToolbar
                      title={t("page.employee.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="employee-list-search"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.search")}
                        </label>
                        <SearchInput
                          id="employee-list-search"
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                            setPage(1);
                          }}
                          placeholder={t("page.employee.list.searchPlaceholder")}
                          isLoading={isFetching}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="employee-list-store"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("document.store")}
                        </label>
                        <Combobox
                          id="employee-list-store"
                          options={[
                            { value: "", label: t("page.employee.list.allStores") },
                            ...(locData?.data || []).map((loc) => ({
                              value: loc.id,
                              label: loc.name
                            }))
                          ]}
                          value={locationFilter}
                          onChange={(v) => {
                            setLocationFilter(v);
                            setPage(1);
                          }}
                          placeholder={t("page.employee.list.allStores")}
                          searchPlaceholder="Cari toko..."
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="employee-list-posisi"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("sidebar.posisi")}
                        </label>
                        <Combobox
                          id="employee-list-posisi"
                          options={[
                            { value: "", label: t("page.employee.list.allPositions") },
                            ...positions.map((pos) => ({
                              value: pos.name || pos.id,
                              label: pos.name
                            }))
                          ]}
                          value={positionFilter}
                          onChange={(v) => {
                            setPositionFilter(v);
                            setPage(1);
                          }}
                          placeholder={t("page.employee.list.allPositions")}
                          searchPlaceholder="Cari posisi..."
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="employee-list-departemen"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("sidebar.departemen")}
                        </label>
                        <Combobox
                          id="employee-list-departemen"
                          options={[
                            {
                              value: "",
                              label: `${t("common.all")} ${t("page.employee.form.department")}`
                            },
                            ...departments.map((dept) => ({ value: dept.name, label: dept.name }))
                          ]}
                          value={departmentFilter}
                          onChange={(v) => {
                            setDepartmentFilter(v);
                            setPage(1);
                          }}
                          placeholder={`${t("common.all")} ${t("page.employee.form.department")}`}
                          searchPlaceholder="Cari departemen..."
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
                    {t("common.tips")}
                  </h4>
                </div>
                <ul className="space-y-2">
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.employee.ui.useTheBranchFilterTo")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.employee.ui.downloadTheEmployeeReportAs")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.employee.ui.keepEmployeeDataUpTo")}</span>
                  </li>
                  <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                    <span className="text-primary-foreground/60 mt-0.5">•</span>
                    <span>{t("page.employee.ui.useTheActiveInactiveStatus")}</span>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.employee.modal.deleteTitle")}
        description={t("page.employee.modal.deleteDesc", {
          name: deleteTarget?.fullName || deleteTarget?.name || t("page.employee.list.data")
        })}
        confirmText={t("page.employee.modal.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default EmployeeList;

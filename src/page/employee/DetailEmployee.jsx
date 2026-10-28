import React from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Edit3,
  Calendar,
  Building2,
  Briefcase,
  MapPin,
  User,
  Shield,
  Wallet,
  Clock
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmployeeDetail } from "@/services/employee";
import { dateLocale } from "@/lib/locale";

const statusBadge = (status, t) => {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
        {t("common.active")}
      </span>
    );
  if (status === "draft")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        {t("common.draft")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
      {t("common.inactive")}
    </span>
  );
};

const roleLabel = (role, t) => {
  const map = {
    super_admin: "page.employee.list.supervisor",
    admin: "page.employee.list.admin",
    kasir: "page.employee.list.kasir",
    cashier: "page.employee.list.kasir",
    user: "page.employee.list.staff",
    staff: "page.employee.list.staff",
    kitchen: "common.staff"
  };
  if (!role) return "-";
  const key = map[String(role).toLowerCase()];
  return key ? t(key) : role;
};

const employmentTypeLabel = (type, t) => {
  const map = {
    "full-time": "page.employee.detail.employmentTypeFullTime",
    "part-time": "page.employee.detail.employmentTypePartTime",
    contract: "page.employee.detail.employmentTypeContract",
    internship: "page.employee.detail.employmentTypeInternship",
    fulltime: "page.employee.detail.employmentTypeFullTime",
    parttime: "page.employee.detail.employmentTypePartTime"
  };
  if (!type) return "-";
  const key = map[String(type).toLowerCase()];
  return key ? t(key) : type;
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(dateLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(dateLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: num % 1 === 0 ? 0 : 2
  }).format(num);
};

const InfoRow = ({ label, children }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <div className="font-medium">{children}</div>
  </div>
);

const DetailEmployee = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeID = searchParams.get("employeeID");

  const { data, isLoading, isError, refetch } = useQuery(
    ["employee-detail", employeeID],
    () => getEmployeeDetail(employeeID),
    {
      enabled: !!employeeID
    }
  );

  const employee = data?.data || data;

  if (!employeeID)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.employee.detail.notFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.employee.detail.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="danger" onClick={() => navigate("/employee-list")}>
          {t("common.back")}
        </Button>
      </div>
    );

  const avatarUrl = employee?.imageEmployee || employee?.image || employee?.photo || null;

  const employeeName = employee?.nameEmployee || employee?.fullName || employee?.name;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("breadcrumb.employee"),
            href: "/employee-list",
            i18nKey: "breadcrumb.employee"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : employeeName || "-"}
        description={t("page.employee.detailDesc")}
        backLink="/employee-list"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate(`/edit-employee?id=${employee?.id}`)}>
            <Edit3 size={14} className="mr-1.5" />
            {t("common.edit")}
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 md:col-span-2 space-y-4">
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
            </Card>
          </div>
        </div>
      ) : !employee ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("page.employee.detail.notFound")}</p>
        </div>
      ) : (
        <>
          {/* Profile header */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative bg-gradient-to-br from-primary/10 via-muted to-mist dark:from-primary/20 dark:via-night-mist dark:to-night-pearl h-28" />
            <div className="px-6 pb-6">
              <div className="relative -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="w-24 h-24 rounded-2xl border-2 border-background bg-muted shadow-sm overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={employeeName || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <Users size={36} className="text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{employeeName || "-"}</h2>
                    {statusBadge(employee.status, t)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    @{employee.userName || "-"}
                    {employee.employeeID ? (
                      <span className="ml-2 font-mono text-xs text-muted-foreground/70">
                        #{employee.employeeID}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {employee.positionData?.name && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Briefcase size={13} />
                    {employee.positionData.name}
                  </span>
                )}
                {employee.departmentData?.name && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    <Building2 size={13} />
                    {employee.departmentData.name}
                  </span>
                )}
                {employee.storeData?.name && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    <MapPin size={13} />
                    {employee.storeData.name}
                  </span>
                )}
                {employee.createdAt && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    <Calendar size={13} />
                    {t("page.employee.detail.joined", {
                      date: formatDate(employee.createdAt)
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main column */}
            <div className="space-y-4 md:col-span-2">
              {/* Basic Information */}
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
                  <User size={16} />
                  {t("page.employee.detail.basicInfo")}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 text-sm">
                  <InfoRow label={t("page.employee.name")}>{employeeName || "-"}</InfoRow>
                  <InfoRow label={t("page.employee.form.gender")}>{employee.gender || "-"}</InfoRow>
                  <InfoRow label={t("page.employee.detail.placeOfBirth")}>
                    {employee.placeOfBirth || "-"}
                  </InfoRow>
                  <InfoRow label={t("page.employee.detail.dateOfBirth")}>
                    {formatDate(employee.dateOfBirth)}
                  </InfoRow>
                  <InfoRow label={t("page.employee.form.phone")}>
                    {employee.phoneNumber || employee.phone || "-"}
                  </InfoRow>
                  <InfoRow label={t("page.employee.email")}>{employee.email || "-"}</InfoRow>
                  <div className="sm:col-span-2">
                    <InfoRow label={t("page.employee.address")}>{employee.address || "-"}</InfoRow>
                  </div>
                </div>
              </Card>

              {/* Job Information */}
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
                  <Briefcase size={16} />
                  {t("page.employee.detail.jobInfo")}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 text-sm">
                  <InfoRow label={t("page.employee.form.employeeId")}>
                    <span className="font-mono text-sm">
                      {employee.employeeID ? `#${employee.employeeID}` : "-"}
                    </span>
                  </InfoRow>
                  <InfoRow label={t("page.employee.form.position")}>
                    {employee.positionData?.name ||
                      employee.position?.namePosition ||
                      employee.position?.name ||
                      employee.positionName ||
                      "-"}
                  </InfoRow>
                  <InfoRow label={t("page.employee.form.department")}>
                    {employee.departmentData?.name ||
                      employee.department?.nameDepartment ||
                      employee.department?.name ||
                      employee.departmentName ||
                      "-"}
                  </InfoRow>
                  <InfoRow label={t("page.employee.detail.employmentType")}>
                    {employmentTypeLabel(employee.employmentType, t)}
                  </InfoRow>
                  <InfoRow label={t("page.employee.form.storePlacement")}>
                    {employee.storeData?.name || employee.store?.name || "-"}
                  </InfoRow>
                  <InfoRow label={t("page.employee.form.shift")}>
                    {employee.shift?.name ||
                      employee.shiftData?.name ||
                      (employee.shift ? String(employee.shift) : "-")}
                  </InfoRow>
                  <InfoRow label={t("page.employee.detail.startDate")}>
                    {formatDate(employee.startDate)}
                  </InfoRow>
                  <InfoRow label={t("page.employee.detail.endDate")}>
                    {formatDate(employee.endDate)}
                  </InfoRow>
                  {(employee.contractDuration || employee.employmentType === "contract") && (
                    <InfoRow label={t("page.employee.detail.contractDuration")}>
                      {employee.contractDuration || "-"}
                    </InfoRow>
                  )}
                  {(employee.contractDuration || employee.employmentType === "internship") && (
                    <InfoRow label={t("page.employee.detail.internshipDuration")}>
                      {employee.contractDuration || "-"}
                    </InfoRow>
                  )}
                </div>
              </Card>

              {/* Payroll */}
              {(employee.monthlySalary ||
                employee.dailySalary ||
                (employee.overtimeRate && Number(employee.overtimeRate) > 0)) && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">
                    <Wallet size={16} />
                    {t("page.employee.add.salarySection")}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-5 gap-x-6 text-sm">
                    <InfoRow label={t("page.employee.form.monthlySalary")}>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(employee.monthlySalary)}
                      </span>
                    </InfoRow>
                    <InfoRow label={t("page.employee.form.dailySalary")}>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(employee.dailySalary)}
                      </span>
                    </InfoRow>
                    <InfoRow label={t("page.employee.detail.overtimeRate")}>
                      <span className="font-medium tabular-nums">
                        {employee.overtimeRate !== null &&
                        employee.overtimeRate !== undefined &&
                        employee.overtimeRate !== "" ? (
                          formatCurrency(employee.overtimeRate)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </span>
                    </InfoRow>
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  <Shield size={14} />
                  {t("page.employee.detail.accountAccess")}
                </div>
                <div className="space-y-4 text-sm">
                  <InfoRow label={t("page.employee.detail.userType")}>
                    {roleLabel(employee.userType || employee.roleType, t)}
                  </InfoRow>
                  {employee.roleId && (
                    <InfoRow label={t("page.employee.detail.role")}>
                      <span className="font-mono text-xs">#{employee.roleId}</span>
                      {employee.roleData?.name ? (
                        <span className="ml-2">{employee.roleData.name}</span>
                      ) : null}
                    </InfoRow>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  <Clock size={14} />
                  {t("page.employee.detail.systemInfo")}
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User size={13} className="shrink-0" />
                    <span>
                      {t("common.createdBy")}:{" "}
                      <span className="text-foreground font-medium">
                        {employee.createdByUser?.fullName ||
                          employee.createdByUser?.userName ||
                          "-"}
                      </span>
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("page.employee.detail.createdAt")}
                    </p>
                    <p className="font-medium text-sm tabular-nums">
                      {formatDateTime(employee.createdAt)}
                    </p>
                  </div>
                  <div className="border-t border-border/50 pt-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("page.employee.detail.updatedAt")}
                    </p>
                    <p className="font-medium text-sm tabular-nums">
                      {formatDateTime(employee.updatedAt)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DetailEmployee;

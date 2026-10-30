import React, { useState } from "react";
import { usePageParam, useSearchParam } from "@/hooks/usePageParam";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle,
  Edit,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  XCircle
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import StatCard from "@/components/ui/StatCard";
import { AccessDenied } from "@/components/ui/RequireRole";
import { SearchInput } from "@/components/ui/SearchInput";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import { createTenant, deleteTenant, getTenants, updateTenant } from "@/services/tenant";
import { useTenantManagePermission } from "@/hooks/useTenantManagePermission";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { dateLocale } from "@/lib/locale";

export const TENANTS_QUERY_KEY = "tenants";
const DEFAULT_LIMIT = 10;
const P = "page.tenant";

// Mirrors the BE contract: 1-50 lowercase letters/digits, inner hyphens only.
const CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

// "Warung Bakso Pak Kumis" → "warung-bakso-pak-kumis" (suggestion only; the
// code stays editable until the tenant is created, immutable afterwards).
export const suggestTenantCode = (name) =>
  (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");

// Same pill styling as the store list (/location-list).
const STATUS_STYLES = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
  suspended:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
};

const TenantStatusPill = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
        STATUS_STYLES[status] || STATUS_STYLES.suspended
      }`}>
      {t(`${P}.status.${status}`, { defaultValue: status })}
    </span>
  );
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(dateLocale(), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

// BE error codes → field-level message keys.
const errorMessage = (t, error) => {
  const code = error?.response?.data?.code;
  if (code === "TENANT_CODE_TAKEN") return { field: "code", message: t(`${P}.error.codeTaken`) };
  if (code === "INVALID_CODE") return { field: "code", message: t(`${P}.error.invalidCode`) };
  if (code === "INVALID_NAME") return { field: "name", message: t(`${P}.error.invalidName`) };
  if (code === "TENANT_HAS_STORES") return { field: null, message: t(`${P}.error.hasStores`) };
  if (code === "TENANT_HAS_MEMBERS") return { field: null, message: t(`${P}.error.hasMembers`) };
  if (code === "TENANT_STATUS_PLATFORM_ONLY") {
    return { field: null, message: t(`${P}.error.statusPlatformOnly`) };
  }
  if (error?.response?.status === 403) return { field: null, message: t(`${P}.error.forbidden`) };
  return { field: null, message: t(`${P}.error.generic`) };
};

const fieldLabelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const TenantFormModal = ({ open, tenant, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!tenant;
  const [name, setName] = useState(tenant?.name || "");
  const [code, setCode] = useState(tenant?.code || "");
  const [codeTouched, setCodeTouched] = useState(false);
  const [error, setError] = useState({ field: null, message: null });

  const mutation = useMutation(
    () =>
      isEdit
        ? updateTenant(tenant.id, { name: name.trim() })
        : createTenant({ code: code.trim(), name: name.trim() }),
    {
      onSuccess: () => {
        toast.success(t(isEdit ? `${P}.toast.updated` : `${P}.toast.created`));
        queryClient.invalidateQueries(TENANTS_QUERY_KEY);
        onClose();
      },
      onError: (err) => {
        const mapped = errorMessage(t, err);
        setError(mapped);
        if (!mapped.field) toast.error(mapped.message);
      }
    }
  );

  // Modal convention: returning false keeps it open — on a validation error,
  // and while the request runs (onSuccess closes it; a failure keeps the
  // typed values on screen).
  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 100) {
      setError({ field: "name", message: t(`${P}.error.invalidName`) });
      return false;
    }
    if (!isEdit && !CODE_PATTERN.test(code.trim())) {
      setError({ field: "code", message: t(`${P}.error.invalidCode`) });
      return false;
    }
    if (isEdit && trimmedName === tenant.name) return undefined;
    mutation.mutate();
    return false;
  };

  return (
    <Modal
      type="form"
      open={open}
      onOpenChange={(next) => !next && !mutation.isLoading && onClose()}
      title={t(isEdit ? `${P}.form.editTitle` : `${P}.form.createTitle`)}
      description={t(isEdit ? `${P}.form.editDescription` : `${P}.form.createDescription`)}
      confirmText={t(`${P}.form.save`)}
      loading={mutation.isLoading}
      onConfirm={submit}>
      <div className="space-y-4 py-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tenant-name" className={fieldLabelClass}>
            {t(`${P}.form.name`)} <span className="text-destructive">*</span>
          </label>
          <Input
            id="tenant-name"
            value={name}
            maxLength={FIELD_LIMITS.BUSINESS_NAME}
            autoComplete="off"
            placeholder={t(`${P}.form.namePlaceholder`)}
            aria-invalid={error.field === "name" || undefined}
            onChange={(e) => {
              setName(e.target.value);
              if (!isEdit && !codeTouched) setCode(suggestTenantCode(e.target.value));
              if (error.field === "name") setError({ field: null, message: null });
            }}
          />
          {error.field === "name" && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tenant-code" className={fieldLabelClass}>
            {t(`${P}.form.code`)} <span className="text-destructive">*</span>
          </label>
          <Input
            id="tenant-code"
            value={code}
            maxLength={FIELD_LIMITS.CODE}
            autoComplete="off"
            disabled={isEdit}
            placeholder="warung-bakso"
            className="font-mono"
            aria-invalid={error.field === "code" || undefined}
            aria-describedby="tenant-code-hint"
            onChange={(e) => {
              setCode(e.target.value.toLowerCase());
              setCodeTouched(true);
              if (error.field === "code") setError({ field: null, message: null });
            }}
          />
          {error.field === "code" ? (
            <p id="tenant-code-hint" role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          ) : (
            <p id="tenant-code-hint" className="text-xs text-muted-foreground">
              {t(isEdit ? `${P}.form.codeImmutable` : `${P}.form.codeHint`)}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Stat-card counts: one-row pages per status, read from pagination.total.
const useTenantCount = (status, enabled) =>
  useQuery([TENANTS_QUERY_KEY, "count", status], () => getTenants({ page: 1, limit: 1, status }), {
    enabled,
    retry: false,
    refetchOnWindowFocus: false
  });

const TenantList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const permission = useTenantManagePermission();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useSearchParam();
  const [statusFilter, setStatusFilter] = useState("all");
  const [formTarget, setFormTarget] = useState(null); // { tenant } | null
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // The platform sees every tenant; a client's own super admin (bakso_admin)
  // only its own, without suspend/resume (the BE enforces both).
  const enabled = permission.canAdministerTenants;
  const ownOnly = permission.ownTenantsOnly;
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery(
    [TENANTS_QUERY_KEY, page, limit, search, statusFilter],
    () => getTenants({ page, limit, search, status: statusFilter }),
    { enabled, keepPreviousData: true, retry: false, refetchOnWindowFocus: false }
  );
  const totalCount = useTenantCount("all", enabled);
  const activeCount = useTenantCount("active", enabled);
  const suspendedCount = useTenantCount("suspended", enabled);

  const statusMutation = useMutation(({ id, status }) => updateTenant(id, { status }), {
    onSuccess: () => {
      toast.success(t(`${P}.toast.updated`));
      queryClient.invalidateQueries(TENANTS_QUERY_KEY);
      setStatusTarget(null);
    },
    onError: (err) => toast.error(errorMessage(t, err).message)
  });

  const deleteMutation = useMutation((id) => deleteTenant(id), {
    onSuccess: () => {
      toast.success(t(`${P}.toast.deleted`));
      queryClient.invalidateQueries(TENANTS_QUERY_KEY);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(errorMessage(t, err).message);
      setDeleteTarget(null);
    }
  });

  if (permission.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (permission.isError) return <AbortController refetch={permission.refetch} />;
  if (!permission.canAdministerTenants || error?.response?.status === 403) return <AccessDenied />;

  const tenants = data?.data || [];
  const pagination = data?.pagination || {};
  const isFiltered = search !== "" || statusFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };
  const countOf = (query) => (query.data?.pagination?.total ?? 0).toLocaleString();

  const columns = [
    {
      header: t(`${P}.table.code`),
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
          {row.code}
        </span>
      )
    },
    {
      header: t(`${P}.table.name`),
      render: (row) => <span className="font-medium text-foreground">{row.name}</span>
    },
    {
      header: t(`${P}.table.stores`),
      render: (row) => <span className="text-xs font-semibold tabular-nums">{row.storeCount}</span>
    },
    {
      header: t(`${P}.table.members`),
      render: (row) => (
        <span className="text-xs font-semibold tabular-nums">{row.activeMemberCount}</span>
      )
    },
    {
      header: t(`${P}.table.status`),
      render: (row) => <TenantStatusPill status={row.status} />
    },
    {
      header: t(`${P}.table.createdAt`),
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(row.createdAt)}
        </span>
      )
    },
    {
      header: t(`${P}.table.updatedAt`),
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(row.updatedAt)}
        </span>
      )
    },
    {
      header: t("common.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Edit, label: t("common.edit") },
        ...(ownOnly
          ? []
          : [
              { icon: PauseCircle, label: t(`${P}.action.suspend`) },
              { icon: PlayCircle, label: t(`${P}.action.resume`) }
            ]),
        { icon: Trash2, label: t(`${P}.action.delete`) }
      ],
      render: (row) => (
        <TableActions
          visible={2}
          align="center"
          items={[
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => setFormTarget({ tenant: row })
            },
            {
              label: t(`${P}.action.suspend`),
              icon: PauseCircle,
              danger: true,
              onClick: () => setStatusTarget({ tenant: row, status: "suspended" }),
              hidden: ownOnly || row.status !== "active"
            },
            {
              label: t(`${P}.action.resume`),
              icon: PlayCircle,
              onClick: () => setStatusTarget({ tenant: row, status: "active" }),
              hidden: ownOnly || row.status === "active"
            },
            {
              label: t(`${P}.action.delete`),
              icon: Trash2,
              danger: true,
              onClick: () => setDeleteTarget(row),
              // a tenant with stores can only be suspended
              hidden: row.storeCount > 0
            }
          ]}
        />
      )
    }
  ];

  return (
    <div data-tour="page-tenant" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t(`${P}.title`), i18nKey: `${P}.title` }
        ]}
        title={t(`${P}.title`)}
        description={ownOnly ? t(`${P}.ownScopeNote`) : t(`${P}.description`)}>
        <Button
          variant="success"
          onClick={() => setFormTarget({ tenant: null })}
          className="shrink-0">
          <Plus size={18} />
          {t("breadcrumb.add")}
        </Button>
      </PageHeader>

      {isError && error?.response?.status !== 403 ? (
        <AbortController refetch={refetch} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label={t(`${P}.stats.total`)}
              value={countOf(totalCount)}
              icon={Building2}
              variant="default"
              subtitle={t(`${P}.stats.totalSub`)}
            />
            <StatCard
              label={t(`${P}.stats.active`)}
              value={countOf(activeCount)}
              icon={CheckCircle}
              variant="active"
              subtitle={t(`${P}.stats.activeSub`)}
            />
            <StatCard
              label={t(`${P}.stats.suspended`)}
              value={countOf(suspendedCount)}
              icon={XCircle}
              variant="inactive"
              subtitle={t(`${P}.stats.suspendedSub`)}
            />
          </div>

          <DataTable
            columns={columns}
            data={tenants}
            isLoading={isLoading || isFetching}
            emptyMessage={t(`${P}.empty`)}
            emptyIcon={Building2}
            emptyAction={{
              label: t("breadcrumb.add"),
              onClick: () => setFormTarget({ tenant: null })
            }}
            toolbar={
              <TableToolbar title={t(`${P}.title`)} onReset={resetFilters} isFiltered={isFiltered}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tenant-list-search" className={fieldLabelClass}>
                    {t("common.search")}
                  </label>
                  <SearchInput
                    id="tenant-list-search"
                    value={search}
                    onChange={(value) => {
                      setSearch(value);
                    }}
                    placeholder={t(`${P}.searchPlaceholder`)}
                    isLoading={isFetching}
                    className="w-full md:w-60"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tenant-status-filter" className={fieldLabelClass}>
                    {t("common.status")}
                  </label>
                  <Combobox
                    id="tenant-status-filter"
                    options={[
                      { value: "all", label: t("common.all") },
                      { value: "active", label: t(`${P}.status.active`) },
                      { value: "suspended", label: t(`${P}.status.suspended`) }
                    ]}
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value || "all");
                      setPage(1);
                    }}
                    placeholder={t("common.all")}
                    searchPlaceholder={t("common.search")}
                  />
                </div>
              </TableToolbar>
            }
            pagination={{
              page: pagination.page || page,
              totalPages: pagination.totalPages || 1,
              total: pagination.total || 0,
              onPageChange: setPage,
              pageSize: limit,
              onPageSizeChange: (value) => {
                setLimit(Number(value) || DEFAULT_LIMIT);
                setPage(1);
              }
            }}
          />
        </div>
      )}

      {formTarget && (
        <TenantFormModal open tenant={formTarget.tenant} onClose={() => setFormTarget(null)} />
      )}

      <Modal
        type="confirm"
        open={!!statusTarget}
        onOpenChange={(open) => !open && !statusMutation.isLoading && setStatusTarget(null)}
        title={t(
          statusTarget?.status === "suspended"
            ? `${P}.modal.suspendTitle`
            : `${P}.modal.resumeTitle`
        )}
        description={
          statusTarget?.status === "suspended"
            ? t(`${P}.form.suspendWarning`)
            : t(`${P}.modal.resumeDesc`, { name: statusTarget?.tenant?.name || "" })
        }
        confirmText={t(
          statusTarget?.status === "suspended" ? `${P}.action.suspend` : `${P}.action.resume`
        )}
        loading={statusMutation.isLoading}
        onConfirm={() => {
          if (!statusTarget) return undefined;
          statusMutation.mutate({ id: statusTarget.tenant.id, status: statusTarget.status });
          return false; // closed by onSuccess
        }}
      />

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleteMutation.isLoading && setDeleteTarget(null)}
        title={t(`${P}.modal.deleteTitle`)}
        description={t(`${P}.modal.deleteDesc`, { name: deleteTarget?.name || "" })}
        confirmText={t(`${P}.action.delete`)}
        loading={deleteMutation.isLoading}
        onConfirm={() => {
          if (!deleteTarget) return undefined;
          deleteMutation.mutate(deleteTarget.id);
          return false; // closed by onSuccess / onError
        }}
      />
    </div>
  );
};

export default TenantList;

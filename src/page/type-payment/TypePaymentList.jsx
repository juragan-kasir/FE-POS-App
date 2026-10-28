import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
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
  CreditCard,
  Loader2,
  CheckCircle,
  FileEdit,
  XCircle,
  Table,
  Download,
  Upload
} from "lucide-react";
import {
  getAllTypePaymentListActive,
  deleteTypePayment,
  downloadTypePaymentTemplate,
  downloadTypePaymentExcel
} from "@/services/type-payment";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import StatCard from "@/components/ui/StatCard";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import { uploadTypePaymentExcel } from "@/services/type-payment";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useLocations } from "@/queries/useLocations";

const TypePaymentList = () => {
  const { t, i18n } = useTranslation();

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      const locale = i18n.language === "id" ? "id-ID" : "en-US";
      return (
        d.toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric"
        }) +
        " " +
        d.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit"
        })
      );
    } catch {
      return "-";
    }
  };
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
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const isFiltered = search !== "" || statusFilter !== "all" || storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGlobalStoreFilter("all");
    setPage(1);
  };

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/type-payment-list";
  const locationParam = user?.store || "";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const effectiveStore = isSuperAdmin ? (storeFilter !== "all" ? storeFilter : "") : locationParam;

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["type-payments", page, limit, search, statusFilter, effectiveStore],
    () => getAllTypePaymentListActive({ page: 1, limit: 9999, store: effectiveStore }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteTypePayment, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.typePayment.toast.deleteSuccess")
      });
      queryClient.invalidateQueries(["type-payments"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), { description: err?.response?.data?.message || err.message });
    }
  });

  const rawPayments = data?.data || [];
  const stats = data?.stats || {};

  const isStatusActive = (item) =>
    item.status === true || item.status === "active" || item.isActive === true;
  const isStatusDraft = (item) => item.status === "draft";
  const isStatusInactive = (item) => !isStatusActive(item) && !isStatusDraft(item);

  const filteredPayments = rawPayments.filter((item) => {
    if (statusFilter === "active" && !isStatusActive(item)) return false;
    if (statusFilter === "draft" && !isStatusDraft(item)) return false;
    if (statusFilter === "inactive" && !isStatusInactive(item)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchType = item.type?.toLowerCase().includes(q);
      if (!matchName && !matchType) return false;
    }
    return true;
  });

  const totalFiltered = filteredPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage = Math.min(page, totalPages);
  const payments = filteredPayments.slice((safePage - 1) * limit, safePage * limit);
  const total = totalFiltered;

  const activeCount = stats.active ?? rawPayments.filter(isStatusActive).length;
  const draftCount = stats.draft ?? rawPayments.filter(isStatusDraft).length;
  const inactiveCount = stats.inactive ?? rawPayments.length - activeCount - draftCount;

  const handleDelete = (item) => {
    setDeleteTarget(item);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const getStatusBadge = (item) => {
    const isActive = item.status === true || item.status === "active" || item.isActive === true;
    const isDraft = item.status === "draft";
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive
            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
            : isDraft
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        }`}>
        {isActive ? t("common.active") : isDraft ? t("common.draft") : t("common.inactive")}
      </span>
    );
  };

  const columns = [
    {
      header: t("page.typePayment.table.name"),
      render: (row) => (
        <span className="text-sm font-semibold text-foreground">{row.name || "-"}</span>
      )
    },
    {
      header: t("page.typePayment.table.type"),
      render: (row) => <span className="text-sm text-muted-foreground">{row.type || "-"}</span>
    },
    {
      header: t("page.typePayment.form.fee"),
      render: (row) => {
        if (row.feeType === "percent") {
          return <span className="text-sm text-muted-foreground">{row.fee || 0}%</span>;
        }
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {Number(row.fee) > 0 ? `Rp ${Number(row.fee).toLocaleString("id-ID")}` : "-"}
          </span>
        );
      }
    },
    {
      header: t("page.typePayment.form.tenor"),
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.tenor > 0 ? `${row.tenor} hari` : "-"}
        </span>
      )
    },
    {
      header: t("page.typePayment.table.store"),
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.store?.name || row.store || "-"}</span>
      )
    },
    {
      header: t("common.status"),
      render: (row) => getStatusBadge(row)
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
      header: t("page.typePayment.table.createdDate"),
      render: (row) => (
        <span className="text-sm font-mono text-muted-foreground">{formatDate(row.createdAt)}</span>
      )
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
      header: t("page.typePayment.table.updatedDate"),
      render: (row) => (
        <span className="text-sm font-mono text-muted-foreground">{formatDate(row.updatedAt)}</span>
      )
    },
    {
      header: t("common.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (row) => (
        <TableActions
          align="right"
          visible={2}
          items={[
            ...(canAccess(user, MENU_KEY, "detail")
              ? [
                  {
                    label: t("common.view"),
                    icon: Eye,
                    onClick: () => navigate(`/detail-type-payment?id=${row.id || row._id}`)
                  }
                ]
              : []),
            ...(canAccess(user, MENU_KEY, "edit") && !row.isSystem
              ? [
                  {
                    label: t("common.edit"),
                    icon: Edit,
                    onClick: () => navigate(`/edit-type-payment?id=${row.id || row._id}`)
                  }
                ]
              : []),
            ...(canAccess(user, MENU_KEY, "delete") && !row.isSystem
              ? [
                  {
                    label: t("common.delete"),
                    icon: Trash2,
                    danger: true,
                    onClick: () => handleDelete(row)
                  }
                ]
              : [])
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
          { label: t("page.typePayment.list.title") }
        ]}
        title={t("page.typePayment.list.title")}
        description={t("page.typePayment.list.description")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="outline"
            disabled={isDownloadingTemplate}
            onClick={async () => {
              setIsDownloadingTemplate(true);
              try {
                await downloadTypePaymentTemplate();
                toast.success(t("common.success"), {
                  description: t("page.typePayment.toast.templateSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.typePayment.toast.templateError")
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
            {t("page.typePayment.button.downloadTemplate")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="general"
            disabled={isDownloadingData}
            onClick={async () => {
              setIsDownloadingData(true);
              try {
                await downloadTypePaymentExcel();
                toast.success(t("common.success"), {
                  description: t("page.typePayment.toast.dataSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.typePayment.toast.dataError")
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
            {t("page.typePayment.button.downloadData")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "import") && (
          <Button variant="import" onClick={() => setUploadModalOpen(true)}>
            <Upload size={20} className="text-lg mr-1" />
            {t("page.typePayment.button.upload")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button variant="success" onClick={() => navigate("/add-type-payment")}>
            <Plus size={18} className="mr-1" />
            {t("page.typePayment.button.add")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isError ? (
            <AbortController refetch={refetch} />
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
                    label={t("page.typePayment.stats.total")}
                    value={stats.total ?? total}
                    icon={CreditCard}
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

              <div data-tour="type-payment-table">
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.typePayment.button.add"),
                          onClick: () => navigate("/add-type-payment")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={payments}
                  isLoading={isLoading || isFetching}
                  emptyIcon={CreditCard}
                  emptyMessage={t("page.typePayment.list.empty")}
                  toolbar={
                    <TableToolbar
                      title={t("page.typePayment.list.title")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      {isSuperAdmin && (
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="type-payment-list-store"
                            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("page.goodsReceipt.detail.store")}
                          </label>
                          <Combobox
                            id="type-payment-list-store"
                            options={[
                              { value: "all", label: t("page.employee.list.allStores") },
                              ...(locData?.data || []).map((loc) => ({
                                value: loc.id,
                                label: loc.name
                              }))
                            ]}
                            value={storeFilter}
                            onChange={(v) => {
                              setGlobalStoreFilter(v);
                              setPage(1);
                            }}
                            placeholder={t("page.employee.list.allStores")}
                            searchPlaceholder="Cari toko..."
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="type-payment-list-status"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.status")}
                        </label>
                        <Combobox
                          id="type-payment-list-status"
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
                        <label
                          htmlFor="type-payment-list-search"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.search")}
                        </label>
                        <SearchInput
                          id="type-payment-list-search"
                          value={search}
                          onChange={(val) => {
                            setSearch(val);
                            setPage(1);
                          }}
                          placeholder={t("page.typePayment.list.search")}
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
        description={t("page.typePayment.deleteConfirmDescription", {
          name: deleteTarget?.name || ""
        })}
        confirmText={t("modal.yesDelete")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}

      <UploadExcelModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        uploadService={uploadTypePaymentExcel}
        title={t("page.typePayment.upload.title")}
        onSuccess={() => {
          queryClient.invalidateQueries(["type-payments"]);
        }}
      />
    </div>
  );
};

export default TypePaymentList;

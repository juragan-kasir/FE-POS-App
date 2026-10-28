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
  Building2,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  FileEdit,
  Scale,
  Table,
  Download,
  Upload
} from "lucide-react";
import {
  getAllSupplier,
  deleteSupplier,
  downloadSupplierTemplate,
  downloadSupplierExcel
} from "@/services/supplier";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import { uploadSupplierExcel } from "@/services/supplier";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import StatCard from "@/components/ui/StatCard";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import StoreFilter from "@/components/ui/StoreFilter";
import { Combobox } from "@/components/ui/combobox";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";
import { dateLocale } from "@/lib/locale";

const SupplierList = () => {
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
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [statusFilter, setStatusFilter] = useState("all");

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/supplier";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["suppliers", page, limit, search, storeFilter, statusFilter],
    () =>
      getAllSupplier({
        page,
        limit,
        search: search || undefined,
        store: isSuperAdmin
          ? storeFilter && storeFilter !== "all"
            ? storeFilter
            : ""
          : user?.store || "",
        status: statusFilter
      }),
    { keepPreviousData: true }
  );

  const isFiltered = search !== "" || storeFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setGlobalStoreFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const deleteMutation = useMutation(deleteSupplier, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.supplier.toast.success") });
      queryClient.invalidateQueries(["suppliers"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), { description: err?.response?.data?.message || err.message });
    }
  });

  const suppliers = data?.data || [];
  const pagination = data?.pagination || {};
  const total = pagination?.total || pagination?.totalItems || data?.total || 0;
  const totalPages = pagination?.totalPages || Math.ceil(total / limit) || 1;

  const handleDelete = (supplier) => {
    setDeleteTarget(supplier);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: t("page.supplier.form.name"),
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            {item.name?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <span className="font-medium text-foreground">{item.name || "-"}</span>
        </div>
      )
    },
    {
      header: t("header.selectStore") || "Store",
      render: (item) => {
        const stores = Array.isArray(item.store) ? item.store : [];
        return (
          <span className="text-sm text-muted-foreground">
            {stores.length > 0
              ? stores.map((s) => (typeof s === "object" ? s.name : s)).join(", ")
              : t("page.supplier.form.storeSection.allStores") || "Semua Toko"}
          </span>
        );
      }
    },
    {
      header: t("page.supplier.products.title") || "Produk",
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.productCount || 0} {t("page.supplier.products.title")?.toLowerCase() || "produk"}
        </span>
      )
    },
    {
      header: t("page.supplier.form.contactPerson"),
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.contactPerson || "-"}</span>
      )
    },
    {
      header: t("page.supplier.form.phone"),
      render: (item) => <span className="text-sm text-muted-foreground">{item.phone || "-"}</span>
    },
    {
      header: t("page.supplier.form.email"),
      render: (item) => <span className="text-sm text-muted-foreground">{item.email || "-"}</span>
    },
    {
      header: t("page.supplier.form.address"),
      render: (item) => (
        <span className="text-muted-foreground max-w-[200px] block truncate text-sm">
          {item.address || "-"}
        </span>
      )
    },
    {
      header: t("common.status"),
      render: (item) => {
        const isActive = item.status === "active" || item.status === true;
        const isDraft = item.status === "draft";
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : isDraft
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                isActive ? "bg-green-500" : isDraft ? "bg-amber-500" : "bg-red-500"
              }`}
            />
            {isActive
              ? t("common.active")
              : isDraft
                ? t("page.supplier.status.draft")
                : t("common.inactive")}
          </span>
        );
      }
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
            {d.toLocaleDateString(dateLocale(), {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}{" "}
            {d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
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
      header: t("page.supplier.table.updatedAt"),
      render: (item) => {
        if (!item.updatedAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(item.updatedAt);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString(dateLocale(), {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}{" "}
            {d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("common.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Scale, label: t("common.compare") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => (
        <TableActions
          align="center"
          visible={2}
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              hidden: !canAccess(user, MENU_KEY, "view"),
              onClick: () => navigate(`/detail-supplier?id=${item.id || item._id}`)
            },
            {
              label: t("common.compare"),
              icon: Scale,
              hidden: !canAccess(user, MENU_KEY, "view"),
              onClick: () => navigate("/supplier-comparison")
            },
            {
              label: t("common.edit"),
              icon: Edit,
              hidden: !canAccess(user, MENU_KEY, "edit"),
              onClick: () => navigate(`/edit-supplier?id=${item.id || item._id}`)
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
    <div data-tour="page-supplier" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("breadcrumb.supplier") }
        ]}
        title={t("page.supplier.list.title")}
        description={t("page.supplier.list.description")}>
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="outline"
            disabled={isDownloadingTemplate}
            onClick={async () => {
              setIsDownloadingTemplate(true);
              try {
                await downloadSupplierTemplate();
                toast.success(t("common.success"), {
                  description: t("page.supplier.toast.templateSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.supplier.toast.templateError")
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
            {t("page.supplier.button.downloadTemplate")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "export") && (
          <Button
            variant="general"
            disabled={isDownloadingData}
            onClick={async () => {
              setIsDownloadingData(true);
              try {
                await downloadSupplierExcel();
                toast.success(t("common.success"), {
                  description: t("page.supplier.toast.dataSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.supplier.toast.dataError")
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
            {t("page.supplier.button.downloadData")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "import") && (
          <Button variant="import" onClick={() => setUploadModalOpen(true)}>
            <Upload size={20} className="text-lg mr-1" />
            {t("page.supplier.button.upload")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            data-tour="supplier-add"
            onClick={() => navigate("/add-supplier")}
            className="shadow-md">
            <Plus size={18} />
            {t("page.supplier.button.add")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {/* Stats Cards */}
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
                label={t("page.supplier.stats.total")}
                value={total}
                icon={Building2}
                variant="default"
              />
              <StatCard
                label={t("common.active")}
                value={data?.stats?.active ?? 0}
                icon={CheckCircle}
                variant="active"
              />
              <StatCard
                label={t("common.inactive")}
                value={data?.stats?.inactive ?? 0}
                icon={XCircle}
                variant="inactive"
              />
              <StatCard
                label={t("common.draft")}
                value={data?.stats?.draft ?? 0}
                icon={FileEdit}
                variant="draft"
              />
            </div>
          )}

          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div data-tour="supplier-table">
              <DataTable
                emptyAction={
                  canAccess(user, MENU_KEY, "add")
                    ? {
                        label: t("page.supplier.button.add"),
                        onClick: () => navigate("/add-supplier")
                      }
                    : undefined
                }
                columns={columns}
                data={suppliers}
                isLoading={isLoading || isFetching}
                emptyMessage={t("page.supplier.list.empty")}
                emptyIcon={Building2}
                toolbar={
                  <TableToolbar
                    title={t("page.supplier.list.title")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.goodsReceipt.detail.store")}
                      </label>
                      <StoreFilter
                        locations={locData?.data || []}
                        value={storeFilter}
                        onChange={(val) => {
                          setGlobalStoreFilter(val);
                          setPage(1);
                        }}
                        isSuperAdmin={isSuperAdmin}
                        t={t}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="supplier-list-status"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.status")}
                      </label>
                      <Combobox
                        id="supplier-list-status"
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
                        htmlFor="supplier-list-search"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.search")}
                      </label>
                      <SearchInput
                        id="supplier-list-search"
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.supplier.list.search")}
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
              />
            </div>
          )}
        </>
      )}

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("modal.confirmDelete")}
        description={`Yakin ingin menghapus supplier ${deleteTarget?.name || ""}?`}
        confirmText={t("common.delete")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}

      <UploadExcelModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        uploadService={uploadSupplierExcel}
        queryKey={["suppliers"]}
        title={t("page.supplier.upload.title")}
      />
    </div>
  );
};

export default SupplierList;

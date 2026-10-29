import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import { formatDateOnly } from "@/utils/dateOnly";
import React, { useState } from "react";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Tags,
  Gift,
  Eye,
  CheckCircle,
  XCircle,
  FileEdit,
  Clock,
  RotateCcw,
  CalendarRange,
  Table,
  Download,
  Upload,
  Loader2,
  X
} from "lucide-react";
import {
  getAllDiscount,
  deleteDiscount,
  editDiscount,
  downloadDiscountTemplate,
  downloadDiscountExcel,
  uploadDiscountExcel
} from "@/services/discount";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import StoreFilter from "@/components/ui/StoreFilter";
import { SearchInput } from "@/components/ui/SearchInput";
import StatCard from "@/components/ui/StatCard";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import UploadExcelModal from "@/components/organism/UploadExcelModal";
import { useTranslation } from "react-i18next";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import { canAccess } from "@/utils/permission";
import { DatePicker } from "@/components/ui/date-picker";
import TableActions from "@/components/ui/TableActions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const PROMO_TYPE_LABELS = {
  bogo: "BOGO",
  bundling: "Bundling",
  happyHour: "Happy Hour",
  category: "Kategori"
};

const getPromoLabel = (item) => {
  const promoType = item.conditions?.promoType;
  if (promoType && safeGet(PROMO_TYPE_LABELS, promoType))
    return safeGet(PROMO_TYPE_LABELS, promoType);
  return item.type === "percent"
    ? "Persentase"
    : item.type === "nominal"
      ? "Nominal"
      : item.type || "-";
};

const getExpiryStatus = (item) => {
  const now = new Date();
  if (item.status === "upcoming") return null;
  if (item.startDate && new Date(item.startDate) > now) return null;
  const endDate = item.endDate ? new Date(item.endDate) : null;
  if (!endDate) return null;
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 7) return "expiring";
  return null;
};

const DiscountList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
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
  const MENU_KEY = "/discount";
  const locationParam = isSuperAdmin
    ? storeFilter && storeFilter !== "all"
      ? storeFilter
      : ""
    : user?.store;

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["discounts", page, limit, search, storeFilter, statusFilter],
    () => getAllDiscount({ location: locationParam, page, limit, status: statusFilter }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteDiscount, {
    onSuccess: () => {
      toast.success(t("page.discount.list.toast.success"), {
        description: t("page.discount.list.toast.successDescription")
      });
      queryClient.invalidateQueries(["discounts"]);
    },
    onError: (err) => {
      toast.error(t("page.discount.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const reactivateMutation = useMutation(editDiscount, {
    onSuccess: () => {
      toast.success(t("page.discount.list.toast.reactivated"), {
        description: t("page.discount.list.toast.reactivatedDescription")
      });
      queryClient.invalidateQueries(["discounts"]);
    },
    onError: (err) => {
      toast.error(t("page.discount.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const extendMutation = useMutation(editDiscount, {
    onSuccess: () => {
      toast.success(t("page.discount.list.extend.success"), {
        description: t("page.discount.list.extend.successDescription")
      });
      queryClient.invalidateQueries(["discounts"]);
    },
    onError: (err) => {
      toast.error(t("page.discount.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const discounts = data?.data || [];
  const pagination = data?.pagination || {};
  const total = pagination?.total || pagination?.totalItems || data?.total || 0;
  const totalPages = pagination?.totalPages || Math.ceil(total / limit) || 1;

  const statsFromBE = data?.stats || {};
  const statsTotal = statsFromBE.total || total;
  const activeCount = statsFromBE.active ?? discounts.filter((d) => d.status === "active").length;
  const draftCount = statsFromBE.draft ?? discounts.filter((d) => d.status === "draft").length;
  const upcomingCount =
    statsFromBE.upcoming ?? discounts.filter((d) => d.status === "upcoming").length;
  const inactiveCount =
    statsFromBE.inactive ??
    discounts.filter(
      (d) => d.status !== "active" && d.status !== "draft" && d.status !== "upcoming"
    ).length;
  const expiringCount =
    statsFromBE.expiring ??
    discounts.filter((d) => {
      if (d.status !== "active" || !d.endDate) return false;
      const endDate = new Date(d.endDate);
      const now = new Date();
      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length;

  const handleDelete = (discount) => {
    setDeleteTarget(discount);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const [reactivateTarget, setReactivateTarget] = useState(null);

  const handleReactivate = (discount) => {
    setReactivateTarget(discount);
  };

  const confirmReactivate = () => {
    if (reactivateTarget) {
      const now = new Date();
      reactivateMutation.mutate({
        id: reactivateTarget.id,
        status: "active",
        endDate: formatDateOnly(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
      });
      setReactivateTarget(null);
    }
  };

  const [extendTarget, setExtendTarget] = useState(null);
  const [extendStartDate, setExtendStartDate] = useState(null);
  const [extendEndDate, setExtendEndDate] = useState(null);
  const [confirmExtendModal, setConfirmExtendModal] = useState(false);

  const handleExtend = (discount) => {
    setExtendTarget(discount);
    setExtendStartDate(discount.startDate ? new Date(discount.startDate) : new Date());
    setExtendEndDate(null);
  };

  const handleSaveExtend = () => {
    if (!extendStartDate || !extendEndDate) {
      toast.error(t("page.discount.list.extend.error"), {
        description: t("page.discount.list.extend.errorDescription")
      });
      return;
    }
    setConfirmExtendModal(true);
  };

  const confirmExtend = () => {
    if (extendTarget && extendStartDate && extendEndDate) {
      extendMutation.mutate({
        id: extendTarget.id,
        name: extendTarget.name,
        type: extendTarget.type,
        value: extendTarget.value,
        startDate: formatDateOnly(extendStartDate),
        endDate: formatDateOnly(extendEndDate),
        minimumOrder: extendTarget.minimumOrder || 0,
        maximumDiscount: extendTarget.maximumDiscount || 0,
        code: extendTarget.code || null,
        conditions: extendTarget.conditions || {},
        store: extendTarget.store || null,
        description: extendTarget.description || null,
        status: extendTarget.status
      });
      setConfirmExtendModal(false);
      setExtendTarget(null);
      setExtendStartDate(null);
      setExtendEndDate(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" });
  };

  const columns = [
    {
      header: t("page.discount.table.name"),
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            <Tags size={14} />
          </div>
          <span className="font-medium text-foreground">{item.name || "-"}</span>
        </div>
      )
    },
    { header: t("page.discount.table.type"), render: (item) => getPromoLabel(item) },
    {
      header: t("page.discount.table.value"),
      render: (item) => {
        const cond = item.conditions || {};
        if (cond.promoType === "category" || cond.promoType === "happyHour")
          return `${cond.discountPercent || item.value}%`;
        if (item.type === "percent") return `${item.value}%`;
        return `Rp${item.value?.toLocaleString("id-ID") || item.value}`;
      }
    },
    {
      header: "Code",
      render: (item) => <span className="font-mono text-xs">{item.code || "-"}</span>
    },
    {
      header: t("page.discount.table.store"),
      render: (item) => {
        const store = item.store;
        if (!store || Array.isArray(store))
          return <span className="text-xs text-foreground">{t("header.allStore")}</span>;
        return (
          <span className="text-xs">
            {store.name || t("common.ui.storeNumber", { id: store.id })}
          </span>
        );
      }
    },
    {
      header: t("page.discount.table.validity"),
      render: (item) => {
        const expiryStatus = getExpiryStatus(item);
        const hasStart = !!item.startDate;
        const hasEnd = !!item.endDate;

        let validityText = "";
        if (!hasStart && !hasEnd) {
          validityText = t("page.discount.list.validity.unlimited");
        } else if (hasStart && !hasEnd) {
          validityText = `${formatDate(item.startDate)} →`;
        } else if (!hasStart && hasEnd) {
          validityText = `→ ${formatDate(item.endDate)}`;
        } else {
          validityText = `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
        }

        return (
          <div className="flex items-center gap-2">
            <span className="text-xs">{validityText}</span>
            {expiryStatus === "expiring" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                <Clock size={12} />
                {t("page.discount.list.expiringSoon")}
              </span>
            )}
            {expiryStatus === "expired" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                <XCircle size={12} />
                {t("page.discount.list.expired")}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: t("page.discount.table.status"),
      render: (item) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : item.status === "draft"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                : item.status === "upcoming"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          }`}>
          {item.status === "active"
            ? t("page.discount.list.active")
            : item.status === "draft"
              ? t("page.discount.list.draft")
              : item.status === "upcoming"
                ? t("page.discount.list.upcoming")
                : t("page.discount.list.inactive")}
        </span>
      )
    },
    {
      header: t("page.discount.table.createdBy"),
      render: (item) => item.createdByUser?.fullName || "-"
    },
    {
      header: t("page.discount.table.createdDate"),
      render: (item) => formatDate(item.createdAt)
    },
    {
      header: t("page.discount.table.modifiedBy"),
      render: (item) => item.modifiedByUser?.fullName || "-"
    },
    {
      header: t("page.discount.table.modifiedDate"),
      render: (item) => formatDate(item.updatedAt)
    },
    {
      header: t("page.discount.table.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") },
        { icon: RotateCcw, label: t("page.discount.list.reactivate") },
        { icon: CalendarRange, label: t("page.discount.list.extend.title") }
      ],
      render: (item) => {
        const expiryStatus = getExpiryStatus(item);
        const isExpired = expiryStatus === "expired" || item.status === "inactive";
        const isExpiring = expiryStatus === "expiring";
        return (
          <TableActions
            visible={2}
            align="right"
            items={[
              {
                label: t("common.view"),
                icon: Eye,
                onClick: () => navigate(`/detail-discount?id=${item.id || item._id}`)
              },
              {
                label: t("common.edit"),
                icon: Edit,
                onClick: () => navigate(`/edit-discount?id=${item.id || item._id}`),
                hidden: !canAccess(user, MENU_KEY, "edit")
              },
              {
                label: t("page.discount.list.extend.title"),
                icon: CalendarRange,
                onClick: () => handleExtend(item),
                hidden: !canAccess(user, MENU_KEY, "edit") || !isExpiring
              },
              {
                label: t("page.discount.list.reactivate"),
                icon: RotateCcw,
                onClick: () => handleReactivate(item),
                hidden: !canAccess(user, MENU_KEY, "edit") || !isExpired
              },
              {
                label: t("common.delete"),
                icon: Trash2,
                danger: true,
                onClick: () => handleDelete(item),
                hidden: !canAccess(user, MENU_KEY, "delete")
              }
            ]}
          />
        );
      }
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
          { label: t("page.discount.list.title"), i18nKey: "page.discount.list.title" }
        ]}
        title={t("page.discount.list.title")}
        description={t("page.discount.list.description")}>
        {isSuperAdmin && (
          <Button
            variant="outline"
            disabled={isDownloadingTemplate}
            onClick={async () => {
              setIsDownloadingTemplate(true);
              try {
                await downloadDiscountTemplate();
                toast.success(t("common.success"), {
                  description: t("page.discount.toast.templateSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.discount.toast.templateError")
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
              ? t("page.discount.button.downloading")
              : t("page.discount.button.downloadTemplate")}
          </Button>
        )}
        {isSuperAdmin && (
          <Button
            variant="general"
            disabled={isDownloadingData}
            onClick={async () => {
              setIsDownloadingData(true);
              try {
                await downloadDiscountExcel();
                toast.success(t("common.success"), {
                  description: t("page.discount.toast.dataSuccess")
                });
              } catch (err) {
                toast.error(t("common.error"), {
                  description:
                    err?.response?.data?.message ||
                    err.message ||
                    t("page.discount.toast.dataError")
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
              ? t("page.discount.button.downloading")
              : t("page.discount.button.downloadData")}
          </Button>
        )}
        {isSuperAdmin && <span className="w-px h-7 bg-border mx-1" />}
        {isSuperAdmin && (
          <Button variant="import" onClick={() => setImportModalOpen(true)}>
            <Upload size={16} className="mr-1" />
            {t("page.discount.button.uploadExcel")}
          </Button>
        )}
        {canAccess(user, MENU_KEY, "add") && (
          <Button variant="success" onClick={() => navigate("/add-discount")} className="gap-2">
            <Plus size={18} />
            {t("page.discount.button.add")}
          </Button>
        )}
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isFetching || isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  label={t("page.discount.list.total")}
                  value={statsTotal}
                  icon={Tags}
                  variant="default"
                  subtitle={t("page.discount.list.totalBadge", { count: discounts.length })}
                />
                <StatCard
                  label={t("page.discount.list.active")}
                  value={activeCount}
                  icon={CheckCircle}
                  variant="active"
                  subtitle={`${statsTotal > 0 ? Math.round((activeCount / statsTotal) * 100) : 0}%`}
                />
                <StatCard
                  label={t("page.discount.list.upcoming")}
                  value={upcomingCount}
                  icon={CalendarRange}
                  variant="blue"
                  subtitle={`${statsTotal > 0 ? Math.round((upcomingCount / statsTotal) * 100) : 0}%`}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  label={t("common.draft")}
                  value={draftCount}
                  icon={FileEdit}
                  variant="draft"
                  subtitle={`${statsTotal > 0 ? Math.round((draftCount / statsTotal) * 100) : 0}%`}
                />
                <StatCard
                  label={t("page.discount.list.inactive")}
                  value={inactiveCount}
                  icon={XCircle}
                  variant="inactive"
                  subtitle={`${statsTotal > 0 ? Math.round((inactiveCount / statsTotal) * 100) : 0}%`}
                />
                <StatCard
                  label={t("page.discount.list.expiringSoon")}
                  value={expiringCount}
                  icon={Clock}
                  variant="expiring"
                  subtitle={`${activeCount > 0 ? Math.round((expiringCount / activeCount) * 100) : 0}% ${t("page.discount.list.ofActive")}`}
                />
              </div>
            </div>
          )}

          <div data-tour="discount-table" className="mt-6">
            <DataTable
              emptyAction={
                canAccess(user, MENU_KEY, "add")
                  ? {
                      label: t("page.discount.button.add"),
                      onClick: () => navigate("/add-discount")
                    }
                  : undefined
              }
              columns={columns}
              data={discounts}
              isLoading={isLoading || isFetching}
              isError={isError}
              onRetry={refetch}
              emptyMessage={t("page.discount.list.empty")}
              emptyIcon={Gift}
              toolbar={
                <TableToolbar
                  title={t("page.discount.list.title")}
                  onReset={resetFilters}
                  isFiltered={isFiltered}>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="discount-list-store-filter"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.goodsReceipt.detail.store")}
                    </label>
                    <StoreFilter
                      id="discount-list-store-filter"
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
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="discount-list-status"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("common.status")}
                    </label>
                    <Combobox
                      id="discount-list-status"
                      options={[
                        { value: "all", label: t("common.all") },
                        { value: "active", label: t("common.active") },
                        { value: "upcoming", label: t("page.discount.list.upcoming") },
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
                      htmlFor="discount-list-search"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("common.search")}
                    </label>
                    <SearchInput
                      id="discount-list-search"
                      value={search}
                      onChange={(val) => {
                        setSearch(val);
                        setPage(1);
                      }}
                      placeholder={t("page.discount.list.search")}
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
        </>
      )}

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.discount.modal.deleteTitle")}
        description={t("page.discount.modal.deleteDesc", { name: deleteTarget?.name || "" })}
        confirmText={t("page.discount.modal.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      <Modal
        type="confirm"
        open={!!reactivateTarget}
        onOpenChange={(open) => !open && setReactivateTarget(null)}
        title={t("page.discount.modal.reactivateTitle")}
        description={t("page.discount.modal.reactivateDesc", {
          name: reactivateTarget?.name || ""
        })}
        confirmText={t("page.discount.modal.reactivateConfirm")}
        loading={reactivateMutation.isLoading}
        onConfirm={confirmReactivate}
      />

      <Dialog open={!!extendTarget} onOpenChange={(open) => !open && setExtendTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange size={20} className="text-blue-600" />
              {t("page.discount.list.extend.modalTitle")}
            </DialogTitle>
          </DialogHeader>

          {extendTarget && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {extendTarget.name}
                </span>
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                  {extendTarget.code || "-"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-blue-700 dark:text-blue-300">
                <span>{getPromoLabel(extendTarget)}</span>
                <span>•</span>
                <span>
                  {extendTarget.type === "percent"
                    ? `${extendTarget.value}%`
                    : `Rp${extendTarget.value?.toLocaleString("id-ID")}`}
                </span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {t("page.discount.table.validity")}: {formatDate(extendTarget.startDate)} -{" "}
                {formatDate(extendTarget.endDate)}
              </div>
            </div>
          )}

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label
                htmlFor="discount-list-start-date-label"
                className="text-sm font-medium text-foreground">
                {t("page.discount.form.startDateLabel")} <span className="text-destructive">*</span>
              </label>
              <DatePicker
                id="discount-list-start-date-label"
                date={extendStartDate}
                setDate={setExtendStartDate}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="discount-list-end-date"
                className="text-sm font-medium text-foreground">
                {t("page.discount.form.endDate")} <span className="text-destructive">*</span>
              </label>
              <DatePicker
                id="discount-list-end-date"
                date={extendEndDate}
                setDate={setExtendEndDate}
                disabled={!extendStartDate}
                minDate={extendStartDate || undefined}
                placeholder={
                  !extendStartDate
                    ? t("page.discount.form.fillStartDateFirst")
                    : t("page.discount.form.endDatePlaceholder")
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="danger" onClick={() => setExtendTarget(null)} className="gap-1">
              <X size={16} />
              {t("common.cancel")}
            </Button>
            <Button variant="success" onClick={handleSaveExtend} className="gap-1">
              {t("button.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Modal
        type="confirm"
        open={confirmExtendModal}
        onOpenChange={(open) => !open && setConfirmExtendModal(false)}
        title={t("page.discount.list.extend.confirmTitle")}
        description={t("page.discount.list.extend.confirmDesc", {
          name: extendTarget?.name || "",
          startDate: extendStartDate
            ? extendStartDate.toLocaleDateString(dateLocale(), {
                day: "numeric",
                month: "long",
                year: "numeric"
              })
            : "",
          endDate: extendEndDate
            ? extendEndDate.toLocaleDateString(dateLocale(), {
                day: "numeric",
                month: "long",
                year: "numeric"
              })
            : ""
        })}
        confirmText={t("page.discount.list.extend.confirmSave")}
        loading={extendMutation.isLoading}
        onConfirm={confirmExtend}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
      <UploadExcelModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        uploadService={uploadDiscountExcel}
        queryKey={["discounts"]}
        title={t("page.discount.upload.title")}
        subtitle={t("page.discount.upload.subtitle")}
      />
    </div>
  );
};

export default DiscountList;

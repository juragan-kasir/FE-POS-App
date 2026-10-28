import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Eye, Edit, Trash2, FileText, Plane, Check, Ban, Download } from "lucide-react";
import { canAccess } from "@/utils/permission";
import {
  getAllBusinessTrip,
  deleteBusinessTrip,
  changeBusinessTripStatus
} from "@/services/business-trip";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import BusinessTripDownloadModal from "@/components/organism/business-trip-download-modal";
import { Combobox } from "@/components/ui/combobox";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import TableActions from "@/components/ui/TableActions";

const statusMap = {
  draft: {
    class: "bg-muted text-foreground"
  },
  pending: {
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  approved: {
    class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  rejected: {
    class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
};

const parseDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
};

const formatDate = (d) => {
  const date = parseDate(d);
  return date
    ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "-";
};

const formatDateTime = (d) => {
  const date = parseDate(d);
  if (!date) return "-";
  return (
    date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
    ", " +
    date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
};

const BusinessTripList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const MENU_KEY = "/business-trip";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [downloadTarget, setDownloadTarget] = useState(null);

  const isFiltered = statusFilter !== "all" || search !== "";

  const resetFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setPage(1);
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["business-trips", page, limit, search, statusFilter],
    () =>
      getAllBusinessTrip({
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      }),
    { keepPreviousData: true }
  );

  const items = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;
  const stats = data?.stats || {};

  const deleteMutation = useMutation(deleteBusinessTrip, {
    onSuccess: () => {
      toast.success(t("page.businessTrip.list.toast.deleteSuccess"));
      queryClient.invalidateQueries(["business-trips"]);
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.businessTrip.list.toast.deleteError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const statusMutation = useMutation(({ id, status }) => changeBusinessTripStatus(id, status), {
    onSuccess: () => {
      toast.success(t("page.businessTrip.list.toast.statusSuccess"));
      queryClient.invalidateQueries(["business-trips"]);
      setApproveTarget(null);
      setRejectTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.businessTrip.list.toast.statusError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const columns = [
    {
      header: t("page.businessTrip.list.tripNumber"),
      stickyLeft: true,
      render: (item) => (
        <span className="font-mono text-xs font-bold text-primary">{item.tripNumber || "-"}</span>
      )
    },
    {
      header: t("page.businessTrip.list.employee"),
      render: (item) => {
        const count = item.employees?.length || (item.employeeName ? 1 : 0);
        return (
          <span className="text-sm">
            {count > 0 ? `${count} ${t("page.businessTrip.list.employeeCount")}` : "-"}
          </span>
        );
      }
    },
    {
      header: t("page.businessTrip.list.destination"),
      render: (item) => <span className="text-sm">{item.destination || "-"}</span>
    },
    {
      header: t("page.businessTrip.list.store"),
      render: (item) => <span className="text-sm">{item.store?.name || "-"}</span>
    },
    {
      header: t("page.businessTrip.list.dates"),
      render: (item) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDate(item.departureDate)} → {formatDate(item.returnDate)}
        </span>
      )
    },
    {
      header: t("page.businessTrip.list.createdBy"),
      render: (item) => <span className="text-sm">{item.createdByUser?.fullName || "-"}</span>
    },
    {
      header: t("page.businessTrip.list.createdDate"),
      render: (item) => (
        <span className="text-xs font-mono text-muted-foreground">
          {formatDateTime(item.createdAt)}
        </span>
      )
    },
    {
      header: t("page.businessTrip.list.modifiedBy"),
      render: (item) => <span className="text-sm">{item.modifiedByUser?.fullName || "-"}</span>
    },
    {
      header: t("page.businessTrip.list.modifiedDate"),
      render: (item) => (
        <span className="text-xs font-mono text-muted-foreground">
          {formatDateTime(item.updatedAt)}
        </span>
      )
    },
    {
      header: t("page.businessTrip.list.status"),
      align: "center",
      render: (item) => {
        const sc = statusMap[item.status] || statusMap.draft;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sc.class}`}>
            {t(`businessTrip.status.${item.status || "draft"}`)}
          </span>
        );
      }
    },
    {
      header: t("common.actions"),
      align: "right",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Download, label: t("page.businessTrip.list.download") },
        { icon: Check, label: t("page.businessTrip.list.approve") },
        { icon: Ban, label: t("page.businessTrip.list.reject") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => (
        <TableActions
          visible={2}
          align="right"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/business-trip/detail?id=${item.id}`),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            {
              label: t("page.businessTrip.list.download"),
              icon: Download,
              onClick: () => setDownloadTarget(item.id),
              hidden: !canAccess(user, MENU_KEY, "view")
            },
            ...(item.status === "draft" || item.status === "pending" || item.status === "rejected"
              ? [
                  {
                    label: t("page.businessTrip.list.approve"),
                    icon: Check,
                    onClick: () => setApproveTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "update")
                  },
                  {
                    label: t("page.businessTrip.list.reject"),
                    icon: Ban,
                    onClick: () => setRejectTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "delete")
                  },
                  {
                    label: t("common.edit"),
                    icon: Edit,
                    onClick: () => navigate(`/edit-business-trip?id=${item.id}`),
                    hidden: !canAccess(user, MENU_KEY, "update")
                  },
                  {
                    label: t("common.delete"),
                    icon: Trash2,
                    danger: true,
                    onClick: () => setDeleteTarget(item.id),
                    hidden: !canAccess(user, MENU_KEY, "delete")
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
          { label: t("page.businessTrip.list.title"), i18nKey: "page.businessTrip.list.title" }
        ]}
        title={t("page.businessTrip.list.title")}
        description={t("page.businessTrip.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-business-trip")}
            className="shrink-0 gap-2 shadow-md">
            <Plus size={16} /> {t("page.businessTrip.list.addNew")}
          </Button>
        )}
      </PageHeader>

      {isFetching || isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label={t("page.businessTrip.list.stats.total")}
            value={stats.total ?? total}
            icon={Plane}
            variant="default"
          />
          <StatCard
            label={t("businessTrip.status.pending")}
            value={stats.pending ?? 0}
            icon={FileText}
            variant="draft"
          />
          <StatCard
            label={t("businessTrip.status.approved")}
            value={stats.approved ?? 0}
            icon={Check}
            variant="active"
          />
          <StatCard
            label={t("businessTrip.status.rejected")}
            value={stats.rejected ?? 0}
            icon={Ban}
            variant="red"
          />
        </div>
      )}

      {isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <DataTable
          emptyAction={
            canAccess(user, MENU_KEY, "add")
              ? {
                  label: t("page.businessTrip.list.addNew"),
                  onClick: () => navigate("/add-business-trip")
                }
              : undefined
          }
          columns={columns}
          data={items}
          isLoading={isLoading || isFetching}
          emptyMessage={t("common.noData")}
          emptyIcon={FileText}
          toolbar={
            <TableToolbar
              title={t("page.businessTrip.list.title")}
              onReset={resetFilters}
              isFiltered={isFiltered}>
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
                  placeholder={t("page.businessTrip.list.search")}
                  isLoading={isFetching}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="business-trip-list-status"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.status")}
                </label>
                <Combobox
                  id="business-trip-list-status"
                  options={[
                    { value: "all", label: t("common.all") },
                    ...Object.keys(statusMap).map((k) => ({
                      value: k,
                      label: t(`businessTrip.status.${k}`)
                    }))
                  ]}
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  placeholder={t("common.all")}
                  searchPlaceholder={t("common.search")}
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
      )}

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("page.businessTrip.list.modal.deleteTitle")}
        description={t("page.businessTrip.list.modal.deleteDescription")}
        confirmText={t("common.confirmDelete")}
        loading={deleteMutation.isLoading}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
      />
      <Modal
        type="confirm"
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title={t("page.businessTrip.list.approve")}
        description={t("page.businessTrip.list.approve")}
        confirmText={t("page.businessTrip.list.approve")}
        loading={statusMutation.isLoading}
        onConfirm={() => statusMutation.mutate({ id: approveTarget, status: "approved" })}
      />
      <Modal
        type="confirm"
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title={t("page.businessTrip.list.reject")}
        description={t("page.businessTrip.list.reject")}
        confirmText={t("page.businessTrip.list.reject")}
        loading={statusMutation.isLoading}
        onConfirm={() => statusMutation.mutate({ id: rejectTarget, status: "rejected" })}
      />
      <BusinessTripDownloadModal
        open={!!downloadTarget}
        onOpenChange={(o) => !o && setDownloadTarget(null)}
        tripId={downloadTarget}
      />
    </div>
  );
};

export default BusinessTripList;

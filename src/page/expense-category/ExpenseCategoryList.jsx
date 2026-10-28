import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";

import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Eye,
  FolderOpen,
  CheckCircle,
  FileEdit,
  XCircle
} from "lucide-react";
import { getExpenseCategories, deleteExpenseCategory } from "@/services/expense";
import { Button } from "@/components/ui/button";
import TableActions from "@/components/ui/TableActions";
import { SearchInput } from "@/components/ui/SearchInput";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import { useTranslation } from "react-i18next";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const ExpenseCategoryList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/expense-category";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isFiltered = search !== "";

  const resetFilters = () => {
    setSearch("");
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery(["expense-categories"], () =>
    getExpenseCategories()
  );

  const deleteMutation = useMutation(deleteExpenseCategory, {
    onSuccess: () => {
      toast.success(t("page.expenseCategory.list.toast.success"), {
        description: t("page.expenseCategory.list.toast.successDescription")
      });
      queryClient.invalidateQueries(["expense-categories"]);
    },
    onError: (err) => {
      toast.error(t("page.expenseCategory.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const categories = data?.data || data || [];
  const stats = data?.stats || {};
  const totalStats = stats.total ?? categories.length;
  const activeCount = stats.active ?? categories.filter((c) => c.status === "active").length;
  const draftCount = stats.draft ?? categories.filter((c) => c.status === "draft").length;
  const inactiveCount = stats.inactive ?? categories.filter((c) => c.status === "inactive").length;
  const filtered = categories.filter(
    (item) => !search || item.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (category) => {
    setDeleteTarget(category);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id || deleteTarget._id });
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: t("page.expenseCategory.list.name"),
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            <Tag size={14} />
          </div>
          <span className="font-medium text-foreground">{row.name || "-"}</span>
        </div>
      )
    },
    {
      header: t("page.expenseCategory.list.description"),
      render: (row) => (
        <span className="text-sm text-muted-foreground max-w-[300px] truncate block">
          {row.description || "-"}
        </span>
      )
    },
    {
      header: t("page.expenseCategory.list.accountCode"),
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-primary/10 text-primary">
          {row.accountCode || "-"}
        </span>
      )
    },
    {
      header: t("page.expenseCategory.list.status"),
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : row.status === "draft"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
        <span className="text-sm text-muted-foreground">
          {row.createdByUser?.fullName || row.createdByUser?.userName || "-"}
        </span>
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
      header: t("common.createdAt"),
      render: (row) => {
        if (!row.createdAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(row.createdAt);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}{" "}
            {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("common.updatedAt"),
      render: (row) => {
        if (!row.updatedAt) return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(row.updatedAt);
        if (isNaN(d.getTime())) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm font-mono text-muted-foreground">
            {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}{" "}
            {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: t("page.expenseCategory.list.actions"),
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
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/detail-expense-category?id=${row.id || row._id}`)
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/edit-expense-category?id=${row.id || row._id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.delete"),
              icon: Trash2,
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
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.expenseCategory.list.title") }
        ]}
        title={t("page.expenseCategory.list.title")}
        description={t("page.expenseCategory.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-expense-category")}
            className="gap-2">
            <Plus size={18} />
            {t("page.expenseCategory.button.add")}
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <StatCard
                    label={t("page.expenseCategory.list.total")}
                    value={totalStats}
                    icon={FolderOpen}
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

              <div>
                <DataTable
                  emptyAction={
                    canAccess(user, MENU_KEY, "add")
                      ? {
                          label: t("page.expenseCategory.button.add"),
                          onClick: () => navigate("/add-expense-category")
                        }
                      : undefined
                  }
                  columns={columns}
                  data={filtered}
                  isLoading={isLoading || isFetching}
                  emptyIcon={Tag}
                  emptyMessage={t("page.expenseCategory.list.empty")}
                  toolbar={
                    <TableToolbar
                      title={t("page.expenseCategory.list.search")}
                      onReset={resetFilters}
                      isFiltered={isFiltered}>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("common.search")}
                        </label>
                        <SearchInput
                          value={search}
                          onChange={(val) => setSearch(val)}
                          placeholder={t("page.expenseCategory.list.search")}
                          isLoading={isFetching}
                        />
                      </div>
                    </TableToolbar>
                  }
                />
              </div>
            </>
          )}

          <Modal
            type="confirm"
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title={t("page.expenseCategory.modal.deleteTitle")}
            description={t("page.expenseCategory.modal.deleteDesc", {
              name: deleteTarget?.name || ""
            })}
            confirmText={t("page.expenseCategory.modal.deleteConfirm")}
            loading={deleteMutation.isLoading}
            onConfirm={confirmDelete}
          />
          {deleteMutation.isLoading && (
            <Loading fullscreen size="lg" label={t("common.loadingData")} />
          )}
        </>
      )}
    </div>
  );
};

export default ExpenseCategoryList;

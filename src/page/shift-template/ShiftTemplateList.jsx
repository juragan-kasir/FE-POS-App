import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getAllShiftTemplateTable, deleteShiftTemplate } from "@/services/shiftTemplate";
import {
  CheckCircle,
  FileEdit,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Clock,
  Plus,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import PageHeader from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Combobox } from "@/components/ui/combobox";
import { canAccess } from "@/utils/permission";
import { useCookies } from "react-cookie";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const ShiftTemplateList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const MENU_KEY = "/shift-template-list";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const isFiltered = search !== "" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const { data, isFetching } = useQuery(
    ["shift-templates", page, limit, search, statusFilter],
    () =>
      getAllShiftTemplateTable({
        page,
        limit,
        statusRole: statusFilter,
        search
      }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteShiftTemplate, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.shiftTemplate.toast.deleteSuccess")
      });
      queryClient.invalidateQueries(["shift-templates"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const templates = data?.data || [];
  const pagination = data?.pagination || {};
  const stats = data?.stats || {};
  const total = pagination?.total ?? pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages || Math.ceil(total / limit) || 1;

  const handleDelete = (template) => {
    setDeleteTarget(template);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: t("page.shiftTemplate.table.no"),
      render: (_, index) => (
        <span className="text-sm font-mono text-muted-foreground">
          {String(index + 1 + (page - 1) * limit).padStart(2, "0")}
        </span>
      )
    },
    {
      header: t("page.shiftTemplate.table.name"),
      render: (template) => (
        <span className="text-sm font-semibold text-primary">{template.name}</span>
      )
    },
    {
      header: t("page.shiftTemplate.table.startTime"),
      render: (template) => (
        <span className="text-sm font-mono text-muted-foreground">
          {template.startTime?.slice(0, 5) || "-"}
        </span>
      )
    },
    {
      header: t("page.shiftTemplate.table.endTime"),
      render: (template) => (
        <span className="text-sm font-mono text-muted-foreground">
          {template.endTime?.slice(0, 5) || "-"}
        </span>
      )
    },
    {
      header: t("page.shiftTemplate.table.description"),
      render: (template) => (
        <p className="text-sm text-muted-foreground max-w-xs truncate">
          {template.description || "-"}
        </p>
      )
    },
    {
      header: t("page.shiftTemplate.table.status"),
      align: "center",
      render: (template) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight border ${
            template.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
              : template.status === "draft"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
          }`}>
          {template.status === "active"
            ? t("common.active")
            : template.status === "draft"
              ? t("common.draft")
              : t("common.inactive")}
        </span>
      )
    },
    {
      header: t("page.shiftTemplate.table.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (template) => (
        <TableActions
          align="center"
          visible={2}
          items={[
            {
              label: t("common.view"),
              iconName: "visibility",
              hidden: !canAccess(user, MENU_KEY, "view"),
              onClick: () => navigate(`/detail-shift-template?id=${template.id}`)
            },
            {
              label: t("common.edit"),
              iconName: "edit",
              hidden: !canAccess(user, MENU_KEY, "edit"),
              onClick: () => navigate(`/edit-shift-template?id=${template.id}`)
            },
            {
              label: t("common.delete"),
              iconName: "delete",
              danger: true,
              hidden: !canAccess(user, MENU_KEY, "delete"),
              onClick: () => handleDelete(template)
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
          { label: t("page.shiftTemplate.list.title"), i18nKey: "page.shiftTemplate.list.title" }
        ]}
        title={t("page.shiftTemplate.list.title")}
        description={t("page.shiftTemplate.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            data-tour="shift-template-add"
            variant="success"
            onClick={() => navigate("/add-shift-template")}
            className="shrink-0 shadow-md">
            <Plus size={16} className="mr-1" />
            {t("page.shiftTemplate.button.add")}
          </Button>
        )}
      </PageHeader>
      <LoadErrorBanner />

      <div>
        <div>
          {isFetching ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-28 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatCard
                  label={t("page.shiftTemplate.list.statsTotal")}
                  value={stats?.total ?? total}
                  icon={Clock}
                  variant="default"
                  subtitle={t("page.shiftTemplate.list.statsAll")}
                />
                <StatCard
                  label={t("page.shiftTemplate.list.statsActive")}
                  value={stats?.totalActive ?? 0}
                  icon={CheckCircle}
                  variant="active"
                  subtitle={
                    stats?.total ? `${Math.round((stats.totalActive / stats.total) * 100)}%` : "0%"
                  }
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <StatCard
                  label={t("page.shiftTemplate.list.statsDraft")}
                  value={stats?.totalDraft ?? 0}
                  icon={FileEdit}
                  variant="draft"
                  subtitle={
                    stats?.total ? `${Math.round((stats.totalDraft / stats.total) * 100)}%` : "0%"
                  }
                />
                <StatCard
                  label={t("page.shiftTemplate.list.statsInactive")}
                  value={stats?.totalInactive ?? 0}
                  icon={XCircle}
                  variant="inactive"
                  subtitle={t("page.shiftTemplate.list.statsAttention")}
                />
              </div>
            </>
          )}

          <div data-tour="shift-template-table" className="mt-6">
            <DataTable
              emptyAction={
                canAccess(user, MENU_KEY, "add")
                  ? {
                      label: t("page.shiftTemplate.button.add"),
                      onClick: () => navigate("/add-shift-template")
                    }
                  : undefined
              }
              columns={columns}
              data={templates}
              isLoading={isFetching}
              emptyMessage={t("page.shiftTemplate.list.empty")}
              toolbar={
                <TableToolbar
                  title={t("page.shiftTemplate.list.title")}
                  onReset={resetFilters}
                  isFiltered={isFiltered}>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="shift-template-list-status"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.shiftTemplate.table.status")}
                    </label>
                    <Combobox
                      id="shift-template-list-status"
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
                      searchPlaceholder={t("common.search.status")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="shift-template-list-search"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("common.search")}
                    </label>
                    <SearchInput
                      id="shift-template-list-search"
                      value={search}
                      onChange={(val) => {
                        setSearch(val);
                        setPage(1);
                      }}
                      placeholder={t("page.shiftTemplate.list.search")}
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
                {t("page.shiftTemplate.tips.title")}
              </h4>
            </div>
            <ul className="space-y-2">
              <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                <span className="text-primary-foreground/60 mt-0.5">•</span>
                <span>{t("page.shiftTemplate.tips.1")}</span>
              </li>
              <li className="text-xs leading-relaxed opacity-90 flex items-start gap-2">
                <span className="text-primary-foreground/60 mt-0.5">•</span>
                <span>{t("page.shiftTemplate.tips.2")}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.shiftTemplate.modal.deleteTitle", {
          name: deleteTarget?.name || ""
        })}
        description={t("page.shiftTemplate.modal.deleteDesc", {
          name: deleteTarget?.name || ""
        })}
        confirmText={t("page.shiftTemplate.modal.deleteConfirm")}
        loading={deleteMutation.isLoading}
        onConfirm={confirmDelete}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default ShiftTemplateList;

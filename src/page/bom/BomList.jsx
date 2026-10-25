import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { canAccess } from "@/utils/permission";
import { getAllBom, deleteBom } from "@/services/bom";
import AbortController from "@/components/organism/abort-controller";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";

// Only an active recipe deducts ingredients at sale; draft/inactive ones
// refuse the sale of a recipe-driven menu instead of consuming a guess.
const statusBadge = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
};

// An owner question still open on the recipe (written into its notes by
// whoever configured it). Shown as a badge so an active-but-unconfirmed
// recipe never reads as final.
const PENDING_MARKER = /PENDING (KONFIRMASI|CONFIRMATION)/i;

const BomList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/bom";
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

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["bom-list", page, limit, search, statusFilter],
    () => getAllBom({ page, limit, search, status: statusFilter }),
    { keepPreviousData: true }
  );

  const items = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  const deleteMut = useMutation(() => deleteBom(deleteTarget), {
    onSuccess: () => {
      toast.success(t("page.bom.list.toast.success"), {
        description: t("page.bom.list.toast.successDesc")
      });
      queryClient.invalidateQueries(["bom-list"]);
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.bom.list.toast.error"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const columns = [
    {
      header: t("page.bom.list.table.name"),
      render: (item) => (
        <span className="font-medium text-sm">{item.name || `BOM #${item.id}`}</span>
      )
    },
    {
      header: t("page.bom.list.table.product"),
      render: (item) => (
        <div>
          <p className="text-sm font-medium">{item.productData?.nameProduct || "-"}</p>
          <p className="text-xs text-muted-foreground">{item.productData?.sku || ""}</p>
        </div>
      )
    },
    {
      header: t("page.bom.list.table.status"),
      render: (item) => (
        <div className="min-w-[140px]">
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[item.status] || statusBadge.draft}`}>
            {item.status === "active"
              ? t("common.active")
              : item.status === "inactive"
                ? t("common.inactive")
                : t("common.draft")}
          </span>
          {PENDING_MARKER.test(item.notes || "") && (
            <span className="ml-1 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {t("page.bom.list.pendingConfirmation")}
            </span>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {item.status === "active"
              ? t("page.bom.list.deductsStock")
              : t("page.bom.list.notDeductingStock")}
          </p>
        </div>
      )
    },
    {
      header: t("page.bom.list.table.composition"),
      className: "min-w-[220px]",
      render: (item) => (
        <ul className="text-xs space-y-0.5">
          {(item.lines || []).map((line) => (
            <li key={line.id}>
              <span className="font-mono">{line.qty}</span>{" "}
              <span className="text-muted-foreground">{line.unit}</span>{" "}
              {line.ingredientData?.name || `#${line.ingredientId}`}
            </li>
          ))}
        </ul>
      )
    },
    {
      header: t("page.bom.list.table.notes"),
      className: "min-w-[220px]",
      render: (item) => (
        <span className="text-xs text-muted-foreground whitespace-pre-line block max-w-[320px]">
          {item.notes || "-"}
        </span>
      )
    },
    {
      header: t("page.bom.list.table.actions"),
      align: "right",
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/bom/detail?id=${item.id}`)
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/bom/add?id=${item.id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => setDeleteTarget(item.id),
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
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.bom"), i18nKey: "breadcrumb.bom" }
        ]}
        title={t("page.bom.list.title")}
        description={t("page.bom.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button variant="success" onClick={() => navigate("/bom/add")} className="shrink-0 gap-2">
            <Plus size={16} /> {t("page.bom.list.addButton")}
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
            <div data-tour="bom-table" className="mt-6">
              <DataTable
                columns={columns}
                data={items}
                isLoading={isLoading}
                emptyMessage={t("page.bom.list.empty")}
                toolbar={
                  <TableToolbar
                    title={t("page.bom.list.title")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.status")}
                      </label>
                      <Combobox
                        options={[
                          { value: "all", label: t("common.all") },
                          { value: "active", label: t("common.active") },
                          { value: "inactive", label: t("common.inactive") },
                          { value: "draft", label: t("common.draft") }
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
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Cari
                      </label>
                      <SearchInput
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.bom.list.searchPlaceholder")}
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
          <Modal
            type="confirm"
            open={!!deleteTarget}
            onOpenChange={(o) => !o && setDeleteTarget(null)}
            title={t("page.bom.list.modal.deleteTitle")}
            description={t("page.bom.list.modal.deleteDescription")}
            confirmText={t("page.bom.list.modal.confirmDelete")}
            loading={deleteMut.isLoading}
            onConfirm={() => deleteMut.mutate()}
          />
          {deleteMut.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
        </>
      )}
    </div>
  );
};

export default BomList;

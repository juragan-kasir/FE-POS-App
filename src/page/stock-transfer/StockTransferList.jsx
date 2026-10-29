import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { canAccess } from "@/utils/permission";
import {
  getTransferHistory,
  receiveStockTransfer,
  cancelStockTransfer
} from "@/services/stock-transfer";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import AbortController from "@/components/organism/abort-controller";
import Modal from "@/components/organism/modal";
import NoStore from "@/components/ui/NoStore";
import { Combobox } from "@/components/ui/combobox";
import StoreFilterField from "@/components/ui/StoreFilterField";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";
import i18next from "i18next";
import { dateLocale } from "@/lib/locale";

const statusCfg = {
  sent: {
    get label() {
      return i18next.t("page.stockTransfer.ui.sent");
    },
    class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
  },
  received: {
    get label() {
      return i18next.t("page.purchaseOrder.status.received");
    },
    class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  cancelled: {
    get label() {
      return i18next.t("page.purchaseOrder.status.cancelled");
    },
    class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  },
  pending: {
    get label() {
      return i18next.t("page.expense.list.pending");
    },
    class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  approved: {
    get label() {
      return i18next.t("page.expense.list.approved");
    },
    class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  rejected: {
    get label() {
      return i18next.t("page.expense.list.rejected");
    },
    class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
};

const StockTransferList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const store = user?.store || "";
  const MENU_KEY = "/stock-transfer";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [confirmAction, setConfirmAction] = useState(null);
  const effectiveStore = storeFilter !== "all" ? storeFilter : store;

  const isFiltered = search !== "" || storeFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setGlobalStoreFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery(
    ["stock-transfers", page, limit, search, statusFilter, storeFilter],
    () =>
      getTransferHistory({
        store: effectiveStore,
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      }),
    { keepPreviousData: true }
  );

  const receiveMutation = useMutation(receiveStockTransfer, {
    onSuccess: () => {
      toast.success(t("page.stockTransfer.list.receiveSuccess"));
      queryClient.invalidateQueries("stock-transfers");
    },
    onError: (err) => toast.error(err.message)
  });

  const cancelMutation = useMutation(cancelStockTransfer, {
    onSuccess: () => {
      toast.success(t("page.stockTransfer.list.cancelSuccess"));
      queryClient.invalidateQueries("stock-transfers");
    },
    onError: (err) => toast.error(err.message)
  });

  const items = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  const columns = [
    {
      header: t("page.stockTransfer.list.header.transferNo"),
      render: (item) => (
        <span className="font-mono text-xs font-bold text-primary">{item.transferNumber}</span>
      )
    },
    {
      header: t("page.stockTransfer.list.header.from"),
      render: (item) => <span className="text-sm">{item.fromStoreData?.name || "-"}</span>
    },
    {
      header: t("page.stockTransfer.list.header.to"),
      render: (item) => <span className="text-sm">{item.toStoreData?.name || "-"}</span>
    },
    {
      header: t("page.stockTransfer.list.header.items"),
      align: "center",
      render: (item) => <span className="font-mono text-sm">{item.items?.length || 0}</span>
    },
    {
      header: t("page.stockTransfer.list.header.notes"),
      render: (item) => (
        <span className="text-xs text-muted-foreground max-w-[150px] truncate block">
          {item.notes || "-"}
        </span>
      )
    },
    {
      header: t("page.stockTransfer.list.header.reason"),
      render: (item) => (
        <span className="text-xs text-muted-foreground max-w-[150px] truncate block">
          {item.reason || "-"}
        </span>
      )
    },
    {
      header: t("page.stockTransfer.list.header.expectedArrival"),
      render: (item) => (
        <span className="text-xs font-mono text-muted-foreground">
          {item.expectedArrival
            ? new Date(item.expectedArrival).toLocaleDateString(dateLocale())
            : "-"}
        </span>
      )
    },
    {
      header: t("page.stockTransfer.list.header.transferredBy"),
      render: (item) => (
        <span className="text-sm">{item.transferredBy || item.transferredByData?.name || "-"}</span>
      )
    },
    {
      header: t("page.stockTransfer.list.header.status"),
      align: "center",
      render: (item) => {
        const sc = statusCfg[item.status] || statusCfg.pending;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sc.class}`}>
            {sc.label}
          </span>
        );
      }
    },
    {
      header: t("page.stockTransfer.list.header.aksi"),
      align: "right",
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: CheckCircle, label: t("page.stockTransfer.list.receive") },
        { icon: XCircle, label: t("page.stockTransfer.list.cancel") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          visible={2}
          items={[
            ...(item.status === "sent"
              ? [
                  {
                    label: t("page.stockTransfer.list.receive"),
                    icon: CheckCircle,
                    onClick: () =>
                      setConfirmAction({
                        type: "receive",
                        id: item.id,
                        transferNumber: item.transferNumber
                      })
                  },
                  {
                    label: t("page.stockTransfer.list.cancel"),
                    icon: XCircle,
                    danger: true,
                    onClick: () =>
                      setConfirmAction({
                        type: "cancel",
                        id: item.id,
                        transferNumber: item.transferNumber
                      })
                  }
                ]
              : []),
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/stock-transfer/detail?id=${item.id}`)
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
          {
            label: t("page.stockTransfer.list.title"),
            i18nKey: "page.stockTransfer.list.title"
          }
        ]}
        title={t("page.stockTransfer.list.title")}
        description={t("page.stockTransfer.list.subtitle")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button
            variant="success"
            onClick={() => navigate("/add-stock-transfer")}
            className="shrink-0 gap-2">
            <Plus size={16} /> {t("page.stockTransfer.list.addButton")}
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
            <div>
              <DataTable
                emptyAction={
                  canAccess(user, MENU_KEY, "add")
                    ? {
                        label: t("page.stockTransfer.list.addButton"),
                        onClick: () => navigate("/add-stock-transfer")
                      }
                    : undefined
                }
                columns={columns}
                data={items}
                isLoading={isLoading}
                emptyMessage={t("page.stockTransfer.list.emptyMessage")}
                toolbar={
                  <TableToolbar
                    title={t("page.stockTransfer.list.title")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    <StoreFilterField
                      id="stock-transfer-list-store-filter"
                      label={t("page.goodsReceipt.detail.store")}
                      locations={locData?.data || []}
                      value={storeFilter}
                      onChange={(v) => {
                        setGlobalStoreFilter(v);
                        setPage(1);
                      }}
                      isSuperAdmin={isSuperAdmin}
                      t={t}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="stock-transfer-list-all-status"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.stockTransfer.list.filter.allStatus")}
                      </label>
                      <Combobox
                        id="stock-transfer-list-all-status"
                        options={[
                          {
                            value: "all",
                            label: t("page.stockTransfer.list.filter.allStatus")
                          },
                          ...Object.entries(statusCfg).map(([k, v]) => ({
                            value: k,
                            label: v.label
                          }))
                        ]}
                        value={statusFilter}
                        onChange={(val) => {
                          setStatusFilter(val);
                          setPage(1);
                        }}
                        placeholder={t("page.stockTransfer.list.filter.allStatus")}
                        searchPlaceholder={t("common.search")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="stock-transfer-list-search"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.search")}
                      </label>
                      <SearchInput
                        id="stock-transfer-list-search"
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.stockTransfer.list.placeholder.search")}
                        isLoading={isLoading}
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
        open={!!confirmAction}
        onOpenChange={(v) => {
          if (!v) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === "receive"
            ? t("page.stockTransfer.list.receiveConfirmTitle")
            : t("page.stockTransfer.list.cancelConfirmTitle")
        }
        description={
          confirmAction?.type === "receive"
            ? t("page.stockTransfer.list.receiveConfirmDesc", {
                transferNumber: confirmAction?.transferNumber
              })
            : t("page.stockTransfer.list.cancelConfirmDesc", {
                transferNumber: confirmAction?.transferNumber
              })
        }
        confirmText={
          confirmAction?.type === "receive"
            ? t("page.stockTransfer.list.receive")
            : t("page.stockTransfer.list.cancel")
        }
        confirmVariant={confirmAction?.type === "cancel" ? "destructive" : "default"}
        loading={
          confirmAction?.type === "receive" ? receiveMutation.isLoading : cancelMutation.isLoading
        }
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "receive") receiveMutation.mutate(confirmAction.id);
          else cancelMutation.mutate(confirmAction.id);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};

export default StockTransferList;

import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { canAccess } from "@/utils/permission";
import { getAllSalesReturn, approveSalesReturn, rejectSalesReturn } from "@/services/sales-return";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import NoStore from "@/components/ui/NoStore";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import TableActions from "@/components/ui/TableActions";
import StoreFilterField from "@/components/ui/StoreFilterField";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Input } from "@/components/ui/input";
import { dateLocale } from "@/lib/locale";

const statusCfg = {
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

const SalesReturnList = () => {
  const { t } = useTranslation();
  const refundMethodLabel = (m) => {
    const known = ["cash", "debit", "credit", "e-wallet", "other"];
    return known.includes(m) ? t(`page.salesReturn.method.${m}`) : m || "-";
  };
  const needsRefundReference = (item) =>
    Number(item?.refundAmount) > 0 &&
    !["cash", "tunai", "points"].includes(String(item?.refundMethod || "cash").toLowerCase());
  const isOtherRefund = (item) => String(item?.refundMethod || "").toLowerCase() === "other";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/sales-return";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState(null);
  // BA 009 (DR-23 §D/§G): approving a non-cash refund needs its reference
  // (OTHER: a description); the server refuses it otherwise.
  const [actionItem, setActionItem] = useState(null);
  const [refundReference, setRefundReference] = useState("");
  const [referenceError, setReferenceError] = useState(false);

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const locationParam = storeFilter !== "all" ? storeFilter : undefined;

  const isFiltered = search !== "" || storeFilter !== "all" || statusFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setGlobalStoreFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const { data, isLoading, isError, refetch } = useQuery(
    ["sales-returns", page, limit, search, storeFilter, statusFilter],
    () =>
      getAllSalesReturn({
        page,
        limit,
        search: search || undefined,
        store: locationParam,
        status: statusFilter !== "all" ? statusFilter : undefined
      }),
    { keepPreviousData: true }
  );

  const items = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  // A 409 here means a real business conflict (already terminal, order
  // cancelled/void, or the refund now exceeds what's actually left
  // refundable) — the backend message already names which one; surface
  // it under a distinct title instead of a generic "failed" toast, and
  // refresh the list so the now-stale row (e.g. still showing "pending")
  // doesn't mislead the next click.
  const describeMutationError = (err) => {
    const status = err?.response?.status;
    const message = err?.response?.data?.message || err.message;
    if (status === 409) {
      return { title: t("page.salesReturn.list.toast.conflict"), description: message };
    }
    return { title: t("page.salesReturn.list.toast.error"), description: message };
  };

  const approveMut = useMutation(approveSalesReturn, {
    onSuccess: () => {
      toast.success(t("page.salesReturn.list.toast.success"), {
        description: t("page.salesReturn.list.toast.approveDesc")
      });
      queryClient.invalidateQueries(["sales-returns"]);
      setActionTarget(null);
    },
    onError: (err) => {
      if (err?.response?.status === 422 && err?.response?.data?.code === "REFERENCE_REQUIRED") {
        setReferenceError(true);
      }
      const { title, description } = describeMutationError(err);
      toast.error(title, { description });
      queryClient.invalidateQueries(["sales-returns"]);
    }
  });

  const rejectMut = useMutation(rejectSalesReturn, {
    onSuccess: () => {
      toast.success(t("page.salesReturn.list.toast.success"), {
        description: t("page.salesReturn.list.toast.rejectDesc")
      });
      queryClient.invalidateQueries(["sales-returns"]);
      setActionTarget(null);
    },
    onError: (err) => {
      const { title, description } = describeMutationError(err);
      toast.error(title, { description });
      queryClient.invalidateQueries(["sales-returns"]);
    }
  });

  const columns = [
    {
      header: t("page.salesReturn.list.header.returnNo"),
      render: (item) => (
        <span className="font-mono text-xs font-bold text-primary">{item.returnNumber}</span>
      )
    },
    {
      header: t("page.salesReturn.list.header.store"),
      render: (item) => <span className="text-sm">{item.storeData?.name || "-"}</span>
    },
    {
      header: t("page.salesReturn.list.header.items"),
      align: "center",
      render: (item) => <span className="font-mono text-sm">{item.items?.length || 0}</span>
    },
    {
      header: t("page.salesReturn.list.header.refundAmount"),
      align: "right",
      render: (item) => (
        <span className="font-mono text-sm font-semibold">
          Rp {(item.refundAmount || 0).toLocaleString("id-ID")}
        </span>
      )
    },
    {
      header: t("page.salesReturn.list.header.refundMethod"),
      render: (item) => <span className="text-sm">{refundMethodLabel(item.refundMethod)}</span>
    },
    {
      header: t("page.salesReturn.list.header.reason"),
      render: (item) => (
        <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
          {item.reason || "-"}
        </span>
      )
    },
    {
      header: t("page.salesReturn.list.header.returnedBy"),
      render: (item) => (
        <span className="text-sm">
          {item.createdByUser?.fullName || item.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.salesReturn.list.header.status"),
      align: "center",
      render: (item) => {
        const sc = statusCfg[item.status] || statusCfg.pending;
        const statusKey = statusCfg[item.status] ? item.status : "pending";
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sc.class}`}>
            {t(`page.salesReturn.status.${statusKey}`)}
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
      header: t("common.updatedAt"),
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
      header: t("page.salesReturn.list.header.aksi"),
      align: "right",
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: CheckCircle, label: t("common.approve") },
        { icon: XCircle, label: t("common.reject") }
      ],
      render: (item) => (
        <TableActions
          align="right"
          visible={2}
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/sales-return/detail?id=${item.id}`)
            },
            ...(item.status === "pending" && canAccess(user, MENU_KEY, "edit")
              ? [
                  {
                    label: t("common.approve"),
                    icon: CheckCircle,
                    onClick: () => {
                      setActionTarget(item.id);
                      setActionItem(item);
                      setRefundReference("");
                      setReferenceError(false);
                      setActionType("approve");
                    }
                  },
                  {
                    label: t("common.reject"),
                    icon: XCircle,
                    danger: true,
                    onClick: () => {
                      setActionTarget(item.id);
                      setActionType("reject");
                    }
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
            label: t("page.salesReturn.list.breadcrumb.dashboard"),
            href: "/dashboard-super-admin",
            i18nKey: "page.salesReturn.list.breadcrumb.dashboard"
          },
          { label: t("page.salesReturn.list.title") }
        ]}
        title={t("page.salesReturn.list.title")}
        description={t("page.salesReturn.list.subtitle")}>
        <Button
          variant="success"
          onClick={() => navigate("/sales-return/create")}
          className="w-full md:w-auto">
          {t("page.salesReturn.list.button.create")}
        </Button>
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
                emptyAction={{
                  label: t("page.salesReturn.list.button.create"),
                  onClick: () => navigate("/sales-return/create")
                }}
                columns={columns}
                data={items}
                isLoading={isLoading}
                emptyMessage={t("page.salesReturn.list.emptyMessage")}
                toolbar={
                  <TableToolbar
                    title={t("page.salesReturn.list.title")}
                    onReset={resetFilters}
                    isFiltered={isFiltered}>
                    <StoreFilterField
                      id="sales-return-list-store-filter"
                      label={t("page.salesReturn.list.filter.store")}
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
                        htmlFor="sales-return-list-all-status"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.salesReturn.list.filter.allStatus")}
                      </label>
                      <Combobox
                        id="sales-return-list-all-status"
                        options={[
                          { value: "all", label: t("page.salesReturn.list.filter.allStatus") },
                          ...Object.entries(statusCfg).map(([k]) => ({
                            value: k,
                            label: t(`page.salesReturn.status.${k}`)
                          }))
                        ]}
                        value={statusFilter}
                        onChange={(v) => {
                          setStatusFilter(v);
                          setPage(1);
                        }}
                        placeholder={t("page.salesReturn.list.filter.allStatus")}
                        searchPlaceholder={t("common.search")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="sales-return-list-search"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.salesReturn.list.filter.search")}
                      </label>
                      <SearchInput
                        id="sales-return-list-search"
                        value={search}
                        onChange={(val) => {
                          setSearch(val);
                          setPage(1);
                        }}
                        placeholder={t("page.salesReturn.list.placeholder.search")}
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

          <Modal
            type="form"
            open={!!actionTarget && actionType === "approve" && needsRefundReference(actionItem)}
            onOpenChange={(o) => !o && setActionTarget(null)}
            title={t("page.salesReturn.list.modal.approveTitle")}
            description={t("page.salesReturn.list.modal.referenceDesc", {
              method: refundMethodLabel(actionItem?.refundMethod)
            })}
            confirmText={t("page.salesReturn.list.modal.approveConfirm")}
            loading={approveMut.isLoading}
            onConfirm={() => {
              if (!refundReference.trim()) {
                setReferenceError(true);
                return false;
              }
              approveMut.mutate({ id: actionTarget, refundReference });
              return false;
            }}>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sales-return-refund-reference"
                className="text-sm font-medium text-foreground">
                {t(
                  isOtherRefund(actionItem)
                    ? "page.salesReturn.list.modal.otherLabel"
                    : "page.salesReturn.list.modal.referenceLabel"
                )}{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                unstyled
                id="sales-return-refund-reference"
                value={refundReference}
                onChange={(e) => {
                  setRefundReference(e.target.value);
                  if (e.target.value.trim()) setReferenceError(false);
                }}
                aria-invalid={referenceError}
                aria-describedby="sales-return-refund-reference-hint"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                maxLength={FIELD_LIMITS.REFERENCE}
              />
              <p
                id="sales-return-refund-reference-hint"
                role={referenceError ? "alert" : undefined}
                className={
                  referenceError ? "text-sm text-destructive" : "text-xs text-muted-foreground"
                }>
                {t(
                  referenceError
                    ? isOtherRefund(actionItem)
                      ? "page.salesReturn.list.modal.otherRequired"
                      : "page.salesReturn.list.modal.referenceRequired"
                    : "page.salesReturn.list.modal.referenceHint"
                )}
              </p>
            </div>
          </Modal>
          <Modal
            type="confirm"
            open={!!actionTarget && !(actionType === "approve" && needsRefundReference(actionItem))}
            onOpenChange={(o) => !o && setActionTarget(null)}
            title={
              actionType === "approve"
                ? t("page.salesReturn.list.modal.approveTitle")
                : t("page.salesReturn.list.modal.rejectTitle")
            }
            description={
              actionType === "approve"
                ? t("page.salesReturn.list.modal.approveDesc")
                : t("page.salesReturn.list.modal.rejectDesc")
            }
            confirmText={
              actionType === "approve"
                ? t("page.salesReturn.list.modal.approveConfirm")
                : t("page.salesReturn.list.modal.rejectConfirm")
            }
            confirmVariant={actionType === "approve" ? "default" : "destructive"}
            onConfirm={() => {
              if (actionType === "approve") approveMut.mutate(actionTarget);
              else rejectMut.mutate(actionTarget);
            }}
          />
        </>
      )}
    </div>
  );
};

export default SalesReturnList;

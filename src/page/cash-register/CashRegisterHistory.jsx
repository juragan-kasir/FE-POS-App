import React, { useEffect, useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { Eye, Receipt, Plus, RotateCcw, X, Coins } from "lucide-react";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getCashRegisterHistory, closeCashRegister } from "@/services/cash-register";
import { isCashPayment } from "@/utils/payment";
import { finalClosingBalance } from "@/utils/registerBalance";
import { formatStoreDate, formatStoreTime } from "@/utils/storeTimezone";
import AbortController from "@/components/organism/abort-controller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import StoreFilter from "@/components/ui/StoreFilter";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import { canDecideVariance } from "@/utils/varianceApproval";
import {
  VarianceApprovalBadge,
  VarianceDecisionControls
} from "@/page/cash-register/components/VarianceApproval";
import { useLocations } from "@/queries/useLocations";

const formatIDR = (num) => {
  if (!num && num !== 0) return "-";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

const parseIDR = (str) => {
  if (!str) return 0;
  return Number(str.replace(/[^0-9]/g, "")) || 0;
};

const CashRegisterHistory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  // const defaultStoreId = cookie?.activeStore || user?.store;
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [closeTarget, setCloseTarget] = useState(null);
  const [rawClosing, setRawClosing] = useState("0");
  const closingBalance = parseIDR(rawClosing);

  const isFiltered = search !== "" || storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setGlobalStoreFilter("all");
    setPage(1);
  };

  const { data: locData, isLoading: isLoadingLocations } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["cash-register-history", page, limit, search, storeFilter],
    () =>
      getCashRegisterHistory({
        page,
        limit,
        search: search || undefined,
        store: storeFilter === "all" ? undefined : storeFilter
      }),
    { keepPreviousData: true }
  );

  const items = data?.data || [];

  // DR-15: a decision's server-confirmed status shows immediately for that
  // row; the next authoritative page load replaces every override.
  const [decidedById, setDecidedById] = useState(() => new Map());
  useEffect(() => {
    setDecidedById(new Map());
  }, [data]);
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  const closeMut = useMutation(
    () =>
      closeCashRegister(closeTarget?.id, {
        storeId: closeTarget?.store || closeTarget?.storeData?.id,
        closedBy: user?.id,
        closingBalance
      }),
    {
      onSuccess: () => {
        toast.success(t("page.cashRegister.history.closeSuccess"));
        queryClient.invalidateQueries(["cash-register-history"]);
        queryClient.invalidateQueries(["cash-register-current"]);
        setCloseTarget(null);
        setRawClosing("0");
        refetch();
      },
      onError: (err) =>
        toast.error(t("page.cashRegister.history.closeFail"), {
          description: err?.response?.data?.message || err.message
        })
    }
  );

  const statusCfg = {
    open: {
      label: t("page.cashRegister.history.statusOpen"),
      class: "bg-green-100 text-green-800"
    },
    closed: {
      label: t("page.cashRegister.history.statusClosed"),
      class: "bg-muted text-muted-foreground"
    }
  };

  const columns = [
    {
      header: t("page.cashRegister.history.store"),
      render: (item) => (
        <div className="text-sm">
          <div>{item.storeData?.name || "-"}</div>
          {item.storeData?.address && (
            <div className="text-xs text-muted-foreground">
              {[item.storeData.address, item.storeData.city].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      )
    },
    {
      header: t("page.cashRegister.history.openedBy"),
      render: (item) => <span className="text-sm">{item.createdByUser?.fullName || "-"}</span>
    },
    {
      header: t("page.cashRegister.history.open"),
      render: (item) => {
        const d = item.openedAt ? new Date(item.openedAt) : null;
        const valid = d && !isNaN(d.getTime());
        const tz = item.storeData?.timezone;
        return (
          <div className="text-xs">
            <div>{valid ? formatStoreDate(d, tz) : "-"}</div>
            <div className="text-muted-foreground">{valid ? formatStoreTime(d, tz) : ""}</div>
          </div>
        );
      }
    },
    {
      header: t("page.cashRegister.history.closedBy"),
      render: (item) => <span className="text-sm">{item.modifiedByUser?.fullName || "-"}</span>
    },
    {
      header: t("page.cashRegister.history.closed"),
      render: (item) => (
        <div className="text-xs">
          {item.closedAt && !isNaN(new Date(item.closedAt).getTime()) ? (
            <>
              <div>{formatStoreDate(item.closedAt, item.storeData?.timezone)}</div>
              <div className="text-muted-foreground">
                {formatStoreTime(item.closedAt, item.storeData?.timezone)}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
    {
      header: t("page.cashRegister.history.openingBalance"),
      align: "right",
      render: (item) => <span className="font-mono text-sm">{formatIDR(item.openingBalance)}</span>
    },
    {
      header: t("page.cashRegister.history.sales"),
      align: "right",
      render: (item) => <span className="font-mono text-sm">{formatIDR(item.totalSales)}</span>
    },
    {
      header: t("page.cashRegister.history.expenses"),
      align: "right",
      render: (item) => <span className="font-mono text-sm">{formatIDR(item.totalExpenses)}</span>
    },
    {
      // Phase 39 Batch 4 follow-up: outside-window population per
      // register (BE `outsideWindow`, same membership as the
      // reconciliation OUTSIDE_WINDOW bucket) so the list explains why a
      // closing balance only reflects its own window.
      header: t("page.cashRegister.history.outside"),
      align: "right",
      render: (item) => (
        <div className="text-right">
          <div className="font-mono text-sm">{item.outsideWindow?.count ?? 0}x</div>
          <div className="text-xs text-muted-foreground font-mono">
            {formatIDR(item.outsideWindow?.total)}
          </div>
        </div>
      )
    },
    {
      header: t("page.cashRegister.history.closingBalance"),
      align: "right",
      render: (item) => {
        const closing = finalClosingBalance(item);
        if (closing == null) {
          // OPEN register: no closing balance exists yet (not Rp 0).
          return (
            <div className="text-right" data-testid={`closing-balance-${item.id}`}>
              <span
                className="font-mono text-sm text-muted-foreground"
                title={t("page.cashRegister.history.notClosedYet")}
                aria-label={t("page.cashRegister.history.notClosedYet")}>
                -
              </span>
            </div>
          );
        }
        // Why the closing differs: variance plus its two factual
        // components already present on the row (non-cash sales counted
        // in the close but not in the cash drawer, and expenses). No new
        // financial meaning — purely an explanatory caption.
        const variance = item.variance;
        const payments = item.totalPayments || {};
        const paymentKeys = Object.keys(payments);
        let nonCash = 0;
        if (paymentKeys.length > 0) {
          nonCash = paymentKeys.reduce(
            (s, k) => s + (!isCashPayment(k) ? Number(payments[k]) || 0 : 0),
            0
          );
        } else if (item.cashSalesReceived != null) {
          nonCash = (item.totalSales || 0) - (item.cashSalesReceived || 0);
        }
        return (
          <div className="text-right" data-testid={`closing-balance-${item.id}`}>
            <div className="font-mono text-sm">{formatIDR(closing)}</div>
            {variance != null && variance !== 0 && (
              <div className="text-xs text-muted-foreground">
                {t("page.cashRegister.history.variance")} {variance > 0 ? "+" : ""}
                {formatIDR(variance)}
                {nonCash > 0
                  ? ` · ${t("page.cashRegister.history.nonCash")} ${formatIDR(nonCash)}`
                  : ""}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: t("page.cashRegister.history.status"),
      align: "center",
      render: (item) => {
        const sc = statusCfg[item.status] || statusCfg.closed;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${sc.class}`}>
            {sc.label}
          </span>
        );
      }
    },
    {
      header: t("page.cashRegister.variance.column"),
      align: "center",
      render: (item) => {
        if (item.status !== "closed") {
          return <span className="text-muted-foreground">-</span>;
        }
        const approval = decidedById.get(item.id) ?? item.varianceApprovalStatus;
        if (!approval) return <span className="text-muted-foreground">-</span>;
        const variance = item.variance;
        return (
          <div className="flex flex-col items-center gap-2">
            <VarianceApprovalBadge status={approval} />
            {canDecideVariance({
              roleType: user?.roleType,
              registerStatus: item.status,
              approvalStatus: approval
            }) && (
              <VarianceDecisionControls
                registerId={item.id}
                varianceLabel={
                  variance == null ? undefined : `${variance > 0 ? "+" : ""}${formatIDR(variance)}`
                }
                onDecided={(status) => setDecidedById((prev) => new Map(prev).set(item.id, status))}
              />
            )}
          </div>
        );
      }
    },
    {
      header: t("page.cashRegister.history.action"),
      align: "right",
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: X, label: t("page.cashRegister.history.closeRegister") }
      ],
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/cash-register/history/detail", { state: { item } });
            }}>
            <Eye size={18} />
          </Button>
          {item.status === "open" && (
            <Button
              variant="danger"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                const expected =
                  (item.openingBalance || 0) + (item.totalSales || 0) - (item.totalExpenses || 0);
                setRawClosing(String(expected > 0 ? Math.round(expected) : 0));
                setCloseTarget(item);
              }}>
              <X size={18} />
            </Button>
          )}
        </div>
      )
    }
  ];

  const breadcrumbs = isSuperAdmin
    ? [
        { label: t("breadcrumb.home"), href: "/dashboard-super-admin", i18nKey: "breadcrumb.home" },
        { i18nKey: "page.cashRegister.history.breadcrumb" }
      ]
    : [
        { label: t("breadcrumb.home"), href: "/dashboard-super-admin", i18nKey: "breadcrumb.home" },
        {
          href: "/cash-register/current",
          i18nKey: "page.cashRegister.history.breadcrumbCashier"
        },
        { i18nKey: "page.cashRegister.history.breadcrumb" }
      ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={t("page.cashRegister.history.title")}
        description={t("page.cashRegister.history.desc")}
      />

      {isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <div>
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            emptyMessage={t("page.cashRegister.history.empty")}
            emptyIcon={Receipt}
            emptyAction={{
              label: t("page.cashRegister.history.openRegister"),
              onClick: () => navigate("/cash-register/open-close")
            }}
            toolbar={
              <div className="flex flex-wrap lg:flex-nowrap items-end gap-3 w-full">
                <h4 className="text-base font-semibold text-foreground shrink-0 self-center mr-1">
                  {t("page.cashRegister.history.title")}
                </h4>
                {isLoadingLocations || isLoading ? (
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Skeleton className="h-9 flex-1 rounded-md" />
                    {isSuperAdmin && <Skeleton className="h-9 w-44 rounded-md" />}
                    <Skeleton className="h-9 w-24 rounded-md" />
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-[160px]">
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
                          placeholder={t("page.cashRegister.history.search")}
                          isLoading={isFetching}
                        />
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("page.goodsReceipt.detail.store")}
                        </label>
                        <StoreFilter
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
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        &nbsp;
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        onClick={resetFilters}
                        disabled={!isFiltered}>
                        <RotateCcw size={14} />
                        {t("common.resetFilter")}
                      </Button>
                    </div>
                  </>
                )}
                <Button
                  onClick={() => navigate("/cash-register/open-close")}
                  className="shrink-0 gap-2">
                  <Plus size={16} /> {t("page.cashRegister.history.openRegister")}
                </Button>
              </div>
            }
            onRowClick={(item) => navigate("/cash-register/history/detail", { state: { item } })}
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
        open={!!closeTarget}
        onOpenChange={(o) => !o && setCloseTarget(null)}
        title={t("page.cashRegister.history.closeRegister")}
        description={t("page.cashRegister.history.closeDesc")}
        confirmText={t("page.cashRegister.history.closeConfirm")}
        loading={closeMut.isLoading}
        onConfirm={() => closeMut.mutate()}>
        <div className="space-y-2">
          <Label htmlFor="cash-register-history-closing-balance" className="text-sm font-medium">
            {t("page.cashRegister.current.closingBalance")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground pointer-events-none">
              <Coins size={16} />
            </div>
            <Input
              id="cash-register-history-closing-balance"
              type="text"
              inputMode="numeric"
              value={formatIDR(rawClosing === "0" ? "" : rawClosing)}
              placeholder={t("page.cashRegister.current.placeholder")}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^0-9]/g, "");
                setRawClosing(cleaned || "0");
              }}
              className="pl-10 h-12 text-lg font-semibold tabular-nums"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CashRegisterHistory;

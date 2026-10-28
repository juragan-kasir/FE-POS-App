import React, { useState, useCallback } from "react";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { useCookies } from "react-cookie";
import { Clock, User, Database, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { useQuery } from "react-query";
import StoreFilter from "@/components/ui/StoreFilter";
import TableToolbar from "@/components/ui/TableToolbar";
import { Skeleton } from "@/components/ui/skeleton";
import NoStore from "@/components/ui/NoStore";
import { getAuditLogs } from "@/services/auditLog";
import { useLocations } from "@/queries/useLocations";
import PageHeader from "@/components/ui/PageHeader";

const AuditLogList = () => {
  const { t } = useTranslation();

  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const store = cookie?.activeStore || cookie.user?.store;
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const isFiltered =
    storeFilter !== "all" || search !== "" || actionFilter !== "" || entityFilter !== "";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setSearch("");
    setActionFilter("");
    setEntityFilter("");
    setPage(1);
  };

  const { data: locData, isLoading: isLoadingLocations } = useLocations("all", {
    enabled: isSuperAdmin
  });

  const fetchParams = {
    page,
    pageSize,
    action: actionFilter || undefined,
    entity: entityFilter || undefined,
    search: search || undefined,
    ...(isSuperAdmin ? (storeFilter === "all" ? {} : { store: storeFilter || store }) : { store })
  };

  const {
    data: logsData,
    isLoading,
    isError,
    refetch
  } = useQuery(["audit-logs", fetchParams], () => getAuditLogs(fetchParams), {
    enabled: isSuperAdmin || !!store,
    keepPreviousData: true,
    staleTime: 10000
  });

  const logs = logsData?.data || [];
  const pagination = logsData?.pagination || { total: 0, totalPages: 1 };

  const handleFetch = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("sidebar.auditLog") }
        ]}
        title={t("sidebar.auditLog")}
        description={<>{t("page.auditLog.description", { count: logs.length })}</>}>
        <Button variant="outline" size="sm" onClick={handleFetch} disabled={isLoading}>
          {isLoading ? <RefreshCw size={14} className="animate-spin mr-1" /> : null}
          {t("page.auditLog.refresh")}
        </Button>
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            {isLoadingLocations ? (
              <>
                <Skeleton className="h-9 w-48 rounded-md" />
                <Skeleton className="h-9 w-full md:w-64 rounded-md" />
              </>
            ) : (
              <TableToolbar
                title={t("sidebar.auditLog")}
                onReset={resetFilters}
                isFiltered={isFiltered}>
                {isSuperAdmin && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.goodsReceipt.detail.store")}
                    </label>
                    <StoreFilter
                      locations={(locData?.data || []).filter((l) => l.status === "active")}
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
                    {t("common.search")}
                  </label>
                  <SearchInput
                    value={search}
                    onChange={(val) => {
                      setSearch(val);
                      setPage(1);
                    }}
                    placeholder={t("page.auditLog.searchPlaceholder")}
                    isLoading={isLoading}
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("common.action")}
                  </label>
                  <Combobox
                    value={actionFilter}
                    onChange={(v) => {
                      setActionFilter(v);
                      setPage(1);
                    }}
                    options={[
                      { value: "", label: t("page.auditLog.allActions") },
                      { value: "create", label: "CREATE" },
                      { value: "update", label: "UPDATE" },
                      { value: "delete", label: "DELETE" },
                      { value: "approve", label: "APPROVE" },
                      { value: "reject", label: "REJECT" },
                      { value: "import", label: "IMPORT" },
                      { value: "void", label: "VOID" },
                      { value: "payment", label: "PAYMENT" },
                      { value: "refund", label: "REFUND" },
                      { value: "login", label: "LOGIN" },
                      { value: "status_change", label: "STATUS CHANGE" },
                      { value: "report_export", label: "REPORT EXPORT" },
                      { value: "receipt_read", label: "RECEIPT READ" }
                    ]}
                    className="w-full sm:w-48"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("page.auditLog.ui.entity")}
                  </label>
                  <Combobox
                    value={entityFilter}
                    onChange={(v) => {
                      setEntityFilter(v);
                      setPage(1);
                    }}
                    options={[
                      { value: "", label: t("page.auditLog.allEntities") },
                      { value: "order", label: "Order" },
                      { value: "product", label: "Product" },
                      { value: "member", label: "Member" },
                      { value: "memberTier", label: "Member Tier" },
                      { value: "user", label: "User" },
                      { value: "payment", label: "Payment" },
                      { value: "cashRegister", label: "Cash Register" }
                    ]}
                    className="w-full sm:w-48"
                  />
                </div>
              </TableToolbar>
            )}
          </div>

          {isError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Database size={40} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm mb-4">{t("page.auditLog.loadFailed")}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw size={14} className="mr-1" />
                {t("page.auditLog.retry")}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              {search || actionFilter || entityFilter
                ? t("page.auditLog.noMatching")
                : t("page.auditLog.noLogs")}
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {logs.map((log) => (
                  <Card key={log.id} className="p-4 border-l-4 border-l-primary">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              log.action === "create"
                                ? "bg-emerald-100 text-emerald-700"
                                : log.action === "update"
                                  ? "bg-blue-100 text-blue-700"
                                  : log.action === "delete"
                                    ? "bg-red-100 text-red-700"
                                    : log.action === "approve"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : log.action === "reject"
                                        ? "bg-red-100 text-red-700"
                                        : log.action === "login"
                                          ? "bg-purple-100 text-purple-700"
                                          : log.action === "payment"
                                            ? "bg-amber-100 text-amber-700"
                                            : log.action === "refund"
                                              ? "bg-orange-100 text-orange-700"
                                              : log.action === "void"
                                                ? "bg-rose-100 text-rose-700"
                                                : log.action === "status_change"
                                                  ? "bg-violet-100 text-violet-700"
                                                  : "bg-muted text-muted-foreground"
                            }`}>
                            {log.action?.toUpperCase()}
                          </span>
                          <span className="font-bold text-sm font-mono text-primary">
                            {log.entity}
                            {log.entityId && (
                              <span className="text-muted-foreground">:#{log.entityId}</span>
                            )}
                          </span>
                          <span className="px-2 py-0.5 bg-muted text-xs rounded">
                            <Clock size={10} className="mr-1 inline" />
                            {new Date(log.createdAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {log.userName || log.userId || t("page.auditLog.system")}
                          </span>
                          {log.description && (
                            <p className="mt-1 text-sm text-foreground">{log.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
                        {log.ipAddress && (
                          <span>
                            {t("page.auditLog.ui.ip")} {log.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    {t("page.auditLog.showing", {
                      start: (page - 1) * pageSize + 1,
                      end: Math.min(page * pageSize, pagination.total),
                      total: pagination.total
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}>
                      <ChevronLeft size={14} />
                    </Button>
                    <span className="px-3 text-sm">
                      {page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}>
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLogList;

import React, { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { Plus, Award, CheckCircle, FileEdit, XCircle, Eye, Edit, Trash2 } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { toast } from "sonner";
import { getAllMemberTier, deleteMemberTier } from "@/services/member-tier";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import { canAccess } from "@/utils/permission";
import AbortController from "@/components/organism/abort-controller";
import { useLocations } from "@/queries/useLocations";

const MemberTier = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/member-tier";
  const [currentPage, setCurrentPage] = usePageParam();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [limit, setLimit] = useState(5);

  const isFiltered = statusFilter !== "all" || search !== "";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const {
    data: tiersData,
    isLoading,
    isFetching,
    isError,
    refetch
  } = useQuery(["member-tiers"], getAllMemberTier);
  const tiers = tiersData?.data || tiersData?.tiers || [];
  const normalizeStatus = (s) => {
    const v = String(s ?? "").toLowerCase();
    if (v === "true" || v === "active") return "active";
    if (v === "false" || v === "inactive") return "inactive";
    return "draft";
  };
  const activeTierCount =
    tiersData?.activeCount ?? tiers.filter((t) => normalizeStatus(t.status) === "active").length;
  const draftTierCount = tiers.filter((t) => normalizeStatus(t.status) === "draft").length;
  const inactiveTierCount = tiers.filter((t) => normalizeStatus(t.status) === "inactive").length;

  const filteredTiers = tiers.filter((tier) => {
    const matchesSearch = tier.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || normalizeStatus(tier.status) === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.ceil(filteredTiers.length / limit);
  const paginatedTiers = filteredTiers.slice((currentPage - 1) * limit, currentPage * limit);

  const deleteMutation = useMutation(deleteMemberTier, {
    onSuccess: () => {
      toast.success(t("page.memberTier.list.toastDeleteSuccess"), {
        description: t("page.memberTier.list.toastDeleteDesc")
      });
      queryClient.invalidateQueries(["member-tiers"]);
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(t("page.memberTier.list.toastError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const statusBadge = (status) => {
    const ns = normalizeStatus(status);
    const isActive = ns === "active";
    const isInactive = ns === "inactive";
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            : isInactive
              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
        }`}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : isInactive ? "bg-red-500" : "bg-amber-500"}`}
        />
        {isActive ? t("common.active") : isInactive ? t("common.inactive") : t("common.draft")}
      </span>
    );
  };

  const columns = [
    {
      header: "#",
      render: (tier, idx) => (
        <span className="font-mono text-sm text-muted-foreground">
          {(currentPage - 1) * limit + idx + 1}
        </span>
      )
    },
    {
      header: t("page.memberTier.table.name"),
      render: (tier) => (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-8 rounded-full"
            style={{ backgroundColor: tier.color || "#f59e0b" }}
          />
          <span className="font-semibold text-foreground">{tier.name}</span>
        </div>
      )
    },
    {
      header: t("page.memberTier.table.minPoints"),
      render: (tier) => (
        <span className="font-mono text-sm text-foreground">
          {tier.minPoints?.toLocaleString?.() || tier.minPoints || 0}
        </span>
      )
    },
    {
      header: t("page.memberTier.table.maxPoints"),
      render: (tier) => (
        <span className="font-mono text-sm text-foreground">
          {tier.maxPoints?.toLocaleString?.() || tier.maxPoints || "-"}
        </span>
      )
    },
    {
      header: t("page.memberTier.table.discount"),
      render: (tier) => (
        <span className="font-mono text-sm text-primary font-semibold">
          {tier.discountPercent ? `${tier.discountPercent}%` : "-"}
        </span>
      )
    },
    {
      header: t("page.memberTier.table.benefits"),
      render: (tier) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(tier.benefits)
            ? tier.benefits
            : (tier.benefits || "").split("\n").filter(Boolean)
          ).map((benefit, idx) => (
            <span
              key={idx}
              className="bg-primary/10 px-2 py-0.5 rounded text-[10px] font-bold text-primary">
              {benefit}
            </span>
          ))}
        </div>
      )
    },
    {
      header: t("page.memberTier.table.members"),
      render: (tier) => (
        <span className="font-mono text-sm text-foreground">
          {tier.members || tier.memberCount || 0}
        </span>
      )
    },
    {
      header: t("page.memberTier.table.status"),
      render: (tier) => statusBadge(tier.status ?? tier.isActive)
    },
    {
      header: t("page.memberTier.table.createdAt"),
      render: (tier) => (
        <span className="text-sm text-muted-foreground">
          {tier.createdAt
            ? new Date(tier.createdAt).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
            : "-"}
        </span>
      )
    },
    {
      header: t("page.memberTier.table.updatedAt"),
      render: (tier) => (
        <span className="text-sm text-muted-foreground">
          {tier.updatedAt
            ? new Date(tier.updatedAt).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
            : "-"}
        </span>
      )
    },
    {
      header: t("page.memberTier.table.createdBy"),
      render: (tier) => (
        <span className="text-sm text-muted-foreground">{tier.createdByUser?.fullName || "-"}</span>
      )
    },
    {
      header: t("page.memberTier.table.modifiedBy"),
      render: (tier) => (
        <span className="text-sm text-muted-foreground">
          {tier.modifiedByUser?.fullName || "-"}
        </span>
      )
    },
    {
      header: t("page.memberTier.table.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (tier) => (
        <TableActions
          align="center"
          items={[
            {
              label: t("page.memberTier.list.detailTitle"),
              iconName: "visibility",
              onClick: () => navigate(`/detail-member-tier?id=${tier.id}`)
            },
            {
              label: t("page.memberTier.list.editTitle"),
              iconName: "edit",
              onClick: () => navigate(`/edit-member-tier/${tier.id}`),
              hidden: !canAccess(user, MENU_KEY, "edit")
            },
            {
              label: t("page.memberTier.list.deleteTitle"),
              iconName: "delete",
              danger: true,
              onClick: () => setDeleteTarget(tier),
              hidden: !canAccess(user, MENU_KEY, "delete")
            }
          ]}
        />
      )
    }
  ];

  return (
    <div data-tour="page-member-tier" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.memberTier.list.title"),
            i18nKey: "page.memberTier.list.title"
          }
        ]}
        title={t("page.memberTier.list.title")}
        description={t("page.memberTier.list.description")}>
        {canAccess(user, MENU_KEY, "add") && (
          <Button variant="success" onClick={() => navigate("/add-member-tier")} className="gap-2">
            <Plus size={18} />
            {t("page.memberTier.list.addTier")}
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
              <div>
                {isFetching || isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                      label={t("page.memberTier.list.totalTiers")}
                      value={tiers.length}
                      icon={Award}
                      variant="default"
                    />
                    <StatCard
                      label={t("common.active")}
                      value={activeTierCount}
                      icon={CheckCircle}
                      variant="active"
                    />
                    <StatCard
                      label={t("common.draft")}
                      value={draftTierCount}
                      icon={FileEdit}
                      variant="draft"
                    />
                    <StatCard
                      label={t("common.inactive")}
                      value={inactiveTierCount}
                      icon={XCircle}
                      variant="red"
                    />
                  </div>
                )}

                <div data-tour="tier-table" className="mt-6">
                  <DataTable
                    emptyAction={
                      canAccess(user, MENU_KEY, "add")
                        ? {
                            label: t("page.memberTier.list.addTier"),
                            onClick: () => navigate("/add-member-tier")
                          }
                        : undefined
                    }
                    columns={columns}
                    data={paginatedTiers}
                    isLoading={isLoading || isFetching}
                    rowClassName={() => "group"}
                    toolbar={
                      <TableToolbar
                        title={t("page.memberTier.list.tableTitle")}
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
                              { value: "draft", label: t("common.draft") },
                              { value: "inactive", label: t("common.inactive") }
                            ]}
                            value={statusFilter}
                            onChange={(v) => {
                              setStatusFilter(v);
                              setCurrentPage(1);
                            }}
                            placeholder={t("common.all")}
                            searchPlaceholder="Cari..."
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
                              setCurrentPage(1);
                            }}
                            placeholder={t("common.search")}
                            isLoading={isFetching}
                          />
                        </div>
                      </TableToolbar>
                    }
                    pagination={{
                      page: currentPage,
                      totalPages,
                      total: filteredTiers.length,
                      onPageChange: setCurrentPage,
                      pageSize: limit,
                      onPageSizeChange: (v) => {
                        setLimit(v);
                        setCurrentPage(1);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("page.memberTier.list.deleteModalTitle")}
        description={t("page.memberTier.list.deleteModalDescription")}
        confirmText={t("page.memberTier.list.deleteModalConfirm")}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ id: deleteTarget.id || deleteTarget._id });
          }
        }}
      />
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default MemberTier;

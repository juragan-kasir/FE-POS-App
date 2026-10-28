import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { Plus, Eye, Edit, Trash2, Package, Zap, Clock, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getBundles, deleteBundle, changeBundleStatus } from "@/services/productBundle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { SearchInput } from "@/components/ui/SearchInput";
import Modal from "@/components/organism/modal";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import AbortController from "@/components/organism/abort-controller";
import StatCard from "@/components/ui/StatCard";
import NoStore from "@/components/ui/NoStore";
import StoreFilter from "@/components/ui/StoreFilter";
import PageHeader from "@/components/ui/PageHeader";
import { TipsCard } from "@/components/ui/tips-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useLocations } from "@/queries/useLocations";

const BundleList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  // ponytail: masa berlaku bisa diubah langsung dari modal aktivasi
  const [activateForm, setActivateForm] = useState({
    fromDate: null,
    fromTime: "00:00",
    untilDate: null,
    untilTime: "23:59"
  });

  const openStatusModal = (row) => {
    setStatusTarget(row);
    if (row.status === "active") return;
    const from = row.validFrom ? new Date(row.validFrom) : null;
    const until = row.validUntil ? new Date(row.validUntil) : null;
    const fmtTime = (d) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setActivateForm({
      fromDate: from,
      fromTime: from ? fmtTime(from) : "00:00",
      untilDate: until,
      untilTime: until ? fmtTime(until) : "23:59"
    });
  };

  const combineDateTime = (date, time) => {
    if (!date) return null;
    const d = new Date(date);
    const [hours, minutes] = (time || "00:00").split(":");
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  };

  const isFiltered = search !== "" || statusFilter !== "all" || storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGlobalStoreFilter("all");
    setPage(1);
  };

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isError, refetch } = useQuery(
    ["bundles", page, limit, search, storeFilter, statusFilter],
    () =>
      getBundles({
        page,
        limit,
        store: storeFilter !== "all" ? storeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search || undefined
      }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteBundle, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("common.deleteSuccess")
      });
      queryClient.invalidateQueries(["bundles"]);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const statusMutation = useMutation(({ id, status }) => changeBundleStatus(id, status), {
    onSuccess: (_data, variables) => {
      toast.success(t("common.success"), {
        description:
          variables.status === "active"
            ? t("page.bundle.activateSuccess")
            : t("page.bundle.deactivateSuccess")
      });
      queryClient.invalidateQueries(["bundles"]);
      setStatusTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const items = data?.data?.items || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || 1;
  const stats = data?.data?.stats || {};

  const statCards = [
    {
      label: t("page.bundle.stats.total"),
      value: String(stats.total ?? 0),
      icon: "package_2",
      variant: "default"
    },
    {
      label: t("page.bundle.stats.active"),
      value: String(stats.active ?? 0),
      icon: "check_circle",
      variant: "active"
    },
    {
      label: t("page.bundle.stats.draft"),
      value: String(stats.draft ?? 0),
      icon: "edit_note",
      variant: "draft"
    },
    {
      label: t("page.bundle.stats.inactive"),
      value: String(stats.inactive ?? 0),
      icon: "block",
      variant: "inactive"
    }
  ];

  const statusOptions = [
    { value: "all", label: t("common.all") },
    { value: "active", label: t("common.active") },
    { value: "draft", label: t("common.draft") },
    { value: "inactive", label: t("common.inactive") }
  ];

  const statusBadge = (status) => {
    const map = {
      active: {
        bg: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
        dot: "bg-green-500",
        label: t("common.active")
      },
      draft: {
        bg: "bg-muted text-foreground border-border",
        dot: "bg-muted-foreground",
        label: t("common.draft")
      },
      inactive: {
        bg: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
        dot: "bg-red-500",
        label: t("common.inactive")
      }
    };
    return safeGet(map, status) ?? map.draft;
  };

  // ponytail: indikator masa berlaku, pola sama dengan DiscountList —
  // expired kalau lewat validUntil, expiring kalau sisa <= 7 hari
  const getExpiryStatus = (row) => {
    const now = new Date();
    if (row.validFrom && new Date(row.validFrom) > now) return null;
    if (!row.validUntil) return null;
    const endDate = new Date(row.validUntil);
    if (isNaN(endDate.getTime())) return null;
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired";
    if (diffDays <= 7) return "expiring";
    return null;
  };

  const formatPrice = (val) => `Rp${Number(val || 0).toLocaleString("id-ID")}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      return (
        d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }) +
        " " +
        d.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit"
        })
      );
    } catch {
      return "-";
    }
  };

  const getStoreName = (row) => {
    const store = row.store;
    if (!store) return t("page.category.form.storeSection.allStores");
    const loc = (locData?.data || []).find((l) => String(l.id) === String(store));
    if (loc) return loc.name || loc.storeName || `Store #${store}`;
    if (user?.store && String(user.store) === String(store))
      return user.storeName || `Store #${store}`;
    return `Store #${store}`;
  };

  const columns = [
    {
      header: "No",
      render: (_row, idx) => String((page - 1) * limit + idx + 1),
      align: "center"
    },
    {
      header: t("page.bundle.table.name"),
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.image ? (
            <img src={row.image} alt={row.name} className="w-8 h-8 rounded object-cover" />
          ) : (
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
              <Package size={14} className="text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium text-sm">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.sku}</p>
          </div>
        </div>
      )
    },
    {
      header: t("page.bundle.table.store"),
      render: (row) => <span className="text-sm text-muted-foreground">{getStoreName(row)}</span>
    },
    {
      header: t("page.bundle.table.items"),
      render: (row) => (
        <span className="text-sm font-medium">
          {row.items?.length || 0} {t("page.bundle.table.itemsLabel")}
        </span>
      )
    },
    {
      header: t("page.bundle.table.originalPrice"),
      render: (row) => (
        <span className="text-sm line-through text-muted-foreground">
          {formatPrice(row.originalPrice)}
        </span>
      ),
      align: "right"
    },
    {
      header: t("page.bundle.table.bundlePrice"),
      render: (row) => (
        <span className="text-sm font-semibold text-green-600">{formatPrice(row.bundlePrice)}</span>
      ),
      align: "right"
    },
    {
      header: t("page.bundle.table.discount"),
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
          <Zap size={10} />
          {row.discountPercentage > 0 ? `${row.discountPercentage}%` : "-"}
        </span>
      )
    },
    {
      header: t("page.bundle.list.validity"),
      render: (row) => {
        const expiryStatus = getExpiryStatus(row);
        const hasStart = !!row.validFrom;
        const hasEnd = !!row.validUntil;

        let validityText = "";
        if (!hasStart && !hasEnd) {
          validityText = t("page.bundle.list.validity.unlimited");
        } else if (hasStart && !hasEnd) {
          validityText = `${formatDate(row.validFrom)} →`;
        } else if (!hasStart && hasEnd) {
          validityText = `→ ${formatDate(row.validUntil)}`;
        } else {
          validityText = `${formatDate(row.validFrom)} - ${formatDate(row.validUntil)}`;
        }

        return (
          <div className="flex items-center gap-2">
            <span className="text-xs">{validityText}</span>
            {expiryStatus === "expiring" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                <Clock size={12} />
                {t("page.bundle.list.expiringSoon")}
              </span>
            )}
            {expiryStatus === "expired" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                <XCircle size={12} />
                {t("page.bundle.list.expired")}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: t("common.status"),
      render: (row) => {
        const s = statusBadge(row.status);
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        );
      }
    },
    {
      header: t("page.bundle.table.createdBy"),
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.createdByUser?.fullName || row.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.bundle.table.createdDate"),
      render: (row) => (
        <span className="text-sm font-mono text-muted-foreground">{formatDate(row.createdAt)}</span>
      )
    },
    {
      header: t("page.bundle.table.modifiedBy"),
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.modifiedByUser?.fullName || row.modifiedByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("page.bundle.table.modifiedDate"),
      render: (row) => (
        <span className="text-sm font-mono text-muted-foreground">{formatDate(row.updatedAt)}</span>
      )
    },
    {
      header: t("common.action"),
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.view") },
        { icon: Edit, label: t("common.edit") },
        { icon: RotateCcw, label: t("common.activate") },
        { icon: XCircle, label: t("common.deactivate") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (row) => (
        <TableActions
          align="center"
          items={[
            {
              label: t("common.view"),
              icon: Eye,
              onClick: () => navigate(`/bundle/${row.id}`)
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => navigate(`/bundle/edit/${row.id}`)
            },
            ...(row.status === "active"
              ? [
                  {
                    label: t("common.deactivate"),
                    icon: XCircle,
                    danger: true,
                    onClick: () => openStatusModal(row)
                  }
                ]
              : [
                  {
                    label: t("common.activate"),
                    icon: RotateCcw,
                    onClick: () => openStatusModal(row),
                    disabled: row.validUntil && new Date(row.validUntil) < new Date()
                  }
                ]),
            {
              label: t("common.delete"),
              icon: Trash2,
              danger: true,
              onClick: () => setDeleteTarget(row)
            }
          ]}
        />
      )
    }
  ];

  const filters = (
    <TableToolbar title={t("page.bundle.title")} onReset={resetFilters} isFiltered={isFiltered}>
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
        <label
          htmlFor="bundle-list-search"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("common.search")}
        </label>
        <SearchInput
          id="bundle-list-search"
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder={t("page.bundle.searchPlaceholder")}
          isLoading={isLoading}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="bundle-list-status"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("common.status")}
        </label>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}>
          <SelectTrigger id="bundle-list-status" className="w-36 h-9 text-sm">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TableToolbar>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("sidebar.bundle"), i18nKey: "sidebar.bundle" }
        ]}
        title={t("page.bundle.title")}
        description={t("page.bundle.description")}>
        <Button variant="success" onClick={() => navigate("/bundle/add")} className="gap-2">
          <Plus size={16} />
          {t("page.bundle.addButton")}
        </Button>
      </PageHeader>

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {statCards.map((card, i) => (
              <div key={i} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <StatCard {...card} />
              </div>
            ))}
          </div>

          <TipsCard
            variant="info"
            title={t("tips.bundleTitle")}
            tips={[t("page.bundle.tip1"), t("page.bundle.tip2"), t("page.bundle.tip3")]}
          />

          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <DataTable
              emptyAction={{
                label: t("page.bundle.addButton"),
                onClick: () => navigate("/bundle/add")
              }}
              columns={columns}
              data={items}
              isLoading={isLoading}
              emptyMessage={t("page.bundle.empty")}
              emptyIcon={Package}
              toolbar={filters}
              pagination={{
                page,
                totalPages,
                total,
                onPageChange: setPage,
                showingText: `Menampilkan ${items.length} dari ${total} data`,
                pageSize: limit,
                onPageSizeChange: (v) => {
                  setLimit(v);
                  setPage(1);
                }
              }}
            />
          )}
        </>
      )}

      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        type="confirm"
        title={t("common.deleteConfirmTitle")}
        description={t("common.deleteConfirmDesc", { name: deleteTarget?.name || "" })}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        loading={deleteMutation.isLoading}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
      />

      {/* ponytail: konfirmasi aktif/non-aktif dari tabel. Saat mengaktifkan,
          tampilkan tanggal mulai & berakhir — pakai type="form" agar children
          (info masa berlaku) ikut dirender */}
      <Modal
        open={!!statusTarget}
        onOpenChange={() => setStatusTarget(null)}
        type={statusTarget?.status === "active" ? "confirm" : "form"}
        className="w-[90vw] sm:max-w-[60vw]"
        title={
          statusTarget?.status === "active"
            ? t("page.bundle.modal.deactivateTitle")
            : t("page.bundle.modal.activateTitle")
        }
        description={
          statusTarget?.status === "active"
            ? t("page.bundle.modal.deactivateDescription", { name: statusTarget?.name || "" })
            : t("page.bundle.modal.activateDescription", { name: statusTarget?.name || "" })
        }
        confirmText={
          statusTarget?.status === "active" ? t("common.deactivate") : t("common.activate")
        }
        cancelText={t("common.cancel")}
        loading={statusMutation.isLoading}
        onConfirm={() => {
          if (statusTarget.status === "active") {
            statusMutation.mutate({ id: statusTarget.id, status: "inactive" });
            return;
          }
          // ponytail: saat aktivasi, kirim masa berlaku terbaru dari picker
          statusMutation.mutate({
            id: statusTarget.id,
            status: "active",
            validFrom:
              combineDateTime(activateForm.fromDate, activateForm.fromTime)?.toISOString() ?? null,
            validUntil:
              combineDateTime(activateForm.untilDate, activateForm.untilTime)?.toISOString() ?? null
          });
        }}>
        {statusTarget && statusTarget.status !== "active" && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("page.bundle.list.validity")}
            </p>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6 space-y-1">
                <Label htmlFor="bundle-list-valid-from" className="text-xs">
                  {t("page.bundle.form.validFrom")}
                </Label>
                <DatePicker
                  id="bundle-list-valid-from"
                  date={activateForm.fromDate}
                  setDate={(d) => setActivateForm((f) => ({ ...f, fromDate: d }))}
                  placeholder={t("page.bundle.form.validFrom")}
                />
              </div>
              <div className="col-span-6">
                <TimePicker
                  value={activateForm.fromTime}
                  onChange={(v) => setActivateForm((f) => ({ ...f, fromTime: v }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6 space-y-1">
                <Label htmlFor="bundle-list-valid-until" className="text-xs">
                  {t("page.bundle.form.validUntil")}
                </Label>
                <DatePicker
                  id="bundle-list-valid-until"
                  date={activateForm.untilDate}
                  setDate={(d) => setActivateForm((f) => ({ ...f, untilDate: d }))}
                  minDate={activateForm.fromDate || undefined}
                  disabled={!activateForm.fromDate}
                  placeholder={
                    !activateForm.fromDate
                      ? t("page.bundle.form.validFromFirst")
                      : t("page.bundle.form.validUntil")
                  }
                />
              </div>
              <div className="col-span-6">
                <TimePicker
                  value={activateForm.untilTime}
                  onChange={(v) => setActivateForm((f) => ({ ...f, untilTime: v }))}
                  disabled={!activateForm.fromDate}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BundleList;

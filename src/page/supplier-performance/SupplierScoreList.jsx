import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { Award, Eye, Calculator } from "lucide-react";
import { toast } from "sonner";
import {
  getSupplierScores,
  getTopSuppliers,
  calculateSupplierScore
} from "@/services/supplierPerformance";
import { getAllSupplier } from "@/services/supplier";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/SearchInput";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import TableToolbar from "@/components/ui/TableToolbar";
import Modal from "@/components/organism/modal";
import { canAccess } from "@/utils/permission";
import { useLocations } from "@/queries/useLocations";

const periodOptions = [
  { value: "all", label: "All Periods" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "all_time", label: "All Time" }
];

const gradeOptions = [
  { value: "all", label: "All Grades" },
  { value: "A", label: "Grade A" },
  { value: "B", label: "Grade B" },
  { value: "C", label: "Grade C" },
  { value: "D", label: "Grade D" },
  { value: "F", label: "Grade F" }
];

const gradeBadge = (grade) => {
  const map = {
    A: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
    D: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    F: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
  };
  return safeGet(map, grade, "bg-muted text-muted-foreground");
};

const SupplierScoreList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [calculateModal, setCalculateModal] = useState(false);
  const [calculateForm, setCalculateForm] = useState({
    storeId: "",
    supplierId: "",
    period: "monthly"
  });
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const isFiltered =
    storeFilter !== "all" || search !== "" || periodFilter !== "all" || gradeFilter !== "all";

  const resetFilters = () => {
    setGlobalStoreFilter("all");
    setSearch("");
    setPeriodFilter("all");
    setGradeFilter("all");
    setPage(1);
  };

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const MENU_KEY = "/supplier-score-list";

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["supplier-scores", page, limit, storeFilter, search, periodFilter, gradeFilter],
    () =>
      getSupplierScores({
        store: storeFilter === "all" ? "" : storeFilter,
        page,
        limit,
        search,
        period: periodFilter,
        grade: gradeFilter
      }),
    { retry: 1, keepPreviousData: true }
  );

  const { data: topData } = useQuery(
    ["top-suppliers", storeFilter],
    () => getTopSuppliers({ store: storeFilter === "all" ? "" : storeFilter, limit: 5 }),
    { retry: 1 }
  );

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin,
    retry: 1
  });
  const locations = locData?.data || [];

  const { data: suppliersData } = useQuery(
    ["suppliers-calculate", storeFilter],
    () =>
      getAllSupplier({
        page: 1,
        limit: 999,
        status: "active",
        store: isSuperAdmin
          ? storeFilter && storeFilter !== "all"
            ? storeFilter
            : ""
          : user?.store || ""
      }),
    { retry: 1, staleTime: 30000 }
  );
  const suppliers = suppliersData?.data || [];
  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }));

  const calculateMutation = useMutation(calculateSupplierScore, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.supplierPerformance.toast.calculateSuccess")
      });
      queryClient.invalidateQueries(["supplier-scores"]);
      queryClient.invalidateQueries(["top-suppliers"]);
      setCalculateModal(false);
      setCalculateForm({
        storeId: storeFilter !== "all" && storeFilter !== "" ? Number(storeFilter) : "",
        supplierId: "",
        period: "monthly"
      });
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const topSuppliers = topData?.data || [];

  const columns = [
    {
      header: t("page.supplierPerformance.list.rank"),
      render: (row, rowIndex) => {
        const idx = (page - 1) * limit + rowIndex + 1;
        return <span className="font-semibold text-foreground">#{idx}</span>;
      }
    },
    {
      header: t("page.supplierPerformance.list.supplier"),
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.supplier?.name || "-"}</div>
          <div className="text-xs text-muted-foreground">
            {row.supplier?.phone || row.supplier?.email || ""}
          </div>
        </div>
      )
    },
    {
      header: t("page.supplierPerformance.list.period"),
      render: (row) => <span className="text-sm capitalize">{row.period?.replace("_", " ")}</span>
    },
    {
      header: t("page.supplierPerformance.list.onTimeRate"),
      render: (row) => {
        const rate = parseFloat(row.onTimeRate || 0);
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className="text-sm font-medium">{rate.toFixed(1)}%</span>
          </div>
        );
      }
    },
    {
      header: t("page.supplierPerformance.list.defectRate"),
      render: (row) => {
        const rate = parseFloat(row.defectRate || 0);
        return (
          <span
            className={`text-sm font-medium ${rate > 5 ? "text-red-600" : rate > 2 ? "text-yellow-600" : "text-green-600"}`}>
            {rate.toFixed(1)}%
          </span>
        );
      }
    },
    {
      header: t("page.supplierPerformance.list.score"),
      render: (row) => (
        <span className="text-lg font-bold text-foreground">
          {parseFloat(row.overallScore || 0).toFixed(1)}
        </span>
      )
    },
    {
      header: t("page.supplierPerformance.list.grade"),
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${gradeBadge(row.grade)}`}>
          {row.grade}
        </span>
      )
    },
    {
      header: t("common.actions"),
      stickyRight: true,
      legend: [{ icon: Eye, label: t("common.view") }],
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(`/detail-supplier-score?id=${row.id}`)}>
          <Eye size={14} />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            href:
              user?.roleType === "super_admin"
                ? "/dashboard-super-admin"
                : user?.roleType === "admin"
                  ? "/dashboard-admin"
                  : "/home",
            i18nKey: "breadcrumb.home"
          },
          { i18nKey: "sidebar.supplierPerformance" }
        ]}
        title={t("page.supplierPerformance.list.title")}
        description={t("page.supplierPerformance.list.description")}>
        {canAccess(user, MENU_KEY, "create") && (
          <Button
            onClick={() => {
              setCalculateForm({
                storeId: storeFilter !== "all" && storeFilter !== "" ? Number(storeFilter) : "",
                supplierId: "",
                period: "monthly"
              });
              setCalculateModal(true);
            }}>
            <Calculator size={16} className="mr-2" />
            {t("page.supplierPerformance.list.calculateButton")}
          </Button>
        )}
      </PageHeader>

      {topSuppliers.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award size={18} className="text-yellow-500" />
            {t("page.supplierPerformance.list.topSuppliers")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topSuppliers.map((supplier, idx) => (
              <div
                key={supplier.id}
                className={`p-4 rounded-lg border ${idx === 0 ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10" : "border-border bg-background"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-lg font-bold ${idx === 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
                    #{idx + 1}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${gradeBadge(supplier.grade)}`}>
                    {supplier.grade}
                  </span>
                </div>
                <div className="font-medium text-sm text-foreground truncate">
                  {supplier.supplier?.name || "-"}
                </div>
                <div className="text-lg font-bold text-foreground">
                  {parseFloat(supplier.overallScore || 0).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading || isFetching}
          isError={isError}
          onRetry={refetch}
          toolbar={
            <TableToolbar
              title={t("page.supplierPerformance.list.title")}
              onReset={resetFilters}
              isFiltered={isFiltered}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cari
                </label>
                <SearchInput
                  value={search}
                  onChange={(val) => {
                    setSearch(val);
                    setPage(1);
                  }}
                  placeholder={t("page.supplierPerformance.list.searchPlaceholder")}
                  className="w-full md:w-64"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter Period
                </label>
                <Combobox
                  options={periodOptions}
                  value={periodFilter}
                  onChange={(val) => {
                    setPeriodFilter(val);
                    setPage(1);
                  }}
                  placeholder="Filter Period"
                  searchPlaceholder="Cari..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter Grade
                </label>
                <Combobox
                  options={gradeOptions}
                  value={gradeFilter}
                  onChange={(val) => {
                    setGradeFilter(val);
                    setPage(1);
                  }}
                  placeholder="Filter Grade"
                  searchPlaceholder="Cari..."
                />
              </div>
            </TableToolbar>
          }
          pagination={{
            page,
            totalPages: data?.pagination?.totalPages || 1,
            total: data?.pagination?.total || 0,
            onPageChange: setPage,
            pageSize: limit,
            onPageSizeChange: (v) => {
              setLimit(v);
              setPage(1);
            }
          }}
          emptyMessage={t("page.supplierPerformance.list.empty")}
        />
      </div>

      {/* Calculate Modal */}
      <Modal
        type="form"
        open={calculateModal}
        onOpenChange={setCalculateModal}
        title={t("page.supplierPerformance.modal.calculateTitle")}
        description={t("page.supplierPerformance.modal.calculateDescription")}
        confirmText={t("page.supplierPerformance.modal.confirmCalculate")}
        onConfirm={() => {
          if (!calculateForm.supplierId) {
            toast.error(t("common.error"), {
              description: t("page.supplierPerformance.modal.pleaseSelectSupplier")
            });
            return false;
          }
          calculateMutation.mutate({
            store: isSuperAdmin
              ? calculateForm.storeId
                ? Number(calculateForm.storeId)
                : null
              : user?.store
                ? Number(user.store)
                : null,
            supplierId: Number(calculateForm.supplierId),
            period: calculateForm.period
          });
          return false;
        }}
        loading={calculateMutation.isLoading}>
        <div className="space-y-4 mt-4">
          {isSuperAdmin && (
            <div>
              <label className="text-sm font-medium text-foreground">
                {t("page.supplierPerformance.modal.store")}
              </label>
              <Combobox
                options={[
                  { value: "", label: t("page.supplierPerformance.modal.allStores") },
                  ...locations.map((loc) => ({ value: loc.id, label: loc.name }))
                ]}
                value={calculateForm.storeId}
                onChange={(v) => setCalculateForm({ ...calculateForm, storeId: v })}
                placeholder={t("page.supplierPerformance.modal.allStores")}
                searchPlaceholder={t("page.supplierPerformance.modal.selectStore")}
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">
              {t("page.supplierPerformance.modal.supplier")}
            </label>
            <Combobox
              options={supplierOptions}
              value={calculateForm.supplierId}
              onChange={(v) => setCalculateForm({ ...calculateForm, supplierId: v })}
              placeholder={t("page.supplierPerformance.modal.selectSupplier")}
              searchPlaceholder={t("page.supplierPerformance.modal.selectSupplier")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Period</label>
            <Combobox
              options={periodOptions.filter((o) => o.value !== "all")}
              value={calculateForm.period}
              onChange={(v) => setCalculateForm({ ...calculateForm, period: v })}
              placeholder="Pilih periode"
              searchPlaceholder="Cari..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SupplierScoreList;

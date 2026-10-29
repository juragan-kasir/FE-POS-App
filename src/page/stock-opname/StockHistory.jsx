import { safeGet } from "@/lib/safe-lookup";
import { usePageParam } from "@/hooks/usePageParam";
import React, { useState } from "react";
import { useQuery } from "react-query";
import { useCookies } from "react-cookie";
import { Calendar } from "lucide-react";
import { getAllStockHistory } from "@/services/stock";
import { getAllProductTable } from "@/services/product";
import { getAllIngredients } from "@/services/ingredient";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import DataTable from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { useTranslation } from "react-i18next";
import NoStore from "@/components/ui/NoStore";
import StoreFilterField from "@/components/ui/StoreFilterField";
import PageHeader from "@/components/ui/PageHeader";
import { DatePicker } from "@/components/ui/date-picker";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { format } from "date-fns";
import AbortController from "@/components/organism/abort-controller";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocations } from "@/queries/useLocations";
import { dateLocale } from "@/lib/locale";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString(dateLocale(), {
        day: "numeric",
        month: "short",
        year: "numeric"
      }) +
      " " +
      d.toLocaleTimeString(dateLocale(), {
        hour: "2-digit",
        minute: "2-digit"
      })
    );
  } catch {
    return "-";
  }
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return Number(num).toLocaleString("id-ID");
};

const StockHistory = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const [page, setPage] = usePageParam();
  const [pageSize, setPageSize] = useState(10);
  // Client note 2026-10-24: ingredients and finished products on separate
  // tabs, ingredients first (a recipe menu's sales show up there).
  const [itemType, setItemType] = useState("ingredient");
  const [productFilter, setProductFilter] = useState("");
  const [ingredientFilter, setIngredientFilter] = useState("");
  const [referenceFilter, setReferenceFilter] = useState("");
  const [startDate, setStartDate] = useState(undefined);
  const [endDate, setEndDate] = useState(undefined);
  const [searchProduct] = useState("");
  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const { data: locData, isLoading: isLoadingLocations } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const store = isSuperAdmin
    ? storeFilter && storeFilter !== "all"
      ? storeFilter
      : ""
    : user?.store || "";

  const isFiltered =
    productFilter !== "" ||
    ingredientFilter !== "" ||
    referenceFilter !== "" ||
    !!startDate ||
    !!endDate ||
    storeFilter !== "all";

  const resetFilters = () => {
    setProductFilter("");
    setIngredientFilter("");
    setReferenceFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
    setGlobalStoreFilter("all");
    setPage(1);
  };

  const { data, isLoading, isError, refetch } = useQuery(
    [
      "stock-history",
      itemType,
      page,
      pageSize,
      productFilter,
      ingredientFilter,
      referenceFilter,
      startDate,
      endDate,
      store
    ],
    () =>
      getAllStockHistory({
        page,
        limit: pageSize,
        store,
        itemType,
        product: itemType === "product" ? productFilter || undefined : undefined,
        ingredient: itemType === "ingredient" ? ingredientFilter || undefined : undefined,
        referenceType: referenceFilter || undefined,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined
      }),
    { keepPreviousData: true }
  );

  const { data: productsData } = useQuery(
    ["products-dropdown", searchProduct],
    () => getAllProductTable({ location: "", limit: 100, page: 1, statusProduct: "all" }),
    { enabled: itemType === "product" }
  );

  const { data: ingredientsData } = useQuery(
    ["ingredients-dropdown", store],
    () => getAllIngredients({ store: store || undefined, limit: 999 }),
    { enabled: itemType === "ingredient" }
  );
  const ingredients = ingredientsData?.data || [];

  const changeItemType = (next) => {
    setItemType(next);
    setProductFilter("");
    setIngredientFilter("");
    setPage(1);
  };

  const histories = data?.data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;
  const total = pagination.total || 0;
  const products = productsData?.data || productsData?.products || [];

  const referenceTypeOptions = [
    { value: "", label: t("page.stockHistory.filter.allTypes") },
    { value: "purchase", label: t("page.stockHistory.reference.purchase") },
    { value: "sale", label: t("page.stockHistory.reference.sale") },
    { value: "adjustment", label: t("page.stockHistory.reference.adjustment") },
    { value: "opname", label: t("page.stockHistory.reference.opname") },
    { value: "purchase_return", label: t("page.stockHistory.reference.purchaseReturn") },
    { value: "sale_return", label: t("page.stockHistory.reference.saleReturn") },
    { value: "transfer", label: t("page.stockHistory.reference.transfer") },
    { value: "production", label: t("page.stockHistory.reference.production") },
    { value: "sale_return_reversal", label: t("page.stockHistory.reference.saleReturnReversal") },
    { value: "sale_reversal", label: t("page.stockHistory.reference.saleReversal") },
    { value: "production_reversal", label: t("page.stockHistory.reference.productionReversal") }
  ];

  const getChangeDisplay = (change) => {
    const num = Number(change);
    const cls = num >= 0 ? "text-green-600" : "text-red-600";
    const prefix = num >= 0 ? "+" : "";
    return (
      <span className={`font-semibold ${cls}`}>
        {prefix}
        {formatNumber(num)}
      </span>
    );
  };

  const getReferenceBadge = (type) => {
    const map = {
      purchase: "bg-blue-100 text-blue-700",
      sale: "bg-purple-100 text-purple-700",
      adjustment: "bg-amber-100 text-amber-700",
      opname: "bg-cyan-100 text-cyan-700",
      purchase_return: "bg-rose-100 text-rose-700",
      sale_return: "bg-pink-100 text-pink-700",
      transfer: "bg-teal-100 text-teal-700",
      production: "bg-green-100 text-green-700",
      sale_return_reversal: "bg-orange-100 text-orange-700",
      sale_reversal: "bg-red-100 text-red-700",
      production_reversal: "bg-yellow-100 text-yellow-700"
    };
    const labels = {
      purchase: t("page.stockHistory.reference.purchase"),
      sale: t("page.stockHistory.reference.sale"),
      adjustment: t("page.stockHistory.reference.adjustment"),
      opname: t("page.stockHistory.reference.opname"),
      purchase_return: t("page.stockHistory.reference.purchaseReturn"),
      sale_return: t("page.stockHistory.reference.saleReturn"),
      transfer: t("page.stockHistory.reference.transfer"),
      production: t("page.stockHistory.reference.production"),
      sale_return_reversal: t("page.stockHistory.reference.saleReturnReversal"),
      sale_reversal: t("page.stockHistory.reference.saleReversal"),
      production_reversal: t("page.stockHistory.reference.productionReversal")
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${safeGet(map, type, "bg-muted text-muted-foreground")}`}>
        {safeGet(labels, type) || type}
      </span>
    );
  };

  const columns = [
    {
      header: t("page.stockHistory.table.store"),
      stickyLeft: true,
      render: (h) => (
        <span className="text-sm font-medium whitespace-nowrap">{h.storeData?.name || "-"}</span>
      )
    },
    {
      header: t("page.stockHistory.table.time"),
      render: (h) => <span className="text-xs whitespace-nowrap">{formatDate(h.createdAt)}</span>
    },
    {
      header:
        itemType === "ingredient"
          ? t("page.stockHistory.table.ingredient")
          : t("page.stockHistory.table.product"),
      // A recipe sale writes one row per ingredient that also carries the
      // menu product, so the ingredient row is named by its ingredient and
      // the menu is only the context.
      render: (h) =>
        h.ingredient ? (
          <span className="flex flex-col">
            <span className="font-medium text-sm">{h.ingredientName || "-"}</span>
            {h.productData?.nameProduct && (
              <span className="text-xs text-muted-foreground">
                {t("page.stockHistory.item.forMenu", { name: h.productData.nameProduct })}
              </span>
            )}
          </span>
        ) : (
          <span className="font-medium text-sm">{h.productData?.nameProduct || "-"}</span>
        )
    },
    {
      header: t("page.stockHistory.table.before"),
      align: "right",
      render: (h) => <span className="text-sm">{formatNumber(h.quantityBefore)}</span>
    },
    {
      header: t("page.stockHistory.table.change"),
      align: "right",
      render: (h) => getChangeDisplay(h.quantityChange)
    },
    {
      header: t("page.stockHistory.table.after"),
      align: "right",
      render: (h) => (
        <span className="text-sm font-semibold">
          {formatNumber(h.quantityAfter)}
          {h.unit && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">{h.unit}</span>
          )}
        </span>
      )
    },
    {
      header: t("page.stockHistory.table.type"),
      render: (h) => getReferenceBadge(h.referenceType)
    },
    {
      header: t("page.stockHistory.table.notes"),
      render: (h) => (
        <span className="text-xs text-muted-foreground max-w-[200px] block truncate">
          {h.notes || "-"}
        </span>
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
          { label: t("breadcrumb.inventory"), i18nKey: "breadcrumb.inventory" },
          { label: t("breadcrumb.stockHistory"), i18nKey: "breadcrumb.stockHistory" }
        ]}
        title={t("page.stockHistory.title")}
        description={t("page.stockHistory.description")}
      />

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          <Tabs value={itemType} onValueChange={changeItemType} className="mb-4">
            <TabsList>
              <TabsTrigger value="ingredient">{t("page.stockHistory.tab.ingredient")}</TabsTrigger>
              <TabsTrigger value="product">{t("page.stockHistory.tab.product")}</TabsTrigger>
            </TabsList>
          </Tabs>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <DataTable
              columns={columns}
              data={histories}
              isLoading={isLoading}
              emptyMessage={t("page.stockHistory.empty")}
              emptyIcon={Calendar}
              toolbar={
                <TableToolbar
                  title={t("page.stockHistory.title")}
                  onReset={resetFilters}
                  isFiltered={isFiltered}>
                  {isLoadingLocations || isLoading
                    ? [
                        <Skeleton key="s1" className="h-9 w-full rounded-md" />,
                        <Skeleton key="s2" className="h-9 w-full rounded-md" />,
                        <Skeleton key="s3" className="h-9 w-full rounded-md" />,
                        <Skeleton key="s4" className="h-9 w-full rounded-md" />,
                        <Skeleton key="s5" className="h-9 w-full rounded-md" />
                      ]
                    : [
                        <StoreFilterField
                          key="store"
                          id="stock-history-store-filter"
                          label={t("header.selectStore") || "Store"}
                          locations={locData?.data || []}
                          value={storeFilter}
                          onChange={(v) => {
                            setGlobalStoreFilter(v);
                            setPage(1);
                          }}
                          isSuperAdmin={isSuperAdmin}
                          t={t}
                          className=""
                          labelClassName="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5"
                        />,
                        itemType === "ingredient" ? (
                          <div key="ingredient">
                            <label
                              htmlFor="stock-history-ingredient"
                              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                              {t("page.stockHistory.filter.ingredient")}
                            </label>
                            <Combobox
                              id="stock-history-ingredient"
                              options={[
                                { value: "", label: t("page.stockHistory.filter.allIngredients") },
                                ...ingredients.map((i) => ({
                                  value: String(i.id),
                                  label: i.name
                                }))
                              ]}
                              value={ingredientFilter}
                              onChange={(v) => {
                                setIngredientFilter(v);
                                setPage(1);
                              }}
                              placeholder={t("page.stockHistory.filter.allIngredients")}
                              searchPlaceholder={t("common.search")}
                            />
                          </div>
                        ) : (
                          <div key="product">
                            <label
                              htmlFor="stock-history-product"
                              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                              {t("page.stockHistory.filter.product")}
                            </label>
                            <Combobox
                              id="stock-history-product"
                              options={[
                                { value: "", label: t("page.stockHistory.filter.allProducts") },
                                ...products.map((p) => ({
                                  value: String(p.id || p._id),
                                  label: p.name || p.nameProduct
                                }))
                              ]}
                              value={productFilter}
                              onChange={(v) => {
                                setProductFilter(v);
                                setPage(1);
                              }}
                              placeholder={t("page.stockHistory.filter.allProducts")}
                              searchPlaceholder={t("common.search")}
                            />
                          </div>
                        ),
                        <div key="ref">
                          <label
                            htmlFor="stock-history-reference-type"
                            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            {t("page.stockHistory.filter.referenceType")}
                          </label>
                          <Combobox
                            id="stock-history-reference-type"
                            options={referenceTypeOptions}
                            value={referenceFilter}
                            onChange={(v) => {
                              setReferenceFilter(v);
                              setPage(1);
                            }}
                            placeholder={t("page.stockHistory.filter.allTypes")}
                            searchPlaceholder={t("common.search")}
                          />
                        </div>,
                        <div key="start">
                          <label
                            htmlFor="stock-history-start-date"
                            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            {t("page.stockHistory.filter.startDate")}
                          </label>
                          <DatePicker
                            id="stock-history-start-date"
                            date={startDate}
                            setDate={(date) => {
                              setStartDate(date);
                              setPage(1);
                            }}
                          />
                        </div>,
                        <div key="end">
                          <label
                            htmlFor="stock-history-end-date"
                            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            {t("page.stockHistory.filter.endDate")}
                          </label>
                          <DatePicker
                            id="stock-history-end-date"
                            date={endDate}
                            setDate={(date) => {
                              setEndDate(date);
                              setPage(1);
                            }}
                          />
                        </div>
                      ]}
                </TableToolbar>
              }
              pagination={{
                page,
                pageSize,
                totalPages,
                total,
                onPageChange: setPage,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(1);
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default StockHistory;

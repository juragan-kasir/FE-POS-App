import React, { useState, useMemo } from "react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Search,
  Building2,
  Star,
  Clock,
  Package,
  TrendingDown,
  TrendingUp,
  Scale,
  Filter,
  Calculator,
  Eye,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Store
} from "lucide-react";
import { getAllSupplier } from "@/services/supplier";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import PageHeader from "@/components/ui/PageHeader";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const SupplierComparison = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState("price");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [expanded, setExpanded] = useState(new Set());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading } = useQuery(
    ["suppliers-comparison"],
    () => getAllSupplier({ page: 1, limit: 999, status: "active", includeProducts: true }),
    { staleTime: 30000 }
  );

  const suppliers = data?.data || [];

  const allProducts = useMemo(() => {
    const map = new Map();
    for (const supplier of suppliers) {
      const products = supplier.products || [];
      for (const product of products) {
        const key = product.name?.toLowerCase().trim();
        if (!key) continue;
        if (!map.has(key)) {
          map.set(key, { name: product.name, entries: [] });
        }
        map.get(key).entries.push({
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierPhone: supplier.phone,
          supplierStore: supplier.store || [],
          productId: product.productId,
          price: Number(product.price) || 0,
          unit: product.unit || "pcs",
          leadTime: Number(product.leadTime) || 0,
          leadTimeUnit: product.leadTimeUnit || "hari",
          qualityRating: Number(product.qualityRating) || 0,
          minOrderQty: product.minOrderQty || 1,
          lastPrice: Number(product.lastPrice) || 0
        });
      }
    }
    return Array.from(map.values());
  }, [suppliers]);

  const filteredProducts = useMemo(() => {
    if (selectedProduct && selectedProduct !== "all") {
      return allProducts.filter((p) => p.name === selectedProduct);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return allProducts.filter((p) => p.name.toLowerCase().includes(q));
    }
    return allProducts;
  }, [allProducts, debouncedSearch, selectedProduct]);

  const supplierGroups = useMemo(() => {
    const groups = new Map();
    for (const product of filteredProducts) {
      for (const entry of product.entries) {
        if (!groups.has(entry.supplierId)) {
          groups.set(entry.supplierId, {
            supplierId: entry.supplierId,
            supplierName: entry.supplierName,
            supplierPhone: entry.supplierPhone,
            supplierStore: entry.supplierStore,
            products: []
          });
        }
        groups.get(entry.supplierId).products.push({
          productName: product.name,
          price: entry.price,
          unit: entry.unit,
          leadTime: entry.leadTime,
          leadTimeUnit: entry.leadTimeUnit,
          qualityRating: entry.qualityRating,
          minOrderQty: entry.minOrderQty,
          lastPrice: entry.lastPrice
        });
      }
    }
    const sorted = Array.from(groups.values()).sort((a, b) =>
      a.supplierName.localeCompare(b.supplierName)
    );
    for (const group of sorted) {
      group.products.sort((a, b) => {
        switch (sortBy) {
          case "price":
            return a.price - b.price;
          case "price_desc":
            return b.price - a.price;
          case "quality":
            return b.qualityRating - a.qualityRating;
          case "leadtime":
            return a.leadTime - b.leadTime;
          default:
            return a.productName.localeCompare(b.productName);
        }
      });
    }
    return sorted;
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(supplierGroups.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedGroups = supplierGroups.slice((safePage - 1) * limit, safePage * limit);

  const summary = useMemo(() => {
    if (supplierGroups.length === 0) return null;
    const allPrices = [];
    let totalProducts = 0;
    for (const group of supplierGroups) {
      totalProducts += group.products.length;
      for (const p of group.products) {
        if (p.price > 0) allPrices.push(Number(p.price));
      }
    }
    return {
      supplierCount: supplierGroups.length,
      totalProducts,
      lowestPrice: allPrices.length ? Math.min(...allPrices) : 0,
      highestPrice: allPrices.length ? Math.max(...allPrices) : 0,
      avgPrice: allPrices.length
        ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
        : 0
    };
  }, [supplierGroups]);

  const productDropdownOptions = useMemo(() => {
    if (!searchQuery) return allProducts;
    const q = searchQuery.toLowerCase();
    return allProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [allProducts, searchQuery]);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatIDR = (num) => {
    if (!num && num !== 0) return "-";
    return `Rp ${Number(num).toLocaleString("id-ID")}`;
  };

  const getQualityStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalf = (rating || 0) % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} size={14} className="fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} size={14} className="text-muted-foreground" />);
      }
    }
    return stars;
  };

  const renderPagination = () => {
    const tp = totalPages;
    const maxVisible = 5;
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
    let end = Math.min(tp, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    const pageNumbers = [];
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    const showStartEllipsis = start > 1;
    const showEndEllipsis = end < tp;
    const firstIdx = (safePage - 1) * limit + 1;
    const lastIdx = Math.min(safePage * limit, supplierGroups.length);

    return (
      <div className="px-4 py-3 border-t border-border bg-muted/30 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("page.position.list.show")}</span>
            <Combobox
              options={PAGE_SIZES.map((opt) => ({ value: String(opt), label: String(opt) }))}
              value={String(limit)}
              onChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
              placeholder="10"
              searchPlaceholder="Cari..."
            />
            <span>entries</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {t("page.supplier.ui.showing")} {firstIdx}-{lastIdx} dari {supplierGroups.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={safePage <= 1}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronLeft size={14} />
          </button>
          {showStartEllipsis && (
            <>
              <button
                onClick={() => setPage(1)}
                className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
                1
              </button>
              <span className="w-9 h-9 flex items-center justify-center text-muted-foreground text-xs select-none">
                ...
              </span>
            </>
          )}
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              className={cn(
                "w-9 h-9 flex items-center justify-center border rounded-lg text-sm font-medium transition-colors",
                pageNum === safePage
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}>
              {pageNum}
            </button>
          ))}
          {showEndEllipsis && (
            <>
              <span className="w-9 h-9 flex items-center justify-center text-muted-foreground text-xs select-none">
                ...
              </span>
              <button
                onClick={() => setPage(tp)}
                className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
                {tp}
              </button>
            </>
          )}
          <button
            onClick={() => setPage((p) => Math.min(tp, p + 1))}
            disabled={safePage >= tp}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => setPage(tp)}
            disabled={safePage >= tp}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  const storeLabel = (store) => {
    if (!store || store.length === 0) return t("page.supplier.comparison.allStores");
    return store.map((s) => s.name).join(", ");
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("breadcrumb.supplier"),
            href: "/supplier"
          },
          { label: t("page.supplier.comparison.title") }
        ]}
        title={t("page.supplier.comparison.title")}
        description={t("page.supplier.comparison.subtitle")}>
        <Button variant="outline" size="icon" onClick={() => navigate("/supplier")}>
          <ArrowLeft size={16} />
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      <Card className="p-4 md:p-5 space-y-3 md:space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter size={16} />
          {t("page.supplier.comparison.filters")}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="supplier-comparison-select-product"
              className="text-xs font-medium text-muted-foreground">
              {t("page.supplier.comparison.selectProduct")}
            </label>
            <Select
              value={selectedProduct}
              onValueChange={(val) => {
                setSelectedProduct(val);
                setPage(1);
                if (val !== "all") setSearchQuery("");
              }}>
              <SelectTrigger id="supplier-comparison-select-product">
                <SelectValue placeholder={t("page.supplier.comparison.allProducts")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("page.supplier.comparison.allProducts")}</SelectItem>
                {productDropdownOptions.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({p.entries.length} {t("page.supplier.comparison.suppliers")})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="supplier-comparison-search-product"
              className="text-xs font-medium text-muted-foreground">
              {t("page.supplier.comparison.searchProduct")}
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <Input
                id="supplier-comparison-search-product"
                placeholder={t("page.supplier.comparison.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                  if (e.target.value) setSelectedProduct("all");
                }}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="supplier-comparison-sort-by"
              className="text-xs font-medium text-muted-foreground">
              {t("page.supplier.comparison.sortBy")}
            </label>
            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val);
                setPage(1);
              }}>
              <SelectTrigger id="supplier-comparison-sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">{t("page.supplier.comparison.sortPriceLow")}</SelectItem>
                <SelectItem value="price_desc">
                  {t("page.supplier.comparison.sortPriceHigh")}
                </SelectItem>
                <SelectItem value="quality">{t("page.supplier.comparison.sortQuality")}</SelectItem>
                <SelectItem value="leadtime">
                  {t("page.supplier.comparison.sortLeadTime")}
                </SelectItem>
                <SelectItem value="name">{t("page.supplier.comparison.sortName")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {summary && (
        <>
          <Card className="p-4 md:p-5 bg-primary/5 border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Calculator size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("page.supplier.comparison.stats.avgPrice")}
                </span>
                <p className="text-2xl md:text-3xl font-bold text-foreground truncate">
                  {formatIDR(summary.avgPrice)}
                </p>
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:gap-1.5 sm:items-end text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-green-600">
                  <TrendingDown size={12} />
                  {formatIDR(summary.lowestPrice)}
                </span>
                <span className="inline-flex items-center gap-1 text-red-600">
                  <TrendingUp size={12} />
                  {formatIDR(summary.highestPrice)}
                </span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <Card className="p-3 md:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Scale size={14} />
                <span className="text-xs font-medium">
                  {t("page.supplier.comparison.stats.supplierCount")}
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold">{summary.supplierCount}</p>
            </Card>
            <Card className="p-3 md:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Package size={14} />
                <span className="text-xs font-medium">
                  {t("page.supplier.comparison.stats.totalProducts")}
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold">{summary.totalProducts}</p>
            </Card>
            <Card className="p-3 md:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-green-600 mb-1">
                <TrendingDown size={14} />
                <span className="text-xs font-medium">
                  {t("page.supplier.comparison.stats.lowestPrice")}
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-green-600">
                {formatIDR(summary.lowestPrice)}
              </p>
            </Card>
            <Card className="p-3 md:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-red-600 mb-1">
                <TrendingUp size={14} />
                <span className="text-xs font-medium">
                  {t("page.supplier.comparison.stats.highestPrice")}
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-red-600">
                {formatIDR(summary.highestPrice)}
              </p>
            </Card>
          </div>
        </>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 md:p-6 space-y-3 md:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : paginatedGroups.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Building2 size={24} className="text-muted-foreground/60" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {t("page.supplier.comparison.empty")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("page.supplier.comparison.emptyDesc")}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10" />
                    <TableHead className="font-semibold">
                      {t("page.supplier.comparison.table.supplier")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("page.supplier.comparison.table.phone")}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {t("page.supplier.comparison.table.store")}
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      {t("page.supplier.comparison.table.products")}
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      {t("page.supplier.comparison.table.action")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.map((group) => {
                    const isExpanded = expanded.has(group.supplierId);
                    return (
                      <React.Fragment key={group.supplierId}>
                        <TableRow
                          className="bg-card cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(group.supplierId)}>
                          <TableCell>
                            <ChevronRight
                              size={16}
                              className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{group.supplierName}</p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {group.supplierPhone || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Store size={12} />
                              {storeLabel(group.supplierStore)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {group.products.length}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/detail-supplier?id=${group.supplierId}`);
                              }}>
                              <Eye size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <>
                            <TableRow className="bg-muted/30 border-t-0">
                              <TableCell className="w-10" />
                              <TableCell className="py-1.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {t("page.supplier.comparison.table.product")}
                                </span>
                              </TableCell>
                              <TableCell className="py-1.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {t("page.supplier.comparison.table.price")}
                                </span>
                              </TableCell>
                              <TableCell className="py-1.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {t("page.supplier.comparison.table.quality")}
                                </span>
                              </TableCell>
                              <TableCell className="py-1.5 text-center">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {t("page.supplier.comparison.table.leadTime")}
                                </span>
                              </TableCell>
                              <TableCell className="py-1.5 text-center">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {t("page.supplier.comparison.table.minOrder")}
                                </span>
                              </TableCell>
                            </TableRow>
                            {group.products.map((product, idx) => (
                              <TableRow
                                key={`${group.supplierId}-${product.productName}-${idx}`}
                                className="bg-muted/10 border-t-0">
                                <TableCell />
                                <TableCell className="text-sm font-medium py-2">
                                  {product.productName}
                                </TableCell>
                                <TableCell className="text-sm py-2">
                                  <span className="font-semibold">{formatIDR(product.price)}</span>
                                  <span className="text-xs text-muted-foreground ml-1">
                                    /{product.unit}
                                  </span>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1">
                                    {getQualityStars(product.qualityRating)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-center py-2">
                                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <Clock size={12} />
                                    {product.leadTime || 0} {product.leadTimeUnit}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-center py-2 text-muted-foreground">
                                  {product.minOrderQty || 1}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y">
              {paginatedGroups.map((group) => {
                const isExpanded = expanded.has(group.supplierId);
                return (
                  <div key={group.supplierId}>
                    <div
                      className="bg-card flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
                      onClick={() => toggleExpand(group.supplierId)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight
                          size={16}
                          className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{group.supplierName}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.products.length} {t("page.supplier.comparison.table.products")}
                            {group.supplierPhone && ` · ${group.supplierPhone}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/detail-supplier?id=${group.supplierId}`);
                        }}>
                        <Eye size={16} />
                      </Button>
                    </div>
                    {isExpanded && (
                      <>
                        <div className="ml-6 px-4 py-1.5 bg-muted/30 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <span className="flex-1">
                            {t("page.supplier.comparison.table.product")}
                          </span>
                          <span className="w-20 text-right">
                            {t("page.supplier.comparison.table.price")}
                          </span>
                          <span className="w-16 text-center">
                            {t("page.supplier.comparison.table.quality")}
                          </span>
                          <span className="w-20 text-right">
                            {t("page.supplier.comparison.table.leadTime")}
                          </span>
                          <span className="w-16 text-right">
                            {t("page.supplier.comparison.table.minOrder")}
                          </span>
                        </div>
                        {group.products.map((product, idx) => (
                          <div
                            key={`${group.supplierId}-${product.productName}-${idx}`}
                            className="ml-6 px-4 py-2 border-t bg-muted/10">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="flex-1 font-medium truncate">
                                {product.productName}
                              </span>
                              <span className="w-20 text-right font-semibold">
                                {formatIDR(product.price)}
                              </span>
                              <div className="w-16 flex items-center justify-center gap-0.5">
                                {getQualityStars(product.qualityRating)}
                              </div>
                              <span className="w-20 text-right text-muted-foreground flex items-center justify-end gap-1">
                                <Clock size={11} />
                                {product.leadTime || 0} {product.leadTimeUnit}
                              </span>
                              <span className="w-16 text-right text-muted-foreground">
                                {product.minOrderQty || 1}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {renderPagination()}
          </>
        )}
      </Card>
    </div>
  );
};

export default SupplierComparison;

import React, { useMemo, useState } from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Edit3,
  Calendar,
  Tag,
  Hash,
  CheckCircle2,
  XCircle,
  Clock,
  Beef,
  Lightbulb,
  Boxes,
  AlertTriangle,
  Wallet,
  User
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/SearchInput";
import { getIngredientCategoryById } from "@/services/ingredientCategory";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";

const rupiah = (value) => formatCurrencyRupiah(Number(value) || 0);

const statusConfig = {
  active: {
    icon: CheckCircle2,
    bg: "bg-green-600 dark:bg-green-700 text-white",
    badge:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
  },
  draft: {
    icon: Clock,
    bg: "bg-yellow-500 dark:bg-yellow-600 text-white",
    badge:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
  },
  inactive: {
    icon: XCircle,
    bg: "bg-red-600 dark:bg-red-900 text-white",
    badge:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
  }
};

const DetailIngredientCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [ingSearch, setIngSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery(
    ["ingredient-category", id],
    () => getIngredientCategoryById(id),
    { enabled: !!id }
  );

  // ponytail: service return body → { success, data: {...kategori, ingredients, ingredientCount} }
  const category = data?.data || data;
  const ingredients = category?.ingredients || [];
  const ingredientCount = category?.ingredientCount ?? ingredients.length;
  const st = category ? statusConfig[category.status] || statusConfig.draft : null;
  const StatusIcon = st?.icon;

  const lowStockCount = useMemo(
    () =>
      ingredients.filter(
        (i) => Number(i.minStock || 0) > 0 && Number(i.stock || 0) <= Number(i.minStock)
      ).length,
    [ingredients]
  );

  const totalValue = useMemo(
    () => ingredients.reduce((s, i) => s + Number(i.stock || 0) * Number(i.costPrice || 0), 0),
    [ingredients]
  );

  const filteredIngredients = useMemo(() => {
    if (!ingSearch.trim()) return ingredients;
    const q = ingSearch.trim().toLowerCase();
    return ingredients.filter((i) =>
      String(i.name || "")
        .toLowerCase()
        .includes(q)
    );
  }, [ingredients, ingSearch]);

  if (!id)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.ingredientCategory.detail.notFound")}</p>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("page.ingredientCategory.detail.notFound")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
        <Button variant="danger" onClick={() => navigate("/ingredient-category")}>
          {t("common.back")}
        </Button>
      </div>
    );

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "-";

  const statCards = [
    {
      key: "total",
      icon: Boxes,
      label: t("page.ingredientCategory.detail.totalIngredient"),
      value: ingredientCount,
      tone: "text-primary bg-primary/10",
      onClick: () => navigate("/ingredient")
    },
    {
      key: "lowStock",
      icon: AlertTriangle,
      label: "Stok Menipis",
      value: lowStockCount,
      tone:
        lowStockCount > 0
          ? "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30"
          : "text-muted-foreground bg-muted",
      onClick: () => navigate("/ingredient")
    },
    {
      key: "value",
      icon: Wallet,
      label: "Estimasi Nilai Persediaan",
      value: rupiah(totalValue),
      tone: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.ingredientCategory.list.title"),
            href: "/ingredient-category",
            i18nKey: "page.ingredientCategory.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : category?.name || "-"}
        description={t("page.ingredientCategory.detail.description")}
        backLink="/ingredient-category"
        dynamicInfo={false}>
        {!isLoading && (
          <Button onClick={() => navigate(`/edit-ingredient-category?id=${id}`)}>
            <Edit3 size={14} className="mr-1.5" />
            {t("common.edit")}
          </Button>
        )}
      </PageHeader>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map(({ key, icon: Icon, label, value, tone, onClick }) => (
            <Card
              key={key}
              {...(onClick ? { onClick, role: "button" } : {})}
              className={`p-4 ${
                onClick ? "cursor-pointer hover:bg-accent/50 hover:shadow-sm transition-all" : ""
              }`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className="text-lg font-bold truncate">{value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          </div>
          <Card className="p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Informasi Kategori + Info Data */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  <Tag size={14} />
                  {t("page.ingredientCategory.detail.info")}
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-9 h-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                      <Tag size={16} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {t("page.ingredientCategory.detail.name")}
                      </p>
                      <p className="text-sm font-semibold break-words">{category?.name || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-9 h-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                        <Hash size={16} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {t("page.ingredientCategory.detail.code")}
                        </p>
                        <p className="text-sm font-mono font-semibold">
                          #ICAT-{String(category?.id).padStart(3, "0")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${st?.bg || "bg-primary text-primary-foreground"}`}>
                        {StatusIcon && <StatusIcon size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {t("page.ingredientCategory.detail.status")}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${st?.badge || ""}`}>
                          {StatusIcon && <StatusIcon size={11} />}
                          {t(`common.${category?.status || "draft"}`)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <Calendar size={14} />
                  {t("page.ingredientCategory.detail.infoWaktu")}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      icon: User,
                      label: t("common.createdBy"),
                      value:
                        category?.createdByUser?.fullName ||
                        category?.createdByUser?.userName ||
                        (category?.createdBy ? `#${category.createdBy}` : "-")
                    },
                    {
                      icon: Calendar,
                      label: t("common.createdAt"),
                      value: formatDate(category?.createdAt)
                    },
                    {
                      icon: User,
                      label: t("common.modifiedBy"),
                      value:
                        category?.modifiedByUser?.fullName ||
                        category?.modifiedByUser?.userName ||
                        (category?.modifiedBy ? `#${category.modifiedBy}` : "-")
                    },
                    {
                      icon: Calendar,
                      label: t("common.updatedAt"),
                      value: formatDate(category?.updatedAt)
                    }
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-9 h-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium truncate">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sidebar: Tips */}
            <div className="space-y-4">
              <Card className="p-5 bg-primary/5 border-primary/20 h-fit">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb size={16} className="text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {t("page.ingredientCategory.detail.tips.title")}
                    </p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                        {t("page.ingredientCategory.detail.tips.1")}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                        {t("page.ingredientCategory.detail.tips.2")}
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Bahan baku dalam kategori */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <Beef size={14} />
                  Bahan Baku dalam Kategori
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                  {ingredientCount}
                </span>
              </div>
              {ingredients.length > 0 && (
                <div className="w-full sm:w-64">
                  <SearchInput
                    value={ingSearch}
                    onChange={setIngSearch}
                    placeholder="Cari bahan baku..."
                  />
                </div>
              )}
            </div>

            {ingredients.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Beef size={24} className="text-muted-foreground/60" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Belum ada bahan baku</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bahan baku yang menggunakan kategori ini akan tampil di sini
                  </p>
                </div>
                <Button variant="success" size="sm" onClick={() => navigate("/add-ingredient")}>
                  Tambah Bahan Baku
                </Button>
              </div>
            ) : filteredIngredients.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Beef size={24} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada hasil untuk &quot;{ingSearch}&quot;
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredIngredients.map((ing) => {
                  const low =
                    Number(ing.minStock || 0) > 0 && Number(ing.stock || 0) <= Number(ing.minStock);
                  const ingSt = statusConfig[ing.status] || statusConfig.draft;
                  return (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => navigate(`/detail-ingredient?id=${ing.id}`)}
                      className={`group flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-primary/40 hover:shadow-sm bg-gradient-to-br from-primary/5 to-transparent ${
                        low ? "border-amber-300 dark:border-amber-700/60" : ""
                      }`}>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Beef size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {ing.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span
                            className={`text-xs ${low ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                            Stok: {Number(ing.stock || 0)} {ing.unit || "pcs"}
                            {low && (
                              <span className="inline-flex items-center gap-0.5 ml-1">
                                <AlertTriangle size={10} />
                                Menipis
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-medium text-foreground">
                            {rupiah(ing.costPrice)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ingSt.badge}`}>
                        {(() => {
                          const IngIcon = ingSt.icon;
                          return IngIcon && <IngIcon size={10} />;
                        })()}
                        {t(`common.${ing.status || "draft"}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default DetailIngredientCategory;

import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import {
  Tag,
  FileText,
  CalendarDays,
  User,
  Info,
  Clock,
  Edit3,
  Activity,
  Building2,
  Phone,
  Mail
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { getSupplierCategoryById } from "@/services/supplier";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

const DetailSupplierCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["supplierCategory-detail", id],
    () => getSupplierCategoryById({ id }),
    { enabled: !!id }
  );
  // ponytail: service return body langsung → { success, message, data: {...kategori} }
  const category = data?.data || {};

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.supplier.detail.noId")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  const isActive = category.status === "active";
  const suppliers = category.suppliers || [];
  const supplierCount = category.supplierCount ?? suppliers.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </Card>
          <Card className="p-5 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        </div>
      </div>
    );
  }

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
            label: t("page.supplierCategory.title"),
            href: "/supplier-category",
            i18nKey: "page.supplierCategory.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : category?.name || "-"}
        description={t("page.supplierCategory.description")}
        backLink="/supplier-category"
        dynamicInfo={false}>
        <Button onClick={() => navigate(`/supplier-category?edit=${id}`)}>
          <Edit3 size={14} className="mr-1.5" />
          {t("common.edit")}
        </Button>
      </PageHeader>

      {/* Konten */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Informasi Kategori */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Info size={14} />
            Informasi Kategori
          </h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <Tag size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground w-28 shrink-0">Nama Kategori</span>
              <span className="font-medium">{category.name || "-"}</span>
            </div>
            <div className="flex items-start gap-2">
              <FileText size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground w-28 shrink-0">Deskripsi</span>
              <span className={category.description ? "" : "text-muted-foreground/50"}>
                {category.description || "-"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Activity size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground w-28 shrink-0">Status</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                {isActive ? t("common.active") : t("common.inactive")}
              </span>
            </div>
          </div>
        </Card>

        {/* Metadata */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock size={14} />
            Informasi Data
          </h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <CalendarDays size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground w-28 shrink-0">
                {t("common.createdAt", "Dibuat Tanggal")}
              </span>
              <span>
                {category.createdAt
                  ? format(new Date(category.createdAt), "dd MMM yyyy HH:mm")
                  : "-"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <User size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground w-28 shrink-0">
                {t("common.createdBy", "Dibuat Oleh")}
              </span>
              <span>
                {category.createdByUser?.fullName ||
                  category.createdByUser?.userName ||
                  (category.createdBy ? `#${category.createdBy}` : "-")}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground w-28 shrink-0">
                {t("page.supplier.table.updatedAt", "Diubah Tanggal")}
              </span>
              <span>
                {category.updatedAt
                  ? format(new Date(category.updatedAt), "dd MMM yyyy HH:mm")
                  : "-"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <User size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground w-28 shrink-0">
                {t("common.modifiedBy", "Diubah Oleh")}
              </span>
              <span>
                {category.modifiedByUser?.fullName ||
                  category.modifiedByUser?.userName ||
                  (category.modifiedBy ? `#${category.modifiedBy}` : "-")}
              </span>
            </div>
          </div>
        </Card>

        {/* Supplier dalam kategori */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Building2 size={14} />
              Supplier dalam Kategori
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
              <Building2 size={11} />
              {supplierCount} Supplier
            </span>
          </div>
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Building2 size={24} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">Belum ada supplier dalam kategori ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/detail-supplier?id=${s.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-br from-primary/5 to-transparent text-left hover:border-primary/40 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{s.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {s.contactPerson && (
                        <span className="text-xs text-muted-foreground truncate">
                          CP: {s.contactPerson}
                        </span>
                      )}
                      {s.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone size={10} />
                          {s.phone}
                        </span>
                      )}
                      {s.email && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[160px]">
                          <Mail size={10} />
                          {s.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      s.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                    <span
                      className={`w-1 h-1 rounded-full ${
                        s.status === "active" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    {s.status === "active" ? t("common.active") : t("common.inactive")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DetailSupplierCategory;

import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { Edit3 } from "lucide-react";
import { getStockOpnameById } from "@/services/stock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { FormalDocument, PrintButton } from "@/components/document/FormalDocument";
import { getDocumentSpecForStockOpname } from "@/components/document/documentMappers";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { dateLocale } from "@/lib/locale";

const statusColors = {
  draft:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
  cancelled:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
};

const DetailStockOpname = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const {
    data: detailData,
    isLoading,
    isError,
    refetch
  } = useQuery(["stock-opname-detail", id], () => getStockOpnameById(id), { enabled: !!id });

  const opname = detailData?.data || detailData;
  const items = opname?.items || [];
  const store = opname?.store || {};
  const canEdit = opname?.status === "draft";
  const printSpec = opname ? getDocumentSpecForStockOpname(opname, t) : null;

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm mb-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-3" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-5 rounded-xl border border-border">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-36" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="overflow-x-auto p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b border-border">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 py-2">
                  {[...Array(8)].map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-20 rounded-md" />
        </div>
      </div>
    );
  }

  if (!opname) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
        <Button variant="danger" onClick={() => navigate("/stock-opname")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("page.stockOpname.list.title", "Stock Opname"),
              href: "/stock-opname",
              i18nKey: "page.stockOpname.list.title"
            },
            { label: t("breadcrumb.detail") }
          ]}
          title={t("page.stockOpname.detail.title")}
          description={opname.auditId || `#${opname.id}`}
          backLink="/stock-opname"
          dynamicInfo={false}>
          <PrintButton />
          {canEdit && (
            <Button variant="success" onClick={() => navigate(`/add-stock-opname?id=${opname.id}`)}>
              <Edit3 size={14} className="mr-1.5" />
              {t("common.edit")}
            </Button>
          )}
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 shadow-sm border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("page.stockOpname.detail.auditId")}
            </p>
            <p className="text-lg font-bold text-foreground font-mono">{opname.auditId || "-"}</p>
          </Card>
          <Card className="p-5 shadow-sm border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("common.status")}
            </p>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${statusColors[opname.status] || statusColors.draft}`}>
              {t(`page.stockOpname.status.${opname.status}`) || opname.status}
            </span>
          </Card>
          <Card className="p-5 shadow-sm border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("page.stockOpname.detail.store")}
            </p>
            <p className="text-lg font-bold text-foreground">{store.name || "-"}</p>
          </Card>
          <Card className="p-5 shadow-sm border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("page.stockOpname.detail.auditor")}
            </p>
            <p className="text-lg font-bold text-foreground">{opname.auditor || "-"}</p>
          </Card>
          <Card className="p-5 shadow-sm border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("page.stockOpname.detail.auditDate")}
            </p>
            <p className="text-lg font-bold text-foreground">
              {opname.auditDate
                ? new Date(opname.auditDate).toLocaleDateString(dateLocale(), {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })
                : "-"}
            </p>
          </Card>
          <Card className="p-5 shadow-sm border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("page.stockOpname.detail.notes")}
            </p>
            <p className="text-lg font-bold text-foreground">{opname.notes || "-"}</p>
          </Card>
        </div>

        <Card className="overflow-hidden shadow-sm border-border">
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <h3 className="font-semibold text-foreground">
              {t("page.stockOpname.detail.itemsTitle", { count: items.length })}
            </h3>
          </div>
          <HorizontalScrollArea>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.no")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.kodeBarang")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.namaBarang")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.satuan")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.stokAwal")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.barangMasuk")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.barangKeluar")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.persdAkhir")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.stockFisik")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.selisih")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.status")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t("page.stockOpname.table.keterangan")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                      {t("page.stockOpname.detail.noItems")}
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const selisih =
                      item.selisihJumlah ?? item.stokFisikJumlah - item.stokAkhirJumlah;
                    return (
                      <tr key={item.id || index} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-primary">
                          {item.kodeBarang}
                        </td>
                        <td className="px-4 py-3 text-foreground">{item.namaBarang}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.satuan || "-"}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {item.stokAwalJumlah ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {item.barangMasukJumlah ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {item.barangKeluarJumlah ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                          {item.stokAkhirJumlah ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {item.stokFisikJumlah ?? "-"}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${
                            selisih > 0
                              ? "text-green-600"
                              : selisih < 0
                                ? "text-red-600"
                                : "text-foreground"
                          }`}>
                          {selisih > 0 ? `+${selisih}` : selisih}
                        </td>
                        <td className="px-4 py-3">
                          {item.notes === "menipis" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {t("page.stockOpname.status.menipis")}
                            </span>
                          ) : item.notes === "kurang" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {t("page.stockOpname.status.kurang")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {t("page.stockOpname.status.sesuai")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">
                          {item.keterangan || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </HorizontalScrollArea>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <Button variant="danger" onClick={() => navigate("/stock-opname")}>
            {t("common.back")}
          </Button>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                variant="success"
                onClick={() => navigate(`/add-stock-opname?id=${opname.id}`)}>
                {t("common.edit")}
              </Button>
            </div>
          )}
        </div>
      </div>
      {printSpec && (
        <div className="hidden print:block print-doc">
          <FormalDocument spec={printSpec} />
        </div>
      )}
    </div>
  );
};

export default DetailStockOpname;

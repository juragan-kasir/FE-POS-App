import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { getBomById } from "@/services/bom";
import RecipeHppSummary from "@/components/organism/RecipeHppSummary";
import AbortController from "@/components/organism/abort-controller";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const DetailBom = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(["bom-detail", id], () => getBomById(id), {
    enabled: !!id
  });
  const bom = data?.data;

  if (isError) return <AbortController refetch={refetch} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.bom"), href: "/bom", i18nKey: "breadcrumb.bom" },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : bom?.name || t("page.bom.detail.title")}
        description={bom?.name || `${t("page.bom.detail.bomPrefix")}#${bom?.id}`}
        backLink="/bom"
        dynamicInfo={false}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <Skeleton className="h-5 w-36" />
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </Card>
          </div>
        </div>
      ) : !bom ? (
        <div className="p-6">
          <p className="text-muted-foreground">{t("page.bom.detail.notFound")}</p>
          <Button variant="outline" onClick={() => navigate("/bom")} className="mt-4">
            <ArrowLeft size={16} className="mr-1" /> {t("page.bom.detail.back")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h2 className="text-lg font-semibold mb-4">{t("page.bom.detail.bomInfo")}</h2>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      [t("page.bom.detail.name"), bom.name || `BOM #${bom.id}`],
                      [t("page.bom.detail.product"), bom.productData?.nameProduct || "-"],
                      [t("page.bom.detail.sku"), bom.productData?.sku || "-"],
                      [
                        t("page.bom.detail.totalItems"),
                        `${bom.lines?.length || 0} ${t("page.bom.detail.items")}`
                      ],
                      [
                        t("page.bom.detail.yield"),
                        t("page.bom.list.table.yield", {
                          portions: Number(bom.totalQty) > 1 ? bom.totalQty : 1
                        })
                      ],
                      [t("page.bom.detail.notes"), bom.notes || "-"],
                      [
                        t("page.bom.detail.date"),
                        new Date(bom.createdAt).toLocaleDateString(i18n.language)
                      ]
                    ].map(([l, v]) => (
                      <tr key={l} className="border-b border-muted/30">
                        <td className="py-2 pr-4 text-muted-foreground w-40">{l}</td>
                        <td className="py-2 font-medium">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </div>

            <div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <h2 className="text-lg font-semibold mb-4">
                  {t("page.bom.detail.ingredientList")}
                </h2>
                <HorizontalScrollArea>
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2">{t("page.bom.detail.ingredient")}</th>
                        <th className="pb-2 text-right">{t("page.bom.detail.qty")}</th>
                        <th className="pb-2 text-center">{t("page.bom.detail.unit")}</th>
                        <th className="pb-2">{t("page.bom.detail.notes")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.lines?.length > 0 ? (
                        bom.lines.map((line, i) => (
                          <tr key={i} className="border-b border-muted/20">
                            <td className="py-2">{line.ingredientData?.name || "-"}</td>
                            <td className="py-2 text-right font-mono">{line.qty}</td>
                            <td className="py-2 text-center">
                              {line.unit || t("page.bom.detail.pcs")}
                            </td>
                            <td className="py-2">{line.notes || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-muted-foreground">
                            {t("page.bom.detail.noIngredients")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </HorizontalScrollArea>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t("page.bom.detail.summary")}
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                <ClipboardList size={14} /> {bom.lines?.length || 0}{" "}
                {t("page.bom.detail.ingredientCount")}
              </div>
              <RecipeHppSummary costing={bom.costing} className="mt-5" compact />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailBom;

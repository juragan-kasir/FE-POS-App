import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { AlertTriangle, Package, ShoppingBasket, Plus, Zap, Store } from "lucide-react";
import { getLowStockProducts, autoGeneratePOFromLowStock } from "@/services/stock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import AbortController from "@/components/organism/abort-controller";
import { useNavigate } from "react-router-dom";
import { normalizeStoreId, storeIdsEqual } from "@/utils/storeId";
import { toast } from "sonner";
import Modal from "@/components/organism/modal";
import { useLocations } from "@/queries/useLocations";

const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return Number(num).toLocaleString("id-ID");
};

const LowStock = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState(false);

  const { data: locData } = useLocations();

  const { data, isLoading, isError, refetch } = useQuery(
    ["low-stock"],
    () => getLowStockProducts(),
    {}
  );

  const autoGenerateMutation = useMutation(autoGeneratePOFromLowStock, {
    onSuccess: (res) => {
      const data = res?.data;
      toast.success(t("common.success"), {
        description: t("page.lowStock.autoPOSuccess", {
          count: data?.purchaseOrders?.length || 0,
          items: data?.totalItems || 0
        })
      });
      queryClient.invalidateQueries(["low-stock"]);
      setConfirmModal(false);
      navigate("/purchase-order");
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
      setConfirmModal(false);
    }
  });

  const lowStockData = data?.data || {};
  const products = lowStockData.products || [];
  const ingredients = lowStockData.ingredients || [];
  const hasLowStockIngredients = ingredients.length > 0;

  const allLocations = locData?.data || [];

  const locations = useMemo(() => {
    const active = allLocations.filter((l) => l.status === "active");
    if (isSuperAdmin) return active;
    return active.filter((l) => storeIdsEqual(l.id, user?.store));
  }, [allLocations, isSuperAdmin, user?.store]);

  const storeGroups = useMemo(() => {
    const groups = locations.map((loc) => {
      const storeId = Number(normalizeStoreId(loc.id)) || null;
      return {
        storeId,
        storeName: loc.name,
        items: ingredients.filter(
          (i) => i.store != null && i.store !== "" && Number(i.store) === storeId
        )
      };
    });
    const noStoreItems = ingredients.filter(
      (i) => i.store == null || i.store === "" || i.store === 0
    );
    if (noStoreItems.length > 0) {
      groups.push({ storeId: null, storeName: null, items: noStoreItems });
    }
    return groups;
  }, [ingredients, locations]);

  const getStockStatus = (stock, t) => {
    if (stock <= 0)
      return {
        label: t("page.stockOpname.status.habis"),
        cls: "bg-red-100 text-red-700 border-red-200"
      };
    return {
      label: t("page.stockOpname.status.menipis"),
      cls: "bg-orange-100 text-orange-700 border-orange-200"
    };
  };

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
          { label: t("breadcrumb.lowStock"), i18nKey: "breadcrumb.lowStock" }
        ]}
        title={t("page.lowStock.title")}
        description={t("page.lowStock.description")}
      />

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : (
            <div>
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <Package size={24} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{lowStockData.totalProducts || 0}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("page.lowStock.productLowStock")}
                      </p>
                    </div>
                  </Card>
                  <Card className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <ShoppingBasket size={24} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{lowStockData.totalIngredients || 0}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("page.lowStock.ingredientLowStock")}
                      </p>
                    </div>
                  </Card>
                </div>

                {hasLowStockIngredients && (
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={() => setConfirmModal(true)}
                      disabled={autoGenerateMutation.isLoading}
                      className="gap-2">
                      <Zap size={16} />
                      {autoGenerateMutation.isLoading
                        ? t("common.processing")
                        : t("page.lowStock.autoGeneratePO")}
                    </Button>
                  </div>
                )}

                {isLoading ? (
                  <div className="space-y-4 mt-6">
                    <Card className="overflow-hidden">
                      <div className="p-4 border-b border-border bg-muted/30">
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Skeleton className="h-3 w-24" />
                            </TableHead>
                            <TableHead className="text-right">
                              <Skeleton className="h-3 w-20 ml-auto" />
                            </TableHead>
                            <TableHead className="text-right">
                              <Skeleton className="h-3 w-16 ml-auto" />
                            </TableHead>
                            <TableHead>
                              <Skeleton className="h-3 w-12" />
                            </TableHead>
                            <TableHead>
                              <Skeleton className="h-3 w-14" />
                            </TableHead>
                            <TableHead>
                              <Skeleton className="h-3 w-14" />
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...Array(4)].map((_, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Skeleton className="h-4 w-36" />
                              </TableCell>
                              <TableCell className="text-right">
                                <Skeleton className="h-4 w-12 ml-auto" />
                              </TableCell>
                              <TableCell className="text-right">
                                <Skeleton className="h-4 w-12 ml-auto" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-10" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-14" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-20 rounded-full" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                ) : products.length === 0 && storeGroups.length === 0 ? (
                  <Card className="p-12 text-center text-muted-foreground mt-6">
                    <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">{t("page.lowStock.empty")}</p>
                    <p className="text-sm mt-1">{t("page.lowStock.emptyDetail")}</p>
                  </Card>
                ) : (
                  <>
                    {products.length > 0 && (
                      <Card className="overflow-hidden mt-6">
                        <div className="p-4 border-b border-border bg-muted/30">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Package size={16} className="text-destructive" />
                            {t("page.lowStock.product")} ({products.length})
                          </h3>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("page.lowStock.table.productName")}</TableHead>
                              <TableHead className="text-right">
                                {t("page.lowStock.table.currentStock")}
                              </TableHead>
                              <TableHead className="text-right">
                                {t("page.lowStock.table.minStock")}
                              </TableHead>
                              <TableHead>{t("page.lowStock.table.unit")}</TableHead>
                              <TableHead>{t("page.lowStock.table.store")}</TableHead>
                              <TableHead>{t("common.status")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((p) => {
                              const status = getStockStatus(p.stock, t);
                              return (
                                <TableRow key={p.id}>
                                  <TableCell className="font-medium">{p.nameProduct}</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatNumber(p.stock)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {formatNumber(p.minStock)}
                                  </TableCell>
                                  <TableCell>{p.unit || "pcs"}</TableCell>
                                  <TableCell>
                                    <span className="text-xs text-muted-foreground">
                                      {p.stores?.length ? p.stores.join(", ") : "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.cls}`}>
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${p.stock <= 0 ? "bg-red-500" : "bg-orange-500"}`}
                                      />
                                      {status.label}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Card>
                    )}

                    {storeGroups.length > 0 &&
                      storeGroups.map((group) => (
                        <Card key={group.storeId ?? "no-store"} className="overflow-hidden mt-6">
                          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <ShoppingBasket size={16} className="text-orange-500" />
                              <h3 className="font-semibold text-sm">
                                {t("page.lowStock.ingredient")} ({group.items.length})
                              </h3>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                <Store size={12} />
                                {group.storeName || t("page.lowStock.noStore")}
                              </span>
                            </div>
                            {group.items.length > 0 && (
                              <Button
                                size="sm"
                                variant="success"
                                className="gap-1.5"
                                onClick={() => {
                                  const names = group.items
                                    .map((i) => encodeURIComponent(i.name))
                                    .join(",");
                                  const storeParam = group.storeId ? `&store=${group.storeId}` : "";
                                  navigate(`/add-purchase-order?ingredients=${names}${storeParam}`);
                                }}>
                                <Plus size={14} />
                                {t("page.lowStock.buatPO")}
                              </Button>
                            )}
                          </div>
                          {group.items.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("page.lowStock.table.ingredientName")}</TableHead>
                                  <TableHead className="text-right">
                                    {t("page.lowStock.table.currentStock")}
                                  </TableHead>
                                  <TableHead className="text-right">
                                    {t("page.lowStock.table.minStock")}
                                  </TableHead>
                                  <TableHead>{t("page.lowStock.table.unit")}</TableHead>
                                  <TableHead>{t("page.lowStock.table.store")}</TableHead>
                                  <TableHead>{t("common.status")}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.items.map((i) => {
                                  const status = getStockStatus(i.stock, t);
                                  return (
                                    <TableRow key={i.id}>
                                      <TableCell className="font-medium">{i.name}</TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {formatNumber(i.stock)}
                                      </TableCell>
                                      <TableCell className="text-right text-muted-foreground">
                                        {formatNumber(i.minStock)}
                                      </TableCell>
                                      <TableCell>{i.unit || "pcs"}</TableCell>
                                      <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                          {i.storeData?.name || "-"}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <span
                                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.cls}`}>
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${i.stock <= 0 ? "bg-red-500" : "bg-orange-500"}`}
                                          />
                                          {status.label}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                              <Store size={14} />
                              {t("page.lowStock.emptyStore", {
                                storeName: group.storeName || t("page.lowStock.noStore")
                              })}
                            </div>
                          )}
                        </Card>
                      ))}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={confirmModal}
        onOpenChange={setConfirmModal}
        type="confirm"
        title={t("page.lowStock.autoPOConfirmTitle")}
        description={t("page.lowStock.autoPOConfirmDesc")}
        confirmText={t("common.yes")}
        cancelText={t("common.cancel")}
        loading={autoGenerateMutation.isLoading}
        onConfirm={() => autoGenerateMutation.mutate()}
      />
    </div>
  );
};

export default LowStock;

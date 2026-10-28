import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { Package, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";
import {
  getForecasts,
  runForecast,
  getDeadStock,
  getExpiringSoon,
  getValuation,
  postWriteOffExpired
} from "@/services/inventory";
import { formatCurrency, formatNumber } from "@/utils/reportUtils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import NoStore from "@/components/ui/NoStore";
import AbortController from "@/components/organism/abort-controller";
import Modal from "@/components/organism/modal";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";

const StockForecast = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const queryClient = useQueryClient();
  const [store, setStore] = useState("");
  const [activeTab, setActiveTab] = useState("forecast");

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locData?.data || [];
  const storeId = store || cookie?.activeStore;

  const {
    data: forecastData,
    isLoading: forecastLoading,
    isError: forecastIsError,
    refetch: forecastRefetch
  } = useQuery(["stock-forecast", storeId], () => getForecasts({ store: storeId }), {
    enabled: !!storeId
  });

  const {
    data: deadStockData,
    isLoading: deadStockLoading,
    isError: deadStockIsError,
    refetch: deadStockRefetch
  } = useQuery(["dead-stock", storeId], () => getDeadStock({ store: storeId }), {
    enabled: !!storeId
  });

  const {
    data: expiringData,
    isLoading: expiringLoading,
    isError: expiringIsError,
    refetch: expiringRefetch
  } = useQuery(["expiring-soon", storeId], () => getExpiringSoon({ store: storeId }), {
    enabled: !!storeId
  });

  const {
    data: valuationData,
    isLoading: valuationLoading,
    isError: valuationIsError,
    refetch: valuationRefetch
  } = useQuery(["inventory-valuation", storeId], () => getValuation({ store: storeId }), {
    enabled: !!storeId
  });

  const runForecastMutation = useMutation({
    mutationFn: (payload) => runForecast(payload),
    onSuccess: () => {
      toast.success("Forecast berhasil dijalankan");
      queryClient.invalidateQueries(["stock-forecast"]);
    },
    onError: (err) => {
      toast.error(err?.message || "Gagal menjalankan forecast");
    }
  });

  const handleRunForecast = () => {
    runForecastMutation.mutate({ store: storeId, productId: undefined });
  };

  const [writeoffModal, setWriteoffModal] = useState(false);

  const writeOffMutation = useMutation({
    mutationFn: (payload) => postWriteOffExpired(payload),
    onSuccess: (res) => {
      toast.success("Write-off selesai", {
        description: `${res.total || 0} unit dari batch kedaluwarsa dihapus`
      });
      queryClient.invalidateQueries(["expiring-soon"]);
      queryClient.invalidateQueries(["inventory-valuation"]);
      queryClient.invalidateQueries(["stock-forecast"]);
      queryClient.invalidateQueries(["dead-stock"]);
      setWriteoffModal(false);
    },
    onError: (err) => {
      toast.error("Write-off gagal", {
        description: err?.message || err?.response?.data?.message
      });
    }
  });

  const handleWriteOff = () => {
    writeOffMutation.mutate({ store: storeId });
  };

  const getStockoutRisk = (daysUntil) => {
    if (daysUntil <= 0) return { variant: "destructive", label: "Habis" };
    if (daysUntil <= 7) return { variant: "secondary", label: "Kritis" };
    if (daysUntil <= 14) return { variant: "outline", label: "Mendekati" };
    return { variant: "default", label: "Aman" };
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("page.stockForecast.title") }
        ]}
        title={t("page.stockForecast.title")}>
        {isSuperAdmin && (
          <Select value={store} onValueChange={setStore}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("page.table.form.storePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={handleRunForecast} disabled={runForecastMutation.isLoading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${runForecastMutation.isLoading ? "animate-spin" : ""}`}
          />
          {t("page.stockForecast.runForecast")}
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="forecast">{t("page.stockForecast.tabs.forecast")}</TabsTrigger>
          <TabsTrigger value="dead-stock">{t("page.stockForecast.tabs.deadStock")}</TabsTrigger>
          <TabsTrigger value="expiring">{t("page.stockForecast.tabs.expiring")}</TabsTrigger>
          <TabsTrigger value="valuation">{t("page.stockForecast.tabs.valuation")}</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast">
          {forecastLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : forecastData?.success ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("page.stockForecast.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                {forecastData.data.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("page.stockForecast.ui.noForecastData")}
                  </p>
                ) : (
                  <HorizontalScrollArea>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("sidebar.produk")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("page.lowStock.table.currentStock")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("page.stockForecast.ui.consumptionRate")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("page.stockForecast.ui.estOut")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("page.stockForecast.ui.risk")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastData.data.map((item) => {
                          const days = item.days_until_stockout ?? 0;
                          const risk = getStockoutRisk(days);
                          return (
                            <tr key={item.id} className="border-b last:border-0">
                              <td className="p-2">{item.productData?.nameProduct || "-"}</td>
                              <td className="p-2">{formatNumber(item.currentStock ?? 0)}</td>
                              <td className="p-2">
                                {formatNumber(item.dailyConsumption ?? 0)}{" "}
                                {t("page.stockForecast.ui.day")}
                              </td>
                              <td className="p-2">{days > 0 ? `${days} hari` : "Sudah habis"}</td>
                              <td className="p-2">
                                <Badge variant={risk.variant}>{risk.label}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                )}
              </CardContent>
            </Card>
          ) : forecastIsError ? (
            <AbortController refetch={forecastRefetch} />
          ) : (
            <NoStore />
          )}
        </TabsContent>

        <TabsContent value="dead-stock">
          {deadStockLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : deadStockData?.success ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("page.stockForecast.tabs.deadStock")}</CardTitle>
              </CardHeader>
              <CardContent>
                {deadStockData.data.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("page.stockForecast.ui.noDeadStock")}
                  </p>
                ) : (
                  <HorizontalScrollArea>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("sidebar.produk")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("breadcrumb.stock")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">HPP</th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("page.goodsReceipt.add.items.summaryTotalValue")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {deadStockData.data.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="p-2">{item.productData?.nameProduct || "-"}</td>
                            <td className="p-2">{formatNumber(item.stock ?? 0)}</td>
                            <td className="p-2">{formatCurrency(item.costPrice ?? 0)}</td>
                            <td className="p-2">
                              {formatCurrency((item.stock || 0) * (item.costPrice || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                )}
              </CardContent>
            </Card>
          ) : deadStockIsError ? (
            <AbortController refetch={deadStockRefetch} />
          ) : (
            <NoStore />
          )}
        </TabsContent>

        <TabsContent value="expiring">
          {expiringLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : expiringData?.success ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("page.bundle.list.expiringSoon")}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWriteoffModal(true)}
                    disabled={writeOffMutation.isLoading}>
                    <AlertTriangle className="w-4 h-4 mr-1.5" />
                    {writeOffMutation.isLoading ? "Memproses..." : "Write-off Kedaluwarsa"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {expiringData.data.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("page.stockForecast.ui.noItemsNearExpiry")}
                  </p>
                ) : (
                  <HorizontalScrollArea>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("sidebar.produk")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("breadcrumb.stock")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("document.expiryDate")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("page.stockForecast.ui.daysLeft")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiringData.data.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="p-2">{item.productData?.nameProduct || "-"}</td>
                            <td className="p-2">{formatNumber(item.stock ?? 0)}</td>
                            <td className="p-2">
                              {item.expiryDate
                                ? new Date(item.expiryDate).toLocaleDateString("id-ID")
                                : "-"}
                            </td>
                            <td className="p-2">{item.daysLeft ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                )}
              </CardContent>
            </Card>
          ) : expiringIsError ? (
            <AbortController refetch={expiringRefetch} />
          ) : (
            <NoStore />
          )}
        </TabsContent>

        <TabsContent value="valuation">
          {valuationLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : valuationData?.success ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("page.stockForecast.ui.inventoryValuation")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <StatCard
                    icon={Package}
                    label={t("page.stockForecast.ui.totalInventoryValue")}
                    value={formatCurrency(valuationData.data.totalValue)}
                  />
                  <StatCard
                    icon={Package}
                    label={t("page.product.stats.total")}
                    value={formatNumber(valuationData.data.totalProducts)}
                  />
                  <StatCard
                    icon={TrendingDown}
                    label={t("page.stockForecast.ui.averageCogs")}
                    value={formatCurrency(valuationData.data.avgCost)}
                  />
                </div>
                {valuationData.data.products && (
                  <HorizontalScrollArea>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("sidebar.produk")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("breadcrumb.stock")}
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">HPP</th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            {t("page.goodsReceipt.add.items.summaryTotalValue")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {valuationData.data.products.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="p-2">{item.nameProduct || "-"}</td>
                            <td className="p-2">{formatNumber(item.stock ?? 0)}</td>
                            <td className="p-2">{formatCurrency(item.costPrice ?? 0)}</td>
                            <td className="p-2">
                              {formatCurrency((item.stock || 0) * (item.costPrice || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                )}
              </CardContent>
            </Card>
          ) : valuationIsError ? (
            <AbortController refetch={valuationRefetch} />
          ) : (
            <NoStore />
          )}
        </TabsContent>
      </Tabs>

      <Modal
        type="confirm"
        open={writeoffModal}
        onOpenChange={setWriteoffModal}
        title={t("page.stockForecast.ui.writeOffExpiredBatches")}
        description={t("page.stockForecast.ui.everyBatchPastItsExpiry")}
        confirmText="Ya, Write-off"
        onConfirm={handleWriteOff}
        loading={writeOffMutation.isLoading}
      />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default StockForecast;

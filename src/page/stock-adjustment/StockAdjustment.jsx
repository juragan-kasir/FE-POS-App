import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Search, Package, Info } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { adjustStock } from "@/services/stock";
import { getAllProduct } from "@/services/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import NoStore from "@/components/ui/NoStore";
import StoreFilter from "@/components/ui/StoreFilter";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import { useSingleStore } from "@/hooks/useSingleStore";

const StockAdjustment = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const store = cookie?.store;
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const [productOpen, setProductOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const adjustmentSchema = z.object({
    store: z
      .string()
      .min(1, t("page.stockAdjustment.validation.storeRequired"))
      .refine((s) => s && s !== "all", {
        message: t("page.stockAdjustment.validation.storeRequired")
      }),
    product: z
      .object({
        id: z.any(),
        nameProduct: z.string(),
        stock: z.any().optional()
      })
      .nullable()
      .refine((p) => !!p, { message: t("page.stockAdjustment.validation.productRequired") }),
    sign: z.string().min(1),
    value: z
      .string()
      .min(1, t("page.stockAdjustment.validation.qtyRequired"))
      .refine((v) => {
        const n = parseInt(v, 10);
        return !isNaN(n) && n > 0;
      }, t("page.stockAdjustment.validation.qtyRequired")),
    reason: z.string().optional()
  });

  const form = useForm({
    resolver: zodResolver(adjustmentSchema),
    mode: "onChange",
    defaultValues: {
      store: isSuperAdmin ? "all" : store || "",
      product: null,
      sign: "+",
      value: "",
      reason: ""
    }
  });

  const {
    control,
    formState: { errors },
    handleSubmit,
    watch,
    setValue
  } = form;

  const selectedStore = watch("store");
  const queryStore = isSuperAdmin
    ? selectedStore && selectedStore !== "all"
      ? selectedStore
      : ""
    : store;

  // One store: preselect it (the store filter is hidden then, so "all" would
  // leave the product list empty and Save disabled with nothing to pick).
  const singleStore = useSingleStore();
  useEffect(() => {
    if (singleStore && !queryStore) setValue("store", String(singleStore.id));
  }, [singleStore, queryStore]);

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["products-adjustment", queryStore],
    () => getAllProduct({ location: queryStore }),
    { enabled: !!queryStore }
  );
  const products = productsData?.data || [];

  const onSubmit = async (data) => {
    const val = parseInt(data.value, 10);
    setSubmitting(true);
    try {
      await adjustStock({
        productId: data.product.id,
        sign: data.sign,
        value: val,
        reason: data.reason,
        storeId: isSuperAdmin ? data.store : undefined
      });
      toast.success(t("page.stockAdjustment.toast.success"));
      queryClient.invalidateQueries(["products-adjustment"]);
      setValue("product", null);
      setValue("sign", "+");
      setValue("value", "");
      setValue("reason", "");
      form.trigger();
    } catch (err) {
      toast.error(err.message || t("page.stockAdjustment.toast.error"));
    } finally {
      setSubmitting(false);
    }
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
          {
            label: t("page.stockAdjustment.title"),
            i18nKey: "page.stockAdjustment.title"
          }
        ]}
        title={t("page.stockAdjustment.title")}
        description={t("page.stockAdjustment.description")}>
        <UserGuide guideKey="adjust-stock" />
      </PageHeader>
      <LoadErrorBanner />

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <div className="space-y-6">
          {productsLoading ? (
            <Loading />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Card className="p-6 shadow-sm border-muted space-y-5">
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label>
                      {t("page.stockAdjustment.form.store")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      control={control}
                      name="store"
                      render={({ field }) => (
                        <StoreFilter
                          locations={locData?.data || []}
                          value={field.value}
                          onChange={field.onChange}
                          isSuperAdmin={isSuperAdmin}
                          t={t}
                        />
                      )}
                    />
                    {errors.store && (
                      <p className="text-xs text-destructive">{errors.store.message}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>
                    {t("page.stockAdjustment.form.product")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="product"
                    render={({ field }) => (
                      <Popover open={productOpen} onOpenChange={setProductOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-9">
                            {field.value
                              ? `${field.value.nameProduct} (${t("page.stockAdjustment.form.stockAvailable")}: ${field.value.stock || 0})`
                              : t("page.stockAdjustment.form.productPlaceholder")}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput
                              placeholder={t("page.stockAdjustment.form.productPlaceholder")}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {t("page.stockAdjustment.form.productPlaceholder")}
                              </CommandEmpty>
                              {products.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.id}-${p.nameProduct}`}
                                  onSelect={() => {
                                    field.onChange(p);
                                    setProductOpen(false);
                                  }}>
                                  <Package className="mr-2 h-4 w-4 shrink-0" />
                                  <span className="flex-1">{p.nameProduct}</span>
                                  <span className="text-muted-foreground text-sm">
                                    {t("page.stockAdjustment.form.stockAvailable")}: {p.stock || 0}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.product && (
                    <p className="text-xs text-destructive">{errors.product.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock-adjustment-qty">
                    {t("page.stockAdjustment.form.qty")} <span className="text-destructive">*</span>
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      ({t("page.stockAdjustment.form.qtyHint")})
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Controller
                      control={control}
                      name="sign"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-14 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="w-14 max-w-14">
                            <SelectItem value="+">+</SelectItem>
                            <SelectItem value="-">-</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Input
                      id="stock-adjustment-qty"
                      type="text"
                      inputMode="numeric"
                      placeholder={t("page.stockAdjustment.form.qtyPlaceholder")}
                      {...form.register("value")}
                      onChange={(e) => setValue("value", e.target.value.replace(/\D/g, ""))}
                      className="h-9 flex-1"
                    />
                  </div>
                  {errors.value && (
                    <p className="text-xs text-destructive">{errors.value.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock-adjustment-reason">
                    {t("page.stockAdjustment.form.reason")}
                  </Label>
                  <Textarea
                    id="stock-adjustment-reason"
                    placeholder={t("page.stockAdjustment.form.reasonPlaceholder")}
                    {...form.register("reason")}
                    rows={3}
                    maxLength={FIELD_LIMITS.DESCRIPTION}
                  />
                </div>

                <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-xs text-blue-700 dark:text-blue-300 flex flex-col gap-2 transition-colors">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>{t("page.stockAdjustment.tips.direction")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>{t("page.stockAdjustment.tips.effect")}</span>
                  </div>
                </div>
              </Card>
              <Card className="p-6 shadow-sm border-muted">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto justify-center">
                    {t("page.stockAdjustment.form.cancel")}
                  </Button>
                  {isSuperAdmin && !queryStore && (
                    <p className="text-sm text-muted-foreground sm:mr-auto self-center">
                      {t("page.stockAdjustment.form.pickStoreHint")}
                    </p>
                  )}
                  <Button
                    variant="success"
                    type="submit"
                    disabled={submitting || (isSuperAdmin && !queryStore)}
                    disabledReason={
                      submitting ? undefined : t("common.disabledReason.selectStoreFirst")
                    }
                    className="w-full sm:w-auto justify-center">
                    {submitting ? <Loading /> : <Save className="mr-2 h-4 w-4" />}
                    {t("page.stockAdjustment.form.submit")}
                  </Button>
                </div>
              </Card>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default StockAdjustment;

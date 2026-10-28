import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCookies } from "react-cookie";
import { Save, X, Plus, Trash2, Package, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { transferStock } from "@/services/stock-transfer";
import { getAllProduct } from "@/services/product";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";

const AddStockTransfer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;

  const isSuperAdmin = user?.roleType === "super_admin";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cancelModal, setCancelModal] = useState(false);

  const transferSchema = z
    .object({
      fromStore: z.string().min(1, t("page.stockTransfer.add.validation.fromStoreRequired")),
      toStore: z.string().min(1, t("page.stockTransfer.add.validation.toStoreRequired")),
      transferredBy: z.string().optional(),
      reason: z.string().optional(),
      expectedArrival: z.date().nullable().optional(),
      notes: z.string().optional(),
      items: z
        .array(
          z.object({
            productId: z.string().min(1, t("page.stockTransfer.add.validation.productRequired")),
            qty: z.string().refine((v) => {
              const n = parseInt(v, 10);
              return !isNaN(n) && n > 0;
            }, t("page.stockTransfer.add.validation.qtyRequired")),
            unit: z.string().min(1),
            notes: z.string().optional()
          })
        )
        .min(1, t("page.stockTransfer.add.validation.minOneProduct"))
    })
    .superRefine((data, ctx) => {
      if (data.fromStore && data.toStore && data.fromStore === data.toStore) {
        ctx.addIssue({
          code: "custom",
          path: ["toStore"],
          message: t("page.stockTransfer.add.validation.differentStore")
        });
      }
    });

  const form = useForm({
    resolver: zodResolver(transferSchema),
    mode: "onChange",
    defaultValues: {
      fromStore: isSuperAdmin ? "" : user?.store || "",
      toStore: "",
      transferredBy: user?.name || "",
      reason: "",
      expectedArrival: null,
      notes: "",
      items: [{ productId: "", qty: "", unit: "pcs", notes: "" }]
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/stock-transfer",
    () => setCancelModal(true),
    form
  );

  const {
    control,
    formState: { errors },
    handleSubmit,
    setValue,
    watch
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch("items");
  const fromStore = watch("fromStore");

  const { data: locData } = useLocations();
  const locations = locData?.data || locData?.locations || locData || [];
  const storeOptions = locations.map((l) => ({ value: String(l.id), label: l.name }));

  const { data: prodData } = useQuery(
    ["products-for-transfer", fromStore],
    () => getAllProduct({ location: fromStore, status: "active" }),
    { enabled: !!fromStore }
  );
  const products = prodData?.data || [];

  // The product list is scoped to `fromStore` (query key above), so a
  // product already picked from the previous store no longer exists in the
  // new one's options — without this, the field silently kept holding an
  // id from the wrong store's inventory instead of forcing a fresh pick.
  useEffect(() => {
    fields.forEach((_, idx) => setValue(`items.${idx}.productId`, ""));
  }, [fromStore]);

  const addItem = () => append({ productId: "", qty: "", unit: "pcs", notes: "" });
  const removeItem = (idx) => {
    if (fields.length > 1) remove(idx);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await transferStock({
        fromStore: parseInt(data.fromStore),
        toStore: parseInt(data.toStore),
        notes: data.notes,
        reason: data.reason,
        expectedArrival: data.expectedArrival || null,
        transferredBy: data.transferredBy,
        items: data.items
          .filter((it) => it.productId && parseInt(it.qty) > 0)
          .map((it) => ({
            productId: parseInt(it.productId),
            qty: parseInt(it.qty),
            unit: it.unit,
            notes: it.notes
          }))
      });
      toast.success(t("page.stockTransfer.add.toast.success"), {
        description: t("page.stockTransfer.add.toast.successDesc")
      });
      queryClient.invalidateQueries(["stock-transfers"]);
      navigate("/stock-transfer");
    } catch (err) {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("page.stockTransfer.add.breadcrumb.dashboard"),
              href: "/dashboard-super-admin",
              i18nKey: "page.stockTransfer.add.breadcrumb.dashboard"
            },
            {
              label: t("page.stockTransfer.add.breadcrumb.list"),
              href: "/stock-transfer",
              i18nKey: "page.stockTransfer.add.breadcrumb.list"
            },
            { label: t("page.stockTransfer.add.breadcrumb.add") }
          ]}
          title={t("page.stockTransfer.add.title")}
          description={t("page.stockTransfer.add.subtitle")}
          onBack={requestLeave}
          dynamicInfo={false}>
          <UserGuide guideKey="add-stock-transfer" />
        </PageHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card p-6 rounded-xl border border-border space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>
                  {t("page.stockTransfer.add.form.fromStore")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="fromStore"
                  render={({ field }) => (
                    <Combobox
                      options={storeOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("page.stockTransfer.add.form.selectStore")}
                      searchPlaceholder={t("common.search")}
                    />
                  )}
                />
                {errors.fromStore && (
                  <p className="text-xs text-destructive">{errors.fromStore.message}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>
                {t("page.stockTransfer.add.form.toStore")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="toStore"
                render={({ field }) => (
                  <Combobox
                    options={storeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("page.stockTransfer.add.form.selectStore")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
              {errors.toStore && (
                <p className="text-xs text-destructive">{errors.toStore.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("page.stockTransfer.add.form.transferredBy")}</Label>
            <Input
              {...form.register("transferredBy")}
              placeholder={t("page.stockTransfer.add.form.transferredByPlaceholder")}
              maxLength={FIELD_LIMITS.PERSON_NAME}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("page.stockTransfer.add.form.reason")}</Label>
              <Input
                {...form.register("reason")}
                placeholder={t("page.stockTransfer.add.form.reasonPlaceholder")}
                maxLength={FIELD_LIMITS.SHORT_NOTE}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("page.stockTransfer.add.form.expectedArrival")}</Label>
              <Controller
                control={control}
                name="expectedArrival"
                render={({ field }) => <DatePicker date={field.value} setDate={field.onChange} />}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {t("page.stockTransfer.add.form.items")}
            </Label>
            <HorizontalScrollArea className="border rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      {t("page.stockTransfer.add.table.product")}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      {t("page.stockTransfer.add.table.qty")}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      {t("page.stockTransfer.add.table.unit")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      {t("page.stockTransfer.add.table.notes")}
                    </th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const item = (watchedItems || []).at(idx) || {};
                    const selectedProduct = products.find(
                      (p) => String(p.id) === String(item.productId)
                    );
                    const error = (errors?.items || []).at(idx);
                    return (
                      <tr
                        key={field.id}
                        className="border-b border-muted/10 last:border-b-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border border-input bg-background text-xs hover:border-primary/50 transition-colors text-left">
                                  <Package
                                    size={14}
                                    className="shrink-0 text-muted-foreground/40"
                                  />
                                  {selectedProduct ? (
                                    <span className="flex-1 truncate font-medium">
                                      {selectedProduct.nameProduct}
                                    </span>
                                  ) : (
                                    <span className="flex-1 text-muted-foreground">
                                      {t("page.stockTransfer.add.table.selectProduct")}
                                    </span>
                                  )}
                                  <Search size={12} className="shrink-0 text-muted-foreground/30" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" side="bottom" className="p-0 w-[300px]">
                                <Command>
                                  <CommandInput placeholder={t("common.search")} />
                                  <CommandList>
                                    <CommandEmpty>
                                      {t("page.stockTransfer.add.table.productNotFound")}
                                    </CommandEmpty>
                                    {products.map((p) => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.nameProduct}
                                        onSelect={() =>
                                          setValue(`items.${idx}.productId`, String(p.id), {
                                            shouldValidate: true
                                          })
                                        }>
                                        <div className="flex items-center justify-between w-full gap-3">
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate">
                                              {p.nameProduct}
                                            </span>
                                            {p.barcode && (
                                              <span className="text-xs text-muted-foreground truncate">
                                                {p.barcode}
                                              </span>
                                            )}
                                          </div>
                                          <span className="shrink-0 text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                            {t("page.stockTransfer.add.table.stock")}:{" "}
                                            {p.stock ?? 0}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            {selectedProduct && (
                              <span className="shrink-0 text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded-md border border-border/50">
                                {t("page.stockTransfer.add.table.stock")}:{" "}
                                {selectedProduct.stock ?? 0}
                              </span>
                            )}
                          </div>
                          {error?.productId && (
                            <p className="text-xs text-destructive mt-1">
                              {error.productId.message}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 w-[100px]">
                          <Input
                            type="number"
                            min="1"
                            max={selectedProduct?.stock ?? 0}
                            {...form.register(`items.${idx}.qty`)}
                            onChange={(e) => {
                              const val = e.target.value;
                              const max = selectedProduct?.stock ?? 0;
                              if (val && parseInt(val) > max) {
                                setValue(`items.${idx}.qty`, String(max), { shouldValidate: true });
                              } else {
                                setValue(`items.${idx}.qty`, val, { shouldValidate: true });
                              }
                            }}
                            className="h-9 text-xs text-right"
                            placeholder="0"
                          />
                          {error?.qty && (
                            <p className="text-xs text-destructive mt-1">{error.qty.message}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 w-[100px]">
                          <Controller
                            control={control}
                            name={`items.${idx}.unit`}
                            render={({ field: unitField }) => (
                              <Combobox
                                options={[
                                  { value: "pcs", label: "pcs" },
                                  { value: "kg", label: "kg" },
                                  { value: "liter", label: "liter" },
                                  { value: "box", label: "box" }
                                ]}
                                value={unitField.value}
                                onChange={unitField.onChange}
                                placeholder="pcs"
                                searchPlaceholder={t("common.search")}
                              />
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <Input
                            {...form.register(`items.${idx}.notes`)}
                            className="h-9 text-xs"
                            placeholder={t("page.stockTransfer.add.table.notesPlaceholder")}
                          />
                        </td>
                        <td className="px-4 py-3 text-center w-12">
                          <button
                            type="button"
                            disabled={fields.length <= 1}
                            onClick={() => removeItem(idx)}
                            className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 disabled:opacity-20 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </HorizontalScrollArea>
            {errors.items?.root && (
              <p className="text-xs text-destructive">{errors.items.root.message}</p>
            )}
            {errors.items?.message && (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            )}
            <Button type="button" variant="success" size="sm" onClick={addItem} className="gap-1.5">
              <Plus size={14} /> {t("page.stockTransfer.add.table.addItem")}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t("page.stockTransfer.add.form.notes")}</Label>
            <Textarea
              rows={2}
              {...form.register("notes")}
              placeholder={t("page.stockTransfer.add.form.notesPlaceholder")}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="danger"
              onClick={requestLeave}
              className="w-full sm:w-auto justify-center">
              <X size={16} className="mr-1" /> {t("page.stockTransfer.add.cancel")}
            </Button>
            <Button
              variant="success"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto justify-center">
              <Save size={16} className="mr-1" />{" "}
              {isSubmitting ? t("page.stockTransfer.add.saving") : t("page.stockTransfer.add.save")}
            </Button>
          </div>
        </form>
        {isSubmitting && (
          <Loading fullscreen size="lg" label={t("page.stockTransfer.add.saving")} />
        )}
        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={(o) => !o && setCancelModal(false)}
          title={t("modal.cancelTitle")}
          description={t("modal.cancelDescription")}
          confirmText={t("modal.yesCancel")}
          onConfirm={() => {
            setCancelModal(false);
            setTimeout(leave, 150);
          }}
        />
        <Modal
          type="error"
          open={errorModal}
          onOpenChange={setErrorModal}
          title={t("common.error")}
          description={modalMessage}
          onConfirm={() => setErrorModal(false)}
        />
      </div>
    </>
  );
};

export default AddStockTransfer;

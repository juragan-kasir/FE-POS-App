import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X, Plus, Trash2, User } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { format } from "date-fns";
import { addGoodsRequest } from "@/services/goods-request";
import { getAllSupplier } from "@/services/supplier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import { useSingleStore } from "@/hooks/useSingleStore";
import { markSaved } from "@/lib/unsaved-changes-store";

const emptyItem = {
  name: "",
  ingredient: null,
  ingredientName: null,
  product: null,
  productName: null,
  qty: 1,
  unit: "pcs",
  notes: ""
};

const emptyGroup = () => ({ supplier: "", items: [{ ...emptyItem }] });

const unitOptions = [
  { value: "pcs", label: "pcs" },
  { value: "buah", label: "buah" },
  { value: "kg", label: "kg" },
  { value: "gram", label: "gram" },
  { value: "liter", label: "liter" },
  { value: "ml", label: "ml" },
  { value: "meter", label: "meter" },
  { value: "cm", label: "cm" },
  { value: "lusin", label: "lusin" },
  { value: "box", label: "box" },
  { value: "pack", label: "pack" },
  { value: "karton", label: "karton" }
];

const GoodsRequestGroup = ({
  control,
  groupIndex,
  suppliers,
  supplierItemsBySupplier,
  canRemove,
  storeId,
  suppliersLoading,
  watch,
  getValues,
  setValue,
  register,
  onRemove,
  takenSupplierIds,
  t
}) => {
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: `groups.${groupIndex}.items`
  });

  const supplier = watch(`groups.${groupIndex}.supplier`);
  const items = watch(`groups.${groupIndex}.items`) || [];

  const supplierOptions = useMemo(
    () =>
      (suppliers || [])
        .filter((sup) => !takenSupplierIds.has(String(sup.id)))
        .map((sup) => ({
          value: String(sup.id),
          label: sup.name || sup.supplierName || `Supplier #${sup.id}`
        })),
    [suppliers, takenSupplierIds]
  );

  const selectedItemValue = (item) => {
    if (!supplier) return "";
    const list = safeGet(supplierItemsBySupplier, supplier, []);
    const match = list.find(
      (opt) =>
        (item.product && item.product === opt.productId) ||
        (item.ingredientName && item.ingredientName === opt.name) ||
        (item.productName && item.productName === opt.name)
    );
    return match?.value || "";
  };

  const itemOptionsForRow = (iIdx) => {
    if (!supplier) return [];
    const list = safeGet(supplierItemsBySupplier, supplier, []);
    const taken = new Set();
    (items || []).forEach((other, j) => {
      if (j === iIdx) return;
      const val = selectedItemValue(other);
      if (val) taken.add(val);
    });
    return list
      .filter((it) => !taken.has(it.value))
      .map((it) => ({ value: it.value, label: it.name }));
  };

  const pickItemOption = (iIdx, value) => {
    const list = safeGet(supplierItemsBySupplier, supplier, []);
    const opt = list.find((o) => o.value === value);
    const current = getValues(`groups.${groupIndex}.items.${iIdx}`) || {};
    if (!opt) {
      setValue(
        `groups.${groupIndex}.items.${iIdx}`,
        {
          ...current,
          name: "",
          ingredient: null,
          ingredientName: null,
          product: null,
          productName: null
        },
        { shouldValidate: true }
      );
      return;
    }
    if (opt.productId) {
      setValue(
        `groups.${groupIndex}.items.${iIdx}`,
        {
          ...current,
          name: opt.name,
          product: opt.productId,
          productName: opt.name,
          ingredient: null,
          ingredientName: null,
          unit: opt.unit || current.unit
        },
        { shouldValidate: true }
      );
    } else {
      setValue(
        `groups.${groupIndex}.items.${iIdx}`,
        {
          ...current,
          name: opt.name,
          ingredient: null,
          ingredientName: opt.name,
          product: null,
          productName: null,
          unit: opt.unit || current.unit
        },
        { shouldValidate: true }
      );
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b bg-muted/40">
        <Label
          htmlFor={`goods-request-group-${groupIndex}-supplier`}
          className="shrink-0 text-xs text-muted-foreground">
          {t("page.goodsRequest.add.table.supplier")}
        </Label>
        <div className="flex-1 min-w-[220px]">
          <Controller
            control={control}
            name={`groups.${groupIndex}.supplier`}
            render={({ field }) => (
              <Combobox
                id={`goods-request-group-${groupIndex}-supplier`}
                options={supplierOptions}
                value={field.value ? String(field.value) : ""}
                onChange={(val) => {
                  field.onChange(val);
                  replace([{ ...emptyItem }]);
                }}
                placeholder={t("page.goodsRequest.add.placeholder.selectSupplier")}
                searchPlaceholder={t("common.search")}
                emptyMessage={t("page.goodsRequest.add.table.noSupplier")}
                disabled={!storeId || suppliersLoading}
              />
            )}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}>
          <Trash2 size={14} />
        </Button>
      </div>

      <HorizontalScrollArea>
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                {t("page.goodsRequest.add.table.name")}
              </th>
              <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                {t("page.goodsRequest.add.table.qty")}
              </th>
              <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                {t("page.goodsRequest.add.table.unit")}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                {t("page.goodsRequest.add.table.notes")}
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, iIdx) => {
              const item = items.at(iIdx) || {};
              return (
                <tr key={field.id} className="border-b border-muted/20">
                  <td className="px-3 py-2 min-w-[280px]">
                    <Combobox
                      options={itemOptionsForRow(iIdx)}
                      value={selectedItemValue(item)}
                      onChange={(val) => pickItemOption(iIdx, val)}
                      placeholder={t("page.goodsRequest.add.placeholder.selectItem")}
                      searchPlaceholder={t("common.search")}
                      emptyMessage={t("page.goodsRequest.add.table.noItem")}
                      disabled={!supplier}
                    />
                    {item.name && !selectedItemValue(item) && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{item.name}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Controller
                      control={control}
                      name={`groups.${groupIndex}.items.${iIdx}.qty`}
                      render={({ field: qtyField }) => (
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={qtyField.value === 0 ? "" : String(qtyField.value)}
                          onChange={(e) =>
                            qtyField.onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                          }
                          className="h-8 text-xs text-center w-20 mx-auto"
                          placeholder="0"
                        />
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <Controller
                        control={control}
                        name={`groups.${groupIndex}.items.${iIdx}.unit`}
                        render={({ field: unitField }) => (
                          <Combobox
                            options={unitOptions}
                            value={unitField.value}
                            onChange={unitField.onChange}
                            placeholder="pcs"
                            searchPlaceholder={t("common.search")}
                          />
                        )}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      {...register(`groups.${groupIndex}.items.${iIdx}.notes`)}
                      className="h-8 text-xs"
                      placeholder={t("page.goodsRequest.add.placeholder.notes")}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      aria-label={t("common.delete")}
                      type="button"
                      onClick={() => remove(iIdx)}
                      className="text-muted-foreground/40 hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </HorizontalScrollArea>

      <div className="p-3 border-t">
        <Button
          type="button"
          variant="success"
          size="sm"
          onClick={() => append({ ...emptyItem })}
          className="gap-1">
          <Plus size={14} /> {t("page.goodsRequest.add.form.addItem")}
        </Button>
      </div>
    </div>
  );
};

const AddGoodsRequest = () => {
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
  const [confirmModal, setConfirmModal] = useState(false);
  const [changeStoreModal, setChangeStoreModal] = useState(false);
  const [pendingStoreId, setPendingStoreId] = useState("");
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);

  const goodsRequestSchema = z
    .object({
      storeId: z.union([
        z.string().min(1, t("page.goodsRequest.add.toast.storeRequired")),
        z.number()
      ]),
      requestedBy: z.string().optional(),
      requestDate: z.date({ required_error: t("page.goodsRequest.add.toast.neededDateRequired") }),
      neededDate: z.date({ required_error: t("page.goodsRequest.add.toast.neededDateRequired") }),
      notes: z.string().optional(),
      groups: z
        .array(
          z.object({
            supplier: z.string().min(1, t("page.goodsRequest.add.toast.supplierRequired")),
            items: z.array(
              z.object({
                name: z.string().min(1, t("page.goodsRequest.add.toast.itemRequired")),
                qty: z.number().min(1, t("page.goodsRequest.add.toast.itemRequired")),
                unit: z.string().min(1),
                notes: z.string().optional()
              })
            )
          })
        )
        .min(1, t("page.goodsRequest.add.toast.itemRequired"))
    })
    .superRefine((data, ctx) => {
      if (data.requestDate && data.neededDate && data.neededDate < data.requestDate) {
        ctx.addIssue({
          code: "custom",
          path: ["neededDate"],
          message: t("page.goodsRequest.add.toast.neededDateBeforeRequest")
        });
      }
      const validItems = data.groups.flatMap((g) => g.items.filter((it) => it.name && it.qty > 0));
      if (validItems.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["groups"],
          message: t("page.goodsRequest.add.toast.itemRequired")
        });
      }
    });

  const form = useForm({
    resolver: zodResolver(goodsRequestSchema),
    mode: "onChange",
    defaultValues: {
      storeId: isSuperAdmin ? "" : user?.store || "",
      requestedBy: "",
      requestDate: new Date(),
      neededDate: null,
      notes: "",
      groups: [emptyGroup()]
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/goods-request",
    () => setCancelModal(true),
    form
  );

  const {
    control,
    formState: { errors },
    handleSubmit,
    watch,
    getValues,
    setValue,
    trigger
  } = form;

  const {
    fields: groupFields,
    append: appendGroup,
    remove: removeGroup
  } = useFieldArray({
    control,
    name: "groups"
  });

  const storeId = watch("storeId");

  // One store: preselect it instead of asking for a choice with one answer.
  const singleStore = useSingleStore();
  useEffect(() => {
    if (singleStore && !storeId) form.setValue("storeId", String(singleStore.id));
  }, [singleStore, storeId]);
  const allGroups = watch("groups") || [];

  const takenSupplierIdsByGroupIndex = useMemo(() => {
    return allGroups.map((_, gIdx) => {
      const taken = new Set();
      allGroups.forEach((g, otherIdx) => {
        if (otherIdx !== gIdx && g.supplier) {
          taken.add(String(g.supplier));
        }
      });
      return taken;
    });
  }, [allGroups]);

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locData?.data || [];

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery(
    ["suppliers-goods-request", storeId],
    () =>
      getAllSupplier({
        store: storeId,
        limit: 999,
        status: "active",
        includeProducts: true
      }),
    { enabled: !!storeId }
  );
  const suppliers = suppliersData?.data || [];

  const supplierItemsBySupplier = useMemo(() => {
    const map = {};
    for (const sup of suppliers || []) {
      map[sup.id] = (sup.products || []).map((p) => ({
        value: `sp-${p.id}`,
        productId: p.productId || null,
        name: p.name,
        unit: p.unit || "pcs"
      }));
    }
    return map;
  }, [suppliers]);

  const hasFilledItems = useMemo(() => {
    const groups = getValues("groups") || [];
    return groups.some(
      (g) =>
        g.supplier ||
        (g.items || []).some((it) => it.name.trim() !== "" || it.ingredient || it.product)
    );
  }, [getValues, storeId, groupFields]);

  const doSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const validItems = [];
      for (const g of data.groups) {
        for (const it of g.items) {
          if (it.name.trim() && it.qty > 0) validItems.push({ ...it, supplier: g.supplier });
        }
      }
      const created = await addGoodsRequest({
        store: data.storeId,
        requestedBy: data.requestedBy,
        requestDate: data.requestDate ? format(data.requestDate, "yyyy-MM-dd") : null,
        neededDate: data.neededDate ? format(data.neededDate, "yyyy-MM-dd") : null,
        notes: data.notes,
        items: validItems.map((it) => ({
          ingredient: it.ingredient,
          ingredientName: it.ingredientName || null,
          product: it.product,
          productName: it.productName || null,
          supplier: it.supplier || null,
          qty: it.qty,
          unit: it.unit,
          notes: it.notes || null
        }))
      });
      // Saved: the way back to the list must not ask "Batalkan Perubahan?".
      markSaved();
      queryClient.invalidateQueries(["goods-requests"]);
      setCreatedRecordId(createdId(created));
      setSuccessModal(true);
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
              label: t("breadcrumb.dashboard"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.dashboard"
            },
            {
              label: t("breadcrumb.goodsRequest"),
              href: "/goods-request",
              i18nKey: "breadcrumb.goodsRequest"
            },
            { label: t("breadcrumb.add") }
          ]}
          title={t("page.goodsRequest.add.title")}
          description={t("page.goodsRequest.add.description")}
          onBack={requestLeave}
          dynamicInfo={false}>
          <UserGuide guideKey="add-goods-request" />
        </PageHeader>
        <LoadErrorBanner />

        <form
          onSubmit={handleSubmit((data) => doSubmit(data))}
          className="bg-card p-4 sm:p-6 rounded-xl border border-border space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goods-request-store">
                {t("page.goodsRequest.add.form.store")} <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="storeId"
                render={({ field }) => (
                  <Combobox
                    id="goods-request-store"
                    options={[
                      { value: "", label: t("page.goodsRequest.add.form.selectStore") },
                      ...locations.map((loc) => ({ value: loc.id, label: loc.name }))
                    ]}
                    value={field.value}
                    onChange={(val) => {
                      if (val === field.value) return;
                      if (field.value && hasFilledItems) {
                        setPendingStoreId(val);
                        setChangeStoreModal(true);
                        return;
                      }
                      field.onChange(val);
                    }}
                    disabled={!isSuperAdmin}
                    placeholder={t("page.goodsRequest.add.form.selectStore")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
              {errors.storeId && (
                <p className="text-xs text-destructive">{errors.storeId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-goods-request-requested-by">
                {t("page.goodsRequest.add.form.requestedBy")}
              </Label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="add-goods-request-requested-by"
                  {...form.register("requestedBy")}
                  placeholder={t("page.goodsRequest.add.placeholder.requestedBy")}
                  className="pl-9"
                  maxLength={FIELD_LIMITS.PERSON_NAME}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goods-request-date">
                {t("page.goodsRequest.add.form.requestDate")}
              </Label>
              <Controller
                control={control}
                name="requestDate"
                render={({ field }) => (
                  <DatePicker
                    id="goods-request-date"
                    date={field.value}
                    setDate={field.onChange}
                    placeholder={t("page.goodsRequest.add.form.requestDate")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goods-request-needed-date">
                {t("page.goodsRequest.add.form.neededDate")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="neededDate"
                render={({ field }) => (
                  <DatePicker
                    id="goods-request-needed-date"
                    date={field.value}
                    setDate={field.onChange}
                    placeholder={t("page.goodsRequest.add.placeholder.neededDate")}
                    minDate={watch("requestDate") || undefined}
                  />
                )}
              />
              {errors.neededDate && (
                <p className="text-xs text-destructive">{errors.neededDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">
              {t("page.goodsRequest.add.form.items")} <span className="text-destructive">*</span>
            </p>

            {groupFields.map((field, gIdx) => (
              <GoodsRequestGroup
                key={field.id}
                control={control}
                groupIndex={gIdx}
                suppliers={suppliers}
                supplierItemsBySupplier={supplierItemsBySupplier}
                canRemove={groupFields.length > 1}
                storeId={storeId}
                suppliersLoading={suppliersLoading}
                watch={watch}
                getValues={getValues}
                setValue={setValue}
                register={form.register}
                onRemove={() => removeGroup(gIdx)}
                takenSupplierIds={takenSupplierIdsByGroupIndex.at(gIdx) || new Set()}
                t={t}
              />
            ))}

            {errors.groups?.message && (
              <p className="text-xs text-destructive">{errors.groups.message}</p>
            )}

            <Button
              type="button"
              variant="success"
              size="sm"
              onClick={() => appendGroup(emptyGroup())}
              disabled={!storeId || suppliersLoading}
              disabledReason={
                suppliersLoading
                  ? t("common.disabledReason.loading")
                  : t("common.disabledReason.selectStoreFirst")
              }
              className="gap-1">
              <Plus size={14} /> {t("page.goodsRequest.add.form.addSupplier")}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-goods-request-notes-label">
              {t("page.goodsRequest.add.form.notesLabel")}
            </Label>
            <Textarea
              id="add-goods-request-notes-label"
              rows={2}
              {...form.register("notes")}
              placeholder={t("page.goodsRequest.add.placeholder.notes")}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="danger"
              className="w-full sm:w-auto justify-center"
              onClick={requestLeave}>
              <X size={16} className="mr-1" /> {t("page.goodsRequest.add.form.cancel")}
            </Button>
            <Button
              variant="success"
              type="button"
              className="w-full sm:w-auto justify-center"
              disabled={isSubmitting}
              onClick={async () => {
                const ok = await trigger();
                if (!ok) return;
                setConfirmModal(true);
              }}>
              <Save size={16} className="mr-1" />{" "}
              {isSubmitting
                ? t("page.goodsRequest.add.form.saving")
                : t("page.goodsRequest.add.form.save")}
            </Button>
          </div>
        </form>

        {isSubmitting && (
          <Loading fullscreen size="lg" label={t("page.goodsRequest.add.form.saving")} />
        )}

        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={(o) => !o && setCancelModal(false)}
          title={t("page.goodsRequest.add.modal.title")}
          description={t("page.goodsRequest.add.modal.description")}
          confirmText={t("page.goodsRequest.add.modal.confirm")}
          onConfirm={() => {
            setCancelModal(false);
            setTimeout(leave, 150);
          }}
        />
        <Modal
          type="confirm"
          open={confirmModal}
          onOpenChange={setConfirmModal}
          title={t("page.goodsRequest.add.confirmModal.title")}
          description={t("page.goodsRequest.add.confirmModal.description")}
          confirmText={t("page.goodsRequest.add.confirmModal.confirm")}
          onConfirm={() => {
            setConfirmModal(false);
            doSubmit(getValues());
          }}
        />
        <Modal
          type="confirm"
          open={changeStoreModal}
          onOpenChange={(o) => !o && setChangeStoreModal(false)}
          title={t("page.goodsRequest.add.changeStoreModal.title")}
          description={t("page.goodsRequest.add.changeStoreModal.description")}
          confirmText={t("page.goodsRequest.add.changeStoreModal.confirm")}
          onConfirm={() => {
            setValue("groups", [emptyGroup()]);
            setValue("storeId", pendingStoreId);
            setChangeStoreModal(false);
            setPendingStoreId("");
          }}
        />
        <Modal
          type="success"
          open={successModal}
          secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
          onSecondary={() => navigate(`/goods-request/detail?id=${createdRecordId}`)}
          onOpenChange={setSuccessModal}
          title={t("page.goodsRequest.add.successModal.title")}
          description={t("page.goodsRequest.add.successModal.description")}
          onConfirm={() => setTimeout(() => navigate("/goods-request"), 150)}
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

export default AddGoodsRequest;

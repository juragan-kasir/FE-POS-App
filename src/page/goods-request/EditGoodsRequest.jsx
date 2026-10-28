import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { Save, X, Plus, Trash2, ArrowLeft, User } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { getGoodsRequestById, editGoodsRequest } from "@/services/goods-request";
import { getAllSupplier } from "@/services/supplier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";

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

const emptyGroup = () => ({ supplier: null, items: [{ ...emptyItem }] });

const EditGoodsRequest = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [cookie] = useCookies();
  const user = cookie?.user;

  const [requestedBy, setRequestedBy] = useState("");
  const [requestDate, setRequestDate] = useState(null);
  const [neededDate, setNeededDate] = useState(null);
  const [notes, setNotes] = useState("");
  const [groups, setGroups] = useState([emptyGroup()]);
  const [loaded, setLoaded] = useState(false);
  const isSubmitting = false;
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  const { request: requestLeave, leave } = useFormExit("/goods-request", () =>
    setCancelModal(true)
  );
  const [confirmModal, setConfirmModal] = useState(false);

  const { data, isLoading } = useQuery(["goods-request-edit", id], () => getGoodsRequestById(id), {
    enabled: !!id
  });
  const request = data?.data;

  const groupItems = (itemList) => {
    const order = [];
    const map = new Map();
    for (const it of itemList || []) {
      const key = it.supplier ? String(it.supplier) : "none";
      if (!map.has(key)) {
        map.set(key, { supplier: it.supplier || null, items: [] });
        order.push(key);
      }
      map.get(key).items.push({
        name: it.ingredientName || it.productName || "",
        ingredient: it.ingredient || null,
        ingredientName: it.ingredientName || null,
        product: it.product || null,
        productName: it.productName || null,
        qty: it.qty || 0,
        unit: it.unit || "pcs",
        notes: it.notes || ""
      });
    }
    return order.map((k) => map.get(k));
  };

  useEffect(() => {
    if (request && !loaded) {
      setRequestedBy(request.requestedBy || "");
      setRequestDate(request.requestDate ? parseISO(request.requestDate) : new Date());
      setNeededDate(request.neededDate ? parseISO(request.neededDate) : null);
      setNotes(request.notes || "");
      setGroups(groupItems(request.items));
      setLoaded(true);
    }
  }, [request, loaded]);

  const storeId = request?.store || user?.store || "";

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery(
    ["suppliers-goods-request-edit", storeId],
    () =>
      getAllSupplier({
        store: storeId,
        limit: 999,
        status: "active",
        includeProducts: true
      }),
    { enabled: !!storeId && loaded }
  );
  const suppliers = suppliersData?.data || [];

  const supplierOptionsForGroup = (gIdx) => {
    const taken = new Set();
    groups.forEach((g, otherIdx) => {
      if (otherIdx !== gIdx && g.supplier) {
        taken.add(String(g.supplier));
      }
    });
    return (suppliers || [])
      .filter((sup) => !taken.has(String(sup.id)))
      .map((sup) => ({
        value: String(sup.id),
        label: sup.name || sup.supplierName || `Supplier #${sup.id}`
      }));
  };

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

  const selectedItemValue = (item, supplier) => {
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

  const itemOptionsForRow = (gIdx, iIdx, supplier) => {
    if (!supplier) return [];
    const list = safeGet(supplierItemsBySupplier, supplier, []);
    const taken = new Set();
    const group = groups.at(gIdx);
    (group?.items || []).forEach((other, j) => {
      if (j === iIdx) return;
      const val = selectedItemValue(other, supplier);
      if (val) taken.add(val);
    });
    return list
      .filter((it) => !taken.has(it.value))
      .map((it) => ({ value: it.value, label: it.name }));
  };

  const addGroup = () => setGroups((prev) => [...prev, emptyGroup()]);

  const removeGroup = (gIdx) => setGroups((prev) => prev.filter((_, i) => i !== gIdx));

  const addItem = (gIdx) =>
    setGroups((prev) =>
      prev.map((g, i) => (i === gIdx ? { ...g, items: [...g.items, { ...emptyItem }] } : g))
    );

  const removeItem = (gIdx, iIdx) =>
    setGroups((prev) =>
      prev.map((g, i) => (i === gIdx ? { ...g, items: g.items.filter((_, j) => j !== iIdx) } : g))
    );

  const updateItem = (gIdx, iIdx, field, value) =>
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx
          ? {
              ...g,
              items: g.items.map((it, j) => (j === iIdx ? { ...it, [field]: value } : it))
            }
          : g
      )
    );

  const pickGroupSupplier = (gIdx, value) => {
    const supplierId = value ? Number(value) : null;
    setGroups((prev) => prev.map((g, i) => (i === gIdx ? { ...g, supplier: supplierId } : g)));
  };

  const pickItemOption = (gIdx, iIdx, value) => {
    setGroups((prev) =>
      prev.map((g, gi) => {
        if (gi !== gIdx) return g;
        const list = safeGet(supplierItemsBySupplier, g.supplier, []);
        const opt = list.find((o) => o.value === value);
        return {
          ...g,
          items: g.items.map((it, ii) => {
            if (ii !== iIdx) return it;
            if (!opt) {
              return {
                ...it,
                name: "",
                ingredient: null,
                ingredientName: null,
                product: null,
                productName: null
              };
            }
            if (opt.productId) {
              return {
                ...it,
                name: opt.name,
                product: opt.productId,
                productName: opt.name,
                ingredient: null,
                ingredientName: null,
                unit: opt.unit || it.unit
              };
            }
            return {
              ...it,
              name: opt.name,
              ingredient: null,
              ingredientName: opt.name,
              product: null,
              productName: null,
              unit: opt.unit || it.unit
            };
          })
        };
      })
    );
  };

  const updateMutation = useMutation((payload) => editGoodsRequest(id, payload), {
    onSuccess: () => {
      toast.success(t("page.goodsRequest.edit.toast.success"), {
        description: t("page.goodsRequest.edit.toast.successDesc")
      });
      queryClient.invalidateQueries(["goods-requests"]);
      navigate("/goods-request");
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const allItems = useMemo(
    () =>
      groups.flatMap((g) =>
        g.items.map((it) => ({
          name: it.name,
          qty: it.qty,
          supplier: g.supplier
        }))
      ),
    [groups]
  );

  const doSubmit = () => {
    const validItems = [];
    for (const g of groups) {
      for (const it of g.items) {
        if (it.name.trim() && it.qty > 0) validItems.push({ ...it, supplier: g.supplier });
      }
    }
    if (validItems.length === 0) {
      toast.error(t("page.goodsRequest.edit.toast.validation"), {
        description: t("page.goodsRequest.edit.toast.itemRequired")
      });
      return;
    }
    if (validItems.some((it) => !it.supplier)) {
      toast.error(t("page.goodsRequest.edit.toast.validation"), {
        description: t("page.goodsRequest.edit.toast.supplierRequired")
      });
      return;
    }
    if (!neededDate) {
      toast.error(t("page.goodsRequest.edit.toast.validation"), {
        description: t("page.goodsRequest.edit.toast.neededDateRequired")
      });
      return;
    }
    if (requestDate && neededDate && neededDate < requestDate) {
      toast.error(t("page.goodsRequest.edit.toast.validation"), {
        description: t("page.goodsRequest.edit.toast.neededDateBeforeRequest")
      });
      return;
    }
    updateMutation.mutate({
      requestedBy,
      requestDate: requestDate ? format(requestDate, "yyyy-MM-dd") : null,
      neededDate: neededDate ? format(neededDate, "yyyy-MM-dd") : null,
      notes,
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
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!request || (request.status && !["pending", "cancelled"].includes(request.status))) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => navigate("/goods-request")}>
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-2xl font-bold">{t("page.goodsRequest.edit.title")}</h1>
        </div>
        <div className="p-8 rounded-xl border border-border bg-card text-center text-sm text-muted-foreground">
          {t("page.goodsRequest.edit.notEditable")}
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={dirtyRef} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
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
            { label: t("breadcrumb.edit") }
          ]}
          title={t("page.goodsRequest.edit.title")}
          description={t("page.goodsRequest.edit.description")}
          onBack={requestLeave}
          dynamicInfo={false}>
          <UserGuide guideKey="add-goods-request" mode="edit" />
        </PageHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doSubmit();
          }}
          className="bg-card p-4 sm:p-6 rounded-xl border border-border space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("page.goodsRequest.edit.form.store")}</Label>
              <Input
                value={request.storeData?.name || request.store || ""}
                readOnly
                className="h-10 bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("page.goodsRequest.edit.form.requestedBy")}</Label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder={t("page.goodsRequest.edit.placeholder.requestedBy")}
                  className="pl-9"
                  maxLength={FIELD_LIMITS.PERSON_NAME}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("page.goodsRequest.edit.form.requestDate")}</Label>
              <DatePicker
                date={requestDate}
                setDate={setRequestDate}
                placeholder={t("page.goodsRequest.edit.form.requestDate")}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("page.goodsRequest.edit.form.neededDate")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                date={neededDate}
                setDate={setNeededDate}
                placeholder={t("page.goodsRequest.edit.placeholder.neededDate")}
                minDate={requestDate || undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              {t("page.goodsRequest.edit.form.items")} <span className="text-destructive">*</span>
            </Label>

            {groups.map((group, gIdx) => (
              <div key={gIdx} className="border rounded-lg overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b bg-muted/40">
                  <Label className="shrink-0 text-xs text-muted-foreground">
                    {t("page.goodsRequest.edit.table.supplier")}
                  </Label>
                  <div className="flex-1 min-w-[220px]">
                    <Combobox
                      options={supplierOptionsForGroup(gIdx)}
                      value={group.supplier ? String(group.supplier) : ""}
                      onChange={(val) => pickGroupSupplier(gIdx, val)}
                      placeholder={t("page.goodsRequest.edit.placeholder.selectSupplier")}
                      searchPlaceholder={t("common.search")}
                      emptyMessage={t("page.goodsRequest.edit.table.noSupplier")}
                      disabled={suppliersLoading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeGroup(gIdx)}
                    disabled={groups.length === 1}>
                    <Trash2 size={14} />
                  </Button>
                </div>

                <HorizontalScrollArea>
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                          {t("page.goodsRequest.edit.table.name")}
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                          {t("page.goodsRequest.edit.table.qty")}
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                          {t("page.goodsRequest.edit.table.unit")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                          {t("page.goodsRequest.edit.table.notes")}
                        </th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, iIdx) => (
                        <tr key={iIdx} className="border-b border-muted/20">
                          <td className="px-3 py-2 min-w-[280px]">
                            <Combobox
                              options={itemOptionsForRow(gIdx, iIdx, group.supplier)}
                              value={selectedItemValue(item, group.supplier)}
                              onChange={(val) => pickItemOption(gIdx, iIdx, val)}
                              placeholder={t("page.goodsRequest.edit.placeholder.selectItem")}
                              searchPlaceholder={t("common.search")}
                              emptyMessage={t("page.goodsRequest.edit.table.noItem")}
                              disabled={!group.supplier}
                            />
                            {item.name && !selectedItemValue(item, group.supplier) && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {item.name}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={item.qty === 0 ? "" : String(item.qty)}
                              onChange={(e) =>
                                updateItem(
                                  gIdx,
                                  iIdx,
                                  "qty",
                                  Number(e.target.value.replace(/[^0-9]/g, "")) || 0
                                )
                              }
                              className="h-8 text-xs text-center w-20 mx-auto"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-center">
                              <Combobox
                                options={unitOptions}
                                value={item.unit}
                                onChange={(val) => updateItem(gIdx, iIdx, "unit", val)}
                                placeholder="pcs"
                                searchPlaceholder={t("common.search")}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={item.notes}
                              onChange={(e) => updateItem(gIdx, iIdx, "notes", e.target.value)}
                              className="h-8 text-xs"
                              placeholder={t("page.goodsRequest.edit.placeholder.notes")}
                              maxLength={FIELD_LIMITS.SHORT_NOTE}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(gIdx, iIdx)}
                              className="text-muted-foreground/40 hover:text-destructive">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </HorizontalScrollArea>

                <div className="p-3 border-t">
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={() => addItem(gIdx)}
                    className="gap-1">
                    <Plus size={14} /> {t("page.goodsRequest.edit.form.addItem")}
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="success"
              size="sm"
              onClick={addGroup}
              disabled={suppliersLoading}
              className="gap-1">
              <Plus size={14} /> {t("page.goodsRequest.edit.form.addSupplier")}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t("page.goodsRequest.edit.form.notesLabel")}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("page.goodsRequest.edit.placeholder.notes")}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="danger"
              className="w-full sm:w-auto justify-center"
              onClick={requestLeave}>
              <X size={16} className="mr-1" /> {t("page.goodsRequest.edit.form.cancel")}
            </Button>
            <Button
              variant="success"
              type="button"
              className="w-full sm:w-auto justify-center"
              disabled={isSubmitting || updateMutation.isLoading || allItems.length === 0}
              onClick={() => setConfirmModal(true)}>
              <Save size={16} className="mr-1" />{" "}
              {updateMutation.isLoading
                ? t("page.goodsRequest.edit.form.saving")
                : t("page.goodsRequest.edit.form.save")}
            </Button>
          </div>
        </form>

        {updateMutation.isLoading && (
          <Loading fullscreen size="lg" label={t("page.goodsRequest.edit.form.saving")} />
        )}

        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={(o) => !o && setCancelModal(false)}
          title={t("page.goodsRequest.edit.modal.title")}
          description={t("page.goodsRequest.edit.modal.description")}
          confirmText={t("page.goodsRequest.edit.modal.confirm")}
          onConfirm={() => {
            setCancelModal(false);
            setTimeout(leave, 150);
          }}
        />
        <Modal
          type="confirm"
          open={confirmModal}
          onOpenChange={setConfirmModal}
          title={t("page.goodsRequest.edit.confirmModal.title")}
          description={t("page.goodsRequest.edit.confirmModal.description")}
          confirmText={t("page.goodsRequest.edit.confirmModal.confirm")}
          onConfirm={() => {
            setConfirmModal(false);
            doSubmit();
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

export default EditGoodsRequest;

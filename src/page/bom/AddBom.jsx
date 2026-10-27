import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Save, X, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import { addBom, editBom, getBomById } from "@/services/bom";
import { getAllProduct } from "@/services/product";
import { getAllIngredients } from "@/services/ingredient";
import { getAllSupplier } from "@/services/supplier";
import { normalizeStoreId } from "@/utils/storeId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import RecipeHppSummary from "@/components/organism/RecipeHppSummary";
import { recipeCosting } from "@/lib/recipe-costing";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { FieldError } from "@/components/ui/field-error";

const emptyLine = () => ({ supplierId: "", ingredientId: "", qty: "", unit: "pcs", notes: "" });

const formSchema = z.object({
  productId: z.string().min(1, "Required"),
  firstIngredient: z.string().min(1, "Required")
});

const AddBom = () => {
  const dirtyRef = useDomDirtyTracking();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [cookies] = useCookies();
  const user = cookies?.user;
  const preselectedId = searchParams.get("productId");
  // BomList's Edit opens this page with ?id=<bom id>: the recipe is loaded,
  // its product and store stay fixed, and saving updates it in place.
  const editId = searchParams.get("id");
  const isEdit = !!editId;
  const isSuperAdmin = user?.roleType === "super_admin";

  const [selectedStore, setSelectedStore] = useState(
    isSuperAdmin ? "" : normalizeStoreId(user?.store) || ""
  );
  const [productId, setProductId] = useState(preselectedId || "");
  const [disabledProduct] = useState(!!preselectedId || isEdit);
  const [loadedEditId, setLoadedEditId] = useState(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  // Portions the recipe makes (bom_header.totalQty); lines are for the whole yield.
  const [yieldQty, setYieldQty] = useState("1");
  const [lines, setLines] = useState([emptyLine()]);
  const { errors: fieldErrors, showErrors } = useFieldErrors(
    { productId, firstIngredient: lines[0]?.ingredientId || "" },
    formSchema
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  const { request: requestLeave, leave } = useFormExit("/bom", () => setCancelModal(true));
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [deleteLineIdx, setDeleteLineIdx] = useState(null);

  const bomFieldLabels = useMemo(
    () => ({
      productId: t("page.bom.add.form.product"),
      firstIngredient: t("page.bom.add.form.ingredients")
    }),
    [t]
  );

  const {
    data: bomData,
    isLoading: bomLoading,
    isError: bomError
  } = useQuery(["bom-edit", editId], () => getBomById(editId), {
    enabled: isEdit,
    retry: false,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    const bom = bomData?.data;
    if (!bom || loadedEditId === editId) return;
    setLoadedEditId(editId);
    if (bom.store != null) setSelectedStore(normalizeStoreId(bom.store) || "");
    setProductId(String(bom.productId));
    setName(bom.name || "");
    setNotes(bom.notes || "");
    setYieldQty(String(Number(bom.totalQty) > 1 ? bom.totalQty : 1));
    setLines(
      bom.lines?.length
        ? bom.lines.map((l) => ({
            supplierId: "",
            ingredientId: String(l.ingredientId),
            qty: String(l.qty),
            unit: l.unit || "pcs",
            notes: l.notes || ""
          }))
        : [emptyLine()]
    );
  }, [bomData, editId, loadedEditId]);

  const { data: prodData } = useQuery(
    ["products-for-bom", selectedStore],
    () => getAllProduct({ location: selectedStore || undefined }),
    { enabled: !!selectedStore }
  );
  const products = prodData?.data || [];

  const { data: locationsData } = useLocations("active", {
    enabled: isSuperAdmin,
    staleTime: 30000
  });
  const locations = locationsData?.data || [];

  const { data: ingData } = useQuery(
    ["ingredients-for-bom", selectedStore],
    () => getAllIngredients({ store: selectedStore || undefined, limit: 999 }),
    { enabled: !!selectedStore }
  );
  const ingredients = (ingData?.data || []).filter((i) => i.status === "active");

  // Live HPP preview — the same rule the server stores and snapshots.
  const selectedProduct = products.find((p) => String(p.id) === String(productId));
  const hppPreview = useMemo(() => {
    const validLines = lines.filter((l) => l.ingredientId && parseInt(l.qty) > 0);
    return recipeCosting({
      lines: validLines.map((l) => ({ ingredientId: l.ingredientId, qty: parseInt(l.qty) })),
      ingredientById: new Map(ingredients.map((i) => [Number(i.id), i])),
      yieldQty: parseInt(yieldQty) || 1,
      estimate: selectedProduct?.costPrice,
      price: selectedProduct?.price
    });
  }, [lines, ingredients, yieldQty, selectedProduct]);

  const { data: supData } = useQuery(
    ["suppliers-for-bom", selectedStore],
    () =>
      getAllSupplier({ limit: 999, store: selectedStore, status: "active", includeProducts: true }),
    { enabled: !!selectedStore, staleTime: 30000 }
  );
  const suppliers = supData?.data || [];

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((sup) => ({
        value: String(sup.id),
        label: sup.name || sup.supplierName || `Supplier #${sup.id}`
      })),
    [suppliers]
  );

  const supplierItemsBySupplier = useMemo(() => {
    const map = {};
    for (const sup of suppliers || []) {
      map[String(sup.id)] = (sup.products || []).map((p) => {
        const match = ingredients.find(
          (ing) =>
            ing.name && p.name && ing.name.trim().toLowerCase() === p.name.trim().toLowerCase()
        );
        return {
          value: match ? String(match.id) : "",
          label: p.name,
          // Batch 15: BE's bom.js requires bom_line.unit === ingredient.baseUnit
          // (the stock/consumption unit), not ingredient.unit (the purchase/
          // display unit) — these two intentionally differ whenever an
          // ingredient is bought in one unit and stocked in another. Using
          // match.unit here made every such BOM line fail BE's "Unit
          // mismatch" validation.
          unit: match?.baseUnit || match?.unit || p.unit || "pcs",
          matched: !!match
        };
      });
    }
    return map;
  }, [suppliers, ingredients]);

  // The stock unit a BOM line must use: BE requires bom_line.unit to equal the
  // ingredient's baseUnit (deduction is base-unit-only, no conversion).
  const baseUnitOf = (ingredientId) => {
    const ing = ingredients.find((i) => String(i.id) === String(ingredientId));
    return ing ? ing.baseUnit || ing.unit || "pcs" : "pcs";
  };

  // Supplier is an optional filter: without one, every active ingredient of
  // the store is offered directly (in-house items such as a bakso have no
  // supplier at all).
  const itemsForLine = (line) =>
    line.supplierId
      ? supplierItemsBySupplier[String(line.supplierId)] || []
      : ingredients.map((ing) => ({
          value: String(ing.id),
          label: ing.name,
          unit: ing.baseUnit || ing.unit || "pcs",
          matched: true
        }));

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx) => {
    if (lines.length > 1) setLines((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateLine = (idx, field, value) =>
    setLines((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (field === "supplierId") return { ...it, supplierId: value, ingredientId: "" };
        if (field === "ingredientId")
          return { ...it, ingredientId: value, unit: baseUnitOf(value) };
        return { ...it, [field]: value };
      })
    );

  const handleSaveClick = (saveAsDraft = false) => {
    if (!saveAsDraft) {
      const missing = getMissingFields(
        { productId, firstIngredient: lines[0]?.ingredientId || "" },
        formSchema,
        bomFieldLabels
      );
      if (missing.length > 0) {
        showErrors();
        setMissingFieldsList(missing);
        setMissingFieldsModal(true);
        return;
      }
    }
    handleSubmit(null, saveAsDraft);
  };

  const handleSubmit = async (e, saveAsDraft = false) => {
    if (e?.preventDefault) e.preventDefault();
    setIsSubmitting(true);
    try {
      const body = {
        // The BOM belongs to the store whose products/ingredients were picked
        // here — sent explicitly so it never falls back to the header store
        // (or to none, for a global super admin).
        ...(selectedStore ? { store: Number(selectedStore) } : {}),
        name: name || undefined,
        notes,
        totalQty: Math.max(parseInt(yieldQty) || 1, 1),
        status: saveAsDraft ? "draft" : "active",
        lines: lines
          .filter((l) => l.ingredientId && parseInt(l.qty) > 0)
          .map((l) => ({
            ingredientId: parseInt(l.ingredientId),
            qty: parseInt(l.qty),
            unit: baseUnitOf(l.ingredientId),
            notes: l.notes
          }))
      };
      const saved = isEdit
        ? await editBom(editId, body)
        : await addBom({ ...body, productId: parseInt(productId), createdBy: user?.id });
      toast.success(t(isEdit ? "page.bom.edit.toast.success" : "page.bom.add.toast.success"), {
        description: t(
          isEdit ? "page.bom.edit.toast.successDesc" : "page.bom.add.toast.successDesc"
        )
      });
      // The server moved a product still on "Stok produk jadi" to recipe
      // deduction, so its sales now use up the ingredients.
      if (saved?.recipeModeAdopted) {
        toast.info(t("page.bom.toast.recipeModeAdopted"), {
          description: t("page.bom.toast.recipeModeAdoptedDesc")
        });
        queryClient.invalidateQueries(["products"]);
      }
      queryClient.invalidateQueries(["bom-list"]);
      queryClient.invalidateQueries(["bom-edit", editId]);
      navigate("/bom");
    } catch (err) {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEdit && bomLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loading />
      </div>
    );
  }

  if (isEdit && (bomError || (!bomLoading && !bomData?.data))) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">{t("page.bom.edit.notFound")}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/bom")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div ref={dirtyRef} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.dashboard"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.dashboard"
          },
          {
            label: t("breadcrumb.bom"),
            href: "/bom",
            i18nKey: "breadcrumb.bom"
          },
          { label: t(isEdit ? "breadcrumb.edit" : "breadcrumb.add") }
        ]}
        title={t(isEdit ? "page.bom.edit.title" : "page.bom.add.title")}
        description={t(isEdit ? "page.bom.edit.description" : "page.bom.add.description")}
        onBack={requestLeave}
        dynamicInfo={false}>
        <UserGuide guideKey="add-bom" mode={isEdit ? "edit" : "add"} />
      </PageHeader>

      <div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="bg-card p-6 rounded-xl border border-border space-y-6">
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label>
                {t("page.bom.add.form.store")} <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={[
                  { value: "", label: t("page.bom.add.form.selectStore") },
                  ...locations.map((loc) => ({
                    value: normalizeStoreId(loc.id),
                    label: loc.name
                  }))
                ]}
                value={selectedStore}
                disabled={isEdit}
                onChange={(val) => {
                  setSelectedStore(val);
                  if (!disabledProduct) setProductId("");
                  setLines([emptyLine()]);
                }}
                placeholder={t("page.bom.add.form.selectStore")}
                searchPlaceholder={t("common.search")}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t("page.bom.add.form.product")} <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={[
                  { value: "", label: t("page.bom.add.form.selectProduct") },
                  ...products.map((p) => ({
                    value: String(p.id),
                    label: `${p.nameProduct} (${p.sku || "-"})`
                  }))
                ]}
                value={productId}
                onChange={setProductId}
                disabled={disabledProduct || !selectedStore}
                placeholder={
                  selectedStore
                    ? t("page.bom.add.form.selectProduct")
                    : t("page.bom.add.form.selectStoreFirst")
                }
                searchPlaceholder={t("common.search")}
              />
              <FieldError message={fieldErrors.productId} />
            </div>
            <div className="space-y-2">
              <Label>{t("page.bom.add.form.name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("page.bom.add.placeholder.name")}
                maxLength={FIELD_LIMITS.BUSINESS_NAME}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bom-yield">{t("page.bom.add.form.yield")}</Label>
              <Input
                id="bom-yield"
                type="number"
                min="1"
                step="1"
                value={yieldQty}
                onChange={(e) => setYieldQty(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => setYieldQty(String(Math.max(parseInt(yieldQty) || 1, 1)))}
              />
              <p className="text-xs text-muted-foreground">{t("page.bom.add.form.yieldHint")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("page.bom.add.form.ingredients")}</Label>
            {!selectedStore ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4 border border-dashed border-border rounded-lg bg-muted/30">
                <p className="text-sm font-medium text-foreground">
                  {t("page.bom.add.form.selectStoreFirst")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("page.bom.add.form.selectStoreHint")}
                </p>
              </div>
            ) : (
              <>
                <HorizontalScrollArea className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b">
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                          {t("page.bom.add.table.supplier")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                          {t("page.bom.add.table.ingredient")}
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                          {t("page.bom.add.table.qty")}
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                          {t("page.bom.add.table.unit")}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                          {t("page.bom.add.table.notes")}
                        </th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={idx} className="border-b border-muted/20">
                          <td className="px-3 py-2 min-w-[200px]">
                            <Combobox
                              options={[
                                { value: "", label: t("page.bom.add.form.supplierAny") },
                                ...supplierOptions
                              ]}
                              value={line.supplierId}
                              onChange={(val) => updateLine(idx, "supplierId", val)}
                              placeholder={t("page.bom.add.form.supplierAny")}
                              searchPlaceholder={t("common.search")}
                            />
                          </td>
                          <td className="px-3 py-2 min-w-[220px]">
                            <Combobox
                              options={[
                                { value: "", label: t("page.bom.add.form.selectIngredient") },
                                ...itemsForLine(line).map((it) => ({
                                  value: it.value,
                                  label: it.matched
                                    ? it.label
                                    : `${it.label} ${t("page.bom.add.form.notInIngredients")}`,
                                  disabled: !it.matched
                                }))
                              ]}
                              value={line.ingredientId}
                              onChange={(val) => updateLine(idx, "ingredientId", val)}
                              placeholder={t("page.bom.add.form.selectIngredient")}
                              searchPlaceholder={t("common.search")}
                            />
                            <FieldError
                              message={idx === 0 ? fieldErrors.firstIngredient : undefined}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="1"
                              value={line.qty}
                              onChange={(e) => updateLine(idx, "qty", e.target.value)}
                              className="h-8 text-xs text-right"
                              placeholder={t("page.bom.add.placeholder.qty")}
                            />
                          </td>
                          <td className="px-3 py-2">
                            {/* Fixed to the ingredient's base (stock) unit. */}
                            <span
                              className="inline-flex h-8 min-w-[64px] items-center rounded-md border border-border bg-muted/40 px-2 text-xs text-foreground"
                              title={t("page.bom.add.form.baseUnitHint")}>
                              {line.ingredientId ? baseUnitOf(line.ingredientId) : "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={line.notes}
                              onChange={(e) => updateLine(idx, "notes", e.target.value)}
                              className="h-8 text-xs"
                              placeholder={t("page.bom.add.placeholder.notes")}
                              maxLength={FIELD_LIMITS.SHORT_NOTE}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              disabled={lines.length <= 1}
                              onClick={() => setDeleteLineIdx(idx)}
                              className="text-muted-foreground/30 hover:text-destructive disabled:opacity-20">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </HorizontalScrollArea>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={addLine}
                  className="gap-1 mt-2">
                  <Plus size={14} /> {t("page.bom.add.form.addRow")}
                </Button>
                {productId && (
                  <RecipeHppSummary
                    costing={hppPreview}
                    className="mt-4 p-4 rounded-lg border border-border bg-muted/10"
                  />
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("page.bom.add.form.notesLabel")}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("page.bom.add.placeholder.globalNotes")}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="danger"
              className="w-full sm:w-auto justify-center"
              onClick={requestLeave}>
              <X size={16} className="mr-1" /> {t("page.bom.add.form.cancel")}
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Button
                type="button"
                variant="draft"
                onClick={() => setDraftModal(true)}
                disabled={isSubmitting}
                className="gap-2 w-full sm:w-auto justify-center">
                <Save size={16} />
                {t("page.bom.add.form.saveDraft")}
              </Button>
              <Button
                variant="success"
                type="button"
                className="w-full sm:w-auto justify-center"
                onClick={() => handleSaveClick()}
                disabled={isSubmitting}>
                <Save size={16} className="mr-1" />{" "}
                {isSubmitting ? t("page.bom.add.form.saving") : t("page.bom.add.form.save")}
              </Button>
            </div>
          </div>
        </form>
      </div>
      {isSubmitting && <Loading fullscreen size="lg" label={t("page.bom.add.form.saving")} />}
      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={(o) => !o && setCancelModal(false)}
        title={t("page.bom.add.modal.title")}
        description={t("page.bom.add.modal.description")}
        confirmText={t("page.bom.add.modal.confirm")}
        onConfirm={() => {
          setCancelModal(false);
          setTimeout(leave, 150);
        }}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={(o) => !o && setDraftModal(false)}
        title={t("page.bom.add.modal.draftTitle")}
        description={t("page.bom.add.modal.draftDesc")}
        confirmText={t("page.bom.add.modal.draftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          handleSaveClick(true);
        }}
      />
      <Modal
        type="confirm"
        open={deleteLineIdx !== null}
        onOpenChange={(o) => !o && setDeleteLineIdx(null)}
        title={t("page.bom.add.modal.deleteLineTitle")}
        description={t("page.bom.add.modal.deleteLineDesc")}
        confirmText={t("common.yes") || "Ya"}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          if (deleteLineIdx !== null) removeLine(deleteLineIdx);
          setDeleteLineIdx(null);
        }}
      />
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFieldsList}
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
  );
};

export default AddBom;

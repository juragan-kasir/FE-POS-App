import { safeGet } from "@/lib/safe-lookup";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X, Info, ArrowRightLeft, Package, ToggleLeft } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { addIngredient, getProductNamesByFilters } from "@/services/ingredient";
import { getAllSupplier } from "@/services/supplier";
import { getAllIngredientCategory } from "@/services/ingredientCategory";
import { Button } from "@/components/ui/button";

import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import UserGuide from "@/components/organism/UserGuide";
import { useConfirmSubmit } from "@/hooks/useConfirmSubmit";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";

import IngredientFormFields from "./IngredientFormFields";
import { useLocations } from "@/queries/useLocations";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const conversionHints = {
  kg: { base: "gram", factor: 1000 },
  liter: { base: "ml", factor: 1000 },
  meter: { base: "cm", factor: 100 },
  lusin: { base: "pcs", factor: 12 },
  karton: { base: "pcs", factor: 50 },
  box: { base: "pcs", factor: 10 },
  pack: { base: "pcs", factor: 5 }
};

const AddIngredient = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const store = user?.store || "";
  const role = user?.roleType || "";
  const isSuperAdmin = role === "super_admin";
  const [cancelModal, setCancelModal] = useState(false);
  // "none" (market / in-house) or "supplier"; see IngredientSourceField.
  const [source, setSource] = useState("none");
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [activeTab, setActiveTab] = useState("informasi");

  const ingredientFieldLabels = {
    name: "Nama Bahan Baku",
    supplier: "Supplier",
    store: "Toko",
    category: "Kategori",
    unit: "Satuan",
    baseUnit: "Satuan Dasar",
    conversionFactor: "Faktor Konversi",
    stock: "Stok",
    minStock: "Stok Minimum",
    costPrice: "Harga Beli",
    isActive: "Status"
  };

  const formSchema = z.object({
    name: z.string().min(1, t("page.ingredient.form.nameRequired")),
    supplier: z.string().nullable(),
    category: z.string().nullable(),
    unit: z.string(),
    baseUnit: z.string(),
    conversionFactor: z.coerce.string(),
    stock: z.number(),
    minStock: z.number(),
    costPrice: z.number(),
    isActive: z.boolean(),
    store: z.string().nullable()
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      unit: "pcs",
      baseUnit: "pcs",
      conversionFactor: "1",
      stock: 0,
      minStock: 0,
      costPrice: 0,
      supplier: null,
      category: null,
      isActive: true,
      store: null
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/ingredient",
    () => setCancelModal(true),
    form
  );

  const watchStore = form.watch("store");
  const watchSupplier = form.watch("supplier");
  const watchCategory = form.watch("category");
  const watchUnit = form.watch("unit");

  const activeStore = isSuperAdmin ? watchStore : store;

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery(
    ["suppliers-dropdown", activeStore],
    () => getAllSupplier({ limit: 999, store: activeStore || undefined, includeProducts: true }),
    { enabled: !!activeStore || !isSuperAdmin }
  );
  const suppliers = suppliersData?.data || [];

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(
    ["ingredient-categories-dropdown", activeStore],
    () => getAllIngredientCategory(),
    { enabled: !!activeStore || !isSuperAdmin }
  );
  const categories = categoriesData?.data || [];

  const { data: locationsData, isLoading: locationsLoading } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || [];

  const { data: productNamesData, isLoading: productNamesLoading } = useQuery(
    ["ingredient-product-names", activeStore, watchCategory, watchSupplier],
    () =>
      getProductNamesByFilters({
        store: activeStore || undefined,
        category: watchCategory || undefined,
        supplier: watchSupplier || undefined
      }),
    { enabled: !!activeStore && !!watchSupplier && !!watchCategory }
  );

  const { data: allSupplierProductsData, isLoading: allSupplierProductsLoading } = useQuery(
    ["all-supplier-products", activeStore, watchSupplier],
    () =>
      getProductNamesByFilters({
        store: activeStore || undefined,
        supplier: watchSupplier || undefined
      }),
    { enabled: !!activeStore && !!watchSupplier }
  );

  const supplierProductOptions = React.useMemo(() => {
    const products = productNamesData?.data || [];
    return products.map((p) => {
      const name = typeof p === "string" ? p : typeof p?.name === "string" ? p.name : "";
      return { value: name, label: name };
    });
  }, [productNamesData]);

  const isSupplierDisabled = isSuperAdmin && !watchStore;
  const isCategoryDisabled = isSuperAdmin && !watchStore;
  const changeSource = (next) => {
    setSource(next);
    if (next === "none") form.setValue("supplier", null);
  };

  // Client note 2026-10-24: an ingredient is either bought from a supplier
  // or not (market / in-house). With a supplier that has a catalog, the
  // name is picked from it (and fills price and unit); otherwise it is
  // typed in.
  const pickFromCatalog =
    !!watchSupplier &&
    (allSupplierProductsLoading || (allSupplierProductsData?.data?.length ?? 0) > 0) &&
    !(watchCategory && !productNamesLoading && supplierProductOptions.length === 0);
  const isNameDisabled = pickFromCatalog ? !watchCategory : isSuperAdmin && !watchStore;

  React.useEffect(() => {
    form.setValue("supplier", null);
    form.setValue("category", null);
    form.setValue("name", "");
  }, [watchStore]);

  React.useEffect(() => {
    if (watchSupplier) form.setValue("name", "");
  }, [watchSupplier]);

  React.useEffect(() => {
    if (pickFromCatalog) form.setValue("name", "");
  }, [watchCategory]);

  React.useEffect(() => {
    const hint = safeGet(conversionHints, watchUnit);
    if (hint) {
      form.setValue("baseUnit", hint.base);
      form.setValue("conversionFactor", String(hint.factor));
    } else {
      form.setValue("baseUnit", watchUnit);
      form.setValue("conversionFactor", "1");
    }
  }, [watchUnit]);

  const mutation = useMutation(addIngredient, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    mutation.mutate({
      ...values,
      supplier: values.supplier ? parseInt(values.supplier) : null,
      category: values.category ? parseInt(values.category) : null,
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive",
      store: saveAsDraft
        ? null
        : values.store
          ? parseInt(values.store)
          : cookie?.user?.store || null
    });
  };

  const { handleSubmit, confirmModal } = useConfirmSubmit(form, (values) => onSubmit(values));

  return (
    <div>
      <div>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeader
            breadcrumbs={[
              {
                label: t("page.ingredient.add.breadcrumbDashboard"),
                href: "/dashboard-super-admin",
                i18nKey: "page.ingredient.add.breadcrumbDashboard"
              },
              {
                label: t("page.ingredient.add.breadcrumbIngredient"),
                href: "/ingredient",
                i18nKey: "page.ingredient.add.breadcrumbIngredient"
              },
              { label: t("page.ingredient.add.breadcrumbAdd") }
            ]}
            title={t("page.ingredient.add.title")}
            description={t("page.ingredient.add.subtitle")}
            onBack={requestLeave}
            dynamicInfo={false}
          />
          <LoadErrorBanner />
          <UserGuide guideKey="add-ingredient" />
        </div>

        {isSuperAdmin && locationsLoading ? (
          <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden space-y-6">
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : (
          <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                }}>
                {isSuperAdmin && (
                  <FormField
                    control={form.control}
                    name="store"
                    render={({ field }) => (
                      <FormItem className="mb-6 bg-card rounded-xl p-4 border border-border shadow-sm">
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("document.store")} <span className="text-destructive">*</span>
                        </FormLabel>
                        <Combobox
                          options={locations.map((l) => ({
                            value: String(l.id),
                            label: l.name
                          }))}
                          value={field.value || ""}
                          onChange={(v) => field.onChange(v || null)}
                          placeholder={t("page.ingredient.add.selectStorePlaceholder")}
                          searchPlaceholder={t("common.search.store")}
                          loading={locationsLoading}
                        />
                        {!field.value && (
                          <p className="text-xs text-amber-700 dark:text-amber-400" role="note">
                            {t("page.ingredient.form.storeFirstHint")}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* ponytail: tab layout pola /add-supplier */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="overflow-x-auto -mx-1 px-1 mb-4">
                    <TabsList className="grid w-full grid-cols-4 min-w-[480px]">
                      <TabsTrigger value="informasi" className="gap-1.5">
                        <Info size={14} />
                        {t("page.ingredient.add.sectionInformasi")}
                      </TabsTrigger>
                      <TabsTrigger value="konversi" className="gap-1.5">
                        <ArrowRightLeft size={14} />
                        {t("page.ingredient.form.sectionKonversi")}
                      </TabsTrigger>
                      <TabsTrigger value="stok" className="gap-1.5">
                        <Package size={14} />
                        {t("page.ingredient.form.sectionStok")}
                      </TabsTrigger>
                      <TabsTrigger value="status" className="gap-1.5">
                        <ToggleLeft size={14} />
                        {t("page.ingredient.form.sectionStatus")}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <IngredientFormFields
                    form={form}
                    source={source}
                    changeSource={changeSource}
                    pickFromCatalog={pickFromCatalog}
                    suppliers={suppliers}
                    suppliersLoading={suppliersLoading}
                    isSupplierDisabled={isSupplierDisabled}
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    isCategoryDisabled={isCategoryDisabled}
                    isNameDisabled={isNameDisabled}
                    productNamesLoading={productNamesLoading}
                    supplierProductOptions={supplierProductOptions}
                    allSupplierProductsData={allSupplierProductsData}
                    allSupplierProductsLoading={allSupplierProductsLoading}
                  />
                </Tabs>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 mt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={requestLeave}
                    className="w-full sm:w-auto justify-center">
                    <X size={16} className="mr-1" /> {t("page.ingredient.form.cancelButton")}
                  </Button>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <Button
                      type="button"
                      variant="draft"
                      onClick={() => setDraftModal(true)}
                      disabled={mutation.isLoading}
                      className="w-full sm:w-auto justify-center">
                      {t("common.saveAsDraft")}
                    </Button>
                    <Button
                      variant="success"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const values = form.getValues();
                        const extraErrors = [
                          ...(isSuperAdmin && !values.store ? [{ name: "store" }] : []),
                          ...(source === "supplier" && !values.supplier
                            ? [{ name: "supplier" }]
                            : [])
                        ];
                        const missing = getMissingFields(
                          values,
                          formSchema,
                          ingredientFieldLabels,
                          extraErrors
                        );
                        if (missing.length > 0) {
                          setMissingFieldsList(missing);
                          setMissingFieldsModal(true);
                          return;
                        }
                        handleSubmit(e);
                      }}
                      disabled={mutation.isLoading}
                      className="w-full sm:w-auto justify-center">
                      <Save size={16} className="mr-1" />{" "}
                      {mutation.isLoading
                        ? t("page.ingredient.form.savingButton")
                        : t("page.ingredient.form.saveButton")}
                    </Button>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={18} className="text-primary text-base" />
                    <span className="text-sm font-semibold text-primary">
                      {t("page.ingredient.form.tipsTitle")}
                    </span>
                  </div>
                  <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                    <p>
                      {t("page.ingredient.form.tipsText1")}{" "}
                      <span className="text-foreground font-medium">
                        &quot;{t("page.ingredient.form.tipsExample")}&quot;
                      </span>{" "}
                      {t("page.ingredient.form.tipsText2")}
                    </p>
                    <p>{t("page.ingredient.form.tipsText3")}</p>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        )}

        {mutation.isLoading && (
          <Loading fullscreen size="lg" label={t("page.ingredient.form.savingButton")} />
        )}

        <Modal
          type="success"
          open={successModal}
          secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
          onSecondary={() => navigate(`/detail-ingredient?id=${createdRecordId}`)}
          onOpenChange={(o) => !o && setSuccessModal(false)}
          title={t("page.ingredient.add.toastSuccess")}
          description={t("page.ingredient.add.toastAddDesc")}
          confirmText="OK"
          onConfirm={() => {
            setSuccessModal(false);
            queryClient.invalidateQueries(["ingredients"]);
            setTimeout(() => navigate("/ingredient"), 150);
          }}
        />
        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={(o) => !o && setCancelModal(false)}
          title={t("page.ingredient.add.modalCancelTitle")}
          description={t("page.ingredient.add.modalCancelDesc")}
          confirmText={t("page.ingredient.add.modalCancelConfirm")}
          onConfirm={() => {
            setCancelModal(false);
            setTimeout(leave, 150);
          }}
        />
        <Modal
          type="confirm"
          open={draftModal}
          onOpenChange={setDraftModal}
          title={t("common.saveAsDraftTitle")}
          description={t("common.saveAsDraftDesc")}
          confirmText={t("common.yesSaveDraft")}
          onConfirm={() => {
            setDraftModal(false);
            const values = form.getValues();
            onSubmit(values, true);
          }}
        />
        <Modal {...confirmModal()} />
        <Modal
          type="error"
          open={errorModal}
          onOpenChange={setErrorModal}
          title={t("common.error")}
          description={modalMessage}
          onConfirm={() => setErrorModal(false)}
        />
        <MissingFieldsModal
          open={missingFieldsModal}
          onOpenChange={setMissingFieldsModal}
          fields={missingFieldsList}
        />
      </div>
    </div>
  );
};

export default AddIngredient;

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";
import { X, Save } from "lucide-react";
import { useCookies } from "react-cookie";

import {
  editSupplier,
  getSupplierById,
  downloadSupplierProductTemplate,
  importSupplierProducts,
  getAllSupplierCategories
} from "@/services/supplier";

import { Button } from "@/components/ui/button";

import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import { Loading } from "@/components/ui/loading";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import { useTranslation } from "react-i18next";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import AbortController from "@/components/organism/abort-controller";

import { useLocations } from "@/queries/useLocations";

import { useFormExit } from "@/hooks/useLeaveGuard";
import SupplierFormTabs from "./SupplierFormTabs";
import SupplierProductsCard from "./SupplierProductsCard";
import SupplierStatusField from "./SupplierStatusField";
import {
  SUPPLIER_FORM_DEFAULTS,
  buildSupplierFieldLabels,
  buildSupplierPayload,
  buildSupplierSchema
} from "./supplierForm";

const EditSupplier = () => {
  const { t } = useTranslation();
  const formSchema = buildSupplierSchema(t);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const supplierId = searchParams.get("id");
  const supplierFieldLabels = buildSupplierFieldLabels(t);

  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [selectedStore, setSelectedStore] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [contacts, setContacts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", { enabled: isSuperAdmin });
  const locations = locationsData?.data || locationsData?.locations || [];

  const { data: categoriesData } = useQuery(["supplierCategories"], () =>
    getAllSupplierCategories()
  );

  const {
    data: supplierData,
    isLoading,
    isError,
    refetch
  } = useQuery(["supplier-detail", supplierId], () => getSupplierById({ id: supplierId }), {
    enabled: !!supplierId
  });
  const categoryOptions = (categoriesData?.data || []).map((c) => ({
    value: String(c.id),
    label: c.name
  }));

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: SUPPLIER_FORM_DEFAULTS
  });
  const { request: requestLeave, leave } = useFormExit(
    "/supplier",
    () => setCancelModal(true),
    form
  );

  const supplier = supplierData?.data || {};

  useEffect(() => {
    if (supplier?.id) {
      form.reset({
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        isActive: supplier.status === "active" || supplier.status === true,
        paymentType: supplier.paymentType || "cbd",
        tempoDays: supplier.tempoDays || 0,
        categoryId: supplier.categoryId || null,
        mobile: supplier.mobile || "",
        whatsapp: supplier.whatsapp || "",
        fax: supplier.fax || "",
        website: supplier.website || "",
        taxInclude: supplier.taxInclude !== false,
        taxType: supplier.taxType || "",
        taxNumber: supplier.taxNumber || "",
        taxName: supplier.taxName || "",
        nitku: supplier.nitku || "",
        taxTransactionType: supplier.taxTransactionType || "",
        defaultDiscount: supplier.defaultDiscount || 0,
        defaultDescription: supplier.defaultDescription || ""
      });
      if (supplier.store) {
        const storeArr = Array.isArray(supplier.store) ? supplier.store : [];
        if (storeArr.length === 0) {
          setAllStores(true);
          setSelectedStore([]);
        } else {
          setAllStores(false);
          setSelectedStore(storeArr.map((s) => (typeof s === "object" ? s.id : s)));
        }
      }
      if (supplier.contacts && Array.isArray(supplier.contacts)) {
        setContacts(
          supplier.contacts.map((c) => ({
            id: c.id || `contact_${Date.now()}_${crypto.randomUUID()}`,
            fullName: c.fullName || "",
            position: c.position || "",
            email: c.email || "",
            phone: c.phone || ""
          }))
        );
      }
      if (supplier.bankAccounts && Array.isArray(supplier.bankAccounts)) {
        setBankAccounts(
          supplier.bankAccounts.map((b) => ({
            id: b.id || `bank_${Date.now()}_${crypto.randomUUID()}`,
            bankName: b.bankName || "",
            accountNumber: b.accountNumber || "",
            accountName: b.accountName || "",
            isDefault: b.isDefault || false,
            status: b.status || "active"
          }))
        );
      }
      if (supplier.products && Array.isArray(supplier.products)) {
        setSupplierProducts(
          supplier.products.map((p) => ({
            id: p.id,
            productId: p.productId,
            name: p.name,
            price: p.price,
            unit: p.unit || "pcs",
            leadTime: p.leadTime || 0,
            leadTimeUnit: p.leadTimeUnit || "hari",
            qualityRating: p.qualityRating || 0,
            minOrderQty: p.minOrderQty || 1,
            notes: p.notes || ""
          }))
        );
      }
    }
  }, [supplier, form]);

  const updateMutation = useMutation(editSupplier, {
    onSuccess: () => {
      queryClient.invalidateQueries(["suppliers"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.supplier.toast.updateError")
      );
      setErrorModal(true);
    }
  });

  const importMutation = useMutation(importSupplierProducts, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.supplier.products.importSuccessToast")
      });
      refetch();
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description:
          err?.response?.data?.message || err.message || t("page.supplier.products.importFailed")
      });
    }
  });

  const handleDownloadTemplate = async () => {
    try {
      await downloadSupplierProductTemplate(supplierId);
    } catch {
      toast.error(t("common.error"), { description: t("page.supplier.products.templateFailed") });
    }
  };

  const onSubmit = (values, saveAsDraft = false) => {
    if (isSuperAdmin && !allStores && selectedStore.length === 0 && !saveAsDraft) {
      form.setError("store", {
        message: t("page.supplier.validation.storeRequired") || "Pilih minimal satu toko"
      });
      return;
    }
    form.clearErrors("store");
    updateMutation.mutate({
      id: supplierId,
      ...buildSupplierPayload({
        values,
        isDraft: saveAsDraft,
        selectedStore,
        contacts,
        bankAccounts,
        products: supplierProducts
      })
    });
  };

  if (!supplierId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.supplier.edit.notFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return <Loading fullscreen size="lg" label={t("common.loading")} />;
  }

  return (
    <div className="space-y-6">
      {updateMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}
      <div>
        <div>
          <PageHeader
            breadcrumbs={[
              {
                label: t("breadcrumb.home"),
                href: "/dashboard-super-admin",
                i18nKey: "breadcrumb.home"
              },
              {
                label: t("breadcrumb.supplier"),
                href: "/supplier",
                i18nKey: "breadcrumb.supplier"
              },
              { label: t("breadcrumb.editSupplier"), i18nKey: "breadcrumb.editSupplier" }
            ]}
            title={t("page.supplier.edit.title")}
            description={t("page.supplier.edit.description")}
            backLink="/supplier"
            onBack={requestLeave}>
            <UserGuide guideKey="add-supplier" />
          </PageHeader>
        </div>
      </div>

      <div>
        <div>
          <div className="space-y-6">
            <Card className="p-6">
              <Form {...form}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                  className="space-y-6">
                  {isSuperAdmin && (
                    <FormField
                      control={form.control}
                      name="store"
                      render={() => (
                        <FormItem>
                          <FormControl>
                            <StoreSelectCard
                              locations={locations}
                              selectedStores={selectedStore}
                              onChange={(stores) => {
                                setSelectedStore(stores);
                                form.clearErrors("store");
                              }}
                              isSuperAdmin={isSuperAdmin}
                              user={user}
                              t={t}
                              title={t("page.supplier.form.storeSection.title")}
                              description={t("page.supplier.form.storeSection.desc")}
                              noStoreLabel={t("page.supplier.form.storeSection.noStore")}
                              addStoreLabel={t("page.supplier.form.storeSection.addStore")}
                              storeInfoLabel={t("page.supplier.form.storeInfo")}
                              allStores={allStores}
                              onAllStoresChange={(val) => {
                                setAllStores(val);
                                form.clearErrors("store");
                              }}
                              navigate={navigate}
                              mandatory={true}
                              locationsLoading={locsLoading || locsFetching}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <SupplierStatusField form={form} />

                  <SupplierFormTabs
                    idPrefix="edit"
                    form={form}
                    categoryOptions={categoryOptions}
                    contacts={contacts}
                    onContactsChange={setContacts}
                    bankAccounts={bankAccounts}
                    onBankAccountsChange={setBankAccounts}
                  />
                </form>
              </Form>
              <Modal
                type="confirm"
                open={confirmSaveModal}
                onOpenChange={setConfirmSaveModal}
                title={t("page.supplier.modal.confirmSave")}
                description={t("page.supplier.modal.confirmSaveDesc")}
                confirmText={t("page.supplier.modal.confirmSaveText")}
                onConfirm={() => {
                  setConfirmSaveModal(false);
                  const values = form.getValues();
                  onSubmit(values);
                }}
              />
              <MissingFieldsModal
                open={missingFieldsModal}
                onOpenChange={setMissingFieldsModal}
                fields={missingFieldsList}
              />
            </Card>

            {isSuperAdmin && (
              <SupplierProductsCard
                idPrefix="edit"
                products={supplierProducts}
                onChange={setSupplierProducts}
                onDownloadTemplate={handleDownloadTemplate}
                onImport={(file, options) =>
                  importMutation.mutate({ id: supplierId, file }, options)
                }
                isImporting={importMutation.isLoading}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
          <Button
            variant="outline"
            onClick={requestLeave}
            className="gap-2 w-full sm:w-auto justify-center">
            <X size={18} />
            {t("common.cancel")}
          </Button>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button
              variant="draft"
              onClick={() => setDraftModal(true)}
              disabled={updateMutation.isLoading}
              className="gap-2 w-full sm:w-auto justify-center">
              <Save size={18} />
              {t("page.supplier.form.saveAsDraft")}
            </Button>
            <Button
              variant="success"
              type="button"
              onClick={() => {
                const values = form.getValues();
                const extraErrors = [];
                if (isSuperAdmin && !allStores && selectedStore.length === 0) {
                  extraErrors.push({ name: "store", message: "required" });
                }
                const missing = getMissingFields(
                  values,
                  formSchema,
                  supplierFieldLabels,
                  extraErrors
                );
                if (missing.length > 0) {
                  setMissingFieldsList(missing);
                  setMissingFieldsModal(true);
                  return;
                }
                setConfirmSaveModal(true);
              }}
              disabled={updateMutation.isLoading}
              className="gap-2 w-full sm:w-auto justify-center">
              <Save size={18} />
              {updateMutation.isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />
      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("page.supplier.modal.cancelTitle")}
        description={t("page.supplier.modal.cancelDescription")}
        confirmText={t("page.supplier.modal.confirmCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.supplier.modal.updateSuccess")}
        confirmText={t("page.supplier.modal.backToList")}
        onConfirm={() => setTimeout(() => navigate("/supplier"), 150)}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.supplier.modal.draftTitle")}
        description={t("page.supplier.modal.draftDescription")}
        confirmText={t("page.supplier.modal.draftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          const values = form.getValues();
          onSubmit(values, true);
        }}
      />
    </div>
  );
};

export default EditSupplier;

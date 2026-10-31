import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";
import { X, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";

import { addSupplier } from "@/services/supplier";
import { getAllSupplierCategories } from "@/services/supplier";
import { downloadSupplierProductTemplate, importSupplierProducts } from "@/services/supplier";
import { Button } from "@/components/ui/button";

import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";

import { Loading } from "@/components/ui/loading";

import { useLocations } from "@/queries/useLocations";

import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import SupplierFormTabs from "./SupplierFormTabs";
import SupplierProductsCard from "./SupplierProductsCard";
import {
  SUPPLIER_FORM_DEFAULTS,
  buildSupplierFieldLabels,
  buildSupplierPayload,
  buildSupplierSchema
} from "./supplierForm";

const AddSupplier = () => {
  const { t } = useTranslation();
  const formSchema = buildSupplierSchema(t);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const supplierFieldLabels = buildSupplierFieldLabels(t);

  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [selectedStore, setSelectedStore] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", { enabled: isSuperAdmin });
  const locations = locationsData?.data || locationsData?.locations || [];

  const { data: categoriesData } = useQuery(["supplierCategoryOptions"], () =>
    getAllSupplierCategories({ limit: 100 })
  );
  const categoryOptions = (categoriesData?.data || []).map((c) => ({
    value: String(c.id),
    label: c.name
  }));

  const excelImportMutation = useMutation(({ id, file }) => importSupplierProducts({ id, file }), {
    onSuccess: (data) => {
      const imported = (data?.data || data?.products || []).map((p) => ({
        id: p.id || `imported_${Date.now()}`,
        name: p.name || p.productName || "",
        price: p.price || 0,
        unit: p.unit || "pcs",
        leadTime: p.leadTime || 0,
        leadTimeUnit: p.leadTimeUnit || "hari",
        qualityRating: p.qualityRating || 0,
        minOrderQty: p.minOrderQty || 1,
        notes: p.notes || ""
      }));
      setSupplierProducts((prev) => [...prev, ...imported]);
      toast.success(t("page.supplier.products.importSuccess"));
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
      await downloadSupplierProductTemplate();
      toast.success(t("common.success"), {
        description: t("page.supplier.products.templateDownloaded")
      });
    } catch (err) {
      toast.error(t("common.error"), {
        description: err?.message || t("page.supplier.products.templateFailed")
      });
    }
  };

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

  const createMutation = useMutation(addSupplier, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["suppliers"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.supplier.toast.addFailed")
      );
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    if (isSuperAdmin && !allStores && selectedStore.length === 0 && !saveAsDraft) {
      form.setError("store", {
        message: t("page.supplier.validation.storeRequired") || "Pilih minimal satu toko"
      });
      return;
    }
    form.clearErrors("store");
    createMutation.mutate(
      buildSupplierPayload({
        values,
        isDraft: saveAsDraft,
        selectedStore,
        contacts,
        bankAccounts,
        products: supplierProducts
      })
    );
  };

  return (
    <div className="space-y-6">
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
              { label: t("page.supplier.add.title"), i18nKey: "page.supplier.add.title" }
            ]}
            title={t("page.supplier.add.title")}
            description={t("page.supplier.add.description")}
            backLink="/supplier"
            onBack={requestLeave}>
            <UserGuide guideKey="add-supplier" />
          </PageHeader>
          <LoadErrorBanner />
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

                  <SupplierFormTabs
                    idPrefix="add"
                    form={form}
                    categoryOptions={categoryOptions}
                    hasStatusInGeneralTab
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
                idPrefix="add"
                products={supplierProducts}
                onChange={setSupplierProducts}
                onDownloadTemplate={handleDownloadTemplate}
                onImport={(file, options) =>
                  excelImportMutation.mutate({ id: "preview", file }, options)
                }
                isImporting={excelImportMutation.isLoading}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
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
              disabled={createMutation.isLoading}
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
              disabled={createMutation.isLoading}
              className="gap-2 w-full sm:w-auto justify-center">
              <Save size={18} />
              {createMutation.isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </div>

      {createMutation.isLoading && (
        <Loading fullscreen size="lg" label={t("page.product.form.saving")} />
      )}

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
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-supplier?id=${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.supplier.toast.addSuccess")}
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

export default AddSupplier;

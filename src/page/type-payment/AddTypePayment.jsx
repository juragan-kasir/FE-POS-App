import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save, Check } from "lucide-react";
import { useCookies } from "react-cookie";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { addTypePayment } from "@/services/type-payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loading } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import Modal from "@/components/organism/modal";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const AddTypePayment = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || [];

  const [selectedStore, setSelectedStore] = useState([]);
  const [allStores, setAllStores] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, t("page.typePayment.validation.nameRequired")),
    type: z.string().min(1, t("page.typePayment.validation.typeRequired")),
    feeType: z.string().default("fixed"),
    fee: z.coerce.number().min(0).optional().default(0),
    tenor: z.coerce.number().min(0).optional().default(0),
    sortOrder: z.coerce.number().min(0).optional().default(0),
    status: z.boolean().default(true),
    store: z.string().optional()
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [draftModal, setDraftModal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const fieldLabels = useMemo(
    () => ({
      name: t("page.typePayment.form.name"),
      type: t("page.typePayment.form.type")
    }),
    [t]
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      type: "",
      feeType: "fixed",
      fee: 0,
      tenor: 0,
      sortOrder: 0,
      status: true,
      store: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/type-payment-list",
    () => setCancelModal(true),
    form
  );

  const createMutation = useMutation(addTypePayment, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["type-payments"]);
      queryClient.invalidateQueries(["type-payments-all"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.typePayment.toast.addFailed")
      );
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    if (isSuperAdmin && !allStores && selectedStore.length === 0 && !saveAsDraft) {
      form.setError("store", { message: t("page.ingredientCategory.add.storeRequired") });
      return;
    }
    form.clearErrors("store");
    const { status, ...rest } = values;
    createMutation.mutate({
      ...rest,
      store: isSuperAdmin ? JSON.stringify(allStores ? "all" : selectedStore) : undefined,
      status: saveAsDraft ? "draft" : status ? "active" : "inactive"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div>
          <PageHeader
            breadcrumbs={[
              { i18nKey: "breadcrumb.home", href: "/dashboard-super-admin" },
              { i18nKey: "breadcrumb.payment", href: "/type-payment-list" },
              { i18nKey: "page.typePayment.add.title" }
            ]}
            title={t("page.typePayment.add.title")}
            description={t("page.typePayment.add.description")}
            backLink="/type-payment-list"
            onBack={requestLeave}>
            <UserGuide guideKey="add-type-payment" />
          </PageHeader>
          <LoadErrorBanner />
        </div>
      </div>

      <div>
        <div>
          <Card className="p-6">
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                  title={t("page.typePayment.form.storeSection.title")}
                  description={t("page.typePayment.form.storeSection.desc")}
                  noStoreLabel={t("page.typePayment.form.storeSection.noStore")}
                  addStoreLabel={t("page.typePayment.form.storeSection.addStore")}
                  storeInfoLabel={t("page.typePayment.form.storeInfo")}
                  allStores={allStores}
                  onAllStoresChange={(val) => {
                    setAllStores(val);
                    form.clearErrors("store");
                  }}
                  navigate={navigate}
                  mandatory={true}
                  locationsLoading={locsLoading || locsFetching}
                />
                {form.formState.errors.store && (
                  <p className="text-sm text-destructive">{form.formState.errors.store.message}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.typePayment.form.name")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          placeholder={t("page.typePayment.form.namePlaceholder")}
                          {...field}
                          maxLength={FIELD_LIMITS.SHORT_LABEL}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("page.typePayment.form.type")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("page.typePayment.form.typePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Tunai</SelectItem>
                            <SelectItem value="debit">Non-Tunai</SelectItem>
                            <SelectItem value="credit">Kartu Kredit</SelectItem>
                            <SelectItem value="e-wallet">E-Wallet</SelectItem>
                            <SelectItem value="other">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="feeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("page.typePayment.form.feeType")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("page.typePayment.form.feeTypePlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">
                              {t("page.typePayment.feeType.fixed")}
                            </SelectItem>
                            <SelectItem value="percent">
                              {t("page.typePayment.feeType.percent")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("page.typePayment.form.fee")}</FormLabel>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={t("page.typePayment.form.feePlaceholder")}
                          {...field}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tenor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("page.typePayment.form.tenor")}</FormLabel>
                        <Input
                          type="number"
                          min="0"
                          placeholder={t("page.typePayment.form.tenorPlaceholder")}
                          {...field}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("page.typePayment.form.sortOrder")}</FormLabel>
                        <Input
                          type="number"
                          min="0"
                          placeholder={t("page.typePayment.form.sortOrderPlaceholder")}
                          {...field}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <div
                        className={`pt-2 flex items-center justify-between p-4 rounded-lg ${
                          field.value
                            ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                            : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                        }`}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              field.value
                                ? "bg-green-600 text-secondary"
                                : "bg-destructive/10 text-destructive"
                            }`}>
                            {field.value ? (
                              <Check size={20} />
                            ) : (
                              <span className="text-lg font-bold">⏻</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {t("common.status")}{" "}
                              {field.value ? t("common.active") : t("common.inactive")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {field.value
                                ? t("page.typePayment.form.statusActive")
                                : t("page.typePayment.form.statusInactive")}
                            </p>
                          </div>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
                  <Button
                    variant="danger"
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
                      className="w-full sm:w-auto justify-center">
                      {t("page.typePayment.form.saveAsDraft")}
                    </Button>
                    <Button
                      variant="success"
                      type="button"
                      disabled={createMutation.isLoading}
                      onClick={() => {
                        const data = form.getValues();
                        const missing = getMissingFields(data, formSchema, fieldLabels);
                        if (missing.length > 0) {
                          setMissingFieldsList(missing);
                          setMissingFieldsModal(true);
                          return;
                        }
                        setSaveConfirm(true);
                      }}
                      className="gap-2 w-full sm:w-auto justify-center">
                      <Save size={18} />
                      {createMutation.isLoading ? t("common.saving") : t("common.save")}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
            <Modal
              type="confirm"
              open={saveConfirm}
              onOpenChange={setSaveConfirm}
              title={t("common.confirmSave")}
              description={t("common.confirmSaveDesc")}
              confirmText={t("common.yesSave")}
              onConfirm={() => {
                setSaveConfirm(false);
                onSubmit(form.getValues(), false);
              }}
            />
          </Card>
        </div>
      </div>

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="success"
        open={successModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-type-payment?id=${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.typePayment.toast.addSuccess")}
        confirmText={t("modal.backToList")}
        onConfirm={() => setTimeout(() => navigate("/type-payment-list"), 150)}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.typePayment.form.draftTitle")}
        description={t("page.typePayment.form.draftDescription")}
        confirmText={t("page.typePayment.form.draftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          const v = form.getValues();
          onSubmit(v, true);
        }}
      />
      {createMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}
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
  );
};

export default AddTypePayment;

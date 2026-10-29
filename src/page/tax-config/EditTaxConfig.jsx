import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCookies } from "react-cookie";
import { X, Save, Check } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { editTaxConfig, getTaxConfigById } from "@/services/tax-config";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import i18next from "i18next";

const taxTypes = [
  { value: "ppn", label: "PPN" },
  {
    value: "other",
    get label() {
      return i18next.t("page.taxConfig.ui.incomeTaxPph");
    }
  },
  {
    value: "service_charge",
    get label() {
      return i18next.t("page.taxConfig.ui.nonTax");
    }
  }
];

const EditTaxConfigSkeleton = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          breadcrumbs={[
            { i18nKey: "breadcrumb.home", href: "/dashboard-super-admin" },
            { i18nKey: "breadcrumb.tax", href: "/tax-list" },
            { i18nKey: "page.taxConfig.edit.title" }
          ]}
          title={t("page.taxConfig.edit.title")}
          description={t("page.taxConfig.edit.description")}
          backLink="/tax-list">
          <UserGuide guideKey="add-tax" mode="edit" />
        </PageHeader>
      </div>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-20 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="flex justify-between items-center gap-4 bg-card border border-border rounded-xl p-4">
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
              <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const EditTaxConfig = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const { data: locationsData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || [];

  const formSchema = useMemo(() => {
    return z.object({
      name: z.string().min(1, t("page.taxConfig.validation.nameRequired")),
      type: z.string().min(1, t("page.taxConfig.validation.typeRequired")),
      rate: z.coerce.number().min(0, t("page.taxConfig.validation.rateNegative")),
      description: z.string().optional().or(z.literal("")),
      isActive: z.boolean().default(true),
      store: z.string().optional()
    });
  }, []);

  const [searchParams] = useSearchParams();
  const taxId = searchParams.get("id");
  const taxFieldLabels = {
    name: "Nama Pajak",
    type: "Tipe Pajak",
    rate: "Tarif Pajak"
  };

  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const {
    data: taxData,
    isLoading,
    isError,
    refetch
  } = useQuery(["tax-config-detail", taxId], () => getTaxConfigById({ id: taxId }), {
    enabled: !!taxId
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      type: "PPN",
      rate: 0,
      description: "",
      isActive: true,
      store: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/tax-list",
    () => setCancelModal(true),
    form
  );

  const tax = taxData?.data || {};

  useEffect(() => {
    if (tax?.id) {
      form.reset({
        name: tax.name || "",
        type: tax.type || "ppn",
        rate: tax.rate || 0,
        description: tax.description || "",
        isActive: tax.status === "active",
        store: tax.store ? String(tax.store) : ""
      });
    }
  }, [tax, form]);

  const updateMutation = useMutation(editTaxConfig, {
    onSuccess: () => {
      queryClient.invalidateQueries(["tax-configs"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.taxConfig.toast.updateFailed")
      );
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    const { isActive, store, ...rest } = values;
    updateMutation.mutate({
      id: taxId,
      ...rest,
      store: isSuperAdmin && store ? Number(store) : undefined,
      status: saveAsDraft ? "draft" : isActive ? "active" : "inactive"
    });
  };

  if (!taxId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.taxConfig.edit.notFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return <EditTaxConfigSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          breadcrumbs={[
            { i18nKey: "breadcrumb.home", href: "/dashboard-super-admin" },
            { i18nKey: "breadcrumb.tax", href: "/tax-list" },
            { i18nKey: "page.taxConfig.edit.title" }
          ]}
          title={t("page.taxConfig.edit.title")}
          description={t("page.taxConfig.edit.description")}
          backLink="/tax-list"
          onBack={requestLeave}>
          <UserGuide guideKey="add-tax" mode="edit" />
        </PageHeader>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("page.taxConfig.form.name")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Input
                      placeholder={t("page.taxConfig.form.namePlaceholder")}
                      {...field}
                      maxLength={FIELD_LIMITS.BUSINESS_NAME}
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
                      {t("page.taxConfig.form.type")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Combobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("page.taxConfig.form.type")}
                      searchPlaceholder={t("page.taxConfig.form.type")}
                      options={taxTypes}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("page.taxConfig.form.rate")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t("page.taxConfig.form.ratePlaceholder")}
                      {...field}
                    />
                    <FormMessage />
                    <FormDescription>{t("common.percentageHint")}</FormDescription>
                  </FormItem>
                )}
              />
              {isSuperAdmin && (
                <FormField
                  control={form.control}
                  name="store"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("page.taxConfig.form.store")}</FormLabel>
                      <Combobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("page.taxConfig.form.allStores")}
                        searchPlaceholder={t("page.taxConfig.form.store")}
                        options={[
                          { value: "", label: t("page.taxConfig.form.allStores") },
                          ...locations.map((loc) => ({ value: loc.id, label: loc.name }))
                        ]}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("page.taxConfig.form.storeHint")}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="isActive"
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
                            {field.value ? t("common.active") : t("common.inactive")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {field.value
                              ? t("page.taxConfig.form.activeDesc")
                              : t("page.taxConfig.form.inactiveDesc")}
                          </p>
                        </div>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.taxConfig.form.description")}</FormLabel>
                  <Textarea
                    placeholder={t("page.taxConfig.form.descriptionPlaceholder")}
                    rows={3}
                    {...field}
                    maxLength={FIELD_LIMITS.DESCRIPTION}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
              <Button
                variant="danger"
                onClick={requestLeave}
                className="gap-2 w-full sm:w-auto justify-center">
                <X size={18} />
                {t("common.cancel")}
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  type="button"
                  variant="draft"
                  onClick={() => setDraftModal(true)}
                  disabled={updateMutation.isLoading}
                  className="gap-2 w-full sm:w-auto justify-center">
                  <Save size={18} />
                  {t("common.saveAsDraft")}
                </Button>
                <Button
                  variant="success"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const values = form.getValues();
                    const missing = getMissingFields(values, formSchema, taxFieldLabels);
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
          </form>
        </Form>
        <Modal
          type="confirm"
          open={confirmSaveModal}
          onOpenChange={setConfirmSaveModal}
          title={t("common.confirmSave")}
          description={t("page.supplier.modal.confirmSaveDesc")}
          confirmText={t("common.confirm.yesSave")}
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
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.taxConfig.toast.updateSuccess")}
        confirmText={t("modal.backToList")}
        onConfirm={() => setTimeout(() => navigate("/tax-list"), 150)}
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
      {updateMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}
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

export default EditTaxConfig;

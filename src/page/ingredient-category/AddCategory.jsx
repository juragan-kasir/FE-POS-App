import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Save, X, Check, Info } from "lucide-react";
import { normalizePayload } from "@/lib/payload-normalizer";
import {
  addIngredientCategory,
  getIngredientCategoryById,
  editIngredientCategory
} from "@/services/ingredientCategory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import PageHeader from "@/components/ui/PageHeader";
import { useFormExit } from "@/hooks/useLeaveGuard";
import UserGuide from "@/components/organism/UserGuide";
import AbortController from "@/components/organism/abort-controller";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { createdId } from "@/utils/createdRecord";

const AddCategory = () => {
  const { t } = useTranslation();
  const formSchema = z.object({
    name: z.string().min(1, t("page.ingredientCategory.validation.nameRequired")),
    isActive: z.boolean()
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

  const [showCancel, setShowCancel] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [draftModal, setDraftModal] = useState(false);

  const categoryFieldLabels = {
    name: "Nama Kategori"
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: { name: "", isActive: true }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/ingredient-category",
    () => setShowCancel(true),
    form
  );

  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const {
    isLoading: loadingData,
    isError,
    refetch
  } = useQuery(["ingredient-category", editId], () => getIngredientCategoryById(editId), {
    enabled: isEdit,
    onSuccess: (res) => {
      const d = res.data;
      form.reset({
        name: d.name || "",
        isActive: d.status !== "inactive"
      });
    },
    onError: () => {
      toast.error(t("page.ingredientCategory.add.toastError"), {
        description: t("page.ingredientCategory.add.toastErrorDesc")
      });
      navigate("/ingredient-category");
    }
  });

  const createMutation = useMutation(addIngredientCategory, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["ingredient-categories"]);
      setShowSuccess(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const editMutation = useMutation(editIngredientCategory, {
    onSuccess: () => {
      queryClient.invalidateQueries(["ingredient-categories"]);
      setShowSuccess(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    const data = {
      name: values.name.trim(),
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    };
    const payload = normalizePayload(data, { isFormData: false });
    if (isEdit) {
      editMutation.mutate({ ...payload, id: editId });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isLoading || editMutation.isLoading;

  if (isError) return <AbortController refetch={refetch} />;

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
            label: t("page.ingredientCategory.add.breadcrumbCategory"),
            href: "/ingredient-category"
          },
          {
            label: isEdit
              ? t("page.ingredientCategory.add.breadcrumbEdit")
              : t("page.ingredientCategory.add.breadcrumbAdd"),
            i18nKey: isEdit
              ? "page.ingredientCategory.add.breadcrumbEdit"
              : "page.ingredientCategory.add.breadcrumbAdd"
          }
        ]}
        title={
          isEdit
            ? t("page.ingredientCategory.add.titleEdit")
            : t("page.ingredientCategory.add.titleAdd")
        }
        description={
          isEdit
            ? t("page.ingredientCategory.add.subtitleEdit")
            : t("page.ingredientCategory.add.subtitleAdd")
        }
        backLink="/ingredient-category"
        onBack={requestLeave}>
        <UserGuide guideKey={isEdit ? "edit-ingredient-category" : "add-ingredient-category"} />
      </PageHeader>

      <Form {...form} className="p-6">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-base font-semibold text-foreground mb-6">
                  {t("page.ingredientCategory.add.namaKategori")}
                </h3>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.ingredientCategory.add.namaKategori")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          {...field}
                          placeholder={t("page.ingredientCategory.add.placeholderNama")}
                          className="h-12"
                          maxLength={FIELD_LIMITS.SHORT_LABEL}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.ingredientCategory.add.status")}
                        </FormLabel>
                        <div
                          className={`pt-2 flex items-center justify-between p-4 rounded-lg ${
                            form.watch("isActive")
                              ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                          }`}>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                form.watch("isActive")
                                  ? "bg-green-600 text-secondary"
                                  : "bg-destructive/10 text-destructive"
                              }`}>
                              {form.watch("isActive") ? (
                                <Check size={20} />
                              ) : (
                                <span className="text-lg font-bold">⏻</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {form.watch("isActive")
                                  ? t("page.ingredientCategory.add.active")
                                  : t("page.ingredientCategory.add.inactive")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {form.watch("isActive")
                                  ? t("page.ingredientCategory.add.statusActiveDesc")
                                  : t("page.ingredientCategory.add.statusInactiveDesc")}
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
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
            <Button
              type="button"
              variant="success"
              onClick={requestLeave}
              className="w-full sm:w-auto justify-center">
              <X size={16} className="mr-1" />
              {t("page.ingredientCategory.add.cancelButton")}
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Button
                type="button"
                variant="draft"
                onClick={() => setDraftModal(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto justify-center">
                {t("common.saveAsDraft")}
              </Button>
              <Button
                variant="success"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const values = form.getValues();
                  const missing = getMissingFields(values, formSchema, categoryFieldLabels);
                  if (missing.length > 0) {
                    setMissingFieldsList(missing);
                    setMissingFieldsModal(true);
                    return;
                  }
                  setConfirmSaveModal(true);
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto justify-center">
                <Save size={16} className="mr-1" />
                {isSubmitting
                  ? t("page.ingredientCategory.add.savingButton")
                  : isEdit
                    ? t("page.ingredientCategory.add.saveChangesButton")
                    : t("page.ingredientCategory.add.saveButton")}
              </Button>
            </div>
          </div>

          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Info size={18} className="text-primary text-base" />
              <span className="text-sm font-semibold text-primary">
                {t("page.ingredientCategory.add.tipsPenamaan")}
              </span>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                {t("page.ingredientCategory.add.tip1a")}{" "}
                <span className="text-foreground font-medium">
                  {t("page.ingredientCategory.add.tip1b")}
                </span>{" "}
                {t("page.ingredientCategory.add.tip1c")}{" "}
                <span className="text-foreground font-medium">
                  {t("page.ingredientCategory.add.tip1d")}
                </span>{" "}
                {t("page.ingredientCategory.add.tip1e")}{" "}
                <span className="text-foreground font-medium">
                  {t("page.ingredientCategory.add.tip1f")}
                </span>
                .
              </p>
              <p>
                {t("page.ingredientCategory.add.tip2a")}{" "}
                <span className="text-foreground font-medium">
                  {t("page.ingredientCategory.add.tip2b")}
                </span>{" "}
                {t("page.ingredientCategory.add.tip2c")}
              </p>
              <p>
                {t("page.ingredientCategory.add.tip3a")}{" "}
                <span className="text-foreground font-medium">
                  {t("page.ingredientCategory.add.tip3b")}
                </span>{" "}
                {t("page.ingredientCategory.add.tip3c")}
              </p>
            </div>
          </div>
        </form>
      </Form>

      {(isSubmitting || loadingData) && (
        <Loading fullscreen size="lg" label={t("page.ingredientCategory.add.loadingLabel")} />
      )}

      <Modal
        type="success"
        open={showSuccess}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-ingredient-category?id=${createdRecordId}`)}
        onOpenChange={setShowSuccess}
        title={
          isEdit
            ? t("page.ingredientCategory.add.modalSuccessTitleEdit")
            : t("page.ingredientCategory.add.modalSuccessTitleAdd")
        }
        onConfirm={() => {
          queryClient.invalidateQueries(["ingredient-categories"]);
          setTimeout(() => navigate("/ingredient-category"), 150);
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
      <Modal
        type="confirm"
        open={showCancel}
        onOpenChange={setShowCancel}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
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
      <Modal
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title="Konfirmasi Simpan"
        description="Apakah Anda yakin ingin menyimpan data ini?"
        confirmText="Ya, Simpan"
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
    </div>
  );
};

export default AddCategory;

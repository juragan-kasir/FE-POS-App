import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { editShiftTemplate, getShiftTemplateById } from "@/services/shiftTemplate";
import { sanitizeInput } from "@/utils/inputSanitizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loading } from "@/components/ui/loading";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl
} from "@/components/ui/form";
import { Check, BadgeCheck, X, Save } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { useLeaveGuard } from "@/hooks/useLeaveGuard";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const EditShiftTemplate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("id");
  const [draftModal, setDraftModal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [cancelModal, setCancelModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const fieldLabels = useMemo(
    () => ({
      name: t("page.shiftTemplate.form.name"),
      startTime: t("page.shiftTemplate.form.startTime"),
      endTime: t("page.shiftTemplate.form.endTime")
    }),
    [t]
  );

  const formSchema = z
    .object({
      name: z.string().min(1, t("page.shiftTemplate.validation.nameRequired")),
      startTime: z.string().min(1, t("page.shiftTemplate.validation.startTimeRequired")),
      endTime: z.string().min(1, t("page.shiftTemplate.validation.endTimeRequired")),
      description: z.string().optional().or(z.literal("")),
      isActive: z.boolean().default(true)
    })
    .refine((data) => data.startTime !== data.endTime, {
      message: t("page.shiftTemplate.validation.timeDifferent"),
      path: ["endTime"]
    });

  const {
    data: templateData,
    isLoading,
    isError,
    refetch
  } = useQuery(
    ["shift-template-detail", templateId],
    () => getShiftTemplateById({ id: templateId }),
    { enabled: !!templateId }
  );
  const template = templateData?.data || null;

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      startTime: "",
      endTime: "",
      description: "",
      isActive: true
    }
  });
  const requestLeave = useLeaveGuard(form, "/shift-template-list", () => setCancelModal(true));

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name || "",
        startTime: template.startTime?.slice(0, 5) || "",
        endTime: template.endTime?.slice(0, 5) || "",
        description: template.description || "",
        isActive: template.status === "active"
      });
    }
  }, [template, form]);

  const editMutation = useMutation(editShiftTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries(["shift-templates"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    editMutation.mutate({
      id: templateId,
      name: sanitizeInput(values.name),
      startTime: values.startTime,
      endTime: values.endTime,
      description: sanitizeInput(values.description),
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    });
  };

  if (!templateId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <BadgeCheck size={36} className="text-4xl" />
        <p>{t("page.shiftTemplate.detail.idNotFound")}</p>
        <Button variant="danger" onClick={() => navigate("/shift-template-list")}>
          {t("page.shiftTemplate.button.back")}
        </Button>
      </div>
    );
  }

  if (isLoading) return <Loading fullscreen size="lg" label={t("common.loadingData")} />;
  if (isError) return <AbortController refetch={refetch} />;

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <BadgeCheck size={36} className="text-4xl" />
        <p>{t("page.shiftTemplate.detail.notFound")}</p>
        <Button variant="danger" onClick={() => navigate("/shift-template-list")}>
          {t("page.shiftTemplate.button.back")}
        </Button>
      </div>
    );
  }

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
            label: t("page.shiftTemplate.list.title"),
            href: "/shift-template-list"
          },
          { label: t("page.shiftTemplate.edit.title") }
        ]}
        title={t("page.shiftTemplate.edit.title")}
        description={t("page.shiftTemplate.edit.description")}
        backLink="/shift-template-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-shift-template" mode="edit" />
      </PageHeader>

      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.shiftTemplate.form.name")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <BadgeCheck
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base"
                        />
                        <Input
                          {...field}
                          placeholder={t("page.shiftTemplate.form.namePlaceholder")}
                          className="pl-9"
                          maxLength={FIELD_LIMITS.SHORT_LABEL}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.shiftTemplate.form.startTime")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <TimePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.shiftTemplate.form.endTime")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <TimePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
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
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.shiftTemplate.form.description")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("page.shiftTemplate.form.descPlaceholder")}
                      rows={3}
                      className="resize-none"
                      maxLength={FIELD_LIMITS.DESCRIPTION}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <div
                    className={`pt-2 flex items-center justify-between p-4 rounded-lg mb-5 ${
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
                          {field.value
                            ? t("page.shiftTemplate.form.statusActive")
                            : t("page.shiftTemplate.form.statusInactive")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {field.value
                            ? t("page.shiftTemplate.form.activeDesc")
                            : t("page.shiftTemplate.form.inactiveDesc")}
                        </p>
                      </div>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="danger" onClick={requestLeave} className="gap-2">
                <X size={20} className="text-lg" />
                {t("common.cancel")}
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="draft"
                  onClick={() => setDraftModal(true)}
                  disabled={editMutation.isLoading}>
                  {t("common.saveAsDraft")}
                </Button>
                <Button
                  variant="success"
                  type="button"
                  disabled={editMutation.isLoading}
                  onClick={() => {
                    const data = form.getValues();
                    const missing = getMissingFields(data, formSchema, fieldLabels);
                    if (missing.length > 0) {
                      setMissingFields(missing);
                      setMissingFieldsModal(true);
                      return;
                    }
                    setSaveConfirm(true);
                  }}
                  className="gap-2 shadow-lg shadow-primary/20">
                  <Save size={20} className="text-lg" />
                  {t("page.shiftTemplate.button.saveChanges")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>

      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("common.saveAsDraftTitle")}
        description={t("common.saveAsDraftDesc")}
        confirmText={t("common.yesSaveDraft")}
        onConfirm={() => {
          setDraftModal(false);
          onSubmit(form.getValues(), true);
        }}
      />
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
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFields}
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
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.shiftTemplate.toast.updateSuccess")}
        onConfirm={() => {
          setSuccessModal(false);
          setTimeout(() => navigate("/shift-template-list"), 150);
        }}
      />

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => {
          setCancelModal(false);
          setTimeout(() => navigate("/shift-template-list"), 150);
        }}
      />
    </div>
  );
};

export default EditShiftTemplate;

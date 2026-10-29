import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { addShiftTemplate } from "@/services/shiftTemplate";
import { sanitizeInput } from "@/utils/inputSanitizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/ui/loading";
import { Switch } from "@/components/ui/switch";
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
import { useFormExit } from "@/hooks/useLeaveGuard";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { createdId } from "@/utils/createdRecord";

const AddShiftTemplate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftModal, setDraftModal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [cancelModal, setCancelModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
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
  const { request: requestLeave, leave } = useFormExit(
    "/shift-template-list",
    () => setCancelModal(true),
    form
  );

  const createMutation = useMutation(addShiftTemplate, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["shift-templates"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    createMutation.mutate({
      name: sanitizeInput(values.name),
      startTime: values.startTime,
      endTime: values.endTime,
      description: sanitizeInput(values.description),
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { i18nKey: "sidebar.section.membershipSdm" },
          { i18nKey: "page.shiftTemplate.list.title" },
          { i18nKey: "page.shiftTemplate.add.title" }
        ]}
        title={t("page.shiftTemplate.add.title")}
        description={t("page.shiftTemplate.add.description")}
        backLink="/shift-template-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-shift-template" />
      </PageHeader>

      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.shiftTemplate.form.name")} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="group relative">
                      <BadgeCheck
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base transition-colors group-focus-within:text-emerald-600"
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
              <Button
                type="button"
                variant="danger"
                onClick={requestLeave}
                className="gap-2 w-full sm:w-auto justify-center">
                <X size={20} className="text-lg" />
                {t("common.cancel")}
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  type="button"
                  variant="draft"
                  className="w-full sm:w-auto justify-center"
                  onClick={() => setDraftModal(true)}
                  disabled={createMutation.isLoading}>
                  {t("common.saveAsDraft")}
                </Button>
                <Button
                  variant="success"
                  type="button"
                  disabled={createMutation.isLoading}
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
                  className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto justify-center">
                  <Save size={20} className="text-lg" />
                  {t("page.shiftTemplate.button.save")}
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
        fields={missingFields}
      />

      <Modal
        type="success"
        open={successModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-shift-template?id=${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.shiftTemplate.toast.addSuccess")}
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
          setTimeout(leave, 150);
        }}
      />
    </div>
  );
};

export default AddShiftTemplate;

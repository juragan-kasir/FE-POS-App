import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { addDepartment } from "@/services/department";
import { sanitizeInput } from "@/utils/inputSanitizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/ui/loading";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl
} from "@/components/ui/form";
import { Check, Building2, X, Save } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useFormExit } from "@/hooks/useLeaveGuard";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { createdId } from "@/utils/createdRecord";

const AddDepartment = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftModal, setDraftModal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [cancelModal, setCancelModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const departmentFieldLabels = useMemo(
    () => ({
      name: t("page.department.form.name"),
      description: t("page.department.form.description")
    }),
    [t]
  );

  const formSchema = z.object({
    name: z.string().min(1, t("page.department.validation.nameRequired")),
    description: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true)
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: { name: "", description: "", isActive: true }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/department-list",
    () => setCancelModal(true),
    form
  );

  const createMutation = useMutation(addDepartment, {
    onSuccess: (res) => {
      const id = createdId(res);
      toast.success(t("common.success"), {
        description: t("page.department.toast.addSuccess"),
        action: id
          ? {
              label: t("common.viewDetail"),
              onClick: () => navigate(`/detail-department?id=${id}`)
            }
          : undefined
      });
      queryClient.invalidateQueries(["departments"]);
      navigate("/department-list");
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    createMutation.mutate({
      name: sanitizeInput(values.name),
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
          { i18nKey: "breadcrumb.employee" },
          { i18nKey: "breadcrumb.department" },
          { i18nKey: "page.department.add.title" }
        ]}
        title={t("page.department.add.title")}
        description={t("page.department.add.description")}
        backLink="/department-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-department" />
      </PageHeader>

      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.department.form.name")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="group relative">
                        <Building2
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base transition-colors group-focus-within:text-emerald-600"
                        />
                        <Input
                          {...field}
                          placeholder={t("page.department.form.namePlaceholder")}
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.department.form.description")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("page.department.form.descPlaceholder")}
                      rows={4}
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
                            ? t("page.department.form.statusActive")
                            : t("page.department.form.statusInactive")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {field.value
                            ? t("page.department.form.activeDesc")
                            : t("page.department.form.inactiveDesc")}
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
                    const missing = getMissingFields(data, formSchema, departmentFieldLabels);
                    if (missing.length > 0) {
                      setMissingFields(missing);
                      setMissingFieldsModal(true);
                      return;
                    }
                    setSaveConfirm(true);
                  }}
                  className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto justify-center">
                  <Save size={20} className="text-lg" />
                  {t("page.department.button.save")}
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

export default AddDepartment;

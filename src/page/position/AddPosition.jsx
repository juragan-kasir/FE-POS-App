import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { normalizePayload } from "@/lib/payload-normalizer";
import { addPosition } from "@/services/position";
import { getAllDepartment } from "@/services/department";
import { sanitizeInput } from "@/utils/inputSanitizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Check, BadgeCheck, Plus, Building2, Info, X, Save } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useFormExit } from "@/hooks/useLeaveGuard";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import DepartmentPositions from "@/components/organism/DepartmentPositions";
import { getMissingFields } from "@/lib/validation";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const AddPosition = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const formSchema = z.object({
    name: z.string().min(1, t("page.position.validation.nameRequired")),
    department: z.string().min(1, t("page.position.validation.departmentRequired")),
    description: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true)
  });

  const { data: departmentsData, isLoading: deptLoading } = useQuery(
    ["departments-all"],
    () => getAllDepartment(),
    {}
  );
  const departments = departmentsData?.data || departmentsData?.departments || [];

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: { name: "", department: "", description: "", isActive: true }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/position-list",
    () => setCancelModal(true),
    form
  );

  const positionFieldLabels = {
    name: "Nama Posisi",
    department: "Departemen"
  };

  const createMutation = useMutation(addPosition, {
    onSuccess: () => {
      toast.success(t("common.success"), { description: t("page.position.toast.added") });
      queryClient.invalidateQueries(["positions"]);
      queryClient.invalidateQueries(["positions-by-department"]);
      navigate("/position-list");
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    const data = {
      name: sanitizeInput(values.name),
      departmentId: values.department ? Number(values.department) : null,
      description: sanitizeInput(values.description),
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    };
    const payload = normalizePayload(data, { isFormData: false });
    createMutation.mutate(payload);
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
          { i18nKey: "breadcrumb.hrm" },
          { i18nKey: "breadcrumb.position" },
          { i18nKey: "page.position.add.title" }
        ]}
        title={t("page.position.add.title")}
        description={t("page.position.add.description")}
        backLink="/position-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-position" />
      </PageHeader>

      {deptLoading ? (
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.position.form.name")} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <BadgeCheck
                              size={18}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base"
                            />
                            <Input
                              {...field}
                              placeholder={t("page.position.form.namePlaceholder")}
                              className="pl-9"
                              maxLength={FIELD_LIMITS.SHORT_LABEL}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.position.form.department")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          {departments.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg bg-muted/20">
                              <div className="text-center flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Building2 size={28} className="text-primary" />
                                </div>
                                <p className="text-sm font-medium text-foreground">
                                  {t("page.position.empty.noDepartments")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {t("page.position.empty.addDepartmentFirst")}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="success"
                                size="sm"
                                onClick={() => navigate("/add-department")}
                                className="gap-2">
                                <Plus size={18} className="text-base" />
                                {t("page.position.button.addDepartment")}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <Building2
                                  size={18}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base z-10"
                                />
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="pl-9">
                                    <SelectValue
                                      placeholder={t("page.position.form.departmentPlaceholder")}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((d) => (
                                      <SelectItem key={d.id} value={String(d.id)}>
                                        {d.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                type="button"
                                variant="success"
                                size="icon"
                                className="shrink-0 mt-0.5"
                                onClick={() => navigate("/add-department")}
                                title={t("page.position.button.addDepartmentNew")}>
                                <Plus size={18} className="text-base" />
                              </Button>
                            </div>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DepartmentPositions departmentId={form.watch("department")} />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("page.position.form.description")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t("page.position.form.descriptionPlaceholder")}
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
                              {t("common.status")}{" "}
                              {field.value ? t("common.active") : t("common.inactive")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {field.value
                                ? t("page.position.form.statusActive")
                                : t("page.position.form.statusInactive")}
                            </p>
                          </div>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="mt-6 p-4 bg-muted rounded-xl flex items-start gap-3 border-l-4 border-amber-300">
                  <Info size={18} className="text-amber-700 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      {t("page.position.add.securityNote")}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t("page.position.add.securityDescription")}
                    </p>
                  </div>
                </div>

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
                      onClick={() => setDraftModal(true)}
                      disabled={createMutation.isLoading}
                      className="w-full sm:w-auto justify-center">
                      {t("page.position.button.saveDraft")}
                    </Button>
                    <Button
                      variant="success"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const values = form.getValues();
                        const missing = getMissingFields(values, formSchema, positionFieldLabels);
                        if (missing.length > 0) {
                          setMissingFieldsList(missing);
                          setMissingFieldsModal(true);
                          return;
                        }
                        setConfirmSaveModal(true);
                      }}
                      disabled={createMutation.isLoading}
                      className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto justify-center">
                      <Save size={20} className="text-lg" />
                      {t("page.position.button.save")}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      )}

      {createMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}

      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.position.add.draftTitle")}
        description={t("page.position.add.draftDescription")}
        confirmText={t("page.position.add.draftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          onSubmit(form.getValues(), true);
        }}
      />

      <Modal
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title={t("common.confirmSave")}
        description={t("common.confirmSaveDesc")}
        confirmText={t("common.yesSave")}
        onConfirm={() => {
          setConfirmSaveModal(false);
          onSubmit(form.getValues(), false);
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

export default AddPosition;

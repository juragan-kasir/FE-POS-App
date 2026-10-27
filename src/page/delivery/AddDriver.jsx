import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, FileEdit, Info, X } from "lucide-react";
import { toast } from "sonner";
import { createDriver } from "@/services/delivery";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";

const AddDriver = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  const driverFieldLabels = useMemo(
    () => ({
      name: t("page.delivery.driver.form.name"),
      phone: t("page.delivery.driver.form.phone"),
      email: t("page.delivery.driver.form.email"),
      vehicleType: t("page.delivery.driver.form.vehicleType"),
      vehiclePlate: t("page.delivery.driver.form.vehiclePlate")
    }),
    [t]
  );

  const schema = z.object({
    name: z.string().min(1, t("page.delivery.driver.validation.nameRequired")),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    vehicleType: z.string().optional(),
    vehiclePlate: z.string().optional(),
    status: z.string().default("active"),
    notes: z.string().optional()
  });

  const activeRequiredSchema = z.object({
    name: z.string().min(1, t("page.delivery.driver.validation.nameRequired")),
    phone: z.string().min(1, t("page.delivery.driver.validation.phoneRequired")),
    email: z.string().email().optional().or(z.literal("")),
    vehicleType: z.string().min(1, t("page.delivery.driver.validation.vehicleTypeRequired")),
    vehiclePlate: z.string().min(1, t("page.delivery.driver.validation.vehiclePlateRequired")),
    status: z.string().default("active"),
    notes: z.string().optional()
  });

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      vehicleType: "",
      vehiclePlate: "",
      status: "active",
      notes: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/driver-list",
    () => setCancelModalOpen(true),
    form
  );

  const createMutation = useMutation(createDriver, {
    onSuccess: (res) => {
      const id = createdId(res);
      toast.success(t("common.success"), {
        description: t("page.delivery.driver.toast.addSuccess"),
        action: id
          ? { label: t("common.viewDetail"), onClick: () => navigate(`/detail-driver?id=${id}`) }
          : undefined
      });
      queryClient.invalidateQueries(["drivers"]);
      navigate("/driver-list");
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const onSubmit = (data) => {
    if (data.status === "active") {
      const missing = getMissingFields(data, activeRequiredSchema, driverFieldLabels);
      const result = activeRequiredSchema.safeParse(data);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          form.setError(err.path[0], { message: err.message });
        });
      }
      if (missing.length > 0) {
        setMissingFields(missing);
        setMissingFieldsModal(true);
        return;
      }
    }
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {createMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}
      <PageHeader
        breadcrumbs={[
          {
            href:
              user?.roleType === "super_admin"
                ? "/dashboard-super-admin"
                : user?.roleType === "admin"
                  ? "/dashboard-admin"
                  : "/home",
            i18nKey: "breadcrumb.home"
          },
          {
            href: "/driver-list",
            i18nKey: "sidebar.driver"
          },
          { i18nKey: "page.delivery.driver.add.title" }
        ]}
        title={t("page.delivery.driver.add.title")}
        description={t("page.delivery.driver.add.description")}
        backLink="/driver-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-driver" />
        <Button variant="danger" onClick={requestLeave}>
          {t("common.cancel")}
        </Button>
      </PageHeader>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">
              {t("page.delivery.driver.detail.name")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.name")} <span className="text-destructive">*</span>
                </label>
                <Input
                  unstyled
                  {...form.register("name")}
                  className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                  placeholder={t("page.delivery.driver.form.namePlaceholder")}
                  maxLength={FIELD_LIMITS.PERSON_NAME}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.phone")} <span className="text-destructive">*</span>
                </label>
                <Input
                  unstyled
                  {...form.register("phone")}
                  className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                  placeholder={t("page.delivery.driver.form.phonePlaceholder")}
                  maxLength={FIELD_LIMITS.PHONE}
                />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.phone.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{t("common.phoneHint")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.email")}
                </label>
                <Input
                  unstyled
                  {...form.register("email")}
                  className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                  placeholder={t("page.delivery.driver.form.emailPlaceholder")}
                  maxLength={FIELD_LIMITS.EMAIL}
                />
                <p className="text-xs text-muted-foreground mt-1">{t("common.optionalField")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.status")}
                </label>
                <Combobox
                  value={form.watch("status")}
                  onChange={(val) => form.setValue("status", val)}
                  placeholder={t("page.delivery.driver.form.status")}
                  searchPlaceholder={t("page.delivery.driver.form.status")}
                  options={[
                    { value: "active", label: t("page.delivery.driver.status.active") },
                    { value: "inactive", label: t("page.delivery.driver.status.inactive") },
                    { value: "draft", label: t("page.delivery.driver.status.draft") }
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">
              {t("page.delivery.driver.detail.vehicleType")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.vehicleType")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  unstyled
                  {...form.register("vehicleType")}
                  className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                  placeholder={t("page.delivery.driver.form.vehicleTypePlaceholder")}
                  maxLength={FIELD_LIMITS.SHORT_LABEL}
                />
                {form.formState.errors.vehicleType && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.vehicleType.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.vehiclePlate")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  unstyled
                  {...form.register("vehiclePlate")}
                  className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                  placeholder={t("page.delivery.driver.form.vehiclePlatePlaceholder")}
                  maxLength={FIELD_LIMITS.VEHICLE_PLATE}
                />
                {form.formState.errors.vehiclePlate && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.vehiclePlate.message}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.notes")}
                </label>
                <Textarea
                  unstyled
                  {...form.register("notes")}
                  className="mt-1 w-full h-20 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none resize-none"
                  placeholder={t("page.delivery.driver.form.notesPlaceholder")}
                  maxLength={FIELD_LIMITS.DESCRIPTION}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                {t("page.delivery.driver.form.tipsTitle")}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("page.delivery.driver.form.tipsContent")}
            </p>
          </div>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
        <Button
          variant="danger"
          onClick={requestLeave}
          className="gap-2 w-full sm:w-auto justify-center">
          <X size={18} />
          {t("common.cancel")}
        </Button>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            variant="draft"
            onClick={() => {
              form.setValue("status", "draft");
              const draftData = {
                name: form.getValues("name"),
                phone: form.getValues("phone") || undefined,
                email: form.getValues("email") || undefined,
                vehicleType: form.getValues("vehicleType") || undefined,
                vehiclePlate: form.getValues("vehiclePlate") || undefined,
                status: "draft",
                notes: form.getValues("notes") || undefined
              };
              createMutation.mutate(draftData);
            }}
            disabled={createMutation?.isLoading}
            className="gap-2 w-full sm:w-auto justify-center">
            <FileEdit size={18} />
            {t("common.saveDraft")}
          </Button>
          <Button
            variant="success"
            onClick={() => {
              const currentStatus = form.getValues("status");
              if (currentStatus === "active") {
                const data = form.getValues();
                const result = activeRequiredSchema.safeParse(data);
                if (!result.success) {
                  result.error.errors.forEach((err) => {
                    form.setError(err.path[0], { message: err.message });
                  });
                  return;
                }
              }
              form.handleSubmit(onSubmit)();
            }}
            disabled={createMutation?.isLoading}
            className="gap-2 w-full sm:w-auto justify-center">
            <Save size={18} />
            {createMutation?.isLoading ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>

      <Modal
        type="confirm"
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        title={t("page.delivery.driver.modal.cancelTitle")}
        description={t("page.delivery.driver.modal.cancelDescription")}
        confirmText={t("page.delivery.driver.modal.confirmCancel")}
        onConfirm={() => setTimeout(leave, 150)}
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
    </div>
  );
};

export default AddDriver;

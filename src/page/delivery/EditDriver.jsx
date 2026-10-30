import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, FileEdit, Info, X } from "lucide-react";
import { toast } from "sonner";
import { getDriverById, updateDriver } from "@/services/delivery";
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
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const EditDriver = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const id = searchParams.get("id");
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

  const { data, isLoading } = useQuery(["driver", id], () => getDriverById(id), { enabled: !!id });

  const schema = z.object({
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

  useEffect(() => {
    if (data?.data) {
      const d = data.data;
      form.reset({
        name: d.name || "",
        phone: d.phone || "",
        email: d.email || "",
        vehicleType: d.vehicleType || "",
        vehiclePlate: d.vehiclePlate || "",
        status: d.status || "active",
        notes: d.notes || ""
      });
    }
  }, [data, form]);

  const updateMutation = useMutation((payload) => updateDriver(payload, id), {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.delivery.driver.toast.updateSuccess")
      });
      queryClient.invalidateQueries(["drivers"]);
      queryClient.invalidateQueries(["driver", id]);
      navigate("/driver-list");
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const onSubmit = (data) => {
    const missing = getMissingFields(data, schema, driverFieldLabels);
    if (missing.length > 0) {
      setMissingFields(missing);
      setMissingFieldsModal(true);
      return;
    }
    updateMutation.mutate(data);
  };

  if (isLoading) return <Loading fullscreen size="lg" label={t("common.loading")} />;

  return (
    <div className="space-y-6">
      {updateMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}
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
          { i18nKey: "page.delivery.driver.edit.title" }
        ]}
        title={t("page.delivery.driver.edit.title")}
        description={t("page.delivery.driver.edit.description")}
        backLink="/driver-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-driver" mode="edit" />
        <Button variant="outline" onClick={requestLeave}>
          {t("common.cancel")}
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">
              {t("page.delivery.driver.detail.name")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-driver-name" className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.name")} <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-driver-name"
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
                <label htmlFor="edit-driver-phone" className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.phone")} <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-driver-phone"
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
                <label htmlFor="edit-driver-email" className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.email")}
                </label>
                <Input
                  id="edit-driver-email"
                  unstyled
                  {...form.register("email")}
                  className="mt-1 w-full h-10 px-3 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none"
                  placeholder={t("page.delivery.driver.form.emailPlaceholder")}
                  maxLength={FIELD_LIMITS.EMAIL}
                />
                <p className="text-xs text-muted-foreground mt-1">{t("common.optionalField")}</p>
              </div>
              <div>
                <label htmlFor="edit-driver-status" className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.status")}
                </label>
                <Combobox
                  id="edit-driver-status"
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
                <label
                  htmlFor="edit-driver-vehicle-type"
                  className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.vehicleType")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-driver-vehicle-type"
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
                <label
                  htmlFor="edit-driver-vehicle-plate"
                  className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.vehiclePlate")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  id="edit-driver-vehicle-plate"
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
                <label htmlFor="edit-driver-notes" className="text-sm font-medium text-foreground">
                  {t("page.delivery.driver.form.notes")}
                </label>
                <Textarea
                  id="edit-driver-notes"
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
          variant="outline"
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
              form.handleSubmit(onSubmit)();
            }}
            disabled={updateMutation?.isLoading}
            className="gap-2 w-full sm:w-auto justify-center">
            <FileEdit size={18} />
            {t("common.saveDraft")}
          </Button>
          <Button
            variant="success"
            onClick={() => form.handleSubmit(onSubmit)()}
            disabled={updateMutation?.isLoading}
            className="gap-2 w-full sm:w-auto justify-center">
            <Save size={18} />
            {updateMutation?.isLoading ? t("common.saving") : t("common.save")}
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

export default EditDriver;

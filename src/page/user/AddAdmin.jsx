import {
  Eye,
  EyeOff,
  Info,
  ShieldCheck,
  BarChart3,
  Package,
  Image,
  ArrowLeft,
  Save
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { z } from "zod";
import { toast } from "sonner";

import { addEmployee } from "@/services/employee";
import { getAllRole } from "@/services/role";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Combobox } from "@/components/ui/combobox";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { normalizePayload } from "@/lib/payload-normalizer";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Input } from "@/components/ui/input";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { FieldError } from "@/components/ui/field-error";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const AddAdmin = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    locationId: "",
    role: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const { request: requestLeave, leave } = useFormExit("/user-list", () => setCancelModal(true));
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const adminFieldLabels = useMemo(
    () => ({
      name: t("page.user.form.name"),
      email: t("page.user.form.email"),
      password: t("page.user.form.password"),
      phoneNumber: t("page.user.form.phone"),
      locationId: t("page.user.form.location"),
      role: t("page.user.form.role")
    }),
    [t]
  );

  const adminFormSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1),
        email: z.string().min(1),
        password: z.string().min(1),
        phoneNumber: z.string().optional().or(z.literal("")),
        locationId: z.string().optional().or(z.literal("")),
        role: z.string().min(1)
      }),
    []
  );
  const { errors: fieldErrors, showErrors } = useFieldErrors(form, adminFormSchema);

  const { data: locationsData } = useLocations();
  const locations = locationsData?.data || locationsData?.locations || [];

  const { data: rolesData } = useQuery(["roles-all"], () => getAllRole(), {});
  const roles = rolesData?.data || rolesData?.roles || [];

  const createMutation = useMutation(addEmployee, {
    onSuccess: () => {
      queryClient.invalidateQueries(["admins", "users"]);
      setIsSubmitting(false);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
      setIsSubmitting(false);
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e, saveAsDraft = false) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role) {
      toast.error(t("common.error"), { description: t("page.user.addAdmin.validationRequired") });
      return;
    }
    setIsSubmitting(true);

    const payload = normalizePayload(
      {
        userName: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.password,
        phoneNumber: form.phoneNumber,
        store: form.locationId ? Number(form.locationId) : null,
        roleId: form.role ? Number(form.role) : null,
        userType: "admin",
        status: saveAsDraft ? "draft" : "active"
      },
      { isFormData: false }
    );

    createMutation.mutate(payload);
  };

  return (
    <div ref={dirtyRef}>
      <div>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeader
            breadcrumbs={[
              {
                label: t("breadcrumb.management"),
                href: "/dashboard-super-admin",
                i18nKey: "breadcrumb.management"
              },
              {
                label: t("page.user.adminList.title"),
                href: "/user-list",
                i18nKey: "page.user.adminList.title"
              },
              { label: t("page.user.addAdmin.title") }
            ]}
            title={t("page.user.addAdmin.title")}
            description={t("page.user.addAdmin.description")}
            onBack={requestLeave}
            dynamicInfo={false}>
            <UserGuide guideKey="add-user" />
          </PageHeader>
          <LoadErrorBanner />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 bg-card rounded-xl shadow-sm border border-border p-6">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="add-admin-name"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.user.form.name")}
                  </label>
                  <Input
                    id="add-admin-name"
                    unstyled
                    name="name"
                    aria-invalid={!!fieldErrors.name}
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none transition-all bg-background text-sm"
                    placeholder={t("page.user.form.namePlaceholder")}
                    maxLength={FIELD_LIMITS.PERSON_NAME}
                  />
                  <FieldError message={fieldErrors.name} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="add-admin-email"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.user.form.email")}
                  </label>
                  <Input
                    id="add-admin-email"
                    unstyled
                    name="email"
                    aria-invalid={!!fieldErrors.email}
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none transition-all bg-background text-sm"
                    placeholder={t("page.user.form.emailPlaceholder")}
                    maxLength={FIELD_LIMITS.EMAIL}
                  />
                  <FieldError message={fieldErrors.email} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="add-admin-password"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.user.form.password")}
                  </label>
                  <div className="relative">
                    <input
                      id="add-admin-password"
                      name="password"
                      aria-invalid={!!fieldErrors.password}
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none transition-all bg-background text-sm pr-10"
                      placeholder={t("page.user.form.passwordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                      {showPassword ? (
                        <Eye size={18} className="text-base" />
                      ) : (
                        <EyeOff size={18} className="text-base" />
                      )}
                    </button>
                  </div>
                  <FieldError message={fieldErrors.password} />
                  <p className="text-xs text-muted-foreground">{t("common.passwordMin6")}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="add-admin-phone"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.user.form.phone")}
                  </label>
                  <Input
                    id="add-admin-phone"
                    unstyled
                    name="phoneNumber"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none transition-all bg-background text-sm"
                    placeholder={t("page.user.form.phonePlaceholder")}
                    maxLength={FIELD_LIMITS.PHONE}
                  />
                  <p className="text-xs text-muted-foreground">{t("common.phoneHint")}</p>
                  <p className="text-xs text-muted-foreground">{t("common.optionalField")}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="add-admin-location"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.user.form.location")}
                  </label>
                  <Combobox
                    id="add-admin-location"
                    options={[
                      { value: "", label: t("page.user.form.locationPlaceholder") },
                      ...locations.map((loc) => ({ value: loc.id || loc._id, label: loc.name })),
                      { value: "all", label: t("page.user.form.locationAll") }
                    ]}
                    value={form.locationId}
                    onChange={(v) => setForm((prev) => ({ ...prev, locationId: v }))}
                    placeholder={t("page.user.form.locationPlaceholder")}
                    searchPlaceholder={t("common.search.location")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="add-admin-role"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.user.form.role")}
                  </label>
                  <Combobox
                    id="add-admin-role"
                    options={[
                      { value: "", label: t("page.user.form.rolePlaceholder") },
                      ...roles.map((role) => ({
                        value: String(role.id),
                        label: (role.name || role.role)
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())
                      }))
                    ]}
                    value={form.role}
                    onChange={(v) => setForm((prev) => ({ ...prev, role: v }))}
                    placeholder={t("page.user.form.rolePlaceholder")}
                    searchPlaceholder={t("common.search.role")}
                  />
                  <FieldError message={fieldErrors.role} />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <Info size={18} className="text-primary text-base mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("page.user.addAdmin.emailConfirmation")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("page.user.addAdmin.emailConfirmationDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="bg-primary/10 text-primary-foreground p-6 rounded-xl shadow-sm border border-primary/20 overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-base font-semibold text-primary mb-2">
                  {t("page.user.addAdmin.accessGuide")}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("page.user.addAdmin.accessGuideDesc")}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <ShieldCheck size={18} className="text-primary" />
                    <span>{t("page.user.addAdmin.superAdminRole")}</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <BarChart3 size={18} className="text-primary" />
                    <span>{t("page.user.addAdmin.financeRole")}</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-foreground">
                    <Package size={18} className="text-primary" />
                    <span>{t("page.user.addAdmin.inventoryRole")}</span>
                  </li>
                </ul>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <ShieldCheck size={180} className="text-[200px] text-primary" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                <Image size={48} className="text-5xl" />
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  {t("page.user.addAdmin.dataSecurity")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("page.user.addAdmin.dataSecurityDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
          <Button
            variant="outline"
            onClick={requestLeave}
            className="gap-2 w-full sm:w-auto justify-center">
            <ArrowLeft size={20} className="text-lg" />
            {t("page.user.button.back")}
          </Button>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button
              variant="draft"
              onClick={() => setDraftModal(true)}
              disabled={isSubmitting}
              className="gap-2 w-full sm:w-auto justify-center">
              <Save size={20} className="text-lg" />
              {t("common.saveAsDraft")}
            </Button>
            <Button
              variant="success"
              onClick={() => {
                const missing = getMissingFields(form, adminFormSchema, adminFieldLabels);
                if (missing.length > 0) {
                  showErrors();
                  setMissingFieldsList(missing);
                  setMissingFieldsModal(true);
                  return;
                }
                handleSubmit({ preventDefault: () => {} }, false);
              }}
              disabled={isSubmitting}
              className="gap-2 w-full sm:w-auto justify-center">
              <Save size={20} className="text-lg" />
              {t("page.user.button.save")}
            </Button>
          </div>
        </div>

        {isSubmitting && <Loading fullscreen size="lg" label={t("common.saving")} />}

        <Modal
          type="success"
          open={successModal}
          onOpenChange={setSuccessModal}
          title={t("common.success")}
          onConfirm={() => setTimeout(() => navigate("/user-list"), 150)}
        />
        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={setCancelModal}
          title={t("modal.cancelTitle")}
          confirmText={t("modal.yesCancel")}
          onConfirm={() => setTimeout(leave, 150)}
        />
        <Modal
          type="confirm"
          open={draftModal}
          onOpenChange={setDraftModal}
          title={t("common.saveAsDraftTitle")}
          description={t("common.saveAsDraftDesc")}
          confirmText={t("common.confirm.yesSaveDraft")}
          onConfirm={() => {
            setDraftModal(false);
            setIsSubmitting(true);
            createMutation.mutate({
              userName: form.name,
              email: form.email,
              password: form.password,
              confirmPassword: form.password,
              phoneNumber: form.phoneNumber,
              store: form.locationId ? Number(form.locationId) : null,
              userType: "admin",
              status: "draft"
            });
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
      </div>
    </div>
  );
};

export default AddAdmin;

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { z } from "zod";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { addRole } from "@/services/role";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import PermissionMatrix from "@/page/role/components/PermissionMatrix";
import {
  buildInitialPermissions,
  buildRoleAccessMenu,
  countGranted,
  getLeafItemsGrouped,
  setAllPermissions,
  togglePermissionValue,
  roleTypeLabelKey
} from "@/page/role/rolePermissions";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { markAllClean } from "@/lib/unsaved-changes-store";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { FieldError } from "@/components/ui/field-error";
import { createdId } from "@/utils/createdRecord";

// Role types a store account may create (super_admin: global accounts only).
const ROLE_TYPE_OPTIONS = ["admin", "kasir", "user"];

const AddRole = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  // The server decides the role's store: a store-bound account creates
  // roles for its own store, a global super admin creates global roles.
  const isStoreBound = cookie?.user?.store != null && cookie?.user?.store !== "";
  // What the role may DO is decided by its type on the server (taking
  // payments, opening the register, managing stock…); the menu matrix only
  // decides which pages it sees. Only a global super admin may create a
  // super admin role — the server refuses it for everyone else.
  const isGlobalSuperAdmin = cookie?.user?.roleType === "super_admin" && !isStoreBound;
  const roleTypeOptions = isGlobalSuperAdmin
    ? ["admin", "kasir", "user", "super_admin"]
    : ROLE_TYPE_OPTIONS;
  const [roleType, setRoleType] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const roleFieldLabels = useMemo(
    () => ({
      name: t("page.role.add.name"),
      description: t("page.role.add.description")
    }),
    [t]
  );

  const roleFormSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1),
        description: z.string().optional().or(z.literal(""))
      }),
    []
  );

  const groups = useMemo(() => getLeafItemsGrouped(), []);
  const { errors: fieldErrors, showErrors } = useFieldErrors({ name, description }, roleFormSchema);
  const [permissions, setPermissions] = useState(() => buildInitialPermissions(groups));

  const isDirty =
    name.trim() !== "" ||
    description.trim() !== "" ||
    roleType !== "" ||
    countGranted(permissions) > 0;
  useUnsavedChanges(isDirty && !successModal);

  const createMutation = useMutation(addRole, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["roles-all"]);
      queryClient.invalidateQueries(["roles"]);
      queryClient.invalidateQueries(["roles-table"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
      setIsSubmitting(false);
    }
  });

  const submit = (saveAsDraft = false) => {
    if (!name.trim()) {
      toast.error(t("common.error"), {
        description: t("page.role.add.nameRequired")
      });
      return;
    }
    if (!roleType) {
      toast.error(t("common.error"), {
        description: t("page.role.add.typeRequired")
      });
      return;
    }
    setIsSubmitting(true);
    // createdBy and store are set by the server; the type is chosen here.
    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      roleType,
      status: saveAsDraft ? "draft" : "active",
      accessMenu: buildRoleAccessMenu(permissions)
    });
  };

  const leave = () => {
    if (isDirty) setCancelModal(true);
    else navigate("/role-management");
  };

  return (
    <div ref={dirtyRef}>
      <div>
        <PageHeader
          breadcrumbs={[
            {
              label: t("page.role.detail.breadcrumbParent"),
              href: "/role-management",
              i18nKey: "page.role.detail.breadcrumbParent"
            },
            { label: t("page.role.add.title") }
          ]}
          title={t("page.role.add.title")}
          description={t("page.role.add.description")}
          onBack={leave}
          dynamicInfo={false}>
          <UserGuide guideKey="add-role" />
        </PageHeader>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} className="text-primary" aria-hidden="true" />
                <h3 className="text-base font-semibold text-foreground">
                  {t("page.role.detail.infoTitle")}
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="role-name"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.role.detail.nameLabel")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    unstyled
                    id="role-name"
                    value={name}
                    aria-invalid={!!fieldErrors.name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder={t("page.role.add.namePlaceholder")}
                    maxLength={FIELD_LIMITS.SHORT_LABEL}
                  />
                  <FieldError message={fieldErrors.name} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="role-description"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.role.edit.descLabel")}
                  </label>
                  <Textarea
                    unstyled
                    id="role-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                    placeholder={t("page.role.add.descPlaceholder")}
                    rows={5}
                    maxLength={FIELD_LIMITS.DESCRIPTION}
                  />
                </div>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.role.add.typeLabel")} <span className="text-destructive">*</span>
                  </legend>
                  <div
                    role="radiogroup"
                    aria-label={t("page.role.add.typeLabel")}
                    className="flex flex-col gap-2">
                    {roleTypeOptions.map((type) => {
                      const selected = roleType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setRoleType(type)}
                          className={`flex w-full flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}>
                          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span
                              aria-hidden="true"
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                selected ? "border-primary" : "border-muted-foreground/40"
                              }`}>
                              {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                            </span>
                            {t(roleTypeLabelKey(type))}
                          </span>
                          <span className="mt-0.5 pl-6 text-xs text-muted-foreground">
                            {t(`page.role.add.typeHint.${type}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="space-y-1 border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.role.scope.label")}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {isStoreBound ? t("page.role.scope.ownStore") : t("page.role.scope.global")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("page.role.add.scopeHint")}</p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-xl border border-primary/20">
              <h4 className="text-base font-semibold text-primary mb-2">
                {t("page.role.edit.guideTitle")}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("page.role.edit.guideDescription")}
              </p>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <PermissionMatrix
              groups={groups}
              permissions={permissions}
              onToggle={(href, action) =>
                setPermissions((prev) => togglePermissionValue(prev, href, action))
              }
              onSelectAll={(checked) => setPermissions((prev) => setAllPermissions(prev, checked))}
              footerNote={t("page.role.edit.footerNote")}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
          <Button variant="danger" onClick={leave} className="w-full sm:w-auto justify-center">
            {t("common.cancel")}
          </Button>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button
              variant="draft"
              onClick={() => setDraftModal(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto justify-center">
              {t("common.saveAsDraft")}
            </Button>
            <Button
              variant="success"
              onClick={() => {
                const missing = getMissingFields(
                  { name, description },
                  roleFormSchema,
                  roleFieldLabels
                );
                if (missing.length > 0) {
                  showErrors();
                  setMissingFieldsList(missing);
                  setMissingFieldsModal(true);
                  return;
                }
                submit(false);
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto justify-center">
              {t("page.role.add.saveRole")}
            </Button>
          </div>
        </div>

        {isSubmitting && <Loading fullscreen size="lg" label={t("common.saving")} />}

        <Modal
          type="success"
          open={successModal}
          secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
          onSecondary={() => navigate(`/detail-role/${createdRecordId}`)}
          onOpenChange={setSuccessModal}
          title={t("page.role.add.successTitle")}
          onConfirm={() => {
            setIsSubmitting(false);
            setTimeout(() => navigate("/role-management"), 150);
          }}
        />
        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={setCancelModal}
          title={t("modal.cancelTitle")}
          description={t("page.role.edit.discardDesc")}
          confirmText={t("modal.yesCancel")}
          onConfirm={() =>
            setTimeout(() => {
              // Confirmed here, so the router-level guard must not ask again.
              markAllClean();
              navigate("/role-management");
            }, 150)
          }
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
            submit(true);
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

export default AddRole;

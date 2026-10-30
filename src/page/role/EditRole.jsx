import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { z } from "zod";
import { toast } from "sonner";
import { Info, ShieldAlert, ShieldCheck, Plus, Minus } from "lucide-react";
import { editRole, getRoleById } from "@/services/role";
import { parseAccessMenuToPermissions } from "@/utils/permission";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import PermissionMatrix from "./components/PermissionMatrix";
import {
  actionLabelKeys,
  buildInitialPermissions,
  buildRoleEditPayload,
  diffPermissions,
  getLeafItemsGrouped,
  roleTypeLabelKey,
  setAllPermissions,
  togglePermissionValue
} from "./rolePermissions";
import { safeGet } from "@/lib/safe-lookup";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { markAllClean } from "@/lib/unsaved-changes-store";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { FieldError } from "@/components/ui/field-error";

const SUMMARY_LIMIT = 8;

const toStatusString = (status) =>
  typeof status === "string"
    ? status
    : status === true || status === undefined
      ? "active"
      : "inactive";

const EditRole = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const isSuperAdmin = cookie?.user?.roleType === "super_admin";
  const isGlobalSuperAdmin =
    isSuperAdmin && (cookie?.user?.store == null || cookie?.user?.store === "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState({});
  const [initial, setInitial] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [summaryModal, setSummaryModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);

  const roleFieldLabels = useMemo(
    () => ({
      name: t("page.role.edit.name"),
      description: t("page.role.edit.description")
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

  const {
    data: roleData,
    isLoading: isLoadingRole,
    isError,
    error,
    refetch
  } = useQuery(["role-by-id", id], () => getRoleById(id), {
    enabled: !!id,
    retry: (count, err) => ![403, 404].includes(err?.response?.status) && count < 2,
    onSuccess: (res) => {
      const role = res?.data || res;
      if (role) {
        const perms = buildInitialPermissions(
          groups,
          parseAccessMenuToPermissions(role.accessMenu),
          role.roleType
        );
        setName(role.name || "");
        setDescription(role.description || "");
        setPermissions(perms);
        setInitial({
          name: role.name || "",
          description: role.description || "",
          status: toStatusString(role.status),
          permissions: perms
        });
      }
    }
  });
  const role = roleData?.data || null;
  // D2 (BA DR-12 Q14): only the global super admin changes a built-in role;
  // the server refuses everyone else, so the editor is read-only for them.
  const isLocked = !!role?.isSystem && !isGlobalSuperAdmin;

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin && role?.store != null
  });
  const storeName =
    role?.store != null
      ? (locData?.data || []).find((loc) => Number(loc.id) === Number(role.store))?.name ||
        `#${role.store}`
      : null;

  const currentState = (saveAsDraft = false) => ({
    name: name.trim(),
    description: description.trim(),
    status: saveAsDraft ? "draft" : initial?.status,
    permissions
  });

  const buildPayload = (saveAsDraft = false) =>
    buildRoleEditPayload({
      id,
      initial,
      current: currentState(saveAsDraft),
      storedAccessMenu: role?.accessMenu,
      groups
    });

  const pendingPayload = initial ? buildPayload(false) : { id: Number(id) };
  const isDirty = !!initial && Object.keys(pendingPayload).length > 1;
  useUnsavedChanges(isDirty && !successModal);

  const changes = useMemo(
    () => (initial ? diffPermissions(groups, initial.permissions, permissions) : null),
    [groups, initial, permissions]
  );

  const editMutation = useMutation(editRole, {
    onSuccess: () => {
      queryClient.invalidateQueries(["roles-all"]);
      queryClient.invalidateQueries(["roles"]);
      queryClient.invalidateQueries(["roles-table"]);
      queryClient.invalidateQueries(["role-by-id", id]);
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
        description: t("page.role.edit.nameRequired")
      });
      return;
    }
    setIsSubmitting(true);
    editMutation.mutate(buildPayload(saveAsDraft));
  };

  const requestSave = () => {
    const missing = getMissingFields({ name, description }, roleFormSchema, roleFieldLabels);
    if (missing.length > 0) {
      showErrors();
      setMissingFieldsList(missing);
      setMissingFieldsModal(true);
      return;
    }
    if (!isDirty) {
      toast.info(t("page.role.edit.noChanges"));
      return;
    }
    setSummaryModal(true);
  };

  const leave = () => {
    if (isDirty) setCancelModal(true);
    else navigate("/role-management");
  };

  if (isError) {
    const status = error?.response?.status;
    if (status === 403 || status === 404) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <ShieldAlert size={40} className="text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">
              {t("page.role.detail.notFound")}
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              {t("page.role.edit.unavailableHint")}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/role-management")}>
            {t("page.role.edit.backToList")}
          </Button>
        </div>
      );
    }
    return <AbortController refetch={refetch} />;
  }

  if (isLoadingRole) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
        <div className="flex justify-end gap-3">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-card p-6 rounded-xl border border-border space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="divide-y divide-border">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="px-6 py-3 flex items-center gap-4">
                    <Skeleton className="h-4 w-40" />
                    {[...Array(6)].map((_, j) => (
                      <Skeleton key={j} className="h-4 w-10 mx-auto" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const actionLabel = (action) => t(safeGet(actionLabelKeys, action)) || action;
  const renderChangeList = (items, Icon, tone) => (
    <ul className="space-y-1">
      {items.slice(0, SUMMARY_LIMIT).map((c) => (
        <li key={`${c.href}:${c.action}`} className={`flex items-center gap-2 text-sm ${tone}`}>
          <Icon size={14} aria-hidden="true" />
          <span>
            {c.title} — {actionLabel(c.action)}
          </span>
        </li>
      ))}
      {items.length > SUMMARY_LIMIT && (
        <li className="text-xs text-muted-foreground">
          {t("page.role.summary.more", { count: items.length - SUMMARY_LIMIT })}
        </li>
      )}
    </ul>
  );

  return (
    <div ref={dirtyRef} className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("page.role.detail.breadcrumbParent"),
            href: "/role-management",
            i18nKey: "page.role.detail.breadcrumbParent"
          },
          { label: t("page.role.edit.title") }
        ]}
        title={`${t("page.role.edit.title")}: ${initial?.name || name}`}
        description={t("page.role.edit.description")}
        onBack={leave}
        dynamicInfo={false}>
        <UserGuide guideKey="edit-role" mode="edit" />
      </PageHeader>

      {role?.isSystem && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{t("page.role.edit.systemTitle")}</p>
            <p className="text-sm">
              {isLocked ? t("page.role.edit.systemLocked") : t("page.role.edit.systemHint")}
            </p>
          </div>
        </div>
      )}

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
                  data-tour="role-name"
                  value={name}
                  aria-invalid={!!fieldErrors.name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder={t("page.role.edit.namePlaceholder")}
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
                  data-tour="role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  placeholder={t("page.role.edit.descPlaceholder")}
                  rows={5}
                  maxLength={FIELD_LIMITS.DESCRIPTION}
                />
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.role.detail.typeLabel")}
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {t(roleTypeLabelKey(role?.roleType))}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.role.scope.label")}
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {storeName
                      ? t("page.role.scope.store", { name: storeName })
                      : t("page.role.scope.global")}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">{t("page.role.edit.typeLockedHint")}</p>
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
        <Button variant="outline" onClick={leave} className="w-full sm:w-auto justify-center">
          {t("common.cancel")}
        </Button>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {isDirty && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300" role="status">
              {t("page.role.edit.unsaved")}
            </span>
          )}
          <Button
            variant="draft"
            onClick={() => setDraftModal(true)}
            disabled={isSubmitting || isLocked}
            disabledReason={isSubmitting ? undefined : t("page.role.edit.systemLocked")}
            className="w-full sm:w-auto justify-center">
            {t("common.saveAsDraft")}
          </Button>
          <Button
            variant="success"
            data-tour="role-save"
            onClick={requestSave}
            disabled={isSubmitting || isLocked}
            disabledReason={isSubmitting ? undefined : t("page.role.edit.systemLocked")}
            className="w-full sm:w-auto justify-center">
            {t("page.role.edit.saveChanges")}
          </Button>
        </div>
      </div>

      {isSubmitting && <Loading fullscreen size="lg" label={t("common.saving")} />}

      <Modal
        type="form"
        open={summaryModal}
        onOpenChange={setSummaryModal}
        title={t("page.role.summary.title")}
        description={t("page.role.summary.description")}
        confirmText={t("page.role.edit.saveChanges")}
        loading={isSubmitting}
        onConfirm={() => submit(false)}>
        <div className="space-y-4">
          {pendingPayload.name !== undefined && (
            <p className="text-sm text-foreground">
              {t("page.role.summary.rename", { from: initial?.name, to: pendingPayload.name })}
            </p>
          )}
          {pendingPayload.description !== undefined && (
            <p className="text-sm text-foreground">{t("page.role.summary.descriptionChanged")}</p>
          )}
          {changes && changes.added.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                {t("page.role.summary.added", { count: changes.added.length })}
              </p>
              {renderChangeList(changes.added, Plus, "text-emerald-700 dark:text-emerald-300")}
            </div>
          )}
          {changes && changes.removed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
                {t("page.role.summary.removed", { count: changes.removed.length })}
              </p>
              {renderChangeList(changes.removed, Minus, "text-red-700 dark:text-red-300")}
            </div>
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {t("page.role.summary.relogin")}
          </p>
        </div>
      </Modal>
      <Modal
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("page.role.edit.successTitle")}
        onConfirm={() => {
          setIsSubmitting(false);
          setTimeout(() => navigate("/role-management"), 150);
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
        description={
          role?.userCount > 0 && initial?.status === "active"
            ? t("page.role.edit.draftInUse", { count: role.userCount })
            : t("common.saveAsDraftDesc")
        }
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
    </div>
  );
};

export default EditRole;

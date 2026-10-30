import { User, MapPin, Award, Trophy, Star, Info, ArrowLeft, Save } from "lucide-react";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { z } from "zod";
import { addMember } from "@/services/member";
import { getAllMemberTier } from "@/services/member-tier";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import Modal from "@/components/organism/modal";
import { useTranslation } from "react-i18next";
import UserGuide from "@/components/organism/UserGuide";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { FieldError } from "@/components/ui/field-error";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const formSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phoneNumber: z.string().min(1).max(16, "Max 16 characters"),
  birthDate: z.date(),
  gender: z.enum(["male", "female"]),
  address: z.string().optional().default(""),
  tier: z.number().nullable().optional().default(null),
  initialPoints: z.number().optional().default(0)
});

const AddMember = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies(["user"]);
  const user = cookie?.user;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const { request: requestLeave, leave } = useFormExit("/member-list", () => setCancelModal(true));
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    birthDate: undefined,
    gender: "male",
    address: "",
    tier: "",
    initialPoints: 0
  });
  const { errors: fieldErrors, showErrors } = useFieldErrors(form, formSchema);

  const memberFieldLabels = useMemo(
    () => ({
      name: t("page.member.add.fullName"),
      email: t("page.member.add.email"),
      phoneNumber: t("page.member.add.phoneNumber"),
      birthDate: t("page.member.add.dateOfBirth"),
      gender: t("page.member.add.gender"),
      address: t("page.member.add.fullAddress"),
      tier: t("page.member.add.membershipTier"),
      initialPoints: t("page.member.add.initialPoints")
    }),
    [t]
  );

  const { data: tiersData } = useQuery(
    ["member-tiers-active"],
    () => getAllMemberTier({ status: "active" }),
    {}
  );
  const tiers = tiersData?.data || tiersData?.tiers || [];

  const createMutation = useMutation(addMember, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      setIsSubmitting(false);
      queryClient.invalidateQueries(["members"]);
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
    const sanitized = name === "phoneNumber" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({
      ...prev,
      [name]: name === "tier" ? Number(sanitized) || null : sanitized
    }));
  };

  const handleSaveClick = (saveAsDraft = false) => {
    if (!saveAsDraft) {
      const missing = getMissingFields(form, formSchema, memberFieldLabels);
      if (missing.length > 0) {
        showErrors();
        setMissingFieldsList(missing);
        setMissingFieldsModal(true);
        return;
      }
    }
    setIsSubmitting(true);
    createMutation.mutate({
      nameMember: form.name,
      phoneNumber: form.phoneNumber,
      email: form.email || undefined,
      birthDate: form.birthDate ? format(form.birthDate, "yyyy-MM-dd") : "",
      gender: form.gender,
      address: form.address,
      tier: form.tier || null,
      point: form.initialPoints,
      store:
        user?.roleType === "super_admin"
          ? localStorage.getItem("globalStoreFilter") !== "all"
            ? localStorage.getItem("globalStoreFilter")
            : null
          : undefined,
      createdBy: user?.id,
      status: saveAsDraft ? "draft" : "active"
    });
  };

  return (
    <div ref={dirtyRef} className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.management") },
          { label: t("breadcrumb.add") }
        ]}
        title={t("breadcrumb.add")}
        description={t("page.member.add.description")}
        backLink="/member-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-member" />
      </PageHeader>
      <LoadErrorBanner />

      <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center gap-2 mb-6 text-primary">
                  <User size={18} />
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.member.form.personalInfo")}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="add-member-full-name"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.member.add.fullName")} <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="add-member-full-name"
                      unstyled
                      name="name"
                      aria-invalid={!!fieldErrors.name}
                      value={form.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none transition-all bg-background text-sm"
                      placeholder={t("page.member.add.namePlaceholder")}
                      required
                      maxLength={FIELD_LIMITS.PERSON_NAME}
                    />
                    <FieldError message={fieldErrors.name} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="add-member-email"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.member.add.email")}
                    </label>
                    <Input
                      id="add-member-email"
                      unstyled
                      name="email"
                      aria-invalid={!!fieldErrors.email}
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none transition-all bg-background text-sm"
                      placeholder={t("page.member.add.emailPlaceholder")}
                      maxLength={FIELD_LIMITS.EMAIL}
                    />
                    <FieldError message={fieldErrors.email} />
                    <p className="text-xs text-muted-foreground">{t("common.optionalField")}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="add-member-phone-number"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.member.add.phoneNumber")} <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="add-member-phone-number"
                      unstyled
                      name="phoneNumber"
                      aria-invalid={!!fieldErrors.phoneNumber}
                      type="tel"
                      value={form.phoneNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none transition-all bg-background text-sm"
                      placeholder={t("page.member.add.phonePlaceholder")}
                      maxLength={FIELD_LIMITS.PHONE}
                      required
                    />
                    <FieldError message={fieldErrors.phoneNumber} />
                    <p className="text-xs text-muted-foreground">{t("common.phoneHintMin")}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="add-member-date-of-birth"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.member.add.dateOfBirth")} <span className="text-destructive">*</span>
                    </label>
                    <DatePicker
                      id="add-member-date-of-birth"
                      date={form.birthDate}
                      setDate={(date) => setForm({ ...form, birthDate: date })}
                    />
                    <FieldError message={fieldErrors.birthDate} />
                  </div>
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
                    <label
                      htmlFor="add-member-gender"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("page.member.add.gender")}
                    </label>
                    <div className="flex gap-4">
                      <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                        <input
                          id="add-member-gender"
                          type="radio"
                          name="gender"
                          value="male"
                          checked={form.gender === "male"}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <User size={18} className="text-primary" />
                        <span className="text-sm font-medium">{t("page.member.add.male")}</span>
                      </label>
                      <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={form.gender === "female"}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <User size={18} className="text-primary" />
                        <span className="text-sm font-medium">{t("page.member.add.female")}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center gap-2 mb-6 text-primary">
                  <MapPin size={18} />
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.member.add.fullAddress")}
                  </h3>
                </div>
                <Textarea
                  unstyled
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full p-4 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:outline-none transition-all bg-background text-sm resize-none"
                  placeholder={t("page.member.add.addressPlaceholder")}
                  rows={4}
                  maxLength={FIELD_LIMITS.ADDRESS}
                />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <div className="bg-card rounded-xl shadow-sm border border-border p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                <div className="flex items-center gap-2 mb-6 text-primary relative">
                  <Award size={18} />
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.member.add.membershipTier")}
                  </h3>
                </div>
                <div className="space-y-3 relative">
                  {tiers.length === 0 ? (
                    <div className="text-center py-6">
                      <Award size={18} className="text-3xl text-muted-foreground block mb-2" />
                      <p className="text-sm text-muted-foreground">{t("page.member.add.noTier")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.member.add.noTierDesc")}
                      </p>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={form.tier != null ? String(form.tier) : ""}
                        onValueChange={(val) =>
                          setForm((prev) => ({ ...prev, tier: val ? Number(val) : null }))
                        }>
                        <SelectTrigger className="w-full h-auto px-4 py-3 rounded-xl border-2 border-border bg-background text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all [&>svg]:text-muted-foreground">
                          {(() => {
                            const sel = tiers.find((t) => t.id === form.tier);
                            if (sel) {
                              return (
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: sel.color || "#6366f1" }}
                                  />
                                  <span>{sel.name}</span>
                                </div>
                              );
                            }
                            return (
                              <span className="text-muted-foreground">
                                {t("page.member.add.selectTier")}
                              </span>
                            );
                          })()}
                        </SelectTrigger>
                        <SelectContent className="rounded-xl min-w-[var(--radix-select-trigger-width)]">
                          {tiers.map((tier) => (
                            <SelectItem key={tier.id} value={String(tier.id)} className="py-2.5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: tier.color || "#6366f1" }}
                                />
                                <span>{tier.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {(() => {
                        const selected = tiers.find((t) => t.id === form.tier);
                        if (!selected) return null;
                        return (
                          <div
                            className="rounded-xl border overflow-hidden mt-1"
                            style={{ borderColor: `${selected.color || "#6366f1"}30` }}>
                            <div
                              className="p-4"
                              style={{ backgroundColor: `${selected.color || "#6366f1"}08` }}>
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm"
                                  style={{ backgroundColor: selected.color || "#6366f1" }}>
                                  <Trophy size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-foreground truncate">
                                    {selected.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    <span className="font-semibold">
                                      {selected.minPoints?.toLocaleString?.() || 0}
                                    </span>
                                    {" — "}
                                    <span className="font-semibold">
                                      {selected.maxPoints?.toLocaleString?.() || "∞"}
                                    </span>{" "}
                                    PTS
                                  </p>
                                </div>
                                {selected.discountPercent > 0 && (
                                  <div className="text-right shrink-0">
                                    <p
                                      className="text-lg font-bold"
                                      style={{ color: selected.color || "#6366f1" }}>
                                      {selected.discountPercent}%
                                    </p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                      {t("sidebar.diskon")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            {(Array.isArray(selected.benefits)
                              ? selected.benefits
                              : (selected.benefits || "").split("\n").filter(Boolean)
                            ).length > 0 && (
                              <div
                                className="px-4 py-3 border-t"
                                style={{ borderColor: `${selected.color || "#6366f1"}15` }}>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  {t("page.member.benefits")}
                                </p>
                                <ul className="space-y-1.5">
                                  {(Array.isArray(selected.benefits)
                                    ? selected.benefits
                                    : (selected.benefits || "").split("\n").filter(Boolean)
                                  ).map((b, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-xs text-muted-foreground">
                                      <span
                                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                        style={{ backgroundColor: selected.color || "#6366f1" }}
                                      />
                                      {b}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center gap-2 mb-6 text-primary">
                  <Star size={18} />
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.member.add.initialPoints")}
                  </h3>
                </div>
                <div className="bg-muted rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t("page.member.add.initialPoints")}
                  </p>
                  <p className="text-4xl font-bold text-primary">
                    0 <span className="text-sm font-semibold text-muted-foreground">PTS</span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {t("page.member.add.pointsInfo")}
                </p>
              </div>

              <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 flex gap-3">
                <Info size={18} className="text-secondary mt-0.5 text-base" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("page.member.add.dataConfirmation")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8 bg-card border border-border rounded-xl p-4">
            <Button
              variant="outline"
              onClick={requestLeave}
              className="gap-2 w-full sm:w-auto justify-center">
              <ArrowLeft size={20} className="text-lg" />
              {t("breadcrumb.back")}
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Button
                type="button"
                variant="draft"
                onClick={() => setDraftModal(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto justify-center">
                {t("page.member.add.saveDraft")}
              </Button>
              <Button
                variant="success"
                type="button"
                onClick={() => handleSaveClick()}
                disabled={isSubmitting}
                className="gap-2 w-full sm:w-auto justify-center">
                <Save size={20} className="text-lg" />
                {t("page.member.button.save")}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {isSubmitting && <Loading fullscreen size="lg" label={t("common.saving")} />}

      <Modal
        type="success"
        open={successModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-member?id=${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("page.member.add.successTitle")}
        description={t("page.member.add.successDescription")}
        onConfirm={() => setTimeout(() => navigate("/member-list"), 150)}
      />
      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.member.add.draftModalTitle")}
        description={t("page.member.add.draftModalDesc")}
        confirmText={t("page.member.add.draftModalConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          setIsSubmitting(true);
          createMutation.mutate({
            nameMember: form.name,
            phoneNumber: form.phoneNumber,
            email: form.email || undefined,
            birthDate: form.birthDate ? format(form.birthDate, "yyyy-MM-dd") : null,
            gender: form.gender,
            address: form.address,
            tier: form.tier || null,
            point: form.initialPoints,
            createdBy: user?.id,
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
  );
};

export default AddMember;

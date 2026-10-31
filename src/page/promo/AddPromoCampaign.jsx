import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCampaign } from "@/services/promo";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import { Form } from "@/components/ui/form";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import PromoFormSections from "./PromoFormSections";
import PromoActionBar from "./PromoActionBar";
import PromoSaveDialogs from "./PromoSaveDialogs";
import { PROMO_FORM_DEFAULTS, buildPromoSchema, promoHomeHref } from "./promoForm";
import { usePromoEditor } from "./usePromoEditor";
import { usePromoSaveFlow } from "./usePromoSaveFlow";

const AddPromoCampaign = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);

  const schema = buildPromoSchema(t);
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: PROMO_FORM_DEFAULTS
  });
  const { request: requestLeave, leave } = useFormExit(
    "/promo-list",
    () => setCancelModalOpen(true),
    form
  );
  const editor = usePromoEditor({
    form,
    schema,
    isSuperAdmin,
    fallbackStore: cookie?.activeStore
  });
  const saveFlow = usePromoSaveFlow({
    editor,
    onSubmit: (payload) => createMutation.mutate(payload)
  });

  const createMutation = useMutation(createCampaign, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      // ponytail: cukup success modal, tanpa toast — pola bundle
      queryClient.invalidateQueries(["promo-campaigns"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      saveFlow.showError(err?.response?.data?.message || err.message || t("common.error"));
    }
  });

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: promoHomeHref(user?.roleType),
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.promo.list.title"),
            href: "/promo-list",
            i18nKey: "sidebar.promo"
          },
          {
            label: t("page.promo.add.title"),
            i18nKey: "page.promo.add.title"
          }
        ]}
        title={t("page.promo.add.title")}
        description={t("page.promo.add.description")}
        backLink="/promo-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-promo" />
        <Button variant="outline" onClick={requestLeave}>
          {t("action.back")}
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <PromoFormSections
            idPrefix="add"
            form={form}
            editor={editor}
            isSuperAdmin={isSuperAdmin}
          />
        </form>
      </Form>

      <PromoActionBar
        onBack={requestLeave}
        onSaveDraft={() => saveFlow.requestSave(true)}
        onSave={() => saveFlow.requestSave(false)}
        isSaving={createMutation.isLoading}
      />

      <Modal
        type="confirm"
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <PromoSaveDialogs saveFlow={saveFlow} isSaving={createMutation.isLoading} />
      <Modal
        type="success"
        open={successModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-promo?id=${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.promo.toast.createSuccess")}
        onConfirm={() => setTimeout(() => navigate("/promo-list"), 150)}
      />
    </div>
  );
};

export default AddPromoCampaign;

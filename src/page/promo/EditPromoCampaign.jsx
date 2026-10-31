import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCampaignById, updateCampaign } from "@/services/promo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import { Form } from "@/components/ui/form";
import { useFormExit } from "@/hooks/useLeaveGuard";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import PromoFormSections from "./PromoFormSections";
import PromoActionBar from "./PromoActionBar";
import PromoSaveDialogs from "./PromoSaveDialogs";
import { PROMO_FORM_DEFAULTS, buildPromoSchema, promoHomeHref } from "./promoForm";
import { usePromoEditor } from "./usePromoEditor";
import { usePromoSaveFlow } from "./usePromoSaveFlow";

const EditPromoSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-12 w-64" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    </div>
  </div>
);

const EditPromoCampaign = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const { data: campaign, isLoading } = useQuery(
    ["promo-campaign", id],
    () => getCampaignById(id),
    {
      enabled: !!id
    }
  );

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
    fallbackStore: campaign?.store || cookie?.activeStore,
    campaignId: id
  });
  const saveFlow = usePromoSaveFlow({
    editor,
    onSubmit: (payload) => updateMutation.mutate(payload)
  });

  useEffect(() => {
    if (campaign) editor.hydrate(campaign);
  }, [campaign]);

  const updateMutation = useMutation((data) => updateCampaign(id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries(["promo-campaigns"]);
      queryClient.invalidateQueries(["promo-campaign", id]);
      navigate("/promo-list");
    },
    onError: (err) => {
      saveFlow.showError(err?.response?.data?.message || err.message || t("common.error"));
    }
  });

  if (isLoading) return <EditPromoSkeleton />;

  return (
    <div className="space-y-6">
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
            label: t("page.promo.edit.title"),
            i18nKey: "page.promo.edit.title"
          }
        ]}
        title={t("page.promo.edit.title")}
        description={t("page.promo.edit.description")}
        backLink="/promo-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-promo" mode="edit" />
        <Button variant="outline" onClick={requestLeave}>
          {t("common.cancel")}
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <PromoFormSections
            idPrefix="edit"
            form={form}
            editor={editor}
            isSuperAdmin={isSuperAdmin}
          />
          <PromoActionBar
            onBack={requestLeave}
            onSaveDraft={() => saveFlow.requestSave(true)}
            onSave={() => saveFlow.requestSave(false)}
            isSaving={updateMutation.isLoading}
          />
        </form>
      </Form>

      <Modal
        type="confirm"
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <PromoSaveDialogs saveFlow={saveFlow} isSaving={updateMutation.isLoading} />
    </div>
  );
};

export default EditPromoCampaign;

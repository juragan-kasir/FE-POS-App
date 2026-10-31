import React from "react";
import { useTranslation } from "react-i18next";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";

const PromoSaveDialogs = ({ saveFlow, isSaving }) => {
  const { t } = useTranslation();
  const { isDraft } = saveFlow;

  return (
    <>
      <Modal
        type="confirm"
        open={saveFlow.isConfirmOpen}
        onOpenChange={saveFlow.setIsConfirmOpen}
        title={isDraft ? t("page.promo.modal.draftTitle") : t("page.promo.modal.saveTitle")}
        description={
          isDraft ? t("page.promo.modal.draftDescription") : t("page.promo.modal.saveDescription")
        }
        confirmText={isDraft ? t("common.yes") : t("common.yesSave")}
        cancelText={t("common.cancel")}
        loading={isSaving}
        onConfirm={saveFlow.confirmSave}
      />
      <MissingFieldsModal
        open={saveFlow.isMissingOpen}
        onOpenChange={saveFlow.setIsMissingOpen}
        fields={saveFlow.missingFields}
      />
      <Modal
        type="error"
        open={!!saveFlow.errorMessage}
        onOpenChange={(open) => !open && saveFlow.clearError()}
        title={t("common.error")}
        description={saveFlow.errorMessage}
        onConfirm={saveFlow.clearError}
      />
    </>
  );
};

export default PromoSaveDialogs;

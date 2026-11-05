import { useTranslation } from "react-i18next";

import { resolveConsultChannel } from "@/lib/consult-channel";

export const useConsultChannel = () => {
  const { t } = useTranslation();

  return resolveConsultChannel({
    whatsappNumber: import.meta.env.VITE_CONSULT_WHATSAPP_NUMBER,
    message: t("landing.consult.message"),
    emailSubject: t("landing.consult.emailSubject")
  });
};

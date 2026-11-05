import React from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "@/components/ui/button";
import { CONSULT_CHANNEL } from "@/lib/consult-channel";
import { cn } from "@/lib/utils";

import { useConsultChannel } from "../hooks/useConsultChannel";

const TONE_CLASSES = {
  onDark: "bg-jk-leaf text-jk-ink hover:bg-jk-paper",
  onLight: "bg-jk-green text-white hover:bg-jk-green-deep"
};

const CHANNEL_LABEL_KEYS = {
  [CONSULT_CHANNEL.whatsapp]: "landing.consult.closingWhatsapp",
  [CONSULT_CHANNEL.email]: "landing.consult.closingEmail"
};

const ConsultButton = ({ tone = "onDark", isClosing = false, className }) => {
  const { t } = useTranslation();
  const channel = useConsultChannel();
  const isWhatsApp = channel.type === CONSULT_CHANNEL.whatsapp;
  const label = isClosing ? t(CHANNEL_LABEL_KEYS[channel.type]) : t("landing.consult.primary");

  return (
    <a
      href={channel.href}
      className={cn(
        buttonVariants(),
        "h-12 rounded-sm px-6 text-[15px] font-semibold",
        TONE_CLASSES[tone],
        className
      )}
      {...(isWhatsApp && { target: "_blank", rel: "noopener noreferrer" })}>
      {isWhatsApp && <MessageCircle aria-hidden="true" className="mr-2 size-[18px]" />}
      {label}
    </a>
  );
};

export default ConsultButton;

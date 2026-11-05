import React from "react";
import { useTranslation } from "react-i18next";

import { ASSISTANT_TOPIC_KEYS, CHAT_MESSAGES, CHAT_SENDER, SECTION_IDS } from "@/constants/landing";
import { cn } from "@/lib/utils";

import { SectionEyebrow, SectionTitle } from "./SectionHeading";

const BUBBLE_CLASSES = {
  [CHAT_SENDER.owner]: "ml-auto rounded-br-sm bg-jk-leaf text-jk-ink",
  [CHAT_SENDER.assistant]: "mr-auto rounded-bl-sm bg-white text-jk-ink"
};

const ChatBubble = ({ message }) => {
  const { t } = useTranslation();

  return (
    <li
      className={cn(
        "w-fit max-w-[86%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[15px] leading-snug",
        BUBBLE_CLASSES[message.sender]
      )}>
      {t(message.textKey)}
    </li>
  );
};

const ChatMockup = () => {
  const { t } = useTranslation();

  return (
    <figure className="lg:col-span-5 lg:col-start-2">
      <div className="mx-auto max-w-[460px] overflow-hidden rounded-lg border border-white/15 bg-jk-pine">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-jk-leaf font-jk-display text-[15px] font-bold text-jk-ink">
            JK
          </span>
          <div>
            <p className="text-[15px] font-semibold text-jk-paper">
              {t("landing.assistant.botName")}
            </p>
            <p className="text-[12.5px] text-jk-paper/65">{t("landing.assistant.botChannel")}</p>
          </div>
        </div>
        <ul className="space-y-3 px-4 py-5">
          {CHAT_MESSAGES.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </ul>
      </div>
      <figcaption className="mx-auto mt-3 max-w-[460px] font-jk-mono text-[12px] text-jk-paper/65">
        {t("landing.assistant.illustrationNote")}
      </figcaption>
    </figure>
  );
};

const AssistantSection = () => {
  const { t } = useTranslation();

  return (
    <section
      id={SECTION_IDS.assistant}
      aria-labelledby="landing-assistant-title"
      className="bg-jk-ink py-24 text-jk-paper lg:py-32">
      <div className="mx-auto max-w-[1320px] px-5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-8">
        <div className="lg:col-span-5">
          <SectionEyebrow className="text-jk-kunyit">
            {t("landing.assistant.eyebrow")}
          </SectionEyebrow>
          <SectionTitle className="mt-4">
            <span id="landing-assistant-title">{t("landing.assistant.title")}</span>
          </SectionTitle>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-jk-paper/80">
            {t("landing.assistant.body")}
          </p>
          <ul className="mt-8 border-t border-white/15">
            {ASSISTANT_TOPIC_KEYS.map((key) => (
              <li key={key} className="border-b border-white/15 py-3 text-[16px]">
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-14 lg:col-span-7 lg:mt-0 lg:grid lg:grid-cols-6">
          <ChatMockup />
        </div>
      </div>
    </section>
  );
};

export default AssistantSection;

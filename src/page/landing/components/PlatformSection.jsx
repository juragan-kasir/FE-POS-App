import React from "react";
import { useTranslation } from "react-i18next";

import { PLATFORM_CAPABILITIES, PLATFORM_STATUS, SECTION_IDS } from "@/constants/landing";
import { cn } from "@/lib/utils";

import { SectionEyebrow, SectionTitle } from "./SectionHeading";

const STATUS_CLASSES = {
  [PLATFORM_STATUS.available]: "text-jk-green",
  [PLATFORM_STATUS.guided]: "text-jk-stone"
};

const formatIndex = (index) => String(index + 1).padStart(2, "0");

const CapabilityRow = ({ capability, index }) => {
  const { t } = useTranslation();

  return (
    <li className="grid grid-cols-[2.75rem_1fr] gap-x-3 border-t border-jk-ink/20 py-7 last:border-b md:grid-cols-[3.5rem_1fr_12rem]">
      <span aria-hidden="true" className="pt-1 text-[14px] text-jk-stone">
        {formatIndex(index)}
      </span>
      <div>
        <h3 className="font-jk-display text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold leading-tight tracking-[-0.015em]">
          {t(capability.titleKey)}
        </h3>
        <p className="mt-2 max-w-[56ch] text-[16px] leading-relaxed text-jk-stone">
          {t(capability.bodyKey)}
        </p>
      </div>
      <p
        className={cn(
          "col-start-2 mt-3 text-[13px] font-medium md:col-start-3 md:mt-1 md:text-right",
          STATUS_CLASSES[capability.status]
        )}>
        {t(capability.statusKey)}
      </p>
    </li>
  );
};

const PlatformSection = () => {
  const { t } = useTranslation();

  return (
    <section
      id={SECTION_IDS.platform}
      aria-labelledby="landing-platform-title"
      className="bg-jk-paper pb-24 lg:pb-32">
      <div className="mx-auto max-w-[1320px] px-5 lg:grid lg:grid-cols-12 lg:gap-10 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <SectionEyebrow className="text-jk-green">{t("landing.platform.eyebrow")}</SectionEyebrow>
          <SectionTitle className="mt-4">
            <span id="landing-platform-title">{t("landing.platform.title")}</span>
          </SectionTitle>
          <p className="mt-5 max-w-[42ch] text-[17px] leading-relaxed text-jk-stone">
            {t("landing.platform.body")}
          </p>
        </div>
        <ol className="mt-12 lg:col-span-8 lg:mt-0">
          {PLATFORM_CAPABILITIES.map((capability, index) => (
            <CapabilityRow key={capability.id} capability={capability} index={index} />
          ))}
        </ol>
      </div>
    </section>
  );
};

export default PlatformSection;

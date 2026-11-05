import React from "react";
import { useTranslation } from "react-i18next";

import { SECTION_IDS, SUPPORT_STEPS } from "@/constants/landing";

import { SectionEyebrow, SectionTitle } from "./SectionHeading";

const STEP_OFFSET_CLASSES = ["", "lg:mt-10", "lg:mt-20", "lg:mt-10", ""];

const SupportStep = ({ step, index }) => {
  const { t } = useTranslation();

  return (
    <li className={`border-t-2 border-jk-green pt-4 ${STEP_OFFSET_CLASSES[index]}`}>
      <span
        aria-hidden="true"
        className="font-jk-display text-[2.75rem] font-medium leading-none text-jk-green">
        {index + 1}
      </span>
      <h3 className="mt-3 text-[18px] font-semibold leading-tight">{t(step.titleKey)}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-jk-stone">{t(step.bodyKey)}</p>
    </li>
  );
};

const SupportJourneySection = () => {
  const { t } = useTranslation();

  return (
    <section
      id={SECTION_IDS.about}
      aria-labelledby="landing-support-title"
      className="bg-jk-paper py-24 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            <SectionEyebrow className="text-jk-green">
              {t("landing.support.eyebrow")}
            </SectionEyebrow>
            <SectionTitle className="mt-4 text-[clamp(2.5rem,6.4vw,5.25rem)] leading-[1]">
              <span id="landing-support-title">{t("landing.support.title")}</span>
            </SectionTitle>
          </div>
          <div className="mt-6 lg:col-span-4 lg:mt-auto">
            <p className="text-[17px] leading-relaxed text-jk-stone">{t("landing.support.body")}</p>
          </div>
        </div>
        <ol className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {SUPPORT_STEPS.map((step, index) => (
            <SupportStep key={step.id} step={step} index={index} />
          ))}
        </ol>
      </div>
    </section>
  );
};

export default SupportJourneySection;

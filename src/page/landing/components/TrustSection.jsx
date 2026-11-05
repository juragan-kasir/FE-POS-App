import React from "react";
import { useTranslation } from "react-i18next";

import { TRUST_FACTS } from "@/constants/landing";

import { SectionEyebrow } from "./SectionHeading";

const TrustSection = () => {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="landing-trust-title"
      className="bg-jk-paper pb-20 pt-16 lg:pb-28 lg:pt-52">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          <SectionEyebrow className="text-jk-green lg:col-span-3">
            {t("landing.trust.eyebrow")}
          </SectionEyebrow>
          <h2
            id="landing-trust-title"
            className="mt-4 text-balance font-jk-display text-[clamp(1.75rem,3.2vw,2.75rem)] font-medium leading-[1.12] tracking-[-0.02em] lg:col-span-9 lg:mt-0">
            {t("landing.trust.title")}
          </h2>
        </div>
        <dl className="mt-12 grid border-t border-jk-ink/20 sm:grid-cols-2 lg:grid-cols-5">
          {TRUST_FACTS.map((fact) => (
            <div
              key={fact.id}
              className="border-b border-jk-ink/20 py-5 lg:border-b-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0">
              <dt className="text-[16px] font-semibold">{t(fact.titleKey)}</dt>
              <dd className="mt-1 text-[14.5px] leading-snug text-jk-stone">{t(fact.bodyKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default TrustSection;

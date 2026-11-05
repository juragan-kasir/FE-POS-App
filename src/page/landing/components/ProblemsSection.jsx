import React from "react";
import { useTranslation } from "react-i18next";

import { BUSINESS_PROBLEMS, SECTION_IDS } from "@/constants/landing";

import ConsultButton from "./ConsultButton";
import { SectionEyebrow, SectionTitle } from "./SectionHeading";

const ProblemLine = ({ problem }) => {
  const { t } = useTranslation();

  return (
    <div className="border-b border-dashed border-jk-ink/30 py-5 last:border-b-0">
      <dt className="flex items-end gap-2 font-jk-mono text-[14px] font-medium">
        <span>{t(problem.problemKey)}</span>
        <span aria-hidden="true" className="jk-leader mb-1 h-[7px] min-w-6 flex-1" />
      </dt>
      <dd className="mt-2 text-[16px] leading-relaxed text-jk-stone">{t(problem.answerKey)}</dd>
    </div>
  );
};

const ProblemsSection = () => {
  const { t } = useTranslation();

  return (
    <section
      id={SECTION_IDS.problems}
      aria-labelledby="landing-problems-title"
      className="bg-jk-pine py-24 text-jk-paper lg:py-32">
      <div className="mx-auto max-w-[1320px] px-5 lg:grid lg:grid-cols-12 lg:gap-10 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
          <SectionEyebrow className="text-jk-leaf">{t("landing.problems.eyebrow")}</SectionEyebrow>
          <SectionTitle className="mt-4">
            <span id="landing-problems-title">{t("landing.problems.title")}</span>
          </SectionTitle>
          <p className="mt-5 max-w-[42ch] text-[17px] leading-relaxed text-jk-paper/80">
            {t("landing.problems.body")}
          </p>
          <ConsultButton className="mt-8" />
        </div>
        <div className="jk-receipt mt-12 bg-[#FFFDF7] px-6 py-10 text-jk-ink lg:col-span-6 lg:col-start-7 lg:mt-0 lg:px-10">
          <p className="text-center font-jk-mono text-[13px] font-medium uppercase tracking-[0.08em]">
            {t("landing.problems.receiptTitle")}
          </p>
          <dl className="mt-4 border-t border-dashed border-jk-ink/30">
            {BUSINESS_PROBLEMS.map((problem) => (
              <ProblemLine key={problem.id} problem={problem} />
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default ProblemsSection;

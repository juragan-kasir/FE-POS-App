import React from "react";
import { useTranslation } from "react-i18next";

import ConsultButton from "./ConsultButton";

const ClosingCtaSection = () => {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="landing-closing-title" className="bg-jk-green text-white">
      <div className="mx-auto max-w-[1320px] px-5 py-20 lg:grid lg:grid-cols-12 lg:items-end lg:gap-10 lg:px-8 lg:py-28">
        <h2
          id="landing-closing-title"
          className="text-balance font-jk-display text-[clamp(2.6rem,7vw,6rem)] font-semibold leading-[0.98] tracking-[-0.03em] lg:col-span-8">
          {t("landing.closing.title")}
        </h2>
        <div className="mt-8 lg:col-span-4 lg:mt-0">
          <p className="text-[18px] leading-relaxed text-white/90">{t("landing.closing.body")}</p>
          <ConsultButton isClosing className="mt-6 bg-jk-paper text-jk-ink hover:bg-white" />
        </div>
      </div>
    </section>
  );
};

export default ClosingCtaSection;

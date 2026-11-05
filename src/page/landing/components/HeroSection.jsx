import React from "react";
import { ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "@/components/ui/button";
import { HERO_ASSURANCE_KEYS, SECTION_IDS } from "@/constants/landing";
import { cn } from "@/lib/utils";

import ConsultButton from "./ConsultButton";
import ProductScreen from "./ProductScreen";
import ReceiptCard from "./ReceiptCard";
import { SectionEyebrow } from "./SectionHeading";

const HeroCopy = () => {
  const { t } = useTranslation();

  return (
    <div className="lg:col-span-4 lg:pb-28">
      <p className="max-w-[46ch] text-[17px] leading-relaxed text-jk-paper/85">
        {t("landing.hero.body")}
      </p>
      <div className="mt-8 grid max-w-[420px] gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <ConsultButton className="sm:w-full" />
        <a
          href={`#${SECTION_IDS.platform}`}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "h-12 w-full rounded-sm border border-white/25 px-3 text-[15px] font-medium text-jk-paper hover:bg-white/10 hover:text-jk-paper"
          )}>
          {t("landing.hero.secondaryCta")}
          <ArrowDown aria-hidden="true" className="ml-2 size-4" />
        </a>
      </div>
      <ul className="mt-8 space-y-2 text-[14px] text-jk-paper/75">
        {HERO_ASSURANCE_KEYS.map((key) => (
          <li key={key} className="flex gap-2">
            <span aria-hidden="true" className="text-jk-leaf">
              +
            </span>
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
};

const HeroVisual = () => {
  const { t } = useTranslation();

  return (
    <figure className="relative mt-12 lg:col-span-8 lg:-mb-32 lg:mr-[calc((100vw-min(100vw,1320px))/-2-2rem)] lg:mt-0">
      <ProductScreen
        screen="cashier"
        alt={t("landing.hero.screenAlt")}
        sizes="(min-width: 1024px) 66vw, 170vw"
        isPriority
        className="w-[170%] max-w-none rounded-r-none sm:w-[125%] lg:w-full"
      />
      <ReceiptCard className="jk-print absolute -left-14 bottom-16 z-10 hidden drop-shadow-[0_18px_24px_rgba(6,30,21,0.35)] xl:block" />
      <figcaption className="mt-3 text-[13px] text-jk-paper/70 lg:absolute lg:-bottom-8 lg:left-0 lg:mt-0 lg:text-jk-stone">
        {t("landing.common.sampleDataNote")}
      </figcaption>
    </figure>
  );
};

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="landing-hero-title" className="relative bg-jk-pine text-jk-paper">
      <div className="mx-auto max-w-[1320px] px-5 pb-12 pt-12 lg:px-8 lg:pb-0 lg:pt-16">
        <SectionEyebrow className="text-jk-leaf">{t("landing.hero.eyebrow")}</SectionEyebrow>
        <h1
          id="landing-hero-title"
          className="mt-5 font-jk-display text-[clamp(2.9rem,6.5vw,6.25rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
          <span className="block">{t("landing.hero.titleLine1")}</span>
          <span className="block text-jk-leaf xl:pl-[1.1em]">{t("landing.hero.titleLine2")}</span>
        </h1>
        <div className="mt-8 lg:mt-12 lg:grid lg:grid-cols-12 lg:gap-10">
          <HeroCopy />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

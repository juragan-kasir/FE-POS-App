import React from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { POS_EXTRA_FEATURE_KEYS, POS_VIEWS, SECTION_IDS } from "@/constants/landing";

import ProductScreen from "./ProductScreen";
import { SectionEyebrow, SectionTitle } from "./SectionHeading";

const [DEFAULT_VIEW] = POS_VIEWS;

const PosViewPanel = ({ view }) => {
  const { t } = useTranslation();

  return (
    <TabsContent value={view.id} className="mt-8 lg:grid lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-4">
        <h3 className="font-jk-display text-[clamp(1.5rem,2.5vw,2rem)] font-semibold leading-tight tracking-[-0.015em]">
          {t(view.titleKey)}
        </h3>
        <ul className="mt-5 space-y-3">
          {view.pointKeys.map((key) => (
            <li key={key} className="flex gap-3 text-[16px] leading-snug text-jk-ink/80">
              <Check aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-jk-green" />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
      <figure className="mt-8 lg:col-span-8 lg:mt-0">
        <ProductScreen
          screen={view.id}
          alt={t(view.altKey)}
          sizes="(min-width: 1024px) 60vw, 100vw"
        />
        <figcaption className="mt-3 text-[13px] text-jk-stone">
          {t("landing.common.sampleDataNote")}
        </figcaption>
      </figure>
    </TabsContent>
  );
};

const PosShowcaseSection = () => {
  const { t } = useTranslation();

  return (
    <section
      id={SECTION_IDS.pos}
      aria-labelledby="landing-pos-title"
      className="bg-jk-paper-deep py-24 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-5 lg:px-8">
        <SectionEyebrow className="text-jk-green-deep">{t("landing.pos.eyebrow")}</SectionEyebrow>
        <SectionTitle className="mt-4 max-w-[17ch]">
          <span id="landing-pos-title">{t("landing.pos.title")}</span>
        </SectionTitle>
        <Tabs defaultValue={DEFAULT_VIEW.id} className="mt-12">
          <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-jk-ink/20 bg-transparent p-0">
            {POS_VIEWS.map((view) => (
              <TabsTrigger
                key={view.id}
                value={view.id}
                className="min-h-11 rounded-none border-b-2 border-transparent bg-transparent px-0 text-[15px] font-semibold text-jk-stone shadow-none data-[state=active]:border-jk-green data-[state=active]:bg-transparent data-[state=active]:text-jk-ink data-[state=active]:shadow-none">
                {t(view.tabKey)}
              </TabsTrigger>
            ))}
          </TabsList>
          {POS_VIEWS.map((view) => (
            <PosViewPanel key={view.id} view={view} />
          ))}
        </Tabs>
        <div className="mt-16 border-t border-jk-ink/20 pt-6 lg:grid lg:grid-cols-12 lg:gap-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-jk-stone lg:col-span-4">
            {t("landing.pos.extraTitle")}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[16px] lg:col-span-8 lg:mt-0">
            {POS_EXTRA_FEATURE_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default PosShowcaseSection;

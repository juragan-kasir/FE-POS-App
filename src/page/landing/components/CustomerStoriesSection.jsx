import React from "react";
import { useTranslation } from "react-i18next";

import { CUSTOMER_STORIES, SECTION_IDS } from "@/constants/landing";

import { SectionEyebrow, SectionTitle } from "./SectionHeading";

const StoryList = () => (
  <ul className="mt-10 grid gap-10 lg:grid-cols-2">
    {CUSTOMER_STORIES.map((story) => (
      <li key={story.id}>
        <figure>
          <blockquote className="font-jk-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-tight">
            {story.quote}
          </blockquote>
          <figcaption className="mt-4 text-[15px] text-jk-stone">
            {story.owner}, {story.business}
          </figcaption>
        </figure>
      </li>
    ))}
  </ul>
);

const CustomerStoriesSection = () => {
  const { t } = useTranslation();
  if (CUSTOMER_STORIES.length === 0) return null;

  return (
    <section
      id={SECTION_IDS.stories}
      aria-labelledby="landing-stories-title"
      className="bg-jk-paper py-24 lg:py-28">
      <div className="mx-auto max-w-[1320px] px-5 lg:grid lg:grid-cols-12 lg:gap-10 lg:px-8">
        <SectionEyebrow className="text-jk-green lg:col-span-3">
          {t("landing.stories.eyebrow")}
        </SectionEyebrow>
        <div className="mt-4 lg:col-span-9 lg:mt-0">
          <SectionTitle className="text-[clamp(1.9rem,3.8vw,3.1rem)] leading-[1.08]">
            <span id="landing-stories-title">{t("landing.stories.title")}</span>
          </SectionTitle>
          <StoryList />
        </div>
      </div>
    </section>
  );
};

export default CustomerStoriesSection;

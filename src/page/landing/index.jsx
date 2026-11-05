import React from "react";
import { useTranslation } from "react-i18next";

import { SECTION_IDS } from "@/constants/landing";
import { useActiveSessionRedirect } from "@/hooks/useActiveSessionRedirect";

import AssistantSection from "./components/AssistantSection";
import ClosingCtaSection from "./components/ClosingCtaSection";
import CustomerStoriesSection from "./components/CustomerStoriesSection";
import HeroSection from "./components/HeroSection";
import LandingFooter from "./components/LandingFooter";
import LandingNav from "./components/LandingNav";
import PlatformSection from "./components/PlatformSection";
import PosShowcaseSection from "./components/PosShowcaseSection";
import ProblemsSection from "./components/ProblemsSection";
import SupportJourneySection from "./components/SupportJourneySection";
import TrustSection from "./components/TrustSection";
import { useDocumentMeta } from "./hooks/useDocumentMeta";
import "./landing.css";

const LandingContent = () => {
  const { t } = useTranslation();
  useDocumentMeta({ title: t("landing.meta.title"), description: t("landing.meta.description") });

  return (
    <>
      <a
        href={`#${SECTION_IDS.content}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-jk-paper focus:px-4 focus:py-2 focus:text-jk-ink">
        {t("landing.nav.skipToContent")}
      </a>
      <LandingNav />
      <main id={SECTION_IDS.content}>
        <HeroSection />
        <TrustSection />
        <PlatformSection />
        <PosShowcaseSection />
        <AssistantSection />
        <SupportJourneySection />
        <ProblemsSection />
        <CustomerStoriesSection />
        <ClosingCtaSection />
      </main>
      <LandingFooter />
    </>
  );
};

const LandingPage = () => {
  const { ready } = useTranslation();
  useActiveSessionRedirect();

  return (
    <div className="jk-landing min-h-dvh bg-jk-pine font-jk-body text-jk-ink antialiased">
      {ready && <LandingContent />}
    </div>
  );
};

export default LandingPage;

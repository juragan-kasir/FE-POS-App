import React from "react";
import { useTranslation } from "react-i18next";

import { PageLoader } from "@/components/ui/page-loader";
import { SECTION_IDS } from "@/constants/landing";
import { useActiveSessionRedirect } from "@/hooks/useActiveSessionRedirect";
import { useDeferredAnalytics } from "@/hooks/useDeferredAnalytics";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

import AssistantSection from "./components/AssistantSection";
import ClosingCtaSection from "./components/ClosingCtaSection";
import CustomerStoriesSection from "./components/CustomerStoriesSection";
import FloatingChatButton from "./components/FloatingChatButton";
import HeroSection from "./components/HeroSection";
import LandingFooter from "./components/LandingFooter";
import LandingNav from "./components/LandingNav";
import PlatformSection from "./components/PlatformSection";
import PosShowcaseSection from "./components/PosShowcaseSection";
import ProblemsSection from "./components/ProblemsSection";
import SupportJourneySection from "./components/SupportJourneySection";
import TrustSection from "./components/TrustSection";
import "./landing.css";

const LandingContent = () => {
  const { t, i18n } = useTranslation();
  useDocumentMeta({
    title: t("landing.meta.title"),
    description: t("landing.meta.description"),
    language: i18n.language
  });

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
      <FloatingChatButton />
    </>
  );
};

const LandingPage = () => {
  const { ready } = useTranslation();
  useActiveSessionRedirect();
  useDeferredAnalytics();

  return (
    <div className="jk-landing min-h-dvh bg-jk-pine font-jk-body text-jk-ink antialiased">
      {ready ? <LandingContent /> : <PageLoader isFullScreen className="[--primary:102_61%_58%]" />}
    </div>
  );
};

export default LandingPage;

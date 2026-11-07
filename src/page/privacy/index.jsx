import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageLoader } from "@/components/ui/page-loader";
import { policyContent } from "@/constants/policy-content";
import { LANDING_PATH } from "@/constants/routes";
import { useDeferredAnalytics } from "@/hooks/useDeferredAnalytics";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { SUPPORT_EMAIL } from "@/lib/consult-channel";
import BrandMark from "@/page/landing/components/BrandMark";
import LanguageSwitch from "@/page/landing/components/LanguageSwitch";
import "@/page/landing/landing.css";

const PrivacyContent = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language?.startsWith("en") ? "en" : "id";
  const { title, sections } = policyContent.privacy[language];

  useDocumentMeta({
    title: t("landing.privacy.metaTitle"),
    description: t("landing.privacy.metaDescription"),
    language
  });

  return (
    <>
      <header className="bg-jk-pine">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
          <Link to={LANDING_PATH} aria-label={t("page.login.backToHome")}>
            <BrandMark />
          </Link>
          <LanguageSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 lg:py-16">
        <h1 className="font-jk-display text-4xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-3 text-[15px] text-jk-stone">{t("landing.privacy.updatedAt")}</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              <p className="mt-2 text-base leading-relaxed text-jk-stone">{section.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-base">
          {t("landing.privacy.contactLabel")}{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-jk-green underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </main>
    </>
  );
};

const PrivacyPage = () => {
  const { ready } = useTranslation();
  useDeferredAnalytics();

  return (
    <div className="jk-landing min-h-dvh bg-jk-paper font-jk-body text-jk-ink antialiased">
      {ready ? <PrivacyContent /> : <PageLoader isFullScreen />}
    </div>
  );
};

export default PrivacyPage;

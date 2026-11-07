import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { FOOTER_LINKS } from "@/constants/landing";
import { LOGIN_PATH, PRIVACY_PATH } from "@/constants/routes";

import BrandMark from "./BrandMark";

const FOOTER_LINK_CLASS = "inline-flex min-h-11 items-center hover:text-jk-leaf";

const LandingFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-jk-ink text-[15px] text-jk-paper/75">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-5 pb-28 pt-12 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <BrandMark />
        <nav aria-label={t("landing.footer.navLabel")}>
          <ul className="flex flex-wrap gap-x-6">
            {FOOTER_LINKS.map((link) => (
              <li key={link.id}>
                <a href={link.href} className={FOOTER_LINK_CLASS}>
                  {t(link.labelKey)}
                </a>
              </li>
            ))}
            <li>
              <Link to={LOGIN_PATH} className={FOOTER_LINK_CLASS}>
                {t("landing.nav.login")}
              </Link>
            </li>
            <li>
              <a href={PRIVACY_PATH} className={FOOTER_LINK_CLASS}>
                {t("privacyPolicy")}
              </a>
            </li>
          </ul>
        </nav>
        <p className="text-[14px]">{t("landing.footer.copyright")}</p>
      </div>
    </footer>
  );
};

export default LandingFooter;

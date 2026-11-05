import React, { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LANDING_PATH, LOGIN_PATH } from "@/constants/routes";
import { NAV_LINKS, PRODUCT_MENU_ITEMS } from "@/constants/landing";

import BrandMark from "./BrandMark";
import ConsultButton from "./ConsultButton";

const NAV_LINK_CLASS =
  "inline-flex h-11 items-center text-[15px] font-medium text-jk-paper/85 transition-colors hover:text-jk-leaf";

const ProductMenu = () => {
  const { t } = useTranslation();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={`${NAV_LINK_CLASS} gap-1`}>
        {t("landing.nav.products")}
        <ChevronDown aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="jk-landing-menu w-[320px] rounded-sm border-black/10 bg-[rgb(var(--jk-paper))] p-2 font-jk-body text-[rgb(var(--jk-ink))]">
        {PRODUCT_MENU_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.id}
            asChild
            className="cursor-pointer rounded-sm px-3 py-3 focus:bg-[rgb(var(--jk-paper-deep))]">
            <a href={item.href} className="flex flex-col items-start gap-1">
              <span className="text-[15px] font-semibold">{t(item.titleKey)}</span>
              <span className="text-[13px] leading-snug text-[rgb(var(--jk-stone))]">
                {t(item.descriptionKey)}
              </span>
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MobileMenu = ({ onNavigate }) => {
  const { t } = useTranslation();
  const links = [
    ...PRODUCT_MENU_ITEMS.map(({ id, titleKey, href }) => ({ id, labelKey: titleKey, href })),
    ...NAV_LINKS
  ];

  return (
    <nav
      aria-label={t("landing.nav.mobileLabel")}
      className="border-t border-white/10 px-5 pb-6 pt-2 lg:hidden">
      <ul>
        {links.map((link) => (
          <li key={link.id} className="border-b border-white/10">
            <a
              href={link.href}
              onClick={onNavigate}
              className="flex min-h-12 items-center text-[17px] text-jk-paper">
              {t(link.labelKey)}
            </a>
          </li>
        ))}
        <li className="border-b border-white/10">
          <Link to={LOGIN_PATH} className="flex min-h-12 items-center text-[17px] text-jk-paper">
            {t("landing.nav.login")}
          </Link>
        </li>
      </ul>
      <ConsultButton className="mt-5 w-full" />
    </nav>
  );
};

const LandingNav = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);
  const MenuIcon = isMenuOpen ? X : Menu;

  return (
    <header className="sticky top-0 z-40 bg-jk-pine">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 lg:px-8">
        <Link to={LANDING_PATH} aria-label={t("landing.nav.home")} className="flex">
          <BrandMark />
        </Link>
        <nav aria-label={t("landing.nav.mainLabel")} className="hidden items-center gap-8 lg:flex">
          <ProductMenu />
          {NAV_LINKS.map((link) => (
            <a key={link.id} href={link.href} className={NAV_LINK_CLASS}>
              {t(link.labelKey)}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-6 lg:flex">
          <Link to={LOGIN_PATH} className={NAV_LINK_CLASS}>
            {t("landing.nav.login")}
          </Link>
          <ConsultButton className="h-11 px-5" />
        </div>
        <button
          type="button"
          aria-expanded={isMenuOpen}
          aria-label={t(isMenuOpen ? "landing.nav.closeMenu" : "landing.nav.openMenu")}
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          className="-mr-2 inline-flex size-11 items-center justify-center text-jk-paper lg:hidden">
          <MenuIcon aria-hidden="true" className="size-6" />
        </button>
      </div>
      {isMenuOpen && <MobileMenu onNavigate={closeMenu} />}
    </header>
  );
};

export default LandingNav;

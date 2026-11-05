import React from "react";
import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { cn } from "@/lib/utils";
import { translationSelect } from "@/state/translation";

const LanguageSwitch = ({ className }) => {
  const { t } = useTranslation();
  const { translation, updateTranslation } = translationSelect();

  return (
    <div
      role="group"
      aria-label={t("landing.language.label")}
      className={cn("inline-flex rounded-sm border border-white/25 p-0.5", className)}>
      {SUPPORTED_LANGUAGES.map((language) => {
        const isActive = translation === language.code;

        return (
          <button
            key={language.code}
            type="button"
            aria-label={t(language.nameKey)}
            aria-pressed={isActive}
            onClick={() => updateTranslation(language.code)}
            className={cn(
              "h-9 min-w-9 rounded-[2px] px-2 text-[12.5px] font-semibold transition-colors",
              isActive ? "bg-jk-paper text-jk-ink" : "text-jk-paper/75 hover:text-jk-paper"
            )}>
            {language.label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitch;

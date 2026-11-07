import i18next from "i18next";

const TRANSLATION_NAMESPACE = "translation";

export const isLocaleLoaded = (language) =>
  Boolean(i18next.store?.hasResourceBundle(language, TRANSLATION_NAMESPACE));

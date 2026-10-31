import i18next from "i18next";

const SERVER_LANGUAGES = { en: "en", id: "id" };
const DEFAULT_SERVER_LANGUAGE = "id";

export const apiLanguage = () =>
  SERVER_LANGUAGES[
    String(i18next.language || "")
      .slice(0, 2)
      .toLowerCase()
  ] || DEFAULT_SERVER_LANGUAGE;

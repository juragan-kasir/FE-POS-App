import i18next from "i18next";

// Dates and times follow the UI language; money and quantities keep the
// Indonesian format (Rp 1.250.000) in both languages.
export const dateLocale = () => (i18next.language?.startsWith("en") ? "en-US" : "id-ID");

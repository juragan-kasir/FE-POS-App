import { useEffect } from "react";
import { isLocaleLoaded } from "@/lib/locale-loaded";

const DESCRIPTION_SELECTOR = 'meta[name="description"]';

export const useDocumentMeta = ({ title, description, language }) => {
  const isReady = isLocaleLoaded(language);

  useEffect(() => {
    if (!isReady) return undefined;

    const descriptionTag = document.head.querySelector(DESCRIPTION_SELECTOR);
    const previousTitle = document.title;
    const previousLanguage = document.documentElement.lang;
    const previousDescription = descriptionTag?.getAttribute("content");

    document.title = title;
    document.documentElement.lang = language;
    descriptionTag?.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLanguage;
      descriptionTag?.setAttribute("content", previousDescription);
    };
  }, [title, description, language, isReady]);
};

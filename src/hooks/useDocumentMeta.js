import { useEffect } from "react";

const DESCRIPTION_SELECTOR = 'meta[name="description"]';

export const useDocumentMeta = ({ title, description, language }) => {
  useEffect(() => {
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
  }, [title, description, language]);
};

import { useEffect } from "react";

const DESCRIPTION_SELECTOR = 'meta[name="description"]';

export const useDocumentMeta = ({ title, description }) => {
  useEffect(() => {
    const descriptionTag = document.head.querySelector(DESCRIPTION_SELECTOR);
    const previousTitle = document.title;
    const previousDescription = descriptionTag?.getAttribute("content");

    document.title = title;
    descriptionTag?.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      descriptionTag?.setAttribute("content", previousDescription);
    };
  }, [title, description]);
};

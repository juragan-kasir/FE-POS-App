import { useState } from "react";

export const usePromoSaveFlow = ({ editor, onSubmit }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [isMissingOpen, setIsMissingOpen] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const requestSave = (asDraft) => {
    const missing = editor.findMissingFields();
    if (missing.length > 0) {
      setMissingFields(missing);
      setIsMissingOpen(true);
      return;
    }
    setIsDraft(asDraft);
    setIsConfirmOpen(true);
  };

  return {
    isConfirmOpen,
    setIsConfirmOpen,
    isDraft,
    isMissingOpen,
    setIsMissingOpen,
    missingFields,
    errorMessage,
    showError: setErrorMessage,
    clearError: () => setErrorMessage(""),
    requestSave,
    confirmSave: () => onSubmit(editor.buildPayload(isDraft))
  };
};

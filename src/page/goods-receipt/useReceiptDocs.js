import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { MAX_RECEIPT_DOCS, MAX_RECEIPT_DOC_BYTES } from "./receiptForm";

const docsFromDocumentation = (documentation) => {
  if (!documentation) return [];
  try {
    const parsed = JSON.parse(documentation);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map((url) => ({ url, isNew: false }));
    return [{ url: documentation, isNew: false }];
  } catch {
    return [{ url: documentation, isNew: false }];
  }
};

export const useReceiptDocs = () => {
  const { t } = useTranslation();
  const [docs, setDocs] = useState([]);
  const docInputRef = useRef(null);

  const rejectPick = (input, messageKey, level = "error") => {
    toast[level](t(messageKey));
    input.value = "";
  };

  const handleDocChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    if (incoming.some((f) => f.size > MAX_RECEIPT_DOC_BYTES)) {
      rejectPick(e.target, "page.goodsReceipt.add.form.fileTooLarge");
      return;
    }
    const room = MAX_RECEIPT_DOCS - docs.length;
    if (room <= 0) {
      rejectPick(e.target, "page.goodsReceipt.add.form.docMaxReached");
      return;
    }
    const accepted = incoming.slice(0, room);
    if (accepted.length < incoming.length)
      toast.info(t("page.goodsReceipt.add.form.docMaxReached"));
    setDocs((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, url: URL.createObjectURL(f), isNew: true }))
    ]);
    e.target.value = "";
  };

  const removeDoc = (idx) =>
    setDocs((prev) => {
      const target = prev.at(idx);
      if (target?.isNew) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });

  return {
    docs,
    docInputRef,
    handleDocChange,
    removeDoc,
    newDocFiles: docs.filter((d) => d.isNew).map((d) => d.file),
    keptDocUrls: docs.filter((d) => !d.isNew).map((d) => d.url),
    hydrateDocs: (documentation) => setDocs(docsFromDocumentation(documentation))
  };
};

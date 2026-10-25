import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore
} from "react";
import { useBlocker } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Modal from "@/components/organism/modal";
import {
  getDirty,
  markAllClean as markStoreClean,
  setDirty,
  subscribe
} from "@/lib/unsaved-changes-store";

const UnsavedChangesContext = createContext(null);

const noop = () => {};

const FALLBACK = {
  isDirty: false,
  registerDirty: noop,
  markAllClean: noop
};

export function useUnsavedChangesGuard() {
  return useContext(UnsavedChangesContext) || FALLBACK;
}

export function UnsavedChangesProvider({ children }) {
  const { t } = useTranslation();
  const isDirty = useSyncExternalStore(subscribe, getDirty, getDirty);

  const registerDirty = useCallback((id, dirty) => {
    setDirty(id, dirty);
  }, []);

  const value = useMemo(
    () => ({ isDirty, registerDirty, markAllClean: markStoreClean }),
    [isDirty, registerDirty]
  );

  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <Modal
        type="confirm"
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
        title={t("unsavedChanges.title", { defaultValue: "Batalkan Perubahan?" })}
        description={t("unsavedChanges.description", {
          defaultValue:
            "Anda memiliki perubahan yang belum disimpan. Jika keluar sekarang, perubahan tersebut akan hilang."
        })}
        confirmText={t("unsavedChanges.discard", { defaultValue: "Ya, Buang Perubahan" })}
        cancelText={t("unsavedChanges.stay", { defaultValue: "Tetap di Form" })}
        onConfirm={() => {
          if (blocker.state === "blocked") blocker.proceed();
        }}
      />
    </UnsavedChangesContext.Provider>
  );
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore
} from "react";
import { useBlocker, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Modal from "@/components/organism/modal";
import {
  getDirty,
  markAllClean as markStoreClean,
  resumeGuard,
  setDirty,
  subscribe
} from "@/lib/unsaved-changes-store";

const UnsavedChangesContext = createContext(null);

// Clicks on these change a form value (combobox option, checkbox, switch).
const USER_PICKS = '[role="option"], [role="checkbox"], [role="switch"], [role="radio"]';

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

  // Read the store at navigation time, not from this render: a confirmed
  // exit clears the marks and navigates in the same tick (useFormExit).
  const blocker = useBlocker(useCallback(() => getDirty(), []));

  // A successful save holds the guard off (markSaved) until the user leaves
  // the page or edits again — typing, or picking an option/checkbox/switch.
  const { pathname, search } = useLocation();
  useEffect(() => resumeGuard(), [pathname, search]);
  useEffect(() => {
    const resume = (e) => {
      if (e.type !== "click" || e.target?.closest?.(USER_PICKS)) resumeGuard();
    };
    const events = ["input", "change", "click"];
    events.forEach((type) => document.addEventListener(type, resume, true));
    return () => events.forEach((type) => document.removeEventListener(type, resume, true));
  }, []);

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

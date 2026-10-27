import { useCallback, useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDirty, markAllClean, setDirty } from "@/lib/unsaved-changes-store";

const isEqual = (a, b) => {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && isEqual(a[k], b[k]));
};

// ponytail: dibaca saat klik, bukan dari snapshot render — formState.isDirty
// baru ter-update setelah validasi async resolver (zod) selesai, jadi klik
// cepat setelah mengetik bisa terbaca "bersih" dan membuang input.
const hasChanges = (form) =>
  form.formState.isDirty || !isEqual(form.getValues(), form.formState.defaultValues ?? {});

// Klik pada elemen ini mengubah isian (pilihan combobox, checkbox, switch).
const PICK_ROLES = '[role="option"], [role="checkbox"], [role="switch"], [role="radio"]';

// ponytail: keluar dari form (tombol Kembali / Batal). `request()` langsung
// ke `to` bila belum ada perubahan, atau memanggil `confirm()` (modal batal
// halaman) bila sudah. `leave()` = keluar setelah dikonfirmasi: tanda dirty
// dibuang dulu supaya guard router (UnsavedChangesProvider) tidak bertanya
// untuk kedua kalinya.
// Perubahan dibaca dari react-hook-form (`form`) dan dari store dirty global
// (<Form>, useDomDirtyTracking); `form` juga didaftarkan ke store itu, jadi
// navigasi sidebar ikut dijaga. Banyak form RHF menyimpan sebagian isian di
// useState (varian, kontak, item), jadi interaksi apa pun di halaman (ketik,
// ubah, pilih opsi/checkbox/switch) juga dihitung sebagai perubahan.
// Tanpa `form` bersih tidak bisa dipastikan → `request()` selalu konfirmasi.
export function useFormExit(to, confirm, form) {
  const navigate = useNavigate();
  const id = useId();
  const isDirty = Boolean(form?.formState.isDirty);

  useEffect(() => {
    setDirty(id, isDirty);
    return () => setDirty(id, false);
  }, [id, isDirty]);

  const touched = useRef(false);
  useEffect(() => {
    if (!form) return undefined;
    const mark = (e) => {
      if (e.type !== "click" || e.target?.closest?.(PICK_ROLES)) touched.current = true;
    };
    const events = ["input", "change", "click"];
    events.forEach((type) => document.addEventListener(type, mark, true));
    return () => events.forEach((type) => document.removeEventListener(type, mark, true));
  }, [form]);

  const leave = useCallback(() => {
    markAllClean();
    navigate(to);
  }, [navigate, to]);

  const request = () =>
    !form || touched.current || hasChanges(form) || getDirty() ? confirm() : leave();

  return { request, leave };
}

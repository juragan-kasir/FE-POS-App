import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFieldErrors } from "@/lib/validation";

// ponytail: pesan error per field untuk form berbasis useState (bukan
// react-hook-form). Kosong sampai `showErrors()` dipanggil saat Simpan gagal;
// setelah itu divalidasi ulang tiap `values` berubah, jadi pesan hilang
// sendiri begitu field diperbaiki.
export function useFieldErrors(values, schema) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const errors = useMemo(
    () => (shown ? getFieldErrors(values, schema, t) : {}),
    [shown, values, schema, t]
  );
  return { errors, showErrors: () => setShown(true) };
}

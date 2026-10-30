import React from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ShieldAlert, Store } from "lucide-react";
import { useTranslation } from "react-i18next";

// ponytail: 403 tidak bisa dipulihkan dengan "Coba lagi" — tampilkan sebabnya,
// bukan "Kesalahan Server". Akun tanpa toko: kode kanonik STORE_SCOPE_REQUIRED
// atau pesan legacy "Store assignment required" (utils/storeValidation.js BE).
export const forbiddenKind = (error) => {
  const res = error?.response;
  if (res?.status !== 403) return null;
  // serverMessage: the server's own text, before errorMessage.js localizes it.
  const { code, message, serverMessage } = res.data || {};
  if (code === "STORE_SCOPE_REQUIRED" || (serverMessage ?? message) === "Store assignment required")
    return "noStore";
  return "forbidden";
};

const AbortController = ({ refetch, error }) => {
  const { t } = useTranslation();
  const kind = forbiddenKind(error);

  if (kind) {
    const Icon = kind === "noStore" ? Store : ShieldAlert;
    return (
      <div className="flex h-[470px] flex-col rounded-lg">
        <div className="flex flex-col flex-1 items-center justify-center rounded-lg gap-5 px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shadow-sm">
            <Icon className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <div className="text-center max-w-md space-y-2">
            <p className="text-foreground font-bold text-lg md:text-xl">
              {t(kind === "noStore" ? "error.noStoreTitle" : "error.forbiddenTitle")}
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t(kind === "noStore" ? "error.noStoreDesc" : "error.forbiddenDesc")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[470px] flex-col rounded-lg">
      <div className="flex flex-col flex-1 items-center justify-center rounded-lg gap-5 px-6">
        <div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-destructive/10 text-destructive shadow-sm">
            <AlertTriangle className="h-10 w-10" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center max-w-md space-y-2">
          <p className="text-destructive font-bold text-lg md:text-xl">
            {t("error.internalServerError")}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">{t("error.tryAgainDesc")}</p>
        </div>
        <Button
          onClick={refetch}
          className="flex items-center gap-2 px-8 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
          <RefreshCw size={18} />
          {t("common.tryAgain")}
        </Button>
      </div>
    </div>
  );
};

AbortController.propTypes = {
  refetch: PropTypes.func.isRequired,
  error: PropTypes.object
};

export default AbortController;

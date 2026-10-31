import i18next from "i18next";
import { localizeServerError } from "./errorLocalize";
import { apiLanguage } from "./apiLanguage";

// Pages show `err.response.data.message || err.message` in their error
// toasts and modals. Left alone that surfaced axios' own text ("Request
// failed with status code 500", "Network Error", "timeout of 30000ms
// exceeded") and, on a 5xx, whatever the server put in `message` — mostly
// "Internal server error", sometimes a raw database error. The response
// interceptor runs every failed request through normalizeApiError so both
// read as a short message a cashier can act on, without touching the call
// sites. Specific messages the server wrote for users (4xx, and 5xx
// messages starting with "Gagal") are kept.

const tr = (key, fallback) => {
  if (!i18next.isInitialized) return fallback;
  const text = i18next.t(key, { defaultValue: fallback });
  return text && text !== key ? text : fallback;
};

const MESSAGES = {
  network: [
    "apiError.network",
    "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi."
  ],
  timeout: ["apiError.timeout", "Server terlalu lama merespons. Silakan coba lagi."],
  server: ["apiError.server", "Terjadi kesalahan di server. Silakan coba lagi beberapa saat lagi."],
  forbidden: ["apiError.forbidden", "Anda tidak memiliki akses untuk tindakan ini."],
  notFound: ["apiError.notFound", "Data tidak ditemukan atau sudah dihapus."],
  tooLarge: ["apiError.tooLarge", "Ukuran file terlalu besar."],
  tooMany: ["apiError.tooMany", "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi."],
  invalid: ["apiError.invalid", "Data yang dikirim tidak valid. Periksa kembali isian Anda."],
  unknown: ["apiError.unknown", "Terjadi kesalahan. Silakan coba lagi."]
};

const message = (kind) => tr(...MESSAGES[kind]);

const kindForStatus = (status) => {
  if (status >= 500) return "server";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 413) return "tooLarge";
  if (status === 429) return "tooMany";
  if (status === 400 || status === 422) return "invalid";
  return "unknown";
};

// Locale text for a key, or null when the key is missing.
const translateKey = (key) =>
  i18next.isInitialized && i18next.exists(key) ? i18next.t(key) : null;

const isIndonesianUi = () => apiLanguage() === "id";

// The server answers errors in the language the request asked for and says
// so in Content-Language; older servers do not.
const isServerTextInUiLanguage = (err) =>
  err?.response?.headers?.["content-language"] === apiLanguage();

// A 5xx message is kept only when the server wrote it for users.
const keepServerMessage = (status, text) =>
  typeof text === "string" &&
  text.trim() !== "" &&
  (status < 500 || /^(gagal|failed)\b/i.test(text.trim()));

const codeMessage = (data) =>
  typeof data?.code === "string" ? translateKey(`apiError.code.${data.code}`) : null;

const hasIssues = (data) => Array.isArray(data?.errors) && data.errors.length > 0;

// 4xx text in the UI language: a curated text for a known code, field
// issues with Indonesian labels, the server's own text when it already
// answered in the UI language, else the older English-to-Indonesian guesses.
const clientErrorMessage = (err, data) => {
  const byCode = codeMessage(data);
  if (byCode) return byCode;
  if (isIndonesianUi() && hasIssues(data)) {
    const issues = localizeServerError({ errors: data.errors }, null);
    if (issues) return issues;
  }
  if (isServerTextInUiLanguage(err) && typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  return isIndonesianUi() ? localizeServerError(data, translateKey) : null;
};

// The message to show for a failed request, or null for a cancelled one.
export const friendlyErrorMessage = (err) => {
  if (err?.code === "ERR_CANCELED") return null;
  const status = err?.response?.status;
  if (!status) {
    if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") return message("timeout");
    return message("network");
  }
  const data = err.response.data;
  const serverText = data?.message;
  if (status < 500) {
    const localized = clientErrorMessage(err, data);
    if (localized) return localized;
  }
  return keepServerMessage(status, serverText) ? serverText : message(kindForStatus(status));
};

// Rewrite a failed request's messages in place (see top of file). The
// server's own text stays available as `response.data.serverMessage`.
export const normalizeApiError = (err) => {
  const friendly = friendlyErrorMessage(err);
  if (!friendly) return err;
  err.message = friendly;
  const data = err.response?.data;
  const isJsonBody = data && Object.getPrototypeOf(data) === Object.prototype;
  if (isJsonBody && data.message !== friendly) {
    data.serverMessage = data.message;
    data.message = friendly;
  }
  return err;
};

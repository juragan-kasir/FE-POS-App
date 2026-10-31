import axios, { AxiosError, CanceledError } from "axios";
import { ENDPOINT } from "@/utils/endpoints";
import { hasOwn } from "@/lib/safe-lookup";
import { getToken, getCookie } from "@/utils/cookies";
import { endSession, isSessionEnding, isSessionExemptPath, SESSION_END_REASON } from "./session";
import { isRegisterRequiredError, useRegisterRequiredStore } from "@/state/registerRequired";
import { normalizeApiError } from "./errorMessage";
import { apiLanguage } from "./apiLanguage";

const axiosInstance = axios.create({
  baseURL: ENDPOINT.BASE_URL
});

axiosInstance.interceptors.request.use(
  (req) => {
    // Once the session is ending nothing but the logout revocation itself
    // may leave the tab.
    if (isSessionEnding() && !req.sessionRevocation) {
      throw new CanceledError("Session ended");
    }

    req.headers["Accept-Language"] = apiLanguage();

    const token = getToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    // Per-request opt-out: a caller that owns its request scope (e.g. a
    // strict-schema endpoint that rejects unknown keys) sets
    // `skipStoreInjection: true` on the axios config and receives no injected
    // store in params, body or FormData. Auth and session handling above still
    // apply; every request without the flag keeps the injection below.
    if (req.skipStoreInjection === true) {
      return req;
    }

    const userRaw = getCookie("user");
    const user = userRaw ? JSON.parse(decodeURIComponent(userRaw)) : null;
    const isSuperAdmin = user?.roleType === "super_admin";
    const activeStoreRaw = getCookie("activeStore");
    const activeStore = activeStoreRaw && activeStoreRaw !== "undefined" ? activeStoreRaw : null;

    const method = req.method?.toUpperCase();
    const isGet = method === "GET";
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    // Helper to check if store is already provided in URL/Params/Data.
    // Keys that signal the payload carries its own store scope (multi-store forms
    // like product storePrices or expense allStores must not be overridden).
    const STORE_KEYS = ["store", "stores", "storeId", "storeIds", "storePrices", "selectedStore"];
    const urlHasStore = req.url?.includes("store=") || req.url?.includes("stores=") || false;
    const paramsHaveStore = req.params?.store !== undefined || req.params?.stores !== undefined;

    let dataHasStore = false;
    if (req.data instanceof FormData) {
      dataHasStore = STORE_KEYS.some((k) => req.data.has(k));
    } else if (typeof req.data === "object" && req.data !== null) {
      dataHasStore = STORE_KEYS.some((k) => hasOwn(req.data, k));
    }

    if (isSuperAdmin) {
      // Super Admin: inject the selected store into GETs and mutations, but only
      // when a store is explicitly picked (global view stays store-agnostic) and
      // the payload does not already carry its own store scope.
      if (activeStore && !urlHasStore && !paramsHaveStore && !dataHasStore) {
        if (isGet) {
          req.params = { ...req.params, store: activeStore };
        } else if (isMutation) {
          if (req.data instanceof FormData) {
            req.data.append("store", activeStore);
          } else if (typeof req.data === "object" || !req.data) {
            req.data = { ...(req.data || {}), store: activeStore };
          }
        }
      }
    } else {
      // Non Super Admin: Mandatory activeStore injection.
      // Prefer the user's assigned store (from the decoded login payload in
      // the `user` cookie) over the client-controlled `activeStore` cookie,
      // which could be tampered with in the DOM. Fall back to activeStore only
      // when the user cookie lacks a store.
      const nonAdminStore = user?.store || activeStore;
      if (nonAdminStore && !urlHasStore && !paramsHaveStore && !dataHasStore) {
        if (isGet) {
          req.params = { ...req.params, store: nonAdminStore };
        } else if (isMutation) {
          // Inject into Body for mutations
          if (req.data instanceof FormData) {
            req.data.append("store", nonAdminStore);
          } else if (typeof req.data === "object" || !req.data) {
            req.data = { ...(req.data || {}), store: nonAdminStore };
          }
        }
      }
    }

    return req;
  },
  (err) => Promise.reject(err)
);

const PUBLIC_AUTH_URLS = [
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  "/auth/reset-password/request"
];

// A 401 from a protected request means the session is gone: end it once
// (session.js ignores every later call). A 403 is an authorization denial and
// stays with the page that made the request — EXCEPT that a disabled/deleted
// account also surfaces as 403 (backend P1-4 generic denial), which no page
// can distinguish alone. The first qualifying 403 therefore runs one shared
// session-state probe (GET /auth/context: 200 for every valid caller,
// 403 when the P1-4 account gate fires). Probe 403 ends the session via the
// existing boundary; probe 200 or probe failure preserves everything.
let sessionProbePromise = null;
// A probe 200 is remembered briefly so several denied widgets on one page
// share it instead of each re-probing. A later-disabled account is still
// caught by the first 403 after the window (the BE denies every request
// meanwhile, so only the logout redirect waits).
export const PROBE_OK_TTL_MS = 10000;
let lastProbeOkAt = -Infinity;

const PROBE_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const probeSessionState = () => {
  if (sessionProbePromise) return sessionProbePromise;
  if (Date.now() - lastProbeOkAt < PROBE_OK_TTL_MS) return Promise.resolve();
  sessionProbePromise = axiosInstance
    .get("/auth/context", { sessionProbe: true })
    .then(
      () => {
        lastProbeOkAt = Date.now();
      },
      (probeErr) => {
        if (probeErr?.response?.status === 403) {
          endSession({ reason: SESSION_END_REASON.EXPIRED });
        }
      }
    )
    .finally(() => {
      sessionProbePromise = null;
    });
  return sessionProbePromise;
};

const isProbeRequest = (config) => config?.sessionProbe === true;

const isQualifyingProbeTrigger = (err) => {
  if (!(err instanceof AxiosError)) return false;
  if (err.response?.status !== 403) return false;
  if (isProbeRequest(err.config)) return false;
  if (isSessionEnding()) return false;
  const method = err.config?.method?.toUpperCase();
  if (!PROBE_METHODS.includes(method)) return false;
  if (PUBLIC_AUTH_URLS.includes(err.config?.url)) return false;
  if (isSessionExemptPath(window.location.pathname)) return false;
  return true;
};

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err instanceof AxiosError &&
      err.response?.status === 401 &&
      !PUBLIC_AUTH_URLS.includes(err.config?.url) &&
      !isSessionExemptPath(window.location.pathname)
    ) {
      endSession({ reason: SESSION_END_REASON.EXPIRED });
    }
    if (isQualifyingProbeTrigger(err)) {
      probeSessionState();
    }
    // No open cash register: one app-wide dialog sends the cashier to open
    // it (RegisterRequiredDialog); callers still receive the rejection.
    if (isRegisterRequiredError(err)) {
      useRegisterRequiredStore.getState().show();
    }
    // Last: the checks above read the server's original response.
    if (err instanceof AxiosError) normalizeApiError(err);
    return Promise.reject(err);
  }
);

export { axiosInstance };

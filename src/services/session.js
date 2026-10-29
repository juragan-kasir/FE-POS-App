import { orderList } from "@/state/order-list";
import { checkout } from "@/state/checkout";
import { invoice } from "@/state/invoice";
import { categorySelect } from "@/state/category";
import { REMEMBERED_SESSION_KEYS } from "@/lib/remembered-session";

// Session boundary — the single owner of "this tab's authenticated session
// ends". Explicit logout (Header, Sidebar, access-denied screen) and a
// qualifying protected-request 401 (services/index.js) all end here, so a
// shared POS terminal never hands the next user the previous user's
// credentials, cart, store selection, cache or socket.
//
// Persisted state is cleared explicitly (the keys below); every in-memory
// owner (React Query cache, StoreProvider, SocketProvider, component state,
// timers) is reset by the full page navigation that always ends the boundary.
// The next login boots the app fresh as well (see page/auth/login).

export const SESSION_END_REASON = Object.freeze({
  LOGOUT: "logout",
  EXPIRED: "expired"
});

// Read once and removed by the login page after the navigation.
export const SESSION_NOTICE_KEY = "session-end-notice";

export const LOGOUT_TIMEOUT_MS = 5000;

// User-, store- and transaction-bound persisted state. Register any new
// user-bound key here. Device preferences (theme, language, tours, tips,
// onboarding flags) are deliberately absent and survive the boundary.
export const SESSION_COOKIES = Object.freeze(["token", "user", "activeStore", "activeStoreName"]);
export const SESSION_STORAGE_KEYS = Object.freeze([
  "user",
  "order-list",
  "checkout",
  "invoice",
  "category"
]);
export const SESSION_LOCAL_STORAGE_KEYS = Object.freeze([
  "globalStoreFilter",
  "customer-display-cart",
  "customer-display-event",
  ...REMEMBERED_SESSION_KEYS
]);

// Routes that never end the session on a 401: the public auth pages (no
// session to end) and the customer-facing display windows, which share the
// cashier's cookie but must never be sent to the login screen.
const EXEMPT_PATHS = Object.freeze([
  "/",
  "/register",
  "/reset-password",
  "/customer-display",
  "/customer-display-board"
]);

export const isSessionExemptPath = (pathname) => {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  return EXEMPT_PATHS.includes(path);
};

// Full document navigation (not router navigation): discarding the running
// app is what resets every in-memory owner. An object so tests can spy on it.
export const sessionNavigation = {
  replace: (path) => window.location.replace(path)
};

let ending = false;
const resources = new Set();

// True from the first endSession() call until the page is gone. Requests are
// blocked, 401s are ignored and credential writers must not write.
export const isSessionEnding = () => ending;

// Live resources bound to the session (the socket). Returns an unregister
// function for the owner's cleanup.
export const registerSessionResource = (dispose) => {
  resources.add(dispose);
  return () => resources.delete(dispose);
};

const attempt = (fn) => {
  try {
    fn();
  } catch {
    // one failed step must never stop the rest of the teardown
  }
};

const expireCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

const revokeServerSession = async () => {
  try {
    const { logOut } = await import("./auth");
    await logOut(undefined, { timeout: LOGOUT_TIMEOUT_MS, sessionRevocation: true });
  } catch {
    // best-effort: the local session ends whatever the server answers
  }
};

const teardown = (reason) => {
  for (const dispose of [...resources]) attempt(dispose);
  resources.clear();

  // Reset before removing the keys, so a persist write racing the navigation
  // can only re-save empty state.
  attempt(() => orderList.getState().resetOrder());
  attempt(() => checkout.getState().cancelCheckout());
  attempt(() => invoice.getState().resetInvoice());
  attempt(() => categorySelect.getState().updateCategory(0));

  for (const name of SESSION_COOKIES) attempt(() => expireCookie(name));
  for (const key of SESSION_STORAGE_KEYS) attempt(() => window.sessionStorage.removeItem(key));
  for (const key of SESSION_LOCAL_STORAGE_KEYS) {
    attempt(() => window.localStorage.removeItem(key));
  }

  attempt(() => window.sessionStorage.setItem(SESSION_NOTICE_KEY, reason));
  attempt(() => sessionNavigation.replace("/"));
};

// Ends the session exactly once per page load; later calls are no-ops.
// `revoke` asks the backend to revoke the session first (explicit logout);
// a 401 skips it because the token is already dead.
export const endSession = async ({ reason = SESSION_END_REASON.EXPIRED, revoke = false } = {}) => {
  if (ending) return;
  ending = true;
  if (revoke) await revokeServerSession();
  teardown(reason);
};

// Login page: returns the reason the previous session ended (if any) and
// forgets it.
export const consumeSessionNotice = () => {
  let reason = null;
  attempt(() => {
    reason = window.sessionStorage.getItem(SESSION_NOTICE_KEY);
    window.sessionStorage.removeItem(SESSION_NOTICE_KEY);
  });
  return reason;
};

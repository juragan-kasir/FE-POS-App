const REMEMBER_ME_KEY = "session-remember-me";
const REMEMBERED_USER_KEY = "session-remembered-user";

export const REMEMBERED_SESSION_KEYS = Object.freeze([REMEMBER_ME_KEY, REMEMBERED_USER_KEY]);

const hasStorage = () => typeof localStorage !== "undefined";

export const isRememberMeEnabled = () => {
  if (!hasStorage()) return false;
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) === "true";
  } catch {
    return false;
  }
};

export const rememberSession = (user) => {
  if (!hasStorage()) return false;
  try {
    localStorage.setItem(REMEMBER_ME_KEY, "true");
    localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(user));
    return true;
  } catch {
    return false;
  }
};

export const forgetRememberedSession = () => {
  if (!hasStorage()) return false;
  try {
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(REMEMBERED_USER_KEY);
    return true;
  } catch {
    return false;
  }
};

export const readRememberedUser = () => {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(REMEMBERED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

import { readRememberedUser } from "@/lib/remembered-session";
import { getTokenExpiryDate } from "@/lib/token-expiry";
import { isSessionEnding } from "@/services/session";
import { getToken } from "@/utils/cookies";

export const readActiveSessionRole = (cookieUser) => {
  if (isSessionEnding()) return null;
  const expiresAt = getTokenExpiryDate(getToken());
  if (!expiresAt || expiresAt <= new Date()) return null;
  return readRememberedUser()?.roleType || cookieUser?.roleType || null;
};

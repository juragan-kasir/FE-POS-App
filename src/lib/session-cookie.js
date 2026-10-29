import { getTokenExpiryDate } from "@/lib/token-expiry";

export const sessionCookieOptions = (token, isRemembered) => {
  const options = { path: "/" };
  if (!isRemembered) return options;
  const expires = getTokenExpiryDate(token);
  return expires ? { ...options, expires } : options;
};

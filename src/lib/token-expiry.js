const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
};

export const getTokenExpiryDate = (token) => {
  if (typeof token !== "string") return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(decodeBase64Url(payload));
    return Number.isFinite(claims?.exp) ? new Date(claims.exp * 1000) : null;
  } catch {
    return null;
  }
};

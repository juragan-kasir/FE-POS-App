const SEEN_LIMIT = 200;

export const readSeenIds = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
};

export const writeSeenIds = (key, ids) => {
  try {
    sessionStorage.setItem(key, JSON.stringify([...ids].slice(-SEEN_LIMIT)));
  } catch {
    return;
  }
};

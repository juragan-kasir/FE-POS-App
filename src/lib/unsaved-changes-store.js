const dirtyIds = new Set();
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

export const getDirty = () => dirtyIds.size > 0;

export const setDirty = (id, dirty) => {
  const had = dirtyIds.has(id);
  if (dirty) dirtyIds.add(id);
  else dirtyIds.delete(id);

  if (had !== dirtyIds.has(id)) notify();
};

export const markAllClean = () => {
  if (dirtyIds.size === 0) return;
  dirtyIds.clear();
  notify();
};

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const dirtyIds = new Set();
const listeners = new Set();

// Set by a successful save, until the next navigation or the next edit by
// the user. A save is followed by refetches and re-hydration that can mark a
// form dirty again; those marks must not raise "Batalkan Perubahan?" on the
// way back to the list.
let justSaved = false;

const notify = () => listeners.forEach((listener) => listener());

export const getDirty = () => dirtyIds.size > 0 && !justSaved;

export const isJustSaved = () => justSaved;

export const markSaved = () => {
  if (justSaved) return;
  justSaved = true;
  notify();
};

// The user navigated or edited again: unsaved marks count again.
export const resumeGuard = () => {
  if (!justSaved) return;
  justSaved = false;
  notify();
};

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

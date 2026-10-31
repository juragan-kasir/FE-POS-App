import { useState } from "react";

export const useRowDraft = (emptyDraft) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);

  const setField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const close = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setIsOpen(false);
  };

  const toggleNew = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setIsOpen((open) => !open);
  };

  const startEdit = (id, values) => {
    setDraft(values);
    setEditingId(id);
    setIsOpen(true);
  };

  return { isOpen, editingId, draft, setField, close, toggleNew, startEdit };
};

export const upsertRow = (rows, editingId, row, newId) =>
  editingId
    ? rows.map((r) => (r.id === editingId ? { ...r, ...row } : r))
    : [...rows, { id: newId, ...row }];

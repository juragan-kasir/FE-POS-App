import React from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { upsertRow, useRowDraft } from "./useRowDraft";

const EMPTY_CONTACT = { fullName: "", position: "", email: "", phone: "" };

const CONTACT_FIELDS = [
  {
    key: "fullName",
    id: "full-name",
    labelKey: "page.supplier.contacts.fullName",
    fallback: "Nama Lengkap",
    placeholderKey: "page.supplier.ui.contactName",
    maxLength: FIELD_LIMITS.PERSON_NAME,
    isRequired: true
  },
  {
    key: "position",
    id: "position",
    labelKey: "page.supplier.contacts.position",
    fallback: "Jabatan",
    placeholderKey: "document.position",
    maxLength: FIELD_LIMITS.SHORT_LABEL
  },
  {
    key: "email",
    id: "email",
    labelKey: "page.supplier.contacts.email",
    fallback: "Email",
    placeholder: "Email",
    maxLength: FIELD_LIMITS.EMAIL
  },
  {
    key: "phone",
    id: "phone",
    labelKey: "page.supplier.contacts.phone",
    fallback: "Telepon",
    placeholderKey: "document.phone",
    maxLength: FIELD_LIMITS.PHONE
  }
];

const trimmedContact = (draft) => ({
  fullName: draft.fullName.trim(),
  position: draft.position.trim(),
  email: draft.email.trim(),
  phone: draft.phone.trim()
});

const SupplierContactsSection = ({ idPrefix, contacts, onChange }) => {
  const { t } = useTranslation();
  const row = useRowDraft(EMPTY_CONTACT);
  const canSave = Boolean(row.draft.fullName.trim());

  const handleSave = () => {
    if (!canSave) return;
    onChange(
      upsertRow(contacts, row.editingId, trimmedContact(row.draft), `contact_${Date.now()}`)
    );
    row.close();
  };

  const handleEdit = (contact) =>
    row.startEdit(contact.id, {
      fullName: contact.fullName,
      position: contact.position || "",
      email: contact.email || "",
      phone: contact.phone || ""
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("page.supplier.contacts.title", "Daftar Kontak")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("page.supplier.contacts.description", "Kelola kontak person yang dapat dihubungi")}
          </p>
        </div>
        <Button
          type="button"
          variant="success"
          size="sm"
          className="gap-1.5"
          onClick={row.toggleNew}>
          <Plus size={14} />
          {t("page.supplier.contacts.add", "Tambah Kontak")}
        </Button>
      </div>

      {row.isOpen && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CONTACT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <label
                  htmlFor={`${idPrefix}-supplier-${field.id}`}
                  className="text-xs text-muted-foreground">
                  {t(field.labelKey, field.fallback)}
                  {field.isRequired && " *"}
                </label>
                <Input
                  id={`${idPrefix}-supplier-${field.id}`}
                  placeholder={field.placeholder ?? t(field.placeholderKey)}
                  value={row.draft[field.key]}
                  onChange={(e) => row.setField(field.key, e.target.value)}
                  maxLength={field.maxLength}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={row.close}
              className="flex-1">
              {t("common.cancel")}
            </Button>
            <Button
              variant="success"
              type="button"
              size="sm"
              disabled={!canSave}
              disabledReason={t("page.supplier.disabledReason.contactName")}
              onClick={handleSave}
              className="flex-1 gap-1.5">
              {row.editingId ? (
                t("common.save")
              ) : (
                <>
                  <Plus size={14} /> {t("page.supplier.contacts.add", "Tambah")}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {contacts.length > 0 ? (
        <HorizontalScrollArea className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10">#</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.contacts.fullName", "Nama")}
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.contacts.position", "Jabatan")}
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.contacts.email", "Email")}
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.contacts.phone", "Telepon")}
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.products.table.action", "Aksi")}
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, index) => (
                <tr
                  key={c.id}
                  className={`border-b last:border-b-0 ${row.editingId === c.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2">{c.fullName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.position || "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email || "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.phone || "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.edit")}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(c)}>
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.delete")}
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onChange(contacts.filter((x) => x.id !== c.id))}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HorizontalScrollArea>
      ) : (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t(
              "page.supplier.contacts.empty",
              "Belum ada kontak. Klik tombol di atas untuk menambahkan."
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default SupplierContactsSection;

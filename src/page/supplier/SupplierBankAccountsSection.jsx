import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { upsertRow, useRowDraft } from "./useRowDraft";

const EMPTY_BANK = { bankName: "", accountNumber: "", accountName: "", isDefault: false };

const BANK_FIELDS = [
  {
    key: "bankName",
    id: "bank-name",
    labelKey: "page.supplier.bankAccounts.bankName",
    fallback: "Nama Bank",
    placeholder: "BCA, Mandiri, BRI...",
    maxLength: FIELD_LIMITS.BUSINESS_NAME
  },
  {
    key: "accountNumber",
    id: "account-number",
    labelKey: "page.supplier.bankAccounts.accountNumber",
    fallback: "Nomor Rekening",
    placeholder: "0012345678",
    maxLength: FIELD_LIMITS.BANK_ACCOUNT
  },
  {
    key: "accountName",
    id: "account-name",
    labelKey: "page.supplier.bankAccounts.accountName",
    fallback: "Nama Pemilik",
    placeholderKey: "page.supplier.ui.accountHolderName",
    maxLength: FIELD_LIMITS.PERSON_NAME
  }
];

const trimmedBank = (draft) => ({
  bankName: draft.bankName.trim(),
  accountNumber: draft.accountNumber.trim(),
  accountName: draft.accountName.trim(),
  isDefault: draft.isDefault
});

const SupplierBankAccountsSection = ({ idPrefix, bankAccounts, onChange }) => {
  const { t } = useTranslation();
  const row = useRowDraft(EMPTY_BANK);
  const canSave = BANK_FIELDS.every((field) => row.draft[field.key].trim());

  const handleSave = () => {
    if (!canSave) return;
    const bank = row.editingId
      ? trimmedBank(row.draft)
      : { ...trimmedBank(row.draft), status: "active" };
    onChange(upsertRow(bankAccounts, row.editingId, bank, `bank_${Date.now()}`));
    row.close();
  };

  const handleEdit = (bank) =>
    row.startEdit(bank.id, {
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      isDefault: bank.isDefault
    });

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("page.supplier.bankAccounts.title", "Rekening Bank")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "page.supplier.bankAccounts.description",
              "Kelola rekening bank supplier untuk pembayaran"
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="success"
          size="sm"
          className="gap-1.5"
          onClick={row.toggleNew}>
          <Plus size={14} />
          {t("page.supplier.bankAccounts.add", "Tambah Rekening")}
        </Button>
      </div>

      {row.isOpen && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BANK_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <label
                  htmlFor={`${idPrefix}-supplier-${field.id}`}
                  className="text-xs text-muted-foreground">
                  {t(field.labelKey, field.fallback)} *
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={row.draft.isDefault}
                onCheckedChange={(checked) => row.setField("isDefault", checked)}
              />
              {t("page.supplier.bankAccounts.isDefault", "Jadikan Default")}
            </label>
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
                disabledReason={t("page.supplier.disabledReason.bankAccount")}
                onClick={handleSave}
                className="flex-1 gap-1.5">
                {row.editingId ? (
                  t("common.save")
                ) : (
                  <>
                    <Plus size={14} /> {t("page.supplier.bankAccounts.add", "Tambah")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {bankAccounts.length > 0 ? (
        <HorizontalScrollArea className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10">#</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.bankAccounts.bankName", "Bank")}
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.bankAccounts.accountNumber", "Rekening")}
                </th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.bankAccounts.accountName", "Nama")}
                </th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.bankAccounts.isDefault", "Default")}
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                  {t("page.supplier.products.table.action", "Aksi")}
                </th>
              </tr>
            </thead>
            <tbody>
              {bankAccounts.map((b, index) => (
                <tr
                  key={b.id}
                  className={`border-b last:border-b-0 ${row.editingId === b.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 font-medium">{b.bankName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{b.accountNumber}</td>
                  <td className="px-3 py-2 text-muted-foreground">{b.accountName}</td>
                  <td className="px-3 py-2 text-center">
                    {b.isDefault ? (
                      <Check size={14} className="text-green-600 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.edit")}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(b)}>
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.delete")}
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onChange(bankAccounts.filter((x) => x.id !== b.id))}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HorizontalScrollArea>
      ) : (
        <div className="border border-dashed rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t(
              "page.supplier.bankAccounts.empty",
              "Belum ada rekening bank. Klik tombol di atas untuk menambahkan."
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default SupplierBankAccountsSection;

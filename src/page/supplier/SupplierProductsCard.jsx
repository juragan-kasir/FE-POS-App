import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import Modal from "@/components/organism/modal";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { digitsOnly } from "@/utils/quantity";
import { upsertRow, useRowDraft } from "./useRowDraft";

const UNIT_KEYS = {
  pcs: "unitPcs",
  buah: "unitBuah",
  kg: "unitKg",
  gram: "unitGram",
  liter: "unitLiter",
  ml: "unitMl",
  meter: "unitMeter",
  cm: "unitCm",
  lusin: "unitLusin",
  pack: "unitPack",
  box: "unitBox",
  karton: "unitKarton",
  krat: "unitKrat"
};

const MAX_QUALITY_RATING = 5;
const QUALITY_INPUT_LENGTH = 3;
const MIN_ORDER_INPUT_LENGTH = 9;
const IMPORT_FILE_TYPES = ".xlsx,.xls";

const EMPTY_PRODUCT = {
  name: "",
  price: "",
  unit: "pcs",
  leadTime: "",
  leadTimeUnit: "hari",
  qualityRating: "",
  minOrderQty: "",
  notes: ""
};

const productFromDraft = (draft) => ({
  name: draft.name.trim(),
  price: Number(draft.price),
  unit: draft.unit || "pcs",
  leadTime: Number(draft.leadTime) || 0,
  leadTimeUnit: draft.leadTimeUnit || "hari",
  qualityRating: Number(draft.qualityRating) || 0,
  minOrderQty: draft.minOrderQty || "1",
  notes: draft.notes.trim() || ""
});

const draftFromProduct = (product) => ({
  name: product.name,
  price: String(product.price),
  unit: product.unit || "pcs",
  leadTime: String(product.leadTime || ""),
  leadTimeUnit: product.leadTimeUnit || "hari",
  qualityRating: String(product.qualityRating || ""),
  minOrderQty: String(product.minOrderQty || ""),
  notes: product.notes || ""
});

const isValidQualityRating = (value) => {
  const rating = parseFloat(value);
  if (value === "" || value === ".") return true;
  return rating >= 0 && rating <= MAX_QUALITY_RATING && value.length <= QUALITY_INPUT_LENGTH;
};

const ProductDraftForm = ({ idPrefix, row, onSave }) => {
  const { t } = useTranslation();
  const { draft, setField } = row;
  const canSave = Boolean(draft.name.trim()) && Number(draft.price) > 0;
  const fieldId = (name) => `${idPrefix}-supplier-${name}`;
  const unitOptions = Object.entries(UNIT_KEYS).map(([value, key]) => ({
    value,
    label: t(`page.ingredient.form.${key}`)
  }));
  const leadTimeUnitOptions = [
    { value: "hari", label: t("page.businessTrip.detail.day") },
    { value: "jam", label: t("page.supplier.ui.hours") },
    { value: "menit", label: t("page.supplier.ui.minutes") }
  ];

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 space-y-1">
          <label htmlFor={fieldId("product-name")} className="text-xs text-muted-foreground">
            {t("page.supplier.products.productName")}
          </label>
          <Input
            id={fieldId("product-name")}
            placeholder={t("page.supplier.products.searchPlaceholder")}
            value={draft.name}
            onChange={(e) => setField("name", e.target.value)}
            maxLength={FIELD_LIMITS.BUSINESS_NAME}
          />
        </div>
        <div className="col-span-6 space-y-1">
          <label htmlFor={fieldId("price")} className="text-xs text-muted-foreground">
            {t("page.supplier.products.table.price")}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              Rp
            </span>
            <Input
              id={fieldId("price")}
              type="text"
              inputMode="numeric"
              placeholder="0"
              className="pl-9"
              value={draft.price ? Number(draft.price).toLocaleString("id-ID") : ""}
              onChange={(e) => setField("price", digitsOnly(e.target.value))}
            />
          </div>
        </div>
        <div className="col-span-6 space-y-1">
          <label htmlFor={fieldId("unit")} className="text-xs text-muted-foreground">
            {t("document.unit")}
          </label>
          <Combobox
            id={fieldId("unit")}
            options={unitOptions}
            value={draft.unit}
            onChange={(v) => setField("unit", v)}
            placeholder={t("page.supplier.ui.selectUnit")}
            searchPlaceholder={t("common.search.unit")}
          />
        </div>
        <div className="col-span-6 space-y-1">
          <label htmlFor={fieldId("lead-time")} className="text-xs text-muted-foreground">
            {t("page.supplier.comparison.table.leadTime")}
          </label>
          <div className="flex gap-1">
            <Input
              id={fieldId("lead-time")}
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={draft.leadTime}
              onChange={(e) => setField("leadTime", digitsOnly(e.target.value))}
              className="flex-1 min-w-0"
            />
            <div className="flex-1 min-w-0">
              <Combobox
                options={leadTimeUnitOptions}
                value={draft.leadTimeUnit}
                onChange={(v) => setField("leadTimeUnit", v)}
                placeholder={t("page.supplier.ui.select")}
                searchPlaceholder={t("common.search.generic")}
              />
            </div>
          </div>
        </div>
        <div className="col-span-3 space-y-1">
          <label htmlFor={fieldId("quality05")} className="text-xs text-muted-foreground">
            {t("page.supplier.ui.quality05")}
          </label>
          <Input
            id={fieldId("quality05")}
            type="text"
            inputMode="decimal"
            placeholder="0"
            maxLength={QUALITY_INPUT_LENGTH}
            showCount={false}
            value={draft.qualityRating}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-5.]/g, "");
              if (isValidQualityRating(value)) setField("qualityRating", value);
            }}
          />
        </div>
        <div className="col-span-3 space-y-1">
          <label htmlFor={fieldId("min-order")} className="text-xs text-muted-foreground">
            {t("page.supplier.products.table.minOrder")}
          </label>
          <Input
            id={fieldId("min-order")}
            type="text"
            inputMode="numeric"
            placeholder="1"
            maxLength={MIN_ORDER_INPUT_LENGTH}
            showCount={false}
            value={draft.minOrderQty}
            onChange={(e) => setField("minOrderQty", digitsOnly(e.target.value))}
          />
        </div>
        <div className="col-span-12 space-y-1">
          <label htmlFor={fieldId("notes")} className="text-xs text-muted-foreground">
            {t("page.supplier.products.notes")}
          </label>
          <Textarea
            id={fieldId("notes")}
            placeholder={t("page.supplier.ui.optionalNote")}
            rows={2}
            value={draft.notes}
            onChange={(e) => setField("notes", e.target.value)}
            maxLength={FIELD_LIMITS.DESCRIPTION}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={row.close} className="flex-1">
          {t("common.cancel")}
        </Button>
        <Button
          variant="success"
          type="button"
          size="sm"
          disabled={!canSave}
          disabledReason={t("page.supplier.disabledReason.product")}
          onClick={onSave}
          className="flex-1 gap-1.5">
          {row.editingId ? (
            t("common.save")
          ) : (
            <>
              <Plus size={14} />
              {t("page.supplier.products.add")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const ProductImportPanel = ({ onDownloadTemplate, onImport, isImporting, onImported }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);

  const handleImport = () => {
    if (!file) return;
    onImport(file, {
      onSuccess: () => {
        setFile(null);
        onImported();
      }
    });
  };

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onDownloadTemplate}>
        <Download size={14} />
        {t("page.supplier.products.downloadTemplate")}
      </Button>
      <Input
        type="file"
        accept={IMPORT_FILE_TYPES}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Button
        variant="import"
        type="button"
        size="sm"
        disabled={!file || isImporting}
        disabledReason={isImporting ? undefined : t("common.disabledReason.selectFileFirst")}
        onClick={handleImport}
        className="w-full gap-1.5">
        <Upload size={14} />
        {isImporting ? t("common.loading") : t("page.supplier.products.upload")}
      </Button>
    </div>
  );
};

const ProductsTable = ({ products, editingId, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const headers = [
    ["text-center w-10", "#"],
    ["text-left", t("page.supplier.products.table.name")],
    ["text-right", t("page.supplier.products.table.price")],
    ["text-center", t("document.unit")],
    ["text-right", t("page.supplier.products.table.leadTime")],
    ["text-right", t("page.supplier.products.table.quality")],
    ["text-right", t("page.supplier.products.table.minOrder")],
    ["text-left", t("page.bom.detail.notes")],
    ["text-right", t("page.supplier.products.table.action")]
  ];

  return (
    <HorizontalScrollArea className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm min-w-[840px]">
        <thead>
          <tr className="bg-muted/50 border-b">
            {headers.map(([align, label]) => (
              <th key={label} className={`${align} px-3 py-2 font-medium text-muted-foreground`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p, index) => (
            <tr
              key={p.id}
              className={`border-b last:border-b-0 ${editingId === p.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
              <td className="px-3 py-2 text-center text-xs text-muted-foreground">{index + 1}</td>
              <td className="px-3 py-2">{p.name}</td>
              <td className="px-3 py-2 text-right">Rp {Number(p.price).toLocaleString("id-ID")}</td>
              <td className="px-3 py-2 text-center text-xs">{p.unit || "pcs"}</td>
              <td className="px-3 py-2 text-right">
                {p.leadTime || 0} {p.leadTimeUnit || "hari"}
              </td>
              <td className="px-3 py-2 text-right">{p.qualityRating || 0}</td>
              <td className="px-3 py-2 text-right">{p.minOrderQty || 1}</td>
              <td className="px-3 py-2 text-left text-xs text-muted-foreground max-w-[150px] truncate">
                {p.notes || "-"}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.edit")}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(p)}>
                  <Pencil size={14} />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label={t("common.delete")}
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(p.id)}>
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </HorizontalScrollArea>
  );
};

const SupplierProductsCard = ({
  idPrefix,
  products,
  onChange,
  onDownloadTemplate,
  onImport,
  isImporting
}) => {
  const { t } = useTranslation();
  const row = useRowDraft(EMPTY_PRODUCT);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);

  const handleSave = () => {
    onChange(
      upsertRow(products, row.editingId, productFromDraft(row.draft), `manual_${Date.now()}`)
    );
    row.close();
  };

  const handleEdit = (product) => {
    row.startEdit(product.id, draftFromProduct(product));
    setIsImportOpen(false);
  };

  const toggleManual = () => {
    if (row.isOpen) row.close();
    else row.startEdit(null, EMPTY_PRODUCT);
    setIsImportOpen(false);
  };

  const toggleImport = () => {
    setIsImportOpen((open) => !open);
    row.close();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("page.supplier.products.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("page.supplier.products.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="success"
            size="sm"
            className="gap-1.5"
            onClick={toggleManual}>
            <Plus size={14} />
            {t("page.supplier.products.addProduct")}
          </Button>
          <Button
            type="button"
            variant="import"
            size="sm"
            className="gap-1.5"
            onClick={toggleImport}>
            <Upload size={14} />
            {t("page.supplier.products.importExcel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onDownloadTemplate}>
            <Download size={14} />
            {t("page.supplier.products.downloadTemplate")}
          </Button>
        </div>
      </div>

      {row.isOpen && <ProductDraftForm idPrefix={idPrefix} row={row} onSave={handleSave} />}

      {isImportOpen && (
        <ProductImportPanel
          onDownloadTemplate={onDownloadTemplate}
          onImport={onImport}
          isImporting={isImporting}
          onImported={() => setIsImportOpen(false)}
        />
      )}

      {products.length > 0 ? (
        <ProductsTable
          products={products}
          editingId={row.editingId}
          onEdit={handleEdit}
          onDelete={setDeleteProductId}
        />
      ) : (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("page.supplier.products.empty")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("page.supplier.products.hint")}</p>
        </div>
      )}

      <Modal
        type="confirm"
        open={!!deleteProductId}
        onOpenChange={() => setDeleteProductId(null)}
        title={t("page.supplier.products.confirmDelete")}
        description={t("page.supplier.products.confirmDeleteDesc")}
        confirmText={t("common.delete")}
        onConfirm={() => {
          onChange(products.filter((p) => p.id !== deleteProductId));
          setDeleteProductId(null);
        }}
      />
    </Card>
  );
};

export default SupplierProductsCard;

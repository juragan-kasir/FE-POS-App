import { safeGet } from "@/lib/safe-lookup";
/* eslint-disable no-unused-vars */
import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  Eye,
  Database,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowUpToLine
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadStockOpnameExcel } from "@/services/stock";
import { useTranslation } from "react-i18next";

const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv"
];

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const parseExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = safeGet(workbook.Sheets, sheetName);
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(json);
      } catch (err) {
        reject(new Error("Failed to read Excel file"));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsArrayBuffer(file);
  });

const COLUMN_MAP = {
  "Kode Barang": "kodeBarang",
  "Nama Barang": "namaBarang",
  Satuan: "satuan",
  Lokasi: "lokasi",
  "Stok Awal": "stokAwalJumlah",
  "Barang Masuk": "barangMasukJumlah",
  "Barang Keluar": "barangKeluarJumlah",
  "Stok Fisik": "stokFisikJumlah",
  Keterangan: "keterangan"
};

const mapRow = (row) => {
  // ponytail: fromEntries — tanpa penulisan berkunci variabel (Codacy)
  const keys = Object.keys(row);
  return Object.fromEntries(
    Object.entries(COLUMN_MAP).map(([excelCol, field]) => {
      const match = keys.find((k) => k.trim().toLowerCase() === excelCol.toLowerCase());
      return [field, match ? String(safeGet(row, match, "")).trim() : ""];
    })
  );
};

const UploadExcelModal = ({ open, onOpenChange, onDataParsed, onUploadSuccess, auditDate }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [parseError, setParseError] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = useCallback(() => {
    setFile(null);
    setUploading(false);
    setUploadStatus(null);
    setParseError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const processFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    if (
      !ALLOWED_TYPES.includes(selectedFile.type) &&
      !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      return;
    }
    setFile(selectedFile);
    setUploadStatus(null);
    setParseError(false);
  }, []);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer?.files?.[0];
      if (droppedFile) processFile(droppedFile);
    },
    [processFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  const handlePreview = async () => {
    if (!file) return;
    setParseError(false);
    try {
      const rows = await parseExcelFile(file);
      const mapped = rows.map((row) => mapRow(row));
      if (onDataParsed) onDataParsed(mapped);
      handleClose();
    } catch (err) {
      setParseError(true);
    }
  };

  const handleDirectUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadStatus(null);
    try {
      await uploadStockOpnameExcel(file, auditDate);
      setUploadStatus("success");
      if (onUploadSuccess) onUploadSuccess();
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setUploadStatus("error");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative z-50 w-full max-w-lg mx-4 animate-in zoom-in-95 fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("page.stockOpname.uploadExcel.title")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("page.stockOpname.uploadExcel.description")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative rounded-xl border-2 border-dashed transition-all p-10 text-center cursor-pointer
                ${dragOver ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]" : "border-muted-foreground/25 hover:border-emerald-300 hover:bg-muted/20"}`}
                onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  className={`flex flex-col items-center gap-3 transition-all ${dragOver ? "scale-105" : ""}`}>
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted"}`}>
                    {dragOver ? (
                      <ArrowUpToLine size={32} className="text-emerald-500" />
                    ) : (
                      <Upload size={32} className="text-muted-foreground/60" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {dragOver
                        ? t("page.stockOpname.uploadExcel.dropHere")
                        : t("page.stockOpname.uploadExcel.dragAndDrop")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.stockOpname.uploadExcel.format")}
                    </p>
                  </div>
                </div>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet size={24} className="text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setParseError(false);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                    <X size={16} />
                  </button>
                </div>
              )}

              {parseError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm animate-in slide-in-from-bottom-2 duration-200">
                  <AlertCircle size={18} />
                  {t("page.stockOpname.uploadExcel.parseError")}
                </div>
              )}

              {uploadStatus === "success" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-sm animate-in slide-in-from-bottom-2 duration-200">
                  <CheckCircle2 size={18} />
                  {t("page.stockOpname.uploadExcel.uploadSuccess")}
                </div>
              )}
              {uploadStatus === "error" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm animate-in slide-in-from-bottom-2 duration-200">
                  <AlertCircle size={18} />
                  {t("page.stockOpname.uploadExcel.uploadError")}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="danger" onClick={handleClose}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="general"
                  disabled={!file}
                  disabledReason={t("common.disabledReason.selectFileFirst")}
                  onClick={handlePreview}
                  className="gap-2">
                  <Eye size={16} />
                  {t("page.stockOpname.uploadExcel.preview")}
                </Button>
                <Button
                  variant="import"
                  disabled={!file || uploading}
                  disabledReason={
                    uploading ? undefined : t("common.disabledReason.selectFileFirst")
                  }
                  onClick={handleDirectUpload}
                  className="gap-2 min-w-[140px]">
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t("page.stockOpname.uploadExcel.uploading")}
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      {t("page.stockOpname.uploadExcel.uploadDirect")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadExcelModal;

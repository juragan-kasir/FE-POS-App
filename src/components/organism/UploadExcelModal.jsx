import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "react-query";
import { X, Upload, FileSpreadsheet, AlertCircle, Loader2, ArrowUpToLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PropTypes from "prop-types";

const UploadExcelModal = ({
  open,
  onOpenChange,
  uploadService,
  queryKey,
  title,
  subtitle,
  accept = ".xlsx,.xls,.csv",
  onSuccess,
  onError
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setDragActive(false);
    }
  }, [open]);

  const mutation = useMutation((data) => uploadService(data), {
    onSuccess: (res) => {
      if (queryKey) queryClient.invalidateQueries(queryKey);
      if (onSuccess) {
        onSuccess(res);
      } else {
        toast.success(res?.data?.message || t("page.category.upload.successMsg"));
      }
      handleClose();
    },
    onError: (err) => {
      if (onError) {
        onError(err);
      } else {
        toast.error(err?.response?.data?.message || t("page.category.upload.errorMsg"));
      }
    }
  });

  const handleClose = () => {
    setFile(null);
    setDragActive(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange?.(false);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleUpload = () => {
    if (!file) {
      toast.warning(t("page.category.selectFileFirst"));
      return;
    }
    mutation.mutate(file);
  };

  if (!open) return null;

  return (
    <div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-2xl shadow-2xl border border-border/50 flex flex-col animate-in zoom-in-95 fade-in duration-200">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet size={22} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed transition-all p-12 text-center cursor-pointer ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/60 hover:border-primary/50 hover:bg-muted/20"
              }`}>
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div
                  className="flex items-center gap-4 justify-center"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet size={28} className="text-primary" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div
                  className={`flex flex-col items-center gap-4 transition-all ${dragActive ? "scale-105" : ""}`}>
                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${
                      dragActive ? "bg-primary/10" : "bg-muted/50"
                    }`}>
                    {dragActive ? (
                      <ArrowUpToLine size={40} className="text-primary" />
                    ) : (
                      <Upload size={40} className="text-muted-foreground/40" />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      {dragActive
                        ? t("page.category.upload.dropActive")
                        : t("page.category.upload.dragInactive")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("page.category.upload.format")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {file && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t("page.category.importNote")}
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-300/60 mt-0.5">
                    {t("page.category.importNoteDesc")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="danger" onClick={handleClose} className="gap-2 px-5">
                {t("common.cancel")}
              </Button>
              <Button
                variant="import"
                onClick={handleUpload}
                disabled={!file || mutation.isLoading}
                disabledReason={
                  mutation.isLoading ? undefined : t("common.disabledReason.selectFileFirst")
                }
                className="gap-2 px-6 min-w-[140px]">
                {mutation.isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t("common.uploading")}
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {t("common.upload")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

UploadExcelModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  uploadService: PropTypes.func.isRequired,
  queryKey: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  accept: PropTypes.string,
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default UploadExcelModal;

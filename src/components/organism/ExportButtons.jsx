import PropTypes from "prop-types";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, FileJson } from "lucide-react";
import { exportReport } from "@/services/export";

const FORMATS = [
  { format: "excel", label: "Excel", Icon: FileSpreadsheet },
  { format: "pdf", label: "PDF", Icon: FileText },
  { format: "csv", label: "CSV", Icon: FileJson }
];

const ExportButtons = ({ reportKey, buildParams = () => ({}), disabled = false }) => {
  const { t } = useTranslation();
  const [loadingFormat, setLoadingFormat] = useState(null);

  const handleExport = async (format) => {
    setLoadingFormat(format);
    try {
      await exportReport(reportKey, { format, params: buildParams() });
      toast.success(t("common.success"), { description: t("common.exportSuccess") });
    } catch (err) {
      toast.error(t("common.error"), { description: err?.message || t("common.exportFailed") });
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {FORMATS.map(({ format, label, Icon }) => (
        <button
          key={format}
          type="button"
          disabled={disabled || loadingFormat !== null}
          onClick={() => handleExport(format)}
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900">
          {loadingFormat === format ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
          ) : (
            <Icon size={14} />
          )}
          {label}
        </button>
      ))}
    </div>
  );
};

ExportButtons.propTypes = {
  reportKey: PropTypes.string.isRequired,
  buildParams: PropTypes.func,
  disabled: PropTypes.bool
};

export default ExportButtons;

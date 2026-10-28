import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  RefreshCw,
  Lightbulb,
  Trash2,
  RotateCcw,
  Clock,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import {
  downloadMasterDataBackup,
  createDatabaseBackup,
  getDatabaseBackups,
  downloadDatabaseBackup,
  restoreDatabaseBackup,
  deleteDatabaseBackup,
  getBackupSchedule,
  setBackupSchedule
} from "@/services/backup";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return "-";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// ponytail: validasi cron terprogram — mengganti regex besar berpol quantifier (Codacy DoS)
const isDigitField = (part) => part.length > 0 && [...part].every((ch) => ch >= "0" && ch <= "9");

const isValidCronExpression = (expr) => {
  const fields = expr.trim().split(" ").filter(Boolean);
  if (fields.length !== 5) return false;
  const maxByField = [59, 23, 31, 12, 6];
  return fields.every((field, i) => {
    if (field === "*") return true;
    const maxValue = maxByField.at(i);
    return field.split(",").every((part) => {
      if (!isDigitField(part)) return false;
      const value = Number(part);
      return value >= 0 && value <= maxValue;
    });
  });
};

const BackupPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [cron, setCron] = useState("0 0 * * *");
  const [retention, setRetention] = useState(7);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const {
    data: backupsData,
    isLoading,
    isError,
    refetch
  } = useQuery(["db-backups"], () => getDatabaseBackups({ limit: 50 }));
  const backups = backupsData?.data || [];

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery(["db-backup-schedule"], () =>
    getBackupSchedule()
  );

  React.useEffect(() => {
    if (scheduleData?.data) {
      setCron(scheduleData.data.cron || "0 0 * * *");
      setRetention(scheduleData.data.retention ?? 7);
      setScheduleEnabled(!!scheduleData.data.enabled);
    }
  }, [scheduleData]);

  const createMut = useMutation(() => createDatabaseBackup(), {
    onSuccess: () => {
      toast.success(t("page.backup.createSuccess"));
      queryClient.invalidateQueries(["db-backups"]);
    },
    onError: (err) => toast.error(err?.response?.data?.message || t("page.backup.createFailed"))
  });

  const restoreMut = useMutation((id) => restoreDatabaseBackup(id), {
    onSuccess: () => {
      toast.success(t("page.backup.restoreSuccess"));
      setRestoreTarget(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || t("page.backup.restoreFailed"))
  });

  const deleteMut = useMutation((id) => deleteDatabaseBackup(id), {
    onSuccess: () => {
      toast.success(t("page.backup.deleteSuccess"));
      queryClient.invalidateQueries(["db-backups"]);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || t("page.backup.deleteFailed"))
  });

  const scheduleMut = useMutation((payload) => setBackupSchedule(payload), {
    onSuccess: () => {
      toast.success(t("page.backup.scheduleSuccess"));
      queryClient.invalidateQueries(["db-backup-schedule"]);
    },
    onError: (err) => toast.error(err?.response?.data?.message || t("page.backup.scheduleFailed"))
  });

  const handleScheduleSave = () => {
    if (!isValidCronExpression(cron)) {
      toast.error(t("page.backup.cronInvalid"));
      return;
    }
    scheduleMut.mutate({
      enabled: scheduleEnabled,
      cron: cron.trim(),
      retention: Number(retention) || 0
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadMasterDataBackup();
      toast.success(t("page.backup.exportSuccess"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("page.backup.exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { i18nKey: "breadcrumb.home", href: "/dashboard-super-admin" },
          { i18nKey: "sidebar.backup" }
        ]}
        title={t("page.backup.title")}
        description={t("page.backup.description")}
      />

      {/* Database Backup (pg_dump) */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("page.backup.dbTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("page.backup.dbDesc")}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button
            variant="success"
            onClick={() => createMut.mutate()}
            disabled={createMut.isLoading}
            className="gap-2"
            size="lg">
            {createMut.isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {t("page.backup.creating")}
              </>
            ) : (
              <>
                <Database size={16} />
                {t("page.backup.createButton")}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw size={16} />
            {t("common.refresh")}
          </Button>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">{t("page.backup.listTitle")}</h4>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border/60 rounded-lg">
              <Database size={32} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">{t("page.backup.empty")}</p>
            </div>
          ) : (
            <HorizontalScrollArea>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-medium text-muted-foreground">
                      {t("page.backup.filename")}
                    </th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">
                      {t("page.backup.createdAt")}
                    </th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">
                      {t("page.backup.trigger")}
                    </th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground text-right">
                      {t("page.backup.size")}
                    </th>
                    <th className="py-2 font-medium text-muted-foreground text-right">
                      {t("common.action")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id} className="border-b border-muted/30 last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{b.filename}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {formatDate(b.createdAt)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            b.trigger === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}>
                          {b.trigger === "scheduled"
                            ? t("page.backup.triggerScheduled")
                            : t("page.backup.triggerManual")}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-xs">
                        {formatSize(b.size)}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="general"
                            size="sm"
                            className="h-8 gap-1 text-primary"
                            onClick={() => downloadDatabaseBackup(b.id, b.filename)}>
                            <Download size={14} />
                            {t("page.backup.download")}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1 text-amber-600"
                            onClick={() => setRestoreTarget(b)}>
                            <RotateCcw size={14} />
                            {t("page.backup.restore")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1 text-destructive"
                            onClick={() => setDeleteTarget(b)}>
                            <Trash2 size={14} />
                            {t("page.backup.delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </HorizontalScrollArea>
          )}
        </div>
      </div>

      {/* Automatic Backup Schedule */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Clock size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("page.backup.scheduleTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("page.backup.scheduleDesc")}</p>
          </div>
        </div>

        {scheduleLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        ) : (
          <div className="space-y-4 max-w-lg">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              {t("page.backup.scheduleEnabled")}
            </label>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t("page.backup.scheduleCron")}
              </label>
              <Input
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="0 0 * * *"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("page.backup.scheduleCronExample")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t("page.backup.scheduleRetention")}
              </label>
              <Input
                type="number"
                min={0}
                value={retention}
                onChange={(e) => setRetention(e.target.value)}
                className="w-40"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("page.backup.scheduleRetentionDesc")}
              </p>
            </div>
            <Button
              variant="success"
              onClick={handleScheduleSave}
              disabled={scheduleMut.isLoading}
              className="gap-2">
              {scheduleMut.isLoading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {t("page.backup.scheduleSave")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{t("page.backup.excelSection")}</h3>
              <p className="text-sm text-muted-foreground">{t("page.backup.exportDesc")}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <FileSpreadsheet size={16} className="shrink-0" />
              <span>Excel (.xlsx) — 12 sheet master data</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Database size={16} className="shrink-0" />
              <span>Kategori, Supplier, Produk, Bahan Baku, Pajak, Diskon, dll</span>
            </div>
          </div>

          <Button
            variant="general"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full gap-2"
            size="lg">
            {isExporting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              <>
                <Download size={16} />
                {t("page.backup.downloadButton")}
              </>
            )}
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Upload size={20} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{t("page.backup.restoreTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("page.backup.restoreDesc")}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-sm text-muted-foreground">{t("page.backup.restoreNote")}</p>
          </div>

          <ul className="space-y-2 mb-6">
            {[
              { label: "Produk", href: "/product-list" },
              { label: "Kategori", href: "/category-list" },
              { label: "Supplier", href: "/supplier" },
              { label: "Bahan Baku", href: "/ingredient" },
              { label: "Pajak", href: "/tax-list" },
              { label: "Metode Pembayaran", href: "/type-payment-list" }
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <FileSpreadsheet size={14} />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground italic">{t("page.backup.restoreHint")}</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t("page.backup.tipsTitle")}
            </h4>
            <ul className="space-y-1.5">
              {t("page.backup.tips", { returnObjects: true }).map((tip, i) => (
                <li
                  key={i}
                  className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Modal
        type="danger"
        open={!!restoreTarget}
        onOpenChange={(o) => !o && setRestoreTarget(null)}
        title={t("page.backup.restoreConfirmTitle")}
        description={t("page.backup.restoreConfirmDesc", {
          filename: restoreTarget?.filename || ""
        })}
        confirmText={t("page.backup.restoreConfirmBtn")}
        onConfirm={() => restoreMut.mutate(restoreTarget?.id)}
      />

      <Modal
        type="danger"
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("page.backup.deleteConfirmTitle")}
        description={t("page.backup.deleteConfirmDesc", {
          filename: deleteTarget?.filename || ""
        })}
        confirmText={t("common.delete")}
        onConfirm={() => deleteMut.mutate(deleteTarget?.id)}
      />
    </div>
  );
};

export default BackupPage;

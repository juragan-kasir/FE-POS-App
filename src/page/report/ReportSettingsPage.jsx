import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "react-query";
import { toast } from "sonner";
import {
  Save,
  Eye,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  Banknote,
  Hash,
  Percent,
  Type,
  Image as ImageIcon,
  Phone,
  MapPin,
  Mail,
  Info,
  RotateCcw,
  Check,
  FileBarChart,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { getReportConfigMeta, getReportConfigs, saveReportConfig } from "@/services/reportConfig";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import ReportPreview from "@/components/report/ReportPreview";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { qk } from "@/queries/keys";
import { columnLabel, reportLabel } from "@/utils/reportFormat";

const DEFAULT_ACCENT = "#0f172a";
const DEFAULT_BRANDING = { showLogo: true, showAddress: true, showPhone: true, showEmail: true };

const ACCENTS = [
  { value: "#0f172a", key: "slate" },
  { value: "#1d4ed8", key: "blue" },
  { value: "#15803d", key: "green" },
  { value: "#b45309", key: "amber" },
  { value: "#be123c", key: "rose" },
  { value: "#6d28d9", key: "violet" }
];

const TYPE_META = {
  date: {
    Icon: CalendarDays,
    style: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
  },
  currency: {
    Icon: Banknote,
    style: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
  },
  number: {
    Icon: Hash,
    style: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  },
  percent: {
    Icon: Percent,
    style: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
  },
  string: { Icon: Type, style: "bg-muted text-muted-foreground" }
};

const BRANDING_FIELDS = [
  { field: "showLogo", Icon: ImageIcon },
  { field: "showAddress", Icon: MapPin },
  { field: "showPhone", Icon: Phone },
  { field: "showEmail", Icon: Mail }
];

// The editable settings of one report, from its saved config (or defaults).
const draftFrom = (report, saved) => {
  const known = (report?.columns || []).map((c) => c.key);
  const selected = (saved?.selectedColumns || []).filter((key) => known.includes(key));
  return {
    selected: selected.length ? selected : known,
    accent: saved?.accentColor || DEFAULT_ACCENT,
    branding: { ...DEFAULT_BRANDING, ...(saved?.branding || {}) }
  };
};

const sameDraft = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ReportSettingsPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [meta, setMeta] = useState([]);
  const [configs, setConfigs] = useState({});
  const [activeKey, setActiveKey] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingKey, setPendingKey] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState("pdf");

  const activeReport = useMemo(() => meta.find((r) => r.key === activeKey), [meta, activeKey]);
  const savedDraft = useMemo(
    () => (activeReport ? draftFrom(activeReport, configs[activeKey]) : null),
    [activeReport, configs, activeKey]
  );
  const dirty = !!draft && !!savedDraft && !sameDraft(draft, savedDraft);
  useUnsavedChanges(dirty);

  const openReport = (key, cfgMap = configs, reportList = meta) => {
    const report = reportList.find((r) => r.key === key);
    setActiveKey(key);
    setDraft(report ? draftFrom(report, cfgMap[key]) : null);
  };

  const loadReports = () => {
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        const [metaRes, configRes] = await Promise.all([getReportConfigMeta(), getReportConfigs()]);
        const metaList = metaRes.data || [];
        const cfgMap = {};
        (configRes.data || []).forEach((r) => {
          cfgMap[r.key] = r.config;
        });
        setMeta(metaList);
        setConfigs(cfgMap);
        // ?report=<key> comes from the "Column settings" link on a report page
        const requested = searchParams.get("report");
        const first = metaList.find((r) => r.key === requested) || metaList[0];
        if (first) openReport(first.key, cfgMap, metaList);
      } catch (err) {
        // A failed fetch otherwise left `meta` at its initial empty array,
        // rendering exactly like "no report types configured" — with no
        // way to tell the two apart or retry.
        toast.error(t("common.error"), { description: err?.message });
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Switching report with unsaved changes asks first instead of dropping them.
  const requestReport = (key) => {
    if (key === activeKey) return;
    if (dirty) setPendingKey(key);
    else openReport(key);
  };

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const toggleColumn = (key) => {
    const { selected } = draft;
    if (selected.includes(key)) {
      if (selected.length === 1) {
        toast.error(t("page.reportSettings.requiredColumn"));
        return;
      }
      update({ selected: selected.filter((k) => k !== key) });
    } else {
      update({ selected: [...selected, key] });
    }
  };

  const moveColumn = (key, dir) => {
    const next = [...draft.selected];
    const idx = next.indexOf(key);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    update({ selected: next });
  };

  const resetToDefault = () => update(draftFrom(activeReport, null));

  const handleSave = async () => {
    if (!activeKey || !draft) return;
    if (draft.selected.length === 0) {
      toast.error(t("page.reportSettings.requiredColumn"));
      return;
    }
    setSaving(true);
    try {
      const config = {
        selectedColumns: draft.selected,
        accentColor: draft.accent,
        branding: draft.branding
      };
      await saveReportConfig(activeKey, config);
      setConfigs((prev) => ({ ...prev, [activeKey]: config }));
      // report tables pick up the new columns right away
      queryClient.invalidateQueries(qk.reportData.all());
      toast.success(t("common.success"), { description: t("page.reportSettings.saved") });
    } catch (err) {
      toast.error(t("common.error"), { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const columnsByKey = useMemo(
    () => Object.fromEntries((activeReport?.columns || []).map((c) => [c.key, c])),
    [activeReport]
  );
  const selectedColumns = draft ? draft.selected.map((k) => columnsByKey[k]).filter(Boolean) : [];
  const hiddenColumns = (activeReport?.columns || []).filter(
    (c) => !draft?.selected.includes(c.key)
  );
  const activeLabel = activeReport ? reportLabel(t, activeReport.key, activeReport.label) : "";
  const previewColumns = selectedColumns.map((col) => ({
    ...col,
    label: columnLabel(t, activeKey, col)
  }));

  const typePill = (col) => {
    const { Icon, style } = TYPE_META[col.type] || TYPE_META.string;
    return (
      <span
        className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
        <Icon size={11} />
        {t(`page.reportSettings.columnType.${col.type}`)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { i18nKey: "page.reportSettings.title" }
        ]}
        title={t("page.reportSettings.title")}
        description={t("page.reportSettings.description")}>
        <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!activeReport}>
          <Eye size={16} />
          {t("page.reportSettings.preview")}
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={!activeReport || !dirty}>
          <Save size={16} />
          {t("common.save")}
        </Button>
      </PageHeader>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>{t("page.reportSettings.appliesNote")}</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-72 lg:shrink-0">
          <div className="space-y-1 rounded-xl border border-border bg-card p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("page.reportSettings.reports")}
            </p>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-11 rounded-lg" />
                ))}
              </div>
            ) : loadError ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-xs text-muted-foreground">{t("common.loadError")}</p>
                <Button variant="outline" size="sm" onClick={loadReports}>
                  {t("common.retry")}
                </Button>
              </div>
            ) : (
              meta.map((r) => {
                const active = activeKey === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => requestReport(r.key)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}>
                    <span className="min-w-0 truncate font-medium">
                      {reportLabel(t, r.key, r.label)}
                    </span>
                    {active && dirty ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                        title={t("page.reportSettings.unsaved")}
                      />
                    ) : configs[r.key] ? (
                      <span
                        className={`shrink-0 text-xs font-medium ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {t("page.reportSettings.customized")}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          {activeReport && draft ? (
            <>
              {dirty && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {t("page.reportSettings.unsavedHint")}
                </div>
              )}

              <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{activeLabel}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("page.reportSettings.columnHint")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {t("page.reportSettings.selectedCount", {
                        count: draft.selected.length,
                        total: activeReport.columns.length
                      })}
                    </span>
                    <Button variant="ghost" size="sm" onClick={resetToDefault}>
                      <RotateCcw size={14} />
                      {t("page.reportSettings.resetDefault")}
                    </Button>
                  </div>
                </div>

                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("page.reportSettings.shownColumns")}
                </p>
                <ol className="space-y-2">
                  {selectedColumns.map((col, index) => {
                    const label = columnLabel(t, activeKey, col);
                    return (
                      <li
                        key={col.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                            {index + 1}
                          </span>
                          <Checkbox
                            checked
                            onCheckedChange={() => toggleColumn(col.key)}
                            aria-label={label}
                          />
                          <span className="truncate font-medium">{label}</span>
                          {typePill(col)}
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveColumn(col.key, -1)}
                            disabled={index === 0}
                            className="rounded p-1.5 hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
                            aria-label={`${t("page.reportSettings.moveUp")}: ${label}`}>
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveColumn(col.key, 1)}
                            disabled={index === selectedColumns.length - 1}
                            className="rounded p-1.5 hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
                            aria-label={`${t("page.reportSettings.moveDown")}: ${label}`}>
                            <ChevronDown size={16} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {hiddenColumns.length > 0 && (
                  <>
                    <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("page.reportSettings.hiddenColumns")}
                    </p>
                    <ul className="space-y-2">
                      {hiddenColumns.map((col) => {
                        const label = columnLabel(t, activeKey, col);
                        return (
                          <li
                            key={col.key}
                            className="rounded-lg border border-dashed border-border px-3 py-2">
                            <label className="flex cursor-pointer items-center gap-3 text-sm">
                              <span className="h-6 w-6 shrink-0" />
                              <Checkbox
                                checked={false}
                                onCheckedChange={() => toggleColumn(col.key)}
                                aria-label={label}
                              />
                              <span className="truncate text-muted-foreground">{label}</span>
                              {typePill(col)}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                <h2 className="text-lg font-semibold">{t("page.reportSettings.branding")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("page.reportSettings.brandingDesc")}
                </p>

                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("page.reportSettings.accentColor")}
                </p>
                <div className="flex flex-wrap gap-3" role="radiogroup">
                  {ACCENTS.map((c) => {
                    const active = draft.accent === c.value;
                    const name = t(`page.reportSettings.accent.${c.key}`);
                    return (
                      <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={name}
                        onClick={() => update({ accent: c.value })}
                        className="flex w-14 flex-col items-center gap-1 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span
                          style={{ backgroundColor: c.value }}
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background ${
                            active ? "ring-2 ring-ring" : ""
                          }`}>
                          {active && <Check size={16} />}
                        </span>
                        <span
                          className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("page.reportSettings.accentHint")}
                </p>

                <p className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("page.reportSettings.headerInfo")}
                </p>
                <div className="divide-y divide-border">
                  {BRANDING_FIELDS.map(({ field, Icon }) => (
                    <label
                      key={field}
                      className="flex cursor-pointer items-center justify-between gap-4 py-3">
                      <span className="flex min-w-0 items-start gap-3">
                        <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {t(`page.reportSettings.${field}`)}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {t(`page.reportSettings.${field}Hint`)}
                          </span>
                        </span>
                      </span>
                      <Switch
                        checked={draft.branding[field]}
                        onCheckedChange={(checked) =>
                          update({ branding: { ...draft.branding, [field]: checked } })
                        }
                        aria-label={t(`page.reportSettings.${field}`)}
                      />
                    </label>
                  ))}
                </div>
              </section>
            </>
          ) : (
            !loading && (
              <div className="rounded-xl border border-border bg-card">
                <EmptyState
                  icon={FileBarChart}
                  title={t("page.reportSettings.empty")}
                  description={null}
                />
              </div>
            )
          )}
        </div>
      </div>

      <Dialog open={!!pendingKey} onOpenChange={(open) => !open && setPendingKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("modal.discardTitle")}</DialogTitle>
            <DialogDescription>{t("page.reportSettings.discardDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingKey(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                openReport(pendingKey);
                setPendingKey(null);
              }}>
              {t("modal.discardConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={16} className="text-primary" />
              {t("page.reportSettings.previewTitle")}
            </DialogTitle>
            <DialogDescription>
              {activeLabel} — {t("page.reportSettings.previewDesc")}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={previewTab}
            onValueChange={setPreviewTab}
            className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pdf" className="gap-1.5">
                <FileText size={14} />
                {t("page.reportSettings.previewTabPdf")}
              </TabsTrigger>
              <TabsTrigger value="excel" className="gap-1.5">
                <FileSpreadsheet size={14} />
                {t("page.reportSettings.previewTabExcel")}
              </TabsTrigger>
            </TabsList>
            {["pdf", "excel"].map((variant) => (
              <TabsContent
                key={variant}
                value={variant}
                className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-slate-100 p-3 dark:bg-slate-900">
                <div className="mx-auto max-w-3xl overflow-hidden rounded-md shadow-sm">
                  {draft && (
                    <ReportPreview
                      variant={variant}
                      title={activeLabel}
                      archetype={activeReport?.archetype}
                      columns={previewColumns}
                      totals={activeReport?.totals || []}
                      accent={draft.accent}
                      branding={draft.branding}
                    />
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <p className="text-xs text-muted-foreground">
            {t("page.reportSettings.exportLanguageNote")}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportSettingsPage;

import React, { useId, useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AlertTriangle, Globe, Info, Loader2, RefreshCw, Store, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getEffectiveTax } from "@/services/tax-config";
import {
  classifyEffectiveTaxError,
  effectiveTaxQueryKey,
  isResponseForScope,
  shouldRetryEffectiveTax
} from "@/utils/taxEffective";

// P1: read-only effective-tax summary. Renders what checkout currently
// charges for one context exactly as the backend reports it (rate, rows,
// findings). It never sums rows, never decides tax policy, and never shows a
// failed or mismatched request as a clean configuration.

const KNOWN_FINDINGS = [
  "MULTIPLE_ACTIVE_SAME_SCOPE",
  "GLOBAL_AND_OUTLET_COMBINED",
  "PPN_ZERO_CONFIGURED",
  "PPN_MISSING"
];

const SEVERITY = {
  error: {
    icon: XCircle,
    role: "alert",
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
  },
  warning: {
    icon: AlertTriangle,
    role: "status",
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
  },
  info: {
    icon: Info,
    role: "status",
    className:
      "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
  }
};

const severityOf = (s) => (s === "error" || s === "warning" || s === "info" ? s : "info");

const SCOPE_GROUPS = [
  { key: "outlet", icon: Store, labelKey: "page.taxConfig.scope.thisOutlet" },
  { key: "global", icon: Globe, labelKey: "page.taxConfig.scope.global" }
];

const Notice = ({ severity, children, testId }) => {
  // Explicit selection (no dynamic key): callers only ever pass the three
  // SEVERITY keys — literals or values constrained by severityOf().
  const s =
    severity === "warning"
      ? SEVERITY.warning
      : severity === "info"
        ? SEVERITY.info
        : SEVERITY.error;
  const Icon = s.icon;
  return (
    <div
      role={s.role}
      data-testid={testId}
      className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${s.className}`}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
};

const RowList = ({ rows, testId, highlightRowId, canViewDetail, t }) => {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">{t("page.taxConfig.effective.rows.none")}</p>
    );
  }
  const known = SCOPE_GROUPS.map((g) => ({ ...g, rows: rows.filter((r) => r.scope === g.key) }));
  const other = rows.filter((r) => r.scope !== "outlet" && r.scope !== "global");
  const groups = [
    ...known,
    { key: "other", icon: Info, labelKey: "page.taxConfig.scope.unknown", rows: other }
  ].filter((g) => g.rows.length > 0);

  return (
    <div data-testid={testId} className="space-y-3">
      {groups.map((g) => {
        const Icon = g.icon;
        return (
          <div key={g.key} data-testid={`${testId}-${g.key}`}>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Icon size={13} aria-hidden="true" />
              <span>{t(g.labelKey)}</span>
              <span className="text-muted-foreground/70" aria-hidden="true">
                ·
              </span>
              <span data-testid="scope-group-count">{g.rows.length}</span>
            </h4>
            <ul className="mt-1.5 divide-y divide-border/60 rounded-lg border border-border/60">
              {g.rows.map((r) => {
                const isCurrent =
                  highlightRowId !== undefined &&
                  highlightRowId !== null &&
                  String(r.id) === String(highlightRowId);
                return (
                  <li
                    key={r.id}
                    className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${
                      isCurrent ? "bg-primary/5" : ""
                    }`}>
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      {canViewDetail && !isCurrent ? (
                        <Link
                          to={`/detail-tax?id=${r.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                          {r.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.name}</span>
                      )}
                      {isCurrent && (
                        <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs font-semibold text-primary">
                          {t("page.taxConfig.effective.rows.thisConfig")}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold tabular-nums">{r.rate}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

const EffectiveTaxSummary = ({ scope, outletName, highlightRowId, canViewDetail = false }) => {
  const { t } = useTranslation();
  const headingId = useId();
  const [channel, setChannel] = useState("counter");
  const enabled = scope?.kind === "outlet" || scope?.kind === "global";

  const query = useQuery(
    effectiveTaxQueryKey(scope, channel),
    () => getEffectiveTax({ store: scope.store, channel }),
    { enabled, retry: shouldRetryEffectiveTax, keepPreviousData: false }
  );

  const payload = query.data?.data;
  const matches = query.isSuccess && isResponseForScope(payload, scope, channel);

  const contextText =
    scope?.kind === "global"
      ? t("page.taxConfig.effective.context.global")
      : scope?.kind === "outlet"
        ? outletName
          ? t("page.taxConfig.effective.context.outlet", { name: outletName })
          : t("page.taxConfig.effective.context.outletUnnamed")
        : null;

  const renderError = () => {
    const kind = classifyEffectiveTaxError(query.error);
    const serverMessage = query.error?.response?.data?.message;
    const retryable = kind === "rejected" || kind === "failed" || kind === "missing";
    const showServerMessage = kind === "rejected" || kind === "missing";
    return (
      <Notice severity={kind === "unavailable" ? "info" : "error"}>
        <p>{t(`page.taxConfig.effective.error.${kind}`)}</p>
        {showServerMessage && typeof serverMessage === "string" && serverMessage && (
          <p className="text-xs opacity-90">
            <span className="font-semibold">
              {t("page.taxConfig.effective.error.serverMessage")}
            </span>{" "}
            <span>{serverMessage}</span>
          </p>
        )}
        {retryable && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            disabled={query.isFetching}
            onClick={() => query.refetch()}>
            {query.isFetching && (
              <Loader2 size={14} className="mr-1.5 animate-spin" aria-hidden="true" />
            )}
            {t("common.retry")}
          </Button>
        )}
      </Notice>
    );
  };

  const renderSummary = () => {
    const ppn = payload.ppn || {};
    const serviceCharge = payload.serviceCharge || {};
    const findings = Array.isArray(payload.findings) ? payload.findings : [];
    const ppnRows = Array.isArray(ppn.rows) ? ppn.rows : [];
    const scRows = Array.isArray(serviceCharge.rows) ? serviceCharge.rows : [];
    const hasHighlight = highlightRowId !== undefined && highlightRowId !== null;
    const contributes =
      hasHighlight && [...ppnRows, ...scRows].some((r) => String(r.id) === String(highlightRowId));

    let serviceChargeText;
    if (serviceCharge.status === "configured" && typeof serviceCharge.rate === "number") {
      serviceChargeText = `${serviceCharge.rate}%`;
    } else if (serviceCharge.status === "absent") {
      serviceChargeText = t("page.taxConfig.effective.serviceCharge.absent");
    } else if (serviceCharge.status === "not_applicable") {
      serviceChargeText = t("page.taxConfig.effective.serviceCharge.notApplicable");
    } else {
      serviceChargeText = t("page.taxConfig.effective.notReported");
    }

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t("page.taxConfig.effective.ppn.label")}
            </p>
            {ppn.status === "missing" ? (
              <div className="mt-2">
                <Notice severity="error">
                  <p>{t("page.taxConfig.effective.ppn.missing")}</p>
                </Notice>
              </div>
            ) : typeof ppn.rate === "number" ? (
              <p data-testid="effective-ppn-rate" className="mt-1 text-3xl font-bold tabular-nums">
                {ppn.rate}%
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("page.taxConfig.effective.notReported")}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t("page.taxConfig.effective.serviceCharge.label")}
            </p>
            <p
              data-testid="effective-service-charge"
              className={
                serviceCharge.status === "configured"
                  ? "mt-1 text-3xl font-bold tabular-nums"
                  : "mt-2 text-sm font-medium"
              }>
              {serviceChargeText}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("page.taxConfig.effective.findings.title")}</h3>
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("page.taxConfig.effective.findings.none")}
            </p>
          ) : (
            <ul className="space-y-2">
              {findings.map((f, i) => {
                const severity = severityOf(f?.severity);
                const known = KNOWN_FINDINGS.includes(f?.code);
                return (
                  <li key={`${f?.code}-${i}`}>
                    <Notice severity={severity} testId={`finding-${f?.code}`}>
                      <p className="font-semibold">
                        {t(`page.taxConfig.effective.severity.${severity}`)}
                      </p>
                      <p>{known ? t(`page.taxConfig.effective.finding.${f.code}`) : f?.message}</p>
                      {f?.decision === "undecided" && (
                        <p className="text-xs font-medium opacity-90">
                          {t("page.taxConfig.effective.finding.pendingDecision")}
                        </p>
                      )}
                    </Notice>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("page.taxConfig.effective.rows.ppnTitle")}</h3>
          {hasHighlight && (
            <p className="text-sm text-muted-foreground">
              {contributes
                ? t("page.taxConfig.effective.rows.highlightContributes")
                : t("page.taxConfig.effective.rows.highlightNotContributing")}
            </p>
          )}
          <RowList
            rows={ppnRows}
            testId="effective-ppn-rows"
            highlightRowId={highlightRowId}
            canViewDetail={canViewDetail}
            t={t}
          />
        </div>

        {scRows.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              {t("page.taxConfig.effective.rows.serviceChargeTitle")}
            </h3>
            <RowList
              rows={scRows}
              testId="effective-service-charge-rows"
              highlightRowId={highlightRowId}
              canViewDetail={canViewDetail}
              t={t}
            />
          </div>
        )}
      </div>
    );
  };

  let body;
  if (!enabled) {
    body = (
      <Notice severity="info">
        <p>{t("page.taxConfig.effective.context.unresolved")}</p>
      </Notice>
    );
  } else if (query.isLoading || query.isIdle) {
    body = (
      <div
        role="status"
        aria-live="polite"
        data-testid="effective-tax-loading"
        className="space-y-3">
        <span className="sr-only">{t("page.taxConfig.effective.loading")}</span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  } else if (query.isError) {
    body = renderError();
  } else if (!matches) {
    body = (
      <Notice severity="error">
        <p>{t("page.taxConfig.effective.error.mismatch")}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          disabled={query.isFetching}
          onClick={() => query.refetch()}>
          {t("common.retry")}
        </Button>
      </Notice>
    );
  } else {
    body = renderSummary();
  }

  return (
    <Card className="p-5">
      <section
        aria-labelledby={headingId}
        aria-busy={enabled && query.isFetching ? "true" : "false"}
        className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id={headingId} className="text-base font-semibold">
              {t("page.taxConfig.effective.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("page.taxConfig.effective.subtitle")}
            </p>
            {contextText && <p className="mt-1 text-sm font-medium">{contextText}</p>}
          </div>
          {enabled && (
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label={t("page.taxConfig.effective.channel.label")}
                className="inline-flex rounded-md border border-input p-0.5">
                {["counter", "qr"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={channel === c ? "true" : "false"}
                    onClick={() => setChannel(c)}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      channel === c
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}>
                    {t(`page.taxConfig.effective.channel.${c}`)}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={query.isFetching}
                onClick={() => query.refetch()}>
                <RefreshCw
                  size={14}
                  className={`mr-1.5 ${query.isFetching ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {t("page.taxConfig.effective.refresh")}
              </Button>
            </div>
          )}
        </div>
        {body}
      </section>
    </Card>
  );
};

export default EffectiveTaxSummary;

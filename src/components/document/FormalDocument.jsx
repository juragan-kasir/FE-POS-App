import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

export const PrintButton = ({ title }) => {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      className="no-print gap-2"
      onClick={() => window.print()}>
      <Printer size={16} />
      {title || t("common.print")}
    </Button>
  );
};

export const FormalDocument = ({ spec }) => {
  const { t } = useTranslation();
  const {
    title,
    number,
    reference,
    subtitle,
    meta = [],
    columns = [],
    rows = [],
    totals = [],
    signature,
    footerText
  } = spec || {};

  return (
    <div id="print-area" className="print-doc">
      <div className="doc-head">
        <div className="doc-brand">{t("document.brandName")}</div>
        <div className="doc-brand-sub">{t("document.brandAddress")}</div>
      </div>

      <div className="doc-title-row">
        <div className="doc-number">
          {number && (
            <>
              {t("document.no")}: {number}
            </>
          )}
          {reference && (
            <>
              <br />
              {t("document.reference")}: {reference}
            </>
          )}
        </div>
        <div className="doc-title">{title}</div>
        {subtitle && <div className="doc-subtitle">{subtitle}</div>}
      </div>

      {meta.length > 0 && (
        <div className="doc-meta">
          {meta.map((m, i) => (
            <div className="doc-meta-row" key={i}>
              <span className="doc-meta-label">{m.label}</span>
              <span className="doc-meta-value">{m.value || "-"}</span>
            </div>
          ))}
        </div>
      )}

      <table className="doc-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === "right" ? "is-right" : ""}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === "right" ? "is-right" : ""}>
                  {r[c.key] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totals.length > 0 && (
        <div className="doc-totals">
          {totals.map((tl, i) => (
            <div className="doc-total-row" key={i}>
              <span className="doc-total-label">{tl.label}</span>
              <span className="doc-total-value">{tl.value}</span>
            </div>
          ))}
        </div>
      )}

      {signature && (
        <div className="doc-signature">
          {[
            { role: t("document.preparedBy"), name: signature.preparedBy },
            { role: t("document.knownBy"), name: signature.knownBy },
            { role: t("document.approvedBy"), name: signature.approvedBy }
          ].map((s, i) => (
            <div className="doc-sign-col" key={i}>
              <div className="doc-sign-role">{s.role}</div>
              <div className="doc-sign-line" />
              <div className="doc-sign-name">{s.name || "..................."}</div>
            </div>
          ))}
        </div>
      )}

      {footerText && <div className="doc-footer">{footerText}</div>}
    </div>
  );
};

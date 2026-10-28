import React from "react";
import fs from "fs";
import { render, screen } from "@testing-library/react";
import PaymentBreakdown from "@/components/dashboard-super-admin/PaymentBreakdown";

// Resolve keys against the runtime dictionary (public/locales) so assertions
// use the real ID copy users see.
const RUNTIME_ID = JSON.parse(fs.readFileSync("public/locales/id/translation.json", "utf8"));
const mockLocale = new Map(Object.entries(RUNTIME_ID));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      const v = mockLocale.get(k);
      if (typeof v !== "string") return k;
      return v.replace(/{{\s*(\w+)\s*}}/g, (m, name) =>
        opts && opts[name] != null ? String(opts[name]) : m
      );
    },
    i18n: { language: "id" }
  })
}));

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// The dashboard API reports payment buckets as the seven canonical tenders
// plus the UNRECONCILED reporting bucket (BE canonicalPayment.js). E_WALLET
// used to be shown as "Lainnya" because the buckets were legacy keys.

const CANONICAL_LABELS = [
  ["CASH", "Tunai"],
  ["CARD", "Kartu"],
  ["BANK_TRANSFER", "Transfer Bank"],
  ["E_WALLET", "E-Wallet"],
  ["QRIS", "QRIS"],
  ["POINTS", "Poin"],
  ["OTHER", "Lainnya"]
];

describe("PaymentBreakdown", () => {
  test.each(CANONICAL_LABELS)("bucket %s is labelled %s", (type, label) => {
    render(
      <PaymentBreakdown
        paymentBreakdown={{
          totalPayments: 1000,
          byType: [{ type, count: 1, amount: 1000 }],
          byMethod: []
        }}
      />
    );
    expect(screen.getByText(label)).toBeTruthy();
  });

  test("E_WALLET is never shown as Lainnya", () => {
    render(
      <PaymentBreakdown
        paymentBreakdown={{
          totalPayments: 1110000,
          byType: [
            { type: "CASH", count: 1, amount: 555000 },
            { type: "E_WALLET", count: 1, amount: 555000 }
          ],
          byMethod: [
            { method: "CASH", bucket: "CASH", count: 1, amount: 555000 },
            { method: "E_WALLET", bucket: "E_WALLET", count: 1, amount: 555000 }
          ]
        }}
      />
    );
    expect(screen.queryByText("Lainnya")).toBeNull();
    expect(screen.getAllByText("E-Wallet").length).toBeGreaterThan(0);
  });

  test("UNRECONCILED is labelled explicitly and its chip keeps the stored value", () => {
    render(
      <PaymentBreakdown
        paymentBreakdown={{
          totalPayments: 9000,
          byType: [{ type: "UNRECONCILED", count: 1, amount: 9000 }],
          byMethod: [{ method: "bitcoin", bucket: "UNRECONCILED", count: 1, amount: 9000 }]
        }}
      />
    );
    expect(screen.getAllByText("Tidak Terekonsiliasi").length).toBeGreaterThan(0);
    expect(screen.getByText("bitcoin")).toBeTruthy();
  });

  test("unknown or prototype-injected bucket keys fall back to UNRECONCILED, never to a real tender", () => {
    const byType = [
      { type: "CASH", amount: 120000 },
      { type: "__proto__", amount: 80000 },
      { type: "constructor", amount: 5000 }
    ];
    const { container } = render(
      <PaymentBreakdown paymentBreakdown={{ totalPayments: 205000, byType, byMethod: [] }} />
    );
    expect(screen.getAllByText("Tidak Terekonsiliasi").length).toBe(2);
    expect(screen.queryByText("Lainnya")).toBeNull();
    expect(screen.getByText("Tunai")).toBeTruthy();
    expect(container.textContent).not.toContain("undefined");
  });

  test("renders an empty state when there is no data", () => {
    render(<PaymentBreakdown paymentBreakdown={{}} />);
    expect(screen.getByText("Belum ada data pembayaran")).toBeTruthy();
  });
});

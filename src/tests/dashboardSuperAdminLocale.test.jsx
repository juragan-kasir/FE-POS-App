import React from "react";
import fs from "fs";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import DashboardSuperAdmin from "@/page/dashboard-super-admin";
import KpiCards from "@/components/dashboard-super-admin/KpiCards";
import PaymentBreakdown from "@/components/dashboard-super-admin/PaymentBreakdown";
import StorePerformance from "@/components/dashboard-super-admin/StorePerformance";
import FinanceSection from "@/components/dashboard-super-admin/FinanceSection";
import OperationsSection from "@/components/dashboard-super-admin/OperationsSection";
import CustomersSection from "@/components/dashboard-super-admin/CustomersSection";
import ActivitySection from "@/components/dashboard-super-admin/ActivitySection";
import { getSuperAdminDashboard } from "@/services/dashboard";

// The Super Admin dashboard used to hardcode its Indonesian copy, so
// switching the app to English left the whole page in Indonesian. Every
// string now goes through t(); this renders it with the EN runtime
// dictionary and checks the Indonesian copy is gone.

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const RUNTIME = {
  en: JSON.parse(fs.readFileSync("public/locales/en/translation.json", "utf8")),
  id: JSON.parse(fs.readFileSync("public/locales/id/translation.json", "utf8"))
};
const mockLocales = {
  en: new Map(Object.entries(RUNTIME.en)),
  id: new Map(Object.entries(RUNTIME.id))
};
const mockState = { lng: "en" };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      const v = mockLocales[mockState.lng].get(k);
      if (typeof v !== "string") return k;
      return v.replace(/{{\s*(\w+)\s*}}/g, (m, name) =>
        opts && opts[name] != null ? String(opts[name]) : m
      );
    },
    i18n: { language: mockState.lng }
  })
}));

jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ activeStoreId: "", setActiveStore: jest.fn() })
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: [] } })
}));
jest.mock("@/services/expense", () => ({
  getUpcomingPayments: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/product", () => ({
  getAllProductTable: jest.fn(() => Promise.resolve({ stats: { total: 3 } }))
}));
jest.mock("@/services/dashboard", () => ({
  getSuperAdminDashboard: jest.fn()
}));

const summary = {
  revenue: 2500000,
  orders: 12,
  itemsSold: 30,
  avgOrderValue: 208333,
  netRevenue: 1500000,
  netMargin: 60,
  totalExpense: 1000000,
  totalMembers: 5,
  newMembers: 2,
  apOutstanding: 0,
  arOutstanding: 0,
  discount: 0,
  tax: 0,
  growth: { revenue: 10, orders: 5, expense: 0, newMembers: 0 }
};

const sections = () => (
  <>
    <KpiCards summary={summary} />
    <PaymentBreakdown
      paymentBreakdown={{
        totalPayments: 1000,
        byType: [{ type: "CASH", count: 1, amount: 1000 }],
        byMethod: [{ method: "CASH", bucket: "CASH", count: 1, amount: 1000 }]
      }}
    />
    <StorePerformance storePerformance={[]} totalRevenue={0} />
    <FinanceSection finance={{}} summary={summary} />
    <OperationsSection
      operations={{
        production: { in_progress: 1 },
        lowStockItems: [
          { id: 1, type: "ingredient", name: "Gula", storeName: "A", stock: 1, minStock: 5 }
        ],
        lowStockCount: 1,
        cashRegister: { open: 1, closed: 1 }
      }}
    />
    <CustomersSection customers={{}} />
    <ActivitySection
      activity={{
        recentOrders: [
          { id: 1, orderNumber: "ORD-1", totalPrice: 1000, createdAt: new Date().toISOString() }
        ]
      }}
    />
  </>
);

// Indonesian copy that used to be hardcoded in these components.
const INDONESIAN = [
  "Pendapatan",
  "Pengeluaran",
  "Breakdown Pembayaran",
  "Tunai",
  "Belum ada",
  "Tidak ada",
  "Operasional",
  "Berjalan",
  "Bahan",
  "Pelanggan",
  "Aktivitas Terkini",
  "baru saja",
  "Muat Ulang",
  "Semua Toko",
  "Ringkasan bisnis"
];

afterEach(() => {
  mockState.lng = "en";
});

describe("Super Admin dashboard language", () => {
  test("every dashboard key exists in both runtime dictionaries", () => {
    const prefix = "page.dashboardSuperAdmin.";
    const en = Object.keys(RUNTIME.en).filter((k) => k.startsWith(prefix));
    const id = Object.keys(RUNTIME.id).filter((k) => k.startsWith(prefix));
    expect(en.length).toBeGreaterThan(0);
    expect(en.sort()).toEqual(id.sort());
  });

  test("sections render English copy and no Indonesian when the language is en", () => {
    const { container } = render(sections());
    const text = container.textContent;
    expect(text).toContain("Total Revenue");
    expect(text).toContain("Payment Breakdown");
    expect(text).toContain("Cash");
    expect(text).toContain("In Progress: 1");
    expect(text).toContain("Ingredient");
    expect(text).toContain("just now");
    INDONESIAN.forEach((word) => expect(text).not.toContain(word));
    expect(text).not.toMatch(/page\.dashboardSuperAdmin\./);
  });

  test("sections keep the Indonesian copy when the language is id", () => {
    mockState.lng = "id";
    const { container } = render(sections());
    expect(container.textContent).toContain("Total Pendapatan");
    expect(container.textContent).toContain("Berjalan: 1");
    expect(container.textContent).not.toMatch(/page\.dashboardSuperAdmin\./);
  });

  test("the page header and filters follow the language", async () => {
    getSuperAdminDashboard.mockResolvedValue({ data: { summary } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container, findByText } = render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DashboardSuperAdmin />
        </MemoryRouter>
      </QueryClientProvider>
    );
    await findByText("Total Revenue");
    const text = container.textContent;
    expect(text).toContain("Super Admin Dashboard");
    expect(text).toContain("This Month");
    expect(text).toContain("Reload");
    expect(text).toContain("All stores");
    expect(text).toContain("12 orders · 30 items sold · 5 members");
    INDONESIAN.forEach((word) => expect(text).not.toContain(word));
    expect(document.title).toBe("Super Admin Dashboard - POS");
  });
});

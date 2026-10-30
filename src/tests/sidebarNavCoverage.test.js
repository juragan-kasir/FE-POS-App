import { sidebarMenuSuperAdmin, sidebarMenuAdmin, navCategories } from "@/utils/sidebar-menu";

// The sidebar shows navCategories; search (Ctrl+K) and permissions use the
// sidebarMenu* lists. When the two drift, a page is reachable only through
// Ctrl+K (sales returns, receivables, queue and waiter calls were). Every
// page in a role's menu must also be in that role's sidebar categories.

// Shown outside the categories: the POS rail in Sidebar.jsx and the
// dashboard link.
const OUTSIDE_CATEGORIES = new Set([
  "/home",
  "/cash-register/current",
  "/cash-register/xz-report",
  "/kitchen-display",
  "/qr-order-management",
  "/dashboard-super-admin",
  "/dashboard-admin"
]);

const menuHrefs = (menu) => {
  const out = [];
  const walk = (items) =>
    items.forEach((item) => {
      if (item.href && !item.external) out.push(item.href);
      if (item.children) walk(item.children);
    });
  walk(menu);
  return out;
};

const categoryHrefs = (categories) =>
  new Set(categories.flatMap((cat) => cat.sections.flatMap((s) => s.items.map((i) => i.href))));

describe.each([
  ["super_admin", sidebarMenuSuperAdmin, navCategories.super_admin],
  ["admin", sidebarMenuAdmin, navCategories.admin]
])("%s sidebar", (_, menu, categories) => {
  test("shows every page of the role's menu", () => {
    const shown = categoryHrefs(categories);
    const missing = menuHrefs(menu).filter((h) => !OUTSIDE_CATEGORIES.has(h) && !shown.has(h));
    expect(missing).toEqual([]);
  });
});

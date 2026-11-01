import { matchPath } from "react-router-dom";
import { getLeafItemsGrouped } from "@/page/role/rolePermissions";
import { hasMenuAccess } from "@/utils/permission";
import { bypassesMenuPermissions } from "@/utils/role";

// One rule for the sidebar and for opening a page by URL, so a menu the
// sidebar hides can't be reached by typing its address, and a menu it shows
// always opens.
//
// Only menus a role can actually be granted in Role Management (the
// permission matrix) are guarded, and only for menu-controlled accounts (an
// accessMenu, no super_admin bypass). Everything else keeps its own guards:
// landing pages, profile/notifications, Tenant / Store Configuration
// (canonical permissions) and menus the matrix does not offer.

const MATRIX_ACTIONS = new Map(
  getLeafItemsGrouped()
    .flatMap((group) => group.items)
    .map((item) => [item.href, item.actions || []])
);

// Where a user lands after login: never locked behind a checkbox.
const LANDING = new Set(["/home", "/dashboard-super-admin"]);

// Add / edit / detail pages → the menu they belong to and the action they
// need from it.
export const SUBPAGES = [
  ["/add-product", "/product-list", "add"],
  ["/edit-product", "/product-list", "edit"],
  ["/detail-product/:id", "/product-list", "view"],
  ["/add-category", "/category-list", "add"],
  ["/edit-category", "/category-list", "edit"],
  ["/detail-category", "/category-list", "view"],
  ["/bundle/add", "/bundle", "add"],
  ["/bundle/edit/:id", "/bundle", "edit"],
  ["/bundle/:id", "/bundle", "view"],
  ["/add-discount", "/discount-list", "add"],
  ["/edit-discount", "/discount-list", "edit"],
  ["/detail-discount", "/discount-list", "view"],
  ["/add-promo", "/promo-list", "add"],
  ["/edit-promo", "/promo-list", "edit"],
  ["/detail-promo", "/promo-list", "view"],
  ["/add-type-payment", "/type-payment-list", "add"],
  ["/edit-type-payment", "/type-payment-list", "edit"],
  ["/detail-type-payment", "/type-payment-list", "view"],
  ["/add-tax", "/tax-list", "add"],
  ["/edit-tax", "/tax-list", "edit"],
  ["/detail-tax", "/tax-list", "view"],
  ["/add-reservation", "/reservation", "add"],
  ["/edit-reservation", "/reservation", "edit"],
  ["/reservation/:id", "/reservation", "view"],
  ["/add-location", "/location-list", "add"],
  ["/edit-location", "/location-list", "edit"],
  ["/detail-location", "/location-list", "view"],
  ["/detail-table", "/table-list", "view"],
  ["/add-role", "/role-management", "add"],
  ["/edit-role/:id", "/role-management", "edit"],
  ["/detail-role/:id", "/role-management", "view"],
  ["/add-supplier", "/supplier", "add"],
  ["/edit-supplier", "/supplier", "edit"],
  ["/detail-supplier", "/supplier", "view"],
  ["/supplier-comparison", "/supplier", "view"],
  ["/detail-supplier-category", "/supplier-category", "view"],
  ["/detail-supplier-score", "/supplier-score-list", "view"],
  ["/add-ingredient", "/ingredient", "add"],
  ["/edit-ingredient", "/ingredient", "edit"],
  ["/detail-ingredient", "/ingredient", "view"],
  ["/add-ingredient-category", "/ingredient-category", "add"],
  ["/edit-ingredient-category", "/ingredient-category", "edit"],
  ["/detail-ingredient-category", "/ingredient-category", "view"],
  ["/add-purchase-order", "/purchase-order", "add"],
  ["/edit-purchase-order", "/purchase-order", "edit"],
  ["/purchase-order/detail", "/purchase-order", "view"],
  ["/add-goods-request", "/goods-request", "add"],
  ["/edit-goods-request", "/goods-request", "edit"],
  ["/goods-request/detail", "/goods-request", "view"],
  ["/add-goods-receipt", "/goods-receipt", "add"],
  ["/edit-goods-receipt", "/goods-receipt", "edit"],
  ["/goods-receipt/detail", "/goods-receipt", "view"],
  ["/purchase-return/detail", "/purchase-return", "view"],
  ["/cash-register/open-close", "/cash-register/current", "add"],
  ["/purchase-payment-detail", "/purchase-payment", "view"],
  ["/sales-return/detail", "/sales-return", "view"],
  ["/accounts-receivable/detail", "/accounts-receivable", "view"],
  ["/add-stock-opname", "/stock-opname", "add"],
  ["/stock-opname/detail", "/stock-opname", "view"],
  ["/add-stock-transfer", "/stock-transfer", "add"],
  ["/stock-transfer/detail", "/stock-transfer", "view"],
  ["/add-production-order", "/production-order", "add"],
  ["/production-order/detail", "/production-order", "view"],
  ["/bom/add", "/bom", "add"],
  ["/bom/detail", "/bom", "view"],
  ["/low-stock-all", "/low-stock", "view"],
  ["/detail-delivery-order", "/delivery-orders", "view"],
  ["/add-driver", "/driver-list", "add"],
  ["/edit-driver", "/driver-list", "edit"],
  ["/detail-driver", "/driver-list", "view"],
  ["/add-expense-category", "/expense-category", "add"],
  ["/edit-expense-category", "/expense-category", "edit"],
  ["/detail-expense-category", "/expense-category", "view"],
  ["/add-user", "/user-list", "add"],
  ["/add-employee", "/employee-list", "add"],
  ["/edit-employee", "/employee-list", "edit"],
  ["/detail-employee", "/employee-list", "view"],
  ["/add-department", "/department-list", "add"],
  ["/edit-department", "/department-list", "edit"],
  ["/detail-department", "/department-list", "view"],
  ["/add-position", "/position-list", "add"],
  ["/edit-position", "/position-list", "edit"],
  ["/detail-position", "/position-list", "view"],
  ["/add-shift", "/shift-list", "add"],
  ["/edit-shift", "/shift-list", "edit"],
  ["/detail-shift", "/shift-list", "view"],
  ["/add-shift-template", "/shift-template-list", "add"],
  ["/edit-shift-template", "/shift-template-list", "edit"],
  ["/detail-shift-template", "/shift-template-list", "view"],
  ["/add-business-trip", "/business-trip", "add"],
  ["/edit-business-trip", "/business-trip", "edit"],
  ["/business-trip/detail", "/business-trip", "view"],
  ["/add-member", "/member-list", "add"],
  ["/edit-member", "/member-list", "edit"],
  ["/detail-member", "/member-list", "view"],
  ["/member-point-history", "/member-list", "view"],
  ["/add-member-tier", "/member-tier", "add"],
  ["/edit-member-tier/:id", "/member-tier", "edit"],
  ["/detail-member-tier", "/member-tier", "view"],
  ["/add-expense", "/expense", "add"],
  ["/edit-expense", "/expense", "edit"],
  ["/detail-expense", "/expense", "view"]
];

// Any action of the menu opens it. The matrix offers some menus without
// "view" (Penyesuaian Stok is add-only), so "view" alone would hide them.
export const canOpenMenu = (user, href) =>
  hasMenuAccess(user, href, MATRIX_ACTIONS.get(href) || ["view"]);

export const isMenuControlled = (user) =>
  Array.isArray(user?.accessMenu) && user.accessMenu.length > 0 && !bypassesMenuPermissions(user);

// The menu grant a page needs, or null when this guard does not decide it.
export const requiredMenuAccess = (pathname) => {
  if (!pathname || LANDING.has(pathname)) return null;
  if (MATRIX_ACTIONS.has(pathname)) return { href: pathname, action: null };
  const sub = SUBPAGES.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname));
  if (!sub || !MATRIX_ACTIONS.has(sub[1])) return null;
  const [, href, action] = sub;
  // An action the matrix never offers for this menu can't be granted; fall
  // back to "can open the menu" instead of locking the page for everyone.
  return { href, action: MATRIX_ACTIONS.get(href).includes(action) ? action : null };
};

export const canOpenPage = (user, pathname) => {
  if (!isMenuControlled(user)) return true;
  const required = requiredMenuAccess(pathname);
  if (!required) return true;
  return required.action
    ? hasMenuAccess(user, required.href, [required.action])
    : canOpenMenu(user, required.href);
};

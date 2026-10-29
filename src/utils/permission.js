/* eslint-disable no-unused-vars */
import { sidebarMenuSuperAdmin } from "@/utils/sidebar-menu";
import { safeGet } from "@/lib/safe-lookup";
import { readRememberedUser } from "@/lib/remembered-session";
import { bypassesMenuPermissions } from "@/utils/role";

export const parseAccessMenu = (accessMenu) => {
  if (Array.isArray(accessMenu)) return accessMenu;
  if (typeof accessMenu === "string") {
    try {
      return JSON.parse(accessMenu);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const resolveAccessMenu = (user) => {
  const own = parseAccessMenu(user?.accessMenu);
  if (own.length > 0) return own;
  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem("user"));
  } catch {
    session = null;
  }
  const fromSession = parseAccessMenu(session?.accessMenu);
  if (fromSession.length > 0) return fromSession;
  return parseAccessMenu(readRememberedUser()?.accessMenu);
};

export const getAllMenuItems = () => {
  const items = [];
  const walk = (list, parentKey = "") => {
    list.forEach((item) => {
      const key = parentKey ? `${parentKey}.${item.i18nKey}` : item.i18nKey;
      if (item.children && item.children.length > 0) {
        walk(item.children, key);
      } else {
        items.push({
          key,
          label: item.title,
          i18nKey: item.i18nKey,
          href: item.href,
          actions: item.actions || []
        });
      }
    });
  };
  walk(sidebarMenuSuperAdmin);
  return items;
};

export const getMenuActions = (menuItems) => {
  const allActions = new Set();
  menuItems.forEach((item) => {
    (item.actions || []).forEach((a) => allActions.add(a));
    if (item.children) {
      item.children.forEach((child) => (child.actions || []).forEach((a) => allActions.add(a)));
    }
  });
  return [
    "view",
    "add",
    "edit",
    "delete",
    "import",
    "export",
    "approve",
    "print",
    "edit-points",
    "edit-access",
    "reset-password",
    "update-status"
  ];
};

export const buildAccessMenuPayload = (permissions) => {
  return Object.entries(permissions).map(([menuKey, actions]) => ({
    menu: menuKey,
    ...actions
  }));
};

export const parseAccessMenuToPermissions = (accessMenu = []) => {
  if (!Array.isArray(accessMenu)) return {};
  const result = {};
  accessMenu.forEach((item) => {
    result[item.menu] = { ...item };
    delete result[item.menu].menu;
  });
  return result;
};

export const findMenuPermission = (permissions, href) => {
  // ponytail: safeGet — akses berkunci variabel lolos object injection
  const direct = safeGet(permissions, href);
  if (direct) return direct;
  const pathPart = href
    ?.replace("/", "")
    .replace("-list", "")
    .replace("-page", "")
    .replace("-super-admin", "");
  const result = safeGet(permissions, pathPart);
  if (!result) return null;
  return result;
};

const ACTION_MAP = {
  read: "view",
  create: "add",
  update: "edit",
  upload: "import",
  download: "export",
  view: "view",
  add: "add",
  edit: "edit",
  import: "import",
  export: "export",
  detail: "view"
};

// Callers ask with either vocabulary ("create"/"update"/"detail" or
// "add"/"edit"/"view"); the stored keys are normalized the same way, so a
// menu saved as { add: true } also answers canAccess(..., "create").
const normalizeAction = (action) => safeGet(ACTION_MAP, action) || action;

export const normalizePermissionActions = (perm) => {
  if (!perm) return perm;
  // ponytail: fromEntries — O(N) & tanpa penulisan objek berkunci variabel
  return Object.fromEntries(
    Object.entries(perm).map(([key, val]) => [safeGet(ACTION_MAP, key) || key, val])
  );
};

export const canAccess = (user, menuKey, action) => {
  if (!user) return false;
  if (bypassesMenuPermissions(user)) return true;
  // ponytail: accessMenu stripped from cookie to fit 4KB limit, read from sessionStorage
  const accessMenu = resolveAccessMenu(user);
  if (!accessMenu || accessMenu.length === 0) return false;
  const menu = accessMenu.find(
    (m) =>
      m.menu === menuKey ||
      m.menu ===
        menuKey
          .replace("/", "")
          .replace("-list", "")
          .replace("-page", "")
          .replace("-super-admin", "")
  );
  if (!menu) return false;
  const normalized = normalizePermissionActions(menu);
  return !!safeGet(normalized, normalizeAction(action), false);
};

// The stored accessMenu grant for a menu, without the role-based super_admin
// bypass. Callers that need an explicit opt-in (e.g. /tenant) use this so a
// platform super_admin is not treated as granted by roleType alone.
export const hasExplicitMenuAccess = (user, href, actions) => {
  if (!user) return false;
  // ponytail: accessMenu stripped from cookie to fit 4KB limit, read from sessionStorage
  const accessMenu = resolveAccessMenu(user);
  if (!accessMenu || accessMenu.length === 0) return false;

  const permissions = parseAccessMenuToPermissions(accessMenu);
  const perm = normalizePermissionActions(findMenuPermission(permissions, href));
  if (!perm) return false;
  if (actions && actions.length > 0) {
    return actions.some((a) => !!safeGet(perm, normalizeAction(a)));
  }
  return !!perm.view;
};

export const hasMenuAccess = (user, href, actions) => {
  if (!user) return false;
  if (bypassesMenuPermissions(user)) return true;
  return hasExplicitMenuAccess(user, href, actions);
};

export const filterMenuByPermission = (menuItems, user) => {
  if (!user) return [];
  if (bypassesMenuPermissions(user)) return menuItems;

  const hasAccess = (href, actions) => hasMenuAccess(user, href, actions);

  const filterItems = (items) => {
    return items.filter((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterItems(item.children);
        item.children = filteredChildren;
        return filteredChildren.length > 0;
      }
      return hasAccess(item.href, item.actions);
    });
  };
  return filterItems([...menuItems]);
};

// `canSee(href, actions)` decides one item; the Sidebar passes canOpenMenu
// (utils/pageAccess) so the menu and opening the page by URL share a rule.
export const filterNavCategoriesByPermission = (
  categories,
  user,
  canSee = (href, actions) => hasMenuAccess(user, href, actions)
) => {
  if (!user) return [];
  if (bypassesMenuPermissions(user)) return categories;

  const hasAccess = canSee;

  const result = [];
  categories.forEach((cat) => {
    const sections = [];
    (cat.sections || []).forEach((section) => {
      const items = (section.items || []).filter(
        (item) => item.href == null || hasAccess(item.href, item.actions)
      );
      if (items.length > 0) {
        sections.push({ ...section, items });
      }
    });
    if (sections.length > 0) {
      result.push({ ...cat, sections });
    }
  });
  return result;
};

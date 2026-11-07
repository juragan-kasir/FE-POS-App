import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getLeafItemsGrouped } from "@/page/role/rolePermissions";
import { requiredMenuAccess } from "@/utils/pageAccess";

const BRAND_NAME = "Juragan Kasir";
const PAGES_WITH_OWN_TITLE = new Set(["/dashboard-super-admin"]);

const MENU_TITLE_KEYS = new Map(
  getLeafItemsGrouped()
    .flatMap((group) => group.items)
    .map((item) => [item.href, item.i18nKey])
);

export const useRouteDocumentTitle = (pathname) => {
  const { t } = useTranslation();
  const titleKey = MENU_TITLE_KEYS.get(requiredMenuAccess(pathname)?.href ?? pathname);
  const documentTitle = titleKey ? `${t(titleKey)} | ${BRAND_NAME}` : BRAND_NAME;
  const hasOwnTitle = PAGES_WITH_OWN_TITLE.has(pathname);

  useEffect(() => {
    if (hasOwnTitle) return;
    document.title = documentTitle;
  }, [documentTitle, hasOwnTitle]);
};

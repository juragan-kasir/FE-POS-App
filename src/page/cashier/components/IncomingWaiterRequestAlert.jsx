import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getWaiterRequestList } from "@/services/waiterRequest";
import { safeGet } from "@/lib/safe-lookup";
import { readSeenIds, writeSeenIds } from "@/lib/session-seen";
import {
  WAITER_REQUEST_ALERT_LIMIT,
  WAITER_REQUEST_ALERT_MS,
  WAITER_REQUEST_PATH,
  WAITER_REQUEST_POLL_MS,
  WAITER_REQUEST_TYPE_LABEL_KEYS
} from "@/constants/waiterRequest";

const seenKey = (store) => `waiter-request-alert-seen:${store}`;

const usePendingWaiterRequests = (store) => {
  const { data } = useQuery(
    ["cashier-waiter-requests-pending", store],
    () =>
      getWaiterRequestList({
        store,
        page: 1,
        limit: WAITER_REQUEST_ALERT_LIMIT,
        status: "pending"
      }),
    { enabled: !!store, refetchInterval: WAITER_REQUEST_POLL_MS }
  );
  return data?.data || [];
};

const IncomingWaiterRequestAlert = ({ store }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pending = usePendingWaiterRequests(store);
  const seen = useRef(readSeenIds(seenKey(store)));

  useEffect(() => {
    const fresh = pending.filter((request) => !seen.current.has(String(request.id)));
    if (fresh.length === 0) return;
    fresh.forEach((request) => {
      const typeKey = safeGet(WAITER_REQUEST_TYPE_LABEL_KEYS, request.type, null);
      toast.info(t("page.waiterRequest.ui.newWaiterRequest"), {
        id: `waiter-request-${request.id}`,
        duration: WAITER_REQUEST_ALERT_MS,
        description: t("page.cashier.waiterAlert.description", {
          type: typeKey ? t(typeKey) : request.type,
          table: request.table?.name || t("common.ui.tableNumber", { name: request.tableId || "-" })
        }),
        action: { label: t("common.view"), onClick: () => navigate(WAITER_REQUEST_PATH) }
      });
      seen.current.add(String(request.id));
    });
    writeSeenIds(seenKey(store), seen.current);
  }, [pending, store, navigate, t]);

  return null;
};

IncomingWaiterRequestAlert.propTypes = {
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default IncomingWaiterRequestAlert;

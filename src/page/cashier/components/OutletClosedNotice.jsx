import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocationById } from "@/services/location";

const P = "page.cashier.outletClosed";
const OPEN_STATUS_POLL_MS = 60000;
const HOURS_EDITOR_ROLES = ["admin", "super_admin"];

const formatNextOpen = (iso, timezone) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("id-ID", {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      ...(timezone ? { timeZone: timezone } : {})
    });
  } catch {
    return null;
  }
};

const OutletClosedNotice = ({ store, role }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery(["store-detail", store], () => getLocationById({ id: store }), {
    enabled: !!store,
    refetchInterval: OPEN_STATUS_POLL_MS
  });
  const location = data?.data || null;
  if (location?.openStatus?.isOpen !== false) return null;

  const nextOpen = formatNextOpen(location.openStatus.nextOpenAt, location.timezone);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-2 border-b border-amber-500/30 bg-amber-500/10 text-sm">
      <Clock size={16} aria-hidden="true" className="text-amber-600 shrink-0" />
      <p className="flex-1 min-w-0 text-foreground">
        {t(`${P}.message`)}
        {nextOpen && (
          <span className="text-muted-foreground"> {t(`${P}.nextOpen`, { time: nextOpen })}</span>
        )}
      </p>
      {HOURS_EDITOR_ROLES.includes(role) && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => navigate(`/edit-location?id=${store}`)}>
          {t(`${P}.editHours`)}
        </Button>
      )}
    </div>
  );
};

OutletClosedNotice.propTypes = {
  store: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  role: PropTypes.string
};

export default OutletClosedNotice;

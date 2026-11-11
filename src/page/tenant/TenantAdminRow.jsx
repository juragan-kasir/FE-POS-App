import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const P = "page.tenant.admins";

const TenantAdminRow = ({ admin, isRevoking, onRevoke }) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  const handleConfirm = () =>
    onRevoke({ membershipId: admin.id, reason: trimmedReason }, () => setIsConfirming(false));

  return (
    <div className="space-y-2 rounded-lg border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{admin.label}</span>
        {!isConfirming && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive"
            onClick={() => setIsConfirming(true)}>
            <UserMinus size={14} aria-hidden="true" />
            {t(`${P}.revoke`)}
          </Button>
        )}
      </div>
      {isConfirming && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label={t(`${P}.revokeReason`)}
            placeholder={t(`${P}.revokeReason`)}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={() => setIsConfirming(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!trimmedReason || isRevoking}
            onClick={handleConfirm}>
            {t(`${P}.revoke`)}
          </Button>
        </div>
      )}
    </div>
  );
};

TenantAdminRow.propTypes = {
  admin: PropTypes.shape({ id: PropTypes.number, label: PropTypes.string }).isRequired,
  isRevoking: PropTypes.bool,
  onRevoke: PropTypes.func.isRequired
};

export default TenantAdminRow;

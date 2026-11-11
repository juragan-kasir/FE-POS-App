import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantAdmins } from "./useTenantAdmins";
import TenantAdminRow from "./TenantAdminRow";

const P = "page.tenant.admins";

const TenantAdminsDialog = ({ tenant, onClose, onChanged }) => {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState("");
  const { admins, candidates, isLoading, add, revoke } = useTenantAdmins(tenant?.id, {
    enabled: !!tenant,
    onChanged
  });

  const handleAdd = () =>
    add.mutate(selectedUserId, {
      onSuccess: () => {
        setSelectedUserId("");
        toast.success(t(`${P}.added`));
      },
      onError: (err) => toast.error(err?.message || t(`${P}.failed`))
    });

  const handleRevoke = (payload, onDone) =>
    revoke.mutate(payload, {
      onSuccess: () => {
        onDone();
        toast.success(t(`${P}.revoked`));
      },
      onError: (err) => toast.error(err?.message || t(`${P}.failed`))
    });

  return (
    <Dialog open={!!tenant} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`${P}.title`, { name: tenant?.name })}</DialogTitle>
          <DialogDescription>{t(`${P}.description`)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading && <Skeleton className="h-10 w-full" />}
          {!isLoading && admins.length === 0 && (
            <p className="text-sm text-muted-foreground">{t(`${P}.empty`)}</p>
          )}
          {admins.map((admin) => (
            <TenantAdminRow
              key={admin.id}
              admin={admin}
              isRevoking={revoke.isLoading}
              onRevoke={handleRevoke}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="tenant-admin-user" className="text-sm font-medium">
              {t(`${P}.addLabel`)}
            </label>
            <Combobox
              id="tenant-admin-user"
              options={candidates}
              value={selectedUserId}
              onChange={setSelectedUserId}
              placeholder={t(`${P}.addPlaceholder`)}
              loading={isLoading}
            />
          </div>
          <Button
            className="gap-1.5"
            disabled={!selectedUserId || add.isLoading}
            onClick={handleAdd}>
            <UserPlus size={14} aria-hidden="true" />
            {t(`${P}.add`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

TenantAdminsDialog.propTypes = {
  tenant: PropTypes.shape({ id: PropTypes.number, name: PropTypes.string }),
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func
};

export default TenantAdminsDialog;

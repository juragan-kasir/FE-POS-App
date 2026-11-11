import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserMinus, UserPlus } from "lucide-react";
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

const P = "page.tenant.admins";

const TenantAdminsDialog = ({ tenant, onClose }) => {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState("");
  const { admins, candidates, isLoading, add, revoke } = useTenantAdmins(tenant?.id, {
    enabled: !!tenant
  });

  const handleAdd = () =>
    add.mutate(selectedUserId, {
      onSuccess: () => {
        setSelectedUserId("");
        toast.success(t(`${P}.added`));
      },
      onError: (err) => toast.error(err?.message || t(`${P}.failed`))
    });

  const handleRevoke = (membershipId) =>
    revoke.mutate(membershipId, {
      onSuccess: () => toast.success(t(`${P}.revoked`)),
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
            <div
              key={admin.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">{admin.label}</span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive"
                disabled={revoke.isLoading}
                onClick={() => handleRevoke(admin.id)}>
                <UserMinus size={14} aria-hidden="true" />
                {t(`${P}.revoke`)}
              </Button>
            </div>
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
  onClose: PropTypes.func.isRequired
};

export default TenantAdminsDialog;

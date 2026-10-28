import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import {
  Truck,
  Phone,
  Mail,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit,
  Ban,
  FileEdit
} from "lucide-react";
import { toast } from "sonner";
import { getDriverById, updateDriverStatus } from "@/services/delivery";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const DetailDriver = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const id = searchParams.get("id");
  const [statusModal, setStatusModal] = useState({ open: false, type: "" });

  const { data, isLoading } = useQuery(["driver", id], () => getDriverById(id), { enabled: !!id });

  const statusMutation = useMutation(({ status }) => updateDriverStatus({ status }, id), {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.delivery.driver.toast.updateSuccess")
      });
      queryClient.invalidateQueries(["drivers"]);
      queryClient.invalidateQueries(["driver", id]);
      setStatusModal({ open: false, type: "" });
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const driver = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">{t("common.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            href:
              user?.roleType === "super_admin"
                ? "/dashboard-super-admin"
                : user?.roleType === "admin"
                  ? "/dashboard-admin"
                  : "/home",
            i18nKey: "breadcrumb.home"
          },
          {
            href: "/driver-list",
            i18nKey: "sidebar.driver"
          },
          { i18nKey: "page.delivery.driver.detail.title" }
        ]}
        title={t("page.delivery.driver.detail.title")}
        description={driver.name}
        backLink="/driver-list">
        <Button onClick={() => navigate(`/edit-driver?id=${id}`)}>
          <Edit size={16} className="mr-2" />
          {t("common.edit")}
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Driver Info Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">{driver.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {driver.vehicleType} • {driver.vehiclePlate}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("page.delivery.driver.detail.phone")}
                  </p>
                  <p className="text-sm font-medium text-foreground">{driver.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("page.delivery.driver.detail.email")}
                  </p>
                  <p className="text-sm font-medium text-foreground">{driver.email || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Car size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("page.delivery.driver.detail.vehicleType")}
                  </p>
                  <p className="text-sm font-medium text-foreground">{driver.vehicleType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Car size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("page.delivery.driver.detail.vehiclePlate")}
                  </p>
                  <p className="text-sm font-medium text-foreground">{driver.vehiclePlate}</p>
                </div>
              </div>
            </div>

            {driver.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.driver.detail.notes")}
                </p>
                <p className="text-sm text-foreground">{driver.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t("page.delivery.driver.detail.status")}
            </h4>
            <div className="flex items-center gap-2 mb-4">
              {driver.status === "active" ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : driver.status === "busy" ? (
                <Clock size={18} className="text-orange-600" />
              ) : driver.status === "draft" ? (
                <FileEdit size={18} className="text-muted-foreground" />
              ) : (
                <Ban size={18} className="text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  driver.status === "active"
                    ? "text-emerald-600"
                    : driver.status === "busy"
                      ? "text-orange-600"
                      : driver.status === "draft"
                        ? "text-muted-foreground"
                        : "text-red-600"
                }`}>
                {t(`page.delivery.driver.status.${driver.status}`)}
              </span>
            </div>

            <div className="flex gap-2">
              {driver.status !== "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStatusModal({ open: true, type: "active" })}>
                  {t("page.delivery.driver.action.activate")}
                </Button>
              )}
              {driver.status !== "inactive" &&
                driver.status !== "busy" &&
                driver.status !== "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStatusModal({ open: true, type: "inactive" })}>
                    {t("page.delivery.driver.action.deactivate")}
                  </Button>
                )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t("page.delivery.driver.detail.statistics")}
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {t("page.delivery.driver.detail.totalDeliveries")}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {driver.totalDeliveries || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {t("page.delivery.driver.detail.completedDeliveries")}
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  {driver.completedDeliveries || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {t("page.delivery.driver.detail.cancelledDeliveries")}
                </span>
                <span className="text-sm font-semibold text-red-600">
                  {driver.cancelledDeliveries || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Created Info */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t("page.delivery.driver.detail.createdAt")}
            </h4>
            <p className="text-xs text-muted-foreground">
              {driver.createdAt ? new Date(driver.createdAt).toLocaleString() : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <Modal
        type="confirm"
        open={statusModal.open}
        onOpenChange={(open) => setStatusModal({ open, type: "" })}
        title={t("page.delivery.driver.modal.statusTitle")}
        description={t("page.delivery.driver.modal.statusDescription")}
        confirmText={t("common.confirm")}
        onConfirm={() => statusMutation.mutate({ status: statusModal.type })}
        loading={statusMutation.isLoading}
      />
    </div>
  );
};

export default DetailDriver;

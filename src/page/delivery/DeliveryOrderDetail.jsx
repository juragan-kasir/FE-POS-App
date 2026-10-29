import { safeGet } from "@/lib/safe-lookup";
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Truck, User, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getDeliveryOrderById,
  updateDeliveryStatus,
  assignDriver,
  getDrivers
} from "@/services/delivery";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormalDocument, PrintButton } from "@/components/document/FormalDocument";
import { getDocumentSpecForDelivery } from "@/components/document/documentMappers";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import { formatCurrencyRupiah } from "@/utils/formatter-currency";
import { canAccess } from "@/utils/permission";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Textarea } from "@/components/ui/textarea";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const statusBadge = (status) => {
  const map = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
    assigned:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    picked_up:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
    in_transit:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
    delivered:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
    cancelled:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
  };
  return safeGet(map, status, "bg-muted text-muted-foreground");
};

const DeliveryOrderDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const id = searchParams.get("id");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const MENU_KEY = "/delivery-orders";

  const { data, isLoading } = useQuery(["delivery-order", id], () => getDeliveryOrderById(id), {
    enabled: !!id
  });

  const { data: driversData } = useQuery(
    ["drivers-active"],
    () => getDrivers({ status: "active", limit: 100 }),
    { enabled: assignModalOpen }
  );

  const assignMutation = useMutation(
    ({ orderId, driverId, driverName }) => assignDriver({ orderId, driverId, driverName }),
    {
      onSuccess: () => {
        toast.success(t("common.success"), {
          description: t("page.delivery.toast.assignSuccess")
        });
        queryClient.invalidateQueries(["delivery-order", id]);
        setAssignModalOpen(false);
        setSelectedDriver(null);
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  const statusMutation = useMutation(
    ({ id, status, note }) => updateDeliveryStatus({ id, status, note }),
    {
      onSuccess: () => {
        toast.success(t("common.success"), {
          description: t("page.delivery.toast.statusSuccess")
        });
        queryClient.invalidateQueries(["delivery-order", id]);
        setStatusModalOpen(false);
        setSelectedStatus("");
        setStatusNote("");
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  const order = data?.data;
  const printSpec = order ? getDocumentSpecForDelivery(order, t) : null;
  const drivers = driversData?.data || [];

  const nextStatusMap = {
    pending: ["assigned", "cancelled"],
    assigned: ["picked_up", "cancelled"],
    picked_up: ["in_transit", "cancelled"],
    in_transit: ["delivered", "cancelled"]
  };

  const canUpdateStatus = order && nextStatusMap[order.status];
  const canAssignDriver = order && order.status === "pending";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("page.delivery.detail.notFound")}</p>
        <Button variant="danger" className="mt-4" onClick={() => navigate("/delivery-orders")}>
          {t("page.delivery.detail.backToList")}
        </Button>
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
            href: "/delivery-orders",
            i18nKey: "sidebar.deliveryOrders"
          },
          { i18nKey: "page.delivery.detail.title" }
        ]}
        title={`${t("page.delivery.detail.title")} - ${order.orderNumber}`}
        description={order.customerName}>
        <Button variant="danger" onClick={() => navigate("/delivery-orders")}>
          <ArrowLeft size={16} className="mr-1" />
          {t("page.delivery.detail.backToList")}
        </Button>
        <PrintButton />
      </PageHeader>
      <LoadErrorBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Info Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">
                {t("page.delivery.detail.deliveryInfo")}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.detail.orderNumber")}
                </p>
                <p className="text-sm font-mono font-semibold text-foreground">
                  {order.orderNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.detail.status")}
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight ${statusBadge(order.status)}`}>
                  {t(`page.delivery.status.${order.status}`)}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.detail.customer")}
                </p>
                <p className="text-sm font-medium text-foreground">{order.customerName || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.detail.phone")}
                </p>
                <p className="text-sm text-foreground">{order.customerPhone || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.detail.address")}
                </p>
                <p className="text-sm text-foreground">{order.deliveryAddress || "-"}</p>
              </div>
              {order.deliveryNotes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.delivery.detail.notes")}
                  </p>
                  <p className="text-sm text-foreground">{order.deliveryNotes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.detail.deliveryFee")}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrencyRupiah(order.deliveryFee || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.detail.distance")}
                </p>
                <p className="text-sm text-foreground">
                  {order.totalDistance
                    ? `${order.totalDistance} ${t("page.delivery.detail.distanceUnit")}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("page.delivery.detail.source")}
                </p>
                <p className="text-sm uppercase text-foreground">{order.source || "-"}</p>
              </div>
              {order.cancellationReason && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.delivery.detail.cancelReason")}
                  </p>
                  <p className="text-sm text-destructive">{order.cancellationReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status History */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">
                {t("page.delivery.detail.statusHistory")}
              </h3>
            </div>
            <div className="space-y-4">
              {(order.statusHistory || []).map((history, idx) => (
                <div key={history.id || idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${
                        idx === 0 ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                    {idx < (order.statusHistory || []).length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight ${statusBadge(history.status)}`}>
                        {t(`page.delivery.status.${history.status}`)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(history.createdAt).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {history.notes && (
                      <p className="text-sm text-foreground mt-1">{history.notes}</p>
                    )}
                    {history.changedByName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {history.changedByName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(!order.statusHistory || order.statusHistory.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  {t("page.delivery.ui.noStatusHistory")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Driver Info */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">
                {t("page.delivery.detail.driverInfo")}
              </h3>
            </div>
            {order.driver ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.delivery.detail.driver")}
                  </p>
                  <p className="text-sm font-medium text-foreground">{order.driver.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.delivery.driver.detail.phone")}
                  </p>
                  <p className="text-sm text-foreground">{order.driver.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.delivery.driver.detail.vehicleType")}
                  </p>
                  <p className="text-sm text-foreground">{order.driver.vehicleType || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("page.delivery.driver.detail.vehiclePlate")}
                  </p>
                  <p className="text-sm font-mono text-foreground">
                    {order.driver.vehiclePlate || "-"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t("page.delivery.detail.noDriver")}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">
              {t("page.expenseCategory.list.actions")}
            </h3>
            <div className="space-y-2">
              {canAssignDriver && canAccess(user, MENU_KEY, "edit") && (
                <Button className="w-full" onClick={() => setAssignModalOpen(true)}>
                  <User size={16} className="mr-1" />
                  {t("page.delivery.detail.assignDriver")}
                </Button>
              )}
              {canUpdateStatus && canAccess(user, MENU_KEY, "edit") && (
                <Button
                  variant="success"
                  className="w-full"
                  onClick={() => setStatusModalOpen(true)}>
                  <CheckCircle size={16} className="mr-1" />
                  {t("page.delivery.detail.updateStatus")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Driver Modal */}
      <Modal
        type="confirm"
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        title={t("page.delivery.detail.assignDriver")}
        description={t("page.delivery.detail.selectDriver")}
        confirmText={t("page.delivery.detail.assignDriver")}
        loading={assignMutation?.isLoading}
        onConfirm={() => {
          if (selectedDriver) {
            assignMutation.mutate({
              orderId: order.id,
              driverId: selectedDriver.id,
              driverName: selectedDriver.name
            });
          }
        }}>
        <div className="mt-2 max-h-60 overflow-y-auto space-y-2">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              onClick={() => setSelectedDriver(driver)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedDriver?.id === driver.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}>
              <p className="text-sm font-medium text-foreground">{driver.name}</p>
              <p className="text-xs text-muted-foreground">
                {driver.vehicleType} - {driver.vehiclePlate}
              </p>
            </div>
          ))}
          {drivers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("page.delivery.ui.noAvailableDrivers")}
            </p>
          )}
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        type="confirm"
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        title={t("page.delivery.detail.updateStatus")}
        description={t("page.delivery.detail.selectStatus")}
        confirmText={t("page.delivery.detail.updateStatus")}
        loading={statusMutation?.isLoading}
        onConfirm={() => {
          if (selectedStatus) {
            statusMutation.mutate({
              id: order.id,
              status: selectedStatus,
              note: statusNote || undefined
            });
          }
        }}>
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(nextStatusMap[order.status] || []).map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedStatus === status
                    ? status === "cancelled"
                      ? "border-destructive bg-destructive/5 text-destructive"
                      : "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50"
                }`}>
                {t(`page.delivery.status.${status}`)}
              </button>
            ))}
          </div>
          <Textarea
            unstyled
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="w-full h-20 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none resize-none"
            placeholder={t("page.delivery.ui.optionalNote")}
            maxLength={FIELD_LIMITS.DESCRIPTION}
          />
        </div>
      </Modal>
      {printSpec && (
        <div className="hidden print:block print-doc">
          <FormalDocument spec={printSpec} />
        </div>
      )}
    </div>
  );
};

export default DeliveryOrderDetail;

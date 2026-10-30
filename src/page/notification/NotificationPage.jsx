import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  CheckCheck,
  Package,
  AlertTriangle,
  X,
  User,
  Building2,
  ShoppingCart,
  DollarSign,
  Tag,
  Truck,
  FileText,
  Clock,
  Fingerprint,
  Hash,
  Store
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { getAllNotifications, markAsRead, markAllAsRead } from "@/services/notification";
import { useSocket } from "@/services/socket";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import { dateLocale } from "@/lib/locale";

const typeIcons = {
  employee_created: {
    icon: User,
    bg: "bg-blue-100 dark:bg-blue-900/40",
    color: "text-blue-600 dark:text-blue-400"
  },
  employee_updated: {
    icon: User,
    bg: "bg-blue-100 dark:bg-blue-900/40",
    color: "text-blue-600 dark:text-blue-400"
  },
  employee_deleted: {
    icon: User,
    bg: "bg-red-100 dark:bg-red-900/40",
    color: "text-red-600 dark:text-red-400"
  },
  location_created: {
    icon: Building2,
    bg: "bg-purple-100 dark:bg-purple-900/40",
    color: "text-purple-600 dark:text-purple-400"
  },
  location_updated: {
    icon: Building2,
    bg: "bg-purple-100 dark:bg-purple-900/40",
    color: "text-purple-600 dark:text-purple-400"
  },
  location_deleted: {
    icon: Building2,
    bg: "bg-red-100 dark:bg-red-900/40",
    color: "text-red-600 dark:text-red-400"
  },
  product_created: {
    icon: Package,
    bg: "bg-green-100 dark:bg-green-900/40",
    color: "text-green-600 dark:text-green-400"
  },
  product_updated: {
    icon: Package,
    bg: "bg-green-100 dark:bg-green-900/40",
    color: "text-green-600 dark:text-green-400"
  },
  product_deleted: {
    icon: Package,
    bg: "bg-red-100 dark:bg-red-900/40",
    color: "text-red-600 dark:text-red-400"
  },
  category_created: {
    icon: Tag,
    bg: "bg-amber-100 dark:bg-amber-900/40",
    color: "text-amber-600 dark:text-amber-400"
  },
  category_updated: {
    icon: Tag,
    bg: "bg-amber-100 dark:bg-amber-900/40",
    color: "text-amber-600 dark:text-amber-400"
  },
  category_deleted: {
    icon: Tag,
    bg: "bg-red-100 dark:bg-red-900/40",
    color: "text-red-600 dark:text-red-400"
  },
  supplier_created: {
    icon: Truck,
    bg: "bg-teal-100 dark:bg-teal-900/40",
    color: "text-teal-600 dark:text-teal-400"
  },
  supplier_updated: {
    icon: Truck,
    bg: "bg-teal-100 dark:bg-teal-900/40",
    color: "text-teal-600 dark:text-teal-400"
  },
  supplier_deleted: {
    icon: Truck,
    bg: "bg-red-100 dark:bg-red-900/40",
    color: "text-red-600 dark:text-red-400"
  },
  order_created: {
    icon: ShoppingCart,
    bg: "bg-indigo-100 dark:bg-indigo-900/40",
    color: "text-indigo-600 dark:text-indigo-400"
  },
  payment_received: {
    icon: DollarSign,
    bg: "bg-green-100 dark:bg-green-900/40",
    color: "text-green-600 dark:text-green-400"
  },
  low_stock: {
    icon: AlertTriangle,
    bg: "bg-amber-100 dark:bg-amber-900/40",
    color: "text-amber-600 dark:text-amber-400"
  },
  stock_opname_created: {
    icon: FileText,
    bg: "bg-cyan-100 dark:bg-cyan-900/40",
    color: "text-cyan-600 dark:text-cyan-400"
  },
  expense_created: {
    icon: DollarSign,
    bg: "bg-orange-100 dark:bg-orange-900/40",
    color: "text-orange-600 dark:text-orange-400"
  },
  member_created: {
    icon: User,
    bg: "bg-pink-100 dark:bg-pink-900/40",
    color: "text-pink-600 dark:text-pink-400"
  },
  shift_created: {
    icon: FileText,
    bg: "bg-muted",
    color: "text-muted-foreground"
  },
  discount_created: {
    icon: Tag,
    bg: "bg-yellow-100 dark:bg-yellow-900/40",
    color: "text-yellow-600 dark:text-yellow-400"
  }
};

const defaultIcon = {
  icon: Bell,
  bg: "bg-muted",
  color: "text-muted-foreground"
};

const NotificationPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { newNotification, setNewNotification } = useSocket() || {};
  const [page, setPage] = useState(1);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery(["notifications", page], () =>
    getAllNotifications({ page, limit: 20 })
  );

  const { mutate: readMutate } = useMutation(markAsRead, {
    onSuccess: () => queryClient.invalidateQueries(["notifications"])
  });

  const { mutate: readAllMutate } = useMutation(markAllAsRead, {
    onSuccess: () => queryClient.invalidateQueries(["notifications"])
  });

  useEffect(() => {
    if (newNotification) {
      queryClient.invalidateQueries(["notifications"]);
      setNewNotification(null);
    }
  }, [newNotification, queryClient, setNewNotification]);

  const items = data?.data || [];
  const pagination = data?.pagination || {};
  const unreadCount = items.filter((n) => !n.isRead).length;

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString(dateLocale(), {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "-";
    }
  };

  const handleViewDetail = (notif) => {
    setSelectedNotif(notif);
    if (!notif.isRead) readMutate(notif.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { i18nKey: "breadcrumb.home", href: "/dashboard-super-admin" },
          { i18nKey: "page.notification.title" }
        ]}
        title={t("page.notification.title")}
        description={t("page.notification.description")}>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => readAllMutate()}>
            <CheckCheck size={16} />
            {t("page.notification.markAllRead")}
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <div>
          {isLoading ? (
            <Loading fullscreen size="lg" label={t("common.loading")} />
          ) : (
            <>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Bell size={48} className="text-muted-foreground/40 mb-4" />
                    <p className="text-lg font-medium text-foreground">
                      {t("page.notification.empty")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("page.notification.emptyDesc")}
                    </p>
                  </div>
                ) : (
                  items.map((notif) => {
                    const iconConfig = typeIcons[notif.type] || defaultIcon;
                    const Icon = iconConfig.icon;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleViewDetail(notif)}
                        className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                          !notif.isRead
                            ? "bg-primary/5 border-primary/20"
                            : "bg-card border-border hover:bg-accent/50"
                        }`}>
                        <div
                          className={`p-2.5 rounded-full shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm ${!notif.isRead ? "font-semibold text-foreground" : "text-foreground"}`}>
                              {notif.title}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {formatTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.description}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <button
                            type="button"
                            aria-label={t("page.notification.markAsRead")}
                            onClick={(e) => {
                              e.stopPropagation();
                              readMutate(notif.id);
                            }}
                            className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 hover:bg-accent transition-all">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}>
                    {t("page.notification.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}>
                    {t("page.notification.next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Modal
        open={!!selectedNotif}
        onOpenChange={(open) => {
          if (!open) setSelectedNotif(null);
        }}
        type="detail"
        title={selectedNotif?.title || ""}>
        {selectedNotif && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b">
              {(() => {
                const cfg = typeIcons[selectedNotif.type] || defaultIcon;
                const Icon = cfg.icon;
                return (
                  <div className={`p-3 rounded-full ${cfg.bg} ${cfg.color}`}>
                    <Icon size={22} />
                  </div>
                );
              })()}
              <div>
                <h3 className="text-lg font-semibold">{selectedNotif.title}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {selectedNotif.type}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1 font-medium">
                {t("page.notification.descriptionLabel")}
              </p>
              <p className="text-sm">{selectedNotif.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash size={14} />
                <span>
                  {t("page.notification.id")}:{" "}
                  <strong className="text-foreground">{selectedNotif.id}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User size={14} />
                <span>
                  {t("page.notification.createdBy")}:{" "}
                  <strong className="text-foreground">
                    {selectedNotif.createdByUser?.fullName ||
                      selectedNotif.createdByUser?.userName ||
                      "-"}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Store size={14} />
                <span>
                  {t("page.notification.store")}:{" "}
                  <strong className="text-foreground">{selectedNotif.storeName ?? "-"}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Fingerprint size={14} />
                <span>
                  {t("page.notification.reference")}:{" "}
                  <strong className="text-foreground">
                    {selectedNotif.referenceType} #{selectedNotif.referenceId}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>
                  {t("page.notification.created")}:{" "}
                  <strong className="text-foreground">
                    {formatFullDate(selectedNotif.createdAt)}
                  </strong>
                </span>
              </div>
            </div>

            {selectedNotif.updatedAt && selectedNotif.updatedAt !== selectedNotif.createdAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <Clock size={14} />
                <span>
                  {t("page.notification.updated")}:{" "}
                  <strong className="text-foreground">
                    {formatFullDate(selectedNotif.updatedAt)}
                  </strong>
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedNotif(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NotificationPage;

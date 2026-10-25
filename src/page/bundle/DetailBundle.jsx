import { safeGet } from "@/lib/safe-lookup";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { Edit, Trash2, Package, CheckCircle, XCircle, Clock, Receipt } from "lucide-react";
import { toast } from "sonner";
import { getBundleById, deleteBundle, changeBundleStatus } from "@/services/productBundle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import AbortController from "@/components/organism/abort-controller";
import Modal from "@/components/organism/modal";
import PageHeader from "@/components/ui/PageHeader";

const DetailBundle = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const role = user?.roleType || "";
  const canEdit = isSuperAdmin || role === "admin";
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery(["bundle", id], () => getBundleById(id), {
    enabled: !!id
  });

  const deleteMutation = useMutation(deleteBundle, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("common.deleteSuccess")
      });
      queryClient.invalidateQueries(["bundles"]);
      navigate("/bundle");
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const statusMutation = useMutation(({ id, status }) => changeBundleStatus(id, status), {
    onSuccess: () => {
      toast.success(t("common.success"));
      queryClient.invalidateQueries(["bundle", id]);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const bundle = data?.data;
  const items = bundle?.items || [];

  const statusBadge = (status) => {
    const map = {
      active: {
        bg: "bg-green-100 text-green-700 border-green-200",
        dot: "bg-green-500",
        label: t("common.active")
      },
      draft: {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-500",
        label: t("common.draft")
      },
      inactive: {
        bg: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500",
        label: t("common.inactive")
      }
    };
    return safeGet(map, status) ?? map.draft;
  };

  const formatPrice = (val) => `Rp${Number(val || 0).toLocaleString("id-ID")}`;

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !bundle) {
    return <AbortController refetch={refetch} />;
  }

  const s = statusBadge(bundle.status);

  // ponytail: indikator masa berlaku, pola sama dengan DiscountList
  const getExpiryStatus = () => {
    const now = new Date();
    if (bundle.validFrom && new Date(bundle.validFrom) > now) return null;
    if (!bundle.validUntil) return null;
    const endDate = new Date(bundle.validUntil);
    if (isNaN(endDate.getTime())) return null;
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired";
    if (diffDays <= 7) return "expiring";
    return null;
  };
  const expiryStatus = getExpiryStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.bundle"), href: "/bundle", i18nKey: "breadcrumb.bundle" },
          { label: t("breadcrumb.detail") }
        ]}
        title={bundle.name}
        description={
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            {expiryStatus === "expiring" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                <Clock size={12} />
                {t("page.bundle.list.expiringSoon")}
              </span>
            )}
            {expiryStatus === "expired" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                <XCircle size={12} />
                {t("page.bundle.list.expired")}
              </span>
            )}
            <span className="text-sm text-muted-foreground">{bundle.sku}</span>
          </div>
        }
        backLink="/bundle"
        dynamicInfo={false}>
        {canEdit && (
          <>
            {bundle.status === "draft" && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => statusMutation.mutate({ id: bundle.id, status: "active" })}>
                <CheckCircle size={16} />
                {t("common.activate")}
              </Button>
            )}
            {bundle.status === "active" && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => statusMutation.mutate({ id: bundle.id, status: "inactive" })}>
                <XCircle size={16} />
                {t("common.deactivate")}
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/bundle/edit/${bundle.id}`)}>
              <Edit size={16} />
              {t("common.edit")}
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setDeleteOpen(true)}
              disabled={deleteMutation.isLoading}>
              <Trash2 size={16} />
              {t("common.delete")}
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-sm mb-4">{t("page.bundle.detail.info")}</h3>
            {bundle.image && (
              <img
                src={bundle.image}
                alt={bundle.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("page.bundle.form.name")}</p>
                <p className="font-medium">{bundle.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("page.bundle.form.sku")}</p>
                <p className="font-medium font-mono">{bundle.sku}</p>
              </div>
              {bundle.description && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    {t("page.bundle.form.description")}
                  </p>
                  <p className="text-sm">{bundle.description}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-sm mb-4">
              {t("page.bundle.form.items")} ({items.length})
            </h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  {item.productData?.image ? (
                    <img
                      src={item.productData.image}
                      alt={item.productData.nameProduct}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.productData?.nameProduct || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity}x {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-semibold text-sm">
                    {formatPrice(item.quantity * item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* ponytail: jumlah transaksi pemakai bundle — pola kartu di DetailDiscount */}
          <Card className="p-5 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Receipt size={20} />
            </div>
            <p className="text-2xl font-bold">{bundle.usageCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("page.bundle.detail.totalTransactions")}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-sm mb-4">{t("page.bundle.form.pricing")}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("page.bundle.form.originalPrice")}
                </span>
                <span className="text-sm line-through">{formatPrice(bundle.originalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("page.bundle.form.bundlePrice")}
                </span>
                <span className="text-lg font-bold text-green-600">
                  {formatPrice(bundle.bundlePrice)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-medium">{t("page.bundle.form.savings")}</span>
                <span className="text-sm font-bold text-red-600">
                  {bundle.discountPercentage > 0
                    ? `${bundle.discountPercentage}%`
                    : formatPrice(bundle.discountAmount)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-sm mb-4">{t("page.bundle.form.settings")}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("page.bundle.form.isAvailable")}
                </span>
                <span className="text-sm font-medium">
                  {bundle.isAvailable ? t("common.yes") : t("common.no")}
                </span>
              </div>
              {bundle.validFrom && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("page.bundle.form.validFrom")}
                  </span>
                  <span className="text-sm">
                    {new Date(bundle.validFrom).toLocaleDateString("id-ID")}
                  </span>
                </div>
              )}
              {bundle.validUntil && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("page.bundle.form.validUntil")}
                  </span>
                  <span className="text-sm">
                    {new Date(bundle.validUntil).toLocaleDateString("id-ID")}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        type="confirm"
        title={t("modal.confirmDelete")}
        description={t("common.deleteConfirmDesc", { name: bundle.name })}
        confirmText={t("common.confirmDelete")}
        confirmVariant="destructive"
        loading={deleteMutation.isLoading}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(bundle.id);
          } catch {
            return false;
          }
        }}
      />
    </div>
  );
};

export default DetailBundle;

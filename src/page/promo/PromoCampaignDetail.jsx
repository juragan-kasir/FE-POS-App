import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getCampaignById, updateCampaignStatus } from "@/services/promo";
import { getProductById } from "@/services/product";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import {
  ArrowLeft,
  Megaphone,
  Calendar,
  Clock,
  Tag,
  Percent,
  Users,
  TrendingUp,
  Edit,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Gift,
  ShieldCheck,
  Zap,
  BarChart3,
  User
} from "lucide-react";

const typeIcon = (type) => {
  const map = {
    happy_hour: Clock,
    flash_sale: Zap,
    bundle: TrendingUp,
    seasonal: Calendar,
    loyalty: Gift,
    referral: Users,
    discount: Percent,
    cashback: TrendingUp
  };
  return map[type] || Megaphone;
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }) +
      " " +
      d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      })
    );
  } catch {
    return "-";
  }
};

const DetailRow = ({ icon: Icon, label, value, children }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={16} className="text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {children || (
        <p className="text-sm font-semibold text-foreground mt-0.5">
          {value != null && value !== "" ? value : "-"}
        </p>
      )}
    </div>
  </div>
);

const PromoCampaignDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState(null);

  const { data: campaign, isLoading } = useQuery(
    ["promo-campaign", id],
    () => getCampaignById(id),
    {
      enabled: !!id
    }
  );

  const applicableIds = useMemo(
    () => (Array.isArray(campaign?.applicableIds) ? campaign.applicableIds : []),
    [campaign]
  );

  const { data: productsData } = useQuery(
    ["promo-applicable-products", ...applicableIds],
    async () => {
      const results = await Promise.all(
        applicableIds.map((pid) => getProductById(pid).catch(() => null))
      );
      return results.filter(Boolean);
    },
    {
      enabled: applicableIds.length > 0
    }
  );

  const applicableProducts = useMemo(() => {
    if (!productsData) return [];
    return productsData.map((p) => {
      const d = p?.data || p;
      return d?.nameProduct || d?.name || d?.productName || `#${d?.id || "?"}`;
    });
  }, [productsData]);

  const statusMutation = useMutation(({ status }) => updateCampaignStatus(id, { status }), {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.promo.toast.statusUpdated")
      });
      queryClient.invalidateQueries(["promo-campaigns"]);
      queryClient.invalidateQueries(["promo-stats"]);
      queryClient.invalidateQueries(["promo-campaign", id]);
      setStatusModalOpen(false);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const handleStatusChange = (action) => {
    setStatusAction(action);
    setStatusModalOpen(true);
  };

  const confirmStatusChange = () => {
    const newStatus = statusAction === "activate" ? "active" : "paused";
    statusMutation.mutate({ status: newStatus });
  };

  const getStatusConfig = (status) => {
    const config = {
      active: {
        bg: "bg-green-100 text-green-700 border-green-200",
        dot: "bg-green-500",
        label: "Aktif"
      },
      paused: {
        bg: "bg-yellow-100 text-yellow-700 border-yellow-200",
        dot: "bg-yellow-500",
        label: "Dijeda"
      },
      draft: {
        bg: "bg-muted text-muted-foreground border-border",
        dot: "bg-muted-foreground/50",
        label: "Draft"
      },
      expired: {
        bg: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500",
        label: "Kedaluwarsa"
      }
    };
    return safeGet(config, status, config.draft);
  };

  const formatDiscount = (type, value) => {
    if (type === "percentage") return `${value}%`;
    if (type === "fixed") return `Rp${value?.toLocaleString?.() || 0}`;
    if (type === "free_item") return "Free Item";
    return value;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Skeleton className="w-24 h-24 md:w-28 md:h-28 rounded-2xl shrink-0" />
              <div className="text-center md:text-left space-y-3 flex-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-6 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {[0, 1, 2].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <Megaphone size={48} className="text-muted-foreground/40" />
        <p>{t("page.promo.detail.notFound")}</p>
        <Button variant="danger" onClick={() => navigate("/promo-list")}>
          <ArrowLeft size={16} className="mr-1" />
          Kembali
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(campaign.status);
  const Icon = typeIcon(campaign.type);
  const usagePercent =
    campaign.maxUsageTotal > 0
      ? Math.round(((campaign.currentUsage || 0) / campaign.maxUsageTotal) * 100)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.promo.list.title"),
            href: "/promo-list",
            i18nKey: "page.promo.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={campaign.name}
        description={
          campaign.code
            ? `${campaign.code} · ${campaign.description || t("page.promo.detail.description")}`
            : campaign.description || t("page.promo.detail.description")
        }
        backLink="/promo-list"
        dynamicInfo={false}>
        {campaign.status === "active" ? (
          <Button
            variant="outline"
            onClick={() => handleStatusChange("pause")}
            disabled={statusMutation?.isLoading}>
            <Pause size={16} className="mr-1" />
            {t("page.promo.detail.pause")}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => handleStatusChange("activate")}
            disabled={statusMutation?.isLoading}>
            <Play size={16} className="mr-1" />
            {t("page.promo.detail.activate")}
          </Button>
        )}
        <Button onClick={() => navigate(`/edit-promo?id=${id}`)}>
          <Edit size={16} className="mr-1" />
          {t("common.edit")}
        </Button>
      </PageHeader>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <Icon size={48} />
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{campaign.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              {campaign.description && (
                <p className="text-sm text-muted-foreground max-w-xl">{campaign.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Percent size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Diskon
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatDiscount(campaign.discountType, campaign.discountValue)}
              </p>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tipe
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">
                {campaign.type?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Penggunaan
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {campaign.currentUsage || 0}
                {campaign.maxUsageTotal ? ` / ${campaign.maxUsageTotal}` : ""}
              </p>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Berlaku Untuk
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">
                {campaign.applicableTo?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {usagePercent !== null && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progress Penggunaan</span>
            <span className="text-sm font-semibold text-foreground">{usagePercent}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <Megaphone size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.promo.detail.campaignInfo")}
            </h3>
          </div>
          <div className="space-y-4">
            <DetailRow icon={Tag} label={t("page.promo.form.code")} value={campaign.code || "-"} />
            <DetailRow
              icon={TrendingUp}
              label={t("page.promo.form.type")}
              value={campaign.type?.replace(/_/g, " ")}
            />
            <DetailRow
              icon={Percent}
              label={t("page.promo.form.discountType")}
              value={campaign.discountType?.replace(/_/g, " ")}
            />
            <DetailRow
              icon={Users}
              label={t("page.promo.form.applicableTo")}
              value={
                campaign.applicableTo === "specific_products" && applicableProducts.length > 0
                  ? undefined
                  : campaign.applicableTo?.replace(/_/g, " ")
              }>
              {campaign.applicableTo === "specific_products" && applicableProducts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {applicableProducts.map((name, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-xs font-medium text-primary">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </DetailRow>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <Calendar size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.promo.detail.schedule")}
            </h3>
          </div>
          <div className="space-y-4">
            <DetailRow
              icon={Calendar}
              label={t("page.promo.form.startDate")}
              value={formatDate(campaign.startDate)}
            />
            <DetailRow
              icon={Calendar}
              label={t("page.promo.form.endDate")}
              value={formatDate(campaign.endDate)}
            />
            {campaign.type === "happy_hour" && campaign.startTime && (
              <>
                <DetailRow
                  icon={Clock}
                  label={t("page.promo.form.startTime")}
                  value={campaign.startTime}
                />
                <DetailRow
                  icon={Clock}
                  label={t("page.promo.form.endTime")}
                  value={campaign.endTime}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <Percent size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.promo.detail.discountSettings")}
            </h3>
          </div>
          <div className="space-y-4">
            <DetailRow
              icon={Percent}
              label={t("page.promo.form.discountValue")}
              value={formatDiscount(campaign.discountType, campaign.discountValue)}
            />
            {campaign.maxDiscount && (
              <DetailRow
                icon={Percent}
                label={t("page.promo.form.maxDiscount")}
                value={`Rp${campaign.maxDiscount?.toLocaleString?.() || campaign.maxDiscount}`}
              />
            )}
            {campaign.minPurchase > 0 && (
              <DetailRow
                icon={Percent}
                label={t("page.promo.form.minPurchase")}
                value={`Rp${campaign.minPurchase?.toLocaleString?.() || campaign.minPurchase}`}
              />
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <BarChart3 size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.promo.detail.usageLimits")}
            </h3>
          </div>
          <div className="space-y-4">
            <DetailRow
              icon={BarChart3}
              label={t("page.promo.form.maxUsageTotal")}
              value={
                campaign.maxUsageTotal != null && campaign.maxUsageTotal !== 0
                  ? campaign.maxUsageTotal
                  : t("common.unlimited")
              }
            />
            <DetailRow
              icon={Users}
              label={t("page.promo.form.maxUsagePerMember")}
              value={
                campaign.maxUsagePerMember != null && campaign.maxUsagePerMember !== 0
                  ? campaign.maxUsagePerMember
                  : t("common.unlimited")
              }
            />
            <DetailRow
              icon={BarChart3}
              label={t("page.promo.detail.currentUsage")}
              value={campaign.currentUsage || 0}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <ShieldCheck size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.promo.detail.rules")}
            </h3>
          </div>
          {campaign.rules?.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{t("page.promo.form.noRules")}</p>
          ) : (
            <div className="space-y-3">
              {campaign.rules?.map((rule, index) => (
                <div key={index} className="p-3 bg-background rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-sm font-medium text-foreground capitalize">
                      {rule.ruleType?.replace(/_/g, " ")}
                    </span>
                  </div>
                  {rule.condition && Object.keys(rule.condition).length > 0 && (
                    <div className="mt-2 ml-5 space-y-1">
                      {Object.entries(rule.condition).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>
                          <span>{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <Gift size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.promo.detail.rewards")}
            </h3>
          </div>
          {campaign.rewards?.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{t("page.promo.form.noRewards")}</p>
          ) : (
            <div className="space-y-3">
              {campaign.rewards?.map((reward, index) => (
                <div key={index} className="p-3 bg-background rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-600" />
                      <span className="text-sm font-medium text-foreground capitalize">
                        {reward.rewardType?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {reward.rewardValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <ShieldCheck size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.promo.detail.settings")}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {campaign.isCombinable ? (
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle size={16} className="text-green-600" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <XCircle size={16} className="text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("page.promo.form.isCombinable")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {campaign.isCombinable
                    ? "Bisa digabung dengan promo lain"
                    : "Tidak bisa digabung"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {campaign.autoActivate ? (
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle size={16} className="text-green-600" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <XCircle size={16} className="text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("page.promo.form.autoActivate")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {campaign.autoActivate ? "Aktif otomatis sesuai jadwal" : "Perlu aktivasi manual"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <User size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {t("page.memberTier.detail.systemInfo")}
            </h3>
          </div>
          <div className="space-y-4">
            <DetailRow
              icon={User}
              label={t("page.memberTier.detail.createdBy")}
              value={
                campaign.createdByUser?.fullName ||
                campaign.createdByUser?.userName ||
                campaign.createdByName ||
                "-"
              }
            />
            <DetailRow
              icon={Calendar}
              label={t("page.memberTier.detail.createdAt")}
              value={formatDate(campaign.createdAt)}
            />
            <DetailRow
              icon={User}
              label={t("page.memberTier.detail.modifiedBy")}
              value={
                campaign.modifiedByUser?.fullName ||
                campaign.modifiedByUser?.userName ||
                campaign.modifiedByName ||
                "-"
              }
            />
            <DetailRow
              icon={Calendar}
              label={t("page.memberTier.detail.updatedAt")}
              value={formatDate(campaign.updatedAt)}
            />
          </div>
        </div>
      </div>

      <Modal
        type="confirm"
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        title={
          statusAction === "activate"
            ? t("page.promo.modal.activateTitle")
            : t("page.promo.modal.pauseTitle")
        }
        description={
          statusAction === "activate"
            ? t("page.promo.modal.activateDescription")
            : t("page.promo.modal.pauseDescription")
        }
        confirmText={
          statusAction === "activate"
            ? t("page.promo.modal.confirmActivate")
            : t("page.promo.modal.confirmPause")
        }
        onConfirm={confirmStatusChange}
      />
    </div>
  );
};

export default PromoCampaignDetail;

import React from "react";
import PropTypes from "prop-types";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Award, Coins, Gift, Tag, Calendar, Users, User, Edit3 } from "lucide-react";
import { getDetailMemberTier } from "@/services/member-tier";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import { dateLocale } from "@/lib/locale";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString(dateLocale(), {
        day: "numeric",
        month: "long",
        year: "numeric"
      }) +
      " " +
      d.toLocaleTimeString(dateLocale(), {
        hour: "2-digit",
        minute: "2-digit"
      })
    );
  } catch {
    return "-";
  }
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={16} className="text-primary" />
    </div>
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value || "-"}</p>
    </div>
  </div>
);

DetailRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string
};

const DetailMemberTier = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tierId = searchParams.get("id");

  const {
    data: tierData,
    isLoading,
    isError,
    refetch
  } = useQuery(["member-tier-detail", tierId], () => getDetailMemberTier(tierId), {
    enabled: !!tierId
  });

  const tier = tierData?.data || {};

  if (!tierId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <Award size={48} className="text-muted-foreground/40" />
        <p>{t("page.memberTier.ui.tierIdNotFound")}</p>
        <Button variant="outline" onClick={() => navigate("/member-tier")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  const isActive = tier?.status === "active" || tier?.status === true || tier?.status === "true";

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
            label: t("breadcrumb.memberTier"),
            href: "/member-tier",
            i18nKey: "breadcrumb.memberTier"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : tier.name || "-"}
        description={t("page.memberTier.list.detailTitle")}
        backLink="/member-tier"
        dynamicInfo={false}>
        {!isLoading && (
          <Button variant="outline" onClick={() => navigate(`/edit-member-tier/${tier.id}`)}>
            <Edit3 size={14} className="mr-1.5" />
            {t("common.edit")}
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="space-y-8">
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Skeleton className="w-24 h-24 md:w-28 md:h-28 rounded-2xl shrink-0" />
                <div className="text-center md:text-left space-y-3 flex-1">
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
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
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-9 h-9 rounded-lg shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : !tier || !tier.id ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
          <Award size={48} className="text-muted-foreground/40" />
          <p>{t("page.memberTier.ui.tierNotFound")}</p>
          <Button variant="outline" onClick={() => navigate("/member-tier")}>
            {t("common.back")}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-10"
              style={
                tier.color
                  ? {
                      background: `linear-gradient(to right, ${tier.color}15, ${tier.color}08, transparent)`
                    }
                  : undefined
              }>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div
                  className="w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center text-white shrink-0 text-4xl font-bold shadow-lg"
                  style={{ backgroundColor: tier.color || "#f59e0b" }}>
                  <Award size={48} />
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{tier.name}</h1>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                        isActive
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-red-100 text-red-700 border border-red-200"
                      }`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"}`}
                      />
                      {isActive ? t("common.active") : t("common.inactive")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Coins size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.memberTier.detail.minPoints")}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {tier.minPoints?.toLocaleString?.() || 0}
                  </p>
                </div>
              </div>
              <div className="p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Coins size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("page.memberTier.detail.maxPoints")}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {tier.maxPoints?.toLocaleString?.() || "~"}
                  </p>
                </div>
              </div>
              <div className="p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Tag size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("sidebar.diskon")}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {tier.discountPercent || 0}%
                  </p>
                </div>
              </div>
              <div className="p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("breadcrumb.member")}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {tier.memberCount || 0} {t("breadcrumb.member")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                <Gift size={18} className="text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  {t("page.member.benefits")}
                </h3>
              </div>
              {(Array.isArray(tier.benefits)
                ? tier.benefits
                : (tier.benefits || "").split("\n").filter(Boolean)
              ).length > 0 ? (
                <ul className="space-y-2">
                  {(Array.isArray(tier.benefits)
                    ? tier.benefits
                    : (tier.benefits || "").split("\n").filter(Boolean)
                  ).map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tier.color || "#f59e0b" }}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t("page.memberTier.ui.noBenefits")}
                </p>
              )}
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                <Calendar size={18} className="text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  {t("page.memberTier.detail.systemInfo")}
                </h3>
              </div>
              <div className="space-y-4">
                <DetailRow
                  icon={Calendar}
                  label={t("page.memberTier.detail.createdAt")}
                  value={formatDate(tier.createdAt)}
                />
                <DetailRow
                  icon={Calendar}
                  label={t("page.memberTier.detail.updatedAt")}
                  value={formatDate(tier.updatedAt)}
                />
                <DetailRow
                  icon={User}
                  label={t("page.memberTier.detail.createdBy")}
                  value={
                    tier.createdByUser?.fullName ||
                    tier.createdByUser?.userName ||
                    tier.createdByName ||
                    "-"
                  }
                />
                <DetailRow
                  icon={User}
                  label={t("page.memberTier.detail.modifiedBy")}
                  value={
                    tier.modifiedByUser?.fullName ||
                    tier.modifiedByUser?.userName ||
                    tier.modifiedByName ||
                    "-"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailMemberTier;

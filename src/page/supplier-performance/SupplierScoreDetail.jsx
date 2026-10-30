import { safeGet } from "@/lib/safe-lookup";
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { ArrowLeft, TrendingUp, Clock, AlertTriangle, DollarSign, Award, Save } from "lucide-react";
import { toast } from "sonner";
import { getSupplierScoreById, updateSupplierScoreNote } from "@/services/supplierPerformance";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Textarea } from "@/components/ui/textarea";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const gradeBadge = (grade) => {
  const map = {
    A: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    D: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    F: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  };
  return safeGet(map, grade, "bg-muted text-muted-foreground");
};

const SupplierScoreDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const id = searchParams.get("id");
  const [notes, setNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);

  const { data, isLoading } = useQuery(["supplier-score", id], () => getSupplierScoreById(id), {
    enabled: !!id
  });

  const updateNotesMutation = useMutation(({ notes }) => updateSupplierScoreNote(id, { notes }), {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.supplierPerformance.toast.noteUpdated")
      });
      queryClient.invalidateQueries(["supplier-score", id]);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  React.useEffect(() => {
    if (data?.data && !notesLoaded) {
      setNotes(data.data.notes || "");
      setNotesLoaded(true);
    }
  }, [data, notesLoaded]);

  const score = data?.data;

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

  if (!score) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
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
            href: "/supplier-score-list",
            i18nKey: "sidebar.supplierPerformance"
          },
          { i18nKey: "page.supplierPerformance.detail.title" }
        ]}
        title={t("page.supplierPerformance.detail.title")}
        description={score.supplier?.name || ""}>
        <Button variant="outline" onClick={() => navigate("/supplier-score-list")}>
          <ArrowLeft size={16} className="mr-2" />
          {t("common.back")}
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Score Overview */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{score.supplier?.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {score.period?.replace("_", " ")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-foreground">
                  {parseFloat(score.overallScore || 0).toFixed(1)}
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${gradeBadge(score.grade)}`}>
                  {t("page.supplierPerformance.list.grade")} {score.grade}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-blue-500" />
                  <span className="text-xs text-muted-foreground">
                    {t("page.supplierPerformance.detail.onTimeRate")}
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {parseFloat(score.onTimeRate || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {score.onTimeDeliveries}/{score.totalOrders}{" "}
                  {t("page.supplierPerformance.detail.deliveries")}
                </div>
              </div>

              <div className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  <span className="text-xs text-muted-foreground">
                    {t("page.supplierPerformance.detail.defectRate")}
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {parseFloat(score.defectRate || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {score.defectiveQty}/{score.totalReceivedQty}{" "}
                  {t("page.supplierPerformance.detail.items")}
                </div>
              </div>

              <div className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    {t("page.supplierPerformance.detail.priceScore")}
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {parseFloat(score.priceCompetitivenessScore || 0).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("page.supplierPerformance.detail.avgPrice")}: Rp
                  {(score.avgPricePerItem || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={16} className="text-purple-500" />
                  <span className="text-xs text-muted-foreground">
                    {t("page.supplierPerformance.detail.totalOrders")}
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">{score.totalOrders || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {score.completedOrders} {t("page.supplierPerformance.detail.completed")}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">
              {t("page.supplierPerformance.detail.notes")}
            </h3>
            <Textarea
              unstyled
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none resize-none"
              placeholder={t("page.supplierPerformance.detail.notesPlaceholder")}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
            <Button
              variant="success"
              className="mt-3"
              size="sm"
              onClick={() => updateNotesMutation.mutate({ notes })}
              disabled={updateNotesMutation.isLoading}>
              <Save size={14} className="mr-1" />
              {t("common.save")}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t("page.supplierPerformance.detail.supplierInfo")}
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("page.supplierPerformance.detail.phone")}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {score.supplier?.phone || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("page.supplierPerformance.detail.email")}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {score.supplier?.email || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("page.supplierPerformance.detail.contactPerson")}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {score.supplier?.contactPerson || "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t("page.supplierPerformance.detail.period")}
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("page.supplierPerformance.detail.periodStart")}
                </p>
                <p className="text-sm font-medium text-foreground">{score.periodStart || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("page.supplierPerformance.detail.periodEnd")}
                </p>
                <p className="text-sm font-medium text-foreground">{score.periodEnd || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("page.supplierPerformance.detail.calculatedAt")}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {score.calculatedAt ? new Date(score.calculatedAt).toLocaleString() : "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t("page.supplierPerformance.detail.purchaseAmount")}
            </h4>
            <div className="text-2xl font-bold text-foreground">
              Rp{(score.totalPurchaseAmount || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierScoreDetail;

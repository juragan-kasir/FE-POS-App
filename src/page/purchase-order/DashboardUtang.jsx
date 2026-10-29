import React, { useState, useMemo } from "react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import {
  Wallet,
  Building2,
  Clock,
  Eye,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { getAPDashboard } from "@/services/purchase-payment";
import { Card } from "@/components/ui/card";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import AbortController from "@/components/organism/abort-controller";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";

const statusStyles = {
  draft: "bg-amber-100 text-amber-800",
  pending: "bg-yellow-100 text-yellow-800",
  ordered: "bg-blue-100 text-blue-800",
  received: "bg-green-100 text-green-800"
};

// Phase 22 Batch 3 — mirrors the BE's single authoritative classification
// (utils/businessDate.js classifyDueDate); this is display-only styling,
// not a second copy of the classification rule itself (BE already
// computed `classification` before it reached the FE).
const dueClassificationStyles = {
  OVERDUE: "bg-red-100 text-red-700",
  DUE_TODAY: "bg-orange-100 text-orange-700",
  "H-1": "bg-amber-100 text-amber-700",
  "H-2": "bg-amber-100 text-amber-700",
  "H-3": "bg-amber-100 text-amber-700",
  "H-4": "bg-amber-100 text-amber-700",
  UPCOMING: "bg-green-100 text-green-700"
};

const DashboardUtang = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie] = useCookies(["user"]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });

  const { data, isLoading, isError, refetch } = useQuery("ap-dashboard", getAPDashboard, {});

  const { summary = {}, suppliers = [], outstandingPOs = [] } = data?.data || {};
  const supplierPOs = selectedSupplier
    ? outstandingPOs.filter((po) => po.supplierId === selectedSupplier.supplierId)
    : [];

  const [expandedPoId, setExpandedPoId] = useState(null);

  const poGroups = useMemo(() => {
    // ponytail: Map menghindari object injection (Codacy), kunci = id PO
    const map = new Map();
    for (const po of outstandingPOs) {
      const key = po.id;
      if (!map.has(key)) {
        map.set(key, {
          id: po.id,
          orderNumber: po.orderNumber,
          orderDate: po.orderDate,
          dueDate: po.dueDate,
          status: po.status,
          daysOverdue: po.daysOverdue,
          daysUntilDue: po.daysUntilDue,
          classification: po.classification,
          totalFinalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          suppliers: []
        });
      }
      const entry = map.get(key);
      entry.suppliers.push({
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        finalAmount: po.finalAmount,
        totalPaid: po.totalPaid,
        outstanding: po.outstanding
      });
      entry.totalFinalAmount += po.finalAmount;
      entry.totalPaid += po.totalPaid;
      entry.totalOutstanding += po.outstanding;
    }
    return [...map.values()].sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [outstandingPOs]);

  const supplierColumns = [
    {
      header: t("page.apDashboard.supplier.name"),
      render: (s) => (
        <span>
          <Building2 size={14} className="inline mr-1" />
          {s.supplierName}
        </span>
      )
    },
    {
      header: t("page.apDashboard.supplier.poCount"),
      align: "center",
      render: (s) => s.poCount
    },
    {
      header: t("page.apDashboard.supplier.totalPO"),
      align: "right",
      render: (s) => `Rp ${(s.totalPO || 0).toLocaleString("id-ID")}`
    },
    {
      header: t("page.apDashboard.supplier.totalPaid"),
      align: "right",
      render: (s) => (
        <span className="text-green-600">Rp {(s.totalPaid || 0).toLocaleString("id-ID")}</span>
      )
    },
    {
      header: t("page.apDashboard.supplier.outstanding"),
      align: "right",
      render: (s) => (
        <span className="font-semibold text-red-600">
          Rp {(s.outstanding || 0).toLocaleString("id-ID")}
        </span>
      )
    },
    {
      header: "",
      align: "center",
      render: (s) => (
        <button
          type="button"
          onClick={() => setSelectedSupplier(s)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
          title={t("page.apDashboard.detailTitle")}>
          <Eye size={16} />
        </button>
      )
    }
  ];

  const poColumns = [
    {
      header: t("page.apDashboard.po.noPO"),
      render: (po) => (
        <span
          className="font-medium text-primary cursor-pointer hover:underline"
          onClick={() => navigate(`/purchase-order/detail?id=${po.id}`)}>
          {po.orderNumber || `PO-${po.id}`}
        </span>
      )
    },
    {
      header: t("page.apDashboard.po.supplier"),
      render: (po) => po.supplierName
    },
    {
      header: t("page.apDashboard.po.total"),
      align: "right",
      render: (po) => `Rp ${(po.finalAmount || 0).toLocaleString("id-ID")}`
    },
    {
      header: t("page.apDashboard.po.paid"),
      align: "right",
      render: (po) => `Rp ${(po.totalPaid || 0).toLocaleString("id-ID")}`
    },
    {
      header: t("page.apDashboard.po.outstanding"),
      align: "right",
      render: (po) => (
        <span className="font-semibold text-red-600">
          Rp {(po.outstanding || 0).toLocaleString("id-ID")}
        </span>
      )
    },
    {
      header: t("page.apDashboard.po.dueDate"),
      render: (po) => (po.dueDate ? new Date(po.dueDate).toLocaleDateString("id") : "-")
    },
    {
      header: t("page.apDashboard.po.overdue"),
      align: "center",
      render: (po) =>
        po.classification && po.classification !== "UPCOMING" ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              dueClassificationStyles[po.classification] || "bg-muted"
            }`}>
            <Clock size={12} />
            {po.classification === "OVERDUE"
              ? `${po.daysOverdue} ${t("page.apDashboard.po.days")}`
              : t(`page.apDashboard.po.classification.${po.classification}`)}
          </span>
        ) : (
          <span className="text-xs text-green-600">-</span>
        )
    },
    {
      header: t("page.apDashboard.po.status"),
      render: (po) => {
        const st = statusStyles[po.status] || "bg-muted";
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${st}`}>
            {po.status}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.apDashboard.title"),
            i18nKey: "page.apDashboard.title"
          }
        ]}
        title={t("page.apDashboard.title")}
        description={t("page.apDashboard.subtitle")}
      />

      {locData && (locData?.data || []).length === 0 ? (
        <NoStore />
      ) : (
        <>
          {isError ? (
            <AbortController refetch={refetch} />
          ) : isLoading ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                    <Skeleton className="h-8 w-28 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="lg:col-span-8 bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <div className="p-5">
                    <Skeleton className="h-[220px] w-full rounded-lg" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <StatCard
                  label={t("page.apDashboard.card.supplierCount")}
                  value={summary.supplierCount || 0}
                  icon={Building2}
                />
                <StatCard
                  label={t("page.apDashboard.card.totalPaid")}
                  value={`Rp ${(summary.totalPaid || 0).toLocaleString("id-ID")}`}
                  icon={DollarSign}
                  variant="active"
                />
                <StatCard
                  label={t("page.apDashboard.card.totalOutstanding")}
                  value={`Rp ${(summary.totalOutstanding || 0).toLocaleString("id-ID")}`}
                  icon={Wallet}
                  variant="inactive"
                />
                <StatCard
                  label={t("page.apDashboard.card.outstandingPO")}
                  value={summary.outstandingPOCount || 0}
                  icon={AlertTriangle}
                  variant={summary.outstandingPOCount > 0 ? "inactive" : "default"}
                />
              </div>
              <Card className="p-5">
                <h3 className="text-lg font-semibold mb-4">
                  {t("page.apDashboard.supplierTitle")}
                </h3>
                <DataTable
                  columns={supplierColumns}
                  data={suppliers}
                  isLoading={false}
                  emptyMessage={t("page.apDashboard.emptySuppliers")}
                  emptyIcon={Building2}
                />
              </Card>
              <Card className="p-5">
                <h3 className="text-lg font-semibold mb-4">{t("page.apDashboard.poTitle")}</h3>
                {poGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wallet size={40} className="mb-3 opacity-40" />
                    <p className="text-sm">{t("page.apDashboard.emptyPOs")}</p>
                  </div>
                ) : (
                  <HorizontalScrollArea>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="text-left py-3 px-2 w-8"></th>
                          <th className="text-left py-3 px-2">{t("page.apDashboard.po.noPO")}</th>
                          <th className="text-right py-3 px-2">{t("page.apDashboard.po.total")}</th>
                          <th className="text-right py-3 px-2">{t("page.apDashboard.po.paid")}</th>
                          <th className="text-right py-3 px-2">
                            {t("page.apDashboard.po.outstanding")}
                          </th>
                          <th className="text-left py-3 px-2">
                            {t("page.apDashboard.po.dueDate")}
                          </th>
                          <th className="text-center py-3 px-2">
                            {t("page.apDashboard.po.overdue")}
                          </th>
                          <th className="text-left py-3 px-2">{t("page.apDashboard.po.status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poGroups.map((group) => (
                          <React.Fragment key={group.id}>
                            <tr
                              className="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                              onClick={() =>
                                setExpandedPoId(expandedPoId === group.id ? null : group.id)
                              }>
                              <td className="py-2.5 px-2">
                                {expandedPoId === group.id ? (
                                  <ChevronDown size={16} className="text-muted-foreground" />
                                ) : (
                                  <ChevronRight size={16} className="text-muted-foreground" />
                                )}
                              </td>
                              <td className="py-2.5 px-2">
                                <span
                                  className="font-medium text-primary cursor-pointer hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/purchase-order/detail?id=${group.id}`);
                                  }}>
                                  {group.orderNumber || `PO-${group.id}`}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-medium">
                                Rp {group.totalFinalAmount.toLocaleString("id-ID")}
                              </td>
                              <td className="py-2.5 px-2 text-right text-green-600">
                                Rp {group.totalPaid.toLocaleString("id-ID")}
                              </td>
                              <td className="py-2.5 px-2 text-right font-semibold text-red-600">
                                Rp {group.totalOutstanding.toLocaleString("id-ID")}
                              </td>
                              <td className="py-2.5 px-2">
                                {group.dueDate
                                  ? new Date(group.dueDate).toLocaleDateString("id")
                                  : "-"}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {group.classification && group.classification !== "UPCOMING" ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                      dueClassificationStyles[group.classification] || "bg-muted"
                                    }`}>
                                    <Clock size={12} />
                                    {group.classification === "OVERDUE"
                                      ? `${group.daysOverdue} ${t("page.apDashboard.po.days")}`
                                      : t(
                                          `page.apDashboard.po.classification.${group.classification}`
                                        )}
                                  </span>
                                ) : (
                                  <span className="text-xs text-green-600">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                    statusStyles[group.status] || "bg-muted"
                                  }`}>
                                  {group.status}
                                </span>
                              </td>
                            </tr>
                            {expandedPoId === group.id &&
                              group.suppliers.map((sup) => (
                                <tr
                                  key={`${group.id}-${sup.supplierId}`}
                                  className="border-b border-border/30 bg-accent/10">
                                  <td className="py-2 px-2"></td>
                                  <td className="py-2 px-2 pl-8 text-muted-foreground text-xs">
                                    <Building2 size={12} className="inline mr-1" />
                                    {sup.supplierName}
                                  </td>
                                  <td className="py-2 px-2 text-right text-xs">
                                    Rp {sup.finalAmount.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-2 px-2 text-right text-xs text-green-600">
                                    Rp {sup.totalPaid.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-2 px-2 text-right text-xs font-medium text-red-600">
                                    Rp {sup.outstanding.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-2 px-2" colSpan={3}></td>
                                </tr>
                              ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                )}
              </Card>
            </>
          )}

          <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedSupplier?.supplierName} — {t("page.apDashboard.detailTitle")}
                </DialogTitle>
                <DialogDescription>
                  {supplierPOs.length} {t("page.purchaseOrder.ui.outstandingPos")}
                  {supplierPOs.length !== 1 ? "s" : ""}{" "}
                  {t("page.purchaseOrder.ui.totalOutstanding")}{" "}
                  <strong>Rp {(selectedSupplier?.outstanding || 0).toLocaleString("id-ID")}</strong>
                </DialogDescription>
              </DialogHeader>
              <DataTable
                columns={poColumns}
                data={supplierPOs}
                isLoading={false}
                emptyMessage={t("page.apDashboard.emptyPOs")}
                emptyIcon={Wallet}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default DashboardUtang;

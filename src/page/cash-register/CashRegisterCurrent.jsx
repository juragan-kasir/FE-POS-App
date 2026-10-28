import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DollarSign, X, Wallet, Coins, Receipt, ArrowRightLeft, AlertCircle } from "lucide-react";
import { getCurrentCashRegister, closeCashRegister } from "@/services/cash-register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import PageHeader from "@/components/ui/PageHeader";
import {
  formatStoreDate,
  formatStoreTime,
  getTodayScheduleMinutes,
  formatMinutesAsTime
} from "@/utils/storeTimezone";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import CashMovements from "./components/CashMovements";

const formatIDR = (num) => {
  if (!num && num !== 0) return "";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

const parseIDR = (str) => {
  if (!str) return 0;
  return Number(str.replace(/[^0-9]/g, "")) || 0;
};

const CashRegisterCurrent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const storeId = cookie?.activeStore || user?.store;

  React.useEffect(() => {
    if (user?.roleType === "super_admin") {
      navigate("/cash-register/history", { replace: true });
    }
  }, [user, navigate]);

  const [rawClosing, setRawClosing] = React.useState("0");
  const closingBalance = parseIDR(rawClosing);
  const [closeModal, setCloseModal] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery(
    ["cash-register-current", storeId],
    () => getCurrentCashRegister(storeId),
    {
      enabled: !!storeId,

      refetchInterval: storeId ? 30000 : false
    }
  );
  const reg = data?.data?.register || data?.data;
  const currentSales = data?.data?.currentSales || reg?.totalSales || 0;
  const totalExpenses = data?.data?.totalExpenses || 0;
  const expectedCash = data?.data?.expectedCash || 0;
  const variance = closingBalance - expectedCash;

  // Phase 39 Batch 6F: purely informational — never blocks/disables
  // closing. Independent of everything else on this screen.
  const closeSchedule = getTodayScheduleMinutes(
    reg?.storeData?.openingHours,
    reg?.storeData?.timezone
  );
  const isOvertimeClosing =
    closeSchedule?.closeMinutes != null && closeSchedule.nowMinutes > closeSchedule.closeMinutes;
  const scheduledCloseTime = formatMinutesAsTime(closeSchedule?.closeMinutes);
  // Phase 39 Batch 6E: supersedes 6F's original "stay silent on a closed
  // day" decision — see the matching comment in CashRegisterOpenClose.jsx.
  const isClosedToday =
    !!closeSchedule && closeSchedule.openMinutes == null && closeSchedule.closeMinutes == null;

  if (!storeId) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("page.cashRegister.current.breadcrumbDashboard"),
              href: "/dashboard-super-admin",
              i18nKey: "page.cashRegister.current.breadcrumbDashboard"
            },
            { label: t("page.cashRegister.current.breadcrumb") },
            { label: t("page.cashRegister.current.title") }
          ]}
          title={t("page.cashRegister.current.title")}
        />
        <div className="flex min-h-full w-full">
          <NoStore />
        </div>
      </div>
    );
  }

  const closeMut = useMutation(
    () => closeCashRegister(reg?.id, { storeId, closedBy: user?.id, closingBalance }),
    {
      onSuccess: () => {
        toast.success(t("page.cashRegister.current.success"), {
          description: t("page.cashRegister.current.closedDesc")
        });
        queryClient.invalidateQueries(["cash-register"]);
        setCloseModal(false);
        refetch();
      },
      onError: (err) =>
        toast.error(t("page.cashRegister.current.fail"), {
          description: err?.response?.data?.message || err.message
        })
    }
  );

  if (isError) return <AbortController refetch={refetch} />;
  if (isLoading)
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: "Dashboard",
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("page.cashRegister.current.breadcrumb") },
          { label: t("page.cashRegister.current.title") }
        ]}
        title={t("page.cashRegister.current.title")}
        description={t("page.cashRegister.current.shiftStatus")}>
        <Button variant="outline" onClick={() => navigate("/cash-register/history")}>
          <Wallet size={16} className="mr-1" /> {t("page.cashRegister.current.historyBtn")}
        </Button>
        {!reg && (
          <Button onClick={() => navigate("/cash-register/open-close")}>
            <DollarSign size={16} className="mr-1" /> {t("page.cashRegister.current.openBtn")}
          </Button>
        )}
      </PageHeader>

      {!reg ? (
        <div className="bg-card p-6 rounded-xl border border-border text-center">
          <Wallet size={48} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{t("page.cashRegister.current.noActiveRegister")}</p>
          <Button onClick={() => navigate("/cash-register/open-close")} className="mt-4">
            <DollarSign size={16} className="mr-1" /> {t("page.cashRegister.current.openBtn")}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border">
              <h2 className="text-lg font-semibold mb-4">
                {t("page.cashRegister.current.infoTitle")}
              </h2>
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      [
                        t("page.cashRegister.current.store"),
                        reg.storeData?.name
                          ? {
                              label: reg.storeData.name,
                              sub:
                                [reg.storeData.address, reg.storeData.city]
                                  .filter(Boolean)
                                  .join(", ") || null
                            }
                          : {
                              label:
                                reg.storeName || cookie?.activeStoreName || user?.storeName || "-"
                            }
                      ],
                      [t("page.cashRegister.current.openedBy"), reg.userData?.fullName || "-"],
                      [
                        t("page.cashRegister.current.openDate"),
                        formatStoreDate(reg.openedAt, reg.storeData?.timezone)
                      ],
                      [
                        t("page.cashRegister.current.openTime"),
                        formatStoreTime(reg.openedAt, reg.storeData?.timezone)
                      ],
                      [
                        t("page.cashRegister.current.openingBalance"),
                        `Rp ${parseInt(reg.openingBalance).toLocaleString("id")}`
                      ],
                      [
                        t("page.cashRegister.current.totalSales"),
                        `Rp ${parseInt(currentSales).toLocaleString("id")}`
                      ],
                      [
                        t("page.cashRegister.current.status"),
                        reg.status === "open"
                          ? t("page.cashRegister.current.statusOpen")
                          : t("page.cashRegister.current.statusClosed")
                      ],
                      [t("page.cashRegister.current.notes"), reg.notes || "-"]
                    ].map(([l, v]) => (
                      <tr key={l} className="border-b border-muted/30">
                        <td className="py-2 pr-4 text-muted-foreground w-44 align-top">{l}</td>
                        <td className="py-2 font-medium">
                          {typeof v === "object" ? (
                            <div>
                              <div>{v.label}</div>
                              {v.sub && (
                                <div className="text-xs text-muted-foreground font-normal">
                                  {v.sub}
                                </div>
                              )}
                            </div>
                          ) : (
                            v
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border space-y-4">
              <h2 className="text-lg font-semibold">{t("page.cashRegister.current.closeTitle")}</h2>

              {/* ponytail: settlement summary — auto-calculated expected vs physical */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("page.cashRegister.current.openingBalance")}
                  </span>
                  <span className="font-medium">{formatIDR(reg.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("page.cashRegister.current.totalSales")}
                  </span>
                  <span className="font-medium text-green-600">+{formatIDR(currentSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("page.cashRegister.current.totalExpenses")}
                  </span>
                  <span className="font-medium text-destructive">-{formatIDR(totalExpenses)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>{t("page.cashRegister.current.expectedCash")}</span>
                  <span>{formatIDR(expectedCash)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-muted-foreground">
                    {t("page.cashRegister.current.variance")}
                  </span>
                  <span
                    className={
                      variance !== 0
                        ? variance > 0
                          ? "text-green-600"
                          : "text-destructive"
                        : "text-muted-foreground"
                    }>
                    {variance === 0 ? "Rp 0" : `${variance > 0 ? "+" : ""}${formatIDR(variance)}`}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="cash-register-current-closing-balance"
                  className="text-sm font-medium">
                  {t("page.cashRegister.current.closingBalance")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground pointer-events-none">
                    <Coins size={16} />
                  </div>
                  <Input
                    id="cash-register-current-closing-balance"
                    type="text"
                    inputMode="numeric"
                    value={formatIDR(rawClosing === "0" ? "" : rawClosing)}
                    placeholder={t("page.cashRegister.current.placeholder")}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, "");
                      setRawClosing(cleaned || "0");
                    }}
                    className="pl-10 h-12 text-lg font-semibold tabular-nums"
                  />
                </div>
              </div>

              {variance !== 0 && (
                <p
                  className={`text-xs flex items-center gap-1 ${variance > 0 ? "text-green-600" : "text-destructive"}`}>
                  <ArrowRightLeft size={12} />
                  {variance > 0
                    ? t("page.cashRegister.current.varianceMore", {
                        amount: formatIDR(Math.abs(variance))
                      })
                    : t("page.cashRegister.current.varianceLess", {
                        amount: formatIDR(Math.abs(variance))
                      })}
                </p>
              )}

              {isOvertimeClosing && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    {t("page.cashRegister.current.overtimeNotice", { time: scheduledCloseTime })}
                  </span>
                </div>
              )}

              {isClosedToday && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{t("page.cashRegister.current.closedTodayNotice")}</span>
                </div>
              )}

              <Button onClick={() => setCloseModal(true)} variant="destructive" className="w-full">
                <X size={16} className="mr-1" /> {t("page.cashRegister.current.closeBtn")}
              </Button>
            </div>
          </div>

          {reg?.status === "open" && (
            <CashMovements
              registerId={reg.id}
              canManage={user?.roleType === "super_admin" || user?.roleType === "admin"}
            />
          )}

          {/* ponytail: expenses breakdown for settlement transparency */}
          {(data?.data?.expenses || []).length > 0 && (
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Receipt size={16} className="text-muted-foreground" />
                {t("page.cashRegister.current.expensesTitle")} ({data?.data?.expenses.length})
              </h3>
              <div className="space-y-1 text-sm">
                {data?.data?.expenses.map((exp, i) => (
                  <div
                    key={exp.id || i}
                    className="flex justify-between py-1.5 border-b border-muted/20 last:border-0">
                    <div>
                      <span className="font-medium">{exp.description || "-"}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(exp.date).toLocaleDateString("id")}
                      </span>
                    </div>
                    <span className="text-destructive font-medium">-{formatIDR(exp.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        type="confirm"
        open={closeModal}
        onOpenChange={(o) => !o && setCloseModal(false)}
        title={t("page.cashRegister.current.modalTitle")}
        description={t("page.cashRegister.current.modalDesc", {
          balance: formatIDR(closingBalance)
        })}
        confirmText={t("page.cashRegister.current.modalConfirm")}
        onConfirm={() => closeMut.mutate()}
        loading={closeMut.isLoading}
      />
    </div>
  );
};

export default CashRegisterCurrent;

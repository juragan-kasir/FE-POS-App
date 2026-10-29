import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DollarSign, X, Wallet, Coins, Landmark, AlertCircle } from "lucide-react";
import { openCashRegister, getOpenRegisters, getTableResetPreview } from "@/services/cash-register";
import { getLocationDetail } from "@/services/location";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import { getTodayScheduleMinutes, formatMinutesAsTime } from "@/utils/storeTimezone";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { Textarea } from "@/components/ui/textarea";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const formatIDR = (num) => {
  if (!num && num !== 0) return "";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

const parseIDR = (str) => {
  if (!str) return 0;
  return Number(str.replace(/[^0-9]/g, "")) || 0;
};

const quickAmounts = [100000, 200000, 500000, 1000000, 2000000, 5000000];

const CashRegisterOpenClose = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const { data: locationsData, isLoading: locationsLoading } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || [];

  const { data: openRegistersData, isLoading: openRegistersLoading } = useQuery(
    ["open-registers"],
    () => getOpenRegisters(),
    { enabled: isSuperAdmin }
  );
  const openRegisters = openRegistersData?.data || [];
  const openStoreIds = new Set(openRegisters.map((r) => Number(r.store)));
  const storeLoading = isSuperAdmin && (locationsLoading || openRegistersLoading);

  const storeOptions = locations.map((loc) => {
    const isOpen = openStoreIds.has(Number(loc.id));
    return {
      value: loc.id,
      label: isOpen ? `${loc.name} ${t("page.cashRegister.openClose.storeOpenBadge")}` : loc.name
    };
  });

  const [selectedStore, setSelectedStore] = useState(cookie?.activeStore || user?.store || "");
  const [rawBalance, setRawBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  // Phase 39 Batch 6C: independent of cancelModal/selectedStoreIsOpen —
  // this is purely "N stale occupied tables will be reset," never a
  // second opinion on whether the store already has an open register.
  const [tableResetModalOpen, setTableResetModalOpen] = useState(false);
  const [tableResetEligibleCount, setTableResetEligibleCount] = useState(0);
  const [checkingTableReset, setCheckingTableReset] = useState(false);

  const selectedStoreIsOpen = openStoreIds.has(Number(selectedStore));

  // Phase 39 Batch 6F: purely informational — never blocks/disables
  // opening, and completely independent of `selectedStoreIsOpen` above
  // (that guard is about a second register for the same store, not
  // operating hours; the two conditions must never be merged).
  const { data: locationDetailData } = useQuery(
    ["cash-register-open-location-detail", selectedStore],
    () => getLocationDetail({ id: selectedStore }),
    { enabled: !!selectedStore }
  );
  const openLocationDetail = locationDetailData?.data;
  const openSchedule = getTodayScheduleMinutes(
    openLocationDetail?.openingHours,
    openLocationDetail?.timezone
  );
  const isEarlyOpening =
    openSchedule?.openMinutes != null && openSchedule.nowMinutes < openSchedule.openMinutes;
  const scheduledOpenTime = formatMinutesAsTime(openSchedule?.openMinutes);
  // Phase 39 Batch 6E: supersedes 6F's original "stay silent on a closed
  // day" decision. A non-null openSchedule with both minutes null means the
  // day's openingHours entry positively exists and says closed — distinct
  // from openSchedule being null outright (no entry for today at all),
  // which stays silent since there's nothing to positively assert.
  const isClosedToday =
    !!openSchedule && openSchedule.openMinutes == null && openSchedule.closeMinutes == null;

  const numericBalance = parseIDR(rawBalance);

  const openMut = useMutation(
    (confirmTableReset = false) =>
      openCashRegister({
        storeId: parseInt(selectedStore),
        openedBy: user?.id,
        openingBalance: numericBalance,
        notes,
        confirmTableReset
      }),
    {
      onSuccess: (result) => {
        toast.success(t("page.cashRegister.openClose.success"), {
          description: t("page.cashRegister.openClose.openedDesc")
        });
        // Phase 39 Batch 6C: cleanup is best-effort and never blocks a
        // successful register open — a partial/full cleanup failure is
        // surfaced as an additional warning toast, never as an error and
        // never implying the register itself failed to open.
        const cleanup = result?.tableCleanupResult;
        if (cleanup?.attempted && cleanup.failed > 0) {
          toast.warning(
            t("page.cashRegister.openClose.tableResetWarning", { failed: cleanup.failed })
          );
        }
        setTableResetModalOpen(false);
        queryClient.invalidateQueries(["cash-register"]);
        navigate("/cash-register/current");
      },
      onError: (err) => {
        setTableResetModalOpen(false);
        toast.error(t("page.cashRegister.openClose.fail"), {
          description: err?.response?.data?.message || err.message
        });
      }
    }
  );

  // Phase 39 Batch 6C: the eligibility preview is fetched fresh on every
  // click, right after the (unchanged) selectedStoreIsOpen guard — never
  // trusted from any earlier/cached read — so confirmation always reflects
  // the current table population. If the preview call itself fails, that
  // is a non-blocking convenience check: degrade to opening the register
  // normally rather than letting a preview outage block the cashier.
  const handleOpenClick = async () => {
    if (selectedStoreIsOpen) {
      toast.error(t("page.cashRegister.openClose.fail"), {
        description: t("page.cashRegister.openClose.storeOpenError")
      });
      return;
    }
    setCheckingTableReset(true);
    let eligibleCount = 0;
    try {
      const preview = await getTableResetPreview(selectedStore);
      eligibleCount = preview?.data?.eligibleCount || 0;
    } catch {
      eligibleCount = 0;
    }
    setCheckingTableReset(false);

    if (eligibleCount > 0) {
      setTableResetEligibleCount(eligibleCount);
      setTableResetModalOpen(true);
    } else {
      openMut.mutate(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 max-w-[1440px] mx-auto w-full">
        <PageHeader
          backLink="/dashboard-super-admin"
          onBack={() => setCancelModal(true)}
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            { i18nKey: "page.cashRegister.openClose.breadcrumb" }
          ]}
          title={t("page.cashRegister.openClose.title")}
          description={t("page.cashRegister.openClose.desc")}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet size={18} />
            <span className="text-sm font-medium whitespace-nowrap">
              {user?.name || user?.username}
            </span>
          </div>
        </PageHeader>
        <LoadErrorBanner />

        {/* Opening Balance Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="border-b border-border bg-gradient-to-r from-primary/10 via-primary/[0.03] to-transparent px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Landmark size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">
                    {t("page.cashRegister.openClose.openingBalanceTitle")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t("page.cashRegister.openClose.openingBalanceDesc")}
                  </p>
                </div>
              </div>
              {isSuperAdmin && (
                <div className="w-full lg:w-64 xl:w-72 shrink-0">
                  {storeLoading ? (
                    <Skeleton className="h-10 w-full rounded-md" />
                  ) : (
                    <>
                      <Label
                        htmlFor="cash-register-open-close-select-store"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("page.cashRegister.openClose.selectStore")}
                      </Label>
                      <Combobox
                        id="cash-register-open-close-select-store"
                        options={storeOptions}
                        value={selectedStore}
                        onChange={setSelectedStore}
                        placeholder={t("page.cashRegister.openClose.selectStore")}
                        searchPlaceholder="Cari toko..."
                        className="mt-1.5"
                      />
                      {selectedStoreIsOpen && (
                        <p className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          {t("page.cashRegister.openClose.storeOpenWarning")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6 xl:gap-8">
              <div className="space-y-5 xl:col-span-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="cash-register-open-close-amount-label"
                    className="text-sm font-medium">
                    {t("page.cashRegister.openClose.amountLabel")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground pointer-events-none">
                      <Coins size={16} />
                    </div>
                    <Input
                      id="cash-register-open-close-amount-label"
                      type="text"
                      inputMode="numeric"
                      value={formatIDR(rawBalance === "0" ? "" : rawBalance)}
                      placeholder={t("page.cashRegister.openClose.placeholder")}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, "");
                        setRawBalance(cleaned || "0");
                      }}
                      className="pl-10 h-12 text-lg font-semibold tabular-nums"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {numericBalance > 0
                      ? `${t("page.cashRegister.openClose.recorded")} ${formatIDR(numericBalance)}`
                      : t("page.cashRegister.openClose.enterOpeningBalance")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-normal">
                    {t("page.cashRegister.openClose.quickSelect")}
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setRawBalance(String(amount))}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                          numericBalance === amount
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}>
                        {formatIDR(amount)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5 xl:col-span-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="cash-register-open-close-notes-label"
                    className="text-sm font-medium">
                    {t("page.cashRegister.openClose.notesLabel")}
                  </Label>
                  <Textarea
                    id="cash-register-open-close-notes-label"
                    unstyled
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-shadow resize-none"
                    placeholder={t("page.cashRegister.openClose.notesPlaceholder")}
                    maxLength={FIELD_LIMITS.DESCRIPTION}
                  />
                </div>
                {isEarlyOpening && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      {t("page.cashRegister.openClose.earlyOpeningNotice", {
                        time: scheduledOpenTime
                      })}
                    </span>
                  </div>
                )}
                {isClosedToday && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{t("page.cashRegister.openClose.closedTodayNotice")}</span>
                  </div>
                )}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
                  <Button
                    variant="danger"
                    onClick={() => navigate("/dashboard-super-admin")}
                    className="w-full sm:w-auto gap-1.5">
                    <X size={16} /> {t("page.cashRegister.openClose.cancel")}
                  </Button>
                  <Button
                    variant="success"
                    onClick={handleOpenClick}
                    disabled={
                      openMut.isLoading ||
                      checkingTableReset ||
                      numericBalance <= 0 ||
                      !selectedStore
                    }
                    disabledReason={
                      openMut.isLoading || checkingTableReset
                        ? undefined
                        : !selectedStore
                          ? t("common.disabledReason.selectStoreFirst")
                          : t("page.cashRegister.disabledReason.openingBalance")
                    }
                    className="w-full sm:w-auto gap-1.5">
                    <DollarSign size={16} />
                    {openMut.isLoading
                      ? t("page.cashRegister.openClose.opening")
                      : t("page.cashRegister.openClose.openWithAmount", {
                          amount: formatIDR(numericBalance)
                        })}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(() => navigate("/dashboard-super-admin"), 150)}
      />
      {/* Phase 39 Batch 6C: only ever shown when the preview reports at
          least one eligible table — cancelling here mutates nothing and
          opens nothing, exactly like the cancelModal above. */}
      <Modal
        type="confirm"
        open={tableResetModalOpen}
        onOpenChange={setTableResetModalOpen}
        title={t("page.cashRegister.openClose.tableResetConfirmTitle")}
        description={t("page.cashRegister.openClose.tableResetConfirmDesc", {
          count: tableResetEligibleCount
        })}
        confirmText={t("page.cashRegister.openClose.tableResetConfirmButton")}
        loading={openMut.isLoading}
        onConfirm={() => openMut.mutate(true)}
      />
    </>
  );
};

export default CashRegisterOpenClose;

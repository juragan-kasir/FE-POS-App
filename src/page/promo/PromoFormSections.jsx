import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  Gift,
  Info,
  ListChecks,
  Megaphone,
  Percent,
  SlidersHorizontal
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Modal from "@/components/organism/modal";
import PromoStoreSection from "./PromoStoreSection";
import PromoGeneralTab from "./PromoGeneralTab";
import PromoDiscountTab from "./PromoDiscountTab";
import PromoScheduleTab from "./PromoScheduleTab";
import PromoTargetingTab from "./PromoTargetingTab";
import PromoRulesTab from "./PromoRulesTab";
import PromoRewardsTab from "./PromoRewardsTab";

const TABS = [
  { value: "general", icon: Megaphone, labelKey: "page.promo.form.basicInfo" },
  { value: "discount", icon: Percent, labelKey: "page.promo.form.discountSettings" },
  { value: "schedule", icon: CalendarClock, labelKey: "page.promo.form.schedule" },
  {
    value: "targeting",
    icon: SlidersHorizontal,
    labelKey: "page.dashboardSuperAdmin.store.col.target"
  },
  { value: "rules", icon: ListChecks, labelKey: "page.promo.form.rules" },
  { value: "rewards", icon: Gift, labelKey: "page.promo.form.rewards" }
];

const PromoFormSections = ({ idPrefix, form, editor, isSuperAdmin }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { storeScope, schedule, rulesApi, options } = editor;

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "rule") rulesApi.removeRule(deleteConfirm.index);
    else rulesApi.removeReward(deleteConfirm.index);
    setDeleteConfirm(null);
  };

  return (
    <>
      {isSuperAdmin && <PromoStoreSection storeScope={storeScope} />}

      <div className="bg-card rounded-xl border border-border overflow-hidden p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* ponytail: tab scroll horizontal di layar sempit */}
          <div className="overflow-x-auto -mx-1 px-1 mb-4">
            <TabsList className="grid w-full grid-cols-6 min-w-[640px]">
              {TABS.map(({ value, icon: Icon, labelKey }) => (
                <TabsTrigger key={value} value={value} className="gap-1.5">
                  <Icon size={14} />
                  {t(labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="general" className="mt-0">
            <PromoGeneralTab
              idPrefix={idPrefix}
              form={form}
              onTypeChange={editor.handleTypeChange}
            />
          </TabsContent>

          <TabsContent value="discount" className="mt-0">
            <PromoDiscountTab
              idPrefix={idPrefix}
              form={form}
              onDiscountTypeChange={editor.handleDiscountTypeChange}
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-0 space-y-4">
            <PromoScheduleTab idPrefix={idPrefix} form={form} schedule={schedule} />
          </TabsContent>

          <TabsContent value="rules" className="mt-0 space-y-4">
            <PromoRulesTab
              form={form}
              rules={rulesApi.rules}
              addRule={rulesApi.addRule}
              updateRule={rulesApi.updateRule}
              onDelete={(index) => setDeleteConfirm({ type: "rule", index })}
              productOptions={options.productOptions}
              tierOptions={options.tierOptions}
            />
          </TabsContent>

          <TabsContent value="rewards" className="mt-0 space-y-4">
            <PromoRewardsTab
              form={form}
              rewards={rulesApi.rewards}
              addReward={rulesApi.addReward}
              updateReward={rulesApi.updateReward}
              onDelete={(index) => setDeleteConfirm({ type: "reward", index })}
              productOptions={options.productOptions}
            />
          </TabsContent>

          <TabsContent value="targeting" className="mt-0 space-y-6">
            <PromoTargetingTab
              idPrefix={idPrefix}
              form={form}
              isStoreReady={storeScope.isStoreReady}
              allStores={storeScope.allStores}
              applicableIds={editor.applicableIds}
              onApplicableIdsChange={editor.setApplicableIds}
              options={options}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">
            {t("page.promo.form.tipsTitle")}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">{t("page.promo.form.tipsContent")}</p>
      </div>

      <Modal
        type="confirm"
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={t("modal.deleteTitle")}
        description={t("modal.deleteConfirm")}
        confirmText={t("modal.yesDelete")}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default PromoFormSections;

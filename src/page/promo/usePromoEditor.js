import { useState } from "react";
import { getMissingFields } from "@/lib/validation";
import {
  PROMO_FIELD_LABELS,
  buildPromoPayload,
  campaignToFormValues,
  isSpecificScope
} from "./promoForm";
import { usePromoStoreScope } from "./usePromoStoreScope";
import { usePromoSchedule } from "./usePromoSchedule";
import { usePromoRules } from "./usePromoRules";
import { usePromoOptions } from "./usePromoOptions";

export const usePromoEditor = ({ form, schema, isSuperAdmin, fallbackStore, campaignId }) => {
  const [applicableIds, setApplicableIds] = useState([]);
  const clearApplicableIds = () => setApplicableIds([]);
  const storeScope = usePromoStoreScope({
    isSuperAdmin,
    fallbackStore,
    onScopeChange: clearApplicableIds
  });
  const schedule = usePromoSchedule(form);
  const rulesApi = usePromoRules();
  const options = usePromoOptions({
    effectiveStore: storeScope.effectiveStore,
    allStores: storeScope.allStores,
    applicableTo: form.watch("applicableTo"),
    rules: rulesApi.rules,
    rewards: rulesApi.rewards,
    isCombinable: form.watch("isCombinable"),
    excludeCampaignId: campaignId
  });

  const resetDependentFields = (type, discountType) => {
    rulesApi.clearRulesAndRewards();
    if (discountType !== "percentage") form.setValue("maxDiscount", null);
    if (discountType === "free_item" || type === "birthday") form.setValue("discountValue", 0);
  };

  const handleTypeChange = (type) => {
    if (type === form.getValues("type")) return;
    form.setValue("type", type);
    resetDependentFields(type, form.getValues("discountType"));
  };

  const handleDiscountTypeChange = (discountType) => {
    if (discountType === form.getValues("discountType")) return;
    form.setValue("discountType", discountType);
    resetDependentFields(form.getValues("type"), discountType);
  };

  const findMissingFields = () => {
    const values = form.getValues();
    const needsApplicableIds = isSpecificScope(values.applicableTo) && applicableIds.length === 0;
    return getMissingFields(
      values,
      schema,
      PROMO_FIELD_LABELS,
      needsApplicableIds ? [{ name: "applicableIds" }] : []
    );
  };

  const buildPayload = (isDraft) =>
    buildPromoPayload({
      values: form.getValues(),
      store: storeScope.effectiveStore,
      applicableIds,
      daysOfWeek: schedule.daysOfWeek,
      rules: rulesApi.rules,
      rewards: rulesApi.rewards,
      isDraft
    });

  const hydrate = (campaign) => {
    form.reset(campaignToFormValues(campaign));
    rulesApi.hydrateRules(campaign);
    schedule.hydrateSchedule(campaign);
    setApplicableIds((campaign.applicableIds || []).map(String));
    storeScope.hydrateStore(campaign.store);
  };

  return {
    storeScope,
    schedule,
    rulesApi,
    options,
    applicableIds,
    setApplicableIds,
    handleTypeChange,
    handleDiscountTypeChange,
    findMissingFields,
    buildPayload,
    hydrate
  };
};

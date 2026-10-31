import { useState } from "react";
import { NEW_REWARD, NEW_RULE, defaultConditionFor } from "./promoForm";

const replaceAt = (list, index, next) => list.map((item, i) => (i === index ? next : item));

const nextRule = (rule, field, value) => {
  if (field === "ruleType") {
    return { ...rule, ruleType: value, condition: defaultConditionFor(value) };
  }
  if (field.startsWith("condition.")) {
    const key = field.split(".")[1];
    return { ...rule, condition: { ...rule.condition, [key]: value } };
  }
  return { ...rule, [field]: value };
};

export const usePromoRules = () => {
  const [rules, setRules] = useState([]);
  const [rewards, setRewards] = useState([]);

  const addRule = () => setRules((prev) => [...prev, { ...NEW_RULE, condition: {} }]);
  const updateRule = (index, field, value) =>
    setRules((prev) => replaceAt(prev, index, nextRule(prev[index], field, value)));
  const removeRule = (index) => setRules((prev) => prev.filter((_, i) => i !== index));

  const addReward = () => setRewards((prev) => [...prev, { ...NEW_REWARD }]);
  const updateReward = (index, field, value) =>
    setRewards((prev) => replaceAt(prev, index, { ...prev[index], [field]: value }));
  const removeReward = (index) => setRewards((prev) => prev.filter((_, i) => i !== index));

  const clearRulesAndRewards = () => {
    setRules([]);
    setRewards([]);
  };

  const hydrateRules = (campaign) => {
    setRules(campaign.rules || []);
    setRewards(campaign.rewards || []);
  };

  return {
    rules,
    rewards,
    addRule,
    updateRule,
    removeRule,
    addReward,
    updateReward,
    removeReward,
    clearRulesAndRewards,
    hydrateRules
  };
};

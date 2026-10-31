import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { formatIDR, parseIDR } from "./promoForm";
import { usePromoTypeFlags } from "./usePromoTypeFlags";

const PromoRewardsTab = ({ form, rewards, addReward, updateReward, onDelete, productOptions }) => {
  const { t } = useTranslation();
  const { isFreeItem, isBirthday } = usePromoTypeFlags(form);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {isFreeItem
            ? t("page.promo.ui.rewardHintFreeItem")
            : isBirthday
              ? t("page.promo.ui.rewardHintBirthday")
              : t("page.promo.ui.rewardHintDefault")}
        </p>
        <Button type="button" variant="success" size="sm" onClick={addReward}>
          <Plus size={14} className="mr-1" />
          {t("page.promo.form.addReward")}
        </Button>
      </div>
      {rewards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("page.promo.form.noRewards")}</p>
      ) : (
        <div className="space-y-3">
          {rewards.map((reward, index) => {
            const needProduct = ["free_item", "buy_x_get_y"].includes(reward.rewardType);
            const isPercent = reward.rewardType === "discount_percentage";
            return (
              <div
                key={index}
                className="p-3 bg-background rounded-lg border border-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="space-y-1 sm:col-span-5">
                    <Label htmlFor={`promo-reward-${index}-type`} className="text-xs">
                      {t("page.promo.ui.rewardType")}
                    </Label>
                    <Combobox
                      id={`promo-reward-${index}-type`}
                      options={[
                        {
                          value: "discount_percentage",
                          label: t("page.memberLoyalty.ui.discount2")
                        },
                        {
                          value: "discount_fixed",
                          label: t("page.promo.ui.fixedDiscount")
                        },
                        { value: "free_item", label: t("page.promo.ui.freeProduct") },
                        { value: "buy_x_get_y", label: t("page.promo.ui.buyXGetY") },
                        {
                          value: "points_multiplier",
                          label: t("page.promo.ui.pointsMultiplier")
                        },
                        { value: "cashback", label: t("page.promo.ui.cashback") }
                      ]}
                      value={reward.rewardType}
                      onChange={(v) => updateReward(index, "rewardType", v)}
                      placeholder={t("page.promo.ui.selectReward")}
                      searchPlaceholder={t("common.search.reward")}
                    />
                  </div>
                  {!needProduct && (
                    <div className="space-y-1 sm:col-span-4">
                      <Label htmlFor={`promo-reward-${index}-value`} className="text-xs">
                        {isPercent
                          ? t("page.promo.ui.rewardValuePercent")
                          : t("page.promo.ui.rewardValue")}
                      </Label>
                      {reward.rewardType === "points_multiplier" ? (
                        <Input
                          id={`promo-reward-${index}-value`}
                          type="number"
                          min="1"
                          value={reward.rewardValue ?? 1}
                          onChange={(e) =>
                            updateReward(index, "rewardValue", parseInt(e.target.value) || 1)
                          }
                        />
                      ) : isPercent ? (
                        <div className="relative">
                          <Input
                            id={`promo-reward-${index}-value`}
                            type="number"
                            value={reward.rewardValue ?? 0}
                            onChange={(e) =>
                              updateReward(index, "rewardValue", parseInt(e.target.value) || 0)
                            }
                            className="text-right pr-7"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      ) : (
                        <Input
                          id={`promo-reward-${index}-value`}
                          type="text"
                          inputMode="numeric"
                          value={reward.rewardValue ? formatIDR(reward.rewardValue) : ""}
                          onChange={(e) =>
                            updateReward(index, "rewardValue", parseIDR(e.target.value))
                          }
                          placeholder="Rp 0"
                          className="text-right"
                        />
                      )}
                    </div>
                  )}
                  {needProduct && (
                    <div className="space-y-1 sm:col-span-7">
                      <Label htmlFor={`promo-reward-${index}-product`} className="text-xs">
                        {t("page.promo.ui.freeProduct")}
                      </Label>
                      <Combobox
                        id={`promo-reward-${index}-product`}
                        options={productOptions}
                        value={reward.productId ? String(reward.productId) : ""}
                        onChange={(v) => updateReward(index, "productId", Number(v))}
                        placeholder={t("page.promo.ui.selectFreeProduct")}
                        searchPlaceholder={t("common.search.product")}
                      />
                    </div>
                  )}
                  <div className="space-y-1 sm:col-span-3">
                    <Label htmlFor={`promo-reward-${index}-qty`} className="text-xs">
                      {t("document.qty")}
                    </Label>
                    <Input
                      id={`promo-reward-${index}-qty`}
                      type="number"
                      min="1"
                      value={reward.quantity ?? 1}
                      onChange={(e) =>
                        updateReward(index, "quantity", parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.delete")}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(index)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default PromoRewardsTab;

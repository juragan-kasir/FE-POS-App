import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { formatIDR, parseIDR } from "./promoForm";
import { usePromoTypeFlags } from "./usePromoTypeFlags";

const MONEY_INPUT_CLASS = "h-10 text-right";

const PromoRulesTab = ({
  form,
  rules,
  addRule,
  updateRule,
  onDelete,
  productOptions,
  tierOptions
}) => {
  const { t } = useTranslation();
  const { isBuyXGetY, isSpendGet, isHappyHour, isBirthday } = usePromoTypeFlags(form);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {isBuyXGetY
            ? t("page.promo.ui.ruleHintBxgy")
            : isSpendGet
              ? t("page.promo.ui.ruleHintMinPurchase")
              : isHappyHour
                ? t("page.promo.ui.ruleHintHappyHour")
                : isBirthday
                  ? t("page.promo.ui.ruleHintBirthday")
                  : t("page.promo.ui.ruleHintDefault")}
        </p>
        <Button type="button" variant="success" size="sm" onClick={addRule}>
          <Plus size={14} className="mr-1" />
          {t("page.promo.form.addRule")}
        </Button>
      </div>
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("page.promo.form.noRules")}</p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="p-3 bg-background rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Combobox
                    options={[
                      { value: "time", label: t("page.dashboard.table.time") },
                      { value: "birthday", label: t("page.promo.ui.birthday") },
                      { value: "buy_x_get_y", label: t("page.promo.ui.buyXGetY") },
                      {
                        value: "spend_threshold",
                        label: t("page.discount.form.minPurchase")
                      },
                      { value: "member_tier", label: t("common.ui.memberTiers") },
                      { value: "first_purchase", label: t("page.promo.ui.firstPurchase") }
                    ]}
                    value={rule.ruleType}
                    onChange={(v) => updateRule(index, "ruleType", v)}
                    placeholder={t("page.promo.ui.selectRule")}
                    searchPlaceholder={t("common.search.rule")}
                  />
                </div>
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
              {rule.ruleType === "buy_x_get_y" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`promo-rule-${index}-product-x`} className="text-xs">
                      {t("page.promo.ui.productX")}
                    </Label>
                    <Combobox
                      id={`promo-rule-${index}-product-x`}
                      options={productOptions}
                      value={rule.condition.productIdX ? String(rule.condition.productIdX) : ""}
                      onChange={(v) => updateRule(index, "condition.productIdX", Number(v))}
                      placeholder={t("page.promo.ui.selectProductX")}
                      searchPlaceholder={t("common.search.product")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`promo-rule-${index}-product-y`} className="text-xs">
                      {t("page.promo.ui.productYBonus")}
                    </Label>
                    <Combobox
                      id={`promo-rule-${index}-product-y`}
                      options={productOptions}
                      value={rule.condition.productIdY ? String(rule.condition.productIdY) : ""}
                      onChange={(v) => updateRule(index, "condition.productIdY", Number(v))}
                      placeholder={t("page.promo.ui.selectBonusProduct")}
                      searchPlaceholder={t("common.search.product")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`promo-rule-${index}-qty-x`} className="text-xs">
                      {t("page.promo.ui.buyQtyX")}
                    </Label>
                    <Input
                      id={`promo-rule-${index}-qty-x`}
                      type="number"
                      min="1"
                      value={rule.condition.qtyX ?? 1}
                      onChange={(e) =>
                        updateRule(index, "condition.qtyX", parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`promo-rule-${index}-qty-y`} className="text-xs">
                      {t("page.promo.ui.bonusQtyY")}
                    </Label>
                    <Input
                      id={`promo-rule-${index}-qty-y`}
                      type="number"
                      min="1"
                      value={rule.condition.qtyY ?? 1}
                      onChange={(e) =>
                        updateRule(index, "condition.qtyY", parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                </div>
              )}
              {rule.ruleType === "spend_threshold" && (
                <div className="space-y-1">
                  <Label htmlFor={`promo-rule-${index}-min-purchase`} className="text-xs">
                    {t("page.discount.form.minPurchase")}
                  </Label>
                  <Input
                    id={`promo-rule-${index}-min-purchase`}
                    type="text"
                    inputMode="numeric"
                    value={rule.condition.minAmount ? formatIDR(rule.condition.minAmount) : ""}
                    onChange={(e) =>
                      updateRule(index, "condition.minAmount", parseIDR(e.target.value))
                    }
                    placeholder="Rp 0"
                    className={MONEY_INPUT_CLASS}
                  />
                </div>
              )}
              {rule.ruleType === "member_tier" && (
                <div className="space-y-1">
                  <Label htmlFor={`promo-rule-${index}-tier`} className="text-xs">
                    {t("common.ui.memberTiers")}
                  </Label>
                  <Combobox
                    id={`promo-rule-${index}-tier`}
                    options={tierOptions}
                    value={rule.condition.tierId ? String(rule.condition.tierId) : ""}
                    onChange={(v) => updateRule(index, "condition.tierId", Number(v))}
                    placeholder={t("page.promo.ui.selectTier")}
                    searchPlaceholder={t("common.search.tier")}
                  />
                </div>
              )}
              {["time", "birthday", "first_purchase"].includes(rule.ruleType) && (
                <p className="text-xs text-muted-foreground">
                  {t("page.promo.ui.thisRuleNeedsNoAdditional")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default PromoRulesTab;

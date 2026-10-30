import { safeGet } from "@/lib/safe-lookup";
import React, { useState } from "react";
import PropTypes from "prop-types";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DynamicIcon from "@/components/ui/DynamicIcon";

export const guides = {
  "add-location": {
    titleKey: "guide.addLocation.title",
    steps: [
      { icon: "store", textKey: "guide.addLocation.step1" },
      { icon: "map", textKey: "guide.addLocation.step2" },
      { icon: "photo_camera", textKey: "guide.addLocation.step3" },
      { icon: "badge", textKey: "guide.addLocation.step4" },
      { icon: "toggle_on", textKey: "guide.addLocation.step5" },
      { icon: "checklist", textKey: "guide.addLocation.step6" }
    ]
  },
  "add-category": {
    titleKey: "guide.addCategory.title",
    steps: [
      { icon: "label", textKey: "guide.addCategory.step1" },
      { icon: "description", textKey: "guide.addCategory.step2" },
      { icon: "image", textKey: "guide.addCategory.step3" },
      { icon: "toggle_on", textKey: "guide.addCategory.step4" },
      { icon: "link", textKey: "guide.addCategory.step5" }
    ]
  },
  "add-supplier": {
    titleKey: "guide.addSupplier.title",
    steps: [
      { icon: "badge", textKey: "guide.addSupplier.step1" },
      { icon: "person", textKey: "guide.addSupplier.step2" },
      { icon: "call", textKey: "guide.addSupplier.step3" },
      { icon: "toggle_on", textKey: "guide.addSupplier.step4" }
    ]
  },
  "add-product": {
    titleKey: "guide.addProduct.title",
    steps: [
      { icon: "store", textKey: "guide.addProduct.step1" },
      { icon: "inventory_2", textKey: "guide.addProduct.step2" },
      { icon: "category", textKey: "guide.addProduct.step3" },
      { icon: "attach_money", textKey: "guide.addProduct.step4" },
      { icon: "layers", textKey: "guide.addProduct.step5" },
      { icon: "image", textKey: "guide.addProduct.step6" },
      { icon: "checklist", textKey: "guide.addProduct.step7" }
    ]
  },
  "add-member": {
    titleKey: "guide.addMember.title",
    steps: [
      { icon: "person_add", textKey: "guide.addMember.step1" },
      { icon: "call", textKey: "guide.addMember.step2" },
      { icon: "cake", textKey: "guide.addMember.step3" },
      { icon: "toggle_on", textKey: "guide.addMember.step4" }
    ]
  },
  "add-member-tier": {
    titleKey: "guide.addMemberTier.title",
    steps: [
      { icon: "stars", textKey: "guide.addMemberTier.step1" },
      { icon: "workspace_premium", textKey: "guide.addMemberTier.step2" },
      { icon: "percent", textKey: "guide.addMemberTier.step3" },
      { icon: "palette", textKey: "guide.addMemberTier.step4" },
      { icon: "checklist", textKey: "guide.addMemberTier.step5" },
      { icon: "toggle_on", textKey: "guide.addMemberTier.step6" },
      { icon: "link", textKey: "guide.addMemberTier.step7" }
    ]
  },
  "add-stock-opname": {
    titleKey: "guide.addStockOpname.title",
    steps: [
      { icon: "calendar_today", textKey: "guide.addStockOpname.step1" },
      { icon: "download", textKey: "guide.addStockOpname.step2" },
      { icon: "table_rows", textKey: "guide.addStockOpname.step3" },
      { icon: "inventory_2", textKey: "guide.addStockOpname.step4" },
      { icon: "calculate", textKey: "guide.addStockOpname.step5" },
      { icon: "edit_note", textKey: "guide.addStockOpname.step6" },
      { icon: "save", textKey: "guide.addStockOpname.step7" }
    ]
  },
  "add-department": {
    titleKey: "guide.addDepartment.title",
    steps: [
      { icon: "domain", textKey: "guide.addDepartment.step1" },
      { icon: "description", textKey: "guide.addDepartment.step2" },
      { icon: "toggle_on", textKey: "guide.addDepartment.step3" },
      { icon: "save", textKey: "guide.addDepartment.step4" }
    ]
  },
  "add-position": {
    titleKey: "guide.addPosition.title",
    steps: [
      { icon: "badge", textKey: "guide.addPosition.step1" },
      { icon: "domain", textKey: "guide.addPosition.step2" },
      { icon: "description", textKey: "guide.addPosition.step3" },
      { icon: "toggle_on", textKey: "guide.addPosition.step4" },
      { icon: "save", textKey: "guide.addPosition.step5" }
    ]
  },
  "add-employee": {
    titleKey: "guide.addEmployee.title",
    steps: [
      { icon: "person", textKey: "guide.addEmployee.step1" },
      { icon: "badge", textKey: "guide.addEmployee.step2" },
      { icon: "domain", textKey: "guide.addEmployee.step3" },
      { icon: "store", textKey: "guide.addEmployee.step4" },
      { icon: "payments", textKey: "guide.addEmployee.step5" },
      { icon: "image", textKey: "guide.addEmployee.step6" },
      { icon: "save", textKey: "guide.addEmployee.step7" }
    ]
  },
  "add-tax": {
    titleKey: "guide.addTax.title",
    steps: [
      { icon: "receipt_long", textKey: "guide.addTax.step1" },
      { icon: "category", textKey: "guide.addTax.step2" },
      { icon: "percent", textKey: "guide.addTax.step3" },
      { icon: "description", textKey: "guide.addTax.step4" },
      { icon: "toggle_on", textKey: "guide.addTax.step5" },
      { icon: "link", textKey: "guide.addTax.step6" }
    ]
  },
  "add-shift": {
    titleKey: "guide.addShift.title",
    steps: [
      { icon: "schedule", textKey: "guide.addShift.step1" },
      { icon: "timer", textKey: "guide.addShift.step2" },
      { icon: "description", textKey: "guide.addShift.step3" },
      { icon: "toggle_on", textKey: "guide.addShift.step4" },
      { icon: "link", textKey: "guide.addShift.step5" }
    ]
  },
  "add-type-payment": {
    titleKey: "guide.addTypePayment.title",
    steps: [
      { icon: "credit_card", textKey: "guide.addTypePayment.step1" },
      { icon: "category", textKey: "guide.addTypePayment.step2" },
      { icon: "description", textKey: "guide.addTypePayment.step3" },
      { icon: "toggle_on", textKey: "guide.addTypePayment.step4" },
      { icon: "link", textKey: "guide.addTypePayment.step5" }
    ]
  },
  "add-purchase-order": {
    titleKey: "guide.addPurchaseOrder.title",
    steps: [
      { icon: "person", textKey: "guide.addPurchaseOrder.step1" },
      { icon: "badge", textKey: "guide.addPurchaseOrder.step2" },
      { icon: "calendar_today", textKey: "guide.addPurchaseOrder.step3" },
      { icon: "inventory_2", textKey: "guide.addPurchaseOrder.step4" },
      { icon: "calculate", textKey: "guide.addPurchaseOrder.step5" },
      { icon: "description", textKey: "guide.addPurchaseOrder.step6" },
      { icon: "save", textKey: "guide.addPurchaseOrder.step7" }
    ]
  },
  "edit-purchase-order": {
    titleKey: "guide.editPurchaseOrder.title",
    steps: [
      { icon: "person", textKey: "guide.editPurchaseOrder.step1" },
      { icon: "badge", textKey: "guide.editPurchaseOrder.step2" },
      { icon: "calendar_today", textKey: "guide.editPurchaseOrder.step3" },
      { icon: "inventory_2", textKey: "guide.editPurchaseOrder.step4" },
      { icon: "calculate", textKey: "guide.editPurchaseOrder.step5" },
      { icon: "description", textKey: "guide.editPurchaseOrder.step6" },
      { icon: "save", textKey: "guide.editPurchaseOrder.step7" }
    ]
  },
  "add-ingredient": {
    titleKey: "guide.addIngredient.title",
    steps: [
      { icon: "badge", textKey: "guide.addIngredient.step1" },
      { icon: "category", textKey: "guide.addIngredient.step2" },
      { icon: "swap_horiz", textKey: "guide.addIngredient.step3" },
      { icon: "inventory_2", textKey: "guide.addIngredient.step4" },
      { icon: "payments", textKey: "guide.addIngredient.step5" },
      { icon: "toggle_on", textKey: "guide.addIngredient.step6" },
      { icon: "save", textKey: "guide.addIngredient.step7" }
    ]
  },
  "adjust-stock": {
    titleKey: "guide.adjustStock.title",
    steps: [
      { icon: "inventory_2", textKey: "guide.adjustStock.step1" },
      { icon: "add_circle", textKey: "guide.adjustStock.step2" },
      { icon: "save", textKey: "guide.adjustStock.step3" }
    ]
  },
  "add-bom": {
    titleKey: "guide.addBom.title",
    introKey: "guide.addBom.intro",
    steps: [
      { icon: "store", textKey: "guide.addBom.step1" },
      { icon: "package", textKey: "guide.addBom.step2" },
      { icon: "inventory_2", textKey: "guide.addBom.step3" },
      { icon: "description", textKey: "guide.addBom.step4" },
      { icon: "save", textKey: "guide.addBom.step5" }
    ],
    tipKeys: ["guide.addBom.tip1", "guide.addBom.tip2"]
  },
  "add-bundle": {
    titleKey: "guide.addBundle.title",
    introKey: "guide.addBundle.intro",
    steps: [
      { icon: "store", textKey: "guide.addBundle.step1" },
      { icon: "label", textKey: "guide.addBundle.step2" },
      { icon: "calendar_today", textKey: "guide.addBundle.step3" },
      { icon: "package", textKey: "guide.addBundle.step4" },
      { icon: "image", textKey: "guide.addBundle.step5" },
      { icon: "payments", textKey: "guide.addBundle.step6" }
    ],
    tipKeys: ["guide.addBundle.tip1", "guide.addBundle.tip2"]
  },
  "add-business-trip": {
    titleKey: "guide.addBusinessTrip.title",
    introKey: "guide.addBusinessTrip.intro",
    steps: [
      { icon: "store", textKey: "guide.addBusinessTrip.step1" },
      { icon: "map", textKey: "guide.addBusinessTrip.step2" },
      { icon: "groups", textKey: "guide.addBusinessTrip.step3" },
      { icon: "payments", textKey: "guide.addBusinessTrip.step4" },
      { icon: "save", textKey: "guide.addBusinessTrip.step5" }
    ],
    tipKeys: ["guide.addBusinessTrip.tip1", "guide.addBusinessTrip.tip2"]
  },
  "add-driver": {
    titleKey: "guide.addDriver.title",
    introKey: "guide.addDriver.intro",
    steps: [
      { icon: "person", textKey: "guide.addDriver.step1" },
      { icon: "call", textKey: "guide.addDriver.step2" },
      { icon: "directions_car", textKey: "guide.addDriver.step3" },
      { icon: "toggle_on", textKey: "guide.addDriver.step4" },
      { icon: "save", textKey: "guide.addDriver.step5" }
    ],
    tipKeys: ["guide.addDriver.tip1", "guide.addDriver.tip2"]
  },
  "add-discount": {
    titleKey: "guide.addDiscount.title",
    introKey: "guide.addDiscount.intro",
    steps: [
      { icon: "store", textKey: "guide.addDiscount.step1" },
      { icon: "label", textKey: "guide.addDiscount.step2" },
      { icon: "percent", textKey: "guide.addDiscount.step3" },
      { icon: "calendar_today", textKey: "guide.addDiscount.step4" },
      { icon: "checklist", textKey: "guide.addDiscount.step5" }
    ],
    tipKeys: ["guide.addDiscount.tip1", "guide.addDiscount.tip2"]
  },
  "add-expense-category": {
    titleKey: "guide.addExpenseCategory.title",
    introKey: "guide.addExpenseCategory.intro",
    steps: [
      { icon: "category", textKey: "guide.addExpenseCategory.step1" },
      { icon: "description", textKey: "guide.addExpenseCategory.step2" },
      { icon: "calculate", textKey: "guide.addExpenseCategory.step3" },
      { icon: "toggle_on", textKey: "guide.addExpenseCategory.step4" },
      { icon: "save", textKey: "guide.addExpenseCategory.step5" }
    ],
    tipKeys: ["guide.addExpenseCategory.tip1", "guide.addExpenseCategory.tip2"]
  },
  "add-expense": {
    titleKey: "guide.addExpense.title",
    introKey: "guide.addExpense.intro",
    steps: [
      { icon: "store", textKey: "guide.addExpense.step1" },
      { icon: "receipt_long", textKey: "guide.addExpense.step2" },
      { icon: "payments", textKey: "guide.addExpense.step3" },
      { icon: "calendar_today", textKey: "guide.addExpense.step4" },
      { icon: "description", textKey: "guide.addExpense.step5" },
      { icon: "save", textKey: "guide.addExpense.step6" }
    ],
    tipKeys: ["guide.addExpense.tip1", "guide.addExpense.tip2"]
  },
  "add-goods-receipt": {
    titleKey: "guide.addGoodsReceipt.title",
    introKey: "guide.addGoodsReceipt.intro",
    steps: [
      { icon: "store", textKey: "guide.addGoodsReceipt.step1" },
      { icon: "receipt_long", textKey: "guide.addGoodsReceipt.step2" },
      { icon: "inventory_2", textKey: "guide.addGoodsReceipt.step3" },
      { icon: "scanner", textKey: "guide.addGoodsReceipt.step4" },
      { icon: "save", textKey: "guide.addGoodsReceipt.step5" }
    ],
    tipKeys: ["guide.addGoodsReceipt.tip1", "guide.addGoodsReceipt.tip2"]
  },
  "add-goods-request": {
    titleKey: "guide.addGoodsRequest.title",
    introKey: "guide.addGoodsRequest.intro",
    steps: [
      { icon: "store", textKey: "guide.addGoodsRequest.step1" },
      { icon: "groups", textKey: "guide.addGoodsRequest.step2" },
      { icon: "inventory_2", textKey: "guide.addGoodsRequest.step3" },
      { icon: "calendar_today", textKey: "guide.addGoodsRequest.step4" },
      { icon: "save", textKey: "guide.addGoodsRequest.step5" }
    ],
    tipKeys: ["guide.addGoodsRequest.tip1", "guide.addGoodsRequest.tip2"]
  },
  "add-production-order": {
    titleKey: "guide.addProductionOrder.title",
    introKey: "guide.addProductionOrder.intro",
    steps: [
      { icon: "package", textKey: "guide.addProductionOrder.step1" },
      { icon: "calculate", textKey: "guide.addProductionOrder.step2" },
      { icon: "calendar_today", textKey: "guide.addProductionOrder.step3" },
      { icon: "description", textKey: "guide.addProductionOrder.step4" },
      { icon: "save", textKey: "guide.addProductionOrder.step5" }
    ],
    tipKeys: ["guide.addProductionOrder.tip1", "guide.addProductionOrder.tip2"]
  },
  "add-promo": {
    titleKey: "guide.addPromo.title",
    introKey: "guide.addPromo.intro",
    steps: [
      { icon: "store", textKey: "guide.addPromo.step1" },
      { icon: "tag", textKey: "guide.addPromo.step2" },
      { icon: "percent", textKey: "guide.addPromo.step3" },
      { icon: "calendar_today", textKey: "guide.addPromo.step4" },
      { icon: "checklist", textKey: "guide.addPromo.step5" },
      { icon: "save", textKey: "guide.addPromo.step6" }
    ],
    tipKeys: ["guide.addPromo.tip1", "guide.addPromo.tip2"]
  },
  "add-reservation": {
    titleKey: "guide.addReservation.title",
    introKey: "guide.addReservation.intro",
    steps: [
      { icon: "store", textKey: "guide.addReservation.step1" },
      { icon: "calendar_today", textKey: "guide.addReservation.step2" },
      { icon: "schedule", textKey: "guide.addReservation.step3" },
      { icon: "groups", textKey: "guide.addReservation.step4" },
      { icon: "save", textKey: "guide.addReservation.step5" }
    ],
    tipKeys: ["guide.addReservation.tip1", "guide.addReservation.tip2"]
  },
  "create-sales-return": {
    titleKey: "guide.createSalesReturn.title",
    introKey: "guide.createSalesReturn.intro",
    steps: [
      { icon: "receipt_long", textKey: "guide.createSalesReturn.step1" },
      { icon: "assignment_return", textKey: "guide.createSalesReturn.step2" },
      { icon: "description", textKey: "guide.createSalesReturn.step3" },
      { icon: "payments", textKey: "guide.createSalesReturn.step4" },
      { icon: "save", textKey: "guide.createSalesReturn.step5" }
    ],
    tipKeys: ["guide.createSalesReturn.tip1", "guide.createSalesReturn.tip2"]
  },
  "add-shift-template": {
    titleKey: "guide.addShiftTemplate.title",
    introKey: "guide.addShiftTemplate.intro",
    steps: [
      { icon: "label", textKey: "guide.addShiftTemplate.step1" },
      { icon: "schedule", textKey: "guide.addShiftTemplate.step2" },
      { icon: "description", textKey: "guide.addShiftTemplate.step3" },
      { icon: "toggle_on", textKey: "guide.addShiftTemplate.step4" },
      { icon: "save", textKey: "guide.addShiftTemplate.step5" }
    ],
    tipKeys: ["guide.addShiftTemplate.tip1", "guide.addShiftTemplate.tip2"]
  },
  "add-stock-transfer": {
    titleKey: "guide.addStockTransfer.title",
    introKey: "guide.addStockTransfer.intro",
    steps: [
      { icon: "store", textKey: "guide.addStockTransfer.step1" },
      { icon: "swap_horiz", textKey: "guide.addStockTransfer.step2" },
      { icon: "inventory_2", textKey: "guide.addStockTransfer.step3" },
      { icon: "description", textKey: "guide.addStockTransfer.step4" },
      { icon: "save", textKey: "guide.addStockTransfer.step5" }
    ],
    tipKeys: ["guide.addStockTransfer.tip1", "guide.addStockTransfer.tip2"]
  },
  "add-user": {
    titleKey: "guide.addUser.title",
    introKey: "guide.addUser.intro",
    steps: [
      { icon: "person_add", textKey: "guide.addUser.step1" },
      { icon: "lock", textKey: "guide.addUser.step2" },
      { icon: "call", textKey: "guide.addUser.step3" },
      { icon: "domain", textKey: "guide.addUser.step4" },
      { icon: "save", textKey: "guide.addUser.step5" }
    ],
    tipKeys: ["guide.addUser.tip1", "guide.addUser.tip2"]
  },
  "add-role": {
    titleKey: "guide.addRole.title",
    introKey: "guide.addRole.intro",
    steps: [
      { icon: "shield", textKey: "guide.addRole.step1" },
      { icon: "description", textKey: "guide.addRole.step2" },
      { icon: "rule", textKey: "guide.addRole.step3" },
      { icon: "checklist", textKey: "guide.addRole.step4" },
      { icon: "save", textKey: "guide.addRole.step5" }
    ],
    tipKeys: ["guide.addRole.tip1", "guide.addRole.tip2"]
  },
  "edit-role": {
    titleKey: "guide.editRole.title",
    introKey: "guide.editRole.intro",
    steps: [
      { icon: "shield", textKey: "guide.editRole.step1" },
      { icon: "rule", textKey: "guide.editRole.step2" },
      { icon: "checklist", textKey: "guide.editRole.step3" },
      { icon: "save", textKey: "guide.editRole.step4" }
    ],
    tipKeys: ["guide.editRole.tip1", "guide.editRole.tip2"]
  },
  "edit-category": {
    titleKey: "guide.editCategory.title",
    introKey: "guide.editCategory.intro",
    steps: [
      { icon: "store", textKey: "guide.editCategory.step1" },
      { icon: "label", textKey: "guide.editCategory.step2" },
      { icon: "category", textKey: "guide.editCategory.step3" },
      { icon: "palette", textKey: "guide.editCategory.step4" },
      { icon: "image", textKey: "guide.editCategory.step5" },
      { icon: "save", textKey: "guide.editCategory.step6" }
    ],
    tipKeys: ["guide.editCategory.tip1", "guide.editCategory.tip2"]
  },
  "edit-ingredient-category": {
    titleKey: "guide.editIngredientCategory.title",
    introKey: "guide.editIngredientCategory.intro",
    steps: [
      { icon: "category", textKey: "guide.editIngredientCategory.step1" },
      { icon: "toggle_on", textKey: "guide.editIngredientCategory.step2" },
      { icon: "save", textKey: "guide.editIngredientCategory.step3" }
    ],
    tipKeys: ["guide.editIngredientCategory.tip1", "guide.editIngredientCategory.tip2"]
  }
};

const UserGuide = ({ guideKey, mode = "add" }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const guide = safeGet(guides, guideKey);

  if (!guide) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <BookOpen size={16} />
        {t("guide.button")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">{t(guide.titleKey)}</h2>
          </div>
          {guide.introKey && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {t(guide.introKey)}
            </p>
          )}
          {mode === "edit" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
              {t("guide.editNotice")}
            </div>
          )}
          <div className="space-y-4">
            {guide.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <DynamicIcon name={step.icon} size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {t("guide.step", { number: i + 1 })}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{t(step.textKey)}</p>
                </div>
              </div>
            ))}
          </div>
          {guide.tipKeys?.length > 0 && (
            <div className="mt-6 rounded-xl bg-muted/50 p-4">
              <p className="text-sm font-semibold text-foreground mb-2">{t("guide.tips")}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {guide.tipKeys.map((tipKey) => (
                  <li key={tipKey}>{t(tipKey)}</li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

UserGuide.propTypes = {
  guideKey: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(["add", "edit"])
};

export default UserGuide;

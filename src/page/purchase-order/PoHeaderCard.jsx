import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Combobox } from "@/components/ui/combobox";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { storeIdsEqual } from "@/utils/storeId";

const PIC_LIST_CLOSE_DELAY = 200;
const MAX_DP_PERCENT = 100;
const PERCENT = 100;

const PoHeaderCard = ({
  idPrefix,
  header,
  locations,
  storeOptions,
  onStoreChange,
  isStoreDisabled,
  employees,
  employeesLoading,
  finalAmount,
  children
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const filteredEmployees = employees.filter((e) =>
    (e.fullName || e.userName)?.toLowerCase().includes(header.picSearch.toLowerCase())
  );

  return (
    <Card className="overflow-hidden border-0 shadow-md rounded-xl">
      <div className="bg-gradient-to-r from-blue-600/90 to-blue-700/90 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <ShoppingCart size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {t("page.purchaseOrder.add.supplierSection")}
            </h3>
            <p className="text-xs text-blue-100">
              {t("page.purchaseOrder.add.supplierSectionDesc")}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${idPrefix}-purchase-order-store`}
              className="text-sm font-medium text-foreground mb-1.5 block">
              {t("page.purchaseOrder.add.store")} <span className="text-destructive">*</span>
            </label>
            <Combobox
              id={`${idPrefix}-purchase-order-store`}
              options={storeOptions}
              value={header.selectedStore}
              onChange={onStoreChange}
              disabled={isStoreDisabled}
              placeholder={t("page.purchaseOrder.add.selectStore")}
              searchPlaceholder={t("page.purchaseOrder.add.selectStore")}
            />
            {header.errors.store && (
              <p className="text-xs text-destructive mt-1">{header.errors.store}</p>
            )}
          </div>
          <div className="relative">
            <label htmlFor="po-pic" className="text-sm font-medium text-foreground mb-1.5 block">
              {t("page.purchaseOrder.add.pic")} <span className="text-destructive">*</span>
            </label>
            {!header.selectedStore ? (
              <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {t("page.purchaseOrder.add.selectStoreFirst") || "Pilih toko terlebih dahulu"}
                  </p>
                </div>
              </div>
            ) : employeesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {t("page.purchaseOrder.add.noEmployee")}{" "}
                    {header.selectedStore && locations.length > 0 && (
                      <span className="text-muted-foreground">
                        {t("page.purchaseOrder.add.inStore", {
                          storeName:
                            locations.find((l) => storeIdsEqual(l.id, header.selectedStore))
                              ?.name || ""
                        })}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("page.purchaseOrder.add.addEmployeeFirst")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => navigate("/add-employee")}
                  className="gap-2">
                  <Plus size={18} />
                  {t("page.purchaseOrder.add.addEmployee")}
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="po-pic"
                  placeholder={t("page.purchaseOrder.add.picPlaceholder")}
                  value={header.picSearch}
                  onChange={(e) => header.searchPic(e.target.value)}
                  onFocus={() => header.setIsPicListOpen(true)}
                  onBlur={() =>
                    setTimeout(() => header.setIsPicListOpen(false), PIC_LIST_CLOSE_DELAY)
                  }
                  className={`h-10 ${header.errors.pic ? "border-destructive" : ""}`}
                />
                {header.errors.pic && (
                  <p className="text-xs text-destructive mt-1">{header.errors.pic}</p>
                )}
                {header.isPicListOpen && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((e) => (
                        <button
                          key={e.id || e._id}
                          type="button"
                          onMouseDown={() => header.selectPic(e)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors">
                          {e.fullName || e.userName}
                        </button>
                      ))
                    ) : header.picSearch ? (
                      <p className="p-3 text-xs text-muted-foreground text-center">
                        {t("page.purchaseOrder.add.noEmployeeFound")}
                      </p>
                    ) : (
                      <p className="p-3 text-xs text-muted-foreground text-center">
                        {t("page.purchaseOrder.add.typeToSearchPic")}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-purchase-order-po-date`}
              className="text-sm font-medium text-foreground mb-1.5 block">
              {t("page.purchaseOrder.add.poDate")} <span className="text-destructive">*</span>
            </label>
            <DatePicker
              id={`${idPrefix}-purchase-order-po-date`}
              date={header.orderDate}
              setDate={(d) => {
                header.setOrderDate(d);
                header.clearError("orderDate");
              }}
            />
            {header.errors.orderDate && (
              <p className="text-xs text-destructive mt-1">{header.errors.orderDate}</p>
            )}
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-purchase-order-time`}
              className="text-sm font-medium text-foreground mb-1.5 block">
              {t("page.purchaseOrder.add.time")} <span className="text-destructive">*</span>
            </label>
            <TimePicker
              id={`${idPrefix}-purchase-order-time`}
              value={header.orderTime}
              onChange={(v) => {
                header.setOrderTime(v);
                header.clearError("orderTime");
              }}
            />
            {header.errors.orderTime && (
              <p className="text-xs text-destructive mt-1">{header.errors.orderTime}</p>
            )}
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-purchase-order-payment-method`}
              className="text-sm font-medium text-foreground mb-1.5 block">
              {t("page.purchaseOrder.add.paymentMethod")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Combobox
              id={`${idPrefix}-purchase-order-payment-method`}
              options={[
                { value: "cash", label: t("page.purchaseOrder.add.paymentMethodCash") },
                {
                  value: "credit",
                  label: t("page.purchaseOrder.add.paymentMethodCredit")
                }
              ]}
              value={header.paymentMethod}
              onChange={header.selectPaymentMethod}
              placeholder={t("page.purchaseOrder.add.paymentMethodCash")}
              searchPlaceholder={t("page.purchaseOrder.add.paymentMethodCash")}
            />
          </div>
          {header.paymentMethod === "credit" && (
            <div>
              <label
                htmlFor={`${idPrefix}-purchase-order-dp-percent`}
                className="text-sm font-medium text-foreground mb-1.5 block">
                {t("page.purchaseOrder.add.dpPercent")}
              </label>
              <Input
                id={`${idPrefix}-purchase-order-dp-percent`}
                type="number"
                min="0"
                max="100"
                placeholder={t("page.purchaseOrder.add.dpPercentPlaceholder")}
                value={header.dpPercent || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0 && val <= MAX_DP_PERCENT) header.setDpPercent(val);
                }}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("page.purchaseOrder.add.dpPercentHint")}
              </p>
              {header.dpPercent > 0 && (
                <p className="text-xs text-primary font-medium mt-1">
                  {t("page.purchaseOrder.add.dpAmount")}: Rp{" "}
                  {((finalAmount * header.dpPercent) / PERCENT).toLocaleString("id-ID")}
                </p>
              )}
            </div>
          )}
          {header.paymentMethod === "credit" && (
            <div>
              <label
                htmlFor={`${idPrefix}-purchase-order-due-date`}
                className="text-sm font-medium text-foreground mb-1.5 block">
                {t("page.purchaseOrder.add.dueDate")} <span className="text-destructive">*</span>
              </label>
              <DatePicker
                id={`${idPrefix}-purchase-order-due-date`}
                date={header.dueDate}
                setDate={(d) => {
                  header.setDueDate(d);
                  header.clearError("dueDate");
                }}
              />
              {header.errors.dueDate && (
                <p className="text-xs text-destructive mt-1">{header.errors.dueDate}</p>
              )}
            </div>
          )}
          {header.paymentMethod === "credit" && (
            <div>
              <label
                htmlFor={`${idPrefix}-purchase-order-tenor`}
                className="text-sm font-medium text-foreground mb-1.5 block">
                {t("page.purchaseOrder.add.tenor")} <span className="text-destructive">*</span>
              </label>
              <Input
                id={`${idPrefix}-purchase-order-tenor`}
                type="number"
                min="1"
                placeholder={t("page.purchaseOrder.add.tenorPlaceholder")}
                value={header.tenor || ""}
                onChange={(e) => header.setTenor(Number(e.target.value) || 0)}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("page.purchaseOrder.add.tenorHint")}
              </p>
            </div>
          )}
          {children}
          <div className="md:col-span-2">
            <label
              htmlFor={`${idPrefix}-purchase-order-notes`}
              className="text-sm font-medium text-foreground mb-1.5 block">
              {t("page.purchaseOrder.add.notes")}
            </label>
            <Textarea
              id={`${idPrefix}-purchase-order-notes`}
              placeholder={t("page.purchaseOrder.add.notesPlaceholder")}
              value={header.notes}
              onChange={(e) => header.setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PoHeaderCard;

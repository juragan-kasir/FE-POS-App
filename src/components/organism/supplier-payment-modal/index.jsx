import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import Modal from "@/components/organism/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { recordPayment } from "@/services/purchase-payment";
import { newPurchasePaymentKey } from "@/utils/paymentIdempotency";
import { getPayablePurchaseOrders } from "@/utils/supplierPayment";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const rupiah = (value) => Number(value || 0).toLocaleString("id-ID");

export default function SupplierPaymentModal({
  open,
  onOpenChange,
  supplierId,
  purchaseOrders,
  onSuccess
}) {
  const { t } = useTranslation();

  const payablePOs = useMemo(() => getPayablePurchaseOrders(purchaseOrders), [purchaseOrders]);
  const poOptions = useMemo(
    () =>
      payablePOs.map((po) => ({
        value: String(po.id),
        label: `${po.orderNumber || po.id} — Sisa ${rupiah(po.outstanding)}`
      })),
    [payablePOs]
  );

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date());
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payPo, setPayPo] = useState("");
  const [idKey, setIdKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPayPo(payablePOs.length ? String(payablePOs[0].id) : "");
      setIdKey(newPurchasePaymentKey());
      setPayAmount("");
      setPayDate(new Date());
      setPayMethod("cash");
      setPayRef("");
      setPayNotes("");
      setSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    // Returning `false` (including from inside this async function — Modal
    // now awaits it) tells the shared Modal to keep itself open instead of
    // closing on click: validation failures and request errors both need
    // the user to see the field/toast and try again in place, not have the
    // modal vanish out from under them.
    if (!payPo) {
      toast.error(t("page.supplier.detail.modal.validationPo"), {
        description: t("page.supplier.detail.modal.validationPoDesc")
      });
      return false;
    }
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error(t("page.supplier.detail.modal.validation"), {
        description: t("page.supplier.detail.modal.validationDesc")
      });
      return false;
    }

    setSubmitting(true);
    try {
      await recordPayment({
        purchaseOrder: Number(payPo),
        supplier: Number(supplierId),
        amount: parseFloat(payAmount),
        paymentDate: format(payDate, "yyyy-MM-dd"),
        paymentMethod: payMethod,
        reference: payRef,
        notes: payNotes,
        idempotencyKey: idKey
      });
      toast.success(t("page.supplier.detail.toast.success"), {
        description: t("page.supplier.detail.toast.paymentSuccessDesc")
      });
      onSuccess?.();
      // No `return false` here — Modal closes itself on the (non-false)
      // resolution, so this component no longer needs to call
      // onOpenChange(false) itself.
    } catch (err) {
      toast.error(t("page.supplier.detail.toast.error"), {
        description: err?.response?.data?.message || err.message
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      type="form"
      open={open}
      onOpenChange={onOpenChange}
      title={t("page.supplier.detail.modal.title")}
      confirmText={t("page.supplier.detail.modal.confirm")}
      onConfirm={handleConfirm}
      loading={submitting}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="supplier-payment-po">{t("page.supplier.detail.modal.poLabel")}</Label>
          <Combobox
            id="supplier-payment-po"
            options={poOptions}
            value={payPo}
            onChange={(v) => setPayPo(v)}
            placeholder={t("page.supplier.detail.modal.poPlaceholder")}
            searchPlaceholder={`${t("page.supplier.detail.modal.poPlaceholder")}...`}
            emptyMessage={t("page.supplier.detail.modal.poEmpty")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-payment-amount">
            {t("page.supplier.detail.modal.amountLabel")}
          </Label>
          <Input
            id="supplier-payment-amount"
            type="text"
            inputMode="numeric"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={t("page.supplier.detail.modal.amountPlaceholder")}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-payment-date">
              {t("page.supplier.detail.modal.paymentDateLabel")}
            </Label>
            <DatePicker id="supplier-payment-date" date={payDate} setDate={setPayDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-payment-method">
              {t("page.supplier.detail.modal.methodLabel")}
            </Label>
            <Combobox
              id="supplier-payment-method"
              options={[
                { value: "cash", label: t("page.supplier.detail.modal.methodCash") },
                { value: "transfer", label: t("page.supplier.detail.modal.methodTransfer") },
                { value: "cheque", label: t("page.supplier.detail.modal.methodCheque") },
                { value: "credit", label: t("page.supplier.detail.modal.methodCredit") }
              ]}
              value={payMethod}
              onChange={(v) => setPayMethod(v)}
              placeholder={t("component.supplierPaymentModal.ui.selectMethod")}
              searchPlaceholder="Cari metode..."
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-payment-reference">
            {t("page.supplier.detail.modal.referenceLabel")}
          </Label>
          <Input
            id="supplier-payment-reference"
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder={t("page.supplier.detail.modal.referencePlaceholder")}
            maxLength={FIELD_LIMITS.REFERENCE}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-payment-notes">
            {t("page.supplier.detail.modal.notesLabel")}
          </Label>
          <Input
            id="supplier-payment-notes"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder={t("page.supplier.detail.modal.notesPlaceholder")}
            maxLength={FIELD_LIMITS.SHORT_NOTE}
          />
        </div>
      </div>
    </Modal>
  );
}

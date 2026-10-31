import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const ReceiptDeliveryFields = ({ idPrefix, delivery }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-goods-receipt-surat-jalan`}>
          {t("page.goodsReceipt.add.form.suratJalan")}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({t("common.optional")})
          </span>
        </Label>
        <Input
          id={`${idPrefix}-goods-receipt-surat-jalan`}
          type="text"
          value={delivery.suratJalan}
          onChange={(e) => delivery.setSuratJalan(e.target.value)}
          placeholder={t("page.goodsReceipt.add.placeholder.suratJalan")}
          maxLength={FIELD_LIMITS.DOCUMENT_NUMBER}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-goods-receipt-tax-invoice-no`}>
          {t("page.goodsReceipt.add.form.taxInvoiceNo")}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({t("common.optional")})
          </span>
        </Label>
        <Input
          id={`${idPrefix}-goods-receipt-tax-invoice-no`}
          type="text"
          value={delivery.taxInvoiceNo}
          onChange={(e) => delivery.setTaxInvoiceNo(e.target.value)}
          placeholder={t("page.goodsReceipt.add.placeholder.taxInvoiceNo")}
          maxLength={FIELD_LIMITS.DOCUMENT_NUMBER}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-goods-receipt-shipping-cost`}>
          {t("page.goodsReceipt.add.form.shippingCost")}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({t("common.optional")})
          </span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            Rp
          </span>
          <Input
            id={`${idPrefix}-goods-receipt-shipping-cost`}
            type="text"
            inputMode="numeric"
            value={
              delivery.shippingCost ? Number(delivery.shippingCost).toLocaleString("id-ID") : ""
            }
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              delivery.setShippingCost(raw);
            }}
            className="pl-10"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("page.goodsReceipt.add.form.shippingHint")}
        </p>
      </div>
    </div>
  );
};

export default ReceiptDeliveryFields;

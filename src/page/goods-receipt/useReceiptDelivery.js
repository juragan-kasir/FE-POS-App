import { useState } from "react";

export const useReceiptDelivery = () => {
  const [suratJalan, setSuratJalan] = useState("");
  const [taxInvoiceNo, setTaxInvoiceNo] = useState("");
  const [shippingCost, setShippingCost] = useState("");

  const hydrateDelivery = (receipt) => {
    setSuratJalan(receipt.suratJalan || "");
    setTaxInvoiceNo(receipt.taxInvoiceNo || "");
    setShippingCost(receipt.shippingCost ? String(Number(receipt.shippingCost)) : "");
  };

  return {
    suratJalan,
    setSuratJalan,
    taxInvoiceNo,
    setTaxInvoiceNo,
    shippingCost,
    setShippingCost,
    hasInput: Boolean(suratJalan.trim() || taxInvoiceNo.trim() || parseFloat(shippingCost) > 0),
    payload: {
      suratJalan: suratJalan.trim() || null,
      taxInvoiceNo: taxInvoiceNo.trim() || null,
      shippingCost: parseFloat(shippingCost) || 0
    },
    hydrateDelivery
  };
};

import React from "react";
import { useTranslation } from "react-i18next";
import Modal from "@/components/organism/modal";

const DIALOGS = [
  {
    key: "supplierChange",
    titleKey: "page.purchaseOrder.add.changeSupplierTitle",
    descriptionKey: "page.purchaseOrder.add.changeSupplierDesc",
    dismiss: "dismissSupplierChange",
    confirm: "confirmSupplierChange"
  },
  {
    key: "supplierRemove",
    titleKey: "page.purchaseOrder.add.removeSupplierTitle",
    descriptionKey: "page.purchaseOrder.add.removeSupplierDesc",
    dismiss: "dismissSupplierRemove",
    confirm: "confirmSupplierRemove"
  },
  {
    key: "itemRemove",
    titleKey: "page.purchaseOrder.add.deleteItemTitle",
    descriptionKey: "page.purchaseOrder.add.deleteItemDesc",
    dismiss: "dismissItemRemove",
    confirm: "confirmItemRemove"
  },
  {
    key: "groupRemove",
    titleKey: "page.purchaseOrder.add.deleteSupplierGroupTitle",
    descriptionKey: "page.purchaseOrder.add.deleteSupplierGroupDesc",
    dismiss: "dismissGroupRemove",
    confirm: "confirmGroupRemove"
  }
];

const PoItemConfirmDialogs = ({ confirmations }) => {
  const { t } = useTranslation();

  return DIALOGS.map((dialog) => (
    <Modal
      key={dialog.key}
      type="confirm"
      open={!!confirmations[dialog.key]}
      onOpenChange={(open) => {
        if (!open) confirmations[dialog.dismiss]();
      }}
      title={t(dialog.titleKey)}
      description={t(dialog.descriptionKey)}
      confirmText={t("common.yes")}
      cancelText={t("common.no")}
      onConfirm={confirmations[dialog.confirm]}
    />
  ));
};

export default PoItemConfirmDialogs;

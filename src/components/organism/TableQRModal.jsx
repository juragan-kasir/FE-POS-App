import React, { useRef } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import Modal from "@/components/organism/modal";
import { buildTableOrderUrl } from "@/utils/tableOrderUrl";

const TableQRModal = ({ open, onOpenChange, table }) => {
  const { t } = useTranslation();
  const qrRef = useRef(null);

  const storeId =
    table &&
    (typeof table.store === "object" && table.store !== null
      ? String(table.store.id || table.store._id || "")
      : String(table.store || ""));

  const orderAppBaseUrl = import.meta.env.VITE_ORDER_APP_URL || "https://order-app-dun.vercel.app";

  if (!table) return null;

  const orderUrl = buildTableOrderUrl(orderAppBaseUrl, table.id, storeId);

  const handlePrint = () => {
    // ponytail: halaman cetak dibangun via DOM API murni — tidak ada
    // string HTML yang lewat sink apa pun (createObjectURL/write/innerHTML)
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const doc = printWindow.document;
    doc.title = t("tableQR.title", { name: table.name });
    const style = doc.createElement("style");
    style.textContent = [
      "body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif}",
      ".print-area{text-align:center}",
      "svg{width:300px;height:300px}",
      "p{margin-top:16px;font-size:14px;color:#666}"
    ].join("\n");
    doc.head.append(style);
    const area = doc.createElement("div");
    area.className = "print-area";
    const svgNode = qrRef.current?.querySelector("svg");
    if (svgNode) area.append(doc.importNode(svgNode, true));
    const p = doc.createElement("p");
    p.textContent = t("tableQR.scanToOrder", { name: table.name });
    area.append(p);
    doc.body.append(area);
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <Modal
      type="custom"
      open={open}
      onOpenChange={onOpenChange}
      title={t("tableQR.title", { name: table.name })}>
      <div className="flex flex-col items-center gap-4 p-4">
        <div ref={qrRef} className="bg-white p-4 rounded-xl">
          <QRCodeSVG value={orderUrl} size={200} />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {t("tableQR.scanToOrder", { name: table.name })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(orderUrl)}>
            {t("component.tableQRModal.ui.copyLink")}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={18} className="mr-1" />
            {t("common.print")}
          </Button>
          <Button size="sm" onClick={() => window.open(orderUrl, "_blank")}>
            {t("component.tableQRModal.ui.openPage")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

TableQRModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  table: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    store: PropTypes.string
  })
};

export default TableQRModal;

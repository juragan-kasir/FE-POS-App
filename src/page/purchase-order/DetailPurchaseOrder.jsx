import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { safeGet } from "@/lib/safe-lookup";
import { getPurchaseOrderById } from "../../services/purchase-order";
import { getPaymentsByPO, deletePayment, recordPayment } from "../../services/purchase-payment";
import { getReturnsByPO } from "../../services/purchase-return";
import { getGoodsReceiptByPO } from "../../services/goods-receipt";
import { returnPurchaseOrder, resolveReturnedBy } from "../../services/purchase-order";
import { useCookies } from "react-cookie";
import { useQueryClient } from "react-query";
import { invalidatePurchasePaymentCaches } from "@/utils/purchasePaymentCache";
import { newPurchasePaymentKey } from "@/utils/paymentIdempotency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import PageHeader from "../../components/ui/PageHeader";
import { FormalDocument, PrintButton } from "../../components/document/FormalDocument";
import { getDocumentSpecForPurchaseOrder } from "../../components/document/documentMappers";
import {
  FileText,
  ShoppingBag,
  Plus,
  Undo2,
  Clock,
  CreditCard,
  Receipt,
  Building2,
  User,
  Store,
  CalendarDays,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  Banknote,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  CloudUpload,
  Eye,
  PackageCheck
} from "lucide-react";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

export default function DetailPurchaseOrder() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [payments, setPayments] = useState([]);
  const [returns, setReturns] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payRef, setPayRef] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const payIdKeyRef = useRef("");

  const formatIDR = (num) => {
    if (!num && num !== 0) return "";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };
  const parseIDR = (str) => {
    if (!str) return "";
    return str.replace(/[^0-9]/g, "") || "";
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnedByName, setReturnedByName] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnDocs, setReturnDocs] = useState([]);
  const docInputRef = useRef(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const queryClient = useQueryClient();
  // Phase 32 Batch A (PR-10): authenticated identity for the return
  // payload; the typed name remains as fallback.
  const [cookie] = useCookies();
  const authUser = cookie?.user;

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remaining = (po?.finalAmount || 0) - totalPaid;

  // ponytail: Map menghindari object injection (Codacy); konsumen di
  // bawah memakai [...itemGroups] yang menghasilkan pasangan [nama, item]
  const itemGroups = new Map();
  for (const it of po?.items || []) {
    const name = it.supplierData?.name || "-";
    if (!itemGroups.has(name)) itemGroups.set(name, []);
    itemGroups.get(name).push(it);
  }

  const statusMap = {
    draft: {
      label: t("page.purchaseOrder.status.draft"),
      class: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    },
    pending: {
      label: t("page.purchaseOrder.status.pending"),
      class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
    },
    ordered: {
      label: t("page.purchaseOrder.status.ordered"),
      class: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    },
    received: {
      label: t("page.purchaseOrder.status.received"),
      class: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    },
    cancelled: {
      label: t("page.purchaseOrder.status.cancelled"),
      class: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const poRes = await getPurchaseOrderById(id);
      setPo(poRes.data);
      const [paymentRes, returnRes, receiptRes] = await Promise.allSettled([
        getPaymentsByPO(id),
        getReturnsByPO(id),
        getGoodsReceiptByPO(id)
      ]);
      setPayments(paymentRes.status === "fulfilled" ? paymentRes.value?.data || [] : []);
      setReturns(returnRes.status === "fulfilled" ? returnRes.value?.data || [] : []);
      setReceipts(receiptRes.status === "fulfilled" ? receiptRes.value?.data || [] : []);
    } catch (err) {
      toast.error(err.response?.data?.message || t("page.purchaseOrder.detail.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      return toast.error(t("page.purchaseOrder.detail.paymentAmountRequired"));
    }
    const primarySupplier = po?.items?.[0]?.supplierData?.id ?? po?.items?.[0]?.supplier ?? null;
    try {
      setPaySubmitting(true);
      if (!payIdKeyRef.current) {
        payIdKeyRef.current = newPurchasePaymentKey();
      }
      await recordPayment({
        purchaseOrder: po.id,
        supplier: primarySupplier,
        amount: Number(payAmount),
        paymentDate: payDate || new Date().toISOString(),
        paymentMethod: payMethod,
        reference: payRef || null,
        idempotencyKey: payIdKeyRef.current
      });
      toast.success(t("page.purchaseOrder.detail.toast.paymentRecorded"));
      setPaymentModalOpen(false);
      setPayAmount("");
      setPayRef("");
      payIdKeyRef.current = "";
      loadData();
      invalidatePurchasePaymentCaches(queryClient);
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("page.purchaseOrder.detail.toast.paymentRecordFailed")
      );
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleDeletePayment = async () => {
    try {
      await deletePayment(paymentToDelete.id);
      toast.success(t("page.purchaseOrder.detail.paymentDeleted"));
      setDeleteModalOpen(false);
      setPaymentToDelete(null);
      loadData();
      invalidatePurchasePaymentCaches(queryClient);
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("page.purchaseOrder.detail.paymentDeleteFailed")
      );
    }
  };

  const openReturnModal = () => {
    setReturnItems(
      po.items.map((item) => ({
        id: item.ingredient || item.product,
        ingredient: item.ingredient,
        product: item.product,
        ingredientName: item.ingredientName,
        name: item.ingredientData?.name || item.productData?.nameProduct || item.ingredientName,
        maxQty: Math.max(0, (Number(item.receivedQuantity) || 0) - (Number(item.returnedQty) || 0)),
        qty: 0,
        unit: item.unit
      }))
    );
    setReturnReason("");
    setReturnedByName("");
    setReturnDocs([]);
    setReturnModalOpen(true);
  };

  const handleReturnDocChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    const tooLarge = incoming.find((f) => f.size > 5 * 1024 * 1024);
    if (tooLarge) {
      toast.error(t("page.goodsReceipt.add.form.fileTooLarge"));
      e.target.value = "";
      return;
    }
    const room = 5 - returnDocs.length;
    if (room <= 0) {
      toast.error(t("page.goodsReceipt.add.form.docMaxReached"));
      e.target.value = "";
      return;
    }
    const accepted = incoming.slice(0, room);
    setReturnDocs((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    ]);
    e.target.value = "";
  };

  const removeReturnDoc = (idx) => {
    setReturnDocs((prev) => {
      const target = prev.at(idx);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleCreateReturn = async () => {
    const selected = returnItems.filter((i) => i.qty > 0);
    if (selected.length === 0) {
      return toast.error(t("page.purchaseOrder.detail.minReturnItem"));
    }
    try {
      setReturnSubmitting(true);
      await returnPurchaseOrder(
        po.id,
        {
          items: selected.map((i) => ({
            productId: i.product,
            ingredient: i.ingredient,
            ingredientName: i.ingredientName || null,
            qty: Number(i.qty),
            unit: i.unit
          })),
          reason: returnReason || null,
          returnedBy: resolveReturnedBy(authUser, returnedByName)
        },
        returnDocs.map((d) => d.file)
      );
      toast.success(t("page.purchaseOrder.detail.toast.returnSuccess"));
      setReturnModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || t("page.purchaseOrder.detail.returnFailed"));
    } finally {
      setReturnSubmitting(false);
    }
  };

  // ponytail: xlsx/jspdf dimuat on-click — jangan ikut chunk halaman (~400KB)
  const handleExportExcel = async () => {
    if (!po) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const poInfo = [
        [t("page.purchaseOrder.detail.orderNumber"), po.orderNumber || "-"],
        [
          t("page.purchaseOrder.detail.poDate"),
          po.orderDate ? format(new Date(po.orderDate), "dd MMM yyyy") : "-"
        ],
        [
          t("page.purchaseOrder.detail.dueDate"),
          po.dueDate ? format(new Date(po.dueDate), "dd MMM yyyy") : "-"
        ],
        [
          t("page.purchaseOrder.detail.supplier"),
          po.supplierData?.name || po.supplierNames?.join(", ") || "-"
        ],
        [t("page.purchaseOrder.detail.store"), po.storeData?.name || "-"],
        [t("page.purchaseOrder.detail.pic"), po.picData?.fullName || "-"],
        [t("page.purchaseOrder.detail.status"), statusMap[po.status]?.label || po.status],
        [
          t("page.purchaseOrder.detail.paymentMethod"),
          po.paymentMethod === "credit"
            ? t("page.purchaseOrder.add.paymentMethodCredit")
            : t("page.purchaseOrder.add.paymentMethodCash")
        ],
        ...(po.tenor ? [[t("page.purchaseOrder.add.tenor"), `${po.tenor} days`]] : []),
        ...(po.notes ? [[t("page.purchaseOrder.detail.notes"), po.notes]] : [])
      ];
      const wsInfo = XLSX.utils.aoa_to_sheet(poInfo);
      wsInfo["!cols"] = [{ wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsInfo, "PO Info");

      const itemHeader = [
        t("page.purchaseOrder.detail.product"),
        t("page.purchaseOrder.detail.qty"),
        t("page.purchaseOrder.detail.price"),
        t("page.purchaseOrder.detail.total"),
        t("page.purchaseOrder.detail.receivedCol"),
        t("page.purchaseOrder.detail.returnedCol")
      ];
      const itemRows = (po.items || []).map((it) => [
        it.ingredientData?.name || it.productData?.nameProduct || it.ingredientName || "-",
        `${it.quantity || 0} ${it.unit || ""}`,
        Number(it.price || 0),
        Number(it.total || 0),
        it.receivedQuantity || 0,
        it.returnedQty || 0
      ]);
      const wsItems = XLSX.utils.aoa_to_sheet([itemHeader, ...itemRows]);
      wsItems["!cols"] = [
        { wch: 30 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, wsItems, "Items");

      const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const summaryRows = [
        [t("page.purchaseOrder.detail.total"), Number(po.totalAmount || 0)],
        [t("page.purchaseOrder.detail.discount"), Number(po.discount || 0)],
        [t("page.purchaseOrder.detail.additionalCost"), Number(po.additionalCost || 0)],
        [t("page.purchaseOrder.detail.grandTotal"), Number(po.finalAmount || 0)],
        [t("page.purchaseOrder.detail.paid"), totalPaid],
        [t("page.purchaseOrder.detail.remaining"), Number(po.finalAmount || 0) - totalPaid]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      if (payments.length > 0) {
        const payHeader = [
          t("page.purchaseOrder.detail.date"),
          t("page.purchaseOrder.detail.paymentMethod"),
          t("page.purchaseOrder.detail.reference"),
          t("page.purchaseOrder.detail.amount")
        ];
        const payRows = payments.map((p) => [
          p.paymentDate ? format(new Date(p.paymentDate), "dd MMM yyyy, HH:mm") : "-",
          p.paymentMethod || "-",
          p.reference || "-",
          Number(p.amount || 0)
        ]);
        const wsPay = XLSX.utils.aoa_to_sheet([payHeader, ...payRows]);
        wsPay["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsPay, "Payments");
      }

      XLSX.writeFile(wb, `PO-${po.orderNumber || po.id}-${format(new Date(), "yyyyMMdd")}.xlsx`);
      toast.success(t("page.purchaseOrder.detail.exportExcelSuccess"));
    } catch {
      toast.error(t("page.purchaseOrder.detail.exportFailed"));
    }
  };

  const handleExportPdf = async () => {
    if (!po) return;
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable")
      ]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Purchase Order", 14, y);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(po.orderNumber || "-", pageWidth - 14, y, { align: "right" });
      y += 4;
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `${t("page.purchaseOrder.detail.status")}: ${statusMap[po.status]?.label || po.status}`,
        14,
        y
      );
      y += 10;

      const statusColor =
        po.status === "received"
          ? [34, 197, 94]
          : po.status === "cancelled"
            ? [239, 68, 68]
            : po.status === "ordered"
              ? [59, 130, 246]
              : [156, 163, 175];
      doc.setFillColor(...statusColor);
      doc.roundedRect(pageWidth - 14 - 30, y - 12, 30, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(statusMap[po.status]?.label || po.status, pageWidth - 14 - 15, y - 7, {
        align: "center"
      });
      doc.setTextColor(0, 0, 0);
      y += 2;

      doc.setDrawColor(220, 220, 220);
      doc.line(14, y, pageWidth - 14, y);
      y += 6;

      const infoData = [
        [
          t("page.purchaseOrder.detail.supplier"),
          po.supplierData?.name || po.supplierNames?.join(", ") || "-"
        ],
        [t("page.purchaseOrder.detail.store"), po.storeData?.name || "-"],
        [t("page.purchaseOrder.detail.pic"), po.picData?.fullName || "-"],
        [
          t("page.purchaseOrder.detail.poDate"),
          po.orderDate ? format(new Date(po.orderDate), "dd MMM yyyy") : "-"
        ],
        [
          t("page.purchaseOrder.detail.dueDate"),
          po.dueDate ? format(new Date(po.dueDate), "dd MMM yyyy") : "-"
        ],
        [
          t("page.purchaseOrder.detail.paymentMethod"),
          po.paymentMethod === "credit"
            ? t("page.purchaseOrder.add.paymentMethodCredit")
            : t("page.purchaseOrder.add.paymentMethodCash")
        ],
        ...(po.tenor ? [[t("page.purchaseOrder.add.tenor"), `${po.tenor} days`]] : [])
      ];

      autoTable(doc, {
        startY: y,
        body: infoData,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2, textColor: [50, 50, 50] },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45, textColor: [100, 100, 100] },
          1: { cellWidth: 100 }
        },
        margin: { left: 14 }
      });
      y = doc.lastAutoTable.finalY + 8;

      const itemRows = (po.items || []).map((it) => [
        it.ingredientData?.name || it.productData?.nameProduct || it.ingredientName || "-",
        `${it.quantity || 0} ${it.unit || ""}`,
        `Rp ${Number(it.price || 0).toLocaleString("id-ID")}`,
        `Rp ${Number(it.total || 0).toLocaleString("id-ID")}`,
        `${it.receivedQuantity || 0}`,
        `${it.returnedQty || 0}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [
          [
            t("page.purchaseOrder.detail.product"),
            t("page.purchaseOrder.detail.qty"),
            t("page.purchaseOrder.detail.price"),
            t("page.purchaseOrder.detail.total"),
            t("page.purchaseOrder.detail.receivedCol"),
            t("page.purchaseOrder.detail.returnedCol")
          ]
        ],
        body: itemRows,
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9
        },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: "center", cellWidth: 25 },
          2: { halign: "right", cellWidth: 35 },
          3: { halign: "right", cellWidth: 35, fontStyle: "bold" },
          4: { halign: "center", cellWidth: 25 },
          5: { halign: "center", cellWidth: 25 }
        },
        margin: { left: 14 }
      });
      y = doc.lastAutoTable.finalY + 8;

      const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const summaryData = [
        [
          t("page.purchaseOrder.detail.grandTotal"),
          `Rp ${Number(po.finalAmount || 0).toLocaleString("id-ID")}`
        ],
        [t("page.purchaseOrder.detail.paid"), `Rp ${totalPaid.toLocaleString("id-ID")}`],
        [
          t("page.purchaseOrder.detail.remaining"),
          `Rp ${(Number(po.finalAmount || 0) - totalPaid).toLocaleString("id-ID")}`
        ]
      ];
      if (po.notes) {
        summaryData.push([t("page.purchaseOrder.detail.notes"), po.notes]);
      }

      autoTable(doc, {
        startY: y,
        body: summaryData,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45, textColor: [80, 80, 80] },
          1: { halign: "right", cellWidth: 100 }
        },
        margin: { left: pageWidth - 14 - 145 }
      });
      y = doc.lastAutoTable.finalY + 8;

      if (payments.length > 0) {
        if (y > 180) {
          doc.addPage();
          y = 15;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(t("page.purchaseOrder.detail.payment"), 14, y);
        y += 4;

        const payRows = payments.map((p) => [
          p.paymentDate ? format(new Date(p.paymentDate), "dd MMM yyyy, HH:mm") : "-",
          p.paymentMethod || "-",
          p.reference || "-",
          `Rp ${Number(p.amount || 0).toLocaleString("id-ID")}`
        ]);
        autoTable(doc, {
          startY: y,
          head: [
            [
              t("page.purchaseOrder.detail.date"),
              t("page.purchaseOrder.detail.paymentMethod"),
              t("page.purchaseOrder.detail.reference"),
              t("page.purchaseOrder.detail.amount")
            ]
          ],
          body: payRows,
          headStyles: {
            fillColor: [34, 197, 94],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9
          },
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 40 },
            2: { cellWidth: 60 },
            3: { halign: "right", cellWidth: 35, fontStyle: "bold" }
          },
          margin: { left: 14 }
        });
      }

      doc.save(`PO-${po.orderNumber || po.id}-${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success(t("page.purchaseOrder.detail.exportPdfSuccess"));
    } catch {
      toast.error(t("page.purchaseOrder.detail.exportFailed"));
    }
  };

  if (!po) {
    if (loading) {
      return (
        <div className="space-y-6">
          <PageHeader
            breadcrumbs={[
              {
                label: t("breadcrumb.home"),
                href: "/dashboard-super-admin",
                i18nKey: "breadcrumb.home"
              },
              {
                label: t("page.purchaseOrder.list.title"),
                href: "/purchase-order",
                i18nKey: "page.purchaseOrder.list.title"
              },
              {
                label: t("page.purchaseOrder.detail.title"),
                i18nKey: "page.purchaseOrder.detail.title"
              }
            ]}
            title={<Skeleton className="h-7 w-48" />}
            description={<Skeleton className="h-4 w-64" />}
            backLink="/purchase-order"
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 space-y-4">
                <Skeleton className="h-40 w-full" />
              </Card>
            </div>
            <Card className="p-5 space-y-4">
              <Skeleton className="h-40 w-full" />
            </Card>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("page.purchaseOrder.list.title"),
              href: "/purchase-order",
              i18nKey: "page.purchaseOrder.list.title"
            },
            {
              label: t("page.purchaseOrder.detail.title"),
              i18nKey: "page.purchaseOrder.detail.title"
            }
          ]}
          title={t("page.purchaseOrder.detail.notFound")}
          backLink="/purchase-order"
        />
      </div>
    );
  }

  const printSpec = po ? getDocumentSpecForPurchaseOrder(po, t) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.purchaseOrder.list.title"),
            href: "/purchase-order",
            i18nKey: "page.purchaseOrder.list.title"
          },
          {
            label: po.orderNumber || t("page.purchaseOrder.detail.title"),
            i18nKey: "page.purchaseOrder.detail.title"
          }
        ]}
        title={po.orderNumber || "-"}
        description={t("page.purchaseOrder.detail.subtitle")}
        backLink="/purchase-order">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${(statusMap[po.status] || statusMap.pending).class}`}>
          {React.createElement(
            po.status === "received" ? CheckCircle2 : po.status === "cancelled" ? XCircle : Clock,
            { size: 14 }
          )}
          {(statusMap[po.status] || statusMap.pending).label}
        </span>
        <Button variant="general" size="sm" onClick={handleExportExcel} className="gap-1.5">
          <FileSpreadsheet size={14} />
          <span className="hidden sm:inline">Excel</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
          <Download size={14} />
          <span className="hidden sm:inline">PDF</span>
        </Button>
        <PrintButton />
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
            <Card className="p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </Card>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PO Info Card */}
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText size={16} className="text-muted-foreground" />
                {t("page.purchaseOrder.detail.info")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.detail.supplier")}:
                    </span>
                  </div>
                  <div className="pl-[22px] font-medium">
                    {po.supplierData?.name
                      ? po.supplierData.name
                      : po.supplierNames?.length
                        ? po.supplierNames.map((s, i) => (
                            <div key={s} className="block">
                              {i + 1}. {s}
                            </div>
                          ))
                        : "-"}
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Store size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.store")}:
                  </span>
                  <span className="font-medium">{po.storeData?.name || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.pic")}:
                  </span>
                  <span className="font-medium">{po.picData?.fullName || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.createdBy")}:
                  </span>
                  <span className="font-medium">{po.createdByUser?.fullName || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.poDate")}:
                  </span>
                  <span className="font-medium">
                    {po.orderDate ? format(new Date(po.orderDate), "dd MMM yyyy") : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.dueDate")}:
                  </span>
                  <span className="font-medium">
                    {po.dueDate ? format(new Date(po.dueDate), "dd MMM yyyy") : "-"}
                  </span>
                </div>
                {po.supplierData?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.detail.phone")}:
                    </span>
                    <span className="font-medium">{po.supplierData.phone}</span>
                  </div>
                )}
                {po.receivedDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.detail.receivedDate")}:
                    </span>
                    <span className="font-medium">
                      {format(new Date(po.receivedDate), "dd MMM yyyy, HH:mm", {
                        locale: localeId
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.paymentMethod")}:
                  </span>
                  <span className="font-medium capitalize">
                    {po.paymentMethod === "credit"
                      ? t("page.purchaseOrder.add.paymentMethodCredit")
                      : t("page.purchaseOrder.add.paymentMethodCash")}
                  </span>
                </div>
                {po.paymentMethod === "credit" && po.tenor && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.add.tenor")}:
                    </span>
                    <span className="font-medium">
                      {po.tenor} {t("page.purchaseOrder.detail.days")}
                    </span>
                  </div>
                )}
                {po.paymentMethod === "credit" && po.dpPercent > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Banknote size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        {t("page.purchaseOrder.add.dpPercent")}:
                      </span>
                      <span className="font-medium">{po.dpPercent}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Banknote size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        {t("page.purchaseOrder.add.dpAmount")}:
                      </span>
                      <span className="font-medium">
                        {formatIDR(Math.round((po.finalAmount || 0) * (po.dpPercent / 100)))}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {po.notes && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm">
                  <p className="text-muted-foreground mb-1">
                    {t("page.purchaseOrder.detail.notes")}:
                  </p>
                  <p className="whitespace-pre-wrap">{po.notes}</p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Receipt size={16} className="text-muted-foreground" />
                {t("page.purchaseOrder.detail.summary")}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.total")}
                  </span>
                  <span className="font-medium">
                    Rp {Number(po.totalAmount || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                {po.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.detail.discount")}
                    </span>
                    <span className="font-medium text-red-500">
                      - Rp {Number(po.discount).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                {po.additionalCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.detail.additionalCost")}
                    </span>
                    <span className="font-medium text-emerald-600">
                      + Rp {Number(po.additionalCost).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between text-sm font-bold">
                  <span>{t("page.purchaseOrder.detail.grandTotal")}</span>
                  <span>Rp {Number(po.finalAmount || 0).toLocaleString("id-ID")}</span>
                </div>
                {totalPaid > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.detail.paid")}
                    </span>
                    <span className="font-medium text-green-600">
                      Rp {Number(totalPaid).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                {remaining > 0 ? (
                  <div className="flex justify-between text-sm border-t border-border pt-3">
                    <span className="text-muted-foreground font-medium">
                      {t("page.purchaseOrder.detail.remaining")}
                    </span>
                    <span className="font-bold text-red-500">
                      Rp {Number(remaining).toLocaleString("id-ID")}
                    </span>
                  </div>
                ) : totalPaid > 0 ? (
                  <div className="flex justify-between text-sm border-t border-border pt-3">
                    <span className="text-muted-foreground font-medium">
                      {t("page.purchaseOrder.detail.paid")}
                    </span>
                    <span className="font-bold text-green-600">
                      Rp {Number(totalPaid).toLocaleString("id-ID")}
                    </span>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          {/* Items Card */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShoppingBag size={16} className="text-muted-foreground" />
              {t("page.purchaseOrder.detail.items")}
            </h2>
            <HorizontalScrollArea className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 uppercase text-xs text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">
                      {t("page.purchaseOrder.detail.product")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      {t("page.purchaseOrder.detail.qty")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      {t("page.purchaseOrder.detail.price")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      {t("page.purchaseOrder.detail.total")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      {t("page.purchaseOrder.detail.receivedCol")}
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      {t("page.purchaseOrder.detail.returnedCol")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...itemGroups].map(([name, items]) => {
                    const collapsed = !!safeGet(collapsedGroups, name, false);
                    return (
                      <React.Fragment key={name}>
                        <tr
                          className="bg-muted/40 cursor-pointer select-none"
                          onClick={() =>
                            setCollapsedGroups((prev) => ({
                              ...prev,
                              [name]: !collapsed
                            }))
                          }>
                          <td
                            colSpan={6}
                            className="py-2.5 px-4 text-sm font-semibold text-foreground">
                            <span className="flex items-center gap-2">
                              {collapsed ? (
                                <ChevronRight size={16} className="text-muted-foreground" />
                              ) : (
                                <ChevronDown size={16} className="text-muted-foreground" />
                              )}
                              {name}
                              <span className="text-xs font-normal text-muted-foreground">
                                ({items.length} {t("page.purchaseOrder.ui.items")}
                              </span>
                            </span>
                          </td>
                        </tr>
                        {!collapsed &&
                          items.map((item) => (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-medium">
                                  {item.ingredientData?.name ||
                                    item.productData?.nameProduct ||
                                    item.ingredientName ||
                                    "-"}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {Math.round(Number(item.quantity) || 0)}
                                <span className="text-xs text-muted-foreground ml-1">
                                  {item.unit || ""}
                                </span>
                                {item.conversionToBase && Number(item.conversionToBase) !== 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    {t("page.purchaseOrder.detail.conversionHint", {
                                      unit: item.unit || "pcs",
                                      qty: item.conversionToBase
                                    })}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                Rp {Number(item.price || 0).toLocaleString("id-ID")}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold">
                                Rp {Number(item.total || 0).toLocaleString("id-ID")}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                <span
                                  className={
                                    item.receivedQuantity >= item.quantity
                                      ? "text-green-600"
                                      : "text-yellow-600"
                                  }>
                                  {Math.round(Number(item.receivedQuantity) || 0)} /{" "}
                                  {Math.round(Number(item.quantity) || 0)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {item.returnedQty > 0 ? (
                                  <span className="text-red-500">{item.returnedQty}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </HorizontalScrollArea>
          </Card>

          {/* Goods Receipts Card: the receipts made against this PO */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <PackageCheck size={16} className="text-muted-foreground" />
                {t("page.purchaseOrder.detail.receipts")}
              </h2>
              {(po.status === "pending" || po.status === "ordered") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/add-goods-receipt?poId=${po.id}`)}>
                  <Plus size={14} className="mr-1" />
                  {t("page.purchaseOrder.detail.receiveGoods")}
                </Button>
              )}
            </div>
            {receipts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("page.purchaseOrder.detail.noReceipt")}
              </p>
            ) : (
              <HorizontalScrollArea
                className="border border-border rounded-lg overflow-hidden"
                viewportClassName="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 uppercase text-xs text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.receiptNo")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.receivedDate")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.status")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.itemCount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {receipts.map((gr) => (
                      <tr
                        key={gr.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/goods-receipt/detail?id=${gr.id}`)}>
                        <td className="py-3 px-4 font-medium text-primary">
                          {gr.receiptNumber || "-"}
                        </td>
                        <td className="py-3 px-4">
                          {gr.receivedDate || gr.createdAt
                            ? format(new Date(gr.receivedDate || gr.createdAt), "dd MMM yyyy", {
                                locale: localeId
                              })
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {t(`page.goodsReceipt.list.status.${gr.status}`, {
                            defaultValue: gr.status || "-"
                          })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {(gr.items || []).length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            )}
          </Card>

          {/* Payment Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CreditCard size={16} className="text-muted-foreground" />
                {t("page.purchaseOrder.detail.payment")}
              </h2>
              {remaining > 0 && po.status !== "cancelled" && po.status !== "draft" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    payIdKeyRef.current = "";
                    setPaymentModalOpen(true);
                  }}>
                  <Banknote size={14} className="mr-1" />
                  {t("page.purchaseOrder.detail.pay")}
                </Button>
              )}
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("page.purchaseOrder.detail.noPayment")}
              </p>
            ) : (
              <HorizontalScrollArea
                className="border border-border rounded-lg overflow-hidden"
                viewportClassName="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 uppercase text-xs text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.date")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.paymentMethod")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.reference")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.amount")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          {payment.paymentDate
                            ? format(new Date(payment.paymentDate), "dd MMM yyyy, HH:mm", {
                                locale: localeId
                              })
                            : "-"}
                        </td>
                        <td className="py-3 px-4">{payment.paymentMethod || "-"}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {payment.reference || "-"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          Rp {Number(payment.amount || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setPaymentToDelete(payment);
                              setDeleteModalOpen(true);
                            }}>
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            )}
          </Card>

          {/* Returns Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Undo2 size={16} className="text-muted-foreground" />
                {t("page.purchaseOrder.detail.returns")}
              </h2>
              {(po.status === "received" || po.status === "ordered") && (
                <Button size="sm" variant="success" onClick={openReturnModal}>
                  <Plus size={14} className="mr-1" />
                  {t("page.purchaseOrder.detail.addReturn")}
                </Button>
              )}
            </div>
            {returns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("page.purchaseOrder.detail.noReturn")}
              </p>
            ) : (
              <HorizontalScrollArea
                className="border border-border rounded-lg overflow-hidden"
                viewportClassName="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 uppercase text-xs text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.returnNo")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.date")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.status")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.returnedBy")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("page.purchaseOrder.detail.returnAmount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {returns.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/purchase-return/detail?id=${r.id}`)}>
                        <td className="py-3 px-4 font-medium">{r.returnNumber || "-"}</td>
                        <td className="py-3 px-4">
                          {r.createdAt
                            ? format(new Date(r.createdAt), "dd MMM yyyy, HH:mm", {
                                locale: localeId
                              })
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const cls =
                              r.status === "approved"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : r.status === "rejected"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
                            return (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                                {r.status}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">{r.returnedBy?.name || "-"}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          Rp {Number(r.totalAmount || r.amount || 0).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            )}
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              {t("page.purchaseOrder.detail.system")}
            </h3>
            <HorizontalScrollArea>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 text-muted-foreground">
                      {t("page.purchaseOrder.detail.created")}
                    </td>
                    <td className="py-2 text-right">
                      {po.createdAt
                        ? format(new Date(po.createdAt), "dd MMM yyyy, HH:mm", { locale: localeId })
                        : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-muted-foreground">
                      {t("page.purchaseOrder.detail.updated")}
                    </td>
                    <td className="py-2 text-right">
                      {po.updatedAt
                        ? format(new Date(po.updatedAt), "dd MMM yyyy, HH:mm", { locale: localeId })
                        : "-"}
                    </td>
                  </tr>
                  {po.receivedDate && (
                    <tr>
                      <td className="py-2 text-muted-foreground">
                        {t("page.purchaseOrder.detail.receivedCol")}
                      </td>
                      <td className="py-2 text-right">
                        {format(new Date(po.receivedDate), "dd MMM yyyy, HH:mm", {
                          locale: localeId
                        })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </HorizontalScrollArea>
          </Card>
        </>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && po && (
        <Dialog open onOpenChange={setPaymentModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("page.purchaseOrder.detail.recordPaymentTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* ponytail: ringkasan pembayaran di modal */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.total")}
                  </span>
                  <span className="font-medium">
                    Rp {Number(po.totalAmount || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                {po.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.detail.discount")}
                    </span>
                    <span className="font-medium text-red-500">
                      - Rp {Number(po.discount).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                {po.additionalCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("page.purchaseOrder.detail.additionalCost")}
                    </span>
                    <span className="font-medium text-emerald-600">
                      + Rp {Number(po.additionalCost).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                  <span>{t("page.purchaseOrder.detail.grandTotal")}</span>
                  <span>Rp {Number(po.finalAmount || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("page.purchaseOrder.detail.paid")}
                  </span>
                  <span className="font-medium text-green-600">
                    Rp {Number(totalPaid).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="text-muted-foreground font-medium">
                    {t("page.purchaseOrder.detail.remaining")}
                  </span>
                  <span className="font-bold text-red-500">
                    Rp {Number(remaining).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-purchase-order-payment-amount">
                  {t("page.purchaseOrder.detail.paymentAmount")}
                </Label>
                <Input
                  id="detail-purchase-order-payment-amount"
                  type="text"
                  inputMode="numeric"
                  min={1}
                  max={remaining}
                  value={payAmount ? formatIDR(payAmount) : ""}
                  onChange={(e) => setPayAmount(parseIDR(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  placeholder="Rp 0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-purchase-order-payment-method">
                  {t("page.purchaseOrder.detail.paymentMethod")}
                </Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger id="detail-purchase-order-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      {t("page.purchaseOrder.detail.payMethodCash")}
                    </SelectItem>
                    <SelectItem value="transfer">
                      {t("page.purchaseOrder.detail.payMethodTransfer")}
                    </SelectItem>
                    <SelectItem value="credit_card">
                      {t("page.purchaseOrder.detail.payMethodCreditCard")}
                    </SelectItem>
                    <SelectItem value="debit_card">
                      {t("page.purchaseOrder.detail.payMethodDebitCard")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-purchase-order-payment-date">
                  {t("page.purchaseOrder.detail.paymentDate")}
                </Label>
                <DateInput
                  id="detail-purchase-order-payment-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-purchase-order-reference">
                  {t("page.purchaseOrder.detail.reference")}
                </Label>
                <Input
                  id="detail-purchase-order-reference"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder={t("page.purchaseOrder.detail.referencePlaceholder")}
                  maxLength={FIELD_LIMITS.REFERENCE}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="danger" onClick={() => setPaymentModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="success" onClick={handleRecordPayment} disabled={paySubmitting}>
                {paySubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {paySubmitting ? t("common.processing") : t("page.purchaseOrder.detail.pay")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Payment Confirmation */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("page.purchaseOrder.detail.deletePaymentTitle")}</DialogTitle>
            <DialogDescription>
              {t("page.purchaseOrder.detail.deletePaymentDesc", {
                amount: Number(paymentToDelete?.amount || 0).toLocaleString("id-ID")
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="danger" onClick={() => setDeleteModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeletePayment}>
              {t("page.purchaseOrder.detail.deletePaymentConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("page.purchaseOrder.detail.returModalTitle")}</DialogTitle>
            <DialogDescription>{t("page.purchaseOrder.detail.returnAmount")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto py-2">
            {returnItems.map(
              (item, idx) =>
                item.maxQty > 0 && (
                  <div
                    key={item.id || idx}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("page.purchaseOrder.ui.max")} {item.maxQty} {item.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={item.maxQty}
                      value={item.qty || ""}
                      onChange={(e) => {
                        const val = Math.min(Math.max(0, Number(e.target.value)), item.maxQty);
                        setReturnItems(
                          returnItems.map((row, i) => (i === idx ? { ...row, qty: val } : row))
                        );
                      }}
                      className="w-20 text-right"
                      placeholder="0"
                    />
                  </div>
                )
            )}
            {returnItems.every((i) => i.maxQty <= 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("page.purchaseOrder.detail.allReturned")}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="detail-purchase-order-notes">
                {t("page.purchaseOrder.detail.notes")}
              </Label>
              <Input
                id="detail-purchase-order-notes"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder={t("page.purchaseOrder.detail.returnReasonPlaceholder")}
                maxLength={FIELD_LIMITS.SHORT_NOTE}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-purchase-order-returned-by">
                {t("page.purchaseOrder.detail.returnedBy")}
              </Label>
              <Input
                id="detail-purchase-order-returned-by"
                value={returnedByName}
                onChange={(e) => setReturnedByName(e.target.value)}
                placeholder={t("page.purchaseOrder.detail.returnedByNamePlaceholder")}
                maxLength={FIELD_LIMITS.PERSON_NAME}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {t("page.purchaseOrder.list.returInfo.documentation")}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({t("common.optional")})
                  </span>
                </Label>
                {returnDocs.length > 0 && (
                  <span className="text-xs text-muted-foreground">{returnDocs.length} / 5</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={docInputRef}
                className="hidden"
                onChange={handleReturnDocChange}
              />
              <div className="grid grid-cols-2 gap-2">
                {returnDocs.map((d, idx) => (
                  <div
                    key={`${d.url}-${idx}`}
                    className="group relative rounded-lg border border-border overflow-hidden bg-card">
                    <div className="relative aspect-[4/3] bg-muted">
                      <img
                        src={d.url}
                        alt={`Doc ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 flex gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => window.open(d.url, "_blank")}
                          className="p-1 bg-background/90 rounded-full text-muted-foreground hover:text-foreground shadow-sm">
                          <Eye size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeReturnDoc(idx)}
                          className="p-1 bg-background/90 rounded-full text-muted-foreground hover:text-destructive shadow-sm">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="px-2 py-1 flex items-center gap-1">
                      <CloudUpload size={10} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {d.file?.name || `doc-${idx + 1}`}
                      </span>
                    </div>
                  </div>
                ))}
                {returnDocs.length < 5 && (
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary bg-muted/20">
                    <CloudUpload size={18} />
                    <span className="text-xs font-medium">
                      {t("page.goodsReceipt.add.form.docAdd")}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="danger" onClick={() => setReturnModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="success" onClick={handleCreateReturn} disabled={returnSubmitting}>
              {returnSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {returnSubmitting ? t("common.processing") : t("page.purchaseOrder.detail.addReturn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {printSpec && (
        <div className="hidden print:block print-doc">
          <FormalDocument spec={printSpec} />
        </div>
      )}
    </div>
  );
}

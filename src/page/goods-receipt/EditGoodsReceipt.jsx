import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import {
  Save,
  X,
  Trash2,
  Package,
  Lightbulb,
  Search,
  CloudUpload,
  ClipboardCheck,
  RotateCcw,
  History
} from "lucide-react";
import { toast } from "sonner";
import {
  editGoodsReceipt,
  getGoodsReceiptById,
  getGoodsReceiptByPO
} from "@/services/goods-receipt";
import { getAllPurchaseOrder, getPurchaseOrderById } from "@/services/purchase-order";
import { getAllIngredients } from "@/services/ingredient";
import { getAllEmployee } from "@/services/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { z } from "zod";
import { Combobox } from "@/components/ui/combobox";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { Loading } from "@/components/ui/loading";
import { useStore } from "@/contexts/StoreContext";
import { useCookies } from "react-cookie";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { formatDateOnly } from "@/utils/dateOnly";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { FieldError } from "@/components/ui/field-error";
import { dateLocale } from "@/lib/locale";

const EditGoodsReceipt = () => {
  const dirtyRef = useDomDirtyTracking();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const id = searchParams.get("id");

  const [poId, setPoId] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  const { request: requestLeave, leave } = useFormExit("/goods-receipt", () =>
    setCancelModal(true)
  );
  const [draftModal, setDraftModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ingredientFocusIdx, setIngredientFocusIdx] = useState(null);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  // Item problems are shown under the items section (they were toasts) and
  // cleared as soon as the items change.
  const [itemsError, setItemsError] = useState("");
  const [missingFields, setMissingFields] = useState([]);
  const [picSearch, setPicSearch] = useState("");
  const [picOpen, setPicOpen] = useState(false);
  const [selectedPic, setSelectedPic] = useState(null);
  const picRef = useRef(null);
  // multiple documentation photos: [{ file?, url, isNew }]
  const [docs, setDocs] = useState([]);
  const docInputRef = useRef(null);
  const [suratJalan, setSuratJalan] = useState("");
  const [taxInvoiceNo, setTaxInvoiceNo] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [grHistory, setGrHistory] = useState([]);
  const { isSuperAdmin } = useStore();
  const [cookies] = useCookies(["user"]);
  const user = cookies?.user;
  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState(true);

  const { data: locationsData, isLoading: locationsLoading } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || [];

  const docFiles = docs.filter((d) => d.isNew).map((d) => d.file);
  const storeFilterParam =
    allStores || selectedStores.length === 0 ? null : selectedStores.join(",");

  useEffect(() => {
    const isDirty =
      items.some((it) => parseFloat(it.qtyReceived) > 0) ||
      docs.some((d) => d.isNew) ||
      suratJalan.trim() ||
      taxInvoiceNo.trim() ||
      parseFloat(shippingCost) > 0;
    if (!isDirty || !loaded) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items, docs, suratJalan, taxInvoiceNo, shippingCost, loaded]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (picRef.current && !picRef.current.contains(e.target)) {
        setPicOpen(false);
        setPicSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fieldLabels = {
    poId: t("page.goodsReceipt.edit.form.purchaseOrder"),
    items: t("page.goodsReceipt.edit.form.items")
  };

  const formSchema = z.object({
    poId: z.string().min(1),
    items: z.array(z.any()).min(1)
  });

  const {
    data: receiptData,
    isLoading: loadingReceipt,
    isError,
    refetch
  } = useQuery(["goods-receipt-edit", id], () => getGoodsReceiptById(id), { enabled: !!id });

  const { data: poData } = useQuery(
    ["pos-for-gr-edit", storeFilterParam],
    () =>
      getAllPurchaseOrder({
        limit: 50,
        ...(storeFilterParam ? { stores: storeFilterParam } : {})
      }),
    {}
  );
  const purchaseOrders = poData?.data || [];

  const selectedPO = purchaseOrders.find((po) => po.id === parseInt(poId));

  const { data: ingredientsData } = useQuery(
    ["ingredients-gr-edit", effectiveStoreId],
    () => getAllIngredients({ store: effectiveStoreId, limit: 999 }),
    { enabled: !!effectiveStoreId }
  );
  const ingredients = ingredientsData?.data || [];
  const activeIngredients = ingredients.filter((i) => i.status === "active");

  const getFilteredIngredients = (search) =>
    activeIngredients.filter((i) => i.name?.toLowerCase().includes((search || "").toLowerCase()));

  useEffect(() => {
    const receipt = receiptData?.data;
    if (!receipt || loaded) return;
    setPoId(receipt.purchaseOrderId || "");
    setReceivedDate(receipt.receivedDate ? new Date(receipt.receivedDate) : new Date());
    setNotes(receipt.notes || "");
    setSuratJalan(receipt.suratJalan || "");
    setTaxInvoiceNo(receipt.taxInvoiceNo || "");
    setShippingCost(receipt.shippingCost ? String(Number(receipt.shippingCost)) : "");
    if (receipt.picData) {
      setSelectedPic({
        id: receipt.picData.id,
        fullName: receipt.picData.fullName,
        userName: receipt.picData.userName
      });
    }
    if (receipt.documentation) {
      try {
        const parsed = JSON.parse(receipt.documentation);
        if (Array.isArray(parsed)) {
          setDocs(parsed.filter(Boolean).map((url) => ({ url, isNew: false })));
        } else {
          setDocs([{ url: receipt.documentation, isNew: false }]);
        }
      } catch {
        setDocs([{ url: receipt.documentation, isNew: false }]);
      }
    }
    if (receipt.items) {
      setItems(
        receipt.items.map((item) => ({
          id: item.id,
          purchaseOrderItem: item.purchaseOrderItem || null,
          ingredient: item.product || null,
          ingredientName: item.ingredientName || item.productData?.nameProduct || "",
          product: item.product || null,
          qty: item.qty || item.qtyReceived || 0,
          unit: item.unit || "pcs",
          qtyReceived: String(item.qtyReceived || 0),
          conditionNotes: item.conditionNotes || "",
          batchNumber: item.batchNumber || "",
          expiryDate: item.expiryDate || "",
          costPrice: item.costPrice || 0,
          conversionToBase: item.conversionToBase || 1,
          isFromPo: true
        }))
      );
    }
    setLoaded(true);
  }, [receiptData, loaded]);

  const { data: poDetail, isLoading: loadingPo } = useQuery(
    ["po-detail-edit", poId],
    () => getPurchaseOrderById(poId),
    { enabled: !!poId }
  );

  useEffect(() => {
    if (!poDetail?.data?.items) return;
    const poItems = poDetail.data.items;
    if (items.length === 0 && !loaded) {
      setItems(
        poItems.map((item) => ({
          purchaseOrderItem: item.id,
          ingredient: item.ingredient || null,
          ingredientName: item.ingredientName || item.ingredientData?.name || "",
          product: item.product || null,
          qty: item.quantity,
          unit: item.unit || "pcs",
          qtyReceived: "0",
          conditionNotes: "",
          batchNumber: "",
          expiryDate: "",
          costPrice: item.price || 0,
          conversionToBase: item.conversionToBase || 1,
          isFromPo: true
        }))
      );
    } else if (loaded && items.length > 0) {
      setItems((prev) =>
        prev.map((it) => {
          const poItem = poItems.find(
            (p) =>
              (p.ingredientName || p.ingredientData?.name) === it.ingredientName ||
              (p.ingredient || p.product) === (it.ingredient || it.product)
          );
          return poItem ? { ...it, qty: poItem.quantity } : it;
        })
      );
    }
  }, [poDetail, items.length, loaded]);

  const grStoreId = receiptData?.data?.store || selectedPO?.store;
  const effectiveStoreId = grStoreId || (storeFilterParam ? storeFilterParam.split(",")[0] : null);
  const { data: employeesData } = useQuery(
    ["employees-for-gr-edit", effectiveStoreId],
    () => getAllEmployee({ limit: 999, status: "active", location: effectiveStoreId || undefined }),
    { enabled: !!effectiveStoreId }
  );
  const employees = employeesData?.data || [];
  const filteredEmployees = employees.filter((e) =>
    (e.fullName || e.userName)?.toLowerCase().includes(picSearch.toLowerCase())
  );

  // riwayat penerimaan lain utk PO yang sama
  const { data: grHistoryData } = useQuery(
    ["gr-history-po-edit", poId],
    () => getGoodsReceiptByPO(poId),
    { enabled: !!poId }
  );
  useEffect(() => {
    setGrHistory(
      (grHistoryData?.data || []).filter(
        (g) => String(g.id) !== String(id) && g.status !== "cancelled"
      )
    );
  }, [grHistoryData, id]);

  const handleReceiveAll = () => {
    let filled = 0;
    const next = items.map((it) => {
      if (!it.isFromPo) return it;
      const remaining = getItemRemaining(it);
      if (remaining > 0 && parseFloat(it.qtyReceived || 0) !== remaining) {
        filled += 1;
        return { ...it, qtyReceived: String(remaining) };
      }
      return it;
    });
    if (filled > 0) {
      setItems(next);
      toast.success(t("page.goodsReceipt.add.toast.receiveAllDone", { count: filled }));
    } else {
      toast.info(t("page.goodsReceipt.add.toast.receiveAllNone"));
    }
  };

  // Max qty per line when editing: PO ordered minus received by OTHER receipts
  // (this receipt's own previous contribution is reversed on save)
  const getItemRemaining = (item) => {
    if (!item.isFromPo && !item.purchaseOrderItem) return Math.max(0, Number(item.qty) || 0);
    const poItems = poDetail?.data?.items || [];
    const poItem =
      poItems.find((p) => p.id === item.purchaseOrderItem) ||
      (!item.purchaseOrderItem
        ? poItems.find((p) => (p.ingredientName || p.ingredientData?.name) === item.ingredientName)
        : null);
    if (!poItem) return Math.max(0, Number(item.qty) || 0);
    const ownPrevItem = (receiptData?.data?.items || []).find(
      (ri) =>
        ri.purchaseOrderItem === poItem.id ||
        (!ri.purchaseOrderItem && ri.ingredientName === item.ingredientName)
    );
    const ownPrev = ownPrevItem ? Number(ownPrevItem.qtyReceived) || 0 : 0;
    return Math.max(0, Number(poItem.quantity) - (Number(poItem.receivedQuantity) || 0) + ownPrev);
  };

  const grSummary = items.reduce(
    (acc, it) => {
      if (!(it.ingredientName || it.ingredient)) return acc;
      const price = parseFloat(it.costPrice) || 0;
      const poList = poDetail?.data?.items || [];
      const poItem =
        poList.find((p) => p.id === it.purchaseOrderItem) ||
        (!it.purchaseOrderItem
          ? poList.find((p) => (p.ingredientName || p.ingredientData?.name) === it.ingredientName)
          : null);
      const ownPrevItem = poItem
        ? (receiptData?.data?.items || []).find(
            (ri) =>
              ri.purchaseOrderItem === poItem.id ||
              (!ri.purchaseOrderItem && ri.ingredientName === it.ingredientName)
          )
        : null;
      const ownPrev = ownPrevItem ? Number(ownPrevItem.qtyReceived) || 0 : 0;
      const qtyPo = poItem
        ? Math.max(0, Number(poItem.quantity) || 0)
        : Math.max(0, Number(it.qty) || 0);
      const othersPrev = poItem ? Math.max(0, (Number(poItem.receivedQuantity) || 0) - ownPrev) : 0;
      const remaining = Math.max(getItemRemaining(it), 0);
      const now = Math.min(Math.max(parseFloat(it.qtyReceived) || 0, 0), remaining);
      acc.target += remaining;
      acc.filled += now;
      if (now > 0) acc.count += 1;
      acc.orderedValue += qtyPo * price;
      acc.prevValue += othersPrev * price;
      acc.nowValue += now * price;
      acc.shortageValue += Math.max(qtyPo - othersPrev - now, 0) * price;
      if (othersPrev > 0) acc.hasPrev = true;
      return acc;
    },
    {
      target: 0,
      filled: 0,
      count: 0,
      orderedValue: 0,
      prevValue: 0,
      nowValue: 0,
      shortageValue: 0,
      hasPrev: false
    }
  );

  const receiptProgress = {
    ...grSummary,
    done: grSummary.target > 0 && grSummary.filled >= grSummary.target
  };

  const handleDocChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    const tooLarge = incoming.find((f) => f.size > 5 * 1024 * 1024);
    if (tooLarge) {
      toast.error(t("page.goodsReceipt.add.form.fileTooLarge"));
      e.target.value = "";
      return;
    }
    const room = 5 - docs.length;
    if (room <= 0) {
      toast.error(t("page.goodsReceipt.add.form.docMaxReached"));
      e.target.value = "";
      return;
    }
    const accepted = incoming.slice(0, room);
    if (accepted.length < incoming.length) {
      toast.info(t("page.goodsReceipt.add.form.docMaxReached"));
    }
    setDocs((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, url: URL.createObjectURL(f), isNew: true }))
    ]);
    e.target.value = "";
  };

  const removeDoc = (idx) => {
    setDocs((prev) => {
      const target = prev.at(idx);
      if (target?.isNew) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const showItemsError = (message) => {
    setItemsError(message);
    document
      .getElementById("edit-goods-receipt-items")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const updateItem = (idx, field, value) => {
    setItemsError("");
    setItems((prev) => prev.map((item, i) => (i !== idx ? item : { ...item, [field]: value })));
  };

  const doSubmit = async (saveAsDraft = false) => {
    if (!poId || items.length === 0) {
      showItemsError(t("page.goodsReceipt.edit.toast.poRequired"));
      return;
    }
    const validItems = items.filter(
      (it) => parseFloat(it.qtyReceived) > 0 && (it.ingredientName || it.ingredient)
    );
    if (validItems.length === 0) {
      showItemsError(t("page.goodsReceipt.edit.toast.itemRequired"));
      return;
    }
    const overItem = validItems.find((it) => parseFloat(it.qtyReceived) > getItemRemaining(it));
    if (overItem) {
      showItemsError(t("page.goodsReceipt.add.toast.qtyExceed"));
      return;
    }
    // tanggal terima tidak boleh sebelum tanggal PO
    const poOrderDate = poDetail?.data?.orderDate ? new Date(poDetail.data.orderDate) : null;
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (
      poOrderDate &&
      receivedDate instanceof Date &&
      startOfDay(receivedDate) < startOfDay(poOrderDate)
    ) {
      toast.error(t("page.goodsReceipt.add.toast.dateBeforePo"));
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        receivedDate: formatDateOnly(receivedDate),
        notes,
        pic: selectedPic?.id || null,
        suratJalan: suratJalan.trim() || null,
        taxInvoiceNo: taxInvoiceNo.trim() || null,
        shippingCost: parseFloat(shippingCost) || 0,
        status: saveAsDraft ? "draft" : "completed",
        items: validItems.map((it) => ({
          purchaseOrderItem: it.purchaseOrderItem || null,
          ingredient: it.ingredient,
          ingredientName: it.ingredientName,
          product: it.product,
          qtyReceived: parseFloat(it.qtyReceived),
          unit: it.unit,
          conditionNotes: it.conditionNotes,
          batchNumber: it.batchNumber?.trim() || null,
          expiryDate: it.expiryDate || null,
          costPrice: parseFloat(it.costPrice) || 0,
          conversionToBase: parseFloat(it.conversionToBase) || 1
        }))
      };
      // dokumentasi: kirim ulang URL lama yang dipertahankan sebagai JSON array
      payload.documentation = docs.filter((d) => !d.isNew).map((d) => d.url);
      await editGoodsReceipt(id, payload, docFiles);
      toast.success(t("page.goodsReceipt.edit.toast.success"), {
        description: t("page.goodsReceipt.edit.toast.successDesc")
      });
      queryClient.invalidateQueries(["goods-receipts"]);
      navigate("/goods-receipt");
    } catch (err) {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.goodsReceipt.edit.notFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (loadingReceipt) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            { label: t("breadcrumb.goodsReceipt"), href: "/goods-receipt" },
            { label: t("breadcrumb.edit") }
          ]}
          title={t("page.goodsReceipt.edit.title")}
          description={t("page.goodsReceipt.edit.description")}
          backLink="/goods-receipt">
          <UserGuide guideKey="add-goods-receipt" mode="edit" />
        </PageHeader>
        <div className="bg-card p-6 rounded-xl border border-border space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="flex justify-between pt-4 border-t">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={dirtyRef} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.dashboard"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.dashboard"
            },
            {
              label: t("breadcrumb.goodsReceipt"),
              href: "/goods-receipt",
              i18nKey: "breadcrumb.goodsReceipt"
            },
            { label: t("breadcrumb.edit"), i18nKey: "breadcrumb.edit" }
          ]}
          title={t("page.goodsReceipt.edit.title")}
          description={t("page.goodsReceipt.edit.description")}
          backLink="/goods-receipt"
          onBack={requestLeave}>
          <UserGuide guideKey="add-goods-receipt" mode="edit" />
        </PageHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doSubmit(false);
          }}
          className="bg-card p-6 rounded-xl border border-border space-y-6">
          {isSuperAdmin && (
            <StoreSelectCard
              locations={locations}
              selectedStores={selectedStores}
              onChange={setSelectedStores}
              isSuperAdmin={isSuperAdmin}
              user={user}
              t={t}
              title={t("page.goodsReceipt.add.form.storeFilter")}
              description={t("page.goodsReceipt.add.form.storeFilterDesc")}
              noStoreLabel={t("header.noStore")}
              addStoreLabel={t("header.addStore")}
              storeInfoLabel={t("header.activeStore")}
              allStores={allStores}
              onAllStoresChange={setAllStores}
              navigate={navigate}
              mandatory={false}
              locationsLoading={locationsLoading}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goods-receipt-purchase-order">
                {t("page.goodsReceipt.edit.form.purchaseOrder")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Combobox
                id="edit-goods-receipt-purchase-order"
                options={[
                  { value: "", label: t("page.goodsReceipt.edit.form.selectPO") },
                  ...purchaseOrders.map((po) => ({
                    value: po.id,
                    label: po.orderNumber
                  }))
                ]}
                value={poId}
                disabled
                placeholder={t("page.goodsReceipt.edit.form.selectPO")}
                searchPlaceholder={t("common.search")}
              />
              {selectedPO && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {t("page.goodsReceipt.edit.form.status")}: {selectedPO.status}
                  </span>
                  <span className="text-xs text-muted-foreground">|</span>
                  <span className="text-xs text-muted-foreground">
                    {t("page.goodsReceipt.edit.form.store")}: {selectedPO.storeData?.name || "-"}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-goods-receipt-received-date">
                {t("page.goodsReceipt.edit.form.receivedDate")}
              </Label>
              <DatePicker
                id="edit-goods-receipt-received-date"
                date={receivedDate}
                setDate={setReceivedDate}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goods-receipt-pic">
                {t("page.goodsReceipt.add.form.pic")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </Label>
              <div className="relative" ref={picRef}>
                <div
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm flex items-center cursor-pointer"
                  onClick={() => setPicOpen(!picOpen)}>
                  <Search size={14} className="mr-2 text-muted-foreground shrink-0" />
                  <input
                    id="edit-goods-receipt-pic"
                    type="text"
                    value={
                      picOpen ? picSearch : selectedPic?.fullName || selectedPic?.userName || ""
                    }
                    readOnly={!picOpen}
                    onFocus={() => setPicOpen(true)}
                    onChange={(e) => setPicSearch(e.target.value)}
                    placeholder={t("page.goodsReceipt.add.form.picPlaceholder")}
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                </div>
                {picOpen && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
                    {filteredEmployees.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {t("page.goodsReceipt.add.form.picEmpty")}
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent ${
                            selectedPic?.id === emp.id ? "bg-accent" : ""
                          }`}
                          onClick={() => {
                            setSelectedPic(emp);
                            setPicSearch("");
                            setPicOpen(false);
                          }}>
                          {emp.fullName || emp.userName}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedPic && (
                <button
                  type="button"
                  onClick={() => setSelectedPic(null)}
                  className="text-xs text-muted-foreground hover:text-destructive">
                  {t("page.goodsReceipt.add.form.clearPic")}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-goods-receipt-documentation">
                {t("page.goodsReceipt.add.form.documentation")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </Label>
              <input
                id="edit-goods-receipt-documentation"
                type="file"
                accept="image/*"
                multiple
                ref={docInputRef}
                className="hidden"
                onChange={handleDocChange}
              />
              <div className="grid grid-cols-3 gap-2">
                {docs.map((d, idx) => (
                  <div
                    key={`${d.url}-${idx}`}
                    className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
                    <img src={d.url} alt={`doc-${idx + 1}`} className="w-full h-20 object-cover" />
                    <button
                      aria-label={t("common.delete")}
                      type="button"
                      onClick={() => removeDoc(idx)}
                      className="absolute top-1 right-1 p-1 bg-background/90 rounded-full text-muted-foreground hover:text-destructive shadow">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {docs.length < 5 && (
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="h-20 rounded-lg border-2 border-dashed border-border hover:border-primary transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary bg-muted/30">
                    <CloudUpload size={18} />
                    <span className="text-xs font-medium">
                      {t("page.goodsReceipt.add.form.docAdd")}
                    </span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("page.goodsReceipt.add.form.docHint")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goods-receipt-surat-jalan">
                {t("page.goodsReceipt.add.form.suratJalan")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </Label>
              <Input
                id="edit-goods-receipt-surat-jalan"
                type="text"
                value={suratJalan}
                onChange={(e) => setSuratJalan(e.target.value)}
                placeholder={t("page.goodsReceipt.add.placeholder.suratJalan")}
                maxLength={FIELD_LIMITS.DOCUMENT_NUMBER}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-goods-receipt-tax-invoice-no">
                {t("page.goodsReceipt.add.form.taxInvoiceNo")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </Label>
              <Input
                id="edit-goods-receipt-tax-invoice-no"
                type="text"
                value={taxInvoiceNo}
                onChange={(e) => setTaxInvoiceNo(e.target.value)}
                placeholder={t("page.goodsReceipt.add.placeholder.taxInvoiceNo")}
                maxLength={FIELD_LIMITS.DOCUMENT_NUMBER}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-goods-receipt-shipping-cost">
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
                  id="edit-goods-receipt-shipping-cost"
                  type="text"
                  inputMode="numeric"
                  value={shippingCost ? Number(shippingCost).toLocaleString("id-ID") : ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setShippingCost(raw);
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

          <div id="edit-goods-receipt-items" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium leading-none">
                {t("page.goodsReceipt.edit.form.items")}
              </p>
              <div className="flex items-center gap-2">
                {poId && items.length > 0 && (
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    className="gap-1.5 h-8"
                    onClick={handleReceiveAll}>
                    <ClipboardCheck size={14} />
                    {t("page.goodsReceipt.add.form.receiveAll")}
                  </Button>
                )}
                {poId && receiptProgress.target > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      receiptProgress.done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}>
                    {receiptProgress.done
                      ? t("page.goodsReceipt.add.status.selesai")
                      : t("page.goodsReceipt.add.status.belumSelesai")}
                    {!receiptProgress.done && (
                      <span className="font-normal">
                        ({receiptProgress.filled.toLocaleString("id-ID")}/
                        {receiptProgress.target.toLocaleString("id-ID")})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <FieldError message={itemsError} />
            {loadingPo ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                {t("page.goodsReceipt.edit.loading.items")}
              </div>
            ) : poId ? (
              <HorizontalScrollArea className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.edit.table.name")}
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.edit.table.qtyPo")}
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.edit.table.unit")}
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.add.table.conversion")}
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.edit.table.qtyReceived")}
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.add.table.costPrice")}
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.add.table.batch")}
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.add.table.expiry")}
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                        {t("page.goodsReceipt.edit.table.notes")}
                      </th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-muted/20">
                        <td className="px-3 py-2">
                          {item.isFromPo ? (
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">{item.ingredientName}</span>
                            </div>
                          ) : (
                            <div className="relative">
                              <Input
                                type="text"
                                value={item.ingredientName}
                                onChange={(e) => {
                                  updateItem(idx, "ingredientName", e.target.value);
                                  updateItem(idx, "ingredient", null);
                                  setIngredientFocusIdx(idx);
                                }}
                                onFocus={() => setIngredientFocusIdx(idx)}
                                onBlur={() => setTimeout(() => setIngredientFocusIdx(null), 200)}
                                className="h-8 text-xs"
                                placeholder={t("page.goodsReceipt.edit.placeholder.name")}
                                maxLength={FIELD_LIMITS.BUSINESS_NAME}
                              />
                              {ingredientFocusIdx === idx && (
                                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {getFilteredIngredients(item.ingredientName || "").length > 0 ? (
                                    getFilteredIngredients(item.ingredientName || "").map((ing) => (
                                      <button
                                        key={ing.id}
                                        type="button"
                                        onMouseDown={() => {
                                          updateItem(idx, "ingredientName", ing.name);
                                          updateItem(idx, "ingredient", ing.id);
                                          updateItem(idx, "unit", ing.unit || "pcs");
                                          setIngredientFocusIdx(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center gap-2">
                                        <span>{ing.name}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                          {ing.unit || "pcs"}
                                        </span>
                                      </button>
                                    ))
                                  ) : (
                                    <p className="p-3 text-xs text-muted-foreground text-center">
                                      {t("page.goodsReceipt.edit.placeholder.noIngredient") ||
                                        "Tidak ada bahan ditemukan"}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.isFromPo ? (
                            <span className="text-sm text-muted-foreground">{item.qty}</span>
                          ) : (
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={item.qty || ""}
                              onChange={(e) =>
                                updateItem(idx, "qty", e.target.value.replace(/[^0-9]/g, ""))
                              }
                              className="h-8 text-xs text-center w-16 mx-auto"
                              placeholder={t("page.goodsReceipt.edit.placeholder.qty")}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center">
                            {item.isFromPo ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-xs bg-muted capitalize">
                                {item.unit}
                              </span>
                            ) : (
                              <Combobox
                                options={[
                                  { value: "pcs", label: t("unit.pcs") },
                                  { value: "buah", label: t("unit.buah") },
                                  { value: "kg", label: t("unit.kg") },
                                  { value: "gram", label: t("unit.gram") },
                                  { value: "liter", label: t("unit.liter") },
                                  { value: "ml", label: t("unit.ml") },
                                  { value: "meter", label: t("unit.meter") },
                                  { value: "cm", label: t("unit.cm") },
                                  { value: "lusin", label: t("unit.lusin") },
                                  { value: "box", label: t("unit.box") },
                                  { value: "pack", label: t("unit.pack") },
                                  { value: "karton", label: t("unit.karton") }
                                ]}
                                value={item.unit}
                                onChange={(val) => updateItem(idx, "unit", val)}
                                placeholder={t("unit.pcs")}
                                searchPlaceholder={t("common.search")}
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {item.isFromPo ? (
                            <div className="text-center">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs bg-muted">
                                {parseFloat(item.conversionToBase) || 1}
                              </span>
                              {parseFloat(item.qtyReceived) > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  ={" "}
                                  {(
                                    parseFloat(item.qtyReceived) * (item.conversionToBase || 1)
                                  ).toLocaleString("id-ID")}{" "}
                                  stok
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={item.conversionToBase ? String(item.conversionToBase) : "1"}
                                onChange={(e) =>
                                  updateItem(
                                    idx,
                                    "conversionToBase",
                                    Number(e.target.value.replace(/[^0-9.]/g, "")) || 1
                                  )
                                }
                                className="h-8 text-xs text-center w-16"
                                placeholder="1"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.qtyReceived === "0" ? "" : item.qtyReceived}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value
                                .replace(/[^0-9.]/g, "")
                                .replace(/(\..*)\./g, "$1");
                              const max = getItemRemaining(item);
                              const num = parseFloat(raw);
                              updateItem(idx, "qtyReceived", num > max ? String(max) : raw);
                            }}
                            className="h-8 text-xs text-right w-24 ml-auto"
                            placeholder={t("page.goodsReceipt.edit.placeholder.qty")}
                          />
                          {(() => {
                            const max = getItemRemaining(item);
                            const val = parseFloat(item.qtyReceived) || 0;
                            if (val <= 0 || max <= 0) return null;
                            return val >= max ? (
                              <p className="text-xs font-medium text-emerald-600 mt-0.5 text-right">
                                {t("page.goodsReceipt.add.status.pas")}
                              </p>
                            ) : (
                              <p className="text-xs font-medium text-amber-600 mt-0.5 text-right">
                                {t("page.goodsReceipt.add.status.kurang", { qty: max - val })}
                              </p>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.costPrice ? String(item.costPrice) : ""}
                            disabled
                            className="h-8 text-xs text-right w-28 ml-auto"
                            placeholder={t("page.goodsReceipt.add.placeholder.costPrice")}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            value={item.batchNumber || ""}
                            onChange={(e) => updateItem(idx, "batchNumber", e.target.value)}
                            className="h-8 text-xs w-24"
                            placeholder={t("page.goodsReceipt.add.placeholder.batch")}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={item.expiryDate || ""}
                            onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                            className="h-8 text-xs w-36"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            value={item.conditionNotes}
                            onChange={(e) => updateItem(idx, "conditionNotes", e.target.value)}
                            className="h-8 text-xs"
                            placeholder={t("page.goodsReceipt.edit.placeholder.condition")}
                            maxLength={FIELD_LIMITS.SHORT_NOTE}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!item.isFromPo && (
                            <button
                              aria-label={t("common.delete")}
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-muted-foreground/30 hover:text-destructive">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HorizontalScrollArea>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t("page.goodsReceipt.edit.form.noPO")}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-goods-receipt-notes-label">
              {t("page.goodsReceipt.edit.form.notesLabel")}
            </Label>
            <Textarea
              id="edit-goods-receipt-notes-label"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("page.goodsReceipt.edit.placeholder.notes")}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
          </div>

          {grHistory.length > 0 && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <History size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {t("page.goodsReceipt.add.history.title", { count: grHistory.length })}
                </span>
              </div>
              <div className="space-y-1.5">
                {grHistory.map((g) => {
                  const totalQty = (g.items || []).reduce(
                    (s, it) => s + (Number(it.qtyReceived) || 0),
                    0
                  );
                  return (
                    <div key={g.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium">{g.receiptNumber}</span>
                      <span className="text-muted-foreground">
                        {g.receivedDate
                          ? new Date(g.receivedDate).toLocaleDateString(dateLocale())
                          : "-"}
                      </span>
                      <span className="text-muted-foreground">
                        {totalQty.toLocaleString("id-ID")} unit
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          g.status === "completed"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        }`}>
                        {g.status === "completed"
                          ? t("page.goodsReceipt.add.history.completed")
                          : t("page.goodsReceipt.add.history.draft")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-muted-foreground">
                  {t("page.goodsReceipt.add.summary.itemsReceived", { count: grSummary.count })}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    grSummary.count === 0
                      ? "bg-muted text-muted-foreground"
                      : grSummary.shortageValue > 0
                        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  }`}>
                  {grSummary.count === 0
                    ? t("page.goodsReceipt.add.summary.pendingLabel")
                    : grSummary.shortageValue > 0
                      ? t("page.goodsReceipt.add.summary.mismatchLabel")
                      : t("page.goodsReceipt.add.summary.matchLabel")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {t("page.goodsReceipt.add.summary.orderedValue")}
                </span>
                <span className="font-medium">
                  Rp {grSummary.orderedValue.toLocaleString("id-ID")}
                </span>
              </div>
              {grSummary.hasPrev && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("page.goodsReceipt.add.summary.prevReceived")}
                  </span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Rp {grSummary.prevValue.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {t("page.goodsReceipt.add.summary.nowReceived")}
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Rp {grSummary.nowValue.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {t("page.goodsReceipt.add.summary.shortage")}
                </span>
                <span
                  className={`font-medium ${
                    grSummary.count === 0
                      ? "text-muted-foreground"
                      : grSummary.shortageValue > 0
                        ? "text-red-500"
                        : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                  {grSummary.shortageValue > 0
                    ? `Rp ${grSummary.shortageValue.toLocaleString("id-ID")}`
                    : t("page.goodsReceipt.add.status.selesai")}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-1 flex items-center justify-between gap-2">
                <span className="font-semibold">{t("page.goodsReceipt.add.summary.variance")}</span>
                <span
                  className={`font-bold text-base ${
                    grSummary.count === 0
                      ? "text-muted-foreground"
                      : grSummary.shortageValue > 0
                        ? "text-red-500"
                        : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                  {grSummary.shortageValue > 0
                    ? `-Rp ${grSummary.shortageValue.toLocaleString("id-ID")}`
                    : "Rp 0"}
                </span>
              </div>
              {grSummary.shortageValue > 0 && poId && (
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  className="w-full mt-2 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20"
                  onClick={() => navigate(`/purchase-order/detail?id=${poId}`)}>
                  <RotateCcw size={14} />
                  {t("page.goodsReceipt.add.summary.createReturnCta")}
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="danger"
              className="w-full sm:w-auto justify-center"
              onClick={requestLeave}>
              <X size={16} className="mr-1" /> {t("page.goodsReceipt.edit.form.cancel")}
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Button
                type="button"
                variant="draft"
                className="w-full sm:w-auto justify-center"
                onClick={() => setDraftModal(true)}
                disabled={isSubmitting}>
                {t("common.saveAsDraft")}
              </Button>
              <Button
                variant="success"
                type="button"
                className="w-full sm:w-auto justify-center"
                disabled={isSubmitting}
                onClick={() => {
                  const missing = getMissingFields({ poId, items }, formSchema, fieldLabels);
                  if (missing.length > 0) {
                    setMissingFields(missing);
                    setMissingFieldsModal(true);
                    return;
                  }
                  setConfirmModal(true);
                }}>
                <Save size={16} className="mr-1" />{" "}
                {isSubmitting
                  ? t("page.goodsReceipt.edit.form.saving")
                  : t("page.goodsReceipt.edit.form.save")}
              </Button>
            </div>
          </div>
        </form>

        {isSubmitting && (
          <Loading fullscreen size="lg" label={t("page.goodsReceipt.edit.form.saving")} />
        )}

        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={(o) => !o && setCancelModal(false)}
          title={t("page.goodsReceipt.edit.modal.title")}
          description={t("page.goodsReceipt.edit.modal.description")}
          confirmText={t("page.goodsReceipt.edit.modal.confirm")}
          onConfirm={() => {
            setCancelModal(false);
            setTimeout(leave, 150);
          }}
        />
        <Modal
          type="confirm"
          open={draftModal}
          onOpenChange={setDraftModal}
          title={t("common.saveAsDraftTitle")}
          description={t("common.saveAsDraftDesc")}
          confirmText={t("common.yesSaveDraft")}
          onConfirm={() => {
            setDraftModal(false);
            doSubmit(true);
          }}
        />
        <Modal
          type="confirm"
          open={confirmModal}
          onOpenChange={setConfirmModal}
          title={t("page.goodsReceipt.edit.confirmModal.title")}
          description={t("page.goodsReceipt.edit.confirmModal.description")}
          confirmText={t("page.goodsReceipt.edit.confirmModal.confirm")}
          onConfirm={() => {
            setConfirmModal(false);
            doSubmit(false);
          }}
        />
        <MissingFieldsModal
          open={missingFieldsModal}
          onOpenChange={setMissingFieldsModal}
          fields={missingFields}
        />
        <Modal
          type="error"
          open={errorModal}
          onOpenChange={setErrorModal}
          title={t("common.error")}
          description={modalMessage}
          onConfirm={() => setErrorModal(false)}
        />

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb size={16} className="text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {t("page.goodsReceipt.edit.tips.title")}
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                  {t("page.goodsReceipt.edit.tips.1")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                  {t("page.goodsReceipt.edit.tips.2")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                  {t("page.goodsReceipt.edit.tips.3")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditGoodsReceipt;

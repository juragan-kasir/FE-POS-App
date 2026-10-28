import React, { useState, useEffect, useMemo } from "react";
import { safeGet } from "@/lib/safe-lookup";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { Save, X, Plus, ShoppingCart, Package, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { z } from "zod";
import { normalizePayload } from "@/lib/payload-normalizer";
import { editPurchaseOrder, getPurchaseOrderById } from "@/services/purchase-order";
import { getAllSupplier } from "@/services/supplier";
import { getAllEmployee } from "@/services/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Combobox } from "@/components/ui/combobox";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import AbortController from "@/components/organism/abort-controller";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";

const emptyItem = {
  name: "",
  product: null,
  productName: null,
  ingredient: null,
  ingredientName: null,
  qty: 1,
  unit: "pcs",
  price: 0,
  conversionToBase: 1
};

const emptyGroup = () => ({ supplier: null, items: [{ ...emptyItem }] });

const unitOptions = [
  { value: "pcs", label: "pcs" },
  { value: "item", label: "item" },
  { value: "unit", label: "unit" },
  { value: "buah", label: "buah" },
  { value: "pasang", label: "pasang" },
  { value: "set", label: "set" },
  { value: "lusin", label: "lusin" },
  { value: "pack", label: "pack" },
  { value: "box", label: "box" },
  { value: "karton", label: "karton" },
  { value: "kg", label: "kg" },
  { value: "gram", label: "gram" },
  { value: "liter", label: "liter" },
  { value: "ml", label: "ml" },
  { value: "meter", label: "meter" },
  { value: "cm", label: "cm" },
  { value: "cup", label: "cup" },
  { value: "gelas", label: "gelas" },
  { value: "porsi", label: "porsi" }
];

const EditPurchaseOrder = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const poFieldLabels = {
    store: t("page.purchaseOrder.add.store"),
    pic: t("page.purchaseOrder.add.pic"),
    orderDate: t("page.purchaseOrder.add.poDate"),
    orderTime: t("page.purchaseOrder.add.time"),
    dueDate: t("page.purchaseOrder.add.dueDate"),
    items: t("page.purchaseOrder.add.itemSection")
  };

  const poSchema = z.object({
    store: z.number().min(1, ""),
    pic: z.number().min(1, ""),
    orderDate: z.date({ required_error: "" }),
    orderTime: z.string().min(1, ""),
    dueDate: z.date().nullable().optional(),
    items: z
      .array(
        z.object({
          name: z.string().min(1, ""),
          qty: z.number().min(1, ""),
          price: z.number().min(0, ""),
          unit: z.string().min(1)
        })
      )
      .min(1, "")
  });

  const [selectedStore, setSelectedStore] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [additionalCost, setAdditionalCost] = useState(0);
  const [additionalCostNotes, setAdditionalCostNotes] = useState("");
  const [overDeliveryTolerance, setOverDeliveryTolerance] = useState(10);
  const [groups, setGroups] = useState([emptyGroup()]);
  const [cancelModal, setCancelModal] = useState(false);
  const { request: requestLeave, leave } = useFormExit("/purchase-order", () =>
    setCancelModal(true)
  );
  const [draftModal, setDraftModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [supplierChange, setSupplierChange] = useState(null);
  const [supplierRemove, setSupplierRemove] = useState(null);
  const [itemRemove, setItemRemove] = useState(null);
  const [groupRemove, setGroupRemove] = useState(null);
  const [storeChangeModal, setStoreChangeModal] = useState(false);
  const [pendingStore, setPendingStore] = useState(null);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [orderDate, setOrderDate] = useState(null);
  const [orderTime, setOrderTime] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [tenor, setTenor] = useState(0);
  const [dpPercent, setDpPercent] = useState(0);
  const [goodsRequestData, setGoodsRequestData] = useState(null);
  const [picSearch, setPicSearch] = useState("");
  const [picId, setPicId] = useState(null);
  const [showPicList, setShowPicList] = useState(false);

  const {
    data: poData,
    isError,
    refetch
  } = useQuery(["po-edit", id], () => getPurchaseOrderById(id), { enabled: !!id });
  const po = poData?.data;
  // T-02/T-03/T-04 financial lock after first receipt (BE authoritative, FE mirrors for UX)
  const hasFinancialLock = useMemo(
    () => !!(po && po.items && po.items.some((it) => Number(it.receivedQuantity) > 0)),
    [po]
  );

  useEffect(() => {
    if (!po) return;
    setSelectedStore(po.store || "");
    setPicSearch(po.picData?.fullName || "");
    setPicId(po.pic);
    setNotes(po.notes || "");
    setDiscount(po.discount || 0);
    setTaxRate(po.taxRate || 0);
    setAdditionalCost(po.additionalCost || 0);
    setAdditionalCostNotes(po.additionalCostNotes || "");
    setOverDeliveryTolerance(po.overDeliveryTolerance ?? 10);
    setOrderDate(po.orderDate ? new Date(po.orderDate) : new Date());
    setOrderTime(
      po.orderDate ? format(new Date(po.orderDate), "HH:mm") : format(new Date(), "HH:mm")
    );
    setDueDate(po.dueDate ? new Date(po.dueDate) : null);
    setPaymentMethod(po.paymentMethod || "cash");
    setTenor(po.tenor || 0);
    setDpPercent(po.dpPercent || 0);
    setGoodsRequestData(po.goodsRequestData || null);
    if (po.items && po.items.length > 0) {
      const bySupplier = new Map();
      po.items.forEach((item) => {
        const supId = item.supplier || null;
        if (!bySupplier.has(supId)) bySupplier.set(supId, []);
        bySupplier.get(supId).push({
          name: item.ingredientName || item.productData?.nameProduct || "",
          product: item.product || null,
          productName: item.productData?.nameProduct || null,
          ingredient: item.ingredient || null,
          ingredientName: item.ingredientName || null,
          qty: Math.round(item.quantity) || 1,
          price: item.price,
          unit: item.unit || "pcs",
          conversionToBase: item.conversionToBase || 1
        });
      });
      const grouped = [...bySupplier.entries()].map(([supId, items]) => ({
        supplier: supId === null ? null : Number(supId),
        items
      }));
      setGroups(grouped.length > 0 ? grouped : [emptyGroup()]);
    } else {
      setGroups([emptyGroup()]);
    }
  }, [po]);

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery(
    ["suppliers-dropdown", selectedStore],
    () =>
      getAllSupplier({ limit: 999, store: selectedStore, status: "active", includeProducts: true }),
    { enabled: !!selectedStore, staleTime: 30000 }
  );
  const suppliers = suppliersData?.data || [];

  const { data: employeesData, isLoading: employeesLoading } = useQuery(
    ["employees-dropdown", selectedStore],
    () => getAllEmployee({ limit: 999, status: "active", location: selectedStore || undefined }),
    {
      enabled: !!selectedStore,
      staleTime: 30000
    }
  );
  const employees = employeesData?.data || [];

  const filteredEmployees = employees.filter((e) =>
    (e.fullName || e.userName)?.toLowerCase().includes(picSearch.toLowerCase())
  );

  const { data: locationsData } = useLocations("active", {
    staleTime: 30000
  });
  const locations = locationsData?.data || [];

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((sup) => ({
        value: String(sup.id),
        label: sup.name || sup.supplierName || `Supplier #${sup.id}`
      })),
    [suppliers]
  );

  const supplierItemsBySupplier = useMemo(() => {
    const map = {};
    for (const sup of suppliers || []) {
      map[sup.id] = (sup.products || []).map((p) => ({
        value: `sp-${p.id}`,
        productId: p.productId || null,
        name: p.name,
        unit: p.unit || "pcs",
        price: p.price || p.lastPrice || 0
      }));
    }
    return map;
  }, [suppliers]);

  const selectedItemValue = (item, supplier) => {
    if (!supplier) return "";
    const list = safeGet(supplierItemsBySupplier, supplier) || [];
    const match = list.find(
      (opt) =>
        (item.product && item.product === opt.productId) ||
        (item.ingredientName && item.ingredientName === opt.name) ||
        (item.productName && item.productName === opt.name)
    );
    return match?.value || "";
  };

  const itemOptionsForRow = (gIdx, iIdx, supplier) => {
    if (!supplier) return [];
    const list = safeGet(supplierItemsBySupplier, supplier) || [];
    const taken = new Set();
    const group = groups.at(gIdx);
    (group?.items || []).forEach((other, j) => {
      if (j === iIdx) return;
      const val = selectedItemValue(other, supplier);
      if (val) taken.add(val);
    });
    return list
      .filter((it) => !taken.has(it.value))
      .map((it) => ({ value: it.value, label: it.name }));
  };

  const allFilledItems = useMemo(
    () =>
      groups.flatMap((g) =>
        g.items.filter((it) => it.name.trim()).map((it) => ({ ...it, supplier: g.supplier }))
      ),
    [groups]
  );

  const addGroup = () => setGroups((prev) => [...prev, emptyGroup()]);

  const removeGroup = (gIdx) => setGroups((prev) => prev.filter((_, i) => i !== gIdx));

  const addItem = (gIdx) =>
    setGroups((prev) =>
      prev.map((g, i) => (i === gIdx ? { ...g, items: [...g.items, { ...emptyItem }] } : g))
    );

  const removeItem = (gIdx, iIdx) =>
    setGroups((prev) =>
      prev.map((g, i) => (i === gIdx ? { ...g, items: g.items.filter((_, j) => j !== iIdx) } : g))
    );

  const updateItem = (gIdx, iIdx, field, value) =>
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx
          ? {
              ...g,
              items: g.items.map((it, j) => (j === iIdx ? { ...it, [field]: value } : it))
            }
          : g
      )
    );

  const applySupplierChange = (gIdx, supplierId) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === gIdx ? { supplier: supplierId, items: [{ ...emptyItem }] } : g))
    );
  };

  const pickGroupSupplier = (gIdx, value) => {
    const supplierId = value ? Number(value) : null;
    const group = groups.at(gIdx);
    const hasFilledItems = (group?.items || []).some((it) => it.name.trim());
    const isSameSupplier = (group?.supplier || null) === supplierId;
    if (hasFilledItems && !isSameSupplier) {
      setSupplierChange({ gIdx, supplierId });
      return;
    }
    applySupplierChange(gIdx, supplierId);
  };

  const handleClearSupplierClick = (gIdx) => {
    const group = groups.at(gIdx);
    const hasFilledItems = (group?.items || []).some((it) => it.name.trim());
    if (hasFilledItems) {
      setSupplierRemove({ gIdx });
      return;
    }
    applySupplierChange(gIdx, null);
  };

  const handleRemoveItemClick = (gIdx, iIdx) => {
    if ((groups.at(gIdx)?.items || []).length > 1) {
      setItemRemove({ gIdx, iIdx });
      return;
    }
    removeItem(gIdx, iIdx);
  };

  const handleRemoveGroupClick = (gIdx) => {
    if (groups.length > 1) {
      setGroupRemove({ gIdx });
      return;
    }
    removeGroup(gIdx);
  };

  const pickItemOption = (gIdx, iIdx, value) => {
    setGroups((prev) =>
      prev.map((g, gi) => {
        if (gi !== gIdx) return g;
        const list = supplierItemsBySupplier[g.supplier] || [];
        const opt = list.find((o) => o.value === value);
        return {
          ...g,
          items: g.items.map((it, ii) => {
            if (ii !== iIdx) return it;
            if (!opt) {
              return {
                ...it,
                name: "",
                product: null,
                productName: null,
                ingredient: null,
                ingredientName: null
              };
            }
            return {
              ...it,
              name: opt.name,
              product: opt.productId,
              productName: opt.name,
              ingredient: null,
              ingredientName: null,
              unit: opt.unit || it.unit,
              price: opt.price
            };
          })
        };
      })
    );
  };

  const queryClient = useQueryClient();

  const updateMutation = useMutation((payload) => editPurchaseOrder(id, payload), {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.purchaseOrder.edit.toast.poUpdated")
      });
      queryClient.invalidateQueries(["purchase-orders"]);
      navigate("/purchase-order");
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const selectPic = (e) => {
    setPicSearch(e.fullName || e.userName);
    setPicId(e.id || e._id);
    setShowPicList(false);
  };

  const formatIDR = (num) => {
    if (!num && num !== 0) return "";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };

  const parseIDR = (str) => {
    if (!str) return 0;
    return Number(str.replace(/[^0-9.]/g, "").replace(/\./g, "")) || 0;
  };

  const totalAmount = useMemo(
    () => groups.flatMap((g) => g.items).reduce((sum, item) => sum + item.qty * item.price, 0),
    [groups]
  );
  // Preview only — BE remains authoritative and recomputes taxAmount/
  // finalAmount from taxRate server-side (Phase 22 Batch 2).
  const taxableBase = totalAmount - discount;
  const taxAmount = Math.round(taxableBase * ((Number(taxRate) || 0) / 100));
  const finalAmount = taxableBase + taxAmount + additionalCost;

  const hasDuplicateItems = useMemo(() => {
    const seen = new Set();
    return allFilledItems.some((it) => {
      const key = `${it.product || it.ingredient || it.name.toLowerCase()}-sup-${it.supplier || ""}`;
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });
  }, [allFilledItems]);

  const [errors, setErrors] = useState({});

  const handleSubmit = (e, saveAsDraft = false) => {
    if (e?.preventDefault) e.preventDefault();
    setErrors({});
    if (!selectedStore) {
      toast.error(t("page.purchaseOrder.edit.validation.store"), {
        description: t("page.purchaseOrder.edit.validation.storeDesc")
      });
      return;
    }
    if (!picId) {
      toast.error(t("page.purchaseOrder.edit.validation.pic"), {
        description: t("page.purchaseOrder.edit.validation.picDesc")
      });
      return;
    }
    if (!orderDate) {
      toast.error(t("page.purchaseOrder.edit.validation.orderDate"), {
        description: t("page.purchaseOrder.edit.validation.orderDateDesc")
      });
      return;
    }
    if (!orderTime) {
      toast.error(t("page.purchaseOrder.edit.validation.orderTime"), {
        description: t("page.purchaseOrder.edit.validation.orderTimeDesc")
      });
      return;
    }
    if (paymentMethod === "credit" && !dueDate) {
      setErrors((prev) => ({ ...prev, dueDate: t("page.purchaseOrder.add.validation.dueDate") }));
      toast.error(t("page.purchaseOrder.edit.validation.dueDate"), {
        description: t("page.purchaseOrder.edit.validation.dueDateDesc")
      });
      return;
    }
    if (allFilledItems.length === 0) {
      toast.error(t("page.purchaseOrder.edit.validation.items"), {
        description: t("page.purchaseOrder.edit.validation.itemsDesc")
      });
      return;
    }
    if (!saveAsDraft && hasDuplicateItems) {
      toast.error(t("page.purchaseOrder.add.validation.duplicateItems"), {
        description: t("page.purchaseOrder.add.validation.duplicateItemsDesc")
      });
      return;
    }
    if (!saveAsDraft && allFilledItems.some((it) => !it.supplier)) {
      toast.error(t("page.purchaseOrder.add.validation.validationFailed"), {
        description: t("page.purchaseOrder.add.toast.supplierRequired")
      });
      return;
    }

    const itemsPayload = [];
    groups.forEach((g) => {
      g.items.forEach((it) => {
        if (!saveAsDraft && !it.name.trim()) return;
        itemsPayload.push({
          product: it.product || null,
          ingredient: it.ingredient || null,
          ingredientName: it.ingredientName || it.productName || it.name || null,
          quantity: it.qty,
          price: it.price || 0,
          unit: it.unit || "pcs",
          conversionToBase: Number(it.conversionToBase) || 1,
          supplier: g.supplier || null
        });
      });
    });

    // T-11 lifecycle: only draft->pending via update is allowed; all other status changes use dedicated endpoints
    const isActivatingDraft = !saveAsDraft && po.status === "draft";
    const payload = {
      store: selectedStore,
      notes,
      pic: picId,
      discount,
      taxRate,
      additionalCost,
      additionalCostNotes: additionalCostNotes || null,
      overDeliveryTolerance,
      dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      paymentMethod,
      tenor: paymentMethod === "credit" ? tenor : 0,
      dpPercent: paymentMethod === "credit" ? dpPercent : 0,
      orderDate: (() => {
        const d = new Date(orderDate);
        const [hours, minutes] = (orderTime || "00:00").split(":");
        d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return d;
      })(),
      items: itemsPayload,
      ...(isActivatingDraft ? { status: "pending" } : {}),
      ...(saveAsDraft && po.status === "draft" ? { status: "draft" } : {})
    };

    updateMutation.mutate(normalizePayload(payload, { isFormData: false }));
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.purchaseOrder.detail.idNotFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (!po) {
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
            { label: t("page.purchaseOrder.edit.title") }
          ]}
          title={t("page.purchaseOrder.edit.title")}
          description={t("page.purchaseOrder.edit.description")}
          backLink="/purchase-order">
          <Skeleton className="h-9 w-28" />
        </PageHeader>

        <Card className="overflow-hidden border-0 shadow-md rounded-xl">
          <Skeleton className="h-14 rounded-none" />
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md rounded-xl">
          <Skeleton className="h-14 rounded-none" />
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md rounded-xl">
          <Skeleton className="h-20 rounded-none" />
        </Card>
      </div>
    );
  }

  return (
    <div ref={dirtyRef} className="space-y-6">
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
            label: t("page.purchaseOrder.edit.title"),
            i18nKey: "page.purchaseOrder.edit.title"
          }
        ]}
        title={`${t("page.purchaseOrder.edit.editLabel")} ${po.orderNumber || `PO-${po.id}`}`}
        description={t("page.purchaseOrder.edit.description")}
        backLink="/purchase-order"
        onBack={requestLeave}>
        <UserGuide guideKey="edit-purchase-order" />
      </PageHeader>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.purchaseOrder.add.store")} <span className="text-destructive">*</span>
                </label>
                <Combobox
                  options={[
                    { value: "", label: t("page.purchaseOrder.add.selectStore") },
                    ...locations.map((loc) => ({ value: loc.id, label: loc.name }))
                  ]}
                  value={selectedStore}
                  onChange={(val) => {
                    if (isSuperAdmin && val !== selectedStore) {
                      setPendingStore(val);
                      setStoreChangeModal(true);
                    } else {
                      setSelectedStore(val);
                    }
                    setErrors((prev) => ({ ...prev, store: undefined }));
                  }}
                  disabled={!isSuperAdmin}
                  placeholder={t("page.purchaseOrder.add.selectStore")}
                  searchPlaceholder={t("page.purchaseOrder.add.selectStore")}
                />
                {errors.store && <p className="text-xs text-destructive mt-1">{errors.store}</p>}
              </div>
              <div className="relative">
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.purchaseOrder.add.pic")} <span className="text-destructive">*</span>
                </label>
                {employees.length === 0 && !employeesLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        {t("page.purchaseOrder.add.noEmployee")}
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
                      <Plus size={18} /> {t("page.purchaseOrder.add.addEmployee")}
                    </Button>
                  </div>
                ) : (
                  <>
                    {employeesLoading && !picId ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Input
                        placeholder={t("page.purchaseOrder.add.picPlaceholder")}
                        value={picSearch}
                        onChange={(e) => {
                          setPicSearch(e.target.value);
                          setPicId(null);
                          setShowPicList(true);
                          setErrors((prev) => ({ ...prev, pic: undefined }));
                        }}
                        onFocus={() => setShowPicList(true)}
                        onBlur={() => setTimeout(() => setShowPicList(false), 200)}
                        className={`h-10 ${errors.pic ? "border-destructive" : ""}`}
                      />
                    )}
                    {errors.pic && <p className="text-xs text-destructive mt-1">{errors.pic}</p>}
                    {showPicList && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map((e) => (
                            <button
                              key={e.id || e._id}
                              type="button"
                              onMouseDown={() => selectPic(e)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors">
                              {e.fullName || e.userName}
                            </button>
                          ))
                        ) : picSearch ? (
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
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.purchaseOrder.add.poDate")} <span className="text-destructive">*</span>
                </label>
                <DatePicker
                  date={orderDate}
                  setDate={(d) => {
                    setOrderDate(d);
                    setErrors((prev) => ({ ...prev, orderDate: undefined }));
                  }}
                />
                {errors.orderDate && (
                  <p className="text-xs text-destructive mt-1">{errors.orderDate}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.purchaseOrder.add.time")} <span className="text-destructive">*</span>
                </label>
                <TimePicker
                  value={orderTime}
                  onChange={(v) => {
                    setOrderTime(v);
                    setErrors((prev) => ({ ...prev, orderTime: undefined }));
                  }}
                />
                {errors.orderTime && (
                  <p className="text-xs text-destructive mt-1">{errors.orderTime}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.purchaseOrder.add.paymentMethod")}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Combobox
                  options={[
                    { value: "cash", label: t("page.purchaseOrder.add.paymentMethodCash") },
                    { value: "credit", label: t("page.purchaseOrder.add.paymentMethodCredit") }
                  ]}
                  value={paymentMethod}
                  onChange={(val) => {
                    setPaymentMethod(val);
                    if (val === "cash") {
                      setTenor(0);
                      setDpPercent(0);
                      setDueDate(null);
                    }
                  }}
                  placeholder={t("page.purchaseOrder.add.paymentMethodCash")}
                  searchPlaceholder={t("page.purchaseOrder.add.paymentMethodCash")}
                />
              </div>
              {paymentMethod === "credit" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    {t("page.purchaseOrder.add.dpPercent")}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder={t("page.purchaseOrder.add.dpPercentPlaceholder")}
                    value={dpPercent || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 0 && val <= 100) setDpPercent(val);
                    }}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("page.purchaseOrder.add.dpPercentHint")}
                  </p>
                  {dpPercent > 0 && (
                    <p className="text-xs text-primary font-medium mt-1">
                      {t("page.purchaseOrder.add.dpAmount")}: Rp{" "}
                      {((finalAmount * dpPercent) / 100).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
              )}
              {paymentMethod === "credit" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    {t("page.purchaseOrder.add.dueDate")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <DatePicker
                    date={dueDate}
                    setDate={(d) => {
                      setDueDate(d);
                      setErrors((prev) => ({ ...prev, dueDate: undefined }));
                    }}
                  />
                  {errors.dueDate && (
                    <p className="text-xs text-destructive mt-1">{errors.dueDate}</p>
                  )}
                </div>
              )}
              {paymentMethod === "credit" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    {t("page.purchaseOrder.add.tenor")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder={t("page.purchaseOrder.add.tenorPlaceholder")}
                    value={tenor || ""}
                    onChange={(e) => setTenor(Number(e.target.value) || 0)}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("page.purchaseOrder.add.tenorHint")}
                  </p>
                </div>
              )}
              {/* ponytail: info permintaan barang jika PO berasal dari goods request */}
              {goodsRequestData && (
                <div className="md:col-span-2">
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <ShoppingCart size={14} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                          {t("page.purchaseOrder.edit.fromGoodsRequest")}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {goodsRequestData.requestNumber}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-blue-500 dark:text-blue-400 mb-0.5">
                          {t("page.purchaseOrder.edit.requestedBy")}
                        </p>
                        <p className="font-medium text-blue-800 dark:text-blue-300">
                          {goodsRequestData.requestedBy || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-500 dark:text-blue-400 mb-0.5">
                          {t("page.purchaseOrder.edit.requestDate")}
                        </p>
                        <p className="font-medium text-blue-800 dark:text-blue-300">
                          {goodsRequestData.requestDate
                            ? format(new Date(goodsRequestData.requestDate), "dd MMM yyyy")
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-500 dark:text-blue-400 mb-0.5">
                          {t("page.purchaseOrder.edit.neededDate")}
                        </p>
                        <p className="font-medium text-blue-800 dark:text-blue-300">
                          {goodsRequestData.neededDate
                            ? format(new Date(goodsRequestData.neededDate), "dd MMM yyyy")
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-500 dark:text-blue-400 mb-0.5">
                          {t("page.purchaseOrder.edit.grStatus")}
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold capitalize bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {goodsRequestData.status}
                        </span>
                      </div>
                    </div>
                    {goodsRequestData.items && goodsRequestData.items.length > 0 && (
                      <div className="border-t border-blue-200 dark:border-blue-800 pt-2">
                        <p className="text-xs text-blue-500 dark:text-blue-400 font-medium uppercase tracking-wider mb-1.5">
                          {t("page.purchaseOrder.edit.requestedItems")}
                        </p>
                        <div className="space-y-1">
                          {goodsRequestData.items.map((grItem, grIdx) => (
                            <div key={grIdx} className="flex items-center justify-between text-xs">
                              <span className="text-blue-800 dark:text-blue-300">
                                {grItem.ingredientName || grItem.productName || "-"}
                              </span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                {grItem.qty} {grItem.unit}
                                {grItem.notes ? ` · ${grItem.notes}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {goodsRequestData.notes && (
                      <div className="border-t border-blue-200 dark:border-blue-800 pt-2">
                        <p className="text-xs text-blue-500 dark:text-blue-400 font-medium uppercase tracking-wider mb-0.5">
                          {t("page.purchaseOrder.edit.grNotes")}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {goodsRequestData.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("page.purchaseOrder.add.notes")}
                </label>
                <Textarea
                  placeholder={t("page.purchaseOrder.add.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={FIELD_LIMITS.DESCRIPTION}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md rounded-xl">
          <div className="bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {t("page.purchaseOrder.add.itemSection")}
                </h3>
                <p className="text-xs text-emerald-100">
                  {t("page.purchaseOrder.add.itemSectionDesc")}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {errors.items && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                  <span className="text-xs text-destructive font-medium">{errors.items}</span>
                </div>
              )}
              {hasDuplicateItems && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-950/20 dark:border-amber-800">
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {t("page.purchaseOrder.add.validation.duplicateItems")}
                  </span>
                </div>
              )}

              {groups.map((group, gIdx) => (
                <div key={gIdx} className="border rounded-lg overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b bg-muted/40">
                    <Label className="shrink-0 text-xs text-muted-foreground">
                      {t("page.purchaseOrder.add.table.supplier")}
                    </Label>
                    <div className="flex-1 min-w-[220px]">
                      <Combobox
                        options={supplierOptions}
                        value={group.supplier ? String(group.supplier) : ""}
                        onChange={(val) => pickGroupSupplier(gIdx, val)}
                        onClear={() => handleClearSupplierClick(gIdx)}
                        placeholder={t("page.purchaseOrder.add.selectSupplier")}
                        searchPlaceholder={t("common.search")}
                        emptyMessage={t("page.purchaseOrder.add.noSupplierFound")}
                        disabled={!selectedStore || suppliersLoading || !!goodsRequestData}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveGroupClick(gIdx)}
                      disabled={groups.length === 1 || !!goodsRequestData}>
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  {group.supplier &&
                  (supplierItemsBySupplier[group.supplier] || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Package size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {t("page.purchaseOrder.add.supplierNoItems")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.purchaseOrder.add.supplierNoItemsDesc")}
                      </p>
                    </div>
                  ) : (
                    <>
                      <HorizontalScrollArea>
                        <table className="w-full text-sm min-w-[820px]">
                          <thead>
                            <tr className="border-b">
                              <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                                {t("page.purchaseOrder.add.table.name")}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                                {t("page.purchaseOrder.add.table.qty")}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                                {t("page.purchaseOrder.add.table.unit")}
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                                {t("page.purchaseOrder.add.table.price")}
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                                {t("page.purchaseOrder.add.table.subtotal")}
                              </th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item, iIdx) => (
                              <tr key={iIdx} className="border-b border-muted/20">
                                <td className="px-3 py-2 min-w-[280px]">
                                  <Combobox
                                    options={itemOptionsForRow(gIdx, iIdx, group.supplier)}
                                    value={selectedItemValue(item, group.supplier)}
                                    onChange={(val) => pickItemOption(gIdx, iIdx, val)}
                                    placeholder={
                                      group.supplier
                                        ? t("page.purchaseOrder.add.placeholder.selectItem")
                                        : t("page.purchaseOrder.add.selectSupplierFirst")
                                    }
                                    searchPlaceholder={t("common.search")}
                                    emptyMessage={t("page.purchaseOrder.add.noIngredientFound")}
                                    disabled={!group.supplier}
                                  />
                                  {item.name && !selectedItemValue(item, group.supplier) && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      {item.name}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.qty === 0 ? "" : String(item.qty)}
                                    onChange={(e) =>
                                      updateItem(
                                        gIdx,
                                        iIdx,
                                        "qty",
                                        Number(
                                          e.target.value
                                            .replace(/[^0-9.]/g, "")
                                            .replace(/(\..*)\./g, "$1")
                                        ) || 0
                                      )
                                    }
                                    className="h-8 text-xs text-center w-20 mx-auto"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <div className="flex justify-center">
                                    <Combobox
                                      options={unitOptions.map((opt) => ({
                                        value: opt.value,
                                        label: opt.label
                                      }))}
                                      value={item.unit}
                                      onChange={(val) => updateItem(gIdx, iIdx, "unit", val)}
                                      placeholder="pcs"
                                      searchPlaceholder={t("common.search")}
                                    />
                                  </div>
                                  <div className="mt-1">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={
                                        item.conversionToBase ? String(item.conversionToBase) : "1"
                                      }
                                      onChange={(e) =>
                                        updateItem(
                                          gIdx,
                                          iIdx,
                                          "conversionToBase",
                                          Number(e.target.value.replace(/[^0-9.]/g, "")) || 1
                                        )
                                      }
                                      className="h-7 text-xs text-center"
                                      title={t("page.purchaseOrder.add.conversionPlaceholder", {
                                        unit: item.unit || "pcs"
                                      })}
                                      aria-label={t(
                                        "page.purchaseOrder.add.conversionPlaceholder",
                                        {
                                          unit: item.unit || "pcs"
                                        }
                                      )}
                                    />
                                    <p className="text-xs text-muted-foreground text-center mt-0.5">
                                      {t("page.purchaseOrder.add.conversionPlaceholder", {
                                        unit: item.unit || "pcs"
                                      })}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    placeholder={t("page.purchaseOrder.add.rpPlaceholder")}
                                    value={item.price ? formatIDR(item.price) : ""}
                                    onChange={(e) =>
                                      updateItem(gIdx, iIdx, "price", parseIDR(e.target.value))
                                    }
                                    className="h-8 text-xs text-right w-36 ml-auto"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-foreground">
                                      Rp {(item.qty * item.price).toLocaleString("id-ID")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.qty} x {formatIDR(item.price)}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemClick(gIdx, iIdx)}
                                    disabled={group.items.length === 1 || !!goodsRequestData}
                                    className="text-muted-foreground/40 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground/40">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </HorizontalScrollArea>

                      <div className="p-3 border-t">
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          onClick={() => addItem(gIdx)}
                          disabled={!!goodsRequestData}
                          className="gap-1">
                          <Plus size={14} /> {t("page.purchaseOrder.add.form.addItem")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="success"
                size="sm"
                onClick={addGroup}
                disabled={!selectedStore || suppliersLoading || !!goodsRequestData}
                className="gap-1">
                <Plus size={14} /> {t("page.purchaseOrder.add.form.addSupplier")}
              </Button>

              <div className="rounded-xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/60 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 justify-end">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 sm:pt-1">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                        {t("page.purchaseOrder.add.discount")}
                      </Label>
                      <Input
                        placeholder={t("page.purchaseOrder.add.rpPlaceholder")}
                        value={discount ? formatIDR(discount) : ""}
                        onChange={(e) => setDiscount(parseIDR(e.target.value))}
                        className="h-9 text-sm w-32 sm:w-36 text-right"
                        disabled={hasFinancialLock}
                        title={
                          hasFinancialLock
                            ? t("page.purchaseOrder.edit.lockedAfterReceipt")
                            : undefined
                        }
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                        {t("page.purchaseOrder.add.taxRate")}
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={taxRate || ""}
                        onChange={(e) =>
                          setTaxRate(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)
                        }
                        className="h-9 text-sm w-20 text-right"
                        disabled={hasFinancialLock}
                        title={
                          hasFinancialLock
                            ? t("page.purchaseOrder.edit.lockedAfterReceipt")
                            : undefined
                        }
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                        {t("page.purchaseOrder.add.additionalCost")}
                      </Label>
                      <Input
                        placeholder={t("page.purchaseOrder.add.rpPlaceholder")}
                        value={additionalCost ? formatIDR(additionalCost) : ""}
                        onChange={(e) => setAdditionalCost(parseIDR(e.target.value))}
                        className="h-9 text-sm w-32 sm:w-36 text-right"
                        disabled={hasFinancialLock}
                        title={
                          hasFinancialLock
                            ? t("page.purchaseOrder.edit.lockedAfterReceipt")
                            : undefined
                        }
                      />
                    </div>
                    {additionalCost > 0 && (
                      <div className="flex items-center gap-3">
                        <Label className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                          {t("page.purchaseOrder.add.additionalCostNotes")}
                        </Label>
                        <Input
                          placeholder={t("page.purchaseOrder.add.additionalCostNotesPlaceholder")}
                          value={additionalCostNotes}
                          onChange={(e) => setAdditionalCostNotes(e.target.value)}
                          className="h-9 text-sm flex-1 min-w-[160px]"
                          disabled={hasFinancialLock}
                          maxLength={FIELD_LIMITS.SHORT_NOTE}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                        {t("page.purchaseOrder.add.overDeliveryTolerance")}
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={overDeliveryTolerance || ""}
                        onChange={(e) =>
                          setOverDeliveryTolerance(
                            Number(e.target.value.replace(/[^0-9.]/g, "")) || 0
                          )
                        }
                        className="h-9 text-sm w-20 text-right"
                        disabled={hasFinancialLock}
                        title={
                          hasFinancialLock
                            ? t("page.purchaseOrder.edit.lockedAfterReceipt")
                            : undefined
                        }
                      />
                    </div>
                  </div>
                  <div className="flex-1 max-w-[280px] ml-auto">
                    <div className="text-right space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t("page.purchaseOrder.add.totalPrice")}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">
                        Rp {totalAmount.toLocaleString("id-ID")}
                      </p>
                    </div>
                    {(discount > 0 || taxAmount > 0 || additionalCost > 0) && (
                      <>
                        <div className="border-t border-border/60 my-2" />
                        <div className="text-right space-y-0.5">
                          {discount > 0 && (
                            <p className="text-xs font-medium text-destructive">
                              {t("page.purchaseOrder.add.discountLabel")} - Rp{" "}
                              {discount.toLocaleString("id-ID")}
                            </p>
                          )}
                          {taxAmount > 0 && (
                            <p className="text-xs font-medium text-foreground">
                              {t("page.purchaseOrder.add.taxLabel", { rate: taxRate })} + Rp{" "}
                              {taxAmount.toLocaleString("id-ID")}
                            </p>
                          )}
                          {additionalCost > 0 && (
                            <p className="text-xs font-medium text-emerald-600">
                              {t("page.purchaseOrder.add.additionalCostLabel")} + Rp{" "}
                              {additionalCost.toLocaleString("id-ID")}
                            </p>
                          )}
                          <p className="text-base sm:text-lg font-bold text-foreground">
                            Rp {finalAmount.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ponytail: mobile = 3 tombol setara memenuhi lebar; desktop
                tetap satu baris justify-between */}
        <div className="sticky bottom-4 flex flex-wrap justify-between items-center gap-3 bg-card border border-border/60 shadow-lg rounded-xl p-4 backdrop-blur-sm">
          <Button
            type="button"
            variant="danger"
            onClick={requestLeave}
            className="gap-2 flex-1 sm:flex-none">
            <X size={18} />
            {t("common.cancel")}
          </Button>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">
                {t("page.purchaseOrder.add.totalAfterDiscount")}
              </p>
              <p className="text-sm font-semibold">
                Rp{" "}
                {(discount > 0 || taxAmount > 0 || additionalCost > 0
                  ? finalAmount
                  : totalAmount
                ).toLocaleString("id-ID")}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="draft"
                onClick={() => setDraftModal(true)}
                disabled={updateMutation.isLoading}
                className="flex-1 sm:flex-none">
                {t("page.purchaseOrder.add.saveDraft")}
              </Button>
              <Button
                variant="success"
                type="button"
                disabled={updateMutation.isLoading}
                className="gap-2 flex-1 sm:flex-none min-w-0 sm:min-w-[140px] shadow-md"
                onClick={() => {
                  const missing = getMissingFields(
                    {
                      store: Number(selectedStore) || 0,
                      pic: picId,
                      orderDate,
                      orderTime,
                      dueDate,
                      items: allFilledItems.map((it) => ({
                        name: it.name,
                        qty: it.qty,
                        price: it.price,
                        unit: it.unit
                      }))
                    },
                    poSchema,
                    poFieldLabels
                  );
                  if (missing.length > 0) {
                    setMissingFieldsList(missing);
                    setMissingFieldsModal(true);
                    return;
                  }
                  setConfirmModal(true);
                }}>
                <Save size={18} />
                {updateMutation.isLoading
                  ? t("common.saving")
                  : t("page.purchaseOrder.edit.saveChanges")}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.purchaseOrder.add.draftModalTitle")}
        description={t("page.purchaseOrder.add.draftModalDesc")}
        confirmText={t("page.purchaseOrder.add.draftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          handleSubmit(null, true);
        }}
      />
      <Modal
        type="confirm"
        open={storeChangeModal}
        onOpenChange={(open) => {
          setStoreChangeModal(open);
          if (!open) setPendingStore(null);
        }}
        title={t("page.purchaseOrder.edit.storeChangeTitle")}
        description={t("page.purchaseOrder.edit.storeChangeDesc")}
        confirmText={t("page.purchaseOrder.edit.storeChangeConfirm")}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          setSelectedStore(pendingStore);
          setPendingStore(null);
          setStoreChangeModal(false);
        }}
        onCancel={() => {
          setPendingStore(null);
          setStoreChangeModal(false);
        }}
      />
      <Modal
        type="confirm"
        open={!!supplierChange}
        onOpenChange={(open) => {
          if (!open) setSupplierChange(null);
        }}
        title={t("page.purchaseOrder.add.changeSupplierTitle")}
        description={t("page.purchaseOrder.add.changeSupplierDesc")}
        confirmText={t("common.yes") || "Ya"}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          if (supplierChange) applySupplierChange(supplierChange.gIdx, supplierChange.supplierId);
          setSupplierChange(null);
        }}
      />
      <Modal
        type="confirm"
        open={!!supplierRemove}
        onOpenChange={(open) => {
          if (!open) setSupplierRemove(null);
        }}
        title={t("page.purchaseOrder.add.removeSupplierTitle")}
        description={t("page.purchaseOrder.add.removeSupplierDesc")}
        confirmText={t("common.yes") || "Ya"}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          if (supplierRemove) applySupplierChange(supplierRemove.gIdx, null);
          setSupplierRemove(null);
        }}
      />
      <Modal
        type="confirm"
        open={!!itemRemove}
        onOpenChange={(open) => {
          if (!open) setItemRemove(null);
        }}
        title={t("page.purchaseOrder.add.deleteItemTitle")}
        description={t("page.purchaseOrder.add.deleteItemDesc")}
        confirmText={t("common.yes") || "Ya"}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          if (itemRemove) removeItem(itemRemove.gIdx, itemRemove.iIdx);
          setItemRemove(null);
        }}
      />
      <Modal
        type="confirm"
        open={!!groupRemove}
        onOpenChange={(open) => {
          if (!open) setGroupRemove(null);
        }}
        title={t("page.purchaseOrder.add.deleteSupplierGroupTitle")}
        description={t("page.purchaseOrder.add.deleteSupplierGroupDesc")}
        confirmText={t("common.yes") || "Ya"}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          if (groupRemove) removeGroup(groupRemove.gIdx);
          setGroupRemove(null);
        }}
      />
      <Modal
        type="confirm"
        open={confirmModal}
        onOpenChange={setConfirmModal}
        title={t("page.purchaseOrder.add.confirmTitle") || "Simpan Perubahan?"}
        description={
          t("page.purchaseOrder.add.confirmDesc") ||
          "Pastikan data yang diubah sudah benar sebelum menyimpan."
        }
        confirmText={t("common.yes") || "Ya"}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          setConfirmModal(false);
          handleSubmit(null, false);
        }}
      />
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFieldsList}
      />
      {updateMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}
      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />
    </div>
  );
};

export default EditPurchaseOrder;

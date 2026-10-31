import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { addPurchaseOrder } from "@/services/purchase-order";
import { getAllSupplier } from "@/services/supplier";
import { getAllIngredients } from "@/services/ingredient";
import { getAllEmployee } from "@/services/employee";
import { normalizeStoreId, storeIdsEqual } from "@/utils/storeId";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { useLocations } from "@/queries/useLocations";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";
import { useSingleStore } from "@/hooks/useSingleStore";
import PoHeaderCard from "./PoHeaderCard";
import PoItemsCard from "./PoItemsCard";
import PoActionBar from "./PoActionBar";
import PoItemConfirmDialogs from "./PoItemConfirmDialogs";
import {
  EMPTY_ITEM,
  buildItemsPayload,
  buildPoFieldLabels,
  buildPoSchema,
  combineDateTime,
  emptyGroup,
  hasDuplicateItems,
  isDiscountOverTotal,
  isFilledItem,
  poSchemaInput,
  poTotals
} from "./poForm";
import { usePoHeaderState } from "./usePoHeaderState";
import { usePoItemGroups } from "./usePoItemGroups";

const LIST_LIMIT = 999;
const CACHE_TIME = 30000;

const initialGroupsFrom = (prefillNames, prefillSupplier) => {
  const supplier = prefillSupplier ? Number(prefillSupplier) : null;
  if (prefillNames.length > 0) {
    return [
      {
        supplier,
        items: prefillNames.map((name) => ({ ...EMPTY_ITEM, name, ingredientName: name }))
      }
    ];
  }
  if (supplier) return [{ supplier, items: [{ ...EMPTY_ITEM }] }];
  return [emptyGroup()];
};

const groupsFromPrefill = (prefillNames, ingredients) => {
  const byName = Object.fromEntries(
    ingredients
      .filter((ing) => ing?.name)
      .map((ing) => [String(ing.name).trim().toLowerCase(), ing])
  );
  const bySupplier = new Map();
  const unassigned = [];
  prefillNames.forEach((raw) => {
    const name = raw.trim();
    const ing = Object.hasOwn(byName, name.toLowerCase()) ? byName[name.toLowerCase()] : undefined;
    if (!ing?.supplier) {
      unassigned.push({ ...EMPTY_ITEM, name, ingredientName: name });
      return;
    }
    const supplierId = String(ing.supplier);
    if (!bySupplier.has(supplierId)) bySupplier.set(supplierId, []);
    bySupplier.get(supplierId).push({
      ...EMPTY_ITEM,
      name: ing.name,
      ingredient: ing.id,
      ingredientName: ing.name,
      unit: ing.unit || "pcs",
      price: Number(ing.costPrice) || 0,
      qty: Math.max(Number(ing.minStock) - Number(ing.stock), 1)
    });
  });
  const resolved = [...bySupplier.entries()].map(([supplierId, items]) => ({
    supplier: Number(supplierId),
    items
  }));
  if (unassigned.length > 0) resolved.push({ supplier: null, items: unassigned });
  if (resolved.length === 0) resolved.push(emptyGroup());
  return { groups: resolved, hasUnassigned: unassigned.length > 0 };
};

const firstSchemaErrors = (result) => {
  const entries = [];
  result.error.errors.forEach((err) => {
    const path = err.path[0];
    if (!entries.some(([k]) => k === path)) entries.push([path, err.message]);
  });
  return entries;
};

const AddPurchaseOrderSkeleton = () => (
  <div className="space-y-6">
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

const AddPurchaseOrder = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { setActiveStore } = useStore();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const prefillNames = useMemo(() => {
    const raw = searchParams.get("ingredients");
    if (!raw) return [];
    return raw
      .split(",")
      .filter(Boolean)
      .map((n) => decodeURIComponent(n.trim()));
  }, [searchParams]);
  const prefillSupplier = searchParams.get("supplier");
  const lockedStore = searchParams.get("store");

  const poFieldLabels = buildPoFieldLabels(t);
  const poSchema = buildPoSchema(t, { isPicRequired: false });

  const header = usePoHeaderState({
    initialStore: isSuperAdmin
      ? normalizeStoreId(searchParams.get("store"))
      : normalizeStoreId(user?.store),
    initialOrderDate: new Date()
  });
  const { selectedStore } = header;

  // One store: preselect it instead of asking for a choice with one answer.
  const singleStore = useSingleStore();
  useEffect(() => {
    if (singleStore && !selectedStore) header.setSelectedStore(String(singleStore.id));
  }, [singleStore, selectedStore]);

  const [cancelModal, setCancelModal] = useState(false);
  const { request: requestLeave, leave } = useFormExit("/purchase-order", () =>
    setCancelModal(true)
  );
  const [draftModal, setDraftModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [storeChange, setStoreChange] = useState(null);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery(
    ["suppliers-dropdown", selectedStore],
    () =>
      getAllSupplier({
        limit: LIST_LIMIT,
        store: selectedStore,
        status: "active",
        includeProducts: true
      }),
    { enabled: !!selectedStore, staleTime: CACHE_TIME }
  );
  const suppliers = useMemo(() => suppliersData?.data || [], [suppliersData]);

  const groupsApi = usePoItemGroups({
    initialGroups: initialGroupsFrom(prefillNames, prefillSupplier),
    suppliers
  });
  const { groups, setGroups } = groupsApi;

  const { data: prefillData } = useQuery(
    ["ingredients-prefill", selectedStore],
    () =>
      getAllIngredients({ limit: LIST_LIMIT, status: "active", store: selectedStore || undefined }),
    { enabled: !!selectedStore && prefillNames.length > 0, staleTime: CACHE_TIME }
  );
  const prefillIngredients = prefillData?.data;
  const prefillResolved = useRef(false);

  useEffect(() => {
    if (prefillResolved.current || prefillNames.length === 0) return;
    if (prefillIngredients === undefined) return;
    prefillResolved.current = true;
    const resolved = groupsFromPrefill(prefillNames, prefillIngredients || []);
    setGroups(resolved.groups);
    if (resolved.hasUnassigned) toast.info(t("page.purchaseOrder.add.prefillNoSupplier"));
  }, [prefillIngredients, prefillNames]);

  const { data: employeesData, isLoading: employeesLoading } = useQuery(
    ["employees-dropdown", selectedStore],
    () =>
      getAllEmployee({ limit: LIST_LIMIT, status: "active", location: selectedStore || undefined }),
    { enabled: !!selectedStore, staleTime: CACHE_TIME }
  );
  const employees = employeesData?.data || [];

  const { data: locationsData, isLoading: locationsLoading } = useLocations("active", {
    staleTime: CACHE_TIME
  });
  const locations = locationsData?.data || [];
  const storeOptions = [
    { value: "", label: t("page.purchaseOrder.add.selectStore") },
    ...locations.map((loc) => ({ value: normalizeStoreId(loc.id), label: loc.name }))
  ];

  useEffect(() => {
    header.resetPic();
  }, [selectedStore]);

  useEffect(() => {
    const firstSupplierId = groups[0]?.supplier;
    if (!firstSupplierId) return;
    const supplier = suppliers.find((s) => s.id === firstSupplierId);
    if (!supplier) return;
    const mappedMethod = supplier.paymentType === "cad" ? "credit" : "cash";
    header.setPaymentMethod(mappedMethod);
    if (mappedMethod === "credit") header.setTenor(supplier.tempoDays || 0);
    else header.resetCredit();
  }, [groups[0]?.supplier, suppliers]);

  // Suppliers and items are scoped to the store, so a store change wipes
  // them. Ask first when any of them is already filled.
  const applyStoreChange = (storeId) => {
    header.setSelectedStore(storeId);
    setGroups([emptyGroup()]);
    header.clearError("store");
  };

  const pickStore = (storeId) => {
    if (storeId === selectedStore) return;
    const hasFilledGroups = groups.some((g) => g.supplier || (g.items || []).some(isFilledItem));
    if (hasFilledGroups) {
      setStoreChange({ storeId });
      return;
    }
    applyStoreChange(storeId);
  };

  const createMutation = useMutation(addPurchaseOrder, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["purchase-orders"]);
      setShowSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const totals = poTotals({
    groups,
    discount: header.discount,
    taxRate: header.taxRate,
    additionalCost: header.additionalCost
  });

  const validateFinal = () => {
    const filledItems = groupsApi.filledItems;
    if (hasDuplicateItems(filledItems)) {
      toast.error(t("page.purchaseOrder.add.validation.duplicateItems"), {
        description: t("page.purchaseOrder.add.validation.duplicateItemsDesc")
      });
      return false;
    }
    if (filledItems.some((it) => !it.supplier)) {
      toast.error(t("page.purchaseOrder.add.validation.validationFailed"), {
        description: t("page.purchaseOrder.add.toast.supplierRequired")
      });
      return false;
    }
    if (header.paymentMethod === "credit" && !header.dueDate) {
      header.setErrors((prev) => ({
        ...prev,
        dueDate: t("page.purchaseOrder.add.validation.dueDate")
      }));
      toast.error(t("page.purchaseOrder.add.validation.validationFailed"), {
        description: t("page.purchaseOrder.add.validation.dueDate")
      });
      return false;
    }
    const result = poSchema.safeParse(poSchemaInput(header, filledItems));
    if (result.success) return true;
    const entries = firstSchemaErrors(result);
    header.setErrors(Object.fromEntries(entries));
    toast.error(t("page.purchaseOrder.add.validation.validationFailed"), {
      description: entries[0]?.[1]
    });
    return false;
  };

  const handleSubmit = (saveAsDraft) => {
    header.setErrors({});
    if (isDiscountOverTotal({ discount: header.discount, totalAmount: totals.totalAmount })) {
      toast.error(t("page.purchaseOrder.add.validation.validationFailed"), {
        description: t("page.purchaseOrder.add.validation.discountExceedsTotal")
      });
      return;
    }
    if (!saveAsDraft && !validateFinal()) return;
    const isCredit = header.paymentMethod === "credit";
    createMutation.mutate({
      store: selectedStore,
      notes: header.notes,
      discount: header.discount,
      taxRate: header.taxRate,
      additionalCost: header.additionalCost,
      overDeliveryTolerance: header.overDeliveryTolerance,
      status: saveAsDraft ? "draft" : "pending",
      dueDate: header.dueDate ? format(header.dueDate, "yyyy-MM-dd") : null,
      pic: header.picId,
      paymentMethod: header.paymentMethod,
      tenor: isCredit ? header.tenor : 0,
      dpPercent: isCredit ? header.dpPercent : 0,
      orderDate: combineDateTime(header.orderDate, header.orderTime),
      items: buildItemsPayload(groups, saveAsDraft),
      createdBy: user?.id
    });
  };

  const requestSave = () => {
    const missing = getMissingFields(
      poSchemaInput(header, groupsApi.filledItems),
      poSchema,
      poFieldLabels
    );
    if (missing.length > 0) {
      setMissingFieldsList(missing);
      setMissingFieldsModal(true);
      return;
    }
    setConfirmModal(true);
  };

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
          { label: t("page.purchaseOrder.add.title"), i18nKey: "page.purchaseOrder.add.title" }
        ]}
        title={t("page.purchaseOrder.add.title")}
        description={t("page.purchaseOrder.add.description")}
        backLink="/purchase-order"
        onBack={requestLeave}>
        <UserGuide guideKey="add-purchase-order" />
      </PageHeader>
      <LoadErrorBanner />

      {locationsLoading ? (
        <AddPurchaseOrderSkeleton />
      ) : (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <PoHeaderCard
            idPrefix="add"
            header={header}
            locations={locations}
            storeOptions={storeOptions}
            onStoreChange={pickStore}
            isStoreDisabled={!isSuperAdmin || !!lockedStore}
            employees={employees}
            employeesLoading={employeesLoading}
            finalAmount={totals.finalAmount}
          />
          <PoItemsCard
            idPrefix="add"
            header={header}
            groupsApi={groupsApi}
            totals={totals}
            suppliersLoading={suppliersLoading}
          />
          {/* ponytail: mobile = 3 tombol setara memenuhi lebar; desktop
                  tetap satu baris justify-between */}
          <PoActionBar
            totals={totals}
            onCancel={requestLeave}
            onSaveDraft={() => setDraftModal(true)}
            onSave={requestSave}
            isSaving={createMutation.isLoading}
            saveLabel={t("page.purchaseOrder.add.savePo")}
          />
        </form>
      )}

      {createMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <PoItemConfirmDialogs confirmations={groupsApi.confirmations} />
      <Modal
        type="confirm"
        open={!!storeChange}
        onOpenChange={(open) => {
          if (!open) setStoreChange(null);
        }}
        title={t("page.purchaseOrder.add.changeStoreTitle")}
        description={t("page.purchaseOrder.add.changeStoreDesc")}
        confirmText={t("page.purchaseOrder.add.changeStoreConfirm")}
        cancelText={t("common.no")}
        onConfirm={() => {
          if (storeChange) applyStoreChange(storeChange.storeId);
          setStoreChange(null);
        }}
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
          handleSubmit(true);
        }}
      />
      <Modal
        type="confirm"
        open={confirmModal}
        onOpenChange={setConfirmModal}
        title={t("page.purchaseOrder.add.confirmTitle")}
        description={t("page.purchaseOrder.add.confirmDesc")}
        confirmText={t("common.yes")}
        cancelText={t("common.no")}
        onConfirm={() => {
          setConfirmModal(false);
          handleSubmit(false);
        }}
      />
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFieldsList}
      />
      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />
      <Modal
        type="success"
        open={showSuccessModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/purchase-order/detail?id=${createdRecordId}`)}
        onOpenChange={setShowSuccessModal}
        title={t("common.success")}
        description={t("page.purchaseOrder.add.toast.poCreated")}
        onConfirm={() => {
          if (isSuperAdmin && selectedStore) {
            const storeName = locations.find((l) => storeIdsEqual(l.id, selectedStore))?.name || "";
            setActiveStore(selectedStore, storeName);
          }
          setTimeout(() => navigate("/purchase-order"), 150);
        }}
      />
    </div>
  );
};

export default AddPurchaseOrder;

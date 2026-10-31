import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { normalizePayload } from "@/lib/payload-normalizer";
import { editPurchaseOrder, getPurchaseOrderById } from "@/services/purchase-order";
import { getAllSupplier } from "@/services/supplier";
import { getAllEmployee } from "@/services/employee";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import AbortController from "@/components/organism/abort-controller";
import { useLocations } from "@/queries/useLocations";
import { useFormExit } from "@/hooks/useLeaveGuard";
import PoHeaderCard from "./PoHeaderCard";
import PoItemsCard from "./PoItemsCard";
import PoActionBar from "./PoActionBar";
import PoItemConfirmDialogs from "./PoItemConfirmDialogs";
import PoGoodsRequestInfo from "./PoGoodsRequestInfo";
import {
  buildItemsPayload,
  buildPoFieldLabels,
  buildPoSchema,
  combineDateTime,
  emptyGroup,
  groupsFromOrderItems,
  hasDuplicateItems,
  poSchemaInput,
  poTotals
} from "./poForm";
import { usePoHeaderState } from "./usePoHeaderState";
import { usePoItemGroups } from "./usePoItemGroups";

const LIST_LIMIT = 999;
const CACHE_TIME = 30000;

const EditPurchaseOrderSkeleton = ({ t }) => (
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

const REQUIRED_HEADER_CHECKS = [
  { isMissing: (h) => !h.selectedStore, key: "store" },
  { isMissing: (h) => !h.picId, key: "pic" },
  { isMissing: (h) => !h.orderDate, key: "orderDate" },
  { isMissing: (h) => !h.orderTime, key: "orderTime" }
];

const EditPurchaseOrder = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const poFieldLabels = buildPoFieldLabels(t);
  const poSchema = buildPoSchema(t, { isPicRequired: true });

  const header = usePoHeaderState();
  const { selectedStore } = header;
  const [goodsRequestData, setGoodsRequestData] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const { request: requestLeave, leave } = useFormExit("/purchase-order", () =>
    setCancelModal(true)
  );
  const [draftModal, setDraftModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingStore, setPendingStore] = useState(null);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

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
  const groupsApi = usePoItemGroups({ initialGroups: [emptyGroup()], suppliers });
  const { groups } = groupsApi;

  useEffect(() => {
    if (!po) return;
    header.hydrate(po);
    setGoodsRequestData(po.goodsRequestData || null);
    const loadedGroups = groupsFromOrderItems(po.items || []);
    groupsApi.setGroups(loadedGroups.length > 0 ? loadedGroups : [emptyGroup()]);
  }, [po]);

  const { data: employeesData, isLoading: employeesLoading } = useQuery(
    ["employees-dropdown", selectedStore],
    () =>
      getAllEmployee({ limit: LIST_LIMIT, status: "active", location: selectedStore || undefined }),
    { enabled: !!selectedStore, staleTime: CACHE_TIME }
  );
  const employees = employeesData?.data || [];

  const { data: locationsData } = useLocations("active", { staleTime: CACHE_TIME });
  const locations = locationsData?.data || [];
  const storeOptions = [
    { value: "", label: t("page.purchaseOrder.add.selectStore") },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name }))
  ];

  const handleStoreChange = (value) => {
    if (isSuperAdmin && value !== selectedStore) setPendingStore(value);
    else header.setSelectedStore(value);
    header.clearError("store");
  };

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

  const totals = poTotals({
    groups,
    discount: header.discount,
    taxRate: header.taxRate,
    additionalCost: header.additionalCost
  });

  const toastMissing = (key) =>
    toast.error(t(`page.purchaseOrder.edit.validation.${key}`), {
      description: t(`page.purchaseOrder.edit.validation.${key}Desc`)
    });

  const validate = (saveAsDraft) => {
    const filledItems = groupsApi.filledItems;
    const missingHeader = REQUIRED_HEADER_CHECKS.find((check) => check.isMissing(header));
    if (missingHeader) {
      toastMissing(missingHeader.key);
      return false;
    }
    if (header.paymentMethod === "credit" && !header.dueDate) {
      header.setErrors((prev) => ({
        ...prev,
        dueDate: t("page.purchaseOrder.add.validation.dueDate")
      }));
      toastMissing("dueDate");
      return false;
    }
    if (filledItems.length === 0) {
      toastMissing("items");
      return false;
    }
    if (saveAsDraft) return true;
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
    return true;
  };

  // T-11 lifecycle: only draft->pending via update is allowed; all other status changes use dedicated endpoints
  const statusChange = (saveAsDraft) => {
    if (po.status !== "draft") return {};
    return { status: saveAsDraft ? "draft" : "pending" };
  };

  const handleSubmit = (saveAsDraft) => {
    header.setErrors({});
    if (!validate(saveAsDraft)) return;
    const isCredit = header.paymentMethod === "credit";
    const payload = {
      store: selectedStore,
      notes: header.notes,
      pic: header.picId,
      discount: header.discount,
      taxRate: header.taxRate,
      additionalCost: header.additionalCost,
      additionalCostNotes: header.additionalCostNotes || null,
      overDeliveryTolerance: header.overDeliveryTolerance,
      dueDate: header.dueDate ? format(header.dueDate, "yyyy-MM-dd") : null,
      paymentMethod: header.paymentMethod,
      tenor: isCredit ? header.tenor : 0,
      dpPercent: isCredit ? header.dpPercent : 0,
      orderDate: combineDateTime(header.orderDate, header.orderTime),
      items: buildItemsPayload(groups, saveAsDraft),
      ...statusChange(saveAsDraft)
    };
    updateMutation.mutate(normalizePayload(payload, { isFormData: false }));
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

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.purchaseOrder.detail.idNotFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (!po) return <EditPurchaseOrderSkeleton t={t} />;

  const requestLockReason = goodsRequestData
    ? t("page.purchaseOrder.disabledReason.fromGoodsRequest")
    : undefined;
  const financialLockReason = hasFinancialLock
    ? t("page.purchaseOrder.edit.lockedAfterReceipt")
    : undefined;

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
        <PoHeaderCard
          idPrefix="edit"
          header={header}
          locations={locations}
          storeOptions={storeOptions}
          onStoreChange={handleStoreChange}
          isStoreDisabled={!isSuperAdmin}
          employees={employees}
          employeesLoading={employeesLoading}
          finalAmount={totals.finalAmount}>
          {/* ponytail: info permintaan barang jika PO berasal dari goods request */}
          {goodsRequestData && <PoGoodsRequestInfo goodsRequestData={goodsRequestData} />}
        </PoHeaderCard>
        <PoItemsCard
          idPrefix="edit"
          header={header}
          groupsApi={groupsApi}
          totals={totals}
          suppliersLoading={suppliersLoading}
          requestLockReason={requestLockReason}
          financialLockReason={financialLockReason}
          hasAdditionalCostNotes
        />
        <PoActionBar
          totals={totals}
          onCancel={requestLeave}
          onSaveDraft={() => setDraftModal(true)}
          onSave={requestSave}
          isSaving={updateMutation.isLoading}
          saveLabel={t("page.purchaseOrder.edit.saveChanges")}
        />
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
          handleSubmit(true);
        }}
      />
      <Modal
        type="confirm"
        open={pendingStore !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStore(null);
        }}
        title={t("page.purchaseOrder.edit.storeChangeTitle")}
        description={t("page.purchaseOrder.edit.storeChangeDesc")}
        confirmText={t("page.purchaseOrder.edit.storeChangeConfirm")}
        cancelText={t("common.no")}
        onConfirm={() => {
          header.setSelectedStore(pendingStore);
          setPendingStore(null);
        }}
        onCancel={() => setPendingStore(null)}
      />
      <PoItemConfirmDialogs confirmations={groupsApi.confirmations} />
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

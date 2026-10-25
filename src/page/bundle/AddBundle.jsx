import React, { useState, useMemo, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { Save, Plus, Trash2, X, Package, ShoppingCart, Store, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { createBundle } from "@/services/productBundle";
import { getAllProduct } from "@/services/product";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import Modal from "@/components/organism/modal";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import { getMissingFields } from "@/lib/validation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/ui/PageHeader";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import UserGuide from "@/components/organism/UserGuide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Switch } from "@/components/ui/switch";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const emptyItem = { product: "", quantity: 1, unitPrice: 0, isOptional: false };

const SectionHeader = ({ icon: Icon, title, description, gradient }) => (
  <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-white/80">{description}</p>}
      </div>
    </div>
  </div>
);

const AddBundle = () => {
  const dirtyRef = useDomDirtyTracking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: null,
    bundlePrice: 0,
    isAvailable: true,
    minQuantity: 1,
    maxQuantity: "",
    store: null
  });

  const [isActive, setIsActive] = useState(true);

  const [bundleItems, setBundleItems] = useState([{ ...emptyItem }]);

  const [validFromDate, setValidFromDate] = useState(null);
  const [validFromTime, setValidFromTime] = useState("00:00");
  const [validUntilDate, setValidUntilDate] = useState(null);
  const [validUntilTime, setValidUntilTime] = useState("23:59");

  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [itemRemove, setItemRemove] = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  const saveSchema = z.object({
    name: z.string().min(1, "Nama Bundle harus diisi"),
    bundlePrice: z.coerce.number().min(1, "Harga Bundle harus diisi"),
    store: z.string().min(1, "Toko harus dipilih")
  });

  const { data: locationsData, isLoading: locsLoading, isFetching: locsFetching } = useLocations();
  const locations = locationsData?.data || locationsData?.locations || [];

  const selectedStoreId = allStores ? null : selectedStores[0] || null;
  const productsEnabled = allStores || !!selectedStoreId;

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["products-for-bundle", selectedStoreId],
    () => getAllProduct({ location: selectedStoreId || undefined }),
    { enabled: productsEnabled }
  );

  const products = useMemo(
    () => (Array.isArray(productsData?.data) ? productsData.data : productsData?.data?.items || []),
    [productsData]
  );

  const createMutation = useMutation(createBundle, {
    onSuccess: () => {
      // ponytail: cukup success modal, tanpa toast
      queryClient.invalidateQueries(["bundles"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const updateFormData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetBundleItems = () => setBundleItems([{ ...emptyItem }]);

  const handleStoreChange = (stores) => {
    setSelectedStores(stores);
    updateFormData("store", stores[0] || null);
    resetBundleItems();
  };

  const handleAllStoresChange = (val) => {
    setAllStores(val);
    updateFormData("store", val ? null : selectedStores[0] || null);
    if (val) setSelectedStores([]);
    resetBundleItems();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPreviewImage(event.target.result);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreviewImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateBundleItem = (index, key, value) => {
    setBundleItems((prev) => {
      // ponytail: map + rebuild literal — bebas object injection
      const current = prev.at(index) ?? {};
      let row = { ...current, [key]: value };
      if (key === "product") {
        const product = products.find((p) => p.id === Number(value));
        if (product) {
          row = { ...row, unitPrice: product.price ?? product.sellPrice ?? 0 };
        }
      }
      return prev.map((item, i) => (i === index ? row : item));
    });
  };

  const addBundleItem = () => {
    setBundleItems((prev) => [...prev, { ...emptyItem }]);
  };

  const removeBundleItem = (index) => {
    if (bundleItems.length <= 1) return;
    setBundleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const bundleFieldLabels = {
    name: "Nama Bundle",
    bundlePrice: "Harga Bundle",
    store: "Toko",
    items: "Item Bundle"
  };

  const calculateOriginalPrice = () => {
    return bundleItems.reduce((sum, item) => {
      return sum + item.unitPrice * (item.quantity || 1);
    }, 0);
  };

  const formatIDR = (num) => {
    if (!num && num !== 0) return "";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };

  const parseIDR = (str) => {
    if (!str) return 0;
    // ponytail: buang semua non-digit — format Rp hanya tampilan
    return Number(str.replace(/[^0-9]/g, "")) || 0;
  };

  const combineDateTime = (date, time) => {
    if (!date) return null;
    const d = new Date(date);
    const [hours, minutes] = (time || "00:00").split(":");
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  };

  const buildPayload = () => ({
    ...formData,
    status: isActive ? "active" : "inactive",
    bundlePrice: Number(formData.bundlePrice),
    minQuantity: Number(formData.minQuantity),
    maxQuantity: formData.maxQuantity ? Number(formData.maxQuantity) : null,
    validFrom: (() => {
      const d = combineDateTime(validFromDate, validFromTime);
      return d ? d.toISOString() : null;
    })(),
    validUntil: (() => {
      const d = combineDateTime(validUntilDate, validUntilTime);
      return d ? d.toISOString() : null;
    })(),
    store: allStores ? null : selectedStores[0] || null,
    items: bundleItems
      .filter((item) => item.product)
      .map((item) => ({
        product: Number(item.product),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        isOptional: item.isOptional
      }))
  });

  const handleSubmit = (asDraft) => {
    if (!asDraft && !productsEnabled) {
      toast.error(t("common.error"), {
        description: t("page.bundle.form.selectStoreFirst")
      });
      return;
    }

    if (!asDraft) {
      // ponytail: Semua Toko = store null di payload, jadi lewati cek store saat aktif
      const missing = getMissingFields(
        { ...formData, store: allStores ? "all" : formData.store, items: bundleItems },
        saveSchema,
        bundleFieldLabels,
        bundleItems.filter((i) => i.product).length === 0 ? [{ name: "items" }] : []
      );

      if (missing.length > 0) {
        setMissingFields(missing);
        setMissingFieldsModal(true);
        return;
      }

      const payloadForCheck = buildPayload();
      if (payloadForCheck.items.length === 0) {
        toast.error(t("common.error"), {
          description: "Minimal harus ada 1 item bundle"
        });
        return;
      }

      setConfirmModal(true);
      return;
    }

    submitData(true);
  };

  const submitData = (asDraft) => {
    const payload = buildPayload();
    payload.status = asDraft ? "draft" : payload.status;

    if (imageFile) {
      const fd = new FormData();
      fd.append("image", imageFile);
      fd.append("data", JSON.stringify(payload));
      createMutation.mutate(fd);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div ref={dirtyRef} className="space-y-6 pb-4">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("page.bundle.title"), href: "/bundle", i18nKey: "page.bundle.title" },
          { label: t("page.bundle.addTitle"), i18nKey: "page.bundle.addTitle" }
        ]}
        title={t("page.bundle.addTitle")}
        description={t("page.bundle.addDescription")}
        backLink="/bundle"
        onBack={() => setCancelModal(true)}>
        <UserGuide guideKey="add-bundle" />
      </PageHeader>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <Card className="overflow-hidden border-0 shadow-md rounded-xl">
          <SectionHeader
            icon={Store}
            title={t("page.bundle.form.storeSection.title")}
            description={t("page.bundle.form.storeSection.desc")}
            gradient="from-indigo-600/90 to-indigo-700/90"
          />
          <div className="p-6">
            <StoreSelectCard
              locations={locations}
              selectedStores={selectedStores}
              onChange={handleStoreChange}
              isSuperAdmin={isSuperAdmin}
              user={user}
              t={t}
              title={t("page.bundle.form.storeSection.title")}
              description={t("page.bundle.form.storeSection.desc")}
              noStoreLabel={t("page.bundle.form.storeSection.noStore")}
              addStoreLabel={t("page.bundle.form.storeSection.addStore")}
              storeInfoLabel={t("page.bundle.form.storeInfo")}
              allStores={allStores}
              onAllStoresChange={handleAllStoresChange}
              navigate={navigate}
              mandatory={true}
              locationsLoading={locsLoading || locsFetching}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-0 shadow-md rounded-xl">
              <SectionHeader
                icon={Package}
                title={t("page.bundle.form.generalInfo")}
                gradient="from-blue-600/90 to-blue-700/90"
              />
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("page.bundle.form.name")} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    placeholder={t("page.bundle.form.namePlaceholder")}
                    maxLength={FIELD_LIMITS.BUSINESS_NAME}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("page.bundle.form.status")}</Label>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {isActive ? t("common.active") : t("common.inactive")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isActive
                          ? t("page.bundle.form.activeHint")
                          : t("page.bundle.form.inactiveHint")}
                      </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>{t("page.bundle.form.description")}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    placeholder={t("page.bundle.form.descriptionPlaceholder")}
                    rows={3}
                    maxLength={FIELD_LIMITS.DESCRIPTION}
                  />
                </div>

                <div className="md:col-span-2 border-t border-border pt-4" />

                <div className="space-y-2 md:col-span-1">
                  <Label>{t("page.bundle.form.validFrom")}</Label>
                  <DatePicker
                    date={validFromDate}
                    setDate={setValidFromDate}
                    placeholder={t("page.bundle.form.validFrom")}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <TimePicker value={validFromTime} onChange={setValidFromTime} />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>{t("page.bundle.form.validUntil")}</Label>
                  <DatePicker
                    date={validUntilDate}
                    setDate={setValidUntilDate}
                    minDate={validFromDate || undefined}
                    disabled={!validFromDate}
                    placeholder={
                      !validFromDate
                        ? t("page.bundle.form.validFromFirst")
                        : t("page.bundle.form.validUntil")
                    }
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <TimePicker value={validUntilTime} onChange={setValidUntilTime} />
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-0 shadow-md rounded-xl">
              <SectionHeader
                icon={ShoppingCart}
                title={t("page.bundle.form.items")}
                gradient="from-emerald-600/90 to-emerald-700/90"
              />
              <div className="p-6">
                {!productsEnabled ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                      <ShoppingCart size={22} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {t("page.bundle.form.selectStoreFirst")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                      {t("page.bundle.form.selectStoreHint")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-muted-foreground">
                        {productsLoading
                          ? t("common.loading")
                          : `${products.length} ${t("page.bundle.form.productsAvailable")}`}
                      </p>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={addBundleItem}
                        className="gap-1.5">
                        <Plus size={14} />
                        {t("page.bundle.form.addItem")}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {bundleItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-end gap-3 p-3 rounded-lg border border-border bg-muted/20">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">{t("page.bundle.form.selectProduct")}</Label>
                            <Select
                              value={item.product}
                              onValueChange={(v) => updateBundleItem(index, "product", v)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={t("page.bundle.form.selectProduct")} />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.nameProduct}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20 space-y-1">
                            <Label className="text-xs">{t("page.bundle.form.quantity")}</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateBundleItem(index, "quantity", e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="w-28 space-y-1">
                            <Label className="text-xs">{t("page.bundle.form.unitPrice")}</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={item.unitPrice ? formatIDR(item.unitPrice) : ""}
                              onChange={(e) =>
                                updateBundleItem(index, "unitPrice", parseIDR(e.target.value))
                              }
                              placeholder="Rp 0"
                              className="h-9 text-right"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => setItemRemove(index)}
                            disabled={bundleItems.length <= 1}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden border-0 shadow-md rounded-xl">
              <SectionHeader
                icon={Package}
                title={t("page.bundle.form.image")}
                gradient="from-amber-500/90 to-amber-600/90"
              />
              <div className="p-5 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div
                  onClick={handleImageClick}
                  className="relative rounded-lg border-2 border-dashed border-border hover:border-primary transition-all flex flex-col items-center justify-center bg-muted/30 overflow-hidden cursor-pointer group min-h-[220px]">
                  {previewImage ? (
                    <>
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="w-full h-auto max-h-[300px] object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearImage();
                        }}
                        className="absolute top-2 right-2 z-10 p-2 bg-background/90 rounded-full text-muted-foreground hover:text-foreground shadow-md">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors p-6 justify-center text-center">
                      <CloudUpload size={48} className="mb-3" />
                      <span className="text-sm font-semibold">
                        {t("page.location.form.clickOrDragPhoto")}
                      </span>
                      <span className="text-xs mt-1">{t("page.bundle.form.imageHint")}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-0 shadow-md rounded-xl">
              <SectionHeader
                icon={ShoppingCart}
                title={t("page.bundle.form.pricing")}
                gradient="from-violet-600/90 to-violet-700/90"
              />
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    {t("page.bundle.form.originalPrice")}
                  </p>
                  <p className="text-lg font-semibold">
                    Rp{calculateOriginalPrice().toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t("page.bundle.form.bundlePrice")} *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formData.bundlePrice ? formatIDR(formData.bundlePrice) : ""}
                    onChange={(e) => updateFormData("bundlePrice", parseIDR(e.target.value))}
                    placeholder="Rp 0"
                  />
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {t("page.bundle.form.savings")}
                  </p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    Rp
                    {Math.max(
                      calculateOriginalPrice() - Number(formData.bundlePrice || 0),
                      0
                    ).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ponytail: mobile = tombol memenuhi lebar; desktop satu baris justify-between */}
        <div className="sticky bottom-4 z-10 flex flex-wrap justify-between items-center gap-3 bg-card border border-border/60 shadow-lg rounded-xl p-4 backdrop-blur-sm">
          <Button
            variant="danger"
            onClick={() => setCancelModal(true)}
            disabled={createMutation.isLoading}
            className="gap-2 flex-1 sm:flex-none">
            <X size={18} />
            {t("common.cancel")}
          </Button>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="draft"
              onClick={() => setDraftModal(true)}
              disabled={createMutation.isLoading || !formData.name}
              className="flex-1 sm:flex-none">
              {createMutation.isLoading ? t("common.saving") : t("common.saveDraft")}
            </Button>
            <Button
              variant="success"
              onClick={() => handleSubmit(false)}
              disabled={createMutation.isLoading || !formData.name}
              className="gap-2 flex-1 sm:flex-none min-w-0 sm:min-w-[140px] shadow-md">
              <Save size={18} />
              {createMutation.isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </form>

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
      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("page.bundle.modal.cancelTitle")}
        description={t("page.bundle.modal.cancelDescription")}
        confirmText={t("page.bundle.modal.cancelConfirm")}
        onConfirm={() => setTimeout(() => navigate("/bundle"), 150)}
      />
      <Modal
        type="confirm"
        open={confirmModal}
        onOpenChange={setConfirmModal}
        title={t("page.bundle.modal.saveTitle")}
        description={t("page.bundle.modal.saveDescription")}
        confirmText={t("common.yes") || "Ya"}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          setConfirmModal(false);
          submitData(false);
        }}
      />
      <Modal
        type="confirm"
        open={itemRemove !== null}
        onOpenChange={(open) => {
          if (!open) setItemRemove(null);
        }}
        title={t("page.bundle.modal.removeItemTitle")}
        description={t("page.bundle.modal.removeItemDescription")}
        confirmText={t("common.yes") || "Ya"}
        cancelText={t("common.no") || "Batal"}
        onConfirm={() => {
          if (itemRemove !== null) removeBundleItem(itemRemove);
          setItemRemove(null);
        }}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.bundle.modal.draftTitle")}
        description={t("page.bundle.modal.draftDescription")}
        confirmText={t("page.bundle.modal.draftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          submitData(true);
        }}
      />
      <Modal
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("page.bundle.modal.successTitle")}
        description={t("page.bundle.modal.successDescription")}
        confirmText={t("page.bundle.modal.successConfirm")}
        onConfirm={() => {
          setSuccessModal(false);
          setTimeout(() => navigate("/bundle"), 150);
        }}
      />
    </div>
  );
};

export default AddBundle;

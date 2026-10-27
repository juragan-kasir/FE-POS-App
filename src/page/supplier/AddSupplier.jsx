import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  X,
  Save,
  Check,
  Plus,
  Trash2,
  Upload,
  Download,
  Pencil,
  User,
  Phone,
  CreditCard,
  Receipt
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { Switch } from "@/components/ui/switch";
import { addSupplier } from "@/services/supplier";
import { getAllSupplierCategories } from "@/services/supplier";
import { downloadSupplierProductTemplate, importSupplierProducts } from "@/services/supplier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
  FormDescription
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/organism/modal";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { digitsOnly } from "@/utils/quantity";
import { useFormExit } from "@/hooks/useLeaveGuard";

const AddSupplier = () => {
  const { t } = useTranslation();

  const formSchema = z.object({
    name: z.string().min(1, t("page.supplier.validation.nameRequired")),
    contactPerson: z.string().optional().or(z.literal("")),
    phone: z.string().min(1, t("page.supplier.validation.phoneRequired")).max(16),
    email: z
      .string()
      .email(t("page.supplier.validation.emailInvalid"))
      .optional()
      .or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true),
    store: z.string().optional(),
    paymentType: z.enum(["cbd", "cad", "tempo"]).default("cbd"),
    tempoDays: z.number().default(0),
    categoryId: z.number().optional().nullable(),
    mobile: z.string().optional().or(z.literal("")),
    whatsapp: z.string().optional().or(z.literal("")),
    fax: z.string().optional().or(z.literal("")),
    website: z.string().optional().or(z.literal("")),
    taxInclude: z.boolean().default(true),
    taxType: z.string().optional().or(z.literal("")),
    taxNumber: z.string().optional().or(z.literal("")),
    taxName: z.string().optional().or(z.literal("")),
    nitku: z.string().optional().or(z.literal("")),
    taxTransactionType: z.string().optional().or(z.literal("")),
    defaultDiscount: z.number().default(0),
    defaultDescription: z.string().optional().or(z.literal(""))
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const supplierFieldLabels = {
    name: t("page.supplier.form.name"),
    phone: t("page.supplier.form.phone")
  };

  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [selectedStore, setSelectedStore] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // --- Contacts state ---
  const [contacts, setContacts] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactName, setContactName] = useState("");
  const [contactPosition, setContactPosition] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // --- Bank Accounts state ---
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankIsDefault, setBankIsDefault] = useState(false);

  // --- Supplier Categories ---
  // const [categoryId, setCategoryId] = useState(null);

  // --- Products Supplied state ---
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productUnit, setProductUnit] = useState("pcs");
  const [productLeadTime, setProductLeadTime] = useState("");
  const [productLeadTimeUnit, setProductLeadTimeUnit] = useState("hari");
  const [productQualityRating, setProductQualityRating] = useState("");
  const [productMinOrderQty, setProductMinOrderQty] = useState("");
  const [productNotes, setProductNotes] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);
  const [excelFile, setExcelFile] = useState(null);

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", { enabled: isSuperAdmin });
  const locations = locationsData?.data || locationsData?.locations || [];

  const { data: categoriesData } = useQuery(["supplierCategoryOptions"], () =>
    getAllSupplierCategories({ limit: 100 })
  );
  const categoryOptions = (categoriesData?.data || []).map((c) => ({
    value: String(c.id),
    label: c.name
  }));

  const excelImportMutation = useMutation(({ id, file }) => importSupplierProducts({ id, file }), {
    onSuccess: (data) => {
      const imported = (data?.data || data?.products || []).map((p) => ({
        id: p.id || `imported_${Date.now()}`,
        name: p.name || p.productName || "",
        price: p.price || 0,
        unit: p.unit || "pcs",
        leadTime: p.leadTime || 0,
        leadTimeUnit: p.leadTimeUnit || "hari",
        qualityRating: p.qualityRating || 0,
        minOrderQty: p.minOrderQty || 1,
        notes: p.notes || ""
      }));
      setSupplierProducts((prev) => [...prev, ...imported]);
      toast.success(t("page.supplier.products.importSuccess"));
      setExcelFile(null);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description:
          err?.response?.data?.message || err.message || t("page.supplier.products.importFailed")
      });
    }
  });

  const unitOptions = [
    { value: "pcs", label: t("page.ingredient.form.unitPcs") },
    { value: "buah", label: t("page.ingredient.form.unitBuah") },
    { value: "kg", label: t("page.ingredient.form.unitKg") },
    { value: "gram", label: t("page.ingredient.form.unitGram") },
    { value: "liter", label: t("page.ingredient.form.unitLiter") },
    { value: "ml", label: t("page.ingredient.form.unitMl") },
    { value: "meter", label: t("page.ingredient.form.unitMeter") },
    { value: "cm", label: t("page.ingredient.form.unitCm") },
    { value: "lusin", label: t("page.ingredient.form.unitLusin") },
    { value: "pack", label: t("page.ingredient.form.unitPack") },
    { value: "box", label: t("page.ingredient.form.unitBox") },
    { value: "karton", label: t("page.ingredient.form.unitKarton") },
    { value: "krat", label: t("page.ingredient.form.unitKrat") }
  ];

  const handleEditProduct = (product) => {
    setNewProductName(product.name);
    setProductPrice(String(product.price));
    setProductUnit(product.unit || "pcs");
    setProductLeadTime(String(product.leadTime || ""));
    setProductLeadTimeUnit(product.leadTimeUnit || "hari");
    setProductQualityRating(String(product.qualityRating || ""));
    setProductMinOrderQty(String(product.minOrderQty || ""));
    setProductNotes(product.notes || "");
    setEditingProductId(product.id);
    setShowManualAdd(true);
    setShowExcelImport(false);
  };

  const handleAddManualProduct = () => {
    if (!newProductName.trim() || !productPrice) return;
    if (editingProductId) {
      setSupplierProducts((prev) =>
        prev.map((p) =>
          p.id === editingProductId
            ? {
                ...p,
                name: newProductName.trim(),
                price: Number(productPrice),
                unit: productUnit || "pcs",
                leadTime: Number(productLeadTime) || 0,
                leadTimeUnit: productLeadTimeUnit || "hari",
                qualityRating: Number(productQualityRating) || 0,
                minOrderQty: productMinOrderQty || "1",
                notes: productNotes.trim() || ""
              }
            : p
        )
      );
    } else {
      const newProduct = {
        id: `manual_${Date.now()}`,
        name: newProductName.trim(),
        price: Number(productPrice),
        unit: productUnit || "pcs",
        leadTime: Number(productLeadTime) || 0,
        leadTimeUnit: productLeadTimeUnit || "hari",
        qualityRating: Number(productQualityRating) || 0,
        minOrderQty: productMinOrderQty || "1",
        notes: productNotes.trim() || ""
      };
      setSupplierProducts((prev) => [...prev, newProduct]);
    }
    setNewProductName("");
    setProductPrice("");
    setProductUnit("pcs");
    setProductLeadTime("");
    setProductLeadTimeUnit("hari");
    setProductQualityRating("");
    setProductMinOrderQty("");
    setProductNotes("");
    setEditingProductId(null);
    setShowManualAdd(false);
  };

  const handleRemoveProduct = (id) => {
    setSupplierProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadSupplierProductTemplate();
      toast.success(t("common.success"), {
        description: t("page.supplier.products.templateDownloaded")
      });
    } catch (err) {
      toast.error(t("common.error"), {
        description: err?.message || t("page.supplier.products.templateFailed")
      });
    }
  };

  const handleExcelImport = () => {
    if (!excelFile) return;
    excelImportMutation.mutate({ id: "preview", file: excelFile });
  };

  // --- Contact handlers ---
  const handleAddContact = () => {
    if (!contactName.trim()) return;
    if (editingContactId) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === editingContactId
            ? {
                ...c,
                fullName: contactName.trim(),
                position: contactPosition.trim(),
                email: contactEmail.trim(),
                phone: contactPhone.trim()
              }
            : c
        )
      );
    } else {
      setContacts((prev) => [
        ...prev,
        {
          id: `contact_${Date.now()}`,
          fullName: contactName.trim(),
          position: contactPosition.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim()
        }
      ]);
    }
    setContactName("");
    setContactPosition("");
    setContactEmail("");
    setContactPhone("");
    setEditingContactId(null);
    setShowContactForm(false);
  };

  const handleEditContact = (contact) => {
    setContactName(contact.fullName);
    setContactPosition(contact.position || "");
    setContactEmail(contact.email || "");
    setContactPhone(contact.phone || "");
    setEditingContactId(contact.id);
    setShowContactForm(true);
  };

  const handleRemoveContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // --- Bank Account handlers ---
  const handleAddBank = () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) return;
    if (editingBankId) {
      setBankAccounts((prev) =>
        prev.map((b) =>
          b.id === editingBankId
            ? {
                ...b,
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                accountName: accountName.trim(),
                isDefault: bankIsDefault
              }
            : b
        )
      );
    } else {
      setBankAccounts((prev) => [
        ...prev,
        {
          id: `bank_${Date.now()}`,
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          isDefault: bankIsDefault,
          status: "active"
        }
      ]);
    }
    setBankName("");
    setAccountNumber("");
    setAccountName("");
    setBankIsDefault(false);
    setEditingBankId(null);
    setShowBankForm(false);
  };

  const handleEditBank = (bank) => {
    setBankName(bank.bankName);
    setAccountNumber(bank.accountNumber);
    setAccountName(bank.accountName);
    setBankIsDefault(bank.isDefault);
    setEditingBankId(bank.id);
    setShowBankForm(true);
  };

  const handleRemoveBank = (id) => {
    setBankAccounts((prev) => prev.filter((b) => b.id !== id));
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      isActive: true,
      paymentType: "cbd",
      tempoDays: 0,
      categoryId: null,
      mobile: "",
      whatsapp: "",
      fax: "",
      website: "",
      taxInclude: true,
      taxType: "",
      taxNumber: "",
      taxName: "",
      nitku: "",
      taxTransactionType: "",
      defaultDiscount: 0,
      defaultDescription: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/supplier",
    () => setCancelModal(true),
    form
  );

  const createMutation = useMutation(addSupplier, {
    onSuccess: () => {
      queryClient.invalidateQueries(["suppliers"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.supplier.toast.addFailed")
      );
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    if (isSuperAdmin && !allStores && selectedStore.length === 0 && !saveAsDraft) {
      form.setError("store", {
        message: t("page.supplier.validation.storeRequired") || "Pilih minimal satu toko"
      });
      return;
    }
    form.clearErrors("store");
    let statusValue;
    if (saveAsDraft) {
      statusValue = "draft";
    } else {
      statusValue = values.isActive ? "active" : "inactive";
    }
    createMutation.mutate({
      ...values,
      status: statusValue,
      store: selectedStore,
      categoryId: values.categoryId || null,
      contacts: contacts.map((c) => ({
        fullName: c.fullName,
        position: c.position || null,
        email: c.email || null,
        phone: c.phone || null
      })),
      bankAccounts: bankAccounts.map((b) => ({
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        accountName: b.accountName,
        isDefault: b.isDefault || false,
        status: b.status || "active"
      })),
      products: supplierProducts.map((p) => ({
        name: p.name,
        price: p.price,
        unit: p.unit || "pcs",
        leadTime: p.leadTime || 0,
        leadTimeUnit: p.leadTimeUnit || "hari",
        qualityRating: p.qualityRating || 0,
        minOrderQty: p.minOrderQty || 1,
        notes: p.notes || ""
      }))
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div>
          <PageHeader
            breadcrumbs={[
              {
                label: t("breadcrumb.home"),
                href: "/dashboard-super-admin",
                i18nKey: "breadcrumb.home"
              },
              {
                label: t("breadcrumb.supplier"),
                href: "/supplier",
                i18nKey: "breadcrumb.supplier"
              },
              { label: t("page.supplier.add.title"), i18nKey: "page.supplier.add.title" }
            ]}
            title={t("page.supplier.add.title")}
            description={t("page.supplier.add.description")}
            backLink="/supplier"
            onBack={requestLeave}>
            <UserGuide guideKey="add-supplier" />
          </PageHeader>
        </div>
      </div>

      <div>
        <div>
          <div className="space-y-6">
            <Card className="p-6">
              <Form {...form}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                  className="space-y-6">
                  {isSuperAdmin && (
                    <FormField
                      control={form.control}
                      name="store"
                      render={() => (
                        <FormItem>
                          <FormControl>
                            <StoreSelectCard
                              locations={locations}
                              selectedStores={selectedStore}
                              onChange={(stores) => {
                                setSelectedStore(stores);
                                form.clearErrors("store");
                              }}
                              isSuperAdmin={isSuperAdmin}
                              user={user}
                              t={t}
                              title={t("page.supplier.form.storeSection.title")}
                              description={t("page.supplier.form.storeSection.desc")}
                              noStoreLabel={t("page.supplier.form.storeSection.noStore")}
                              addStoreLabel={t("page.supplier.form.storeSection.addStore")}
                              storeInfoLabel={t("page.supplier.form.storeInfo")}
                              allStores={allStores}
                              onAllStoresChange={(val) => {
                                setAllStores(val);
                                form.clearErrors("store");
                              }}
                              navigate={navigate}
                              mandatory={true}
                              locationsLoading={locsLoading || locsFetching}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    {/* ponytail: tab scroll horizontal di layar sempit */}
                    <div className="overflow-x-auto -mx-1 px-1">
                      <TabsList className="grid w-full grid-cols-4 min-w-[440px]">
                        <TabsTrigger value="general" className="gap-1.5">
                          <User size={14} />
                          {t("page.supplier.tabs.general", "Umum")}
                        </TabsTrigger>
                        <TabsTrigger value="contacts" className="gap-1.5">
                          <Phone size={14} />
                          {t("page.supplier.tabs.contacts", "Kontak")}
                        </TabsTrigger>
                        <TabsTrigger value="purchase" className="gap-1.5">
                          <CreditCard size={14} />
                          {t("page.supplier.tabs.purchase", "Pembelian")}
                        </TabsTrigger>
                        <TabsTrigger value="tax" className="gap-1.5">
                          <Receipt size={14} />
                          {t("page.supplier.tabs.tax", "Pajak")}
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* ====== TAB: UMUM (General) ====== */}
                    <TabsContent value="general" className="space-y-6 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("page.supplier.form.name")}{" "}
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <Input
                                placeholder={t("page.supplier.form.namePlaceholder")}
                                {...field}
                                maxLength={FIELD_LIMITS.BUSINESS_NAME}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.contactPerson")}</FormLabel>
                              <Input
                                placeholder={t("page.supplier.form.contactPersonPlaceholder")}
                                {...field}
                                maxLength={FIELD_LIMITS.PERSON_NAME}
                              />
                              <FormMessage />
                              <FormDescription>{t("common.optionalField")}</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("page.supplier.form.phone")}{" "}
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <Input
                                placeholder={t("page.supplier.form.phonePlaceholder")}
                                inputMode="numeric"
                                maxLength={FIELD_LIMITS.PHONE}
                                {...field}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                                  field.onChange(v);
                                }}
                              />
                              <FormMessage />
                              <FormDescription>{t("common.phoneHintMin")}</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.email")}</FormLabel>
                              <Input
                                placeholder={t("page.supplier.form.emailPlaceholder")}
                                {...field}
                                maxLength={FIELD_LIMITS.EMAIL}
                              />
                              <FormMessage />
                              <FormDescription>{t("common.optionalField")}</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("page.supplierCategory.title", "Kategori Supplier")}
                              </FormLabel>
                              <Combobox
                                options={categoryOptions}
                                value={field.value ? String(field.value) : ""}
                                onChange={(v) => field.onChange(v ? Number(v) : null)}
                                placeholder={t(
                                  "page.supplier.categoryPlaceholder",
                                  "Pilih kategori..."
                                )}
                                searchPlaceholder={t("common.search")}
                              />
                              <FormMessage />
                              <FormDescription>{t("common.optionalField")}</FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.supplier.form.address")}</FormLabel>
                            <Textarea
                              placeholder={t("page.supplier.form.addressPlaceholder")}
                              rows={3}
                              {...field}
                              maxLength={FIELD_LIMITS.ADDRESS}
                            />
                            <FormMessage />
                            <FormDescription>{t("common.optionalField")}</FormDescription>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="mobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.mobile", "Mobile")}</FormLabel>
                              <Input
                                placeholder={t(
                                  "page.supplier.form.mobilePlaceholder",
                                  "Nomor HP/WA utama"
                                )}
                                {...field}
                                maxLength={FIELD_LIMITS.PHONE}
                              />
                              <FormMessage />
                              <FormDescription>{t("common.optionalField")}</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="whatsapp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.whatsapp", "WhatsApp")}</FormLabel>
                              <Input
                                placeholder={t(
                                  "page.supplier.form.whatsappPlaceholder",
                                  "Nomor WhatsApp"
                                )}
                                {...field}
                                maxLength={FIELD_LIMITS.PHONE}
                              />
                              <FormMessage />
                              <FormDescription>{t("common.optionalField")}</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.fax", "Fax")}</FormLabel>
                              <Input
                                placeholder={t("page.supplier.form.faxPlaceholder", "Nomor Fax")}
                                {...field}
                                maxLength={FIELD_LIMITS.PHONE}
                              />
                              <FormMessage />
                              <FormDescription>{t("common.optionalField")}</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.website", "Website")}</FormLabel>
                              <Input
                                placeholder={t("page.supplier.form.websitePlaceholder", "https://")}
                                {...field}
                                maxLength={FIELD_LIMITS.URL}
                              />
                              <FormMessage />
                              <FormDescription>{t("common.optionalField")}</FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("page.supplier.form.status")}
                        </h3>
                        <div
                          className={`flex items-center justify-between p-4 rounded-lg ${
                            form.watch("isActive")
                              ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                          }`}>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                form.watch("isActive")
                                  ? "bg-green-600 text-secondary"
                                  : "bg-destructive/10 text-destructive"
                              }`}>
                              {form.watch("isActive") ? (
                                <Check size={20} />
                              ) : (
                                <span className="text-lg font-bold">⏻</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {form.watch("isActive") ? t("common.active") : t("common.inactive")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {form.watch("isActive")
                                  ? t("page.supplier.form.activeDescription")
                                  : t("page.supplier.form.inactiveDescription")}
                              </p>
                            </div>
                          </div>
                          <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* ====== TAB: KONTAK (Contacts) ====== */}
                    <TabsContent value="contacts" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {t("page.supplier.contacts.title", "Daftar Kontak")}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t(
                              "page.supplier.contacts.description",
                              "Kelola kontak person yang dapat dihubungi"
                            )}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setShowContactForm(!showContactForm);
                            setEditingContactId(null);
                            setContactName("");
                            setContactPosition("");
                            setContactEmail("");
                            setContactPhone("");
                          }}>
                          <Plus size={14} />
                          {t("page.supplier.contacts.add", "Tambah Kontak")}
                        </Button>
                      </div>

                      {showContactForm && (
                        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                {t("page.supplier.contacts.fullName", "Nama Lengkap")} *
                              </label>
                              <Input
                                placeholder="Nama kontak"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                maxLength={FIELD_LIMITS.PERSON_NAME}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                {t("page.supplier.contacts.position", "Jabatan")}
                              </label>
                              <Input
                                placeholder="Jabatan"
                                value={contactPosition}
                                onChange={(e) => setContactPosition(e.target.value)}
                                maxLength={FIELD_LIMITS.SHORT_LABEL}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                {t("page.supplier.contacts.email", "Email")}
                              </label>
                              <Input
                                placeholder="Email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                maxLength={FIELD_LIMITS.EMAIL}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                {t("page.supplier.contacts.phone", "Telepon")}
                              </label>
                              <Input
                                placeholder="Telepon"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                maxLength={FIELD_LIMITS.PHONE}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setShowContactForm(false);
                                setEditingContactId(null);
                              }}
                              className="flex-1">
                              {t("common.cancel")}
                            </Button>
                            <Button
                              variant="success"
                              type="button"
                              size="sm"
                              disabled={!contactName.trim()}
                              onClick={handleAddContact}
                              className="flex-1 gap-1.5">
                              {editingContactId ? (
                                t("common.save")
                              ) : (
                                <>
                                  <Plus size={14} /> {t("page.supplier.contacts.add", "Tambah")}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {contacts.length > 0 ? (
                        <HorizontalScrollArea className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10">
                                  #
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                  {t("page.supplier.contacts.fullName", "Nama")}
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                  {t("page.supplier.contacts.position", "Jabatan")}
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                  {t("page.supplier.contacts.email", "Email")}
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                  {t("page.supplier.contacts.phone", "Telepon")}
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  {t("page.supplier.products.table.action", "Aksi")}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {contacts.map((c, index) => (
                                <tr
                                  key={c.id}
                                  className={`border-b last:border-b-0 ${editingContactId === c.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                                    {index + 1}
                                  </td>
                                  <td className="px-3 py-2">{c.fullName}</td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {c.position || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {c.email || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {c.phone || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => handleEditContact(c)}>
                                      <Pencil size={14} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => handleRemoveContact(c.id)}>
                                      <Trash2 size={14} />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </HorizontalScrollArea>
                      ) : (
                        <div className="border border-dashed rounded-lg p-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            {t(
                              "page.supplier.contacts.empty",
                              "Belum ada kontak. Klik tombol di atas untuk menambahkan."
                            )}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* ====== TAB: PEMBELIAN (Purchase) ====== */}
                    <TabsContent value="purchase" className="space-y-6 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="paymentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("page.supplier.form.paymentType", "Tipe Pembayaran")}
                              </FormLabel>
                              <Combobox
                                options={[
                                  { value: "cbd", label: "CBD (Cash Before Delivery)" },
                                  { value: "cad", label: "CAD (Cash After Delivery)" },
                                  { value: "tempo", label: "Tempo (Kredit)" }
                                ]}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Pilih tipe pembayaran..."
                                searchPlaceholder="Cari..."
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch("paymentType") === "tempo" && (
                          <FormField
                            control={form.control}
                            name="tempoDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t("page.supplier.form.tempoDays", "Tempo (Hari)")}
                                </FormLabel>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                                <FormDescription>
                                  {t(
                                    "page.supplier.form.tempoDaysDesc",
                                    "Jatuh tempo pembayaran dalam hari"
                                  )}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={form.control}
                          name="defaultDiscount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("page.supplier.form.defaultDiscount", "Diskon Default (%)")}
                              </FormLabel>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                placeholder="0"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="defaultDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("page.supplier.form.defaultDescription", "Deskripsi Default")}
                              </FormLabel>
                              <Textarea
                                placeholder={t(
                                  "page.supplier.form.defaultDescriptionPlaceholder",
                                  "Deskripsi default untuk pembelian"
                                )}
                                rows={2}
                                {...field}
                                maxLength={FIELD_LIMITS.DESCRIPTION}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              {t("page.supplier.bankAccounts.title", "Rekening Bank")}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t(
                                "page.supplier.bankAccounts.description",
                                "Kelola rekening bank supplier untuk pembayaran"
                              )}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              setShowBankForm(!showBankForm);
                              setEditingBankId(null);
                              setBankName("");
                              setAccountNumber("");
                              setAccountName("");
                              setBankIsDefault(false);
                            }}>
                            <Plus size={14} />
                            {t("page.supplier.bankAccounts.add", "Tambah Rekening")}
                          </Button>
                        </div>

                        {showBankForm && (
                          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">
                                  {t("page.supplier.bankAccounts.bankName", "Nama Bank")} *
                                </label>
                                <Input
                                  placeholder="BCA, Mandiri, BRI..."
                                  value={bankName}
                                  onChange={(e) => setBankName(e.target.value)}
                                  maxLength={FIELD_LIMITS.BUSINESS_NAME}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">
                                  {t("page.supplier.bankAccounts.accountNumber", "Nomor Rekening")}{" "}
                                  *
                                </label>
                                <Input
                                  placeholder="0012345678"
                                  value={accountNumber}
                                  onChange={(e) => setAccountNumber(e.target.value)}
                                  maxLength={FIELD_LIMITS.BANK_ACCOUNT}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">
                                  {t("page.supplier.bankAccounts.accountName", "Nama Pemilik")} *
                                </label>
                                <Input
                                  placeholder="Nama pemilik rekening"
                                  value={accountName}
                                  onChange={(e) => setAccountName(e.target.value)}
                                  maxLength={FIELD_LIMITS.PERSON_NAME}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-sm">
                                <Switch
                                  checked={bankIsDefault}
                                  onCheckedChange={setBankIsDefault}
                                />
                                {t("page.supplier.bankAccounts.isDefault", "Jadikan Default")}
                              </label>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    setShowBankForm(false);
                                    setEditingBankId(null);
                                  }}
                                  className="flex-1">
                                  {t("common.cancel")}
                                </Button>
                                <Button
                                  variant="success"
                                  type="button"
                                  size="sm"
                                  disabled={
                                    !bankName.trim() || !accountNumber.trim() || !accountName.trim()
                                  }
                                  onClick={handleAddBank}
                                  className="flex-1 gap-1.5">
                                  {editingBankId ? (
                                    t("common.save")
                                  ) : (
                                    <>
                                      <Plus size={14} />{" "}
                                      {t("page.supplier.bankAccounts.add", "Tambah")}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {bankAccounts.length > 0 ? (
                          <HorizontalScrollArea className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50 border-b">
                                  <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10">
                                    #
                                  </th>
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                    {t("page.supplier.bankAccounts.bankName", "Bank")}
                                  </th>
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                    {t("page.supplier.bankAccounts.accountNumber", "Rekening")}
                                  </th>
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                    {t("page.supplier.bankAccounts.accountName", "Nama")}
                                  </th>
                                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                                    {t("page.supplier.bankAccounts.isDefault", "Default")}
                                  </th>
                                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                    {t("page.supplier.products.table.action", "Aksi")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {bankAccounts.map((b, index) => (
                                  <tr
                                    key={b.id}
                                    className={`border-b last:border-b-0 ${editingBankId === b.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                                    <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                                      {index + 1}
                                    </td>
                                    <td className="px-3 py-2 font-medium">{b.bankName}</td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                      {b.accountNumber}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                      {b.accountName}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {b.isDefault ? (
                                        <Check size={14} className="text-green-600 mx-auto" />
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleEditBank(b)}>
                                        <Pencil size={14} />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => handleRemoveBank(b.id)}>
                                        <Trash2 size={14} />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </HorizontalScrollArea>
                        ) : (
                          <div className="border border-dashed rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              {t(
                                "page.supplier.bankAccounts.empty",
                                "Belum ada rekening bank. Klik tombol di atas untuk menambahkan."
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* ====== TAB: PAJAK (Tax) ====== */}
                    <TabsContent value="tax" className="space-y-6 mt-4">
                      <FormField
                        control={form.control}
                        name="taxInclude"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between p-4 rounded-lg border">
                              <div>
                                <FormLabel>
                                  {t("page.supplier.form.taxInclude", "Harga Termasuk Pajak")}
                                </FormLabel>
                                <FormDescription>
                                  {t(
                                    "page.supplier.form.taxIncludeDesc",
                                    "Jika aktif, harga sudah termasuk PPN"
                                  )}
                                </FormDescription>
                              </div>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </div>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="taxType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("page.supplier.form.taxType", "Jenis Pajak")}
                              </FormLabel>
                              <Combobox
                                options={[
                                  { value: "ppn", label: "PPN" },
                                  { value: "pph", label: "PPH" }
                                ]}
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Pilih jenis pajak..."
                                searchPlaceholder="Cari..."
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="taxTransactionType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("page.supplier.form.taxTransactionType", "Tipe Transaksi Pajak")}
                              </FormLabel>
                              <Combobox
                                options={[
                                  { value: "purchase", label: "Pembelian" },
                                  { value: "service", label: "Jasa" }
                                ]}
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Pilih tipe transaksi..."
                                searchPlaceholder="Cari..."
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="taxNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.taxNumber", "NPWP")}</FormLabel>
                              <Input
                                placeholder={t(
                                  "page.supplier.form.taxNumberPlaceholder",
                                  "Nomor NPWP"
                                )}
                                {...field}
                                maxLength={FIELD_LIMITS.NPWP}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="taxName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.taxName", "Nama NPWP")}</FormLabel>
                              <Input
                                placeholder={t(
                                  "page.supplier.form.taxNamePlaceholder",
                                  "Nama sesuai NPWP"
                                )}
                                {...field}
                                maxLength={FIELD_LIMITS.BUSINESS_NAME}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="nitku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.supplier.form.nitku", "NITKU")}</FormLabel>
                              <Input
                                placeholder={t("page.supplier.form.nitkuPlaceholder", "NITKU")}
                                {...field}
                                maxLength={FIELD_LIMITS.NITKU}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </form>
              </Form>
              <Modal
                type="confirm"
                open={confirmSaveModal}
                onOpenChange={setConfirmSaveModal}
                title={t("page.supplier.modal.confirmSave")}
                description={t("page.supplier.modal.confirmSaveDesc")}
                confirmText={t("page.supplier.modal.confirmSaveText")}
                onConfirm={() => {
                  setConfirmSaveModal(false);
                  const values = form.getValues();
                  onSubmit(values);
                }}
              />
              <MissingFieldsModal
                open={missingFieldsModal}
                onOpenChange={setMissingFieldsModal}
                fields={missingFieldsList}
              />
              <Modal
                type="confirm"
                open={!!deleteProductId}
                onOpenChange={() => setDeleteProductId(null)}
                title={t("page.supplier.products.confirmDelete")}
                description={t("page.supplier.products.confirmDeleteDesc")}
                confirmText={t("common.delete")}
                onConfirm={() => {
                  handleRemoveProduct(deleteProductId);
                  setDeleteProductId(null);
                }}
              />
            </Card>

            {isSuperAdmin && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("page.supplier.products.title")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("page.supplier.products.description")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setShowManualAdd(!showManualAdd);
                        setShowExcelImport(false);
                      }}>
                      <Plus size={14} />
                      {t("page.supplier.products.addProduct")}
                    </Button>
                    <Button
                      type="button"
                      variant="import"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setShowExcelImport(!showExcelImport);
                        setShowManualAdd(false);
                      }}>
                      <Upload size={14} />
                      {t("page.supplier.products.importExcel")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleDownloadTemplate}>
                      <Download size={14} />
                      {t("page.supplier.products.downloadTemplate")}
                    </Button>
                  </div>
                </div>

                {showManualAdd && (
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {t("page.supplier.products.productName")}
                        </label>
                        <Input
                          placeholder={t("page.supplier.products.searchPlaceholder")}
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          maxLength={FIELD_LIMITS.BUSINESS_NAME}
                        />
                      </div>
                      <div className="col-span-6 space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {t("page.supplier.products.table.price")}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Harga"
                            className="pl-9"
                            value={productPrice ? Number(productPrice).toLocaleString("id-ID") : ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, "");
                              setProductPrice(raw);
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-span-6 space-y-1">
                        <label className="text-xs text-muted-foreground">Satuan</label>
                        <Combobox
                          options={unitOptions}
                          value={productUnit}
                          onChange={(v) => setProductUnit(v)}
                          placeholder="Pilih satuan..."
                          searchPlaceholder="Cari satuan..."
                        />
                      </div>
                      <div className="col-span-6 space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {t("page.supplier.comparison.table.leadTime")}
                        </label>
                        <div className="flex gap-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={productLeadTime}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, "");
                              setProductLeadTime(v);
                            }}
                            className="flex-1 min-w-0"
                          />
                          <div className="flex-1 min-w-0">
                            <Combobox
                              options={[
                                { value: "hari", label: "Hari" },
                                { value: "jam", label: "Jam" },
                                { value: "menit", label: "Menit" }
                              ]}
                              value={productLeadTimeUnit}
                              onChange={(v) => setProductLeadTimeUnit(v)}
                              placeholder="Pilih..."
                              searchPlaceholder="Cari..."
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-xs text-muted-foreground">Kualitas (0-5)</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          maxLength={3}
                          showCount={false}
                          value={productQualityRating}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-5.]/g, "");
                            const num = parseFloat(v);
                            if (v === "" || v === "." || (num >= 0 && num <= 5 && v.length <= 3)) {
                              setProductQualityRating(v);
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-xs text-muted-foreground">Min Order</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="1"
                          maxLength={9}
                          showCount={false}
                          value={productMinOrderQty}
                          onChange={(e) => setProductMinOrderQty(digitsOnly(e.target.value))}
                        />
                      </div>
                      <div className="col-span-12 space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {t("page.supplier.products.notes")}
                        </label>
                        <Textarea
                          placeholder="Catatan opsional..."
                          rows={2}
                          value={productNotes}
                          onChange={(e) => setProductNotes(e.target.value)}
                          maxLength={FIELD_LIMITS.DESCRIPTION}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setEditingProductId(null);
                          setNewProductName("");
                          setProductPrice("");
                          setProductUnit("pcs");
                          setProductLeadTime("");
                          setProductLeadTimeUnit("hari");
                          setProductQualityRating("");
                          setProductMinOrderQty("");
                          setProductNotes("");
                          setShowManualAdd(false);
                        }}
                        className="flex-1 gap-1.5">
                        {t("common.cancel")}
                      </Button>
                      <Button
                        variant="success"
                        type="button"
                        size="sm"
                        disabled={!newProductName.trim() || !productPrice}
                        onClick={handleAddManualProduct}
                        className="flex-1 gap-1.5">
                        {editingProductId ? (
                          t("common.save")
                        ) : (
                          <>
                            <Plus size={14} />
                            {t("page.supplier.products.add")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {showExcelImport && (
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleDownloadTemplate}>
                      <Download size={14} />
                      {t("page.supplier.products.downloadTemplate")}
                    </Button>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      variant="import"
                      type="button"
                      size="sm"
                      disabled={!excelFile || excelImportMutation.isLoading}
                      onClick={handleExcelImport}
                      className="w-full gap-1.5">
                      <Upload size={14} />
                      {excelImportMutation.isLoading
                        ? t("common.loading")
                        : t("page.supplier.products.upload")}
                    </Button>
                  </div>
                )}

                {supplierProducts.length > 0 ? (
                  <HorizontalScrollArea className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm min-w-[840px]">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10">
                            #
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                            {t("page.supplier.products.table.name")}
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                            {t("page.supplier.products.table.price")}
                          </th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                            Satuan
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                            Lead Time
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                            Kualitas
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                            Min Order
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                            Catatan
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                            {t("page.supplier.products.table.action")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierProducts.map((p, index) => (
                          <tr
                            key={p.id}
                            className={`border-b last:border-b-0 ${editingProductId === p.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                            <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2">{p.name}</td>
                            <td className="px-3 py-2 text-right">
                              {Number(p.price).toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">{p.unit || "pcs"}</td>
                            <td className="px-3 py-2 text-right">
                              {p.leadTime || 0} {p.leadTimeUnit || "hari"}
                            </td>
                            <td className="px-3 py-2 text-right">{p.qualityRating || 0}</td>
                            <td className="px-3 py-2 text-right">{p.minOrderQty || 1}</td>
                            <td className="px-3 py-2 text-left text-xs text-muted-foreground max-w-[150px] truncate">
                              {p.notes || "-"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEditProduct(p)}>
                                <Pencil size={14} />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteProductId(p.id)}>
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                ) : (
                  <div className="border border-dashed rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("page.supplier.products.empty")}
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
          <Button
            variant="danger"
            onClick={requestLeave}
            className="gap-2 w-full sm:w-auto justify-center">
            <X size={18} />
            {t("common.cancel")}
          </Button>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button
              variant="draft"
              onClick={() => setDraftModal(true)}
              disabled={createMutation.isLoading}
              className="gap-2 w-full sm:w-auto justify-center">
              <Save size={18} />
              {t("page.supplier.form.saveAsDraft")}
            </Button>
            <Button
              variant="success"
              type="button"
              onClick={() => {
                const values = form.getValues();
                const extraErrors = [];
                if (isSuperAdmin && !allStores && selectedStore.length === 0) {
                  extraErrors.push({ name: "store", message: "required" });
                }
                const missing = getMissingFields(
                  values,
                  formSchema,
                  supplierFieldLabels,
                  extraErrors
                );
                if (missing.length > 0) {
                  setMissingFieldsList(missing);
                  setMissingFieldsModal(true);
                  return;
                }
                setConfirmSaveModal(true);
              }}
              disabled={createMutation.isLoading}
              className="gap-2 w-full sm:w-auto justify-center">
              <Save size={18} />
              {createMutation.isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </div>

      {createMutation.isLoading && (
        <Loading fullscreen size="lg" label={t("page.product.form.saving")} />
      )}

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
        title={t("page.supplier.modal.cancelTitle")}
        description={t("page.supplier.modal.cancelDescription")}
        confirmText={t("page.supplier.modal.confirmCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("common.success")}
        description={t("page.supplier.toast.addSuccess")}
        confirmText={t("page.supplier.modal.backToList")}
        onConfirm={() => setTimeout(() => navigate("/supplier"), 150)}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.supplier.modal.draftTitle")}
        description={t("page.supplier.modal.draftDescription")}
        confirmText={t("page.supplier.modal.draftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          const values = form.getValues();
          onSubmit(values, true);
        }}
      />
    </div>
  );
};

export default AddSupplier;

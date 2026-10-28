import { safeGet, hasOwn } from "@/lib/safe-lookup";
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useStore } from "@/contexts/StoreContext";
import { useQuery, useQueryClient } from "react-query";
import { toast } from "sonner";
import {
  MapPin,
  Phone,
  Mail,
  Hash,
  Globe,
  Building2,
  Store,
  ChevronRight,
  ArrowLeft,
  ImagePlus,
  Award,
  Medal,
  Coins,
  RotateCcw,
  Printer,
  X,
  Eye,
  FileText,
  Type,
  SlidersHorizontal,
  AlignJustify
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { getInvoiceSetting, updateInvoiceSetting, resetInvoiceSetting } from "@/services/invoice";
import { getLocationById } from "@/services/location";
import {
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
  getPostalCode
} from "@/services/general";
import { printViaBrowser } from "@/utils/thermalPrint";
import ReceiptPaper from "@/components/receipt/ReceiptPaper";
import { receiptLabels } from "@/components/receipt/receiptLabels";
import { buildAddressLines } from "@/utils/receiptDocument";
import AbortController from "@/components/organism/abort-controller";
import { Skeleton } from "@/components/ui/skeleton";
import { Loading } from "@/components/ui/loading";
import NoStore from "@/components/ui/NoStore";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import PageHeader from "@/components/ui/PageHeader";

const DEFAULT_INVOICE_TEMPLATE = {
  showStoreName: true,
  showAddress: true,
  showMemberInfo: true,
  showLogo: true,
  logo: null,
  footer: "Terima kasih atas kunjungan Anda",
  paperSize: "58mm",
  fontSize: "normal",
  fontFamily: "monospace",
  lineSpacing: "normal",
  addressFieldsVisibility: {
    storeName: true,
    address: true,
    locationDetail: true,
    province: true,
    city: true,
    district: true,
    village: true,
    postalCode: true,
    phone: true,
    email: true
  },
  memberFieldsVisible: { name: true, tier: true, points: true }
};

const sampleItems = [
  { name: "Nasi Goreng", qty: 2, price: 25000 },
  { name: "Es Teh Manis", qty: 1, price: 8000 },
  { name: "Ayam Bakar", qty: 1, price: 35000 }
];

const sampleMember = {
  name: "Budi Santoso",
  tier: "Gold",
  points: 2450
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={18} className="text-muted-foreground" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5 break-words">{value || "-"}</p>
    </div>
  </div>
);

const InvoicePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cookie, setCookie] = useCookies();
  const queryClient = useQueryClient();
  const logoInputRef = useRef(null);
  const { setActiveStore, isSuperAdmin: ctxSuperAdmin } = useStore();

  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const [selectedStore, setSelectedStore] = useState(isSuperAdmin ? "" : String(user?.store || ""));
  const cashierName = user?.userName || user?.name || user?.fullName || "";

  const { data: locData, isLoading: locLoading } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locationList = locData?.data || locData || [];

  const {
    data: storeData,
    isLoading: storeLoading,
    isError: storeError,
    refetch: refetchStore
  } = useQuery(["store-detail", selectedStore], () => getLocationById({ id: selectedStore }), {
    enabled: !!selectedStore
  });
  const locationDetail = (storeData?.data || storeData) ?? null;
  const hasStore = !!locationDetail && !!(locationDetail?.name || locationDetail?.storeName);
  const storeName = hasStore ? locationDetail?.name || locationDetail?.storeName : "Nama Toko";
  const storePhone = hasStore ? locationDetail?.phoneNumber || "" : "";
  const storeEmail = hasStore ? locationDetail?.email || "" : "";

  const [showStoreName, setShowStoreName] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showMemberInfo, setShowMemberInfo] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showSocialMedia, setShowSocialMedia] = useState(true);
  const [socialMediaVisible, setSocialMediaVisible] = useState({});
  const [addressFieldsVisible, setAddressFieldsVisible] = useState({
    storeName: true,
    address: true,
    locationDetail: true,
    province: true,
    city: true,
    district: true,
    village: true,
    postalCode: true,
    phone: true,
    email: true
  });
  const [memberFieldsVisible, setMemberFieldsVisible] = useState({
    name: true,
    tier: true,
    points: true
  });
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [footerText, setFooterText] = useState("Terima kasih atas kunjungan Anda");
  const [paperSize, setPaperSize] = useState("58mm");
  const [fontSize, setFontSize] = useState("normal");
  const [fontFamily, setFontFamily] = useState("monospace");
  const [lineSpacing, setLineSpacing] = useState("normal");
  const [isSaving, setIsSaving] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [selectedStores, setSelectedStores] = useState([]);

  const { data: provinces } = useQuery(["provinces"], getProvinces, {
    enabled: hasStore && !!locationDetail?.province
  });
  const { data: cities } = useQuery(
    ["cities", locationDetail?.province],
    () => getCities(locationDetail.province),
    { enabled: hasStore && !!locationDetail?.province }
  );
  const { data: districts } = useQuery(
    ["districts", locationDetail?.city],
    () => getDistricts(locationDetail.city),
    { enabled: hasStore && !!locationDetail?.city }
  );
  const { data: villages } = useQuery(
    ["villages", locationDetail?.district],
    () => getVillages(locationDetail.district),
    { enabled: hasStore && !!locationDetail?.district }
  );
  const { data: postalCodes } = useQuery(
    ["postal-codes", locationDetail?.village],
    () => getPostalCode(locationDetail.village),
    { enabled: hasStore && !!locationDetail?.village }
  );

  const provinceName =
    provinces?.find((p) => p.kode_prov === locationDetail?.province)?.nama_provinsi ||
    locationDetail?.province ||
    "";
  const cityName =
    cities?.find((c) => c.kode_kab === locationDetail?.city)?.nama_kabupaten ||
    locationDetail?.city ||
    "";
  const districtName =
    districts?.find((d) => d.kode_kec === locationDetail?.district)?.nama_kecamatan ||
    locationDetail?.district ||
    "";
  const villageName =
    villages?.find((v) => v.kode_desa === locationDetail?.village)?.nama_desa ||
    locationDetail?.village ||
    "";
  const postalCodeValue = postalCodes?.[0]?.kode_pos || locationDetail?.postalCode || "";

  const hasAddress = !!locationDetail?.address;
  const hasDetailLocation = !!locationDetail?.detailLocation;
  const hasPhone = !!storePhone;
  const hasEmail = !!storeEmail;
  const hasPostalCode = !!postalCodeValue;
  const hasSocialMedia = !!locationDetail?.socialMedia?.length;

  const { data: invoiceSettings } = useQuery(
    ["invoice-settings", selectedStore],
    () => getInvoiceSetting(selectedStore),
    {
      enabled: !!selectedStore
    }
  );

  const settingsData = invoiceSettings?.data || null;

  useEffect(() => {
    if (settingsData) {
      if (settingsData.showStoreName !== undefined) setShowStoreName(settingsData.showStoreName);
      if (settingsData.showAddress !== undefined) setShowAddress(settingsData.showAddress);
      if (settingsData.showMemberInfo !== undefined) setShowMemberInfo(settingsData.showMemberInfo);
      if (settingsData.showLogo !== undefined) setShowLogo(settingsData.showLogo);
      if (settingsData.showSocialMedia !== undefined)
        setShowSocialMedia(settingsData.showSocialMedia);
      if (settingsData.paperSize) {
        setPaperSize(settingsData.paperSize);
      }
      if (settingsData.fontSize) {
        setFontSize(settingsData.fontSize);
      }
      if (settingsData.fontFamily) {
        setFontFamily(settingsData.fontFamily);
      }
      if (settingsData.lineSpacing) {
        setLineSpacing(settingsData.lineSpacing);
      }
      if (settingsData.socialMediaVisibility) {
        try {
          const v =
            typeof settingsData.socialMediaVisibility === "string"
              ? JSON.parse(settingsData.socialMediaVisibility)
              : settingsData.socialMediaVisibility;
          setSocialMediaVisible(v);
        } catch (err) {
          console.error("Failed to parse socialMediaVisibility:", err);
        }
      }
      if (settingsData.logo) {
        setLogoUrl(settingsData.logo);
        setLogoPreview(settingsData.logo);
      }
      if (settingsData.footer !== undefined && settingsData.footer !== null) {
        setFooterText(settingsData.footer);
      } else {
        setFooterText(DEFAULT_INVOICE_TEMPLATE.footer);
      }
      if (settingsData.addressFieldsVisibility) {
        try {
          const v =
            typeof settingsData.addressFieldsVisibility === "string"
              ? JSON.parse(settingsData.addressFieldsVisibility)
              : settingsData.addressFieldsVisibility;
          setAddressFieldsVisible((prev) => ({ ...prev, ...v }));
        } catch (err) {
          console.error("Failed to parse addressFieldsVisibility:", err);
        }
      }
      if (settingsData.memberFieldsVisibility) {
        try {
          const v =
            typeof settingsData.memberFieldsVisibility === "string"
              ? JSON.parse(settingsData.memberFieldsVisibility)
              : settingsData.memberFieldsVisibility;
          setMemberFieldsVisible((prev) => ({ ...prev, ...v }));
        } catch (err) {
          console.error("Failed to parse memberFieldsVisibility:", err);
        }
      }
    }
  }, [settingsData]);

  useEffect(() => {
    if (locationDetail?.socialMedia?.length) {
      // ponytail: fromEntries + hasOwn — bebas object injection
      const base = Object.fromEntries(locationDetail.socialMedia.map((_, i) => [i, true]));
      setSocialMediaVisible((prev) => {
        const overrides = Object.entries(prev).filter(([k]) => hasOwn(base, k));
        return { ...base, ...Object.fromEntries(overrides) };
      });
    }
  }, [locationDetail?.socialMedia]);

  const allSelected = locationList.length > 0 && selectedStores.length === locationList.length;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoUrl(null);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
  };

  const handleOpenResetModal = () => {
    setSelectedStores([]);
    setResetModalOpen(true);
  };

  const handleToggleStore = (id) => {
    setSelectedStores((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSelectAll = (checked) => {
    setSelectedStores(checked ? locationList.map((l) => l.id) : []);
  };

  const handleConfirmReset = async () => {
    if (selectedStores.length === 0) {
      toast.error(t("page.invoice.validation.selectStore"));
      return;
    }

    try {
      await resetInvoiceSetting({ stores: selectedStores });
      setShowStoreName(DEFAULT_INVOICE_TEMPLATE.showStoreName);
      setShowAddress(DEFAULT_INVOICE_TEMPLATE.showAddress);
      setShowMemberInfo(DEFAULT_INVOICE_TEMPLATE.showMemberInfo);
      setShowLogo(DEFAULT_INVOICE_TEMPLATE.showLogo);
      setFooterText(DEFAULT_INVOICE_TEMPLATE.footer);
      setPaperSize(DEFAULT_INVOICE_TEMPLATE.paperSize || "58mm");
      setFontSize(DEFAULT_INVOICE_TEMPLATE.fontSize || "normal");
      setFontFamily(DEFAULT_INVOICE_TEMPLATE.fontFamily || "monospace");
      setLineSpacing(DEFAULT_INVOICE_TEMPLATE.lineSpacing || "normal");
      setAddressFieldsVisible(DEFAULT_INVOICE_TEMPLATE.addressFieldsVisibility);
      setMemberFieldsVisible(DEFAULT_INVOICE_TEMPLATE.memberFieldsVisible);
      setLogoUrl(null);
      setLogoFile(null);
      setLogoPreview(null);
      setResetModalOpen(false);
      queryClient.invalidateQueries(["invoice-settings"]);
      toast.success(t("page.invoice.toast.resetSuccess"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("page.invoice.toast.resetFailed"));
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = new FormData();
      payload.append("store", selectedStore);
      payload.append("showStoreName", showStoreName);
      payload.append("showAddress", showAddress);
      payload.append("showMemberInfo", showMemberInfo);
      payload.append("showLogo", showLogo);
      payload.append("showSocialMedia", showSocialMedia);
      payload.append("socialMediaVisibility", JSON.stringify(socialMediaVisible));
      payload.append("addressFieldsVisibility", JSON.stringify(addressFieldsVisible));
      payload.append("memberFieldsVisibility", JSON.stringify(memberFieldsVisible));
      payload.append("footer", footerText);
      payload.append("paperSize", paperSize);
      payload.append("fontSize", fontSize);
      payload.append("fontFamily", fontFamily);
      payload.append("lineSpacing", lineSpacing);
      if (logoFile) {
        payload.append("logo", logoFile);
      } else if (!logoPreview) {
        payload.append("removeLogo", "true");
      }

      await updateInvoiceSetting(payload);
      toast.success(t("page.invoice.toast.saveSuccess"));
      setLogoFile(null);
      queryClient.invalidateQueries(["invoice-settings"]);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("page.invoice.toast.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSave = () => {
    setSaveConfirmOpen(false);
    handleSaveSettings();
  };

  // One sample receipt drives both the on-screen preview and the print, so
  // the preview is exactly what the printer receives.
  const sampleReceipt = useMemo(() => {
    const items = sampleItems.map((i) => ({ ...i, total: i.qty * i.price }));
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    const cashAmount = Math.ceil(total / 10000) * 10000;
    return {
      labels: receiptLabels(t),
      storeName,
      addressLines: buildAddressLines(
        {
          address: locationDetail?.address,
          locationDetail: locationDetail?.detailLocation,
          village: villageName,
          district: districtName,
          city: cityName,
          province: provinceName,
          postalCode: postalCodeValue,
          phone: storePhone,
          email: storeEmail
        },
        addressFieldsVisible
      ),
      logo: logoPreview,
      memberName: sampleMember.name,
      memberTier: sampleMember.tier,
      memberPoints: sampleMember.points,
      orderNumber: "INV-20261019-0001",
      cashier: cashierName || "Kasir",
      date: new Date(),
      paymentMethod: "Tunai",
      items,
      subtotal,
      tax,
      taxLabel: `${t("page.cashier.tax")} (10%)`,
      total,
      cashAmount,
      changeAmount: cashAmount - total,
      footer: footerText || t("page.invoice.footerDefault"),
      socialMedia: locationDetail?.socialMedia || [],
      socialMediaVisibility: socialMediaVisible,
      showLogo,
      showStoreName,
      showAddress,
      showMemberInfo,
      showSocialMedia,
      addressFieldsVisibility: addressFieldsVisible,
      memberFieldsVisibility: memberFieldsVisible,
      paperSize,
      fontSize,
      fontFamily,
      lineSpacing
    };
  }, [
    t,
    storeName,
    locationDetail,
    villageName,
    districtName,
    cityName,
    provinceName,
    postalCodeValue,
    storePhone,
    storeEmail,
    addressFieldsVisible,
    logoPreview,
    cashierName,
    footerText,
    socialMediaVisible,
    showLogo,
    showStoreName,
    showAddress,
    showMemberInfo,
    showSocialMedia,
    memberFieldsVisible,
    paperSize,
    fontSize,
    fontFamily,
    lineSpacing
  ]);

  const handlePrintPreview = () => printViaBrowser(sampleReceipt);

  return (
    <div data-tour="page-settings" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("page.invoice.title") }
        ]}
        title={t("page.invoice.title")}
        description={t("page.invoice.description")}
      />

      {!selectedStore ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center w-full">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Store size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("page.invoice.title")}</h2>
            <p className="text-muted-foreground mb-8">Pilih toko</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {locLoading
                ? [0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card ${
                        i === 1 ? "hidden sm:flex" : i >= 2 ? "hidden lg:flex" : ""
                      }`}>
                      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-5 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                      <Skeleton className="w-5 h-5 shrink-0" />
                    </div>
                  ))
                : locationList.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStore(String(s.id));
                        if (isSuperAdmin) {
                          setActiveStore(String(s.id), s.name || "");
                        }
                      }}
                      className="flex items-center gap-4 p-5 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all text-left group">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15">
                        <Store size={24} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{s.name}</p>
                        <p className="text-sm text-muted-foreground">Pilih toko</p>
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                      />
                    </button>
                  ))}
            </div>
          </div>
        </div>
      ) : storeError ? (
        <AbortController refetch={refetchStore} />
      ) : storeLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-5 w-px" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <div className="lg:col-span-3 space-y-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-5 h-5 rounded" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
              <div className="flex gap-3">
                <Skeleton className="h-11 flex-1 rounded-md" />
                <Skeleton className="h-11 flex-1 rounded-md" />
              </div>
            </div>
            <div className="lg:col-span-2 lg:sticky lg:top-20 z-10">
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5 rounded" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-8 w-28 rounded-md" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setSelectedStore("")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
              {t("common.back")}
            </button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Store size={18} className="text-primary" />
              <span className="font-semibold text-lg">{storeName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <div className="lg:col-span-3 space-y-6">
              <div data-tour="invoice-logo" className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ImagePlus size={18} className="text-primary" />
                    <h3 className="text-base font-semibold">{t("page.invoice.logo")}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImagePlus size={28} className="mx-auto mb-1" />
                        <p className="text-xs">{t("page.invoice.noLogo")}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      className="gap-2">
                      <ImagePlus size={14} />
                      {logoPreview ? t("page.invoice.changeLogo") : t("page.invoice.selectLogo")}
                    </Button>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="gap-2 text-destructive">
                        <X size={14} />
                        {t("page.invoice.deleteLogo")}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.invoice.logoFormat")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ukuran Kertas Thermal Struk POS */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Printer size={18} className="text-primary" />
                    <h3 className="text-base font-semibold">Ukuran Kertas Thermal Struk</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {paperSize}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Pilih ukuran standar kertas printer POS kasir (58mm mini atau 80mm standar POS
                  lebar).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaperSize("58mm")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paperSize === "58mm"
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : "border-border hover:border-border/80 bg-card text-muted-foreground"
                    }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-foreground">58mm (Standar Mini)</span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paperSize === "58mm" ? "border-primary" : "border-muted-foreground"
                        }`}>
                        {paperSize === "58mm" && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Printer Bluetooth portabel / thermal POS 58mm compact (~32 kolom).
                    </p>
                  </div>
                  <div
                    onClick={() => setPaperSize("80mm")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paperSize === "80mm"
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : "border-border hover:border-border/80 bg-card text-muted-foreground"
                    }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-foreground">
                        80mm (Standar POS Lebar)
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paperSize === "80mm" ? "border-primary" : "border-muted-foreground"
                        }`}>
                        {paperSize === "80mm" && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Printer kasir desktop USB / LAN / Serial 80mm standar (~48 kolom).
                    </p>
                  </div>
                </div>
              </div>

              {/* Kustomisasi Font, Gaya Huruf & Tata Letak */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Type size={18} className="text-primary" />
                  <div>
                    <h3 className="text-base font-semibold">Tipografi & Kerapatan Struk</h3>
                    <p className="text-xs text-muted-foreground">
                      Sesuaikan ukuran font, gaya tulisan, dan kerapatan baris pada struk belanja.
                    </p>
                  </div>
                </div>

                {/* Ukuran Font */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Ukuran Font (Font Size)
                    </Label>
                    <span className="text-xs font-medium text-muted-foreground">
                      {fontSize === "small"
                        ? "Kecil (10px)"
                        : fontSize === "large"
                          ? "Besar (14px)"
                          : "Standar (12px)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "small", label: "Kecil", desc: "Kompak & hemat kertas" },
                      { key: "normal", label: "Standar", desc: "Seimbang & nyaman" },
                      { key: "large", label: "Besar", desc: "Ekstra jelas terbaca" }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setFontSize(opt.key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          fontSize === opt.key
                            ? "border-primary bg-primary/5 text-foreground shadow-xs font-medium"
                            : "border-border hover:border-border/80 text-muted-foreground"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{opt.label}</span>
                          {fontSize === opt.key && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gaya Font (Font Family) */}
                <div className="space-y-2.5 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Gaya Tulisan (Font Family)
                    </Label>
                    <span className="text-xs font-medium text-muted-foreground">
                      {fontFamily === "sans"
                        ? "Sans-Serif"
                        : fontFamily === "serif"
                          ? "Serif"
                          : "Monospace"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        key: "monospace",
                        label: "Monospace",
                        fontCls: "font-mono",
                        desc: "Klasik POS Thermal"
                      },
                      {
                        key: "sans",
                        label: "Sans-Serif",
                        fontCls: "font-sans",
                        desc: "Modern & Bersih"
                      },
                      {
                        key: "serif",
                        label: "Serif",
                        fontCls: "font-serif",
                        desc: "Formal & Elegan"
                      }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setFontFamily(opt.key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          fontFamily === opt.key
                            ? "border-primary bg-primary/5 text-foreground shadow-xs"
                            : "border-border hover:border-border/80 text-muted-foreground"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold text-foreground ${opt.fontCls}`}>
                            {opt.label}
                          </span>
                          {fontFamily === opt.key && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kerapatan Baris (Line Spacing) */}
                <div className="space-y-2.5 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Kerapatan Baris (Line Spacing)
                    </Label>
                    <span className="text-xs font-medium text-muted-foreground">
                      {lineSpacing === "compact"
                        ? "Rapat"
                        : lineSpacing === "relaxed"
                          ? "Longgar"
                          : "Standar"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "compact", label: "Rapat", desc: "Hemat ruang kertas" },
                      { key: "normal", label: "Standar", desc: "Jarak baris normal" },
                      { key: "relaxed", label: "Longgar", desc: "Lega & berjarak" }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setLineSpacing(opt.key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          lineSpacing === opt.key
                            ? "border-primary bg-primary/5 text-foreground shadow-xs font-medium"
                            : "border-border hover:border-border/80 text-muted-foreground"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{opt.label}</span>
                          {lineSpacing === opt.key && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={18} className="text-primary" />
                  <h3 className="text-base font-semibold">{t("page.invoice.footer")}</h3>
                </div>
                <Textarea
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder={t("page.invoice.footerPlaceholder")}
                  className="text-sm min-h-[80px]"
                  rows={4}
                  maxLength={FIELD_LIMITS.DESCRIPTION}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t("page.invoice.footerDescription")}
                </p>
              </div>

              <div
                data-tour="invoice-address"
                className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-primary" />
                    <h3 className="text-base font-semibold">{t("page.invoice.storeAddress")}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={showAddress} onCheckedChange={setShowAddress} />
                  </div>
                </div>
                {hasStore ? (
                  <div className="space-y-3">
                    {[
                      {
                        key: "storeName",
                        icon: Store,
                        label: t("page.invoice.storeName"),
                        value: storeName,
                        hasData: !!storeName
                      },
                      {
                        key: "address",
                        icon: MapPin,
                        label: t("page.invoice.address"),
                        value: locationDetail?.address,
                        hasData: hasAddress
                      },
                      ...(locationDetail?.detailLocation
                        ? [
                            {
                              key: "locationDetail",
                              icon: Globe,
                              label: t("page.invoice.locationDetail"),
                              value: locationDetail.detailLocation,
                              hasData: hasDetailLocation
                            }
                          ]
                        : []),
                      {
                        key: "province",
                        icon: Building2,
                        label: t("page.invoice.province"),
                        value: provinceName,
                        hasData: !!provinceName
                      },
                      {
                        key: "city",
                        icon: Building2,
                        label: t("page.invoice.city"),
                        value: cityName,
                        hasData: !!cityName
                      },
                      {
                        key: "district",
                        icon: Building2,
                        label: t("page.invoice.district"),
                        value: districtName,
                        hasData: !!districtName
                      },
                      {
                        key: "village",
                        icon: Building2,
                        label: t("page.invoice.village"),
                        value: villageName,
                        hasData: !!villageName
                      },
                      {
                        key: "postalCode",
                        icon: Hash,
                        label: t("page.invoice.postalCode"),
                        value: postalCodeValue,
                        hasData: hasPostalCode
                      },
                      {
                        key: "phone",
                        icon: Phone,
                        label: t("page.invoice.phone"),
                        value: storePhone,
                        hasData: hasPhone
                      },
                      {
                        key: "email",
                        icon: Mail,
                        label: t("page.invoice.email"),
                        value: storeEmail,
                        hasData: hasEmail
                      }
                    ].map(({ key, icon: Icon, label, value, hasData }) => {
                      const isEmpty = hasData === false;
                      return (
                        <label
                          key={key}
                          className={`flex items-center justify-between p-3 rounded-lg border border-border transition-colors ${
                            isEmpty
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:bg-muted/50"
                          }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon size={16} className="text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs text-muted-foreground">{label}</span>
                              <p className="text-sm font-medium truncate">{value || "-"}</p>
                            </div>
                          </div>
                          <Switch
                            checked={safeGet(addressFieldsVisible, key) ?? true}
                            disabled={isEmpty}
                            onCheckedChange={(v) =>
                              setAddressFieldsVisible((prev) => ({ ...prev, [key]: v }))
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t("page.invoice.noStoreAvailable")}
                  </p>
                )}
              </div>

              <div
                data-tour="invoice-member"
                className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-yellow-600" />
                    <h3 className="text-base font-semibold">{t("page.invoice.memberInfo")}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={showMemberInfo} onCheckedChange={setShowMemberInfo} />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Medal size={16} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs text-muted-foreground">
                          {t("page.invoice.memberName")}
                        </span>
                        <p className="text-sm font-medium">{sampleMember.name}</p>
                      </div>
                    </div>
                    <Switch
                      checked={memberFieldsVisible.name ?? true}
                      onCheckedChange={(v) =>
                        setMemberFieldsVisible((prev) => ({ ...prev, name: v }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Award size={16} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs text-muted-foreground">
                          {t("page.invoice.memberTier")}
                        </span>
                        <p className="text-sm font-medium">{sampleMember.tier}</p>
                      </div>
                    </div>
                    <Switch
                      checked={memberFieldsVisible.tier ?? true}
                      onCheckedChange={(v) =>
                        setMemberFieldsVisible((prev) => ({ ...prev, tier: v }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Coins size={16} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs text-muted-foreground">
                          {t("page.invoice.totalPoints")}
                        </span>
                        <p className="text-sm font-medium">
                          {Number(sampleMember.points).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={memberFieldsVisible.points ?? true}
                      onCheckedChange={(v) =>
                        setMemberFieldsVisible((prev) => ({ ...prev, points: v }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div
                data-tour="invoice-social"
                className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center gap-2 ${!hasSocialMedia ? "opacity-50" : ""}`}>
                    <Globe size={18} className="text-primary" />
                    <h3 className="text-base font-semibold">{t("page.invoice.socialMedia")}</h3>
                  </div>
                  <Switch
                    checked={showSocialMedia}
                    onCheckedChange={setShowSocialMedia}
                    disabled={!hasSocialMedia}
                  />
                </div>
                {locationDetail?.socialMedia?.length ? (
                  <div className="space-y-3">
                    {locationDetail.socialMedia.map((sm, i) => (
                      <label
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Globe size={16} className="text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">
                            {sm.platform}: {sm.account}
                          </span>
                        </div>
                        <Switch
                          checked={safeGet(socialMediaVisible, i) ?? true}
                          onCheckedChange={(v) =>
                            setSocialMediaVisible((prev) => ({ ...prev, [i]: v }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t("page.invoice.noStoreAvailable")}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleOpenResetModal}
                  className="flex-1 gap-2"
                  size="lg">
                  <RotateCcw size={16} />
                  {t("page.invoice.resetDefault")}
                </Button>
                <Button
                  variant="success"
                  data-tour="invoice-save"
                  onClick={() => setSaveConfirmOpen(true)}
                  disabled={isSaving}
                  className="flex-1 gap-2"
                  size="lg">
                  {isSaving ? t("page.invoice.saving") : t("page.invoice.saveSettings")}
                </Button>
              </div>
            </div>

            <div
              className="lg:col-span-2"
              style={{ position: "sticky", top: "5rem", alignSelf: "start" }}>
              <div
                data-tour="invoice-preview"
                className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <Eye size={18} className="text-primary" />
                    <h3 className="text-base font-semibold">{t("page.invoice.preview")}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintPreview}
                      className="gap-1.5 shrink-0">
                      <Printer size={14} />
                      {t("page.invoice.printPreview")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintPreview}
                      title={t("page.invoice.pdfHint")}
                      className="gap-1.5 shrink-0">
                      <FileText size={18} className="text-base" />
                      PDF
                    </Button>
                  </div>
                </div>
                <ReceiptPaper data={sampleReceipt} />
              </div>
            </div>
          </div>

          <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{t("page.invoice.resetTitle")}</DialogTitle>
                <DialogDescription>{t("page.invoice.resetDescription")}</DialogDescription>
              </DialogHeader>

              <div className="py-2">
                {user?.roleType === "super_admin" && locationList.length > 0 && (
                  <label className="flex items-center gap-2 pb-3 mb-3 border-b border-border cursor-pointer">
                    <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                    <span className="text-sm font-medium">{t("common.selectAll")}</span>
                  </label>
                )}

                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {(user?.roleType === "super_admin" ? locationList : [locationDetail])
                      .filter(Boolean)
                      .map((loc) => (
                        <label
                          key={loc.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={selectedStores.includes(loc.id)}
                            onCheckedChange={() => handleToggleStore(loc.id)}
                          />
                          <div className="flex items-center gap-2 min-w-0">
                            <Store size={16} className="text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{loc.name}</p>
                              {loc.city && (
                                <p className="text-xs text-muted-foreground truncate">{loc.city}</p>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                </ScrollArea>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setResetModalOpen(false)}>
                  {t("common.no")}
                </Button>
                <Button onClick={handleConfirmReset}>{t("page.invoice.yesReset")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{t("page.invoice.saveConfirmTitle")}</DialogTitle>
                <DialogDescription>{t("page.invoice.saveConfirmDesc")}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="danger" onClick={() => setSaveConfirmOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button variant="success" onClick={handleConfirmSave}>
                  {t("common.confirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      {isSaving && <Loading fullscreen size="lg" label={t("page.invoice.saving")} />}
    </div>
  );
};

export default InvoicePage;

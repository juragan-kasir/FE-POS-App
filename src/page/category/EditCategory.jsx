import React, { useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { getCategoryById, editCategory, getAllCategory } from "@/services/category";
import { Info, ImagePlus, BookOpen, LayoutGrid, X, Search, SearchX } from "lucide-react";
import DynamicIcon from "@/components/ui/DynamicIcon";
import { Button } from "@/components/ui/button";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import { Check, Eye } from "lucide-react";

import Modal from "@/components/organism/modal";
// Removed useConfirmSubmit - replaced with MissingFieldsModal pattern
import PageHeader from "@/components/ui/PageHeader";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl
} from "@/components/ui/form";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import CategoryPreviewModal from "./CategoryPreviewModal";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const iconSections = [
  {
    title: "Makanan & Minuman",
    icons: [
      { icon: "restaurant", label: "Restoran" },
      { icon: "bakery_dining", label: "Roti" },
      { icon: "local_bar", label: "Bar" },
      { icon: "icecream", label: "Es Krim" },
      { icon: "egg_alt", label: "Telur" },
      { icon: "local_pizza", label: "Pizza" },
      { icon: "fastfood", label: "Fast Food" },
      { icon: "coffee", label: "Kopi" },
      { icon: "ramen_dining", label: "Ramen" },
      { icon: "lunch_dining", label: "Makan Siang" },
      { icon: "dinner_dining", label: "Makan Malam" },
      { icon: "breakfast_dining", label: "Sarapan" },
      { icon: "cake", label: "Kue" },
      { icon: "cookie", label: "Kukis" },
      { icon: "takeout_dining", label: "Bungkus" },
      { icon: "set_meal", label: "Paket" },
      { icon: "tapas", label: "Tapas" },
      { icon: "soup_kitchen", label: "Sup" },
      { icon: "water_drop", label: "Air" },
      { icon: "liquor", label: "Minuman" },
      { icon: "wine_bar", label: "Anggur" },
      { icon: "local_cafe", label: "Kafe" },
      { icon: "kitchen", label: "Dapur" }
    ]
  },
  {
    title: "Ritel & Belanja",
    icons: [
      { icon: "storefront", label: "Toko" },
      { icon: "sell", label: "Jual" },
      { icon: "local_mall", label: "Mal" },
      { icon: "payments", label: "Bayar" },
      { icon: "shopping_bag", label: "Tas" },
      { icon: "shopping_cart", label: "Keranjang" },
      { icon: "point_of_sale", label: "POS" },
      { icon: "receipt_long", label: "Struk" },
      { icon: "price_check", label: "Harga" },
      { icon: "card_giftcard", label: "Hadiah" },
      { icon: "shopping_basket", label: "Belanja" },
      { icon: "inventory_2", label: "Inventori" },
      { icon: "barcode", label: "Barcode" },
      { icon: "qr_code", label: "QR" },
      { icon: "wallet", label: "Dompet" },
      { icon: "account_balance", label: "Bank" },
      { icon: "currency_exchange", label: "Tukar" }
    ]
  },
  {
    title: "Elektronik",
    icons: [
      { icon: "computer", label: "Komputer" },
      { icon: "smartphone", label: "HP" },
      { icon: "headphones", label: "Headset" },
      { icon: "watch", label: "Jam" },
      { icon: "laptop_mac", label: "Laptop" },
      { icon: "tablet", label: "Tablet" },
      { icon: "tv", label: "TV" },
      { icon: "camera_alt", label: "Kamera" },
      { icon: "speaker", label: "Speaker" },
      { icon: "memory", label: "Memori" },
      { icon: "keyboard", label: "Keyboard" },
      { icon: "mouse", label: "Mouse" },
      { icon: "print", label: "Printer" },
      { icon: "scanner", label: "Scanner" },
      { icon: "monitor", label: "Monitor" },
      { icon: "power", label: "Daya" },
      { icon: "battery_charging_full", label: "Baterai" },
      { icon: "cable", label: "Kabel" },
      { icon: "router", label: "Router" },
      { icon: "devices", label: "Perangkat" }
    ]
  },
  {
    title: "Fashion & Aksesoris",
    icons: [
      { icon: "checkroom", label: "Pakaian" },
      { icon: "dry_cleaning", label: "Laundry" },
      { icon: "laundry", label: "Cuci" },
      { icon: "styler", label: "Styler" },
      { icon: "diamond", label: "Berlian" },
      { icon: "watch", label: "Jam" },
      { icon: "wallet", label: "Dompet" },
      { icon: "backpack", label: "Tas" },
      { icon: "luggage", label: "Koper" },
      { icon: "diamond", label: "Aksesoris" },
      { icon: "umbrella", label: "Payung" }
    ]
  },
  {
    title: "Rumah & Kebun",
    icons: [
      { icon: "home", label: "Rumah" },
      { icon: "chair", label: "Kursi" },
      { icon: "bed", label: "Tidur" },
      { icon: "light", label: "Lampu" },
      { icon: "potted_plant", label: "Tanaman" },
      { icon: "local_florist", label: "Bunga" },
      { icon: "yard", label: "Halaman" },
      { icon: "grass", label: "Rumput" },
      { icon: "deck", label: "Dek" },
      { icon: "fence", label: "Pagar" },
      { icon: "roofing", label: "Atap" },
      { icon: "window", label: "Jendela" },
      { icon: "door_front", label: "Pintu" },
      { icon: "garage", label: "Garasi" },
      { icon: "vacuum", label: "Sapu" },
      { icon: "kitchen", label: "Dapur" },
      { icon: "bathtub", label: "Bath" },
      { icon: "shower", label: "Shower" }
    ]
  },
  {
    title: "Olahraga & Kebugaran",
    icons: [
      { icon: "fitness_center", label: "Gym" },
      { icon: "sports_soccer", label: "Sepak Bola" },
      { icon: "sports_basketball", label: "Basket" },
      { icon: "sports_tennis", label: "Tenis" },
      { icon: "sports_volleyball", label: "Voli" },
      { icon: "sports_baseball", label: "Baseball" },
      { icon: "sports_golf", label: "Golf" },
      { icon: "sports_esports", label: "Game" },
      { icon: "sports_kabaddi", label: "Beladiri" },
      { icon: "sports_hockey", label: "Hoki" },
      { icon: "sports_cricket", label: "Kriket" },
      { icon: "snowboarding", label: "Snow" },
      { icon: "skateboarding", label: "Skate" },
      { icon: "directions_run", label: "Lari" },
      { icon: "directions_bike", label: "Bike" },
      { icon: "pool", label: "Renang" },
      { icon: "hiking", label: "Hiking" }
    ]
  },
  {
    title: "Kesehatan & Kecantikan",
    icons: [
      { icon: "health_and_safety", label: "Sehat" },
      { icon: "medical_services", label: "Medis" },
      { icon: "local_hospital", label: "RS" },
      { icon: "vaccines", label: "Vaksin" },
      { icon: "pill", label: "Obat" },
      { icon: "stethoscope", label: "Stetoskop" },
      { icon: "biotech", label: "Bio" },
      { icon: "face", label: "Wajah" },
      { icon: "spa", label: "Spa" },
      { icon: "soap", label: "Sabun" },
      { icon: "massage", label: "Pijat" }
    ]
  },
  {
    title: "Hiburan & Media",
    icons: [
      { icon: "theater_comedy", label: "Teater" },
      { icon: "celebration", label: "Pesta" },
      { icon: "auto_stories", label: "Buku" },
      { icon: "brush", label: "Seni" },
      { icon: "music_note", label: "Musik" },
      { icon: "movie", label: "Film" },
      { icon: "videogame_asset", label: "Game" },
      { icon: "piano", label: "Piano" },
      { icon: "palette", label: "Lukis" },
      { icon: "mic", label: "Mikrofon" },
      { icon: "album", label: "Album" },
      { icon: "live_tv", label: "TV" },
      { icon: "podcasts", label: "Podcast" },
      { icon: "library_music", label: "Musik" },
      { icon: "party_mode", label: "Pesta" },
      { icon: "sports_esports", label: "Game" }
    ]
  },
  {
    title: "Transportasi",
    icons: [
      { icon: "directions_car", label: "Mobil" },
      { icon: "local_shipping", label: "Kirim" },
      { icon: "airport_shuttle", label: "Shuttle" },
      { icon: "two_wheeler", label: "Motor" },
      { icon: "pedal_bike", label: "Sepeda" },
      { icon: "flight", label: "Pesawat" },
      { icon: "directions_boat", label: "Kapal" },
      { icon: "train", label: "Kereta" },
      { icon: "bus_alert", label: "Bus" },
      { icon: "taxi_alert", label: "Taksi" },
      { icon: "ev_station", label: "Charger" },
      { icon: "local_gas_station", label: "Bensin" },
      { icon: "toll", label: "Tol" },
      { icon: "car_rental", label: "Sewa" }
    ]
  },
  {
    title: "Bisnis & Keuangan",
    icons: [
      { icon: "account_balance", label: "Bank" },
      { icon: "payments", label: "Bayar" },
      { icon: "currency_exchange", label: "Tukar" },
      { icon: "analytics", label: "Analitik" },
      { icon: "bar_chart", label: "Grafik" },
      { icon: "monitoring", label: "Monitor" },
      { icon: "receipt", label: "Nota" },
      { icon: "request_quote", label: "Invoice" },
      { icon: "savings", label: "Tabung" },
      { icon: "account_balance_wallet", label: "Dompet" },
      { icon: "paid", label: "Dana" },
      { icon: "trending_up", label: "Naik" },
      { icon: "trending_down", label: "Turun" },
      { icon: "business", label: "Bisnis" },
      { icon: "corporate_fare", label: "Kantor" },
      { icon: "real_estate_agent", label: "Properti" }
    ]
  },
  {
    title: "Pendidikan & Seni",
    icons: [
      { icon: "school", label: "Sekolah" },
      { icon: "auto_stories", label: "Buku" },
      { icon: "brush", label: "Lukis" },
      { icon: "palette", label: "Palet" },
      { icon: "music_note", label: "Musik" },
      { icon: "piano", label: "Piano" },
      { icon: "theater_comedy", label: "Teater" },
      { icon: "stadia_controller", label: "Game" },
      { icon: "architecture", label: "Arsitek" },
      { icon: "calculate", label: "Hitung" },
      { icon: "science", label: "Sains" },
      { icon: "biotech", label: "Bio" },
      { icon: "menu_book", label: "Buku" },
      { icon: "history", label: "Sejarah" },
      { icon: "translate", label: "Bahasa" },
      { icon: "draw", label: "Gambar" }
    ]
  },
  {
    title: "Hewan & Alam",
    icons: [
      { icon: "pets", label: "Hewan" },
      { icon: "park", label: "Taman" },
      { icon: "forest", label: "Hutan" },
      { icon: "local_florist", label: "Bunga" },
      { icon: "potted_plant", label: "Tanaman" },
      { icon: "grass", label: "Rumput" },
      { icon: "yard", label: "Halaman" },
      { icon: "water_drop", label: "Air" },
      { icon: "beach_access", label: "Pantai" },
      { icon: "landscape", label: "Alam" },
      { icon: "sunny", label: "Cerah" },
      { icon: "ac_unit", label: "Dingin" },
      { icon: "whatshot", label: "Panas" },
      { icon: "thunderstorm", label: "Badai" }
    ]
  },
  {
    title: "Peralatan & Konstruksi",
    icons: [
      { icon: "construction", label: "Bangun" },
      { icon: "hardware", label: "Hardware" },
      { icon: "plumbing", label: "Pipa" },
      { icon: "electrical_services", label: "Listrik" },
      { icon: "handyman", label: "Tukang" },
      { icon: "build", label: "Buat" },
      { icon: "hardware", label: "Alat" },
      { icon: "key", label: "Kunci" },
      { icon: "roofing", label: "Atap" },
      { icon: "fence", label: "Pagar" }
    ]
  },
  {
    title: "Layanan & Profesi",
    icons: [
      { icon: "support_agent", label: "CS" },
      { icon: "room_service", label: "Servis" },
      { icon: "cleaning_services", label: "Bersih" },
      { icon: "laundry", label: "Cuci" },
      { icon: "dry_cleaning", label: "Kering" },
      { icon: "security", label: "Aman" },
      { icon: "gavel", label: "Hukum" },
      { icon: "account_balance", label: "Bank" },
      { icon: "real_estate_agent", label: "Properti" },
      { icon: "flight_takeoff", label: "Terbang" },
      { icon: "hotel", label: "Hotel" },
      { icon: "local_hospital", label: "RS" },
      { icon: "local_fire_department", label: "Damkar" },
      { icon: "local_police", label: "Polisi" },
      { icon: "elderly", label: "Lansia" },
      { icon: "child_care", label: "Anak" }
    ]
  }
];

const quickIcons = [
  "fastfood",
  "coffee",
  "shopping_bag",
  "devices",
  "checkroom",
  "home",
  "restaurant",
  "more_horiz"
];

const allIconsFlat = [
  ...new Map(iconSections.flatMap((s) => s.icons).map((ic) => [ic.icon, ic])).values()
];

const colorPalette = [
  "#0f172a",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#64748b"
];

const EditCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("id");

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("");
  const [iconSearch, setIconSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState([]);
  const [allStores, setAllStores] = useState(false);

  const categoryFieldLabels = {
    name: "Nama Kategori"
  };

  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const fileInputRef = useRef(null);
  const [cookie] = useCookies();
  const user = cookie?.user;
  const role = user?.roleType || "";
  const isSuperAdmin = role === "super_admin";

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || locationsData?.locations || [];

  const { data: categoriesData } = useQuery(["categories-all-parent-edit"], getAllCategory);
  const allCategories = categoriesData?.data || categoriesData?.categories || [];

  const { data: categoryData, isLoading: categoryLoading } = useQuery(
    ["category-edit", categoryId],
    () => getCategoryById({ id: categoryId }),
    {
      enabled: !!categoryId,
      onSuccess: (res) => {
        const d = res?.data || res?.category || {};
        form.reset({
          name: d.name || "",
          description: d.description || "",
          parentId: d.parentId ? String(d.parentId) : "",
          color: d.color || "#0f172a",
          sortOrder: d.sortOrder || 0,
          isActive: d.status !== "inactive",
          store: ""
        });
        if (d.store) {
          try {
            const parsed = typeof d.store === "string" ? JSON.parse(d.store) : d.store;
            setSelectedStore(
              Array.isArray(parsed) ? parsed.map((s) => (typeof s === "object" ? s.id : s)) : []
            );
          } catch {
            setSelectedStore([]);
          }
        }
        if (d.image) {
          setImagePreview(d.image);
        }
        if (d.icon) {
          setSelectedIcon(d.icon);
        }
      }
    }
  );

  const category = categoryData?.data || categoryData?.category || {};

  const formSchema = useMemo(() => {
    return z.object({
      name: z.string().min(1, t("page.category.validation.nameRequired")),
      description: z.string().optional().or(z.literal("")),
      parentId: z.string().optional().or(z.literal("")),
      color: z.string().default("#0f172a"),
      sortOrder: z.coerce.number().min(0).optional().default(0),
      isActive: z.boolean().default(true),
      store: z.string().optional()
    });
  }, []);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      parentId: "",
      color: "#0f172a",
      sortOrder: 0,
      isActive: true,
      store: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/category-list",
    () => setCancelModal(true),
    form
  );

  const updateMutation = useMutation(editCategory, {
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      setSuccessModal(true);
      setIsSubmitting(false);
    },
    onError: (err) => {
      setIsSubmitting(false);
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    }
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setSelectedIcon("");
    }
  };

  const handleSelectIcon = (icon) => {
    setSelectedIcon(icon);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (values, saveAsDraft = false) => {
    if (isSuperAdmin && !allStores && selectedStore.length === 0 && !saveAsDraft) {
      form.setError("store", { message: t("page.ingredientCategory.add.storeRequired") });
      return;
    }
    form.clearErrors("store");
    setIsSubmitting(true);
    const payload = new FormData();
    payload.append("name", values.name);
    payload.append("description", values.description || "");
    payload.append("parentId", values.parentId || "");
    payload.append("color", values.color || "#0f172a");
    payload.append("sortOrder", values.sortOrder || 0);
    payload.append("status", saveAsDraft ? "draft" : values.isActive ? "active" : "inactive");
    payload.append("store", JSON.stringify(selectedStore));
    if (selectedIcon) {
      payload.append("image", selectedIcon);
    } else if (selectedImage) {
      payload.append("image", selectedImage);
    } else if (category.image && !category.image.startsWith("http")) {
      payload.append("image", category.image);
    }
    payload.append("id", category.id || category._id);
    updateMutation.mutate(payload);
  };

  const filteredIconSections = iconSearch.trim() ? null : iconSections;

  const searchedIcons = iconSearch.trim()
    ? allIconsFlat.filter(
        (ic) =>
          ic.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
          ic.icon.toLowerCase().includes(iconSearch.toLowerCase())
      )
    : [];

  if (categoryLoading) {
    return <Loading fullscreen size="lg" label={t("common.loadingData")} />;
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
          { label: t("breadcrumb.adminConsole") },
          { label: t("breadcrumb.category"), href: "/category-list" },
          { label: t("page.category.edit.title") }
        ]}
        title={t("page.category.edit.title")}
        description={t("page.category.edit.description")}
        backLink="/category-list"
        onBack={requestLeave}>
        <UserGuide guideKey="edit-category" />
      </PageHeader>
      <LoadErrorBanner />

      <div>
        <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
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
                            title={t("page.category.form.storeSection.title")}
                            description={t("page.category.form.storeSection.desc")}
                            noStoreLabel={t("page.category.form.storeSection.noStore")}
                            addStoreLabel={t("page.category.form.storeSection.addStore")}
                            storeInfoLabel={t("page.category.form.storeInfo")}
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
                  <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <h3 className="text-base font-semibold text-foreground mb-6">
                      {t("page.category.form.info")}
                    </h3>
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t("page.category.form.name")}{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <Input
                              {...field}
                              placeholder={t("page.category.form.namePlaceholder")}
                              className="h-12"
                              maxLength={FIELD_LIMITS.SHORT_LABEL}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t("page.category.form.description")}
                            </FormLabel>
                            <Textarea
                              {...field}
                              placeholder={t("page.category.form.descPlaceholder")}
                              className="resize-none"
                              rows={5}
                              maxLength={FIELD_LIMITS.DESCRIPTION}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="parentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t("page.category.form.parentCategory")}
                            </FormLabel>
                            <Combobox
                              options={[
                                {
                                  value: "",
                                  label: t("page.category.form.parentCategoryNone")
                                },
                                ...allCategories
                                  .filter((c) => String(c.id) !== String(categoryId))
                                  .map((c) => ({
                                    value: String(c.id),
                                    label: c.name
                                  }))
                              ]}
                              value={field.value}
                              onChange={(v) => field.onChange(v)}
                              placeholder={t("page.category.form.parentCategoryPlaceholder")}
                              searchPlaceholder={t("common.search")}
                            />
                            <p className="text-xs text-muted-foreground">
                              {t("page.category.form.parentCategoryDesc")}
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t("page.category.form.color")}
                              </FormLabel>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {colorPalette.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => field.onChange(c)}
                                    className={`w-8 h-8 rounded-full transition-all border-2 ${
                                      field.value === c
                                        ? "border-primary scale-110"
                                        : "border-border hover:scale-105"
                                    }`}
                                    style={{ backgroundColor: c }}
                                    aria-label={c}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="sortOrder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t("page.category.form.sortOrder")}
                              </FormLabel>
                              <Input type="number" min="0" placeholder="0" {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem>
                            <div
                              className={`pt-2 flex items-center justify-between p-4 rounded-lg ${
                                field.value
                                  ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                                  : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                              }`}>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    field.value
                                      ? "bg-green-600 text-secondary"
                                      : "bg-destructive/10 text-destructive"
                                  }`}>
                                  {field.value ? (
                                    <Check size={20} />
                                  ) : (
                                    <span className="text-lg font-bold">⏻</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {field.value
                                      ? t("page.category.form.statusActive")
                                      : t("page.category.form.statusInactive")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {field.value
                                      ? t("page.category.form.activeDesc")
                                      : t("page.category.form.inactiveDesc")}
                                  </p>
                                </div>
                              </div>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Info size={16} className="text-primary shrink-0" />
                      <span className="text-sm font-semibold text-primary">
                        {t("page.category.form.namingTip")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("page.category.form.namingTipDesc")}
                    </p>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                  <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <h3 className="text-base font-semibold text-foreground mb-6">
                      {t("page.category.form.iconSection")}
                    </h3>
                    <div className="space-y-6">
                      <div
                        onClick={() => {
                          if (!imagePreview && !selectedIcon) fileInputRef.current?.click();
                        }}
                        className={`aspect-square w-full rounded-xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center p-6 text-center transition-all overflow-hidden ${
                          !imagePreview && !selectedIcon
                            ? "group cursor-pointer hover:bg-accent"
                            : ""
                        }`}>
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt={t("page.product.form.preview")}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : selectedIcon ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                              <DynamicIcon name={selectedIcon} size={48} />
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              {t("page.category.form.iconSelected")}
                            </p>
                          </div>
                        ) : category.image && !category.image.startsWith("http") ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                              <DynamicIcon name={category.image} size={48} />
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              {t("page.category.form.currentIcon")}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                              <ImagePlus size={32} />
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              {t("page.category.form.clickToUpload")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {t("page.category.form.imageFormat")}
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      {selectedIcon && !imagePreview && (
                        <button
                          type="button"
                          onClick={() => setSelectedIcon("")}
                          className="text-xs text-destructive hover:underline">
                          {t("page.category.form.removeIcon")}
                        </button>
                      )}
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="text-xs text-destructive hover:underline">
                          {t("page.category.form.removeImage")}
                        </button>
                      )}

                      <div className={imagePreview ? "pointer-events-none opacity-40" : ""}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                          {t("page.category.form.quickIcons")}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {quickIcons.map((icon) => (
                            <button
                              aria-label={icon}
                              key={icon}
                              type="button"
                              onClick={() => handleSelectIcon(icon)}
                              className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${
                                selectedIcon === icon
                                  ? "bg-primary text-white border-primary"
                                  : "border-border text-muted-foreground hover:bg-primary hover:text-white"
                              }`}>
                              <DynamicIcon name={icon} size={20} />
                            </button>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIconSearch("");
                            setIconPickerOpen(true);
                          }}
                          className="mt-4 gap-2 ml-auto text-muted-foreground">
                          <BookOpen size={16} />
                          {t("page.category.form.viewAllIcons")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Info size={16} className="text-primary shrink-0" />
                      <span className="text-sm font-semibold text-primary">
                        {t("page.category.form.namingTip")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("page.category.form.namingTipDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
                <Button
                  type="button"
                  variant="danger"
                  className="w-full sm:w-auto justify-center"
                  onClick={requestLeave}>
                  {t("common.cancel")}
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto justify-center gap-2"
                    onClick={() => setPreviewOpen(true)}>
                    <Eye size={16} />
                    {t("page.category.label.preview")}
                  </Button>
                  <Button
                    type="button"
                    variant="draft"
                    className="w-full sm:w-auto justify-center"
                    onClick={() => form.handleSubmit((v) => onSubmit(v, true))()}
                    disabled={isSubmitting}>
                    {t("common.saveAsDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    className="w-full sm:w-auto justify-center"
                    onClick={(e) => {
                      e.preventDefault();
                      if (isSuperAdmin && !allStores && selectedStore.length === 0) {
                        form.setError("store", {
                          message: t("page.ingredientCategory.add.storeRequired")
                        });
                        return;
                      }
                      form.clearErrors("store");
                      const values = form.getValues();
                      const missing = getMissingFields(values, formSchema, categoryFieldLabels);
                      if (missing.length > 0) {
                        setMissingFieldsList(missing);
                        setMissingFieldsModal(true);
                        return;
                      }
                      setConfirmSaveModal(true);
                    }}
                    disabled={isSubmitting}>
                    {t("page.category.button.saveChanges")}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>

        {iconPickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setIconPickerOpen(false)} />
            <div className="relative bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
              <div className="px-8 py-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <LayoutGrid size={22} className="text-primary" />
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.category.iconPicker.title")}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label={t("common.close")}
                  onClick={() => setIconPickerOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                  <X size={20} />
                </button>
              </div>

              <div className="px-8 py-4 border-b border-border">
                <div className="group relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-emerald-600"
                  />
                  <input
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm"
                    placeholder={t("page.category.iconPicker.search")}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {iconSearch.trim() ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                    {searchedIcons.map((ic) => (
                      <button
                        key={ic.icon}
                        type="button"
                        onClick={() => {
                          handleSelectIcon(ic.icon);
                          setIconPickerOpen(false);
                        }}
                        className="flex flex-col items-center gap-2 group">
                        <div
                          className={`aspect-square w-full rounded-xl border flex items-center justify-center transition-all ${
                            selectedIcon === ic.icon
                              ? "bg-primary text-white border-primary"
                              : "bg-card border-border text-muted-foreground group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary"
                          }`}>
                          <DynamicIcon name={ic.icon} size={22} />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                          {ic.label}
                        </span>
                      </button>
                    ))}
                    {searchedIcons.length === 0 && (
                      <div className="col-span-full py-12 text-center text-muted-foreground">
                        <SearchX size={36} className="mx-auto mb-2 text-muted-foreground/60" />
                        {t("page.category.iconPicker.empty")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {filteredIconSections.map((section) => (
                      <section key={section.title}>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                          {section.title}
                        </h4>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                          {section.icons.map((ic) => (
                            <button
                              key={ic.icon}
                              type="button"
                              onClick={() => {
                                handleSelectIcon(ic.icon);
                                setIconPickerOpen(false);
                              }}
                              className="flex flex-col items-center gap-2 group">
                              <div
                                className={`aspect-square w-full rounded-xl border flex items-center justify-center transition-all ${
                                  selectedIcon === ic.icon
                                    ? "bg-primary text-white border-primary"
                                    : "bg-card border-border text-muted-foreground group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary"
                                }`}>
                                <DynamicIcon name={ic.icon} size={22} />
                              </div>
                              <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                                {ic.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-8 py-5 border-t border-border bg-muted/30 flex justify-end gap-4">
                <Button variant="danger" onClick={() => setIconPickerOpen(false)}>
                  {t("page.category.iconPicker.cancel")}
                </Button>
                <Button
                  onClick={() => {
                    if (selectedIcon) setIconPickerOpen(false);
                  }}
                  disabled={!selectedIcon}
                  disabledReason={t("page.category.disabledReason.selectIcon")}>
                  {t("page.category.iconPicker.select")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isSubmitting && <Loading fullscreen size="lg" label={t("common.saving")} />}

        <Modal
          type="success"
          open={successModal}
          onOpenChange={setSuccessModal}
          title={t("page.category.modal.successEdit")}
          onConfirm={() => setTimeout(() => navigate("/category-list"), 150)}
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
          title={t("page.category.modal.cancelTitle")}
          confirmText={t("page.category.modal.confirmCancel")}
          onConfirm={() => setTimeout(leave, 150)}
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
            const values = form.getValues();
            onSubmit(values, true);
          }}
        />
        <Modal
          type="confirm"
          open={confirmSaveModal}
          onOpenChange={setConfirmSaveModal}
          title={t("common.confirmSave")}
          description={t("page.category.ui.areYouSureYouWant")}
          confirmText={t("common.confirm.yesSave")}
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

        <CategoryPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          category={{
            name: form.watch("name"),
            description: form.watch("description"),
            color: form.watch("color") || "#0f172a",
            isActive: form.watch("isActive") !== false,
            icon: selectedIcon,
            image: imagePreview,
            storeName: locations.find(
              (l) => selectedStore.length > 0 && selectedStore.includes(String(l.id))
            )?.name
          }}
        />
      </div>
    </div>
  );
};

export default EditCategory;

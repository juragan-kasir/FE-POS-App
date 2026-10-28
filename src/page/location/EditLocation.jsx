/* eslint-disable no-constant-binary-expression */
/* eslint-disable no-unused-vars */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Save,
  MapPin,
  Phone,
  CloudUpload,
  Info,
  ShieldCheck,
  Check,
  History,
  X,
  Clock,
  ChevronDown,
  User,
  Building2,
  Globe,
  Mail,
  Plus,
  Trash2,
  Search,
  UserPlus,
  ArrowLeft,
  Home,
  Settings,
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import Modal from "@/components/organism/modal";
import LocationMapPicker from "@/components/ui/location-map-picker";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { normalizePayload } from "@/lib/payload-normalizer";
import { resolveSubmitStatus } from "@/lib/store-lifecycle";
import { editLocation, getLocationById } from "@/services/location";
import {
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
  getPostalCode
} from "@/services/general";
import { reverseGeocode, forwardGeocode } from "@/services/geocoding";
import { getAllEmployee } from "@/services/employee";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import TenantSelectField, { tenantErrorMessage } from "@/components/organism/TenantSelectField";
import { qk } from "@/queries/keys";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const days = [
  { id: "monday", label: "common.day.monday" },
  { id: "tuesday", label: "common.day.tuesday" },
  { id: "wednesday", label: "common.day.wednesday" },
  { id: "thursday", label: "common.day.thursday" },
  { id: "friday", label: "common.day.friday" },
  { id: "saturday", label: "common.day.saturday" },
  { id: "sunday", label: "common.day.sunday" }
];

const categoryOptions = [
  { value: "Main Branch", labelKey: "page.location.category.mainBranch" },
  { value: "Branch", labelKey: "page.location.category.branch" },
  { value: "Warehouse", labelKey: "page.location.category.warehouse" },
  { value: "Office", labelKey: "page.location.category.office" }
];

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400"
];

const getAvatarColor = (seed = "") => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarColors[h % avatarColors.length];
};

const positionBadgeColors = {
  manager: "bg-primary/10 text-primary border-primary/20",
  kasir: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  admin: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  staff: "bg-muted text-muted-foreground border-border",
  supervisor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
};

const getPositionBadge = (position = "") => {
  const pos = String(position).toLowerCase();
  return positionBadgeColors[pos] || "bg-muted text-muted-foreground border-border";
};

const EditLocation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");
  const [managerFetchSearch, setManagerFetchSearch] = useState("");
  const [managerPage, setManagerPage] = useState(1);
  const limit = 10;

  const locationFieldLabels = useMemo(
    () => ({
      name: t("page.location.form.nameLabel"),
      storeId: t("page.location.form.storeIdLabel"),
      phoneNumber: t("page.location.form.phoneLabel"),
      email: t("page.location.form.emailLabel"),
      address: t("page.location.form.addressLabel"),
      province: t("page.location.form.provinceLabel"),
      city: t("page.location.form.cityLabel"),
      district: t("page.location.form.districtLabel"),
      village: t("page.location.form.villageLabel"),
      postalCode: t("page.location.form.postalCodeLabel"),
      photo: t("page.location.form.storePhoto")
    }),
    [t]
  );

  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [villagesLoading, setVillagesLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const provincesRef = useRef(provinces);
  const citiesRef = useRef(cities);
  const districtsRef = useRef(districts);
  const villagesRef = useRef(villages);

  // Stale-response guards: changing province/city/district twice in quick
  // succession before the first lookup resolves could otherwise let the
  // first (now-stale) response land after the second and overwrite it.
  // Each handler bumps its own counter before awaiting, and only applies
  // the result if it's still the most recent request for that level.
  const citiesRequestRef = useRef(0);
  const districtsRequestRef = useRef(0);
  const villagesRequestRef = useRef(0);

  useEffect(() => {
    provincesRef.current = provinces;
  }, [provinces]);
  useEffect(() => {
    citiesRef.current = cities;
  }, [cities]);
  useEffect(() => {
    districtsRef.current = districts;
  }, [districts]);
  useEffect(() => {
    villagesRef.current = villages;
  }, [villages]);

  const [showOperasional, setShowOperasional] = useState(false);
  const [showSocialMedia, setShowSocialMedia] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);
  const [activeTab, setActiveTab] = useState("informasi");
  // Optional for an edit: a store that already belongs to a tenant keeps it
  // (ownership is never reassigned); only a tenantless store being activated
  // by a platform actor needs one chosen here.
  const [tenantId, setTenantId] = useState("");
  const [tenantError, setTenantError] = useState(null);

  const addSocialRow = () => setSocialLinks([...socialLinks, { platform: "", account: "" }]);
  const updateSocial = (idx, field, val) => {
    setSocialLinks(socialLinks.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));
  };
  const removeSocial = (idx) => {
    if (socialLinks.length <= 1) return;
    setSocialLinks(socialLinks.filter((_, i) => i !== idx));
  };

  const {
    data: managerEmployeesData,
    isLoading: managerLoading,
    isFetching: managerFetching,
    isError: managerError,
    error: managerErrorInfo,
    refetch: managerRefetch
  } = useQuery(
    ["employees-manager-picker", managerFetchSearch, managerPage],
    () =>
      getAllEmployee({ search: managerFetchSearch, limit, page: managerPage, status: "active" }),
    { enabled: managerModalOpen }
  );
  const managerEmployees = managerEmployeesData?.data || managerEmployeesData?.employees || [];
  const managerTotal = managerEmployeesData?.total || managerEmployeesData?.pagination?.total || 0;
  const managerTotalPages = Math.ceil(managerTotal / limit) || 1;

  const baseFields = useMemo(
    () => ({
      name: z.string().min(1, "Nama Toko tidak boleh kosong"),
      storeId: z.string().optional(),
      locationId: z.string().optional(),
      phoneNumber: z
        .string()
        .min(1, "Nomor Telepon harus diisi")
        .regex(/^\d*$/, "Nomor Telepon hanya boleh angka")
        .max(16, "Nomor Telepon maksimal 16 digit"),
      email: z.string().optional(),
      address: z.string().min(1, "Alamat Lengkap harus diisi"),
      detailLocation: z.string().optional(),
      location: z.string().optional(),
      city: z.string().min(1, "Kota/Kabupaten harus diisi"),
      province: z.string().min(1, "Provinsi harus diisi"),
      district: z.string().min(1, "Kecamatan harus diisi"),
      village: z.string().min(1, "Kelurahan/Desa harus diisi"),
      postalCode: z.string().min(1, "Kode Pos harus diisi"),
      isActive: z.boolean().default(false),
      category: z.string().optional(),
      managerName: z.string().optional(),
      latitude: z.coerce.number().optional(),
      longitude: z.coerce.number().optional(),
      openingHours: z.array(
        z.object({
          day: z.string(),
          open: z.string().nullable(),
          close: z.string().nullable(),
          isOpen: z.boolean().default(true),
          is24Hours: z.boolean().default(false)
        })
      )
    }),
    []
  );

  const draftSchema = useMemo(() => z.object(baseFields), [baseFields]);

  const saveSchema = useMemo(
    () =>
      z.object({
        ...baseFields,
        storeId: z.string().min(1, "ID Toko harus diisi"),
        email: z.string().min(1, "Email harus diisi").email("Format email tidak valid")
      }),
    [baseFields]
  );

  const form = useForm({
    resolver: zodResolver(draftSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      storeId: "",
      locationId: "",
      phoneNumber: "",
      email: "",
      address: "",
      detailLocation: "",
      location: "",
      city: "",
      province: "",
      district: "",
      village: "",
      postalCode: "",
      isActive: true,
      category: "Branch",
      managerName: "",
      latitude: -6.2088,
      longitude: 106.8456,
      openingHours: days.map((day) => ({
        day: day.id,
        open: "09:00",
        close: "21:00",
        isOpen: true,
        is24Hours: false
      }))
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/location-list",
    () => setCancelModal(true),
    form
  );

  const selectedManagerName = form.watch("managerName");

  const locationTabs = [
    {
      value: "informasi",
      title: t("page.location.form.tabInformasi"),
      mandatory: ["name", "storeId", "phoneNumber", "email", "photo"],
      group: ["name", "storeId", "phoneNumber", "email", "photo"]
    },
    {
      value: "alamat",
      title: t("page.location.form.tabAlamat"),
      mandatory: ["address", "city", "province", "district", "village", "postalCode"],
      group: ["address", "city", "province", "district", "village", "postalCode"]
    },
    {
      value: "pengaturan",
      title: t("page.location.form.tabPengaturan"),
      mandatory: [],
      group: []
    },
    {
      value: "lainnya",
      title: t("page.location.form.tabLainnya"),
      mandatory: [],
      group: []
    }
  ];

  const watchedLocationValues = form.watch();

  const isEmptyLocationValue = (v) =>
    v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v));

  const getLocationTabStatus = (tab) => {
    const mandatory = tab.mandatory;
    if (mandatory.length === 0) return "complete";
    const empties = mandatory.filter((f) => {
      if (f === "photo") return !imageFile && !existingImage;
      return isEmptyLocationValue(watchedLocationValues[f]);
    });
    if (empties.length === 0) return "complete";
    if (empties.length === mandatory.length) return "untouched";
    return "incomplete";
  };

  const locationTabDot = (tab) => {
    const status = getLocationTabStatus(tab);
    if (status === "complete") return "bg-green-500";
    if (status === "incomplete") return "bg-red-500";
    return "bg-muted-foreground/40";
  };

  const buildMissingByTab = (values, extraErrors = []) => {
    const result = saveSchema.safeParse(values);
    const missingNames = [];
    if (!result.success) {
      const seen = new Set();
      result.error.errors.forEach((err) => {
        const name = err.path[0];
        if (!seen.has(name)) {
          seen.add(name);
          missingNames.push(name);
        }
      });
    }
    extraErrors.forEach(({ name }) => {
      if (!missingNames.includes(name)) missingNames.push(name);
    });
    return locationTabs
      .map((tab) => ({
        stepNum: locationTabs.findIndex((x) => x.value === tab.value) + 1,
        title: tab.title,
        fields: tab.group
          .filter((f) => missingNames.includes(f))
          .map((f) => locationFieldLabels[f] || f)
      }))
      .filter((g) => g.fields.length > 0);
  };

  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [missingFieldsByTab, setMissingFieldsByTab] = useState([]);

  const { data: locationData, isLoading: locationLoading } = useQuery(
    ["location-edit", editId],
    () => getLocationById({ id: editId }),
    { enabled: !!editId }
  );

  const location = locationData?.data || locationData?.location || locationData;

  const { data: provincesData } = useQuery(["provinces"], getProvinces, {
    enabled: true
  });

  useEffect(() => {
    if (provincesData) {
      setProvinces(provincesData);
    }
  }, [provincesData]);

  useEffect(() => {
    if (!location) return;

    setExistingImage(location.image || null);
    if (location.socialMedia && Array.isArray(location.socialMedia)) {
      setSocialLinks(location.socialMedia);
    }

    form.reset({
      name: location.name || "",
      storeId: location.storeId || "",
      locationId: location.id || location.locationId || "",
      phoneNumber: location.phoneNumber || "",
      email: location.email || "",
      address: location.address || "",
      detailLocation: location.detailLocation || "",
      location: "",
      city: location.city || "",
      province: location.province || "",
      district: location.district || "",
      village: location.village || "",
      postalCode: location.postalCode || "",
      isActive: location.isActive ?? location.status === "active" ?? true,
      category: location.category || "Branch",
      managerName: location.managerName || "",
      latitude: location.latitude ?? location.coordinates?.lat ?? -6.2088,
      longitude: location.longitude ?? location.coordinates?.lng ?? 106.8456,
      openingHours:
        location.openingHours && location.openingHours.length > 0
          ? location.openingHours.map((oh) => ({
              day: oh.day,
              open: oh.open,
              close: oh.close,
              isOpen: !!oh.open,
              is24Hours: !!oh.is24Hours
            }))
          : days.map((day) => ({
              day: day.id,
              open: "09:00",
              close: "21:00",
              isOpen: true,
              is24Hours: false
            }))
    });

    const fetchRegions = async () => {
      if (location.province) {
        setCitiesLoading(true);
        try {
          const citiesResponse = await getCities(location.province);
          setCities(citiesResponse || []);
        } catch (error) {
          console.error("Error fetching cities:", error);
        } finally {
          setCitiesLoading(false);
        }

        if (location.city) {
          setDistrictsLoading(true);
          try {
            const districtsResponse = await getDistricts(location.city);
            setDistricts(districtsResponse || []);
          } catch (error) {
            console.error("Error fetching districts:", error);
          } finally {
            setDistrictsLoading(false);
          }

          if (location.district) {
            setVillagesLoading(true);
            try {
              const villagesResponse = await getVillages(location.district);
              setVillages(villagesResponse || []);
            } catch (error) {
              console.error("Error fetching villages:", error);
            } finally {
              setVillagesLoading(false);
            }
          }
        }
      }
    };

    fetchRegions();
  }, [location]);

  const editMutation = useMutation(editLocation, {
    onSuccess: () => {
      queryClient.invalidateQueries(["locations"]);
      queryClient.invalidateQueries(["location-edit"]);
      queryClient.invalidateQueries(qk.locations.all());
      setIsSubmitting(false);
      setSuccessModal(true);
    },
    onError: (err) => {
      const tenantMessage = tenantErrorMessage(t, err);
      if (tenantMessage) {
        setTenantError(tenantMessage);
        setActiveTab("informasi");
      }
      setModalMessage(tenantMessage || err?.response?.data?.message || err.message);
      setErrorModal(true);
      setIsSubmitting(false);
    }
  });

  const submitData = (values, saveAsDraft = false) => {
    if (!saveAsDraft) {
      setValidationErrors({});
    }
    setIsSubmitting(true);
    const openingHoursFormatted = (values.openingHours || []).map((h) => ({
      day: h.day,
      open: h.isOpen ? (h.is24Hours ? "00:00" : h.open) : null,
      close: h.isOpen ? (h.is24Hours ? "23:59" : h.close) : null,
      is24Hours: h.isOpen ? !!h.is24Hours : false
    }));
    const { latitude, longitude, category, isActive: _lifecycleFlag, ...rest } = values;
    const payload = {
      ...rest,
      store: Number(String(values.storeId).replace(/^ST-/i, "")) || null,
      locationId: values.locationId,
      mainBranch: category === "Main Branch",
      category: category || null,
      latitude: latitude != null ? String(latitude) : null,
      longitude: longitude != null ? String(longitude) : null,
      // HB-2 R1: `status` is authoritative; `isActive` is never sent (FormData
      // stringifies booleans). A status is sent only when saving as draft or
      // when the lifecycle control was touched; otherwise the edit is
      // config-only and carries no lifecycle field.
      status: resolveSubmitStatus({
        saveAsDraft,
        lifecycleTouched: form.getFieldState("isActive").isDirty,
        isActive: values.isActive
      }),
      openingHours: openingHoursFormatted,
      socialMedia: socialLinks.filter((s) => s.platform && s.account),
      ...(tenantId ? { tenantId: Number(tenantId) } : {}),
      id: editId
    };

    const fd = normalizePayload(payload, {
      isFormData: true,
      jsonFields: ["openingHours", "socialMedia"]
    });
    if (imageFile) {
      fd.append("image", imageFile);
    } else if (!imageRemoved && existingImage) {
      fd.append("image", existingImage);
    }
    editMutation.mutate(fd);
  };

  const onSubmit = (values) => {
    const extraErrors = !imageFile && !existingImage ? [{ name: "photo" }] : [];
    const missing = getMissingFields(values, saveSchema, locationFieldLabels, extraErrors);

    const result = saveSchema.safeParse(values);
    if (!result.success) {
      result.error.errors.forEach((err) => {
        form.setError(err.path[0], { message: err.message });
      });
    }
    setValidationErrors(!imageFile && !existingImage ? { photo: "Foto Toko harus diupload" } : {});

    if (missing.length > 0) {
      setMissingFields(missing);
      setMissingFieldsByTab(buildMissingByTab(values, extraErrors));
      setMissingFieldsModal(true);
      return;
    }
    setConfirmSaveModal(true);
  };

  const handleConfirmSave = () => {
    setConfirmSaveModal(false);
    submitData(form.getValues(), false);
  };

  const updateOpeningHours = (dayId, field, value) => {
    const currentHours = form.getValues("openingHours") || [];
    const updatedHours = currentHours.map((h) => (h.day === dayId ? { ...h, [field]: value } : h));
    form.setValue("openingHours", updatedHours);
  };

  const toggleDay = (dayId) => {
    const currentHours = form.getValues("openingHours") || [];
    const day = currentHours.find((h) => h.day === dayId);
    if (day) {
      const newIsOpen = !day.isOpen;
      const updatedHours = currentHours.map((h) =>
        h.day === dayId
          ? {
              ...h,
              isOpen: newIsOpen,
              open: newIsOpen ? "09:00" : null,
              close: newIsOpen ? "21:00" : null,
              is24Hours: newIsOpen ? h.is24Hours : false
            }
          : h
      );
      form.setValue("openingHours", updatedHours);
    }
  };

  const toggle24Hours = (dayId) => {
    const currentHours = form.getValues("openingHours") || [];
    const day = currentHours.find((h) => h.day === dayId);
    if (day) {
      const new24Hours = !day.is24Hours;
      const updatedHours = currentHours.map((h) =>
        h.day === dayId
          ? {
              ...h,
              is24Hours: new24Hours,
              open: new24Hours ? "00:00" : "09:00",
              close: new24Hours ? "23:59" : "21:00"
            }
          : h
      );
      form.setValue("openingHours", updatedHours);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageRemoved(false);
      if (validationErrors.photo) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next.photo;
          return next;
        });
      }
      const reader = new FileReader();
      reader.onload = (event) => setPreviewImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setPreviewImage(null);
    setImageFile(null);
    setImageRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAreaSelect = async () => {
    const provCode = form.getValues("province");
    const cityCode = form.getValues("city");
    const districtCode = form.getValues("district");
    const villageCode = form.getValues("village");

    if (!provCode) return;

    const district = districtsRef.current.find((d) => d.kode_kec === districtCode);
    if (district?.latitude != null && district?.longitude != null) {
      form.setValue("latitude", district.latitude);
      form.setValue("longitude", district.longitude);
      return;
    }

    const provName =
      provincesRef.current.find((p) => p.kode_prov === provCode)?.nama_provinsi || "";
    const cityName = citiesRef.current.find((c) => c.kode_kab === cityCode)?.nama_kabupaten || "";
    const districtName = district?.nama_kecamatan || "";
    const villageName =
      villagesRef.current.find((v) => v.kode_desa === villageCode)?.nama_desa || "";

    const query = [villageName, districtName, cityName, provName, "Indonesia"]
      .filter(Boolean)
      .join(", ");

    setGeoLoading(true);
    try {
      const result = await forwardGeocode(query);
      if (result) {
        form.setValue("latitude", parseFloat(result.lat));
        form.setValue("longitude", parseFloat(result.lon));
      }
    } catch (error) {
      console.error("Forward geocoding error:", error);
    } finally {
      setGeoLoading(false);
    }
  };

  if (!editId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <MapPin size={40} />
        <p>{t("page.location.edit.idNotFound")}</p>
        <Button variant="danger" onClick={() => navigate("/location-list")}>
          {t("breadcrumb.back")}
        </Button>
      </div>
    );
  }

  if (locationLoading) {
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
              label: t("page.location.list.title"),
              href: "/location-list",
              i18nKey: "page.location.list.title"
            },
            { label: t("page.location.edit.title"), i18nKey: "page.location.edit.title" }
          ]}
          title={t("page.location.edit.title")}
          description={t("page.location.edit.description")}
          backLink="/location-list"
        />
        <LoadErrorBanner />
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <Building2 size={40} />
        <p>{t("page.location.edit.locationNotFound")}</p>
        <Button variant="danger" onClick={() => navigate("/location-list")}>
          {t("breadcrumb.back")}
        </Button>
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
            label: t("page.location.list.title"),
            href: "/location-list",
            i18nKey: "page.location.list.title"
          },
          { label: t("page.location.edit.title"), i18nKey: "page.location.edit.title" }
        ]}
        title={t("page.location.edit.title")}
        description={t("page.location.edit.description")}
        backLink="/location-list"
        onBack={requestLeave}>
        <Button variant="danger" onClick={requestLeave} className="gap-2">
          <ArrowLeft size={20} className="text-lg" />
          {t("breadcrumb.back")}
        </Button>
        <UserGuide guideKey="add-location" />
      </PageHeader>

      {/* Form Card */}

      <div className="bg-card rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(form.getValues());
            }}
            className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto -mx-1 px-1 mb-4">
                <TabsList className="grid w-full grid-cols-4 min-w-[560px]">
                  <TabsTrigger value="informasi" className="gap-1.5">
                    <MapPin size={14} />
                    {t("page.location.form.tabInformasi")}
                    <span className={`w-2 h-2 rounded-full ${locationTabDot(locationTabs[0])}`} />
                  </TabsTrigger>
                  <TabsTrigger value="alamat" className="gap-1.5">
                    <Home size={14} />
                    {t("page.location.form.tabAlamat")}
                    <span className={`w-2 h-2 rounded-full ${locationTabDot(locationTabs[1])}`} />
                  </TabsTrigger>
                  <TabsTrigger value="pengaturan" className="gap-1.5">
                    <Settings size={14} />
                    {t("page.location.form.tabPengaturan")}
                    <span className={`w-2 h-2 rounded-full ${locationTabDot(locationTabs[2])}`} />
                  </TabsTrigger>
                  <TabsTrigger value="lainnya" className="gap-1.5">
                    <MoreHorizontal size={14} />
                    {t("page.location.form.tabLainnya")}
                    <span className={`w-2 h-2 rounded-full ${locationTabDot(locationTabs[3])}`} />
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="informasi" className="mt-0 space-y-8">
                {/* Section: Informasi Toko */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <MapPin className="text-primary" size={20} />
                    <h3 className="text-base font-semibold text-foreground">
                      {t("page.location.form.informasiToko")}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("page.location.form.nameLabel")}{" "}
                            <span className="text-destructive">*</span>{" "}
                          </FormLabel>
                          <Input
                            {...field}
                            placeholder={t("page.location.form.namePlaceholder")}
                            className="h-12"
                            maxLength={FIELD_LIMITS.BUSINESS_NAME}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="storeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("page.location.form.storeIdLabel")}{" "}
                            <span className="text-destructive">*</span>{" "}
                          </FormLabel>
                          <Input
                            {...field}
                            placeholder={t("page.location.form.autoFromSystem")}
                            disabled
                            className="font-mono h-12 bg-muted/50"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <TenantSelectField
                    value={tenantId}
                    optional
                    error={tenantError}
                    onChange={(next) => {
                      setTenantId(next);
                      setTenantError(null);
                    }}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("page.location.form.phoneLabel")}{" "}
                            <span className="text-destructive">*</span>{" "}
                          </FormLabel>
                          <div className="relative">
                            <Phone
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                              {...field}
                              placeholder={t("page.location.form.phonePlaceholder")}
                              className="pl-9"
                              inputMode="numeric"
                              maxLength={FIELD_LIMITS.PHONE}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 16);
                                field.onChange(value);
                              }}
                            />
                          </div>
                          <FormMessage />
                          <FormDescription>{t("common.phoneHint")}</FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t("page.location.form.emailLabel")}{" "}
                            <span className="text-destructive">*</span>{" "}
                          </FormLabel>
                          <div className="relative">
                            <Mail
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                              {...field}
                              placeholder={t("page.location.form.emailPlaceholder")}
                              className="pl-9"
                              type="email"
                              maxLength={FIELD_LIMITS.EMAIL}
                            />
                          </div>
                          <FormMessage />
                          <FormDescription>{t("common.emailHint")}</FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Foto Toko Card */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-primary" size={20} />
                    <h3 className="text-base font-semibold text-foreground">
                      {t("page.location.form.storePhoto")}{" "}
                      <span className="text-destructive">*</span>
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("page.location.form.photoFormat")}
                  </p>
                  {validationErrors.photo && (
                    <p className="text-sm font-medium text-destructive">{validationErrors.photo}</p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div
                    onClick={handleImageClick}
                    className="relative rounded-lg border-2 border-dashed border-border hover:border-primary transition-all flex flex-col items-center justify-center bg-muted/30 overflow-hidden cursor-pointer group">
                    {!imageRemoved && (previewImage || location?.image) ? (
                      <>
                        <img
                          src={previewImage || location?.image}
                          alt={location?.name || "Preview"}
                          className="w-full h-auto max-h-[500px] object-contain"
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
                      <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors p-8 min-h-[300px] justify-center">
                        <CloudUpload size={64} className="mb-4" />
                        <span className="text-base font-semibold text-center">
                          {t("page.location.form.clickOrDragPhoto")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="alamat" className="mt-0 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.addressLabel")}{" "}
                          <span className="text-destructive">*</span>{" "}
                        </FormLabel>
                        <div className="relative">
                          <MapPin
                            size={16}
                            className="absolute left-3 top-3 text-muted-foreground"
                          />
                          <Textarea
                            {...field}
                            placeholder={t("page.location.form.addressPlaceholder")}
                            className="pl-9 min-h-[80px]"
                            maxLength={FIELD_LIMITS.ADDRESS}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Detail Location */}
                  <FormField
                    control={form.control}
                    name="detailLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.detailLocationLabel")}
                        </FormLabel>
                        <Textarea
                          {...field}
                          placeholder={t("page.location.form.detailPlaceholder")}
                          className="min-h-[80px]"
                          maxLength={FIELD_LIMITS.ADDRESS}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("page.location.form.detailLocationHint")}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Province, City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.provinceLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Combobox
                          options={provinces.map((p) => ({
                            value: p.kode_prov,
                            label: p.nama_provinsi
                          }))}
                          value={field.value || ""}
                          onChange={async (val) => {
                            field.onChange(val);
                            form.setValue("city", "");
                            form.setValue("district", "");
                            form.setValue("village", "");
                            form.setValue("postalCode", "");
                            setCities([]);
                            setDistricts([]);
                            setVillages([]);

                            if (val) {
                              const requestId = ++citiesRequestRef.current;
                              setCitiesLoading(true);
                              try {
                                const citiesResponse = await getCities(val);
                                if (requestId === citiesRequestRef.current) {
                                  setCities(citiesResponse || []);
                                }
                              } catch (error) {
                                console.error("Error fetching cities:", error);
                              } finally {
                                if (requestId === citiesRequestRef.current) setCitiesLoading(false);
                              }
                            }
                            handleAreaSelect();
                          }}
                          placeholder={t("page.location.form.selectProvince")}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.cityLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Combobox
                          options={cities.map((c) => ({
                            value: c.kode_kab,
                            label: c.nama_kabupaten
                          }))}
                          value={field.value || ""}
                          onChange={async (val) => {
                            field.onChange(val);
                            form.setValue("district", "");
                            form.setValue("village", "");
                            form.setValue("postalCode", "");
                            setDistricts([]);
                            setVillages([]);

                            if (val) {
                              const requestId = ++districtsRequestRef.current;
                              setDistrictsLoading(true);
                              try {
                                const districtsResponse = await getDistricts(val);
                                if (requestId === districtsRequestRef.current) {
                                  setDistricts(districtsResponse || []);
                                }
                              } catch (error) {
                                console.error("Error fetching districts:", error);
                              } finally {
                                if (requestId === districtsRequestRef.current)
                                  setDistrictsLoading(false);
                              }
                            }
                            handleAreaSelect();
                          }}
                          placeholder={t("page.location.form.selectCity")}
                          disabled={!cities.length}
                          loading={citiesLoading}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.districtLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Combobox
                          options={districts.map((d) => ({
                            value: d.kode_kec,
                            label: d.nama_kecamatan
                          }))}
                          value={field.value || ""}
                          onChange={async (val) => {
                            field.onChange(val);
                            form.setValue("village", "");
                            form.setValue("postalCode", "");
                            setVillages([]);

                            if (val) {
                              const requestId = ++villagesRequestRef.current;
                              setVillagesLoading(true);
                              try {
                                const villagesResponse = await getVillages(val);
                                if (requestId === villagesRequestRef.current) {
                                  setVillages(villagesResponse || []);
                                }
                              } catch (error) {
                                console.error("Error fetching villages:", error);
                              } finally {
                                if (requestId === villagesRequestRef.current)
                                  setVillagesLoading(false);
                              }
                            } else {
                              form.setValue("postalCode", "");
                            }
                            handleAreaSelect();
                          }}
                          placeholder={t("page.location.form.selectDistrict")}
                          disabled={!districts.length}
                          loading={districtsLoading}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="village"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.villageLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Combobox
                          options={villages.map((v) => ({
                            value: v.kode_desa,
                            label: v.nama_desa
                          }))}
                          value={field.value || ""}
                          onChange={async (val) => {
                            field.onChange(val);
                            form.setValue("postalCode", "");

                            if (val) {
                              try {
                                const postalData = await getPostalCode(val);
                                if (postalData && postalData.length > 0) {
                                  form.setValue("postalCode", postalData[0].kode_pos);
                                  handleAreaSelect();
                                }
                              } catch (error) {
                                console.error("Error fetching postal code:", error);
                              }
                            }
                          }}
                          placeholder={t("page.location.form.selectVillage")}
                          disabled={!villages.length}
                          loading={villagesLoading}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.postalCodeLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input
                          {...field}
                          placeholder={t("page.location.form.autoFill")}
                          disabled
                          className="bg-muted/50"
                          maxLength={FIELD_LIMITS.POSTAL_CODE}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Location Map Picker */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("page.location.form.mapLabel")}
                      </FormLabel>
                      <LocationMapPicker
                        lat={form.watch("latitude")}
                        lng={form.watch("longitude")}
                        onChange={async (lat, lng) => {
                          form.setValue("latitude", lat);
                          form.setValue("longitude", lng);
                        }}
                        height="500px"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="pengaturan" className="mt-0 space-y-8">
                {/* Category & Manager */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.categoryLabel")}
                        </FormLabel>
                        <Combobox
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={t("page.location.form.categoryLabel")}
                          searchPlaceholder={t("page.location.form.categoryLabel")}
                          options={categoryOptions.map((opt) => ({
                            value: opt.value,
                            label: t(opt.labelKey)
                          }))}
                        />
                        <FormDescription>{t("page.location.form.categoryHint")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Manager Name */}
                  <FormField
                    control={form.control}
                    name="managerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("page.location.form.managerLabel")}
                        </FormLabel>
                        <div className="relative">
                          <div className="cursor-pointer" onClick={() => setManagerModalOpen(true)}>
                            <User
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            />
                            <Input
                              {...field}
                              placeholder={t("page.location.form.clickSelectManager")}
                              className="pl-9 pr-10 cursor-pointer"
                              readOnly
                              maxLength={FIELD_LIMITS.PERSON_NAME}
                            />
                          </div>
                          {field.value && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                form.setValue("managerName", "");
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-destructive transition-colors">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
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
                              ? t("page.location.form.active")
                              : t("page.location.form.inactive")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {field.value
                              ? t("page.location.form.activeDesc")
                              : t("page.location.form.inactiveDesc")}
                          </p>
                        </div>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="lainnya" className="mt-0 space-y-8">
                {/* Operasional Toggle */}
                <div
                  className="flex items-center justify-between bg-muted/30 p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setShowOperasional(!showOperasional)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-600/10 text-amber-600 rounded-lg flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("page.location.form.operationalHours")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("page.location.form.operationalHoursDesc")}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-muted-foreground transition-transform ${showOperasional ? "rotate-180" : ""}`}
                  />
                </div>

                {/* Operasional Panel */}
                {showOperasional && (
                  <div className="border border-border rounded-lg p-4 bg-muted/20">
                    <div className="space-y-2">
                      {days.map((day) => {
                        const dayData = form
                          .watch("openingHours")
                          ?.find((h) => h.day === day.id) || {
                          day: day.id,
                          open: "09:00",
                          close: "21:00",
                          isOpen: true,
                          is24Hours: false
                        };
                        return (
                          <div key={day.id} className="grid grid-cols-12 gap-2 items-center py-2">
                            <div className="col-span-2 text-sm font-medium">{t(day.label)}</div>
                            <div className="col-span-3 relative">
                              <Clock
                                size={14}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                              />
                              <input
                                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm text-foreground bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                type="time"
                                value={dayData.open || ""}
                                disabled={!dayData.isOpen || dayData.is24Hours}
                                onChange={(e) => updateOpeningHours(day.id, "open", e.target.value)}
                              />
                            </div>
                            <div className="col-span-1 text-center text-xs text-muted-foreground flex items-center justify-center">
                              <span className="text-xs">{t("common.to")}</span>
                            </div>
                            <div className="col-span-3 relative">
                              <Clock
                                size={14}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                              />
                              <input
                                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm text-foreground bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                type="time"
                                value={dayData.close || ""}
                                disabled={!dayData.isOpen || dayData.is24Hours}
                                onChange={(e) =>
                                  updateOpeningHours(day.id, "close", e.target.value)
                                }
                              />
                            </div>
                            <div className="col-span-1 flex justify-center items-center">
                              <label
                                className={`flex items-center gap-1 text-xs ${dayData.isOpen ? "cursor-pointer text-foreground" : "cursor-not-allowed text-muted-foreground/50"}`}>
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5"
                                  checked={!!dayData.is24Hours}
                                  disabled={!dayData.isOpen}
                                  onChange={() => toggle24Hours(day.id)}
                                  aria-label={t("page.location.form.is24Hours")}
                                />
                                {t("page.location.form.is24Hours")}
                              </label>
                            </div>
                            <div className="col-span-2 flex justify-end items-center gap-2">
                              <span
                                className={`text-xs ${dayData.isOpen ? "text-green-600 dark:text-green-400" : "text-destructive dark:text-red-400"}`}>
                                {dayData.isOpen
                                  ? t("page.location.form.openStatus")
                                  : t("page.location.form.closedStatus")}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={dayData.isOpen}
                                  onChange={() => toggleDay(day.id)}
                                />
                                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600 dark:peer-checked:bg-green-500" />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Social Media */}
                <div
                  className="flex items-center justify-between bg-muted/30 p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setShowSocialMedia(!showSocialMedia)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/10 text-blue-600 rounded-lg flex items-center justify-center">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("page.location.form.socialMedia")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("page.location.form.socialMediaDesc")}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-muted-foreground transition-transform ${showSocialMedia ? "rotate-180" : ""}`}
                  />
                </div>

                {showSocialMedia && (
                  <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-3">
                    {socialLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={link.platform}
                          onValueChange={(val) => updateSocial(idx, "platform", val)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t("page.location.form.socialPlatform")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Instagram">Instagram</SelectItem>
                            <SelectItem value="Facebook">Facebook</SelectItem>
                            <SelectItem value="Twitter / X">Twitter / X</SelectItem>
                            <SelectItem value="TikTok">TikTok</SelectItem>
                            <SelectItem value="YouTube">YouTube</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="Telegram">Telegram</SelectItem>
                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                            <SelectItem value="Shopee">Shopee</SelectItem>
                            <SelectItem value="Tokopedia">Tokopedia</SelectItem>
                            <SelectItem value="Website">
                              {t("page.supplier.form.website")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={t("page.location.form.socialAccount")}
                          value={link.account}
                          onChange={(e) => updateSocial(idx, "account", e.target.value)}
                          className="flex-1"
                          maxLength={FIELD_LIMITS.URL}
                        />
                        <button
                          type="button"
                          onClick={() => removeSocial(idx)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      onClick={addSocialRow}
                      className="gap-1">
                      <Plus size={14} />
                      {t("page.location.form.addSocialMedia")}
                    </Button>
                  </div>
                )}

                {/* Help Cards */}
                <div className="space-y-3">
                  <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-3">
                    <Info size={18} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                        {t("page.location.form.validationTitle")}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.location.form.validationDesc")}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-3">
                    <ShieldCheck size={18} className="text-secondary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                        {t("page.location.form.securityTitle")}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.location.form.securityDesc")}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-3">
                    <History size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                        {t("page.location.form.auditTitle")}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.location.form.auditDesc")}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-card border border-border rounded-xl p-4">
              <Button
                type="button"
                variant="danger"
                className="w-full sm:w-auto"
                onClick={requestLeave}>
                {t("common.cancel")}
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="draft"
                  onClick={() => setDraftModal(true)}
                  disabled={isSubmitting}>
                  {t("page.location.form.saveDraft")}
                </Button>
                <Button
                  variant="success"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto gap-2">
                  <Save size={18} />
                  {t("page.location.form.saveChanges")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {isSubmitting && <Loading fullscreen size="lg" label={t("common.saving")} />}

      <Dialog open={managerModalOpen} onOpenChange={setManagerModalOpen}>
        <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-lg">{t("page.location.form.selectManager")}</DialogTitle>
              <DialogDescription>{t("page.location.form.selectManagerDesc")}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder={t("page.location.form.searchEmployee")}
                  value={managerSearch}
                  onChange={(e) => {
                    setManagerSearch(e.target.value);
                    setManagerPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setManagerFetchSearch(managerSearch);
                    }
                  }}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setManagerFetchSearch(managerSearch)}>
                {t("common.search")}
              </Button>
            </div>
          </div>

          <HorizontalScrollArea className="flex-1 min-h-0" fill>
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="bg-muted/20">
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    {t("page.location.form.employeePhotoHeader")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    {t("page.location.form.employeeNameHeader")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    {t("page.location.form.employeeEmailHeader")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    {t("page.location.form.employeeDepartmentHeader")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    {t("page.location.form.employeePositionHeader")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    {t("page.location.form.employeeStoreHeader")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {managerLoading || managerFetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-${i}`}>
                      <td className="px-4 py-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28 mb-1.5" />
                        <Skeleton className="h-3 w-36" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    </tr>
                  ))
                ) : managerError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                          <ShieldCheck size={28} className="text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("common.error")}</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                            {managerErrorInfo?.response?.data?.message ||
                              managerErrorInfo?.message ||
                              t("common.tryAgain")}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => managerRefetch()}
                          className="gap-1.5">
                          <Search size={14} />
                          {t("common.retry")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : managerEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <User size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("page.location.form.noEmployeeFound")}</p>
                    </td>
                  </tr>
                ) : (
                  managerEmployees.map((emp) => {
                    const position = emp.positionData?.name || emp.role || "";
                    const isSelected = selectedManagerName && emp.fullName === selectedManagerName;
                    return (
                      <tr
                        key={emp.id || emp._id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-muted/40 opacity-60 cursor-not-allowed"
                            : "hover:bg-muted/20 cursor-pointer group"
                        }`}
                        onClick={() => {
                          if (isSelected) return;
                          form.setValue("managerName", emp.fullName);
                          setManagerModalOpen(false);
                        }}>
                        <td className="px-4 py-3">
                          <div
                            className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold ${getAvatarColor(
                              emp.fullName || emp.employeeID || ""
                            )} ${isSelected ? "grayscale" : ""}`}>
                            {emp.image ? (
                              <img
                                src={emp.image}
                                alt={emp.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (emp.fullName || emp.employeeID || "?").charAt(0).toUpperCase()
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p
                            className={`text-sm font-semibold ${
                              isSelected
                                ? "text-muted-foreground"
                                : "text-foreground group-hover:text-primary transition-colors"
                            }`}>
                            {emp.fullName}
                            {isSelected && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-muted text-muted-foreground border border-border">
                                {t("page.location.form.managerCurrentLabel")}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{emp.email || "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {emp.departmentData?.name || emp.department || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {position ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${getPositionBadge(position)} ${isSelected ? "opacity-60" : ""}`}>
                              {position}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {emp.storeData?.name || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </HorizontalScrollArea>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={managerPage <= 1}
                onClick={() => setManagerPage((p) => Math.max(1, p - 1))}
                className="h-8">
                {t("common.prev")}
              </Button>
              <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                {managerPage} / {managerTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={managerPage >= managerTotalPages}
                onClick={() => setManagerPage((p) => p + 1)}
                className="h-8">
                {t("common.next")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => {
                  setManagerModalOpen(false);
                  navigate("/add-employee");
                }}
                className="h-8 gap-1.5">
                <UserPlus size={14} />
                {t("page.location.form.addEmployee")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setManagerModalOpen(false)}
                className="h-8">
                {t("common.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Modal
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("page.location.edit.successEditTitle")}
        onConfirm={() => setTimeout(() => navigate("/location-list"), 150)}
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
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.location.form.draftModalTitle")}
        description={t("page.location.form.draftModalDesc")}
        confirmText={t("page.location.form.draftModalConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          submitData(form.getValues(), true);
        }}
      />
      <Modal
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title={t("common.confirmSave")}
        description={t("common.confirmSaveDesc")}
        confirmText={t("common.yesSave")}
        onConfirm={handleConfirmSave}
      />
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFields}
        items={missingFieldsByTab}
      />
    </div>
  );
};

export default EditLocation;

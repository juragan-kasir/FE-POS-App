import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save,
  X,
  Plus,
  Info,
  MapPin,
  Download,
  Upload as UploadIcon,
  Building2,
  Loader2,
  Search,
  Package
} from "lucide-react";
import { toast } from "sonner";

import {
  addStockOpname,
  updateStockOpname,
  changeStockOpnameStatus,
  downloadStockOpnameTemplate,
  getStockOpnameById
} from "@/services/stock";
import { getAllProduct } from "@/services/product";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Combobox } from "@/components/ui/combobox";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import { DatePicker } from "@/components/ui/date-picker";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator
} from "@/components/ui/select";
import UploadExcelModal from "./components/UploadExcelModal";
import { useTranslation } from "react-i18next";
import AbortController from "@/components/organism/abort-controller";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { formatDateOnly } from "@/utils/dateOnly";

// BE persists these opname quantities as decimals (matching the product's
// own DECIMAL(10,4) stock field, which is what auto-fills stokAwalJumlah) —
// parseInt after stripping "." silently truncated any fractional count
// (e.g. "12.5" -> 125) for fractional-unit products (kg, liter, ...).
const toDecimal = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
};

// Keep digits and a single decimal point while typing; cap the fractional
// part at 4 digits to match the BE's DECIMAL(10,4) precision. A stray extra
// "." is dropped rather than producing garbage.
const sanitizeDecimalInput = (value) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, dotIndex);
  const fracPart = cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, "")
    .slice(0, 4);
  return `${intPart}.${fracPart}`;
};

// BE contract: DECIMAL(10,4) — at most 4 fractional digits, magnitude at
// most 999999.9999. Plain-shape check without regex-DoS patterns.
export const DECIMAL_QTY_MAX = 999999.9999;
export const hasValidDecimalPrecision = (val) => {
  const s = String(val ?? "").trim();
  if (s === "") return false;
  const dot = s.indexOf(".");
  if (dot !== -1) {
    if (s.slice(dot + 1).length > 4) return false;
    const head = s.slice(0, dot);
    if (head !== "" && ![...head].every((ch) => ch >= "0" && ch <= "9")) return false;
    const tail = s.slice(dot + 1);
    if (tail !== "" && ![...tail].every((ch) => ch >= "0" && ch <= "9")) return false;
    if (head === "" && tail === "") return false;
  } else if (![...s].every((ch) => ch >= "0" && ch <= "9")) {
    return false;
  }
  return Number.isFinite(Number(s));
};
export const isWithinDecimalMagnitude = (val) => {
  const s = String(val ?? "").trim();
  if (s === "") return false;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= DECIMAL_QTY_MAX;
};

// Normalize computed quantities to contract precision. Binary floating
// point leaves dust on innocent arithmetic (10.1 + 0.2 - 0.3), which the
// BE's >4dp guard would reject — this removes the dust without changing
// any legitimate value (idempotent on exact decimals).
export const roundTo4dp = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return v;
  return Math.round((v + Number.EPSILON) * 10000) / 10000;
};

const calculateStockAkhir = (row) =>
  roundTo4dp(
    toDecimal(row.stokAwalJumlah) +
      toDecimal(row.barangMasukJumlah) -
      toDecimal(row.barangKeluarJumlah)
  );

const calculateStockFisik = (row) => {
  if (
    row.stokFisikJumlah === null ||
    row.stokFisikJumlah === undefined ||
    row.stokFisikJumlah === ""
  )
    return null;
  return toDecimal(row.stokFisikJumlah);
};

const calculateSelisih = (row) => {
  const fisik = calculateStockFisik(row);
  if (fisik === null) return null;
  return roundTo4dp(fisik - calculateStockAkhir(row));
};

const getSelisihStyle = (value) => {
  if (value === null) return "text-muted-foreground";
  if (value < 0) return "text-red-600 font-semibold";
  if (value > 0) return "text-green-600 font-semibold";
  return "text-foreground";
};

const getAvailabilityStatus = (stock, t) => {
  if (stock <= 0)
    return {
      label: t("page.stockOpname.status.habis"),
      className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
    };
  if (stock <= 10)
    return {
      label: t("page.stockOpname.status.menipis"),
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
    };
  return {
    label: t("page.stockOpname.status.tersedia"),
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
  };
};

const defaultItemValues = {
  productId: "",
  kodeBarang: "",
  namaBarang: "",
  satuan: "",
  lokasiId: "",
  lokasiLabel: "",
  store: "",
  stokAwalJumlah: "",
  barangMasukJumlah: "",
  barangKeluarJumlah: "",
  stokFisikJumlah: "",
  keterangan: ""
};

const LokasiSelect = ({ value, locations, loading, onChange, onAddNew, t, hasError }) => {
  if (loading) return <Skeleton className="h-9 w-full" />;

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val === "__add__") {
          onAddNew();
          return;
        }
        onChange(val);
      }}>
      <SelectTrigger
        className={`h-9 border-0 border-b rounded-none focus:border-primary focus:border-solid shadow-none px-0 text-sm ${
          hasError ? "border-destructive" : "border-dashed border-muted-foreground/30"
        }`}>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-muted-foreground/40 shrink-0" />
          <SelectValue placeholder={t("page.stockOpname.form.selectLocation")} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {locations.map((loc) => (
          <SelectItem key={loc.id || loc._id} value={String(loc.id || loc._id)}>
            {loc.name || loc.storeName}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value="__add__" className="text-primary font-medium">
          <div className="flex items-center gap-2">
            <Building2 size={14} />+ {t("page.stockOpname.button.addLocation")}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

const rowInputClass = (hasError) =>
  `w-full bg-transparent border-0 border-b text-sm outline-none transition-colors px-0 py-1 ${
    hasError
      ? "border-destructive focus:border-solid"
      : "border-dashed border-muted-foreground/20 focus:border-primary focus:border-solid"
  }`;

const FieldError = ({ error }) => {
  if (!error) return null;
  return (
    <p className="text-destructive text-[10px] mt-0.5 animate-in fade-in slide-in-from-top-1">
      {error.message}
    </p>
  );
};

const AddStockOpname = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const [cancelModal, setCancelModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [noLocationModal, setNoLocationModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);

  // Contract guard shared by the zod schema (complete path) and the
  // draft confirm path below: at most 4 fractional digits, magnitude at
  // most 999999.9999, finite numbers only. Typing already prevents most
  // violations; this is the enforcement boundary for pasted/programmatic
  // values so nothing invalid can be submitted.
  const decimalQuantityField = (requiredMsg) =>
    z
      .string()
      .min(1, requiredMsg)
      .refine((v) => hasValidDecimalPrecision(v), {
        message: t("page.stockOpname.validation.quantityPrecision")
      })
      .refine((v) => isWithinDecimalMagnitude(v), {
        message: t("page.stockOpname.validation.quantityTooLarge")
      });

  const stockOpnameSchema = z.object({
    tanggalAudit: z.date({ required_error: t("page.stockOpname.validation.auditDateRequired") }),
    auditor: z.string().trim().min(1, t("page.stockOpname.validation.auditorRequired")),
    catatan: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().optional(),
          kodeBarang: z.string().trim().min(1, t("page.stockOpname.validation.kodeBarangRequired")),
          namaBarang: z.string().trim().min(1, t("page.stockOpname.validation.namaBarangRequired")),
          satuan: z.string().min(1, t("page.stockOpname.validation.satuanRequired")),
          lokasiId: z.string().min(1, t("page.stockOpname.validation.lokasiRequired")),
          lokasiLabel: z.string().optional(),
          store: z.string().optional(),
          stokAwalJumlah: decimalQuantityField(t("page.stockOpname.validation.stokAwalRequired")),
          barangMasukJumlah: decimalQuantityField(
            t("page.stockOpname.validation.barangMasukRequired")
          ),
          barangKeluarJumlah: decimalQuantityField(
            t("page.stockOpname.validation.barangKeluarRequired")
          ),
          stokFisikJumlah: decimalQuantityField(t("page.stockOpname.validation.stokFisikRequired")),
          keterangan: z.string().trim().min(1, t("page.stockOpname.validation.keteranganRequired"))
        })
      )
      .min(1, t("page.stockOpname.validation.minOneProduct"))
  });

  const form = useForm({
    resolver: zodResolver(stockOpnameSchema),
    mode: "onChange",
    defaultValues: {
      tanggalAudit: new Date(),
      auditor: "",
      catatan: "",
      items: [defaultItemValues]
    }
  });

  const {
    control,
    formState: { errors },
    trigger,
    getValues,
    setValue,
    watch,
    reset
  } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch("items");

  const { data: locationData, isLoading: locationLoading } = useLocations();
  const locations = locationData?.data || locationData?.locations || locationData || [];

  const activeLocationId = useMemo(
    () => watchedItems?.find((r) => r?.lokasiId)?.lokasiId || "",
    [watchedItems]
  );

  const { data: productsData } = useQuery(
    ["all-products-for-opname", activeLocationId],
    () => getAllProduct({ location: activeLocationId, nameProduct: "", category: "" }),
    { enabled: !!activeLocationId }
  );
  const { data: productsFallback } = useQuery(
    ["all-products-for-opname-fallback"],
    () => getAllProduct({ location: "", nameProduct: "", category: "" }),
    { enabled: !activeLocationId }
  );
  const allProducts = activeLocationId ? productsData?.data || [] : productsFallback?.data || [];

  const selectedProductIds = useMemo(
    () => new Set(watchedItems?.filter((r) => r?.productId).map((r) => r.productId)),
    [watchedItems]
  );

  const unitOptions = [
    { value: "pcs", label: t("page.product.form.unit.pcs") },
    { value: "item", label: t("page.product.form.unit.item") },
    { value: "unit", label: t("page.product.form.unit.unit") },
    { value: "buah", label: t("page.product.form.unit.buah") },
    { value: "pasang", label: t("page.product.form.unit.pasang") },
    { value: "set", label: t("page.product.form.unit.set") },
    { value: "lusin", label: t("page.product.form.unit.lusin") },
    { value: "pack", label: t("page.product.form.unit.pack") },
    { value: "box", label: t("page.product.form.unit.box") },
    { value: "karton", label: t("page.product.form.unit.karton") },
    { value: "kg", label: t("page.product.form.unit.kg") },
    { value: "gram", label: t("page.product.form.unit.gram") },
    { value: "liter", label: t("page.product.form.unit.liter") },
    { value: "ml", label: t("page.product.form.unit.ml") },
    { value: "meter", label: t("page.product.form.unit.meter") },
    { value: "cm", label: t("page.product.form.unit.cm") },
    { value: "cup", label: t("page.product.form.unit.cup") },
    { value: "gelas", label: t("page.product.form.unit.gelas") },
    { value: "porsi", label: t("page.product.form.unit.porsi") }
  ];

  const {
    data: stockOpnameData,
    isError,
    refetch
  } = useQuery(["stock-opname", id], () => getStockOpnameById(id), { enabled: !!id });

  useEffect(() => {
    if (stockOpnameData?.data) {
      const opname = stockOpnameData.data;
      reset({
        tanggalAudit: opname.auditDate ? new Date(opname.auditDate) : new Date(),
        auditor: opname.auditor || "",
        catatan: opname.notes || "",
        items:
          opname.items && opname.items.length > 0
            ? opname.items.map((item) => ({
                productId: item.productId || "",
                kodeBarang: item.kodeBarang || "",
                namaBarang: item.namaBarang || "",
                satuan: item.satuan || "",
                lokasiId: item.lokasiId || "",
                lokasiLabel: item.lokasi || "",
                store: item.store || "",
                stokAwalJumlah: String(item.stokAwalJumlah ?? ""),
                barangMasukJumlah: String(item.barangMasukJumlah ?? ""),
                barangKeluarJumlah: String(item.barangKeluarJumlah ?? ""),
                stokFisikJumlah: String(item.stokFisikJumlah ?? ""),
                keterangan: item.keterangan || ""
              }))
            : [defaultItemValues]
      });
    }
  }, [stockOpnameData, reset]);

  const totals = useMemo(() => {
    return (watchedItems || []).reduce(
      (acc, row) => {
        const selisih = calculateSelisih(row);
        return {
          selisihJumlah: roundTo4dp(acc.selisihJumlah + (selisih === null ? 0 : selisih))
        };
      },
      { selisihJumlah: 0 }
    );
  }, [watchedItems]);

  const addRow = () => append(defaultItemValues);
  const removeRow = (index) => {
    if (fields.length > 1) remove(index);
  };

  const handleLokasiChange = (index, locationId) => {
    const loc = locations.find((l) => String(l.id || l._id) === String(locationId));
    setValue(`items.${index}.lokasiId`, String(locationId), { shouldValidate: true });
    setValue(`items.${index}.lokasiLabel`, loc?.name || loc?.storeName || String(locationId));
    setValue(`items.${index}.store`, loc?.store || String(loc?.id || ""));
    // A product picked under the previous location belongs to that
    // location's inventory, not the new one — clear it (mirroring exactly
    // the fields handleProductSelect populates) so the row can't keep
    // showing a product/stock count that no longer applies here.
    setValue(`items.${index}.productId`, "");
    setValue(`items.${index}.kodeBarang`, "");
    setValue(`items.${index}.namaBarang`, "");
    setValue(`items.${index}.satuan`, "");
    setValue(`items.${index}.stokAwalJumlah`, "");
  };

  const handleProductSelect = (index, product) => {
    setValue(`items.${index}.productId`, product.id || product._id, { shouldValidate: true });
    setValue(`items.${index}.kodeBarang`, product.barcode || "", { shouldValidate: true });
    setValue(`items.${index}.namaBarang`, product.nameProduct || product.name, {
      shouldValidate: true
    });
    setValue(`items.${index}.satuan`, product.unit || "pcs", { shouldValidate: true });
    setValue(`items.${index}.stokAwalJumlah`, String(product.stock ?? ""), {
      shouldValidate: true
    });
  };

  const openAddLocation = () => navigate("/add-location");

  const handleDownloadTemplate = async () => {
    if (!locations || locations.length === 0) {
      setNoLocationModal(true);
      return;
    }
    setIsDownloading(true);
    try {
      await downloadStockOpnameTemplate();
      toast.success(t("common.success"), {
        description: t("page.stockOpname.toast.downloadSuccess")
      });
    } catch (err) {
      toast.error(t("common.error"), {
        description:
          err?.response?.data?.message || err.message || t("page.stockOpname.toast.downloadError")
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadParsed = (parsedRows) => {
    const filled = parsedRows.filter((r) => r.kodeBarang || r.namaBarang);
    if (filled.length === 0) {
      toast.warning(t("page.stockOpname.toast.importDone"), {
        description: t("page.stockOpname.toast.importEmpty")
      });
      return;
    }
    const newItems = filled.map((r) => {
      const match = locations.find(
        (l) => (l.name || l.storeName || "").toLowerCase() === (r.lokasi || "").toLowerCase()
      );
      return {
        productId: "",
        kodeBarang: r.kodeBarang || "",
        namaBarang: r.namaBarang || "",
        satuan: r.satuan || "",
        lokasiId: match ? String(match.id || match._id) : "",
        lokasiLabel: match ? match.name || match.storeName : r.lokasi || "",
        store: match?.store || String(match?.id || ""),
        stokAwalJumlah: r.stokAwalJumlah || "",
        barangMasukJumlah: r.barangMasukJumlah || "",
        barangKeluarJumlah: r.barangKeluarJumlah || "",
        stokFisikJumlah: r.stokFisikJumlah || "",
        keterangan: r.keterangan || ""
      };
    });
    replace(newItems);
    toast.success(t("common.success"), {
      description: t("page.stockOpname.toast.importSuccess", { count: newItems.length })
    });
  };

  const buildPayload = (status) => {
    const values = getValues();
    return {
      auditDate: formatDateOnly(values.tanggalAudit),
      auditor: values.auditor,
      notes: values.catatan || "",
      ...(status ? { status } : {}),
      items: values.items.map((row) => {
        const stokAkhir = calculateStockAkhir(row);
        const fisik = calculateStockFisik(row);
        const selisih = calculateSelisih(row);
        return {
          ...(row.productId ? { productId: row.productId } : {}),
          kodeBarang: row.kodeBarang,
          namaBarang: row.namaBarang,
          satuan: row.satuan,
          lokasiId: row.lokasiId,
          lokasi: row.store || row.lokasiId,
          stokAwalJumlah: toDecimal(row.stokAwalJumlah),
          barangMasukJumlah: toDecimal(row.barangMasukJumlah),
          barangKeluarJumlah: toDecimal(row.barangKeluarJumlah),
          stokAkhirJumlah: stokAkhir,
          stokFisikJumlah: fisik,
          selisihJumlah: selisih,
          keterangan: row.keterangan
        };
      })
    };
  };

  const handleSaveComplete = async (e) => {
    e.preventDefault();
    const valid = await trigger();
    if (!valid) return;
    setIsSubmitting(true);
    try {
      const payload = buildPayload("completed");
      let newId;
      if (id) {
        await updateStockOpname(id, payload);
        newId = id;
        await changeStockOpnameStatus(newId, "completed");
      } else {
        const created = await addStockOpname(payload);
        newId = created?.data?.id || created?.id;
        if (!newId) throw new Error(t("page.stockOpname.toast.getIdError"));
      }
      toast.success(t("common.success"), {
        description: t("page.stockOpname.toast.completeSuccess")
      });
      queryClient.invalidateQueries(["stockOpname"]);
      navigate("/stock-opname");
    } catch (err) {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isError) return <AbortController refetch={refetch} />;

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
              { i18nKey: "page.stockOpname.list.title" },
              { i18nKey: id ? "breadcrumb.edit" : "breadcrumb.add" }
            ]}
            title={id ? t("page.stockOpname.edit.title") : t("page.stockOpname.add.title")}
            description={t("page.stockOpname.add.description")}
            backLink="/stock-opname"
            onBack={() => setCancelModal(true)}>
            <Button
              variant="import"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              className="transition-all">
              <UploadIcon size={18} className="mr-1.5" />
              {t("page.stockOpname.button.uploadExcel")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isDownloading}
              onClick={handleDownloadTemplate}
              className="transition-all">
              {isDownloading ? (
                <Loader2 size={18} className="mr-1.5 animate-spin" />
              ) : (
                <Download size={18} className="mr-1.5" />
              )}
              {isDownloading
                ? t("page.stockOpname.button.downloading")
                : t("page.stockOpname.button.downloadTemplate")}
            </Button>
            <UserGuide guideKey="add-stock-opname" />
          </PageHeader>
        </div>
      </div>

      <div>
        <div>
          <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden space-y-6">
            <Card className="p-6 shadow-sm border-muted">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>
                    {t("page.stockOpname.form.auditDate")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="tanggalAudit"
                    render={({ field }) => (
                      <DatePicker
                        date={field.value}
                        setDate={(date) => field.onChange(date || new Date())}
                      />
                    )}
                  />
                  <FieldError error={errors.tanggalAudit} />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("page.stockOpname.form.auditor")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register("auditor")}
                    placeholder={t("page.stockOpname.form.auditorPlaceholder")}
                    className={
                      errors.auditor ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                    maxLength={FIELD_LIMITS.PERSON_NAME}
                  />
                  <FieldError error={errors.auditor} />
                </div>
              </div>
            </Card>

            <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-xs text-blue-700 dark:text-blue-300 flex flex-wrap gap-x-6 gap-y-1 transition-colors">
              <span>{t("page.stockOpname.formula.endingStockFormula")}</span>
              <span>{t("page.stockOpname.formula.differenceFormula")}</span>
            </div>

            <Card className="overflow-hidden shadow-sm border-muted">
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.kodeBarang")}
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.namaBarang")}
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap w-28">
                        {t("page.stockOpname.table.satuan")}
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.lokasi")}
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.stokAwal")}
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.barangMasuk")}
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.barangKeluar")}
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.persdAkhir")}
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.stockFisik")}
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.selisih")}
                      </th>
                      <th className="px-3 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.ketersediaan")}
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                        {t("page.stockOpname.table.keterangan")}
                      </th>
                      <th className="px-3 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-3 py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Info size={32} className="text-muted-foreground/40" />
                            <p className="text-sm">{t("page.stockOpname.table.empty")}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      fields.map((field, index) => {
                        const row = watchedItems.at(index) || {};
                        const stokAkhir = calculateStockAkhir(row);
                        const selisih = calculateSelisih(row);
                        const availability = getAvailabilityStatus(stokAkhir, t);
                        const rowErrors = errors.items?.at(index);

                        return (
                          <tr
                            key={field.id}
                            className="border-b border-muted/30 transition-colors hover:bg-muted/15">
                            <td className="border-r border-muted/20 px-3 py-2">
                              <input
                                type="text"
                                {...form.register(`items.${index}.kodeBarang`)}
                                placeholder={t("page.stockOpname.form.kodePlaceholder")}
                                className={rowInputClass(!!rowErrors?.kodeBarang)}
                              />
                              {rowErrors?.kodeBarang && (
                                <p className="text-destructive text-[10px] mt-0.5">
                                  {rowErrors.kodeBarang.message}
                                </p>
                              )}
                            </td>
                            <td className="border-r border-muted/20 px-3 py-2 min-w-[140px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  {...form.register(`items.${index}.namaBarang`, {
                                    onChange: () => {
                                      setValue(`items.${index}.productId`, "", {
                                        shouldValidate: true
                                      });
                                    }
                                  })}
                                  placeholder={t("page.stockOpname.form.namaPlaceholder")}
                                  className={`flex-1 bg-transparent border-0 border-b text-sm outline-none transition-colors px-0 py-1 ${
                                    rowErrors?.namaBarang
                                      ? "border-destructive focus:border-solid"
                                      : "border-dashed border-muted-foreground/20 focus:border-primary focus:border-solid"
                                  }`}
                                />
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={!row.lokasiId}
                                      title={
                                        !row.lokasiId
                                          ? t("page.stockOpname.form.selectLocationFirst")
                                          : t("common.search")
                                      }
                                      className={`shrink-0 p-1 transition-colors ${
                                        !row.lokasiId
                                          ? "text-muted-foreground/20 cursor-not-allowed"
                                          : "text-muted-foreground/40 hover:text-primary"
                                      }`}>
                                      <Search size={14} />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    align="start"
                                    side="bottom"
                                    className="p-0 w-[280px]">
                                    <Command>
                                      <CommandInput placeholder={t("common.search")} />
                                      <CommandList>
                                        {allProducts.filter(
                                          (p) => !selectedProductIds.has(p.id || p._id)
                                        ).length === 0 && (
                                          <CommandEmpty>
                                            {t("page.stockOpname.table.productNotFound")}
                                          </CommandEmpty>
                                        )}
                                        {allProducts
                                          .filter((p) => !selectedProductIds.has(p.id || p._id))
                                          .map((p) => (
                                            <CommandItem
                                              key={p.id || p._id}
                                              value={p.nameProduct || p.name}
                                              onSelect={() => handleProductSelect(index, p)}>
                                              <div className="flex items-center gap-2">
                                                <Package
                                                  size={14}
                                                  className="shrink-0 text-muted-foreground/40"
                                                />
                                                <div className="flex flex-col min-w-0">
                                                  <span className="text-sm truncate">
                                                    {p.nameProduct || p.name}
                                                  </span>
                                                  {p.barcode && (
                                                    <span className="text-[10px] text-muted-foreground truncate">
                                                      {p.barcode}
                                                    </span>
                                                  )}
                                                </div>
                                                {selectedProductIds.has(p.id || p._id) && (
                                                  <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                                    dipilih
                                                  </span>
                                                )}
                                              </div>
                                            </CommandItem>
                                          ))}
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              {rowErrors?.namaBarang && (
                                <p className="text-destructive text-[10px] mt-0.5">
                                  {rowErrors.namaBarang.message}
                                </p>
                              )}
                            </td>
                            <td className="border-r border-muted/20 px-3 py-2">
                              <Controller
                                control={control}
                                name={`items.${index}.satuan`}
                                render={({ field }) => (
                                  <Combobox
                                    options={[
                                      {
                                        value: "",
                                        label: t("page.stockOpname.form.satuanPlaceholder")
                                      },
                                      ...unitOptions.map((opt) => ({
                                        value: opt.value,
                                        label: opt.label
                                      }))
                                    ]}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={t("page.stockOpname.form.satuanPlaceholder")}
                                    searchPlaceholder={t("common.search")}
                                  />
                                )}
                              />
                              {rowErrors?.satuan && (
                                <p className="text-destructive text-[10px] mt-0.5">
                                  {rowErrors.satuan.message}
                                </p>
                              )}
                            </td>
                            <td className="border-r border-muted/20 px-3 py-2 min-w-[150px]">
                              <Controller
                                control={control}
                                name={`items.${index}.lokasiId`}
                                render={({ field: lokasiField }) => (
                                  <LokasiSelect
                                    value={lokasiField.value}
                                    onChange={(val) => handleLokasiChange(index, val)}
                                    locations={locations}
                                    loading={locationLoading}
                                    onAddNew={openAddLocation}
                                    t={t}
                                    hasError={!!rowErrors?.lokasiId}
                                  />
                                )}
                              />
                              {rowErrors?.lokasiId && (
                                <p className="text-destructive text-[10px] mt-0.5">
                                  {rowErrors.lokasiId.message}
                                </p>
                              )}
                            </td>
                            {[
                              "stokAwalJumlah",
                              "barangMasukJumlah",
                              "barangKeluarJumlah",
                              "stokFisikJumlah"
                            ].map((fieldName) => (
                              <td key={fieldName} className="border-r border-muted/20 px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  {...form.register(`items.${index}.${fieldName}`, {
                                    onChange: (e) => {
                                      e.target.value = sanitizeDecimalInput(e.target.value);
                                    }
                                  })}
                                  placeholder="0"
                                  className={`w-full bg-transparent border-0 border-b text-sm text-right outline-none transition-colors px-0 py-1 tabular-nums ${
                                    safeGet(rowErrors, fieldName)
                                      ? "border-destructive focus:border-solid"
                                      : "border-dashed border-muted-foreground/20 focus:border-primary focus:border-solid"
                                  }`}
                                />
                              </td>
                            ))}
                            <td className="border-r border-muted/20 px-3 py-2 text-right font-semibold tabular-nums">
                              {stokAkhir}
                            </td>
                            <td
                              className={`border-r border-muted/20 px-3 py-2 text-right font-semibold tabular-nums ${getSelisihStyle(selisih)}`}>
                              {selisih === null ? "-" : selisih > 0 ? `+${selisih}` : selisih}
                            </td>
                            <td className="border-r border-muted/20 px-3 py-2 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${availability.className}`}>
                                {availability.label}
                              </span>
                            </td>
                            <td className="border-r border-muted/20 px-3 py-2">
                              <input
                                type="text"
                                {...form.register(`items.${index}.keterangan`)}
                                placeholder={t("page.stockOpname.form.keteranganPlaceholder")}
                                className={rowInputClass(!!rowErrors?.keterangan)}
                              />
                              {rowErrors?.keterangan && (
                                <p className="text-destructive text-[10px] mt-0.5">
                                  {rowErrors.keterangan.message}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(index)}
                                disabled={fields.length <= 1}
                                className="text-muted-foreground/30 hover:text-destructive transition-colors disabled:opacity-20">
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </HorizontalScrollArea>

              <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/10">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  <Plus size={16} />
                  {t("page.stockOpname.button.addProduct")}
                </button>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info size={12} />
                    {t("page.stockOpname.table.totalDifference")}
                  </div>
                  <div
                    className={`font-bold text-lg tabular-nums ${getSelisihStyle(totals.selisihJumlah)}`}>
                    {totals.selisihJumlah > 0 ? `+${totals.selisihJumlah}` : totals.selisihJumlah}
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              <Label>
                {t("page.stockOpname.form.auditNotes")}{" "}
                <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
              </Label>
              <Textarea
                {...form.register("catatan")}
                rows={3}
                placeholder={t("page.stockOpname.form.auditNotesPlaceholder")}
                maxLength={FIELD_LIMITS.DESCRIPTION}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
              <Button
                variant="danger"
                onClick={() => setCancelModal(true)}
                className="transition-all w-full sm:w-auto justify-center">
                <X size={16} className="mr-1" />
                {t("common.cancel")}
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  variant="draft"
                  onClick={() => setDraftModal(true)}
                  disabled={isSubmitting}
                  className="transition-all min-w-[140px] w-full sm:w-auto justify-center">
                  <Save size={16} className="mr-1" />
                  {isSubmitting ? t("common.saving") : t("page.stockOpname.button.saveDraft")}
                </Button>
                <Button
                  variant="success"
                  onClick={handleSaveComplete}
                  disabled={isSubmitting}
                  className="transition-all min-w-[140px] w-full sm:w-auto justify-center">
                  <Save size={16} className="mr-1" />
                  {isSubmitting ? t("common.saving") : t("page.stockOpname.button.saveComplete")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSubmitting && <Loading fullscreen size="lg" label={t("common.saving")} />}

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={(open) => !open && setCancelModal(false)}
        title={t("page.stockOpname.modal.cancelTitle")}
        description={t("page.stockOpname.modal.cancelDescription")}
        confirmText={t("page.stockOpname.modal.confirmCancel")}
        onConfirm={() => {
          setCancelModal(false);
          setTimeout(() => navigate("/stock-opname"), 150);
        }}
      />

      <Modal
        type="confirm"
        open={noLocationModal}
        onOpenChange={setNoLocationModal}
        title={t("page.stockOpname.modal.noLocationTitle")}
        description={t("page.stockOpname.modal.noLocationDescription")}
        confirmText={t("page.stockOpname.modal.addLocation")}
        onConfirm={() => setTimeout(() => navigate("/add-location"), 150)}
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
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("common.saveAsDraftTitle")}
        description={t("common.saveAsDraftDesc")}
        confirmText={t("common.yesSaveDraft")}
        onConfirm={() => {
          setDraftModal(false);
          // Draft saves bypass the zod resolver, so enforce the same
          // decimal contract here (non-empty inputs only — empty keeps its
          // uncounted semantics). Violations surface through the existing
          // error modal instead of being submitted.
          const draftValues = getValues();
          const draftQtyValues = (draftValues.items || []).flatMap((row) => [
            row.stokAwalJumlah,
            row.barangMasukJumlah,
            row.barangKeluarJumlah,
            row.stokFisikJumlah
          ]);
          const draftQtyPresent = draftQtyValues.filter(
            (v) => v !== "" && v !== null && v !== undefined
          );
          const draftQtyMsg = !draftQtyPresent.every((v) => hasValidDecimalPrecision(v))
            ? t("page.stockOpname.validation.quantityPrecision")
            : !draftQtyPresent.every((v) => isWithinDecimalMagnitude(v))
              ? t("page.stockOpname.validation.quantityTooLarge")
              : null;
          if (draftQtyMsg) {
            setModalMessage(draftQtyMsg);
            setErrorModal(true);
            return;
          }
          setIsSubmitting(true);
          const payload = buildPayload();
          const saveFn = id ? updateStockOpname(id, payload) : addStockOpname(payload);
          saveFn
            .then(() => {
              toast.success(t("common.success"), {
                description: id
                  ? t("page.stockOpname.toast.updateSuccess")
                  : t("page.stockOpname.toast.saveDraftSuccess")
              });
              queryClient.invalidateQueries(["stockOpname"]);
              navigate("/stock-opname");
            })
            .catch((err) => {
              setModalMessage(err?.response?.data?.message || err.message);
              setErrorModal(true);
            })
            .finally(() => setIsSubmitting(false));
        }}
      />

      <UploadExcelModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onDataParsed={handleUploadParsed}
        onUploadSuccess={() => navigate("/stock-opname")}
        auditDate={formatDateOnly(watch("tanggalAudit"))}
      />
    </div>
  );
};

export default AddStockOpname;

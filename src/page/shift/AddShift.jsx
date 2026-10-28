import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueries, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Save,
  Users,
  CalendarDays,
  Check,
  Store,
  Search,
  Briefcase,
  AlertTriangle,
  Lock,
  Wand2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { addShift, getAllShift } from "@/services/shift";
import { getAllEmployee } from "@/services/employee";
import { getAllShiftTemplate } from "@/services/shiftTemplate";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { SHIFT_TYPES, DEFAULT_SHIFT_TYPE, SHIFT_TYPE_LABELS } from "@/constants/shiftTypes";
import { safeGet } from "@/lib/safe-lookup";
import { formatDateOnly } from "@/utils/dateOnly";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { buildEmployeeShiftConflictMap } from "./shiftOverlap";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const toOverlapCandidate = (values) => ({
  tanggal_mulai: values.tanggal_mulai,
  tanggal_selesai: values.tipe_shift === "mingguan" ? values.tanggal_selesai : undefined,
  jam_mulai: values.jam_mulai,
  jam_selesai: values.jam_selesai,
  tipe_shift: values.tipe_shift
});

const AddShift = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperAdmin, user } = useStore();
  const [cookie] = useCookies();
  const userStoreId = isSuperAdmin ? null : cookie?.user?.store;
  const userStoreName = isSuperAdmin ? "" : cookie?.user?.storeName;

  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [draftModal, setDraftModal] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [allStores, setAllStores] = useState(false);
  const [empSearchMap, setEmpSearchMap] = useState({});
  const [storeRemoveModal, setStoreRemoveModal] = useState(false);
  const [pendingStoreValue, setPendingStoreValue] = useState(null);
  const [employeeOpenMap, setEmployeeOpenMap] = useState({});

  const formSchema = z.object({
    nama_shift: z.string().min(1, t("page.shift.edit.validation.namaShift")),
    tipe_shift: z.enum(SHIFT_TYPES),
    store: isSuperAdmin
      ? z.array(z.number()).min(1, t("page.shift.add.validation.store"))
      : z.string().min(1, t("page.shift.add.validation.store")),
    jam_mulai: z.string().min(1, t("page.shift.edit.validation.jamMulai")),
    jam_selesai: z.string().min(1, t("page.shift.edit.validation.jamSelesai")),
    tanggal_mulai: z.date({ required_error: t("page.shift.add.validation.tanggalMulai") }),
    tanggal_selesai: z.date().optional(),
    karyawan: z.array(z.any()).optional(),
    status: z.boolean().default(true)
  });

  const fieldLabels = {
    nama_shift: "Nama Shift",
    tipe_shift: "Tipe Shift",
    store: "Penempatan Toko",
    jam_mulai: "Jam Mulai",
    jam_selesai: "Jam Selesai",
    tanggal_mulai: "Tanggal Mulai",
    tanggal_selesai: "Tanggal Selesai",
    karyawan: "Karyawan",
    status: "Status"
  };

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_shift: "",
      tipe_shift: DEFAULT_SHIFT_TYPE,
      store: isSuperAdmin ? [] : cookie?.user?.store ? String(cookie.user.store) : "",
      jam_mulai: "08:00",
      jam_selesai: "17:00",
      tanggal_mulai: new Date(),
      tanggal_selesai: undefined,
      karyawan: [],
      status: true
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/shift-list",
    () => setCancelModal(true),
    form
  );

  const { data: locationsData, isLoading: locLoading } = useLocations();
  const locations = locationsData?.data || locationsData?.locations || [];

  const { data: templatesData } = useQuery(["shift-templates-dropdown"], () =>
    getAllShiftTemplate()
  );
  const templates = templatesData?.data || [];
  const [selectedTemplate, setSelectedTemplate] = React.useState("");

  const selectedStores = form.watch("store") || (isSuperAdmin ? [] : "");
  const isMultiStore =
    isSuperAdmin && !allStores && Array.isArray(selectedStores) && selectedStores.length > 1;
  const effectiveStore = useMemo(() => {
    if (isSuperAdmin) {
      if (allStores) return "";
      if (Array.isArray(selectedStores) && selectedStores.length === 1) {
        return String(selectedStores[0]);
      }
      return "";
    }
    return selectedStores;
  }, [isSuperAdmin, allStores, selectedStores]);

  const storeIds = useMemo(() => {
    if (!isMultiStore) return effectiveStore ? [effectiveStore] : [];
    return selectedStores.map(String);
  }, [isMultiStore, effectiveStore, selectedStores]);

  const employeeQueries = useQueries(
    storeIds.map((storeId) => ({
      queryKey: ["employees-for-shift", storeId],
      queryFn: () => getAllEmployee({ limit: 100, location: storeId }),
      keepPreviousData: true,
      enabled: !!storeId
    }))
  );

  const employeesByStore = useMemo(() => {
    const map = {};
    storeIds.forEach((storeId, idx) => {
      const data = employeeQueries[idx]?.data;
      const emps = (data?.data || data?.employees || []).filter((e) => e.status === "active");
      map[storeId] = emps;
    });
    return map;
  }, [storeIds, employeeQueries]);

  const allEmployeesList = useMemo(() => {
    return Object.values(employeesByStore).flat();
  }, [employeesByStore]);

  const { data: allShiftsData } = useQuery(["shifts-for-conflict"], () =>
    getAllShift({ store: "", page: 1, limit: 1000, statusShift: "" })
  );

  const isInitialLoading = employeeQueries.some((q) => q.isLoading) || locLoading;

  const tipeShift = form.watch("tipe_shift");
  const selectedEmployees = form.watch("karyawan") || [];
  const tanggalMulai = form.watch("tanggal_mulai");
  const tanggalSelesai = form.watch("tanggal_selesai");
  const jamMulai = form.watch("jam_mulai");
  const jamSelesai = form.watch("jam_selesai");

  React.useEffect(() => {
    if (tipeShift === "mingguan" && tanggalMulai) {
      const end = new Date(tanggalMulai);
      end.setDate(end.getDate() + 6);
      form.setValue("tanggal_selesai", end);
    } else {
      form.setValue("tanggal_selesai", undefined);
    }
  }, [tipeShift, tanggalMulai, form]);

  const employeeConflicts = useMemo(
    () =>
      buildEmployeeShiftConflictMap(
        allShiftsData?.data || [],
        toOverlapCandidate({
          tanggal_mulai: tanggalMulai,
          tanggal_selesai: tanggalSelesai,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          tipe_shift: tipeShift
        })
      ),
    [allShiftsData, tanggalMulai, tanggalSelesai, jamMulai, jamSelesai, tipeShift]
  );

  const getConflictingEmployees = (values) => {
    const conflicts = buildEmployeeShiftConflictMap(
      allShiftsData?.data || [],
      toOverlapCandidate(values)
    );
    return (values.karyawan || [])
      .map((employee) => {
        const employeeId = employee?.id ?? employee?._id;
        const rows = conflicts[String(employeeId)] || [];
        return rows.length > 0 ? { ...employee, conflicts: rows } : null;
      })
      .filter(Boolean);
  };

  const showConflictError = (employees) => {
    const names = employees
      .map((employee) => {
        const conflict = employee.conflicts[0];
        return `${employee.name || `#${employee.id}`} (${conflict.shiftName} ${conflict.startTime}-${conflict.endTime})`;
      })
      .join(", ");
    setModalMessage(t("page.shift.add.conflictMessage", { names }));
    setErrorModal(true);
  };

  const handleStoreChange = (value) => {
    if (isSuperAdmin && Array.isArray(value)) {
      const currentStores = Array.isArray(selectedStores) ? selectedStores : [];
      const removedStores = currentStores.filter((s) => !value.includes(s));
      const hasRemovedEmployees = removedStores.some((storeId) =>
        selectedEmployees.some((emp) => {
          const empData = allEmployeesList.find((e) => (e.id || e._id) === emp.id);
          return empData && String(empData.store) === String(storeId);
        })
      );
      if (hasRemovedEmployees && removedStores.length > 0) {
        setPendingStoreValue(value);
        setStoreRemoveModal(true);
        return;
      }
    }
    form.setValue("store", value);
    if (Array.isArray(value) && value.length > 0) {
      setAllStores(false);
    }
  };

  const confirmStoreRemove = () => {
    const removedStoreIds = (Array.isArray(selectedStores) ? selectedStores : []).filter(
      (s) => !pendingStoreValue.includes(s)
    );
    const removedEmpIds = selectedEmployees
      .filter((emp) => {
        const empData = allEmployeesList.find((e) => (e.id || e._id) === emp.id);
        return empData && removedStoreIds.some((s) => String(empData.store) === String(s));
      })
      .map((e) => e.id);
    const remaining = selectedEmployees.filter((emp) => !removedEmpIds.includes(emp.id));
    form.setValue("karyawan", remaining);
    form.setValue("store", pendingStoreValue);
    setStoreRemoveModal(false);
    setPendingStoreValue(null);
    if (pendingStoreValue && pendingStoreValue.length > 0) {
      setAllStores(false);
    }
  };

  const toggleEmployee = (emp) => {
    const current = form.getValues("karyawan") || [];
    const exists = current.find((e) => (e.id || e._id) === (emp.id || emp._id));
    if (exists) {
      form.setValue(
        "karyawan",
        current.filter((e) => (e.id || e._id) !== (emp.id || emp._id))
      );
    } else {
      form.setValue("karyawan", [
        ...current,
        { id: emp.id || emp._id, name: emp.fullName || emp.name }
      ]);
    }
  };

  const toggleEmployeeOpen = (storeId) => {
    setEmployeeOpenMap((prev) => ({ ...prev, [storeId]: !prev[storeId] }));
    setEmpSearchMap((prev) => ({ ...prev, [storeId]: "" }));
  };

  const createMutation = useMutation(addShift, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["shifts"]);
      queryClient.invalidateQueries(["shifts-for-conflict"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message || "Gagal menambahkan shift");
      setErrorModal(true);
    }
  });

  const handleSave = (values, saveAsDraft = false) => {
    const conflictingEmployees = getConflictingEmployees(values);
    if (conflictingEmployees.length > 0) {
      showConflictError(conflictingEmployees);
      return;
    }

    const { status, karyawan, store, ...rest } = values;
    const storeValue = isSuperAdmin
      ? allStores
        ? []
        : Array.isArray(store)
          ? store
          : [store]
      : store;
    createMutation.mutate({
      ...rest,
      store: storeValue,
      tanggal_mulai: formatDateOnly(values.tanggal_mulai),
      tanggal_selesai: values.tanggal_selesai ? formatDateOnly(values.tanggal_selesai) : null,
      karyawan: karyawan?.map((k) => k.id) || [],
      status: saveAsDraft ? "draft" : status ? "active" : "inactive"
    });
  };

  const onSubmit = (values) => handleSave(values, false);

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
            label: t("page.shift.list.title"),
            href: "/shift-list",
            i18nKey: "page.shift.list.title"
          },
          {
            label: t("page.shift.add.title"),
            i18nKey: "page.shift.add.title"
          }
        ]}
        title={t("page.shift.add.title")}
        description={t("page.shift.list.description")}
        backLink="/shift-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-shift" />
        <Button variant="outline" onClick={requestLeave}>
          {t("action.back")}
        </Button>
      </PageHeader>
      <LoadErrorBanner />

      {isInitialLoading ? (
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-14 w-full rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Penempatan Toko - paling atas */}
              {isSuperAdmin ? (
                <StoreSelectCard
                  locations={locations}
                  selectedStores={selectedStores}
                  onChange={handleStoreChange}
                  isSuperAdmin={isSuperAdmin}
                  user={user}
                  t={t}
                  title="Pilih Toko*"
                  description="Pilih toko dimana shift ini tersedia"
                  noStoreLabel="Belum ada toko"
                  addStoreLabel="Tambah Toko"
                  storeInfoLabel="Toko:"
                  allStores={allStores}
                  onAllStoresChange={setAllStores}
                  navigate={navigate}
                  mandatory
                  locationsLoading={locLoading}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="store"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        Penempatan Toko <span className="text-destructive">*</span>
                      </FormLabel>
                      {(() => {
                        const ownLoc = locations.find(
                          (l) => String(l.id || l._id) === String(userStoreId)
                        );
                        return (
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary/5">
                              <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                <Store size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-primary truncate">
                                  {ownLoc?.name || userStoreName || `Toko #${userStoreId}`}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {ownLoc?.city || ownLoc?.address || ""}
                                </p>
                              </div>
                              <Check size={16} className="text-primary shrink-0" />
                            </div>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Lock size={12} className="shrink-0" />
                              Hanya bisa menambahkan shift untuk toko penempatan kamu.
                            </p>
                          </div>
                        );
                      })()}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Template Selector */}
              {templates.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 size={20} className="text-blue-600 dark:text-blue-400 text-lg" />
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      {t("page.shift.template.selectorTitle", "Pilih Template (Opsional)")}
                    </p>
                  </div>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mb-3">
                    {t(
                      "page.shift.template.selectorDesc",
                      "Pilih template untuk mengisi nama dan jam shift secara otomatis."
                    )}
                  </p>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      const templateId = e.target.value;
                      setSelectedTemplate(templateId);
                      if (templateId) {
                        const tmpl = templates.find((t) => String(t.id) === String(templateId));
                        if (tmpl) {
                          form.setValue("nama_shift", tmpl.name || "", { shouldValidate: true });
                          form.setValue("jam_mulai", tmpl.startTime?.slice(0, 5) || "", {
                            shouldValidate: true
                          });
                          form.setValue("jam_selesai", tmpl.endTime?.slice(0, 5) || "", {
                            shouldValidate: true
                          });
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-950 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">
                      {t("page.shift.template.selectPlaceholder", "-- Pilih Template --")}
                    </option>
                    {templates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name} ({tmpl.startTime?.slice(0, 5)} - {tmpl.endTime?.slice(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nama Shift & Tipe */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nama_shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nama Shift <span className="text-destructive">*</span>
                      </FormLabel>
                      <div className="relative">
                        <CalendarDays
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                          placeholder={t("page.shift.edit.form.namaShiftPlaceholder")}
                          className="pl-9"
                          {...field}
                          maxLength={FIELD_LIMITS.SHORT_LABEL}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipe_shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tipe Shift <span className="text-destructive">*</span>
                      </FormLabel>
                      <div className="flex gap-2">
                        {SHIFT_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => field.onChange(type)}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${
                              field.value === type
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50"
                            }`}>
                            {safeGet(SHIFT_TYPE_LABELS, type, type)}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tanggal Mulai & Tanggal Selesai */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="tanggal_mulai"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tanggal Mulai <span className="text-destructive">*</span>
                      </FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tanggal_selesai"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Selesai</FormLabel>
                      <div
                        className={`transition-all duration-200 ${tipeShift === "harian" ? "opacity-50" : ""}`}>
                        <DatePicker
                          date={field.value}
                          setDate={tipeShift === "mingguan" ? field.onChange : () => {}}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tipeShift === "harian"
                          ? "Hanya untuk shift mingguan"
                          : "Atur tanggal berakhir shift"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pilih Karyawan */}
              <FormField
                control={form.control}
                name="karyawan"
                render={() => (
                  <FormItem>
                    <FormLabel>Pilih Karyawan</FormLabel>
                    {storeIds.length === 0 ? (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                        <Users size={16} className="shrink-0" />
                        {isMultiStore
                          ? "Pilih toko untuk melihat karyawan"
                          : allStores
                            ? "Pilih toko spesifik untuk memilih karyawan"
                            : "Pilih toko terlebih dahulu"}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {storeIds.map((storeId) => {
                          const storeEmps = employeesByStore[storeId] || [];
                          const storeLoc = locations.find((l) => String(l.id) === String(storeId));
                          const isOpen = employeeOpenMap[storeId] || false;
                          const search = empSearchMap[storeId] || "";
                          const selectedCount = selectedEmployees.filter((emp) => {
                            const empData = storeEmps.find((e) => (e.id || e._id) === emp.id);
                            return !!empData;
                          }).length;
                          return (
                            <div
                              key={storeId}
                              className="border border-border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleEmployeeOpen(storeId)}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Store size={16} className="text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {storeLoc?.name || `Toko #${storeId}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {storeEmps.length} karyawan
                                    {selectedCount > 0 && (
                                      <span className="text-primary font-medium">
                                        {" "}
                                        · {selectedCount} dipilih
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <Users size={16} className="shrink-0 text-muted-foreground" />
                              </button>
                              {selectedCount > 0 && (
                                <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-background border-b border-border">
                                  {selectedEmployees
                                    .filter((emp) =>
                                      storeEmps.some((e) => (e.id || e._id) === emp.id)
                                    )
                                    .map((emp) => (
                                      <span
                                        key={emp.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                        <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold">
                                          {(emp.name || "?")[0]}
                                        </span>
                                        {emp.name}
                                        <button
                                          type="button"
                                          onClick={() => toggleEmployee(emp)}
                                          className="hover:text-destructive">
                                          <X size={12} />
                                        </button>
                                      </span>
                                    ))}
                                </div>
                              )}
                              {isOpen && (
                                <div className="border-t border-border">
                                  <div className="p-2 border-b border-border">
                                    <div className="relative">
                                      <Search
                                        size={14}
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                      />
                                      <input
                                        type="text"
                                        value={search}
                                        onChange={(e) =>
                                          setEmpSearchMap((prev) => ({
                                            ...prev,
                                            [storeId]: e.target.value
                                          }))
                                        }
                                        placeholder="Cari nama atau posisi..."
                                        className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto">
                                    {storeEmps.length === 0 ? (
                                      <div className="flex flex-col items-center gap-2 p-6 text-center">
                                        <Users size={24} className="text-muted-foreground/40" />
                                        <p className="text-xs text-muted-foreground">
                                          Belum ada karyawan di toko ini
                                        </p>
                                      </div>
                                    ) : (
                                      storeEmps
                                        .filter((emp) => {
                                          if (!search) return true;
                                          const q = search.toLowerCase();
                                          return (
                                            (emp.fullName || emp.name || "")
                                              .toLowerCase()
                                              .includes(q) ||
                                            (emp.positionData?.name || "").toLowerCase().includes(q)
                                          );
                                        })
                                        .map((emp) => {
                                          const empId = emp.id || emp._id;
                                          const isSelected = selectedEmployees.some(
                                            (e) => String(e.id) === String(empId)
                                          );
                                          const conflicts = employeeConflicts[String(empId)] || [];
                                          const conflict = conflicts[0];
                                          const isDisabled = !isSelected && conflicts.length > 0;
                                          const posName =
                                            emp.positionData?.name ||
                                            (typeof emp.position === "string" ? emp.position : "");
                                          const deptName =
                                            emp.departmentData?.name ||
                                            (typeof emp.department === "string"
                                              ? emp.department
                                              : "");
                                          return (
                                            <label
                                              key={empId}
                                              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                                                isDisabled
                                                  ? "opacity-60 cursor-not-allowed bg-muted/20"
                                                  : "cursor-pointer hover:bg-muted/50"
                                              } ${isSelected ? "bg-primary/5" : ""}`}>
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={isDisabled}
                                                onChange={() => toggleEmployee(emp)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary shrink-0 disabled:opacity-50"
                                              />
                                              {emp.image ? (
                                                <img
                                                  src={emp.image}
                                                  alt={emp.fullName || emp.name}
                                                  className="w-9 h-9 rounded-full object-cover shrink-0"
                                                />
                                              ) : (
                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                  <span className="text-sm font-semibold text-primary">
                                                    {(emp.fullName || emp.name || "?")[0]}
                                                  </span>
                                                </div>
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                  {emp.fullName || emp.name || "-"}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  {posName && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                      <Briefcase size={10} className="shrink-0" />
                                                      <span className="truncate">{posName}</span>
                                                    </span>
                                                  )}
                                                  {deptName && (
                                                    <span className="text-xs text-muted-foreground truncate">
                                                      {deptName}
                                                    </span>
                                                  )}
                                                </div>
                                                {conflicts.length > 0 && (
                                                  <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                                                    <AlertTriangle size={10} className="shrink-0" />
                                                    <span>
                                                      {t("page.shift.add.conflictHint", {
                                                        name: conflict.shiftName,
                                                        start: conflict.startTime,
                                                        end: conflict.endTime
                                                      })}
                                                      {conflicts.length > 1
                                                        ? ` +${conflicts.length - 1}`
                                                        : ""}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                              {isSelected && (
                                                <Check
                                                  size={14}
                                                  className="text-primary shrink-0"
                                                />
                                              )}
                                            </label>
                                          );
                                        })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <div
                      className={`flex items-center justify-between p-4 rounded-lg ${
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
                            {field.value ? "Aktif" : "Tidak Aktif"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {field.value
                              ? "Shift ini aktif dan dapat digunakan."
                              : "Shift ini tidak aktif."}
                          </p>
                        </div>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="danger"
                  onClick={requestLeave}
                  className="gap-2 w-full sm:w-auto justify-center">
                  <X size={18} /> {t("breadcrumb.back")}
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Button
                    type="button"
                    variant="draft"
                    onClick={() => setDraftModal(true)}
                    disabled={createMutation.isLoading}
                    className="gap-2 w-full sm:w-auto justify-center">
                    <Save size={18} /> {t("common.saveAsDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    disabled={createMutation.isLoading}
                    onClick={() => {
                      const values = form.getValues();
                      const fields = getMissingFields(values, formSchema, fieldLabels);
                      if (fields.length > 0) {
                        setMissingFieldsList(fields);
                        setMissingFieldsModal(true);
                        return;
                      }
                      const conflictingEmployees = getConflictingEmployees(values);
                      if (conflictingEmployees.length > 0) {
                        showConflictError(conflictingEmployees);
                        return;
                      }
                      setConfirmSaveModal(true);
                    }}
                    className="gap-2 w-full sm:w-auto justify-center">
                    <Save size={18} />
                    {createMutation.isLoading ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </Card>
      )}

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
        type="success"
        open={successModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-shift?id=${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("page.shift.edit.modal.successTitle")}
        description={t("page.shift.edit.modal.successDesc")}
        confirmText={t("page.shift.edit.modal.successConfirm")}
        onConfirm={() => setTimeout(() => navigate("/shift-list"), 150)}
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
          handleSave(values, true);
        }}
      />
      {createMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}
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
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title={t("modal.saveTitle")}
        description={t("modal.saveDescription")}
        confirmText={t("modal.yesSave")}
        onConfirm={() => {
          setConfirmSaveModal(false);
          onSubmit(form.getValues());
        }}
      />
      <Modal
        type="confirm"
        open={storeRemoveModal}
        onOpenChange={setStoreRemoveModal}
        title="Hapus Karyawan dari Toko?"
        description="Beberapa karyawan yang sudah dipilih akan dihapus karena toko tidak lagi dipilih. Lanjutkan?"
        confirmText="Ya, Lanjutkan"
        onConfirm={confirmStoreRemove}
      />
    </div>
  );
};

export default AddShift;

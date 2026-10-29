import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueries, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Save,
  Check,
  Users,
  Search,
  Briefcase,
  Store,
  AlertTriangle,
  Wand2
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { useTranslation } from "react-i18next";
import { getAllShift, editShift } from "@/services/shift";
import { getAllEmployee } from "@/services/employee";
import { getAllShiftTemplate } from "@/services/shiftTemplate";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import AbortController from "@/components/organism/abort-controller";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";

const EditShift = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isSuperAdmin, user } = useStore();
  const [searchParams] = useSearchParams();
  const shiftId = searchParams.get("id");

  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
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
    store: isSuperAdmin ? z.array(z.number()).optional() : z.string().optional(),
    jam_mulai: z.string().min(1, t("page.shift.edit.validation.jamMulai")),
    jam_selesai: z.string().min(1, t("page.shift.edit.validation.jamSelesai")),
    karyawan: z.array(z.any()).optional(),
    status: z.boolean().default(true)
  });

  const fieldLabels = {
    nama_shift: "Nama Shift",
    store: "Penempatan Toko",
    jam_mulai: "Jam Mulai",
    jam_selesai: "Jam Selesai",
    karyawan: "Karyawan",
    status: "Status"
  };

  const {
    data: shiftsData,
    isLoading,
    isError,
    refetch
  } = useQuery(["shifts"], () => getAllShift({ store: "", page: 1, limit: 100, statusShift: "" }), {
    enabled: !!shiftId
  });

  const { data: locationsData, isLoading: locLoading } = useLocations();
  const locations = locationsData?.data || locationsData?.locations || [];

  const shifts = shiftsData?.data || [];
  const shift =
    shifts.find(
      (item) => String(item.id) === String(shiftId) || String(item._id) === String(shiftId)
    ) || {};

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_shift: "",
      store: isSuperAdmin ? [] : "",
      jam_mulai: "",
      jam_selesai: "",
      karyawan: [],
      status: true
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/shift-list",
    () => setCancelModal(true),
    form
  );

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
      queryKey: ["employees-for-shift-edit", storeId],
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

  const { data: allShiftsData } = useQuery(["shifts-for-conflict-edit"], () =>
    getAllShift({ store: "", page: 1, limit: 1000, statusShift: "" })
  );
  const employeeShiftMap = useMemo(() => {
    const map = {};
    const shifts = allShiftsData?.data || [];
    shifts.forEach((shift) => {
      (shift.karyawan || []).forEach((empId) => {
        if (!map[empId]) {
          map[empId] = {
            shiftId: shift.id,
            shiftName: shift.nama_shift,
            startTime: shift.jam_mulai?.slice(0, 5),
            endTime: shift.jam_selesai?.slice(0, 5),
            storeId: shift.store
          };
        }
      });
    });
    return map;
  }, [allShiftsData]);

  const { data: templatesData } = useQuery(["shift-templates-dropdown"], () =>
    getAllShiftTemplate()
  );
  const templates = templatesData?.data || [];
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const selectedEmployees = form.watch("karyawan") || [];

  useEffect(() => {
    if (shift?.id || shift?._id) {
      const storeValue = isSuperAdmin
        ? shift.store
          ? [Number(shift.store)]
          : []
        : shift.store || "";
      form.reset({
        nama_shift: shift.nama_shift || "",
        store: storeValue,
        jam_mulai: shift.jam_mulai || "",
        jam_selesai: shift.jam_selesai || "",
        karyawan:
          shift.karyawan?.map((k) =>
            typeof k === "object" && k !== null ? k : { id: k, name: undefined }
          ) || [],
        status: shift.status === 1 || shift.status === true || shift.status === "active"
      });

      const matched = templates.find(
        (tmpl) =>
          tmpl.name === (shift.nama_shift || "") &&
          String(tmpl.startTime).slice(0, 5) === String(shift.jam_mulai || "").slice(0, 5) &&
          String(tmpl.endTime).slice(0, 5) === String(shift.jam_selesai || "").slice(0, 5)
      );
      setSelectedTemplate(matched ? String(matched.id) : "");
    }
  }, [shift, form, isSuperAdmin, templates]);

  const updateMutation = useMutation(editShift, {
    onSuccess: () => {
      queryClient.invalidateQueries(["shifts"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.shift.edit.toast.errorDesc")
      );
      setErrorModal(true);
    }
  });

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

  const handleSave = (values, saveAsDraft = false) => {
    const { status, store, karyawan, ...rest } = values;
    const storeValue = isSuperAdmin
      ? allStores
        ? []
        : Array.isArray(store)
          ? store
          : [store]
      : store;
    updateMutation.mutate({
      id: shiftId,
      ...rest,
      store: storeValue,
      karyawan: karyawan?.map((k) => k.id) || [],
      status: saveAsDraft ? "draft" : status ? "active" : "inactive"
    });
  };

  const onSubmit = (values) => handleSave(values, false);

  if (isError) return <AbortController refetch={refetch} />;
  if (!shiftId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.shift.edit.noId")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div />
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
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-32" />
          </div>
        </Card>
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
            label: t("page.shift.edit.breadcrumb.list"),
            href: "/shift-list",
            i18nKey: "page.shift.edit.breadcrumb.list"
          },
          {
            label: t("page.shift.edit.breadcrumb.edit"),
            i18nKey: "page.shift.edit.breadcrumb.edit"
          }
        ]}
        title={t("page.shift.edit.title")}
        description={t("page.shift.edit.subtitle")}
        backLink="/shift-list"
        onBack={requestLeave}>
        <UserGuide guideKey="add-shift" mode="edit" />
        <Button variant="outline" onClick={requestLeave}>
          {t("action.back")}
        </Button>
      </PageHeader>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* StoreSelectCard - paling atas */}
            {isSuperAdmin && (
              <StoreSelectCard
                locations={locations}
                selectedStores={selectedStores}
                onChange={handleStoreChange}
                isSuperAdmin={isSuperAdmin}
                user={user}
                t={t}
                title={t("header.selectStore")}
                description={t("page.shift.ui.selectTheStoreWhereThis")}
                noStoreLabel="Belum ada toko"
                addStoreLabel="Tambah Toko"
                storeInfoLabel="Toko:"
                allStores={allStores}
                onAllStoresChange={setAllStores}
                navigate={navigate}
                mandatory={false}
                locationsLoading={locLoading}
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

            {/* Nama Shift */}
            <FormField
              control={form.control}
              name="nama_shift"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("page.shift.edit.form.namaShift")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <Input
                    placeholder={t("page.shift.edit.form.namaShiftPlaceholder")}
                    {...field}
                    maxLength={FIELD_LIMITS.SHORT_LABEL}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pilih Karyawan */}
            <FormField
              control={form.control}
              name="karyawan"
              render={() => (
                <FormItem>
                  <FormLabel>{t("page.shift.swap.chooseCoworker")}</FormLabel>
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
                                  .map((emp) => {
                                    const empData = storeEmps.find(
                                      (e) => (e.id || e._id) === emp.id
                                    );
                                    const empName =
                                      empData?.fullName || empData?.name || emp.name || "";
                                    return (
                                      <span
                                        key={emp.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                        <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold">
                                          {(empName || "?")[0]}
                                        </span>
                                        {empName}
                                        <button
                                          aria-label={t("common.delete")}
                                          type="button"
                                          onClick={() => toggleEmployee(emp)}
                                          className="hover:text-destructive">
                                          <X size={12} />
                                        </button>
                                      </span>
                                    );
                                  })}
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
                                      placeholder={t("page.shift.ui.searchNameOrPosition")}
                                      className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                  {storeEmps.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 p-6 text-center">
                                      <Users size={24} className="text-muted-foreground/40" />
                                      <p className="text-xs text-muted-foreground">
                                        {t("page.shift.ui.noEmployeesInThisStore")}
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
                                          (e) => e.id === empId
                                        );
                                        const hasShift = employeeShiftMap[empId];
                                        const isDisabled = !!hasShift;
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
                                              {isDisabled && hasShift && (
                                                <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                                                  <AlertTriangle size={10} className="shrink-0" />
                                                  <span>
                                                    {t("page.shift.ui.alreadyHasAShift")}{" "}
                                                    {hasShift.shiftName} ({hasShift.startTime}-
                                                    {hasShift.endTime})
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            {isSelected && (
                                              <Check size={14} className="text-primary shrink-0" />
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
                          {field.value
                            ? t("page.shift.edit.form.active")
                            : t("page.shift.edit.form.inactive")}
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
                <X size={18} />
                {t("page.shift.edit.cancel")}
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  type="button"
                  variant="draft"
                  onClick={() => setDraftModal(true)}
                  disabled={updateMutation.isLoading}
                  className="gap-2 w-full sm:w-auto justify-center">
                  <Save size={18} />
                  {t("page.shift.edit.saveDraft")}
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    const fields = getMissingFields(form.getValues(), formSchema, fieldLabels);
                    if (fields.length > 0) {
                      setMissingFieldsList(fields);
                      setMissingFieldsModal(true);
                      return;
                    }
                    setConfirmSaveModal(true);
                  }}
                  disabled={updateMutation.isLoading}
                  className="gap-2 w-full sm:w-auto justify-center">
                  <Save size={18} />
                  {updateMutation.isLoading
                    ? t("page.shift.edit.saving")
                    : t("page.shift.edit.save")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </Card>

      {updateMutation.isLoading && (
        <Loading fullscreen size="lg" label={t("page.shift.edit.saving")} />
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
        title={t("page.shift.edit.modal.draftTitle")}
        description={t("page.shift.edit.modal.draftDesc")}
        confirmText={t("page.shift.edit.modal.draftConfirm")}
        onConfirm={() => {
          setDraftModal(false);
          const values = form.getValues();
          handleSave(values, true);
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
        title={t("page.shift.ui.removeEmployeesFromTheStore")}
        description={t("page.shift.ui.someSelectedEmployeesWillBe")}
        confirmText="Ya, Lanjutkan"
        onConfirm={confirmStoreRemove}
      />
    </div>
  );
};

export default EditShift;

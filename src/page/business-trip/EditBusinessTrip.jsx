import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X, Plus, Trash2, Building2, User, Wallet, Plane, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { getBusinessTripById, editBusinessTrip } from "@/services/business-trip";
import { getAllEmployee } from "@/services/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CurrencyInput from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useDomDirtyTracking } from "@/hooks/useDomDirtyTracking";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { useUnsavedChangesGuard } from "@/contexts/UnsavedChangesContext";

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const SectionHeader = ({ icon: Icon, title, desc, from, to }) => (
  <div className={`bg-gradient-to-r ${from} ${to} px-6 py-4`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-xs text-white/80">{desc}</p>
      </div>
    </div>
  </div>
);

const EditBusinessTrip = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dirtyRef = useDomDirtyTracking();
  const { registerDirty, markAllClean } = useUnsavedChangesGuard();
  const rhfDirtyId = React.useId();
  const id = new URLSearchParams(window.location.search).get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [pendingEmployeeId, setPendingEmployeeId] = useState("");
  const [storeChange, setStoreChange] = useState(null);
  const [deleteBudgetIndex, setDeleteBudgetIndex] = useState(null);
  const [deleteEmployeeIndex, setDeleteEmployeeIndex] = useState(null);

  const { data, isLoading } = useQuery(["business-trip-edit", id], () => getBusinessTripById(id), {
    enabled: !!id
  });
  const trip = data?.data;

  const schema = z
    .object({
      store: z.string().min(1, t("page.businessTrip.add.form.required")),
      employees: z
        .array(
          z.object({
            employeeId: z.string().optional(),
            employeeName: z.string().optional(),
            employeePosition: z.string().optional()
          })
        )
        .min(1, t("page.businessTrip.add.form.atLeastOneEmployee")),
      budget: z.union([z.string(), z.number()]).optional(),
      budgetItems: z
        .array(
          z.object({
            komponen: z.string().optional(),
            qty: z.union([z.string(), z.number()]).optional(),
            satuan: z.string().optional(),
            tarif: z.union([z.string(), z.number()]).optional(),
            total: z.union([z.string(), z.number()]).optional(),
            catatan: z.string().optional()
          })
        )
        .optional(),
      destination: z.string().min(1, t("common.validation")),
      tripPurpose: z.string().optional(),
      departureDate: z.date().optional(),
      returnDate: z.date().optional(),
      notes: z.string().optional()
    })
    .refine((d) => !d.departureDate || !d.returnDate || d.returnDate >= d.departureDate, {
      path: ["returnDate"],
      message: t("common.validation")
    });

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    values: trip
      ? {
          store: trip.store ? String(trip.store) : "",
          employees: (trip.employees?.length ? trip.employees : []).map((e) => ({
            employeeId: e.employeeId != null ? String(e.employeeId) : "",
            employeeName: e.employeeUser?.fullName || e.employeeName || "",
            employeePosition: e.employeePosition || ""
          })),
          budget: trip.budget != null ? String(trip.budget) : "",
          budgetItems: (trip.budgetItems?.length ? trip.budgetItems : []).map((b) => ({
            komponen: b.komponen || "",
            qty: b.qty != null ? String(b.qty) : "",
            satuan: b.satuan || "",
            tarif: b.tarif != null ? String(b.tarif) : "",
            total: b.total != null ? String(b.total) : "",
            catatan: b.catatan || ""
          })),
          destination: trip.destination || "",
          tripPurpose: trip.tripPurpose || "",
          departureDate: toDate(trip.departureDate),
          returnDate: toDate(trip.returnDate),
          notes: trip.notes || ""
        }
      : undefined,
    defaultValues: {
      store: "",
      employees: [],
      budget: "",
      budgetItems: [],
      destination: "",
      tripPurpose: "",
      departureDate: null,
      returnDate: null,
      notes: ""
    }
  });

  const {
    control,
    formState: { errors },
    handleSubmit,
    getValues,
    watch,
    trigger
  } = form;

  const employeeFields = useFieldArray({ control, name: "employees" });
  const budgetFields = useFieldArray({ control, name: "budgetItems" });

  const { request: requestLeave } = useFormExit("/business-trip", () => setCancelModal(true), form);

  React.useEffect(() => {
    registerDirty(rhfDirtyId, form.formState.isDirty);
    return () => registerDirty(rhfDirtyId, false);
  }, [registerDirty, rhfDirtyId, form.formState.isDirty]);

  const cancelAndLeave = () => {
    markAllClean();
    setCancelModal(false);
    setTimeout(() => navigate("/business-trip"), 150);
  };

  const departDate = watch("departureDate");
  const selectedStore = watch("store");
  const budgetVal = watch("budget");
  const items = watch("budgetItems");

  const { data: locationsData, isLoading: locationsLoading } = useLocations("active", {
    staleTime: 30000
  });
  const locations = locationsData?.data || [];

  const { data: employeesData, isLoading: employeesLoading } = useQuery(
    ["business-trip-employees", selectedStore],
    () => getAllEmployee({ limit: 999, status: "active", location: selectedStore || undefined }),
    {
      enabled: !!selectedStore,
      staleTime: 30000
    }
  );
  const employees = employeesData?.data || [];

  useEffect(() => {
    if (!selectedStore) setPendingEmployeeId("");
  }, [selectedStore]);

  const addedEmployeeIds = new Set(employeeFields.fields.map((f) => String(f.employeeId)));
  const availableEmployees = employees.filter((e) => !addedEmployeeIds.has(String(e.id)));

  const addEmployee = () => {
    const emp = employees.find((e) => String(e.id) === String(pendingEmployeeId));
    if (!emp) return;
    if (addedEmployeeIds.has(String(emp.id))) {
      setPendingEmployeeId("");
      return;
    }
    employeeFields.append({
      employeeId: String(emp.id),
      employeeName: emp.fullName || emp.userName || "",
      employeePosition:
        emp.positionData?.name ||
        emp.position?.namePosition ||
        emp.position?.name ||
        emp.positionName ||
        ""
    });
    setPendingEmployeeId("");
  };

  const addBudgetItem = () => {
    budgetFields.append({ komponen: "", qty: "", satuan: "", tarif: "", total: "", catatan: "" });
  };

  const itemTotal = (i) => {
    const item = (items || [])[i];
    if (!item) return 0;
    return Number(item.qty || 0) * Number(item.tarif || 0);
  };

  const breakdownSum = (items || []).reduce(
    (s, it) => s + Number(it.qty || 0) * Number(it.tarif || 0),
    0
  );
  const declaredBudgetNum = Number(budgetVal || 0);
  const hasItems = (items || []).some((it) => String(it.komponen || "").trim() !== "");
  const showBudgetWarning = declaredBudgetNum > 0 && hasItems && breakdownSum !== declaredBudgetNum;
  const budgetDiff = declaredBudgetNum - breakdownSum;
  const fmtMoney = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

  const doSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payloadEmployees = data.employees.map((e) => ({
        employeeId: e.employeeId ? Number(e.employeeId) : null,
        employeeName: e.employeeName || "",
        employeePosition: e.employeePosition || ""
      }));
      const payloadBudgetItems = (data.budgetItems || []).map((b) => {
        const qty = b.qty ? Number(b.qty) : 0;
        const tarif = b.tarif ? Number(b.tarif) : 0;
        return {
          komponen: b.komponen || "",
          qty,
          satuan: b.satuan || "",
          tarif,
          total: qty * tarif,
          catatan: b.catatan || ""
        };
      });

      await editBusinessTrip(id, {
        store: data.store ? Number(data.store) : null,
        employees: payloadEmployees,
        budgetItems: payloadBudgetItems,
        destination: data.destination,
        tripPurpose: data.tripPurpose,
        departureDate: data.departureDate ? format(data.departureDate, "yyyy-MM-dd") : null,
        returnDate: data.returnDate ? format(data.returnDate, "yyyy-MM-dd") : null,
        budget: data.budget ? Number(data.budget) : null,
        notes: data.notes
      });
      queryClient.invalidateQueries(["business-trips"]);
      queryClient.invalidateQueries(["business-trip-edit", id]);
      markAllClean();
      setSuccessModal(true);
    } catch (err) {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <div ref={dirtyRef} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("page.businessTrip.list.title"),
              href: "/business-trip",
              i18nKey: "page.businessTrip.list.title"
            },
            { label: t("page.businessTrip.edit.title") }
          ]}
          title={t("page.businessTrip.edit.title")}
          onBack={requestLeave}
          dynamicInfo={false}>
          <UserGuide guideKey="add-business-trip" mode="edit" />
        </PageHeader>

        <form onSubmit={handleSubmit((data) => doSubmit(data))} className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-md rounded-xl">
            <SectionHeader
              icon={Plane}
              title={t("page.businessTrip.add.infoSection")}
              desc={t("page.businessTrip.add.infoSectionDesc")}
              from="from-blue-600/90"
              to="to-blue-700/90"
            />
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <Building2 size={14} className="text-muted-foreground" />
                    {t("page.businessTrip.add.form.store")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="store"
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => {
                          if (v === field.value) return;
                          if (employeeFields.fields.length > 0) {
                            setStoreChange(v);
                            return;
                          }
                          field.onChange(v);
                        }}
                        value={field.value}>
                        <SelectTrigger disabled={locationsLoading}>
                          <SelectValue
                            placeholder={t("page.businessTrip.add.form.storePlaceholder")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={String(loc.id)}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.store && (
                    <p className="text-xs text-destructive">{errors.store.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">
                    {t("page.businessTrip.detail.destination")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register("destination")}
                    placeholder={t("page.businessTrip.add.form.destination")}
                    maxLength={FIELD_LIMITS.BUSINESS_NAME}
                  />
                  {errors.destination && (
                    <p className="text-xs text-destructive">{errors.destination.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t("page.businessTrip.add.form.tripPurpose")}</Label>
                  <Input
                    {...form.register("tripPurpose")}
                    placeholder={t("page.businessTrip.add.form.tripPurpose")}
                    maxLength={FIELD_LIMITS.SHORT_NOTE}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">
                    {t("page.businessTrip.add.form.departureDate")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="departureDate"
                    render={({ field }) => (
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                        placeholder={t("page.businessTrip.add.form.departureDate")}
                      />
                    )}
                  />
                  {errors.departureDate && (
                    <p className="text-xs text-destructive">{errors.departureDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">
                    {t("page.businessTrip.add.form.returnDate")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="returnDate"
                    render={({ field }) => (
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                        placeholder={t("page.businessTrip.add.form.returnDate")}
                        minDate={departDate || undefined}
                      />
                    )}
                  />
                  {errors.returnDate && (
                    <p className="text-xs text-destructive">{errors.returnDate.message}</p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm">{t("page.businessTrip.add.form.notes")}</Label>
                  <Textarea
                    rows={3}
                    {...form.register("notes")}
                    placeholder={t("page.businessTrip.add.form.notes")}
                    className="min-h-[72px] resize-none"
                    maxLength={FIELD_LIMITS.DESCRIPTION}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="employees">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employees" className="gap-1.5 flex-1">
                <User size={14} />
                {t("page.businessTrip.add.form.tabEmployees")}
              </TabsTrigger>
              <TabsTrigger value="expenses" className="gap-1.5 flex-1">
                <Wallet size={14} />
                {t("page.businessTrip.add.form.tabExpenses")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employees" className="mt-2 space-y-4">
              <Card className="overflow-hidden border-0 shadow-md rounded-xl">
                <SectionHeader
                  icon={User}
                  title={t("page.businessTrip.add.employeeSection")}
                  desc={t("page.businessTrip.add.employeeSectionDesc")}
                  from="from-blue-600/90"
                  to="to-blue-700/90"
                />
                <div className="p-4 sm:p-6">
                  {!selectedStore ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <User size={22} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {t("page.businessTrip.add.form.selectStoreFirst")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                        {t("page.businessTrip.add.employeeSectionDesc")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {errors.employees && (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                          <span className="text-xs text-destructive font-medium">
                            {errors.employees.message}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 min-w-[220px]">
                          <Select onValueChange={setPendingEmployeeId} value={pendingEmployeeId}>
                            <SelectTrigger disabled={employeesLoading}>
                              <SelectValue
                                placeholder={t("page.businessTrip.add.form.employeePlaceholder")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableEmployees.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-muted-foreground">
                                  {t("page.businessTrip.add.form.noEmployee")}
                                </div>
                              ) : (
                                availableEmployees.map((e) => (
                                  <SelectItem key={e.id} value={String(e.id)}>
                                    {e.fullName || e.userName || `#${e.id}`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="success"
                          onClick={addEmployee}
                          disabled={!pendingEmployeeId}
                          className="gap-1.5 shrink-0">
                          <Plus size={14} />
                          {t("page.businessTrip.add.form.addEmployee")}
                        </Button>
                      </div>

                      {employeeFields.fields.length > 0 && (
                        <HorizontalScrollArea className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-sm min-w-[520px]">
                            <thead>
                              <tr className="border-b bg-muted/40">
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs w-10">
                                  #
                                </th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                                  {t("page.businessTrip.add.table.name")}
                                </th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                                  {t("page.businessTrip.add.table.position")}
                                </th>
                                <th className="w-10" />
                              </tr>
                            </thead>
                            <tbody>
                              {employeeFields.fields.map((f, i) => (
                                <tr key={f.id} className="border-b border-muted/20">
                                  <td className="px-3 py-2 text-muted-foreground text-xs">
                                    {i + 1}
                                  </td>
                                  <td className="px-3 py-2 font-medium">
                                    {employeeFields.fields[i]?.employeeName || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {employeeFields.fields[i]?.employeePosition || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setDeleteEmployeeIndex(i)}
                                      className="text-muted-foreground/40 hover:text-destructive transition-colors"
                                      aria-label={t("common.delete")}>
                                      <Trash2 size={15} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </HorizontalScrollArea>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="mt-2 space-y-4">
              <Card className="overflow-hidden border-0 shadow-md rounded-xl">
                <SectionHeader
                  icon={Wallet}
                  title={t("page.businessTrip.add.rabSection")}
                  desc={t("page.businessTrip.add.rabSectionDesc")}
                  from="from-emerald-600/90"
                  to="to-emerald-700/90"
                />
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">{t("page.businessTrip.rab.cashAdvance")}</Label>
                      <Controller
                        control={control}
                        name="budget"
                        render={({ field }) => (
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="0"
                          />
                        )}
                      />
                    </div>
                    <div className="flex items-end justify-end text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("page.businessTrip.add.form.budgetSum")}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-foreground">
                          {fmtMoney(breakdownSum)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <HorizontalScrollArea className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm min-w-[760px]">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                            {t("page.businessTrip.rab.komponen")}
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                            {t("page.businessTrip.rab.qty")}
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">
                            {t("page.businessTrip.rab.satuan")}
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                            {t("page.businessTrip.rab.tarif")}
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">
                            {t("page.businessTrip.rab.total")}
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">
                            {t("page.businessTrip.rab.catatan")}
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {budgetFields.fields.map((f, i) => (
                          <tr key={f.id} className="border-b border-muted/20">
                            <td className="px-3 py-2 min-w-[180px]">
                              <Input
                                placeholder={t("page.businessTrip.add.form.componentPlaceholder")}
                                {...form.register(`budgetItems.${i}.komponen`)}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                className="h-8 text-xs text-center w-20 mx-auto"
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                {...form.register(`budgetItems.${i}.qty`, {
                                  setValueAs: (v) => (v === "" ? "" : v)
                                })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-center">
                                <Input
                                  className="h-8 text-xs text-center w-24"
                                  placeholder={t("page.businessTrip.add.form.unitPlaceholder")}
                                  {...form.register(`budgetItems.${i}.satuan`)}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end">
                                <Controller
                                  control={control}
                                  name={`budgetItems.${i}.tarif`}
                                  render={({ field }) => (
                                    <CurrencyInput
                                      value={field.value}
                                      onChange={field.onChange}
                                      placeholder="0"
                                      className="h-8 text-xs text-right w-36"
                                    />
                                  )}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-foreground">
                                  {fmtMoney(itemTotal(i))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {Number(items?.[i]?.qty || 0)} x{" "}
                                  {fmtMoney(Number(items?.[i]?.tarif || 0))}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                className="h-8 text-xs"
                                placeholder={t("page.businessTrip.rab.catatan")}
                                {...form.register(`budgetItems.${i}.catatan`)}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setDeleteBudgetIndex(i)}
                                className="text-muted-foreground/40 hover:text-destructive transition-colors"
                                aria-label={t("common.delete")}>
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>

                  {budgetFields.fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-lg border border-dashed border-border">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Wallet size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {t("page.businessTrip.add.form.budgetBreakdown")}
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={addBudgetItem}
                    className="gap-1">
                    <Plus size={14} />
                    {t("page.businessTrip.add.form.addBudgetItem")}
                  </Button>

                  {showBudgetWarning && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      {t("page.businessTrip.add.form.budgetWarning", {
                        sum: fmtMoney(breakdownSum),
                        budget: fmtMoney(declaredBudgetNum),
                        diff: fmtMoney(Math.abs(budgetDiff))
                      })}
                    </p>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button
              type="button"
              variant="danger"
              className="w-full sm:w-auto justify-center"
              onClick={requestLeave}>
              <X size={16} className="mr-1" /> {t("page.businessTrip.add.form.cancel")}
            </Button>
            <Button
              variant="success"
              type="button"
              className="w-full sm:w-auto justify-center"
              disabled={isSubmitting}
              onClick={async () => {
                const ok = await trigger();
                if (!ok) return;
                setConfirmModal(true);
              }}>
              <Save size={16} className="mr-1" /> {t("page.businessTrip.edit.save")}
            </Button>
          </div>
        </form>

        {isSubmitting && <Loading fullscreen size="lg" label={t("page.businessTrip.edit.save")} />}

        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={(o) => !o && setCancelModal(false)}
          title={t("page.businessTrip.add.form.cancel")}
          description={t("page.businessTrip.add.form.cancel")}
          confirmText={t("common.yes")}
          onConfirm={cancelAndLeave}
        />
        <Modal
          type="confirm"
          open={!!storeChange}
          onOpenChange={(o) => {
            if (!o) setStoreChange(null);
          }}
          title={t("page.businessTrip.add.form.storeChangeTitle")}
          description={t("page.businessTrip.add.form.storeChangeDesc")}
          confirmText={t("common.yes")}
          cancelText={t("common.no")}
          onConfirm={() => {
            if (storeChange) {
              form.setValue("store", storeChange);
              employeeFields.replace([]);
              setPendingEmployeeId("");
            }
            setStoreChange(null);
          }}
        />
        <Modal
          type="confirm"
          open={deleteBudgetIndex !== null}
          onOpenChange={(o) => {
            if (!o) setDeleteBudgetIndex(null);
          }}
          title={t("page.businessTrip.rab.deleteTitle")}
          description={t("page.businessTrip.rab.deleteDesc", {
            name: items?.[deleteBudgetIndex]?.komponen || ""
          })}
          confirmText={t("common.yes")}
          cancelText={t("common.no")}
          onConfirm={() => {
            if (deleteBudgetIndex !== null) {
              budgetFields.remove(deleteBudgetIndex);
            }
            setDeleteBudgetIndex(null);
          }}
        />
        <Modal
          type="confirm"
          open={deleteEmployeeIndex !== null}
          onOpenChange={(o) => {
            if (!o) setDeleteEmployeeIndex(null);
          }}
          title={t("page.businessTrip.add.form.deleteEmployeeTitle")}
          description={t("page.businessTrip.add.form.deleteEmployeeDesc", {
            name: employeeFields.fields[deleteEmployeeIndex]?.employeeName || ""
          })}
          confirmText={t("common.yes")}
          cancelText={t("common.no")}
          onConfirm={() => {
            if (deleteEmployeeIndex !== null) {
              employeeFields.remove(deleteEmployeeIndex);
            }
            setDeleteEmployeeIndex(null);
          }}
        />
        <Modal
          type="confirm"
          open={confirmModal}
          onOpenChange={setConfirmModal}
          title={t("page.businessTrip.edit.title")}
          description={t("page.businessTrip.edit.title")}
          confirmText={t("common.confirm")}
          onConfirm={() => {
            setConfirmModal(false);
            doSubmit(getValues());
          }}
        />
        <Modal
          type="success"
          open={successModal}
          onOpenChange={setSuccessModal}
          title={t("page.businessTrip.edit.title")}
          description={t("common.success")}
          onConfirm={() => setTimeout(() => navigate("/business-trip"), 150)}
        />
        <Modal
          type="error"
          open={errorModal}
          onOpenChange={setErrorModal}
          title={t("common.error")}
          description={modalMessage}
          onConfirm={() => setErrorModal(false)}
        />
      </div>
    </>
  );
};

export default EditBusinessTrip;

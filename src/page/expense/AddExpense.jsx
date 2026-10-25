import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCookies } from "react-cookie";
import { X, Save, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { parseSalary } from "@/lib/utils";
import { addExpense, bulkAddExpenses, getExpenseCategories } from "@/services/expense";
import { getAllEmployee } from "@/services/employee";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Modal from "@/components/organism/modal";
import StoreSelectCard from "@/components/organism/StoreSelectCard";
import EmployeeSalaryPanel from "@/components/organism/EmployeeSalaryPanel";
import { useTranslation } from "react-i18next";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { isSalaryCategoryName } from "@/lib/salary-category";
import {
  buildSalaryExpensePayloads,
  buildSingleExpensePayload,
  createExpenses
} from "@/lib/expense-payload";
import { normalizePayload } from "@/lib/payload-normalizer";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const SectionHeader = ({ step, title, description }) => (
  <div className="flex items-center gap-3 pt-1">
    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
      {step}
    </span>
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  </div>
);

const AddExpense = () => {
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const store = user?.store || "";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [draftModal, setDraftModal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [selectedStore, setSelectedStore] = useState([]);
  const [allStores, setAllStores] = useState(false);
  const [selectedSalaryIds, setSelectedSalaryIds] = useState([]);
  const [salaryBasis, setSalaryBasis] = useState("monthly");
  const [expenseMode, setExpenseMode] = useState("single");

  const role = user?.roleType || "";
  const isSuperAdmin = role === "super_admin";

  const expenseFieldLabels = useMemo(
    () => ({
      categoryId: t("page.expense.add.category"),
      description: t("page.expense.add.description"),
      amount: t("page.expense.add.amount"),
      date: t("page.expense.add.date"),
      employeeId: t("page.expense.form.salary.employee")
    }),
    [t]
  );

  const {
    data: locationsData,
    isLoading: locsLoading,
    isFetching: locsFetching
  } = useLocations("active", { enabled: isSuperAdmin });
  const locations = locationsData?.data || locationsData?.locations || [];

  const {
    data: categoriesData,
    isLoading,
    isFetching
  } = useQuery(["expense-categories", store], () => getExpenseCategories(store || undefined));
  const categories = (categoriesData?.data || categoriesData || []).filter(
    (cat) => cat.status === "active"
  );

  const { data: employeesData, isLoading: employeesLoading } = useQuery(["expense-employees"], () =>
    getAllEmployee({ page: 1, limit: 100, status: "active" })
  );
  const employees = (employeesData?.data || employeesData?.employees || []).filter((emp) => {
    if (!isSuperAdmin) return true;
    if (allStores) return true;
    const storeId = Number(selectedStore[0] || 0);
    return !storeId || Number(emp.store) === storeId;
  });

  const formSchema = useMemo(
    () =>
      z.object({
        categoryId: z.string().min(1, t("page.expense.add.validation.categoryRequired")),
        description: z.string().min(1, t("page.expense.add.validation.descriptionRequired")),
        amount: z.coerce.number().min(1, t("page.expense.add.validation.amountRequired")),
        date: z.date({ required_error: t("page.expense.add.validation.dateRequired") }),
        notes: z.string().optional().or(z.literal("")),
        payee: z.string().optional().or(z.literal("")),
        employeeId: z.string().optional().or(z.literal("")),
        paymentMethod: z.enum(["cash", "bank", "e-wallet"]).default("cash"),
        store: z.string().optional(),
        frequency: z.enum(["once", "daily", "weekly", "monthly", "yearly"]).default("once"),
        recurringEndDate: z.date().optional().nullable()
      }),
    [t]
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      categoryId: "",
      description: "",
      amount: "",
      date: new Date(),
      notes: "",
      payee: "",
      employeeId: "",
      paymentMethod: "cash",
      store: "",
      frequency: "once",
      recurringEndDate: undefined,
      items: [{ categoryId: "", description: "", amount: "", payee: "" }]
    }
  });

  const watchedCategoryId = form.watch("categoryId");
  const watchedFrequency = form.watch("frequency");
  const watchedItems = form.watch("items");

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem
  } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const isMultiMode = expenseMode === "multi";

  const multiTotal = useMemo(() => {
    if (!isMultiMode) return 0;
    return (watchedItems || []).reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  }, [isMultiMode, watchedItems]);

  const handleModeSwitch = (newMode) => {
    if (newMode === expenseMode) return;
    if (newMode === "multi") {
      const vals = form.getValues();
      const hasSingleData = vals.categoryId || vals.description || vals.amount;
      if (hasSingleData) {
        appendItem({
          categoryId: vals.categoryId || "",
          description: vals.description || "",
          amount: vals.amount || "",
          payee: vals.payee || ""
        });
      }
    } else {
      const items = form.getValues("items") || [];
      const first = items[0] || {};
      if (first.categoryId) form.setValue("categoryId", first.categoryId);
      if (first.description) form.setValue("description", first.description);
      if (first.amount) form.setValue("amount", first.amount);
      if (first.payee) form.setValue("payee", first.payee);
    }
    setExpenseMode(newMode);
  };
  const selectedCategory = categories.find((cat) => String(cat.id) === String(watchedCategoryId));
  const isSalary = isSalaryCategoryName(selectedCategory?.name);

  const [isSaving, setIsSaving] = useState(false);
  const salaryOf = (emp) =>
    salaryBasis === "daily" ? parseSalary(emp.dailySalary) : parseSalary(emp.monthlySalary);
  const selectedSalaryEmps = employees.filter((e) => selectedSalaryIds.includes(String(e.id)));
  const totalSalary = selectedSalaryEmps.reduce((sum, e) => sum + salaryOf(e), 0);
  const hasNoSalaryEmps = selectedSalaryEmps.some((e) => salaryOf(e) <= 0);

  useEffect(() => {
    if (!isSalary || selectedSalaryEmps.length === 0) {
      if (!isSalary && selectedSalaryIds.length > 0) setSelectedSalaryIds([]);
      form.clearErrors(["employeeId", "amount"]);
      return;
    }
    const nextPayee = selectedSalaryEmps
      .map((e) => e.fullName)
      .filter(Boolean)
      .join(", ");
    const nextDescription = t("page.expense.form.salary.descriptionPrefix");
    if (form.getValues("payee") !== nextPayee) form.setValue("payee", nextPayee);
    if (form.getValues("description") !== nextDescription)
      form.setValue("description", nextDescription);
    if (form.getValues("frequency") !== "monthly") form.setValue("frequency", "monthly");
    if (Number(form.getValues("amount")) !== totalSalary) form.setValue("amount", totalSalary);
    if (hasNoSalaryEmps) {
      form.setError("amount", { message: t("page.expense.form.salary.employeeNoSalary") });
    } else {
      form.clearErrors("amount");
    }
  }, [isSalary, selectedSalaryIds, salaryBasis, totalSalary]);

  const handleToggleSalaryEmployee = (empId) => {
    setSelectedSalaryIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
    form.clearErrors("employeeId");
  };

  const handleToggleAllSalary = () => {
    setSelectedSalaryIds((prev) =>
      prev.length === employees.length ? [] : employees.map((e) => String(e.id))
    );
    form.clearErrors("employeeId");
  };

  const validateBeforeSave = () => {
    const data = form.getValues();
    if (isMultiMode) {
      const validItems = (data.items || []).filter(
        (it) => it.categoryId || it.description || it.amount
      );
      if (validItems.length === 0) {
        setMissingFields([t("page.expense.add.multi.empty")]);
        setMissingFieldsModal(true);
        return false;
      }
      const invalidRows = validItems.filter(
        (it) => !it.categoryId || !it.amount || Number(it.amount) <= 0
      );
      if (invalidRows.length > 0) {
        setMissingFields([
          t("page.expense.add.validation.categoryRequired"),
          t("page.expense.add.validation.amountRequired")
        ]);
        setMissingFieldsModal(true);
        return false;
      }
      if (isSalary && selectedSalaryEmps.length === 0) {
        form.setError("employeeId", {
          message: t("page.expense.form.salary.employeeRequired")
        });
        setMissingFields([expenseFieldLabels.employeeId]);
        setMissingFieldsModal(true);
        return false;
      }
      return true;
    }
    const missing = getMissingFields(data, formSchema, expenseFieldLabels);
    if (isSalary && selectedSalaryEmps.length === 0) {
      form.setError("employeeId", { message: t("page.expense.form.salary.employeeRequired") });
      missing.push(expenseFieldLabels.employeeId);
    }
    if (isSalary && hasNoSalaryEmps) {
      form.setError("amount", { message: t("page.expense.form.salary.employeeNoSalary") });
      missing.push(expenseFieldLabels.amount);
    }
    if (missing.length > 0) {
      setMissingFields([...new Set(missing)]);
      setMissingFieldsModal(true);
      return false;
    }
    return true;
  };

  const onSubmit = (values, saveAsDraft = false) => {
    if (isSuperAdmin && !allStores && selectedStore.length === 0 && !saveAsDraft) {
      form.setError("store", { message: t("page.expense.add.validation.storeRequired") });
      return;
    }
    form.clearErrors("store");
    const storeValue = isSuperAdmin
      ? allStores
        ? ""
        : selectedStore[0] || ""
      : cookie?.user?.store || "";
    const base = {
      store: storeValue ? Number(storeValue) : null,
      date: values.date ? format(values.date, "yyyy-MM-dd") : "",
      status: saveAsDraft ? "draft" : "pending",
      frequency: values.frequency || "once",
      paymentMethod: values.paymentMethod || "cash",
      recurringEndDate: values.recurringEndDate ? format(values.recurringEndDate, "yyyy-MM-dd") : ""
    };
    let payloads;
    if (isMultiMode) {
      const validItems = (values.items || []).filter(
        (it) => it.categoryId && it.amount && Number(it.amount) > 0
      );
      payloads = validItems.map((item) =>
        normalizePayload(
          {
            ...base,
            categoryId: item.categoryId,
            description: item.description || "",
            amount: Number(item.amount),
            payee: item.payee || "",
            notes: values.notes || ""
          },
          { isFormData: false }
        )
      );
    } else if (isSalary) {
      payloads = buildSalaryExpensePayloads({ base, values, selectedSalaryEmps, salaryOf });
    } else {
      payloads = [buildSingleExpensePayload({ base, values })];
    }
    setIsSaving(true);
    createExpenses({ payloads, singleCreate: addExpense, bulkCreate: bulkAddExpenses })
      .then(() => {
        queryClient.invalidateQueries(["expenses"]);
        setSuccessModal(true);
      })
      .catch((err) => {
        setModalMessage(
          err?.response?.data?.message ||
            err.message ||
            t("page.expense.add.toast.errorDescription")
        );
        setErrorModal(true);
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <div>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            {
              label: t("breadcrumb.management"),
              href: "/expense",
              i18nKey: "breadcrumb.management"
            },
            { label: t("breadcrumb.add") }
          ]}
          title={t("page.expense.add.title")}
          description={t("page.expense.add.description")}
          onBack={() => setCancelModal(true)}
          dynamicInfo={false}>
          <UserGuide guideKey="add-expense" />
        </PageHeader>

        <Card className="p-6">
          {isLoading || isFetching || (isSuperAdmin && locsLoading) ? (
            <div className="space-y-6">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg md:col-span-2" />
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                          title={t("page.expense.form.storeSection.title")}
                          description={t("page.expense.form.storeSection.desc")}
                          noStoreLabel={t("page.expense.form.storeSection.noStore")}
                          addStoreLabel={t("page.expense.form.storeSection.addStore")}
                          storeInfoLabel={t("page.expense.form.storeInfo")}
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

                {!isSalary && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("page.expense.add.title")}:
                    </span>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleModeSwitch("single")}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          !isMultiMode
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}>
                        {t("page.expense.add.mode.single")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeSwitch("multi")}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-l border-border ${
                          isMultiMode
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}>
                        {t("page.expense.add.mode.multi")}
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {isMultiMode
                        ? t("page.expense.add.mode.multiHint")
                        : t("page.expense.add.mode.singleHint")}
                    </span>
                  </div>
                )}

                {isMultiMode && !isSalary ? (
                  <div className="space-y-6 pt-2">
                    <SectionHeader
                      step={1}
                      title={t("page.expense.form.section.detailTitle")}
                      description={t("page.expense.add.mode.multiHint")}
                    />
                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("page.expense.add.date")}{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <DatePicker date={field.value} setDate={field.onChange} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.expense.form.paymentMethod")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("page.expense.form.paymentMethodPlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">
                                  {t("page.expense.form.paymentMethodCash")}
                                </SelectItem>
                                <SelectItem value="bank">
                                  {t("page.expense.form.paymentMethodBank")}
                                </SelectItem>
                                <SelectItem value="e-wallet">
                                  {t("page.expense.form.paymentMethodEWallet")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.expense.form.frequency")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("page.expense.form.frequencyPlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="once">
                                  {t("page.expense.form.frequencyOnce")}
                                </SelectItem>
                                <SelectItem value="daily">
                                  {t("page.expense.form.frequencyDaily")}
                                </SelectItem>
                                <SelectItem value="weekly">
                                  {t("page.expense.form.frequencyWeekly")}
                                </SelectItem>
                                <SelectItem value="monthly">
                                  {t("page.expense.form.frequencyMonthly")}
                                </SelectItem>
                                <SelectItem value="yearly">
                                  {t("page.expense.form.frequencyYearly")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {watchedFrequency !== "once" && (
                        <FormField
                          control={form.control}
                          name="recurringEndDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.expense.form.recurringEndDate")}</FormLabel>
                              <DatePicker date={field.value} setDate={field.onChange} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <HorizontalScrollArea>
                        <table className="w-full text-sm min-w-[640px]">
                          <thead>
                            <tr className="bg-muted/40 border-b">
                              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                {t("page.expense.add.category")} *
                              </th>
                              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                {t("page.expense.form.description")}
                              </th>
                              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                {t("page.expense.add.amount")} *
                              </th>
                              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                {t("page.expense.form.payee")}
                              </th>
                              <th className="px-3 py-2.5 w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {itemFields.map((field, idx) => {
                              const item = (watchedItems || []).at(idx) || {};
                              return (
                                <tr key={field.id} className="border-b border-muted/20">
                                  <td className="px-3 py-2">
                                    <Select
                                      value={item.categoryId || ""}
                                      onValueChange={(val) =>
                                        form.setValue(`items.${idx}.categoryId`, val)
                                      }>
                                      <SelectTrigger className="h-9">
                                        <SelectValue
                                          placeholder={t("page.expense.add.categoryPlaceholder")}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categories.length === 0 ? (
                                          <SelectItem value="__none" disabled>
                                            {t("page.expense.add.noCategories")}
                                          </SelectItem>
                                        ) : (
                                          categories.map((cat) => (
                                            <SelectItem
                                              key={cat.id || cat._id}
                                              value={String(cat.id || cat._id)}>
                                              {cat.name}
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      className="h-9"
                                      placeholder={t("page.expense.add.descriptionPlaceholder")}
                                      value={item.description || ""}
                                      onChange={(e) =>
                                        form.setValue(`items.${idx}.description`, e.target.value)
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                                        Rp
                                      </span>
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        className="h-9 pl-10"
                                        placeholder="0"
                                        value={
                                          item.amount
                                            ? Number(item.amount).toLocaleString("id-ID")
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const raw = e.target.value.replace(/[^0-9]/g, "");
                                          form.setValue(
                                            `items.${idx}.amount`,
                                            raw ? Number(raw) : ""
                                          );
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      className="h-9"
                                      placeholder={t("page.expense.form.payeePlaceholder")}
                                      value={item.payee || ""}
                                      onChange={(e) =>
                                        form.setValue(`items.${idx}.payee`, e.target.value)
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (itemFields.length > 1) removeItem(idx);
                                      }}
                                      disabled={itemFields.length <= 1}
                                      className="text-muted-foreground/30 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed">
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </HorizontalScrollArea>
                      <div className="p-3 border-t flex items-center justify-between">
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          onClick={() =>
                            appendItem({
                              categoryId: "",
                              description: "",
                              amount: "",
                              payee: ""
                            })
                          }
                          className="gap-1.5">
                          <Plus size={14} />
                          {t("page.expense.add.multi.addRow")}
                        </Button>
                        <div className="text-sm font-semibold">
                          {t("page.expense.add.multi.total")}:
                          <span className="ml-2 text-foreground">
                            Rp {multiTotal.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <SectionHeader
                      step={2}
                      title={t("page.expense.form.section.additionalTitle")}
                      description={t("page.expense.form.section.additionalDesc")}
                    />
                    <Separator />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("page.expense.add.notes")}</FormLabel>
                          <Textarea
                            placeholder={t("page.expense.add.notesPlaceholder")}
                            rows={3}
                            {...field}
                            maxLength={FIELD_LIMITS.DESCRIPTION}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <div className="space-y-6 pt-2">
                    <SectionHeader
                      step={1}
                      title={t("page.expense.form.section.detailTitle")}
                      description={t("page.expense.form.section.detailDesc")}
                    />
                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("page.expense.add.category")}{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("page.expense.add.categoryPlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.length === 0 ? (
                                  <SelectItem value="__none" disabled>
                                    {t("page.expense.add.noCategories")}
                                  </SelectItem>
                                ) : (
                                  categories.map((cat) => (
                                    <SelectItem
                                      key={cat.id || cat._id}
                                      value={String(cat.id || cat._id)}>
                                      {cat.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>{t("page.expense.form.categoryHint")}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("page.expense.add.date")}{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <DatePicker date={field.value} setDate={field.onChange} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {isSalary && (
                      <FormField
                        control={form.control}
                        name="employeeId"
                        render={() => (
                          <FormItem>
                            <FormControl>
                              <EmployeeSalaryPanel
                                employees={employees}
                                selectedIds={selectedSalaryIds}
                                onToggle={handleToggleSalaryEmployee}
                                onToggleAll={handleToggleAllSalary}
                                salaryBasis={salaryBasis}
                                onSalaryBasisChange={setSalaryBasis}
                                t={t}
                                loading={employeesLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("page.expense.add.description")}{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <Input
                              placeholder={
                                isSalary
                                  ? t("page.expense.form.salary.descriptionPlaceholder")
                                  : t("page.expense.add.descriptionPlaceholder")
                              }
                              disabled={isSalary}
                              {...field}
                              maxLength={FIELD_LIMITS.SHORT_NOTE}
                            />
                            {isSalary && (
                              <FormDescription>
                                {t("page.expense.form.salary.descriptionHint")}
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("page.expense.add.amount")}{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                                Rp
                              </span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                className="pl-10"
                                disabled={isSalary}
                                value={
                                  field.value ? Number(field.value).toLocaleString("id-ID") : ""
                                }
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  field.onChange(raw ? Number(raw) : "");
                                }}
                              />
                            </div>
                            {isSalary && (
                              <FormDescription>
                                {t("page.expense.form.salary.amountHint")}
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <SectionHeader
                      step={2}
                      title={t("page.expense.form.section.paymentTitle")}
                      description={t("page.expense.form.section.paymentDesc")}
                    />
                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.expense.form.paymentMethod")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("page.expense.form.paymentMethodPlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">
                                  {t("page.expense.form.paymentMethodCash")}
                                </SelectItem>
                                <SelectItem value="bank">
                                  {t("page.expense.form.paymentMethodBank")}
                                </SelectItem>
                                <SelectItem value="e-wallet">
                                  {t("page.expense.form.paymentMethodEWallet")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t("page.expense.form.paymentMethodHint")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.expense.form.frequency")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isSalary}>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("page.expense.form.frequencyPlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="once">
                                  {t("page.expense.form.frequencyOnce")}
                                </SelectItem>
                                <SelectItem value="daily">
                                  {t("page.expense.form.frequencyDaily")}
                                </SelectItem>
                                <SelectItem value="weekly">
                                  {t("page.expense.form.frequencyWeekly")}
                                </SelectItem>
                                <SelectItem value="monthly">
                                  {t("page.expense.form.frequencyMonthly")}
                                </SelectItem>
                                <SelectItem value="yearly">
                                  {t("page.expense.form.frequencyYearly")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t("page.expense.form.frequencyHint")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="payee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("page.expense.form.payee")}</FormLabel>
                            <Input
                              placeholder={t("page.expense.form.payeePlaceholder")}
                              disabled={isSalary}
                              {...field}
                              maxLength={FIELD_LIMITS.BUSINESS_NAME}
                            />
                            <FormDescription>{t("page.expense.form.payeeHint")}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {watchedFrequency !== "once" && (
                        <FormField
                          control={form.control}
                          name="recurringEndDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.expense.form.recurringEndDate")}</FormLabel>
                              <DatePicker date={field.value} setDate={field.onChange} />
                              <FormDescription>
                                {t("page.expense.form.recurringEndDateHint")}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      {!isSalary && (
                        <FormField
                          control={form.control}
                          name="employeeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("page.expense.form.employee")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("page.expense.form.employeePlaceholder")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {employees.length === 0 ? (
                                    <SelectItem value="__none" disabled>
                                      {t("page.expense.form.employeeEmpty")}
                                    </SelectItem>
                                  ) : (
                                    employees.map((emp) => (
                                      <SelectItem key={emp.id} value={String(emp.id)}>
                                        {emp.fullName}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                {t("page.expense.form.employeeHint")}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <SectionHeader
                      step={3}
                      title={t("page.expense.form.section.additionalTitle")}
                      description={t("page.expense.form.section.additionalDesc")}
                    />
                    <Separator />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("page.expense.add.notes")}</FormLabel>
                          <Textarea
                            placeholder={t("page.expense.add.notesPlaceholder")}
                            rows={3}
                            {...field}
                            maxLength={FIELD_LIMITS.DESCRIPTION}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
                  <Button
                    variant="danger"
                    onClick={() => setCancelModal(true)}
                    className="gap-2 w-full sm:w-auto justify-center">
                    <X size={18} />
                    {t("common.cancel")}
                  </Button>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <Button
                      type="button"
                      variant="draft"
                      className="w-full sm:w-auto justify-center"
                      onClick={() => setDraftModal(true)}
                      disabled={isSaving}>
                      {t("page.expense.add.saveAsDraft")}
                    </Button>
                    <Button
                      variant="success"
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (validateBeforeSave()) setSaveConfirm(true);
                      }}
                      className="gap-2 w-full sm:w-auto justify-center">
                      <Save size={18} />
                      {isSaving ? t("button.saving") : t("button.save")}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </Card>

        <Modal
          type="confirm"
          open={cancelModal}
          onOpenChange={setCancelModal}
          title={t("modal.cancelTitle")}
          description={t("modal.cancelDescription")}
          confirmText={t("modal.yesCancel")}
          onConfirm={() => setTimeout(() => navigate("/expense"), 150)}
        />
        <Modal
          type="success"
          open={successModal}
          onOpenChange={setSuccessModal}
          title={t("page.expense.add.successTitle")}
          description={
            isSalary
              ? t("page.expense.form.salary.successDescription", {
                  count: selectedSalaryIds.length
                })
              : isMultiMode
                ? t("page.expense.add.multi.successDescription", {
                    count: (form.getValues("items") || []).filter(
                      (it) => it.categoryId && it.amount
                    ).length
                  })
                : t("page.expense.add.successDescription")
          }
          confirmText={t("page.expense.add.successConfirm")}
          onConfirm={() => setTimeout(() => navigate("/expense"), 150)}
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
          title={t("page.expense.add.draftTitle")}
          description={t("page.expense.add.draftDescription")}
          confirmText={t("page.expense.add.draftConfirm")}
          onConfirm={() => {
            setDraftModal(false);
            const values = form.getValues();
            onSubmit(values, true);
          }}
        />
        <Modal
          type="confirm"
          open={saveConfirm}
          onOpenChange={setSaveConfirm}
          title={t("common.confirmSave")}
          description={t("common.confirmSaveDesc")}
          confirmText={t("common.yesSave")}
          onConfirm={() => {
            setSaveConfirm(false);
            onSubmit(form.getValues(), false);
          }}
        />
        <MissingFieldsModal
          open={missingFieldsModal}
          onOpenChange={setMissingFieldsModal}
          fields={missingFields}
        />
        {isSaving && <Loading fullscreen size="lg" label={t("button.saving")} />}
      </div>
    </div>
  );
};

export default AddExpense;

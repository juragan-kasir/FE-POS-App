import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { X, Save } from "lucide-react";
import { normalizePayload } from "@/lib/payload-normalizer";
import { parseSalary } from "@/lib/utils";
import { getExpenseById, editExpense, getExpenseCategories } from "@/services/expense";
import { getAllEmployee } from "@/services/employee";
import { Button } from "@/components/ui/button";

import { Form } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";

import { getMissingFields } from "@/lib/validation";

import { format } from "date-fns";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { isSalaryCategoryName } from "@/lib/salary-category";
import ExpenseDetailFields from "./ExpenseDetailFields";

import { useFormExit } from "@/hooks/useLeaveGuard";

const EditExpense = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [cookie] = useCookies();
  const user = cookie?.user;
  const store = user?.store || "";
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [draftModal, setDraftModal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [selectedSalaryIds, setSelectedSalaryIds] = useState([]);
  const [salaryBasis, setSalaryBasis] = useState("monthly");

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
        frequency: z.enum(["once", "daily", "weekly", "monthly", "yearly"]).default("once"),
        recurringEndDate: z.date().optional().nullable()
      }),
    [t]
  );

  const expenseFieldLabels = useMemo(
    () => ({
      categoryId: t("page.expense.edit.categoryLabel"),
      description: t("page.expense.edit.descriptionLabel"),
      amount: t("page.expense.edit.amountLabel"),
      date: t("page.expense.edit.dateLabel"),
      employeeId: t("page.expense.form.salary.employee")
    }),
    [t]
  );

  const {
    data: expenseData,
    isLoading,
    isError,
    refetch
  } = useQuery(["expense", id], () => getExpenseById(id), { enabled: !!id });

  const expenseItem = expenseData?.data || {};

  const { data: categoriesData } = useQuery(["expense-categories", store], () =>
    getExpenseCategories(store || undefined)
  );
  const categories = (categoriesData?.data || categoriesData || []).filter(
    (cat) =>
      cat.status === "active" ||
      String(cat.id) === String(expenseItem.category ?? expenseItem.categoryData?.id)
  );

  const { data: employeesData, isLoading: employeesLoading } = useQuery(["expense-employees"], () =>
    getAllEmployee({ page: 1, limit: 100, status: "active" })
  );
  const employees = employeesData?.data || employeesData?.employees || [];

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      categoryId: "",
      description: "",
      amount: "",
      date: undefined,
      notes: "",
      payee: "",
      employeeId: "",
      paymentMethod: "cash",
      frequency: "once",
      recurringEndDate: undefined
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/expense",
    () => setCancelModal(true),
    form
  );

  const handledExpenseId = useRef(null);

  useEffect(() => {
    const id = expenseItem?.id ? String(expenseItem.id) : null;
    if (!id || handledExpenseId.current === id) return;
    handledExpenseId.current = id;
    const existingEmployee = expenseItem.employeeId ? String(expenseItem.employeeId) : "";
    if (existingEmployee) setSelectedSalaryIds([existingEmployee]);
    form.reset({
      categoryId: String(expenseItem.category ?? expenseItem.categoryData?.id ?? ""),
      description: expenseItem.description || "",
      amount: expenseItem.amount ?? "",
      date: expenseItem.date ? new Date(expenseItem.date) : undefined,
      notes: expenseItem.notes || "",
      payee: expenseItem.payee || "",
      employeeId: expenseItem.employeeId ? String(expenseItem.employeeId) : "",
      paymentMethod: expenseItem.paymentMethod || "cash",
      frequency: expenseItem.frequency || "once",
      recurringEndDate: expenseItem.recurringEndDate
        ? new Date(expenseItem.recurringEndDate)
        : undefined
    });
  }, [expenseItem, form]);

  const watchedCategoryId = form.watch("categoryId");
  const selectedCategory = categories.find((cat) => String(cat.id) === String(watchedCategoryId));
  const isSalary = isSalaryCategoryName(selectedCategory?.name);

  const updateMutation = useMutation(editExpense, {
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.expense.edit.failDesc")
      );
      setErrorModal(true);
    }
  });
  const salaryOf = (emp) =>
    salaryBasis === "daily" ? parseSalary(emp.dailySalary) : parseSalary(emp.monthlySalary);
  const selectedSalaryEmps = employees.filter((e) => selectedSalaryIds.includes(String(e.id)));
  const totalSalary = selectedSalaryEmps.reduce((sum, e) => sum + salaryOf(e), 0);
  const hasNoSalaryEmps = selectedSalaryEmps.some((e) => salaryOf(e) <= 0);

  useEffect(() => {
    if (!isSalary || selectedSalaryEmps.length === 0) {
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
    if (Number(form.getValues("amount")) !== totalSalary)
      form.setValue("amount", totalSalary, { shouldValidate: true });
    if (hasNoSalaryEmps) {
      form.setError("amount", { message: t("page.expense.form.salary.employeeNoSalary") });
    } else {
      form.clearErrors("amount");
    }
  }, [isSalary, selectedSalaryIds, salaryBasis, totalSalary]);

  const handleToggleSalaryEmployee = (empId) => {
    setSelectedSalaryIds((prev) => (prev.includes(empId) ? [] : [empId]));
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
    const data = {
      id,
      ...values,
      store: cookie?.user?.store || "",
      date: values.date ? format(values.date, "yyyy-MM-dd") : "",
      status: saveAsDraft ? "draft" : "pending",
      frequency: values.frequency || "once",
      payee: values.payee || "",
      employeeId: selectedSalaryEmps[0]
        ? String(selectedSalaryEmps[0].id)
        : values.employeeId || "",
      paymentMethod: values.paymentMethod || "cash",
      recurringEndDate: values.recurringEndDate ? format(values.recurringEndDate, "yyyy-MM-dd") : ""
    };
    const payload = normalizePayload(data, { isFormData: false });
    updateMutation.mutate(payload);
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.expense.edit.idNotFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return <Loading fullscreen size="lg" label={t("page.expense.edit.loading")} />;
  }

  if (!expenseItem?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.expense.edit.notFound")}</p>
      </div>
    );
  }

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
            { label: t("breadcrumb.edit"), i18nKey: "breadcrumb.edit" }
          ]}
          title={t("page.expense.edit.title")}
          description={t("page.expense.edit.description")}
          backLink="/expense"
          onBack={requestLeave}>
          <UserGuide guideKey="add-expense" mode="edit" />
        </PageHeader>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <ExpenseDetailFields
                form={form}
                categories={categories}
                isSalary={isSalary}
                employees={employees}
                employeesLoading={employeesLoading}
                selectedSalaryIds={selectedSalaryIds}
                salaryBasis={salaryBasis}
                setSalaryBasis={setSalaryBasis}
                handleToggleSalaryEmployee={handleToggleSalaryEmployee}
                handleToggleAllSalary={handleToggleAllSalary}
                singleEmployee
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
                <Button
                  variant="outline"
                  onClick={requestLeave}
                  className="gap-2 w-full sm:w-auto justify-center">
                  <X size={18} />
                  {t("page.expense.edit.cancel")}
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Button
                    type="button"
                    variant="draft"
                    className="w-full sm:w-auto justify-center"
                    onClick={() => setDraftModal(true)}
                    disabled={updateMutation.isLoading}>
                    {t("page.expense.edit.saveDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    disabled={updateMutation.isLoading}
                    onClick={() => {
                      if (validateBeforeSave()) setSaveConfirm(true);
                    }}
                    className="gap-2 w-full sm:w-auto justify-center">
                    <Save size={18} />
                    {updateMutation.isLoading
                      ? t("page.expense.edit.saving")
                      : t("page.expense.edit.save")}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </Card>

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
          title={t("page.expense.edit.modalSuccessTitle")}
          description={t("page.expense.edit.modalSuccessDesc")}
          confirmText={t("page.expense.edit.modalSuccessConfirm")}
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
          title={t("page.expense.edit.modalDraftTitle")}
          description={t("page.expense.edit.modalDraftDesc")}
          confirmText={t("page.expense.edit.modalDraftConfirm")}
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
      </div>
    </div>
  );
};

export default EditExpense;

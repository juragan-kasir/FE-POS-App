import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save, Check } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { useCookies } from "react-cookie";
import { addExpenseCategory } from "@/services/expense";
import { getAccounts } from "@/services/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loading } from "@/components/ui/loading";
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
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { useTranslation } from "react-i18next";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const AddExpenseCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const store = user?.store || "";
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [draftModal, setDraftModal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const { data: accountsData } = useQuery(
    ["accounts", store],
    () => getAccounts(store || undefined),
    {
      staleTime: 300000
    }
  );
  const accounts = accountsData?.data || [];
  const expenseAccounts = accounts.filter((acc) => acc.type === "expense");

  const accountOptions = useMemo(() => {
    const opts = expenseAccounts.map((acc) => ({
      value: String(acc.code),
      label: `${acc.code} - ${acc.name}`
    }));
    if (!expenseAccounts.some((acc) => String(acc.code) === "6000")) {
      opts.push({ value: "6000", label: "6000 - Operating Expenses" });
    }
    return opts;
  }, [expenseAccounts]);

  const expenseCategoryFieldLabels = useMemo(
    () => ({
      name: t("page.expenseCategory.add.name"),
      description: t("page.expenseCategory.add.description")
    }),
    [t]
  );

  const formSchema = z.object({
    name: z.string().min(1, t("page.expenseCategory.add.validation.nameRequired")),
    description: z.string().optional().or(z.literal("")),
    accountCode: z.string().optional().or(z.literal("")),
    isActive: z.boolean()
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      accountCode: "",
      isActive: true
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/expense-category",
    () => setCancelModal(true),
    form
  );

  const createMutation = useMutation(addExpenseCategory, {
    onSuccess: (res) => {
      setCreatedRecordId(createdId(res));
      queryClient.invalidateQueries(["expense-categories"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message ||
          err.message ||
          t("page.expenseCategory.add.toast.errorDescription")
      );
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    createMutation.mutate({
      name: values.name,
      description: values.description,
      accountCode: values.accountCode || "",
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    });
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
              label: t("page.expenseCategory.list.title"),
              href: "/expense-category",
              i18nKey: "page.expenseCategory.list.title"
            },
            { label: t("breadcrumb.add") }
          ]}
          title={t("page.expenseCategory.add.title")}
          description={t("page.expenseCategory.add.description")}
          onBack={requestLeave}
          dynamicInfo={false}>
          <UserGuide guideKey="add-expense-category" />
        </PageHeader>
        <LoadErrorBanner />

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("page.expenseCategory.add.name")}{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Input
                        placeholder={t("page.expenseCategory.add.namePlaceholder")}
                        {...field}
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
                      <FormLabel>{t("page.expenseCategory.add.description")}</FormLabel>
                      <Textarea
                        placeholder={t("page.expenseCategory.add.descriptionPlaceholder")}
                        rows={3}
                        {...field}
                        maxLength={FIELD_LIMITS.DESCRIPTION}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("page.expenseCategory.form.accountCode")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("page.expenseCategory.form.accountCodePlaceholder")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none" disabled>
                            {t("page.expenseCategory.form.accountCodePlaceholder")}
                          </SelectItem>
                          {accountOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t("page.expenseCategory.form.accountCodeHint")}
                      </FormDescription>
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
                            {field.value ? t("common.active") : t("common.inactive")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {field.value
                              ? "Kategori aktif dan dapat digunakan"
                              : "Kategori tidak aktif"}
                          </p>
                        </div>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
                <Button
                  variant="outline"
                  onClick={requestLeave}
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
                    disabled={createMutation.isLoading}>
                    {t("page.expenseCategory.add.saveAsDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    disabled={createMutation.isLoading}
                    onClick={() => {
                      const data = form.getValues();
                      const missing = getMissingFields(
                        data,
                        formSchema,
                        expenseCategoryFieldLabels
                      );
                      if (missing.length > 0) {
                        setMissingFields(missing);
                        setMissingFieldsModal(true);
                        return;
                      }
                      setSaveConfirm(true);
                    }}
                    className="gap-2 w-full sm:w-auto justify-center">
                    <Save size={18} />
                    {createMutation.isLoading ? t("button.saving") : t("button.save")}
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
          secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
          onSecondary={() => navigate(`/detail-expense-category?id=${createdRecordId}`)}
          onOpenChange={setSuccessModal}
          title={t("page.expenseCategory.add.successTitle")}
          description={t("page.expenseCategory.add.successDescription")}
          confirmText={t("page.expenseCategory.add.successConfirm")}
          onConfirm={() => setTimeout(() => navigate("/expense-category"), 150)}
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
          title={t("page.expenseCategory.add.draftTitle")}
          description={t("page.expenseCategory.add.draftDescription")}
          confirmText={t("page.expenseCategory.add.draftConfirm")}
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
        {createMutation.isLoading && <Loading fullscreen size="lg" label={t("button.saving")} />}
      </div>
    </div>
  );
};

export default AddExpenseCategory;

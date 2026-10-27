import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";
import { X, Save, Check } from "lucide-react";
import { getExpenseCategories, editExpenseCategory } from "@/services/expense";
import { getAccounts } from "@/services/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Loading } from "@/components/ui/loading";
import Modal from "@/components/organism/modal";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const EditExpenseCategory = () => {
  const { t } = useTranslation();
  const formSchema = z.object({
    name: z.string().min(1, t("page.expenseCategory.add.validation.nameRequired")),
    description: z.string().optional().or(z.literal("")),
    accountCode: z.string().optional().or(z.literal("")),
    isActive: z.boolean()
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const store = user?.store || "";
  const id = searchParams.get("id");
  const [cancelModal, setCancelModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const expenseCategoryFieldLabels = useMemo(
    () => ({
      name: t("page.expenseCategory.edit.nameLabel"),
      description: t("page.expenseCategory.edit.descriptionLabel")
    }),
    [t]
  );

  const { data, isLoading, isError, refetch } = useQuery(
    ["expense-categories", store],
    () => getExpenseCategories(store || undefined),
    {
      enabled: !!id
    }
  );

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

  const categoryItem = useMemo(() => {
    if (!data) return {};
    const list = data?.data || data || [];
    return list.find((item) => String(item.id) === id || String(item._id) === id) || {};
  }, [data, id]);

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

  useEffect(() => {
    if (categoryItem?.id) {
      form.reset({
        name: categoryItem.name || "",
        description: categoryItem.description || "",
        accountCode: categoryItem.accountCode || "",
        isActive: categoryItem.status === "active"
      });
    }
  }, [categoryItem, form]);

  const updateMutation = useMutation(editExpenseCategory, {
    onSuccess: () => {
      queryClient.invalidateQueries(["expense-categories"]);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(
        err?.response?.data?.message || err.message || t("page.expenseCategory.edit.failDesc")
      );
      setErrorModal(true);
    }
  });

  const onSubmit = (values, saveAsDraft = false) => {
    updateMutation.mutate({
      id,
      name: values.name,
      description: values.description,
      accountCode: values.accountCode || "",
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    });
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.expenseCategory.edit.idNotFound")}</p>
      </div>
    );
  }

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return <Loading fullscreen size="lg" label={t("page.expenseCategory.edit.loading")} />;
  }

  if (!categoryItem?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("page.expenseCategory.edit.categoryNotFound")}</p>
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
              label: t("page.expenseCategory.list.title"),
              href: "/expense-category",
              i18nKey: "page.expenseCategory.list.title"
            },
            { label: t("breadcrumb.edit"), i18nKey: "breadcrumb.edit" }
          ]}
          title={t("page.expenseCategory.edit.title")}
          description={t("page.expenseCategory.edit.description")}
          backLink="/expense-category"
          onBack={requestLeave}>
          <UserGuide guideKey="add-expense-category" mode="edit" />
        </PageHeader>

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
                        {t("page.expenseCategory.edit.nameLabel")}{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Input
                        placeholder={t("page.expenseCategory.edit.namePlaceholder")}
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
                      <FormLabel>{t("page.expenseCategory.edit.descriptionLabel")}</FormLabel>
                      <Textarea
                        placeholder={t("page.expenseCategory.edit.descriptionPlaceholder")}
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
                  variant="danger"
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
                    disabled={updateMutation.isLoading}>
                    {t("page.expenseCategory.add.saveAsDraft")}
                  </Button>
                  <Button
                    variant="success"
                    type="button"
                    disabled={updateMutation.isLoading}
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
                    {updateMutation.isLoading ? t("button.saving") : t("button.save")}
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
          title={t("page.expenseCategory.edit.modalSuccessTitle")}
          description={t("page.expenseCategory.edit.modalSuccessDesc")}
          confirmText={t("page.expenseCategory.edit.modalSuccessConfirm")}
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
          title={t("page.expenseCategory.edit.modalDraftTitle")}
          description={t("page.expenseCategory.edit.modalDraftDesc")}
          confirmText={t("page.expenseCategory.edit.modalDraftConfirm")}
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

export default EditExpenseCategory;

import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import EmployeeSalaryPanel from "@/components/organism/EmployeeSalaryPanel";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

export const SectionHeader = ({ step, title, description }) => (
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

// The fields of one expense (details, payment, additional info), shared by
// Tambah Pengeluaran (single mode) and Edit Pengeluaran. The salary state
// and its rules stay in each page; Edit edits one record, so it picks a
// single employee (singleEmployee).
const ExpenseDetailFields = ({
  form,
  categories,
  isSalary,
  employees,
  employeesLoading,
  selectedSalaryIds,
  salaryBasis,
  setSalaryBasis,
  handleToggleSalaryEmployee,
  handleToggleAllSalary,
  singleEmployee = false
}) => {
  const { t } = useTranslation();
  const watchedFrequency = form.watch("frequency");

  return (
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
                {t("page.expense.edit.categoryLabel")} <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder={t("page.expense.edit.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {t("page.expense.edit.noCategory")}
                    </SelectItem>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat.id || cat._id} value={String(cat.id || cat._id)}>
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
                {t("page.expense.edit.dateLabel")} <span className="text-destructive">*</span>
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
                  singleSelect={singleEmployee}
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
                {t("page.expense.edit.descriptionLabel")}{" "}
                <span className="text-destructive">*</span>
              </FormLabel>
              <Input
                placeholder={
                  isSalary
                    ? t("page.expense.form.salary.descriptionPlaceholder")
                    : t("page.expense.edit.descriptionPlaceholder")
                }
                disabled={isSalary}
                {...field}
                maxLength={FIELD_LIMITS.SHORT_NOTE}
              />
              {isSalary && (
                <FormDescription>{t("page.expense.form.salary.descriptionHint")}</FormDescription>
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
                {t("page.expense.edit.amountLabel")} <span className="text-destructive">*</span>
              </FormLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  Rp
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t("page.expense.edit.amountPlaceholder")}
                  className="pl-10"
                  disabled={isSalary}
                  value={field.value ? Number(field.value).toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    field.onChange(raw ? Number(raw) : "");
                  }}
                />
              </div>
              {isSalary && (
                <FormDescription>{t("page.expense.form.salary.amountHint")}</FormDescription>
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
                  <SelectValue placeholder={t("page.expense.form.paymentMethodPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("page.expense.form.paymentMethodCash")}</SelectItem>
                  <SelectItem value="bank">{t("page.expense.form.paymentMethodBank")}</SelectItem>
                  <SelectItem value="e-wallet">
                    {t("page.expense.form.paymentMethodEWallet")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>{t("page.expense.form.paymentMethodHint")}</FormDescription>
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
              <Select onValueChange={field.onChange} value={field.value} disabled={isSalary}>
                <SelectTrigger>
                  <SelectValue placeholder={t("page.expense.form.frequencyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">{t("page.expense.form.frequencyOnce")}</SelectItem>
                  <SelectItem value="daily">{t("page.expense.form.frequencyDaily")}</SelectItem>
                  <SelectItem value="weekly">{t("page.expense.form.frequencyWeekly")}</SelectItem>
                  <SelectItem value="monthly">{t("page.expense.form.frequencyMonthly")}</SelectItem>
                  <SelectItem value="yearly">{t("page.expense.form.frequencyYearly")}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>{t("page.expense.form.frequencyHint")}</FormDescription>
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
                <FormDescription>{t("page.expense.form.recurringEndDateHint")}</FormDescription>
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
                    <SelectValue placeholder={t("page.expense.form.employeePlaceholder")} />
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
                <FormDescription>{t("page.expense.form.employeeHint")}</FormDescription>
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
            <FormLabel>{t("page.expense.edit.notesLabel")}</FormLabel>
            <Textarea
              placeholder={t("page.expense.edit.notesPlaceholder")}
              rows={3}
              {...field}
              maxLength={FIELD_LIMITS.DESCRIPTION}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

ExpenseDetailFields.propTypes = {
  form: PropTypes.object.isRequired,
  categories: PropTypes.array,
  isSalary: PropTypes.bool,
  employees: PropTypes.array,
  employeesLoading: PropTypes.bool,
  selectedSalaryIds: PropTypes.array,
  salaryBasis: PropTypes.string,
  setSalaryBasis: PropTypes.func,
  handleToggleSalaryEmployee: PropTypes.func,
  handleToggleAllSalary: PropTypes.func,
  singleEmployee: PropTypes.bool
};

export default ExpenseDetailFields;

import React, { useState } from "react";
import {
  Wallet,
  Info,
  ChevronsUpDown,
  X,
  CalendarDays,
  CircleDollarSign,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn, parseSalary } from "@/lib/utils";

const StaticCheck = ({ checked }) => (
  <span
    className={cn(
      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
      checked ? "bg-primary text-primary-foreground" : "bg-background"
    )}>
    {checked && <Check className="h-4 w-4" />}
  </span>
);

const fmtRp = (val) => {
  const n = parseSalary(val);
  return n > 0 ? `Rp ${n.toLocaleString("id-ID")}` : "-";
};

const EmployeeMultiSelect = ({
  employees = [],
  selectedIds = [],
  onToggle,
  onToggleAll,
  salaryOf,
  t,
  loading,
  singleSelect = false
}) => {
  const [open, setOpen] = useState(false);
  const allSelected = employees.length > 0 && selectedIds.length === employees.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={loading}
          className="w-full justify-between font-normal h-10">
          {selectedIds.length > 0 ? (
            <span className="truncate font-medium text-foreground">
              {singleSelect && selectedIds.length === 1
                ? employees.find((e) => String(e.id) === String(selectedIds[0]))?.fullName ||
                  t("page.expense.form.salary.employeeSelected", { count: selectedIds.length })
                : t("page.expense.form.salary.employeeSelected", { count: selectedIds.length })}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t("page.expense.form.salary.employeePlaceholder")}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={t("page.expense.form.salary.employeeSearch")} />
          <CommandList>
            <CommandEmpty>{t("page.expense.form.salary.employeeEmpty")}</CommandEmpty>
            {!singleSelect && employees.length > 0 && (
              <CommandItem
                onSelect={() => onToggleAll()}
                className="cursor-pointer border-b border-border">
                <StaticCheck checked={allSelected} />
                <span className="font-semibold">{t("page.expense.form.salary.selectAll")}</span>
              </CommandItem>
            )}
            <CommandGroup>
              {employees.map((emp) => {
                const id = String(emp.id);
                const isSelected = selectedIds.includes(id);
                const salary = salaryOf(emp);
                return (
                  <CommandItem key={id} onSelect={() => onToggle(id)} className="cursor-pointer">
                    <StaticCheck checked={isSelected} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[emp.positionData?.name, salary > 0 ? fmtRp(salary) : ""]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const EmployeeSalaryPanel = ({
  employees = [],
  selectedIds = [],
  onToggle,
  onToggleAll,
  salaryBasis = "monthly",
  onSalaryBasisChange,
  t,
  loading,
  singleSelect = false
}) => {
  const salaryOf = (emp) =>
    salaryBasis === "daily" ? parseSalary(emp.dailySalary) : parseSalary(emp.monthlySalary);

  const selectedEmps = employees.filter((e) => selectedIds.includes(String(e.id)));
  const total = selectedEmps.reduce((sum, e) => sum + salaryOf(e), 0);
  const allSelected = employees.length > 0 && selectedIds.length === employees.length;

  const basisOptions = [
    { value: "monthly", label: t("page.expense.form.salary.monthlySalary") },
    { value: "daily", label: t("page.expense.form.salary.dailySalary") }
  ];

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Wallet size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">
              {t("page.expense.form.salary.title")}
            </p>
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-primary/15 text-primary">
              {t("page.expense.form.salary.badge")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("page.expense.form.salary.desc")}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-1.5 text-foreground">
          {t("page.expense.form.salary.basisLabel")}
        </p>
        <div className="inline-flex rounded-lg border border-border bg-background p-1 gap-1">
          {basisOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSalaryBasisChange(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                salaryBasis === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {!singleSelect && (
          <button
            type="button"
            onClick={onToggleAll}
            className="w-full flex items-center gap-2.5 p-3 rounded-lg border bg-background transition-colors cursor-pointer hover:border-primary/50 text-left">
            <StaticCheck checked={allSelected} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t("page.expense.form.salary.selectAll")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("page.expense.form.salary.selectAllHint", { count: employees.length })}
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {selectedIds.length > 0
                ? t("page.expense.form.salary.employeeSelected", { count: selectedIds.length })
                : ""}
            </span>
          </button>
        )}

        <EmployeeMultiSelect
          employees={employees}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onToggleAll={onToggleAll}
          salaryOf={salaryOf}
          t={t}
          loading={loading}
          singleSelect={singleSelect}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {t("page.expense.form.salary.employeeHint")}
        </p>
      </div>

      {selectedEmps.length > 0 ? (
        <div className="rounded-lg border border-border bg-background p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <CalendarDays size={14} className="text-muted-foreground" />
              {t("page.expense.form.salary.selectedTitle")}
            </p>
            <span className="text-xs text-muted-foreground">
              {selectedEmps.length} {t("page.expense.form.salary.employee")}
            </span>
          </div>

          <div className="space-y-1.5">
            {selectedEmps.map((emp) => {
              const salary = salaryOf(emp);
              return (
                <div
                  key={emp.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggle(String(emp.id))}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label={emp.fullName}>
                      <X size={14} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.positionData?.name || "—"}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold shrink-0 ${salary > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {salary > 0 ? fmtRp(salary) : t("page.expense.form.salary.noSalary")}
                  </p>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CircleDollarSign size={14} />
              {t("page.expense.form.salary.total")}
            </p>
            <p className="text-base font-bold text-primary">{fmtRp(total)}</p>
          </div>
          {total === 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Info size={12} />
              {t("page.expense.form.salary.noSalaryHint")}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-dashed border-border">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t("page.expense.form.salary.notSelected")}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeSalaryPanel;

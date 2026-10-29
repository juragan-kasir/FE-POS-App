import React, { useState, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Scale,
  TrendingUp,
  TrendingDown,
  Landmark,
  FileText,
  ReceiptText,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Wallet,
  Undo2
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Modal from "@/components/organism/modal";
import AbortController from "@/components/organism/abort-controller";
import NoStore from "@/components/ui/NoStore";
import { DateInput } from "@/components/ui/date-input";
import StoreFilter from "@/components/ui/StoreFilter";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { useGlobalStoreFilter } from "@/hooks/useGlobalStoreFilter";
import { isSuperAdminRole } from "@/utils/role";
import { formatDateOnly, todayDateOnly } from "@/utils/dateOnly";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getJournals,
  createManualJournal,
  deleteJournal,
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
  getAccountingOverview
} from "@/services/accounting";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS, CURRENT_DB_LIMITS } from "@/constants/fieldLimits";
import { dateLocale } from "@/lib/locale";

const formatIDR = (num) => {
  if (num == null || isNaN(num)) return "Rp 0";
  return "Rp " + Number(num).toLocaleString("id-ID");
};

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleString(dateLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

// ponytail: bar filter tanggal + reset dipakai 4 tab (overview/trial/income/
// balance) — diekstrak agar konsisten (saran Codacy PR #23)
function AccountingFilterBar({ label, onReset, disabled, children }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {children}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-10 gap-1.5 shrink-0"
        onClick={onReset}
        disabled={disabled}>
        <CalendarDays size={14} />
        {t("page.accounting.filter.reset")}
      </Button>
    </div>
  );
}

AccountingFilterBar.propTypes = {
  label: PropTypes.node.isRequired,
  onReset: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  children: PropTypes.node
};

const TYPE_BADGE = {
  asset: "bg-blue-100 text-blue-800",
  liability: "bg-amber-100 text-amber-800",
  equity: "bg-purple-100 text-purple-800",
  revenue: "bg-emerald-100 text-emerald-800",
  expense: "bg-rose-100 text-rose-800"
};

const JOURNAL_SOURCES = [
  "order",
  "cogs",
  "purchase",
  "purchase_payment",
  "purchase_return",
  "sales_return",
  "expense",
  "order_reversal",
  "cogs_reversal",
  "manual",
  "manual_reversal"
];

const CardSection = ({ title, children, icon: Icon, className = "" }) => (
  <div className={`bg-card rounded-xl border border-border overflow-hidden ${className}`}>
    <div className="flex items-center gap-2 px-5 pt-4 pb-1">
      {Icon && <Icon size={14} className="text-muted-foreground" />}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
    </div>
    <div className="p-5 pt-2 space-y-1">{children}</div>
  </div>
);

CardSection.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node,
  icon: PropTypes.elementType,
  className: PropTypes.string
};

const AccountForm = ({ form, onChange, initial }) => {
  const { t } = useTranslation();
  const set = (k) => (e) => onChange({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="accounting-page-code"
            className="text-xs font-medium text-muted-foreground">
            {t("page.accounting.accounts.code")}
          </label>
          <Input
            id="accounting-page-code"
            value={form.code}
            onChange={set("code")}
            placeholder="1000"
            disabled={initial?.isSystem}
            maxLength={CURRENT_DB_LIMITS.ACCOUNT_CODE}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="accounting-page-name"
            className="text-xs font-medium text-muted-foreground">
            {t("page.accounting.accounts.name")}
          </label>
          <Input
            id="accounting-page-name"
            value={form.name}
            onChange={set("name")}
            maxLength={FIELD_LIMITS.BUSINESS_NAME}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="accounting-page-type"
            className="text-xs font-medium text-muted-foreground">
            {t("page.accounting.accounts.type")}
          </label>
          <select
            id="accounting-page-type"
            value={form.type}
            onChange={set("type")}
            disabled={initial?.isSystem}
            className="w-full h-10 px-3 rounded-lg bg-accent/50 border border-border/60 text-sm outline-none focus:border-primary/50 transition-colors">
            {["asset", "liability", "equity", "revenue", "expense"].map((ty) => (
              <option key={ty} value={ty}>
                {t(`page.accounting.types.${ty}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="accounting-page-normal-balance"
            className="text-xs font-medium text-muted-foreground">
            {t("page.accounting.accounts.normalBalance")}
          </label>
          <select
            id="accounting-page-normal-balance"
            value={form.normalBalance}
            onChange={set("normalBalance")}
            disabled={initial?.isSystem}
            className="w-full h-10 px-3 rounded-lg bg-accent/50 border border-border/60 text-sm outline-none focus:border-primary/50 transition-colors">
            <option value="debit">{t("page.accounting.accounts.debit")}</option>
            <option value="credit">{t("page.accounting.accounts.credit")}</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="accounting-page-description"
          className="text-xs font-medium text-muted-foreground">
          {t("page.accounting.accounts.description")}
        </label>
        <Input
          id="accounting-page-description"
          value={form.description || ""}
          onChange={set("description")}
        />
      </div>
    </div>
  );
};

AccountForm.propTypes = {
  form: PropTypes.shape({
    code: PropTypes.string,
    name: PropTypes.string,
    type: PropTypes.string,
    normalBalance: PropTypes.string,
    description: PropTypes.string
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  initial: PropTypes.shape({
    code: PropTypes.string,
    name: PropTypes.string,
    type: PropTypes.string,
    normalBalance: PropTypes.string,
    description: PropTypes.string,
    isSystem: PropTypes.bool
  })
};

const AccountsTab = ({ storeId, isAll }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const formRef = useRef(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "asset",
    normalBalance: "debit",
    description: ""
  });

  const { data, isLoading, isError, refetch } = useQuery(
    ["accounting-accounts", storeId || "all"],
    () => getAccounts(storeId),
    {
      enabled: !!storeId || isAll
    }
  );

  const saveMut = useMutation(
    (payload) => {
      const body = { ...payload, store: storeId };
      return editing ? updateAccount(editing.id, body) : createAccount(body);
    },
    {
      onSuccess: () => {
        toast.success(t("page.accounting.toast.saveSuccess"));
        setAdding(false);
        setEditing(null);
        queryClient.invalidateQueries(["accounting-accounts", storeId || "all"]);
      },
      onError: (err) =>
        toast.error(err?.response?.data?.message || t("page.accounting.toast.saveFailed"))
    }
  );

  const deleteMut = useMutation((id) => deleteAccount(id), {
    onSuccess: () => {
      toast.success(t("page.accounting.toast.deleteSuccess"));
      setDeleting(null);
      queryClient.invalidateQueries(["accounting-accounts", storeId || "all"]);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("page.accounting.toast.deleteFailed"))
  });

  const handleSave = (e) => {
    e.preventDefault();
    saveMut.mutate({
      code: form.code,
      name: form.name,
      type: form.type,
      normalBalance: form.normalBalance,
      description: form.description || null
    });
  };

  const openAdd = () => {
    setForm({ code: "", name: "", type: "asset", normalBalance: "debit", description: "" });
    setEditing(null);
    setAdding(true);
  };

  const openEdit = (acc) => {
    setForm({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      normalBalance: acc.normalBalance,
      description: acc.description || ""
    });
    setEditing(acc);
    setAdding(true);
  };

  const submitForm = () => {
    formRef.current?.requestSubmit();
    return false;
  };

  const accounts = data?.data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        String(a.code || "")
          .toLowerCase()
          .includes(q) ||
        String(a.name || "")
          .toLowerCase()
          .includes(q)
    );
  }, [accounts, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("page.accounting.accounts.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("page.accounting.accounts.desc")}</p>
        </div>
        {!isAll && (
          <Button variant="success" size="sm" onClick={openAdd}>
            <Plus size={15} className="mr-1" /> {t("page.accounting.accounts.add")}
          </Button>
        )}
      </div>

      {isAll && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 text-sm text-muted-foreground">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-primary" />
          <p>{t("page.accounting.accounts.consolidatedHint")}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("page.accounting.accounts.searchPlaceholder")}
              className="w-full sm:max-w-xs"
            />
            <span className="text-xs text-muted-foreground">
              {t("page.accounting.accounts.count", { count: filtered.length })}
            </span>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <HorizontalScrollArea>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2.5 sm:px-4 py3 font-semibold align-top">
                      <span className="block">{t("page.accounting.accounts.code")}</span>
                      <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                        {t("page.accounting.accounts.codeHint")}
                      </span>
                    </th>
                    <th className="px-2.5 sm:px-4 py3 font-semibold align-top">
                      <span className="block">{t("page.accounting.accounts.name")}</span>
                      <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                        {t("page.accounting.accounts.nameHint")}
                      </span>
                    </th>
                    <th className="px-2.5 sm:px-4 py3 font-semibold align-top">
                      <span className="block">{t("page.accounting.accounts.type")}</span>
                      <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                        {t("page.accounting.accounts.typeHint")}
                      </span>
                    </th>
                    <th className="px-2.5 sm:px-4 py3 font-semibold align-top">
                      <span className="block">{t("page.accounting.accounts.normalBalance")}</span>
                      <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                        {t("page.accounting.accounts.normalBalanceHint")}
                      </span>
                    </th>
                    <th className="px-2.5 sm:px-4 py3 font-semibold align-top">
                      <span className="block">{t("page.accounting.accounts.description")}</span>
                      <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                        {t("page.accounting.accounts.descriptionHint")}
                      </span>
                    </th>
                    <th className="px-2.5 sm:px-4 py3 font-semibold text-right align-top">
                      <span className="block">{t("page.accounting.accounts.actions")}</span>
                      <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                        {t("page.accounting.accounts.actionsHint")}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2.5 sm:px-4 py4">
                        <EmptyState
                          icon={BookOpen}
                          title={
                            search
                              ? t("page.accounting.accounts.emptySearch")
                              : t("page.accounting.accounts.empty")
                          }
                          className="py-10"
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((acc) => (
                      <tr key={acc.id} className="border-b border-border/40 hover:bg-accent/30">
                        <td className="px-2.5 sm:px-4 py2.5 font-mono text-xs">{acc.code}</td>
                        <td className="px-2.5 sm:px-4 py2.5 font-medium">{acc.name}</td>
                        <td className="px-2.5 sm:px-4 py2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              TYPE_BADGE[acc.type] || "bg-muted text-muted-foreground"
                            }`}>
                            {t(`page.accounting.types.${acc.type}`)}
                          </span>
                        </td>
                        <td className="px-2.5 sm:px-4 py2.5 text-xs text-muted-foreground capitalize">
                          {t(`page.accounting.accounts.${acc.normalBalance}`)}
                        </td>
                        <td className="px-2.5 sm:px-4 py2.5 text-xs text-muted-foreground max-w-[240px]">
                          {acc.description || "-"}
                        </td>
                        <td className="px-2.5 sm:px-4 py2.5 text-right">
                          {!isAll && (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(acc)}
                                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                                title={t("page.accounting.accounts.edit")}>
                                <Pencil size={15} />
                              </button>
                              {!acc.isSystem && (
                                <button
                                  type="button"
                                  onClick={() => setDeleting(acc)}
                                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title={t("page.accounting.accounts.delete")}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </HorizontalScrollArea>
          </div>
        </>
      )}

      <Modal
        open={adding}
        onOpenChange={(o) => {
          setAdding(o);
          if (!o) setEditing(null);
        }}
        type="form"
        title={
          editing ? t("page.accounting.accounts.editTitle") : t("page.accounting.accounts.addTitle")
        }
        confirmText={t("common.save")}
        loading={saveMut.isLoading}
        onConfirm={submitForm}>
        <form ref={formRef} onSubmit={handleSave}>
          <AccountForm form={form} onChange={setForm} initial={editing} />
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        type="confirm"
        confirmVariant="destructive"
        title={t("page.accounting.accounts.deleteTitle")}
        description={t("page.accounting.accounts.deleteConfirm", {
          name: deleting?.name || ""
        })}
        confirmText={t("page.accounting.accounts.delete")}
        loading={deleteMut.isLoading}
        onConfirm={() => deleteMut.mutate(deleting.id)}
      />
    </div>
  );
};

AccountsTab.propTypes = {
  storeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isAll: PropTypes.bool
};

const JournalTab = ({ storeId, isAll }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [reverseReason, setReverseReason] = useState("");
  const [search, setSearch] = useState("");
  const [sourceType, setSourceType] = useState("all");
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [page, setPage] = useState(1);
  const formRef = useRef(null);

  const { data: accData } = useQuery(
    ["accounting-accounts", storeId || "all"],
    () => getAccounts(storeId),
    {
      enabled: !!storeId || isAll
    }
  );

  const { data, isLoading, isError, refetch } = useQuery(
    [
      "accounting-journals",
      storeId || "all",
      sourceType,
      dateRange?.from ? formatDateOnly(dateRange.from) : "",
      dateRange?.to ? formatDateOnly(dateRange.to) : ""
    ],
    () =>
      getJournals({
        store: storeId,
        sourceType: sourceType !== "all" ? sourceType : undefined,
        startDate: dateRange?.from ? formatDateOnly(dateRange.from) : undefined,
        endDate: dateRange?.to ? formatDateOnly(dateRange.to) : undefined,
        limit: 500
      }),
    {
      enabled: !!storeId || isAll
    }
  );

  const deleteMut = useMutation(({ id, reason }) => deleteJournal(id, reason), {
    onSuccess: () => {
      toast.success(t("page.accounting.toast.reverseSuccess"));
      setDeleting(null);
      setReverseReason("");
      queryClient.invalidateQueries(["accounting-journals", storeId || "all"]);
      queryClient.invalidateQueries(["accounting-trial", storeId || "all"]);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("page.accounting.toast.reverseFailed"))
  });

  const createMut = useMutation((payload) => createManualJournal({ ...payload, store: storeId }), {
    onSuccess: () => {
      toast.success(t("page.accounting.toast.saveSuccess"));
      setAdding(false);
      queryClient.invalidateQueries(["accounting-journals", storeId || "all"]);
      queryClient.invalidateQueries(["accounting-trial", storeId || "all"]);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("page.accounting.toast.saveFailed"))
  });

  const entries = data?.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const hitNumber = String(e.entryNumber || "")
        .toLowerCase()
        .includes(q);
      const hitDesc = String(e.description || "")
        .toLowerCase()
        .includes(q);
      const hitStore = String(e.storeName || "")
        .toLowerCase()
        .includes(q);
      const hitLine = (e.lines || []).some(
        (l) =>
          String(l.accountData?.name || "")
            .toLowerCase()
            .includes(q) ||
          String(l.accountData?.code || "")
            .toLowerCase()
            .includes(q)
      );
      return hitNumber || hitDesc || hitStore || hitLine;
    });
  }, [entries, search]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasActiveFilter = search || sourceType !== "all" || dateRange?.from || dateRange?.to;

  const resetFilters = () => {
    setSearch("");
    setSourceType("all");
    setDateRange({ from: null, to: null });
    setPage(1);
  };

  const sourceOptions = [
    { value: "all", label: t("page.accounting.journal.allSources") },
    ...JOURNAL_SOURCES.map((s) => ({
      value: s,
      label: t(`page.accounting.journal.source.${s}`)
    }))
  ];

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const desc = fd.get("description");
    const date = fd.get("date");
    const count = Number(fd.get("lineCount")) || 2;
    const lines = [];
    let ok = true;
    for (let i = 1; i <= count; i++) {
      const account = fd.get(`lineAccount-${i}`);
      const debit = Number(fd.get(`lineDebit-${i}`)) || 0;
      const credit = Number(fd.get(`lineCredit-${i}`)) || 0;
      if (!account) {
        toast.error(t("page.accounting.journal.invalidLine"));
        ok = false;
        break;
      }
      lines.push({
        account: Number(account),
        debit,
        credit,
        description: fd.get(`lineDesc-${i}`) || null
      });
    }
    if (!ok) return;
    createMut.mutate({ date, description: desc, lines });
  };

  const submitManualForm = () => {
    formRef.current?.requestSubmit();
    return false;
  };

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, e) => ({
        debit: acc.debit + Number(e.totalDebit || 0),
        credit: acc.credit + Number(e.totalCredit || 0)
      }),
      { debit: 0, credit: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("page.accounting.journal.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("page.accounting.journal.desc")}</p>
        </div>
        {!isAll && (
          <Button variant="success" size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} className="mr-1" /> {t("page.accounting.journal.add")}
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <label
            htmlFor="accounting-page-search"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("common.search")}
          </label>
          <SearchInput
            id="accounting-page-search"
            value={search}
            onChange={setSearch}
            placeholder={t("page.accounting.journal.searchPlaceholder")}
          />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <label
            htmlFor="accounting-page-filter-source"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("page.accounting.journal.filterSource")}
          </label>
          <Combobox
            id="accounting-page-filter-source"
            options={sourceOptions}
            value={sourceType}
            onChange={(v) => {
              setSourceType(v);
              setPage(1);
            }}
            placeholder={t("page.accounting.journal.allSources")}
          />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("page.accounting.filter.dateRange")}
          </label>
          <DatePickerWithRange
            date={dateRange}
            setDate={(d) => {
              setDateRange(d || { from: null, to: null });
              setPage(1);
            }}
            placeholder={t("page.accounting.filter.pickDateRange")}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 shrink-0"
          onClick={resetFilters}
          disabled={!hasActiveFilter}>
          <CalendarDays size={14} />
          {t("page.accounting.filter.reset")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <AbortController refetch={refetch} />
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <EmptyState
            icon={FileText}
            title={
              hasActiveFilter
                ? t("page.accounting.journal.emptySearch")
                : t("page.accounting.journal.empty")
            }
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t("common.showing", {
                start: (safePage - 1) * pageSize + 1,
                end: Math.min(safePage * pageSize, filtered.length),
                total: filtered.length
              })}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {t("page.accounting.journal.debit")}:{" "}
                <b className="font-mono text-foreground">{formatIDR(totals.debit)}</b>
              </span>
              <span className="text-border">|</span>
              <span>
                {t("page.accounting.journal.credit")}:{" "}
                <b className="font-mono text-foreground">{formatIDR(totals.credit)}</b>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {paged.map((entry) => (
              <div
                key={entry.id}
                className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {entry.entryNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays size={12} /> {formatDate(entry.date)}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-accent text-xs font-semibold capitalize">
                      {t(`page.accounting.journal.source.${entry.sourceType}`)}
                    </span>
                    {entry.status === "reversed" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                        {t("page.accounting.journal.reversed")}
                      </span>
                    )}
                    {entry.storeName && (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {entry.storeName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {t("page.accounting.journal.total")}:{" "}
                      <b className="font-mono text-foreground">{formatIDR(entry.totalDebit)}</b>
                    </span>
                    {entry.sourceType === "manual" && entry.status !== "reversed" && !isAll && (
                      <button
                        type="button"
                        onClick={() => setDeleting(entry)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title={t("page.accounting.journal.reverse")}>
                        <Undo2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {entry.description && (
                  <div className="px-4 py-2 text-xs text-muted-foreground">{entry.description}</div>
                )}
                <HorizontalScrollArea>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-b border-border/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-2.5 sm:px-4 py2 font-semibold">
                          {t("page.accounting.journal.account")}
                        </th>
                        <th className="px-2.5 sm:px-4 py2 font-semibold text-right">
                          {t("page.accounting.journal.debit")}
                        </th>
                        <th className="px-2.5 sm:px-4 py2 font-semibold text-right">
                          {t("page.accounting.journal.credit")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(entry.lines || []).map((line) => (
                        <tr key={line.id} className="border-b border-border/30">
                          <td className="px-2.5 sm:px-4 py2">
                            <span className="font-mono text-xs text-muted-foreground mr-2">
                              {line.accountData?.code}
                            </span>
                            <span className="text-xs font-medium">{line.accountData?.name}</span>
                            {line.description && (
                              <span className="block text-xs text-muted-foreground/70 mt-0.5">
                                {line.description}
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 sm:px-4 py2 text-right font-mono text-xs">
                            {Number(line.debit) > 0 ? formatIDR(line.debit) : "-"}
                          </td>
                          <td className="px-2.5 sm:px-4 py2 text-right font-mono text-xs">
                            {Number(line.credit) > 0 ? formatIDR(line.credit) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </HorizontalScrollArea>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t("page.accounting.journal.pageInfo", { page: safePage, pages: totalPages })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}>
                  &larr;
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={safePage === i + 1 ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => setPage(i + 1)}>
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}>
                  &rarr;
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={adding}
        onOpenChange={setAdding}
        type="form"
        title={t("page.accounting.journal.addTitle")}
        confirmText={t("common.save")}
        loading={createMut.isLoading}
        onConfirm={submitManualForm}>
        <form ref={formRef} onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="accounting-page-date"
                className="text-xs font-medium text-muted-foreground">
                {t("page.accounting.journal.date")}
              </label>
              <DateInput
                id="accounting-page-date"
                name="date"
                defaultValue={todayDateOnly()}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="accounting-page-description-2"
                className="text-xs font-medium text-muted-foreground">
                {t("page.accounting.journal.description")}
              </label>
              <Input
                id="accounting-page-description-2"
                name="description"
                maxLength={FIELD_LIMITS.SHORT_NOTE}
              />
            </div>
          </div>
          <ManualLines accounts={accData?.data || []} />
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) {
            setDeleting(null);
            setReverseReason("");
          }
        }}
        type="form"
        confirmVariant="destructive"
        title={t("page.accounting.journal.reverseTitle")}
        description={t("page.accounting.journal.reverseConfirm", {
          number: deleting?.entryNumber || ""
        })}
        confirmText={t("page.accounting.journal.reverse")}
        loading={deleteMut.isLoading}
        onConfirm={() => deleteMut.mutate({ id: deleting.id, reason: reverseReason.trim() })}>
        <label
          htmlFor="journal-reverse-reason"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("page.accounting.journal.reverseReason")}
        </label>
        <Textarea
          id="journal-reverse-reason"
          className="mt-1.5"
          maxLength={FIELD_LIMITS.DESCRIPTION}
          value={reverseReason}
          onChange={(e) => setReverseReason(e.target.value)}
          placeholder={t("page.accounting.journal.reverseReasonPlaceholder")}
        />
      </Modal>
    </div>
  );
};

JournalTab.propTypes = {
  storeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isAll: PropTypes.bool
};

const ManualLines = ({ accounts }) => {
  const { t } = useTranslation();
  const [count, setCount] = useState(2);
  const lines = Array.from({ length: count });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {t("page.accounting.journal.lines")}
        </p>
        <Button type="button" variant="success" size="sm" onClick={() => setCount((c) => c + 1)}>
          <Plus size={14} className="mr-1" /> {t("page.accounting.journal.addLine")}
        </Button>
      </div>
      <input type="hidden" name="lineCount" value={count} />
      {lines.map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-5 space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("page.accounting.journal.account")} {i + 1}
            </label>
            <select
              name={`lineAccount-${i + 1}`}
              className="w-full h-10 px-3 rounded-lg bg-accent/50 border border-border/60 text-sm outline-none focus:border-primary/50 transition-colors">
              <option value="">{t("page.accounting.journal.selectAccount")}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} · {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("page.accounting.journal.debit")}
            </label>
            <Input type="number" name={`lineDebit-${i + 1}`} min="0" step="0.01" defaultValue="0" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("page.accounting.journal.credit")}
            </label>
            <Input
              type="number"
              name={`lineCredit-${i + 1}`}
              min="0"
              step="0.01"
              defaultValue="0"
            />
          </div>
          <div className="col-span-3 space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {t("page.accounting.journal.description")}
            </label>
            <Input name={`lineDesc-${i + 1}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

ManualLines.propTypes = {
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      code: PropTypes.string,
      name: PropTypes.string
    })
  ).isRequired
};

const ReportRow = ({ label, value, strong, indent }) => (
  <div className={`flex items-center justify-between py-1 ${indent ? "pl-4" : ""}`}>
    <span className={`text-sm ${strong ? "font-bold" : "text-muted-foreground"}`}>{label}</span>
    <span className={`font-mono text-sm ${strong ? "font-bold" : ""}`}>{formatIDR(value)}</span>
  </div>
);

ReportRow.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
  strong: PropTypes.bool,
  indent: PropTypes.bool
};

const TrialBalanceTab = ({ storeId, isAll }) => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const { data, isLoading, isError, refetch } = useQuery(
    [
      "accounting-trial",
      storeId || "all",
      dateRange?.from ? formatDateOnly(dateRange.from) : "",
      dateRange?.to ? formatDateOnly(dateRange.to) : ""
    ],
    () =>
      getTrialBalance({
        store: storeId,
        startDate: dateRange?.from ? formatDateOnly(dateRange.from) : undefined,
        endDate: dateRange?.to ? formatDateOnly(dateRange.to) : undefined
      }),
    { enabled: !!storeId || isAll }
  );
  const tb = data?.data || [];
  const totalDebit = data?.totalDebit || 0;
  const totalCredit = data?.totalCredit || 0;
  const balanced = data?.balanced;
  const hasFilter = dateRange?.from || dateRange?.to;

  const resetFilters = () => setDateRange({ from: null, to: null });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("page.accounting.trial.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("page.accounting.trial.desc")}</p>
        </div>
        <AccountingFilterBar
          label={t("page.accounting.filter.dateRange")}
          onReset={resetFilters}
          disabled={!hasFilter}>
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
            placeholder={t("page.accounting.filter.pickDateRange")}
          />
        </AccountingFilterBar>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label={t("page.accounting.trial.statDebit")}
              value={formatIDR(totalDebit)}
              icon={Wallet}
              variant="default"
            />
            <StatCard
              label={t("page.accounting.trial.statCredit")}
              value={formatIDR(totalCredit)}
              icon={ReceiptText}
              variant="gold"
            />
            <StatCard
              label={t("page.accounting.trial.statDifference")}
              value={formatIDR(Math.abs(totalDebit - totalCredit))}
              icon={balanced ? CheckCircle2 : AlertTriangle}
              variant={balanced ? "active" : "inactive"}
              subtitle={
                balanced
                  ? t("page.accounting.trial.balanced")
                  : t("page.accounting.trial.unbalanced")
              }
            />
          </div>

          {tb.length === 0 ? (
            <div className="bg-card rounded-xl border border-border">
              <EmptyState icon={Scale} title={t("page.accounting.trial.empty")} className="py-10" />
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <HorizontalScrollArea>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-2.5 sm:px-4 py3 font-semibold align-top">
                        <span className="block">{t("page.accounting.trial.code")}</span>
                        <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                          {t("page.accounting.trial.codeHint")}
                        </span>
                      </th>
                      <th className="px-2.5 sm:px-4 py3 font-semibold align-top">
                        <span className="block">{t("page.accounting.trial.account")}</span>
                        <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                          {t("page.accounting.trial.accountHint")}
                        </span>
                      </th>
                      <th className="px-2.5 sm:px-4 py3 font-semibold text-right align-top">
                        <span className="block">{t("page.accounting.trial.debit")}</span>
                        <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                          {t("page.accounting.trial.debitHint")}
                        </span>
                      </th>
                      <th className="px-2.5 sm:px-4 py3 font-semibold text-right align-top">
                        <span className="block">{t("page.accounting.trial.credit")}</span>
                        <span className="block text-xs font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                          {t("page.accounting.trial.creditHint")}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tb.map((row) => (
                      <tr key={row.code || row.accountId} className="border-b border-border/30">
                        <td className="px-2.5 sm:px-4 py2 font-mono text-xs">{row.code}</td>
                        <td className="px-2.5 sm:px-4 py2">
                          <span className="text-sm">{row.name}</span>
                          {row.type && (
                            <span
                              className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                TYPE_BADGE[row.type] || "bg-muted text-muted-foreground"
                              }`}>
                              {t(`page.accounting.types.${row.type}`)}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 sm:px-4 py2 text-right font-mono text-xs">
                          {row.debit > 0 ? formatIDR(row.debit) : "-"}
                        </td>
                        <td className="px-2.5 sm:px-4 py2 text-right font-mono text-xs">
                          {row.credit > 0 ? formatIDR(row.credit) : "-"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-accent/30 font-bold">
                      <td colSpan={2} className="px-2.5 sm:px-4 py3">
                        {t("page.accounting.trial.total")}
                      </td>
                      <td className="px-2.5 sm:px-4 py3 text-right font-mono">
                        {formatIDR(totalDebit)}
                      </td>
                      <td className="px-2.5 sm:px-4 py3 text-right font-mono">
                        {formatIDR(totalCredit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </HorizontalScrollArea>
              <div
                className={`px-4 py-3 border-t border-border/60 flex items-center gap-2 text-xs font-semibold ${
                  balanced ? "text-emerald-600" : "text-destructive"
                }`}>
                {balanced ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {balanced
                  ? t("page.accounting.trial.balanced")
                  : t("page.accounting.trial.unbalanced")}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

TrialBalanceTab.propTypes = {
  storeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isAll: PropTypes.bool
};

const IncomeStatementTab = ({ storeId, isAll }) => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const { data, isLoading, isError, refetch } = useQuery(
    [
      "accounting-income",
      storeId || "all",
      dateRange?.from ? formatDateOnly(dateRange.from) : "",
      dateRange?.to ? formatDateOnly(dateRange.to) : ""
    ],
    () =>
      getIncomeStatement({
        store: storeId,
        startDate: dateRange?.from ? formatDateOnly(dateRange.from) : undefined,
        endDate: dateRange?.to ? formatDateOnly(dateRange.to) : undefined
      }),
    { enabled: !!storeId || isAll }
  );
  const st = data?.data;
  const hasFilter = dateRange?.from || dateRange?.to;
  const resetFilters = () => setDateRange({ from: null, to: null });

  const netIncome = st?.netIncome || 0;
  const isProfit = netIncome >= 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("page.accounting.income.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("page.accounting.income.desc")}</p>
        </div>
        <AccountingFilterBar
          label={t("page.accounting.filter.dateRange")}
          onReset={resetFilters}
          disabled={!hasFilter}>
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
            placeholder={t("page.accounting.filter.pickDateRange")}
          />
        </AccountingFilterBar>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label={t("page.accounting.income.statRevenue")}
              value={formatIDR(st.totalRevenue || 0)}
              icon={TrendingUp}
              variant="active"
            />
            <StatCard
              label={t("page.accounting.income.statExpense")}
              value={formatIDR(st.totalExpense || 0)}
              icon={TrendingDown}
              variant="red"
            />
            <StatCard
              label={
                isProfit
                  ? t("page.accounting.income.statNetIncome")
                  : t("page.accounting.income.loss")
              }
              value={formatIDR(Math.abs(netIncome))}
              icon={isProfit ? CheckCircle2 : AlertTriangle}
              variant={isProfit ? "blue" : "inactive"}
            />
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-5 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("page.accounting.income.revenue")}
              </p>
              {st.revenues.length === 0 && (
                <p className="text-sm text-muted-foreground italic">-</p>
              )}
              {st.revenues.map((r) => (
                <ReportRow key={r.code} label={`${r.code} · ${r.name}`} value={r.value} />
              ))}
              <div className="border-t border-dashed border-border/60 pt-2 mt-1">
                <ReportRow
                  label={t("page.accounting.income.totalRevenue")}
                  value={st.totalRevenue}
                  strong
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">
                {t("page.accounting.income.expenses")}
              </p>
              {st.expenses.length === 0 && (
                <p className="text-sm text-muted-foreground italic">-</p>
              )}
              {st.expenses.map((r) => (
                <ReportRow key={r.code} label={`${r.code} · ${r.name}`} value={r.value} />
              ))}
              <div className="border-t border-dashed border-border/60 pt-2 mt-1">
                <ReportRow
                  label={t("page.accounting.income.totalExpenses")}
                  value={st.totalExpense}
                  strong
                />
              </div>
              <div className="border-t-2 border-border mt-3 pt-2">
                <ReportRow
                  label={
                    isProfit
                      ? t("page.accounting.income.netIncome")
                      : t("page.accounting.income.loss")
                  }
                  value={netIncome}
                  strong
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

IncomeStatementTab.propTypes = {
  storeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isAll: PropTypes.bool
};

const BalanceSheetTab = ({ storeId, isAll }) => {
  const { t } = useTranslation();
  const [asOf, setAsOf] = useState(null);
  const { data, isLoading, isError, refetch } = useQuery(
    ["accounting-balance", storeId || "all", asOf ? formatDateOnly(asOf) : ""],
    () =>
      getBalanceSheet({
        store: storeId,
        asOf: asOf ? formatDateOnly(asOf) : undefined
      }),
    { enabled: !!storeId || isAll }
  );
  const bs = data?.data;

  const rowValue = (r) => (r.normalBalance === "debit" ? Number(r.net || 0) : -Number(r.net || 0));

  const renderSection = (title, rows, total, icon) => (
    <CardSection title={title} icon={icon}>
      {rows.length === 0 && <p className="text-sm text-muted-foreground italic">-</p>}
      {rows.map((r) => (
        <ReportRow key={r.code} label={`${r.code} · ${r.name}`} value={rowValue(r)} />
      ))}
      <div className="border-t border-dashed border-border/60 pt-2 mt-1">
        <ReportRow label={t("page.accounting.balance.total")} value={total} strong />
      </div>
    </CardSection>
  );

  const resetFilter = () => setAsOf(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("page.accounting.balance.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("page.accounting.balance.desc")}</p>
        </div>
        <AccountingFilterBar
          label={t("page.accounting.balance.asOf")}
          onReset={resetFilter}
          disabled={!asOf}>
          <DatePicker
            date={asOf}
            setDate={setAsOf}
            placeholder={t("page.accounting.filter.pickDate")}
          />
        </AccountingFilterBar>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <AbortController refetch={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label={t("page.accounting.balance.statAssets")}
              value={formatIDR(bs.totalAssets || 0)}
              icon={Landmark}
              variant="blue"
            />
            <StatCard
              label={t("page.accounting.balance.statLiabilities")}
              value={formatIDR(bs.totalLiabilities || 0)}
              icon={ReceiptText}
              variant="gold"
            />
            <StatCard
              label={t("page.accounting.balance.statEquity")}
              value={formatIDR(bs.totalEquity || 0)}
              icon={Wallet}
              variant="active"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderSection(
              t("page.accounting.balance.assets"),
              bs.assets,
              bs.totalAssets,
              Landmark
            )}
            {renderSection(
              t("page.accounting.balance.liabilities"),
              bs.liabilities,
              bs.totalLiabilities,
              ReceiptText
            )}
            {renderSection(t("page.accounting.balance.equity"), bs.equity, bs.totalEquity, Wallet)}
          </div>

          {asOf && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays size={13} />
              {t("page.accounting.balance.asOf")}: <b>{formatDate(asOf)}</b>
            </div>
          )}

          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              data?.balanced ? "text-emerald-600" : "text-destructive"
            }`}>
            {data?.balanced ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {data?.balanced
              ? t("page.accounting.balance.balanced")
              : t("page.accounting.balance.unbalanced")}{" "}
            · {t("page.accounting.balance.total")}:{" "}
            <b className="font-mono">{formatIDR(data?.totalAssets)}</b>
          </div>
        </>
      )}
    </div>
  );
};

BalanceSheetTab.propTypes = {
  storeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isAll: PropTypes.bool
};

const AccountingOverview = ({ storeId, isAll }) => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const { data, isLoading, isError, refetch } = useQuery(
    [
      "accounting-overview",
      storeId || "all",
      dateRange?.from ? formatDateOnly(dateRange.from) : "",
      dateRange?.to ? formatDateOnly(dateRange.to) : ""
    ],
    () =>
      getAccountingOverview({
        store: storeId,
        startDate: dateRange?.from ? formatDateOnly(dateRange.from) : undefined,
        endDate: dateRange?.to ? formatDateOnly(dateRange.to) : undefined
      }),
    { enabled: !!storeId || isAll }
  );

  const ov = data?.data;
  const hasFilter = dateRange?.from || dateRange?.to;
  const resetFilters = () => setDateRange({ from: null, to: null });

  const periodLabel = dateRange?.from
    ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to || dateRange.from)}`
    : t("page.accounting.overview.allPeriod");

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Wallet size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold">{t("page.accounting.overview.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("page.accounting.overview.desc")}</p>
          </div>
        </div>
        <AccountingFilterBar
          label={t("page.accounting.filter.dateRange")}
          onReset={resetFilters}
          disabled={!hasFilter}>
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
            placeholder={t("page.accounting.filter.pickDateRange")}
          />
        </AccountingFilterBar>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : isError ? (
          <AbortController refetch={refetch} />
        ) : !ov ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("page.accounting.overview.notFound")}
          </p>
        ) : (
          <>
            <div className="rounded-xl p-6 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                  {t("page.accounting.overview.totalRevenue")}
                </p>
                <h3 className="text-3xl sm:text-4xl font-bold mt-1">
                  {formatIDR(ov.totalRevenue)}
                </h3>
                <p className="text-sm text-emerald-100 flex items-center gap-1.5 mt-1">
                  <CalendarDays size={13} /> {t("page.accounting.overview.period")}: {periodLabel}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <TrendingUp size={26} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label={t("page.accounting.overview.cashBank")}
                value={formatIDR(ov.cashBank)}
                icon={Wallet}
                variant="blue"
              />
              <StatCard
                label={t("page.accounting.overview.totalExpense")}
                value={formatIDR(ov.totalExpense)}
                icon={TrendingDown}
                variant="red"
                subtitle={`${ov.journalEntryCount} ${t("page.accounting.overview.entries")}`}
              />
              <StatCard
                label={
                  ov.isProfit
                    ? t("page.accounting.overview.netIncome")
                    : t("page.accounting.overview.netLoss")
                }
                value={formatIDR(Math.abs(ov.netIncome))}
                icon={ov.isProfit ? CheckCircle2 : AlertTriangle}
                variant={ov.isProfit ? "gold" : "inactive"}
                subtitle={ov.isProfit ? "▲" : "▼"}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <StatCard
                label={t("page.accounting.overview.totalAssets")}
                value={formatIDR(ov.totalAssets)}
                icon={Landmark}
                variant="blue"
              />
              <StatCard
                label={t("page.accounting.overview.totalLiabilities")}
                value={formatIDR(ov.totalLiabilities)}
                icon={ReceiptText}
                variant="gold"
              />
              <StatCard
                label={t("page.accounting.overview.totalEquity")}
                value={formatIDR(ov.totalEquity)}
                icon={Scale}
                variant="active"
              />
              <StatCard
                label={t("page.accounting.overview.difference")}
                value={formatIDR(Math.abs(ov.totalAssets - ov.totalLiabilitiesEquity))}
                icon={ov.balanced ? CheckCircle2 : AlertTriangle}
                variant={ov.balanced ? "active" : "inactive"}
                subtitle={
                  ov.balanced
                    ? t("page.accounting.overview.balanced")
                    : t("page.accounting.overview.unbalanced")
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 px-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} /> {ov.journalEntryCount}{" "}
                {t("page.accounting.overview.entries")}
              </span>
              <span className="text-border">|</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} /> {t("page.accounting.overview.period")}: {periodLabel}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

AccountingOverview.propTypes = {
  storeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isAll: PropTypes.bool
};

const AccountingPage = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const cookieStoreId = cookie?.activeStore || user?.store;
  const isSuperAdmin = isSuperAdminRole(user);

  const [storeFilter, setGlobalStoreFilter] = useGlobalStoreFilter();

  const { data: locationsData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locationsData?.data || [];

  const storeId = isSuperAdmin
    ? storeFilter && storeFilter !== "all"
      ? storeFilter
      : null
    : cookieStoreId;
  const isAll = isSuperAdmin && !storeId;

  const breadcrumbs = [
    {
      label: t("breadcrumb.home"),
      href: "/dashboard-super-admin",
      i18nKey: "breadcrumb.home"
    },
    { i18nKey: "page.accounting.breadcrumb" }
  ];

  if (!isSuperAdmin && !storeId) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: t("breadcrumb.home"),
              href: "/dashboard-super-admin",
              i18nKey: "breadcrumb.home"
            },
            { i18nKey: "page.accounting.breadcrumb" }
          ]}
        />
        <div className="flex min-h-full w-full">
          <NoStore />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={t("page.accounting.title")}
        description={t("page.accounting.desc")}>
        {isSuperAdmin && (
          <StoreFilter
            locations={locations}
            value={storeFilter}
            onChange={setGlobalStoreFilter}
            isSuperAdmin={isSuperAdmin}
            t={t}
          />
        )}
      </PageHeader>

      <AccountingOverview storeId={storeId} isAll={isAll} />

      <Tabs defaultValue="accounts">
        {/* ponytail: 5 tab lebih lebar dari layar ponsel — scroll kiri-kanan
            seperti pola di add-supplier */}
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-max">
            <TabsTrigger value="accounts">
              <BookOpen size={14} className="mr-1.5" /> {t("page.accounting.tabs.accounts")}
            </TabsTrigger>
            <TabsTrigger value="journal">
              <FileText size={14} className="mr-1.5" /> {t("page.accounting.tabs.journal")}
            </TabsTrigger>
            <TabsTrigger value="trial">
              <Scale size={14} className="mr-1.5" /> {t("page.accounting.tabs.trial")}
            </TabsTrigger>
            <TabsTrigger value="income">
              <TrendingUp size={14} className="mr-1.5" /> {t("page.accounting.tabs.income")}
            </TabsTrigger>
            <TabsTrigger value="balance">
              <Landmark size={14} className="mr-1.5" /> {t("page.accounting.tabs.balance")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="accounts">
          <AccountsTab storeId={storeId} isAll={isAll} />
        </TabsContent>
        <TabsContent value="journal">
          <JournalTab storeId={storeId} isAll={isAll} />
        </TabsContent>
        <TabsContent value="trial">
          <TrialBalanceTab storeId={storeId} isAll={isAll} />
        </TabsContent>
        <TabsContent value="income">
          <IncomeStatementTab storeId={storeId} isAll={isAll} />
        </TabsContent>
        <TabsContent value="balance">
          <BalanceSheetTab storeId={storeId} isAll={isAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { JournalTab };
export default AccountingPage;

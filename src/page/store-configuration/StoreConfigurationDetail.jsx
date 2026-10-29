import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Lock, SearchX } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CurrencyInput from "@/components/ui/currency-input";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField
} from "@/components/ui/form";
import Modal from "@/components/organism/modal";
import { AccessDenied } from "@/components/ui/RequireRole";
import { getStoreConfigurationById, editStoreConfiguration } from "@/services/location";
import { useStoreManagePermission } from "@/hooks/useStoreManagePermission";
import { useConfirmSubmit } from "@/hooks/useConfirmSubmit";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { normalizeStoreId } from "@/utils/storeId";
import { buildTimezoneOptions, DEFAULT_TIMEZONE, isValidTimezone } from "@/utils/storeTimezone";
import {
  MAX_INT4,
  MAX_PARKED_CART_TTL_MINUTES,
  STORE_CATEGORIES,
  STORE_CONFIGURATION_FIELDS,
  STORE_CONFIGURATION_QUERY_KEY,
  STORE_CONFIGURATIONS_QUERY_KEY,
  buildStoreConfigurationPayload,
  isTerminalStoreStatus,
  toStoreConfigurationFormValues
} from "@/lib/store-configuration";
import { StoreConfigurationSkeleton, StoreStatusPill, useCategoryLabel } from "./shared";
import { qk } from "@/queries/keys";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const LIST_PATH = "/store-configuration";

// The dashboard's FloatingTourButton (fixed bottom-6 right-6 z-30; about
// 220px wide and 80px tall including its offset and hover scale) floats over
// this sticky action bar. Keep the actions out of that corner without
// touching the shell: below `sm` the stacked full-width buttons sit above it
// (bottom clearance), from `sm` the right-aligned buttons stop left of it
// (right clearance) at the bar's normal height.
export const TOUR_BUTTON_CLEARANCE = [
  "pb-[calc(env(safe-area-inset-bottom)+5.5rem)]",
  "sm:pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
  "sm:pr-60"
].join(" ");
// Rejection raised by the W3 wrapper before any request for an id that
// cannot address a store (loc-000, "all", "abc", ...).
const INVALID_ID_MESSAGE = "Invalid store configuration id";

const FIELD_LABEL_KEYS = {
  description: "page.storeConfiguration.field.description",
  timezone: "page.storeConfiguration.field.timezone",
  maxActiveParkedCarts: "page.storeConfiguration.field.maxActiveParkedCarts",
  parkedCartTtlMinutes: "page.storeConfiguration.field.parkedCartTtlMinutes",
  dailyTarget: "page.storeConfiguration.field.dailyTarget",
  category: "page.storeConfiguration.field.category"
};

const isIntegerInRange = (min, max) => (value) =>
  value === "" || (Number.isInteger(value) && value >= min && value <= max);

const buildSchema = (t) =>
  z.object({
    description: z.string(),
    // An unset timezone can only stay unset (it is never sent); any chosen
    // value must be a valid IANA zone.
    timezone: z.string().refine((value) => value === "" || isValidTimezone(value), {
      message: t("page.storeConfiguration.validation.timezone")
    }),
    maxActiveParkedCarts: z.any().refine(isIntegerInRange(1, MAX_INT4), {
      message: t("page.storeConfiguration.validation.maxActiveParkedCarts")
    }),
    parkedCartTtlMinutes: z.any().refine(isIntegerInRange(1, MAX_PARKED_CART_TTL_MINUTES), {
      message: t("page.storeConfiguration.validation.parkedCartTtlMinutes")
    }),
    dailyTarget: z.any().refine(isIntegerInRange(0, MAX_INT4), {
      message: t("page.storeConfiguration.validation.dailyTarget")
    }),
    category: z.string()
  });

const classifyError = (error) => {
  const status = error?.response?.status;
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (!error?.response && error?.message === INVALID_ID_MESSAGE) return "notFound";
  return "error";
};

// CurrencyInput and Combobox are not ref-forwarding Slot targets, so they get
// the FormControl accessibility wiring (id / aria-describedby / aria-invalid)
// from the field context directly.
const useFieldA11y = () => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return {
    id: formItemId,
    "aria-describedby": error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId,
    "aria-invalid": !!error
  };
};

const CurrencyField = (props) => <CurrencyInput {...useFieldA11y()} {...props} />;

const TimezoneField = (props) => {
  const { id } = useFieldA11y();
  return <Combobox id={id} {...props} />;
};

const toNumberInputValue = (event) => (event.target.value === "" ? "" : Number(event.target.value));

const Section = ({ id, title, description, children }) => (
  <section
    aria-labelledby={id}
    className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
    <div className="mb-4 space-y-1">
      <h2 id={id} className="text-base font-semibold text-foreground">
        {title}
      </h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  </section>
);

const NotFoundState = ({ onBack }) => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-muted/60 text-muted-foreground">
        <SearchX className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <p className="text-xl font-bold text-foreground">
        {t("page.storeConfiguration.notFound.title")}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("page.storeConfiguration.notFound.description")}
      </p>
      <Button variant="outline" size="sm" onClick={onBack}>
        {t("page.storeConfiguration.action.backToList")}
      </Button>
    </div>
  );
};

const LoadErrorState = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
};

const StoreConfigurationEditor = ({ routeId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const categoryLabel = useCategoryLabel();
  const normalizedId = normalizeStoreId(routeId);
  const detailKey = [STORE_CONFIGURATION_QUERY_KEY, normalizedId];

  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [terminalLocked, setTerminalLocked] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);
  const [leaveModal, setLeaveModal] = useState(false);
  const summaryRef = useRef(null);
  const defaultsRef = useRef(toStoreConfigurationFormValues());
  const submittingRef = useRef(false);

  const detailQuery = useQuery(detailKey, () => getStoreConfigurationById(routeId), {
    retry: false,
    refetchOnWindowFocus: false
  });
  const store = detailQuery.data?.data;

  const schema = useMemo(() => buildSchema(t), [t]);
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: defaultsRef.current
  });
  const { isDirty } = form.formState;

  // Hydrate (and re-hydrate after a successful save's refetch) with values
  // typed exactly like the inputs produce, so the form starts clean.
  useEffect(() => {
    if (!store) return;
    const defaults = toStoreConfigurationFormValues(store);
    defaultsRef.current = defaults;
    form.reset(defaults);
  }, [store, form]);

  useEffect(() => {
    if (serverErrors.length > 0) summaryRef.current?.focus();
  }, [serverErrors]);

  useUnsavedChanges(isDirty);

  const isTerminal = terminalLocked || isTerminalStoreStatus(store?.status);

  const timezoneOptions = useMemo(
    () => buildTimezoneOptions(store?.timezone || DEFAULT_TIMEZONE),
    [store?.timezone]
  );

  // The known categories, plus a persisted legacy value so it stays visible
  // and the form never changes it implicitly.
  const categoryOptions = useMemo(() => {
    const current = store?.category;
    return current && !STORE_CATEGORIES.includes(current)
      ? [...STORE_CATEGORIES, current]
      : [...STORE_CATEGORIES];
  }, [store?.category]);

  const mutation = useMutation(editStoreConfiguration, {
    onSuccess: async () => {
      toast.success(t("page.storeConfiguration.toast.saved"));
      // The PUT response lacks the configuration fields: invalidating the
      // active detail query refetches it.
      await Promise.all([
        queryClient.invalidateQueries(detailKey),
        queryClient.invalidateQueries([STORE_CONFIGURATIONS_QUERY_KEY]),
        queryClient.invalidateQueries(["locations"]),
        queryClient.invalidateQueries(qk.locations.all())
      ]);
    },
    onError: (error) => {
      const status = error?.response?.status;
      const body = error?.response?.data || {};
      if (status === 422 && body.code === "STORE_STATUS_IRREVERSIBLE") {
        setTerminalLocked(true);
        toast.error(t("page.storeConfiguration.terminal.title"));
        return;
      }
      if (status === 403) {
        setForbidden(true);
        return;
      }
      if (status === 404) {
        setNotFound(true);
        return;
      }
      if (status === 400) {
        const issues = Array.isArray(body.errors) ? body.errors : [];
        const items = [];
        issues.forEach(({ field, message }) => {
          if (STORE_CONFIGURATION_FIELDS.includes(field)) {
            form.setError(field, { type: "server", message });
            items.push({ field, message: `${t(FIELD_LABEL_KEYS[field])}: ${message}` });
          } else {
            items.push({ field: null, message });
          }
        });
        if (items.length === 0) {
          items.push({
            field: null,
            message: body.message || t("page.storeConfiguration.error.saveFailed")
          });
        }
        setServerErrors(items);
        return;
      }
      toast.error(body.message || t("page.storeConfiguration.error.saveFailed"));
    },
    onSettled: () => {
      submittingRef.current = false;
    }
  });

  const handleConfirmSave = (values) => {
    if (isTerminal || submittingRef.current) return;
    const payload = buildStoreConfigurationPayload({
      id: routeId,
      values,
      defaults: defaultsRef.current
    });
    if (!payload) return;
    submittingRef.current = true;
    setServerErrors([]);
    mutation.mutate(payload);
  };

  const { handleSubmit, confirmModal } = useConfirmSubmit(form, handleConfirmSave);

  const leave = () => navigate(LIST_PATH);
  const requestLeave = () => (isDirty ? setLeaveModal(true) : leave());

  if (forbidden) return <AccessDenied />;
  if (detailQuery.isLoading) return <StoreConfigurationSkeleton />;

  if (notFound || detailQuery.isError) {
    const kind = notFound ? "notFound" : classifyError(detailQuery.error);
    if (kind === "forbidden") return <AccessDenied />;
    if (kind === "notFound") return <NotFoundState onBack={leave} />;
    return <LoadErrorState onRetry={() => detailQuery.refetch()} />;
  }

  if (!store) return <NotFoundState onBack={leave} />;

  const saving = mutation.isLoading;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.storeConfiguration.title"),
            href: LIST_PATH,
            i18nKey: "page.storeConfiguration.title"
          },
          { label: store.name }
        ]}
        title={t("page.storeConfiguration.detail.title")}
        description={t("page.storeConfiguration.detail.description")}
        backLink={LIST_PATH}
        onBack={requestLeave}
      />
      <LoadErrorBanner />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{store.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{store.storeId}</p>
        </div>
        <StoreStatusPill status={store.status} />
      </div>

      {isTerminal && (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              {t("page.storeConfiguration.terminal.title")}
            </p>
            <p className="text-muted-foreground">
              {t("page.storeConfiguration.terminal.description")}
            </p>
          </div>
        </div>
      )}

      {serverErrors.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="store-configuration-error-summary-title"
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-destructive">
          <p
            id="store-configuration-error-summary-title"
            className="mb-2 font-semibold text-destructive">
            {t("page.storeConfiguration.error.summaryTitle")}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground">
            {serverErrors.map((item, index) => (
              <li key={`${item.field || "general"}-${index}`}>{item.message}</li>
            ))}
          </ul>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <Section
            id="store-configuration-section-general"
            title={t("page.storeConfiguration.section.general")}
            description={t("page.storeConfiguration.section.generalDescription")}>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.storeConfiguration.field.category")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isTerminal}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("page.storeConfiguration.field.categoryPlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>
                          {categoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("page.storeConfiguration.field.categoryHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{t("page.storeConfiguration.field.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      disabled={isTerminal}
                      placeholder={t("page.storeConfiguration.field.descriptionPlaceholder")}
                      maxLength={FIELD_LIMITS.DESCRIPTION}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("page.storeConfiguration.field.descriptionHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section
            id="store-configuration-section-operations"
            title={t("page.storeConfiguration.section.operations")}
            description={t("page.storeConfiguration.section.operationsDescription")}>
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.storeConfiguration.field.timezone")}</FormLabel>
                  <TimezoneField
                    options={timezoneOptions}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      field.onBlur();
                    }}
                    disabled={isTerminal}
                    placeholder={t("page.storeConfiguration.field.timezonePlaceholder")}
                    searchPlaceholder={t("page.storeConfiguration.field.timezoneSearch")}
                    emptyMessage={t("page.storeConfiguration.field.timezoneEmpty")}
                  />
                  <FormDescription>
                    {t("page.storeConfiguration.field.timezoneHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailyTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.storeConfiguration.field.dailyTarget")}</FormLabel>
                  <CurrencyField
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isTerminal}
                  />
                  <FormDescription>
                    {t("page.storeConfiguration.field.dailyTargetHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section
            id="store-configuration-section-parked-carts"
            title={t("page.storeConfiguration.section.parkedCarts")}
            description={t("page.storeConfiguration.section.parkedCartsDescription")}>
            <FormField
              control={form.control}
              name="maxActiveParkedCarts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.storeConfiguration.field.maxActiveParkedCarts")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onChange={(event) => field.onChange(toNumberInputValue(event))}
                      onBlur={field.onBlur}
                      disabled={isTerminal}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("page.storeConfiguration.field.maxActiveParkedCartsHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parkedCartTtlMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.storeConfiguration.field.parkedCartTtlMinutes")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_PARKED_CART_TTL_MINUTES}
                      step={1}
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onChange={(event) => field.onChange(toNumberInputValue(event))}
                      onBlur={field.onBlur}
                      disabled={isTerminal}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("page.storeConfiguration.field.parkedCartTtlMinutesHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <div
            className={`sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:mx-0 md:rounded-xl md:border md:shadow-sm ${TOUR_BUTTON_CLEARANCE}`}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={requestLeave}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={!isDirty || isTerminal || saving}
                disabledReason={
                  saving
                    ? undefined
                    : isTerminal
                      ? t("page.storeConfiguration.terminal.description")
                      : t("common.disabledReason.noChanges")
                }
                aria-busy={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <Modal {...confirmModal()} loading={saving} />
      <Modal
        type="confirm"
        open={leaveModal}
        onOpenChange={setLeaveModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={leave}
      />
    </div>
  );
};

const StoreConfigurationDetail = () => {
  const { id } = useParams();
  const permission = useStoreManagePermission();

  if (permission.isLoading) return <StoreConfigurationSkeleton />;
  if (permission.isError) return <LoadErrorState onRetry={() => permission.refetch()} />;
  if (!permission.canManageStores) return <AccessDenied />;

  return <StoreConfigurationEditor key={id} routeId={id} />;
};

export default StoreConfigurationDetail;

/* eslint-disable no-unused-vars */
import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Moon,
  Sun,
  Mail,
  Lock,
  User,
  MapPin,
  ChevronDown,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "react-query";
import { toast } from "sonner";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Loading } from "@/components/ui/loading";
import PolicyDialog from "@/components/organism/policy-dialog";

import { register } from "@/services/auth";
import { useLocations } from "@/queries/useLocations";
import { translationSelect } from "@/state/translation";
import { useThemeStore } from "@/state/theme";
import { useThemeEffect } from "@/hooks/useThemeEffect";
import AuthGuideModal from "@/components/organism/AuthGuideModal";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const RegisterPage = () => {
  const { t, ready } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(
    location.state?.openGuide && location.state?.guideContext === "register"
  );
  const { translation, updateTranslation } = translationSelect();
  const { toggleTheme } = useThemeStore();
  useThemeEffect();

  useEffect(() => {
    if (location.state?.openGuide) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  const { data: locationsData, isLoading, isError } = useLocations();

  const locations = useMemo(() => {
    if (!locationsData) return [];
    if (Array.isArray(locationsData)) return locationsData;
    if (locationsData?.data && Array.isArray(locationsData.data)) return locationsData.data;
    return [];
  }, [locationsData]);

  const noLocationsAvailable = !isLoading && locations.length === 0;

  const translationMemo = useMemo(
    () => ({
      registerTitle: t("translation:registerTitle"),
      registerSubtitle: t("translation:registerSubtitle"),
      userName: t("translation:userName"),
      email: t("translation:email"),
      location: t("translation:location"),
      selectLocation: t("translation:selectLocation"),
      password: t("translation:password"),
      confirmationPassword: t("translation:confirmationPassword"),
      btnCreateAcc: t("translation:btnCreateAcc"),
      alreadyHaveAccount: t("translation:alreadyHaveAccount"),
      login: t("translation:login"),
      enterpriseSecure: t("translation:enterpriseSecure"),
      help: t("translation:help"),
      privacyPolicy: t("translation:privacyPolicy"),
      termsConditions: t("translation:termsConditions"),

      placeholderUsername: t("translation:placeholder.input.register.username"),
      placeholderEmail: t("translation:placeholder.input.register.email"),
      placeholderPassword: t("translation:placeholder.input.register.password"),
      placeholderConfirmation: t("translation:placeholder.input.register.confirmationPassword"),

      errorUsername: t("translation:formError.input.register.username"),
      errorEmail: t("translation:formError.input.register.email"),
      errorValidationEmail: t("translation:formError.input.register.validationEmail"),
      errorLocation: t("translation:formError.input.register.location"),
      errorPassword: t("translation:formError.input.register.password"),
      errorPasswordMin: t("translation:formError.input.register.passwordMin"),
      errorConfirmation: t("translation:formError.input.register.confirmationPassword"),
      errorPasswordMatch: t("translation:formError.input.register.validationConfirmationPassword")
    }),
    [t, ready]
  );

  const formSchema = useMemo(
    () =>
      z
        .object({
          userName: z.string().min(4, { message: translationMemo.errorUsername }),
          email: z
            .string()
            .min(1, { message: translationMemo.errorEmail })
            .email({ message: translationMemo.errorValidationEmail }),
          store: z.string().min(1, { message: translationMemo.errorLocation }),
          // Same minimum as the server (registerSchema: 6 characters).
          password: z
            .string()
            .min(1, { message: translationMemo.errorPassword })
            .min(6, { message: translationMemo.errorPasswordMin }),
          confirmPassword: z.string().min(1, { message: translationMemo.errorConfirmation })
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: translationMemo.errorPasswordMatch,
          path: ["confirmPassword"]
        }),
    [translationMemo]
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: "",
      email: "",
      store: "",
      password: "",
      confirmPassword: ""
    }
  });

  const mutateRegister = useMutation(register, {
    onMutate: () => setIsSubmitting(true),
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success(t("page.register.toast.success"), {
        description: t("page.register.toast.successDescription")
      });
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (err) => {
      setIsSubmitting(false);
      toast.error(t("page.register.toast.failed"), {
        description: err.message
      });
    }
  });

  return (
    <div>
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
        {/* Top Nav */}
        <nav className="bg-card border-b border-border fixed top-0 w-full z-50 transition-colors">
          <div className="flex justify-between items-center w-full px-4 md:px-6 lg:px-lg py-2.5 max-w-7xl mx-auto">
            <span className="text-base md:text-lg font-semibold text-foreground tracking-tight">
              Juragan Kasir
            </span>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center bg-muted rounded-full p-0.5 border border-border">
                <button
                  type="button"
                  onClick={() => updateTranslation("id")}
                  aria-pressed={translation === "id"}
                  className={`px-2.5 py-1 md:px-3 md:py-1 text-xs font-bold tracking-widest rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    translation === "id"
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => updateTranslation("en")}
                  aria-pressed={translation === "en"}
                  className={`px-2.5 py-1 md:px-3 md:py-1 text-xs font-bold tracking-widest rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    translation === "en"
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  EN
                </button>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t("header.toggleTheme")}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Sun className="w-4 h-4 md:w-5 md:h-5 hidden dark:block" />
                <Moon className="w-4 h-4 md:w-5 md:h-5 block dark:hidden" />
              </button>
              <Button
                type="button"
                variant="link"
                onClick={() => setGuideOpen(true)}
                className="h-auto p-0 font-medium hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors">
                {translationMemo.help}
              </Button>
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="flex-grow flex items-center justify-center px-4 md:px-6 pt-20 pb-8 md:pt-24 md:pb-12">
          <div className="w-full max-w-[480px]">
            {/* Registration Card */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-5 md:p-6 lg:p-xl transition-colors">
              {/* Header */}
              <div className="text-center mb-6 md:mb-xl">
                <h1 className="text-xl md:text-[28px] font-semibold text-foreground mb-1.5 md:mb-sm">
                  {translationMemo.registerTitle}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground/80 font-light">
                  {translationMemo.registerSubtitle}
                </p>
              </div>

              {/* Form */}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => {
                    setIsSubmitting(true);
                    mutateRegister.mutate(values);
                  })}
                  className="space-y-4 md:space-y-5">
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem data-tour="auth-username">
                        <FormLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-[0.1em]">
                          {translationMemo.userName}
                        </FormLabel>
                        <div className="relative group">
                          <User className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground/60 transition-colors pointer-events-none group-focus-within:text-emerald-600" />
                          <Input
                            {...field}
                            placeholder={translationMemo.placeholderUsername}
                            className="w-full pl-10 md:pl-12 pr-3.5 md:pr-4 h-10 text-sm md:text-base rounded-md border-border/60 bg-background focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
                            maxLength={FIELD_LIMITS.SHORT_LABEL}
                          />
                        </div>
                        {form?.formState?.errors?.userName && (
                          <FormMessage>{form?.formState?.errors?.userName}</FormMessage>
                        )}
                        <FormDescription>{t("common.passwordMin4")}</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-[0.1em]">
                          {translationMemo.email}
                        </FormLabel>
                        <div className="relative group">
                          <Mail className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground/60 transition-colors pointer-events-none group-focus-within:text-emerald-600" />
                          <Input
                            {...field}
                            placeholder={translationMemo.placeholderEmail}
                            className="w-full pl-10 md:pl-12 pr-3.5 md:pr-4 h-10 text-sm md:text-base rounded-md border-border/60 bg-background focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
                            maxLength={FIELD_LIMITS.EMAIL}
                          />
                        </div>
                        {form?.formState?.errors?.email && (
                          <FormMessage>{form?.formState?.errors?.email}</FormMessage>
                        )}
                        <FormDescription>{t("common.emailHint")}</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="store"
                    render={({ field }) => (
                      <FormItem data-tour="auth-location">
                        <FormLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-[0.1em]">
                          {translationMemo.location}
                        </FormLabel>
                        <div className="relative group">
                          <MapPin className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground/60 transition-colors group-focus-within:text-emerald-600 pointer-events-none z-10" />
                          <Combobox
                            options={locations.map((loc) => ({
                              value: loc._id || loc.id,
                              label: loc.location_name || loc.name || loc
                            }))}
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder={translationMemo.selectLocation}
                            searchPlaceholder={t("common.search.location")}
                          />
                        </div>
                        {form?.formState?.errors?.store && (
                          <FormMessage>{form?.formState?.errors?.store}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />

                  {noLocationsAvailable && (
                    <div className="bg-warning/50 border border-warning/20 rounded-lg p-4 mt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <h3 className="font-medium text-warning">
                            {t("page.register.noLocationTitle")}
                          </h3>
                          <p className="text-sm text-warning/80">
                            {t("page.register.noLocationDescription")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    data-tour="auth-password"
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-[0.1em]">
                            {translationMemo.password}
                          </FormLabel>
                          <div className="relative group">
                            <Lock className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground/60 transition-colors pointer-events-none group-focus-within:text-emerald-600" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              {...field}
                              placeholder={translationMemo.placeholderPassword}
                              className="w-full pl-10 md:pl-12 pr-10 md:pr-12 h-10 text-sm md:text-base rounded-md border-border/60 bg-background focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={t(
                                showPassword ? "page.login.hidePassword" : "page.login.showPassword"
                              )}
                              className="absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors">
                              {showPassword ? (
                                <EyeOff className="w-4 h-4 md:w-5 md:h-5" />
                              ) : (
                                <Eye className="w-4 h-4 md:w-5 md:h-5" />
                              )}
                            </button>
                          </div>
                          {form?.formState?.errors?.password && (
                            <FormMessage>{form?.formState?.errors?.password}</FormMessage>
                          )}
                          <FormDescription>{t("common.passwordMin6")}</FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-[0.1em]">
                            {translationMemo.confirmationPassword}
                          </FormLabel>
                          <div className="relative group">
                            <Lock className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground/60 transition-colors pointer-events-none group-focus-within:text-emerald-600" />
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              {...field}
                              placeholder={translationMemo.placeholderConfirmation}
                              className="w-full pl-10 md:pl-12 pr-10 md:pr-12 h-10 text-sm md:text-base rounded-md border-border/60 bg-background focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              aria-label={t(
                                showConfirmPassword
                                  ? "page.login.hidePassword"
                                  : "page.login.showPassword"
                              )}
                              className="absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors">
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4 md:w-5 md:h-5" />
                              ) : (
                                <Eye className="w-4 h-4 md:w-5 md:h-5" />
                              )}
                            </button>
                          </div>
                          {form?.formState?.errors?.confirmPassword && (
                            <FormMessage>{form?.formState?.errors?.confirmPassword}</FormMessage>
                          )}
                          <FormDescription>{t("common.passwordMatch")}</FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-sm">
                    <Button
                      variant="success"
                      type="submit"
                      data-tour="auth-submit"
                      disabled={noLocationsAvailable}
                      disabledReason={t("page.register.noLocationDescription")}
                      className="w-full h-10 bg-foreground text-background hover:bg-foreground/90 rounded-md font-semibold text-sm md:text-base shadow-sm transition-colors">
                      {translationMemo.btnCreateAcc}
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Footer Links */}
              <div className="mt-6 md:mt-xl text-center space-y-3 md:space-y-md">
                <p className="text-xs md:text-sm text-muted-foreground">
                  {translationMemo.alreadyHaveAccount}{" "}
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => navigate("/")}
                    className="h-auto p-0 font-medium text-foreground font-semibold hover:underline">
                    {translationMemo.login}
                  </Button>
                </p>
                <div className="flex items-center justify-center gap-1.5 md:gap-2">
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {translationMemo.enterpriseSecure}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Banner - Desktop Only */}
            {/* <div className="mt-4 md:mt-lg hidden md:block">
              <div className="relative w-full h-[120px] rounded-xl overflow-hidden shadow-sm border border-border bg-muted">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent flex items-center px-4 md:px-lg">
                  <p className="text-sm md:text-base font-medium text-foreground/80">
                    Siap kelola toko Anda hari ini.
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-card border-t border-border mt-auto transition-colors">
          <div className="w-full py-4 md:py-xl px-4 md:px-6 lg:px-lg flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-3 md:gap-md">
            <div className="flex flex-col items-center md:items-start gap-1">
              <span className="text-sm md:text-base font-semibold text-foreground tracking-tight">
                Juragan Kasir
              </span>
              <span className="text-xs md:text-sm text-muted-foreground">
                {t("page.login.copyright", { year: new Date().getFullYear() })}
              </span>
            </div>
            <div className="flex gap-4 md:gap-lg">
              <Button
                type="button"
                variant="link"
                onClick={() => setPrivacyOpen(true)}
                className="h-auto p-0 font-medium text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                {translationMemo.privacyPolicy}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => setTermsOpen(true)}
                className="h-auto p-0 font-medium text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                {translationMemo.termsConditions}
              </Button>
            </div>
          </div>
        </footer>
      </div>

      <PolicyDialog type="privacy" open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <PolicyDialog type="terms" open={termsOpen} onOpenChange={setTermsOpen} />
      <AuthGuideModal open={guideOpen} onOpenChange={setGuideOpen} context="register" />
      {isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default RegisterPage;

/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Moon, Sun, Mail, Lock, ArrowRight, HelpCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "react-query";
import { useCookies } from "react-cookie";
import { toast } from "sonner";

import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";

import { login } from "@/services/auth";
import {
  consumeSessionNotice,
  isSessionEnding,
  sessionNavigation,
  SESSION_END_REASON
} from "@/services/session";
import { translationSelect } from "@/state/translation";
import { useThemeStore } from "@/state/theme";
import { useThemeEffect } from "@/hooks/useThemeEffect";
import { getRoleDashboard } from "@/utils/role";
import AuthGuideModal from "@/components/organism/AuthGuideModal";
import { isPublicRegistrationEnabled } from "@/utils/publicRegistration";
import logoFull from "@/assets/logo-full.webp";
import logoFullDark from "@/assets/logo-full-dark.webp";

const LoginPage = () => {
  const { t, ready } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [_, setCookie] = useCookies();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [guideOpen, setGuideOpen] = useState(
    location.state?.openGuide && location.state?.guideContext === "login"
  );
  const { translation, updateTranslation } = translationSelect();
  const { toggleTheme } = useThemeStore();
  useThemeEffect();

  useEffect(() => {
    if (location.state?.openGuide) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Why the previous session ended (logout / expired), left by the session
  // boundary before its page reload. Read once, shown once translations load.
  const [sessionNotice, setSessionNotice] = useState(null);
  useEffect(() => {
    const reason = consumeSessionNotice();
    if (reason) setSessionNotice(reason);
  }, []);
  useEffect(() => {
    if (!sessionNotice || !ready) return;
    if (sessionNotice === SESSION_END_REASON.EXPIRED) {
      toast.error("Sesi Berakhir", {
        id: "session-end-notice",
        description: "Sesi login Anda telah berakhir. Silakan login kembali untuk melanjutkan."
      });
    } else if (sessionNotice === SESSION_END_REASON.LOGOUT) {
      toast.success(t("header.logoutSuccessTitle"), { id: "session-end-notice" });
    }
    setSessionNotice(null);
  }, [sessionNotice, ready, t]);

  const translationMemo = useMemo(
    () => ({
      title: t("translation:login"),
      userName: t("translation:userNameOrEmail"),
      password: t("translation:password"),
      btnLogin: t("translation:btnLogin"),
      descAuth: t("translation:descAuth"),
      placeholderInputUser: t("translation:placeholder.input.login.username"),
      placeholderInputPassword: t("translation:placeholder.input.login.password"),
      errorMessageUserName: t("translation:formError.input.login.username"),
      errorMessagePassword: t("translation:formError.input.login.password"),
      rememberMe: t("translation:rememberMe"),
      forgotPassword: t("translation:forgotPassword"),
      noAccount: t("translation:noAccount"),
      registerNow: t("translation:registerNow"),
      help: t("translation:help")
    }),
    [t]
  );

  const formSchema = useMemo(() => {
    return z.object({
      userName: z.string().min(1, {
        message: translationMemo.errorMessageUserName
      }),
      password: z.string().min(1, {
        message: translationMemo.errorMessagePassword
      })
    });
  }, [translationMemo]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: "",
      password: ""
    }
  });

  const mutateLogin = useMutation(login, {
    onMutate: () => setIsLoading(true),
    onSuccess: (success) => {
      // A response landing while a session is ending must not write credentials.
      if (isSessionEnding()) return;
      setCookie("token", success.token, { path: "/" });
      const user = { ...success.user };
      if (typeof user.accessMenu === "string") {
        try {
          user.accessMenu = JSON.parse(user.accessMenu);
        } catch (e) {
          user.accessMenu = [];
        }
      }
      try {
        sessionStorage.setItem("user", JSON.stringify(user));
      } catch (e) {}
      // ponytail: strip accessMenu to fit 4KB cookie limit, canAccess falls back to sessionStorage
      const { accessMenu, ...userSlim } = user;
      setCookie("user", userSlim, { path: "/" });
      setIsLoading(false);
      setTimeout(() => {
        toast.success(t("page.login.toast.success"), {
          description: t("page.login.toast.successDescription")
        });
      }, 1000);
      // Full page load, not router navigation: the app boots fresh for the new
      // user — StoreProvider and SocketProvider read the new cookies/token and
      // the query cache starts empty.
      setTimeout(() => {
        const role = success.user?.roleType;
        sessionNavigation.replace(getRoleDashboard(role));
      }, 2000);
    },
    onError: (err) => {
      setIsLoading(false);
      const message = err.response?.data?.message || err.message;
      setTimeout(() => {
        toast.error(t("page.login.toast.error"), {
          description: message
        });
      }, 1500);
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  });

  const inputClass =
    "w-full pl-10 h-11 text-sm rounded-lg border-border bg-background placeholder:text-muted-foreground/60 focus-visible:border-emerald-600/60 focus-visible:ring-4 focus-visible:ring-emerald-600/10 focus-visible:ring-offset-0 transition-[border-color,box-shadow]";
  const langButtonClass = (active) =>
    `px-2.5 py-1 text-[11px] font-semibold tracking-wider rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 ${
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex min-h-svh bg-background text-foreground transition-colors duration-300">
      {/* Brand panel (desktop): light tint, not a dark block. Logo, hook, what the product does. */}
      <section className="relative hidden w-1/2 overflow-hidden border-r border-border/60 bg-gradient-to-br from-emerald-50 via-white to-slate-50 lg:flex dark:from-emerald-950/30 dark:via-background dark:to-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-emerald-400/15 blur-3xl"
        />
        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          <img src={logoFull} alt="Juragan Kasir" className="h-auto w-36 dark:hidden" />
          <img src={logoFullDark} alt="Juragan Kasir" className="hidden h-auto w-36 dark:block" />
          <div className="my-auto max-w-md">
            <h2 className="text-balance text-4xl font-semibold leading-[1.15] tracking-tight text-foreground xl:text-5xl">
              {t("page.login.tagline")}
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground">
              {t("page.login.taglineSub")}
            </p>
          </div>
        </div>
      </section>

      {/* Form side */}
      <section className="flex w-full flex-col lg:w-1/2">
        <header className="flex items-center justify-end gap-2 px-5 py-4 md:px-8 md:py-5">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{translationMemo.help}</span>
          </button>
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => updateTranslation("id")}
              className={langButtonClass(translation === "id")}>
              ID
            </button>
            <button
              type="button"
              onClick={() => updateTranslation("en")}
              className={langButtonClass(translation === "en")}>
              EN
            </button>
          </div>
          <button
            type="button"
            aria-label={t("header.toggleTheme")}
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30">
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="block h-4 w-4 dark:hidden" />
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-12 md:px-10">
          <div className="w-full max-w-sm">
            {/* Mobile: compact brand, the form stays above the fold */}
            <div className="mb-8 lg:hidden">
              <img src={logoFull} alt="Juragan Kasir" className="h-auto w-24 dark:hidden" />
              <img
                src={logoFullDark}
                alt="Juragan Kasir"
                className="hidden h-auto w-24 dark:block"
              />
              <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {t("page.login.tagline")}
              </p>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {t("page.login.heading")}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{translationMemo.descAuth}</p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => mutateLogin.mutate(values))}
                className="space-y-4">
                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem data-tour="auth-username">
                      <FormLabel className="text-sm font-medium text-foreground">
                        {translationMemo.userName}
                      </FormLabel>
                      <div className="group relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 transition-colors group-focus-within:text-emerald-600" />
                        <Input
                          {...field}
                          placeholder={translationMemo.placeholderInputUser}
                          autoComplete="username"
                          className={`${inputClass} pr-3.5`}
                        />
                      </div>
                      {form?.formState?.errors?.userName && (
                        <FormMessage>{form?.formState?.errors?.userName}</FormMessage>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem data-tour="auth-password">
                      <FormLabel className="text-sm font-medium text-foreground">
                        {translationMemo.password}
                      </FormLabel>
                      <div className="group relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 transition-colors group-focus-within:text-emerald-600" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          {...field}
                          placeholder={translationMemo.placeholderInputPassword}
                          autoComplete="current-password"
                          className={`${inputClass} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={t(
                            showPassword ? "page.login.hidePassword" : "page.login.showPassword"
                          )}
                          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {form?.formState?.errors?.password && (
                        <FormMessage>{form?.formState?.errors?.password}</FormMessage>
                      )}
                    </FormItem>
                  )}
                />

                <div
                  data-tour="auth-options"
                  className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                    />
                    <Label
                      htmlFor="remember-me"
                      className="cursor-pointer text-sm font-normal text-muted-foreground">
                      {translationMemo.rememberMe}
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/reset-password")}
                    className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400">
                    {translationMemo.forgotPassword}
                  </button>
                </div>

                <Button
                  type="submit"
                  data-tour="auth-submit"
                  className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90">
                  <span>{translationMemo.btnLogin}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </form>
            </Form>

            <div className="mt-8 border-t border-border/60 pt-6">
              {isPublicRegistrationEnabled() ? (
                <p className="text-sm text-muted-foreground">
                  {translationMemo.noAccount}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="ml-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                    {translationMemo.registerNow}
                  </button>
                </p>
              ) : (
                // D-08: accounts come from the store owner, not self sign-up.
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("page.login.accountFromOwner")}
                </p>
              )}
            </div>
          </div>
        </main>

        <footer className="px-5 pb-5 md:px-8">
          <p className="text-center text-xs text-muted-foreground/70">
            {t("page.login.copyright", { year: new Date().getFullYear() })}
          </p>
        </footer>
      </section>

      <AuthGuideModal open={guideOpen} onOpenChange={setGuideOpen} context="login" />

      {isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default LoginPage;

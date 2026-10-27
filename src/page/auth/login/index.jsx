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

  return (
    <div>
      <main className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Top Controls */}
        <header className="absolute top-0 right-0 left-0 z-50 flex items-center justify-end px-4 py-4 md:px-6 md:py-5 lg:px-lg">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-white/70 dark:bg-foreground/10 backdrop-blur-md rounded-full p-0.5 border border-border/30 shadow-sm">
              <button
                type="button"
                onClick={() => updateTranslation("id")}
                className={`px-2.5 py-1 md:px-3 md:py-1 text-[10px] md:text-[11px] font-bold tracking-widest rounded-full transition-all duration-200 focus:outline-none ${
                  translation === "id"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                ID
              </button>
              <button
                type="button"
                onClick={() => updateTranslation("en")}
                className={`px-2.5 py-1 md:px-3 md:py-1 text-[10px] md:text-[11px] font-bold tracking-widest rounded-full transition-all duration-200 focus:outline-none ${
                  translation === "en"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                EN
              </button>
            </div>
            {/* Theme Toggle */}
            <button
              type="button"
              aria-label={t("header.toggleTheme")}
              onClick={toggleTheme}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white/70 dark:bg-foreground/10 backdrop-blur-md text-muted-foreground hover:text-foreground rounded-full border border-border/30 shadow-sm transition-all duration-200 focus:outline-none">
              <Sun className="w-4 h-4 md:w-5 md:h-5 hidden dark:block" />
              <Moon className="w-4 h-4 md:w-5 md:h-5 block dark:hidden" />
            </button>
          </div>
        </header>

        {/* Left Side: Brand Visual */}
        <section className="hidden lg:flex lg:w-1/2 h-screen sticky top-0 overflow-hidden bg-foreground">
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,#1e293b_0%,#0f172a_55%,#020617_100%)]" />
            <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] bg-[size:44px_44px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-white px-lg">
            <div className="max-w-md text-center">
              {/* Panel is always dark: the logo variant with the white wordmark. */}
              <img
                src={logoFullDark}
                alt="Juragan Kasir"
                className="block w-64 xl:w-72 h-auto mx-auto mb-6"
              />
              <div className="w-12 h-0.5 bg-white/30 mx-auto mb-6" />
              <h2 className="text-lg xl:text-xl leading-relaxed mb-4 font-light text-white/80">
                Kelola seluruh operasional restoran — kasir, stok, dan laporan.
              </h2>
              <p className="text-sm xl:text-base text-white/50 font-light leading-relaxed max-w-sm mx-auto">
                Ledger operasional yang bisa Anda lihat menembus: angka yang tepat, dalam satu
                aplikasi.
              </p>
            </div>
          </div>
        </section>

        {/* Right Side: Login Form */}
        <section className="w-full lg:w-1/2 flex items-center justify-center px-5 py-24 md:px-10 md:py-28 lg:px-xl bg-background relative min-h-svh">
          <div className="w-full max-w-sm mx-auto">
            {/* Mobile Branding */}
            <div className="lg:hidden mb-8 md:mb-10 text-center">
              <img
                src={logoFull}
                alt="Juragan Kasir"
                className="w-44 md:w-52 h-auto mx-auto dark:hidden"
              />
              <img
                src={logoFullDark}
                alt="Juragan Kasir"
                className="w-44 md:w-52 h-auto mx-auto hidden dark:block"
              />
            </div>

            <div className="mb-8">
              <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-foreground mb-2">
                {translationMemo.title}
              </h1>
              <p className="text-sm text-muted-foreground">{translationMemo.descAuth}</p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => mutateLogin.mutate(values))}
                className="space-y-4 md:space-y-5">
                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem data-tour="auth-username">
                      <FormLabel className="text-sm font-medium text-foreground">
                        {translationMemo.userName}
                      </FormLabel>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
                        <Input
                          {...field}
                          placeholder={translationMemo.placeholderInputUser}
                          autoComplete="username"
                          className="w-full pl-10 pr-3.5 h-11 text-sm rounded-lg border-input bg-background shadow-sm placeholder:text-muted-foreground/70 focus-visible:border-foreground/40 focus-visible:ring-4 focus-visible:ring-foreground/10 focus-visible:ring-offset-0 transition-[border-color,box-shadow]"
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
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          {...field}
                          placeholder={translationMemo.placeholderInputPassword}
                          autoComplete="current-password"
                          className="w-full pl-10 pr-11 h-11 text-sm rounded-lg border-input bg-background shadow-sm placeholder:text-muted-foreground/70 focus-visible:border-foreground/40 focus-visible:ring-4 focus-visible:ring-foreground/10 focus-visible:ring-offset-0 transition-[border-color,box-shadow]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={t(
                            showPassword ? "page.login.hidePassword" : "page.login.showPassword"
                          )}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
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
                  className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                    />
                    <Label
                      htmlFor="remember-me"
                      className="text-sm text-muted-foreground cursor-pointer font-normal">
                      {translationMemo.rememberMe}
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/reset-password")}
                    className="text-sm text-foreground font-medium underline-offset-4 hover:underline">
                    {translationMemo.forgotPassword}
                  </button>
                </div>

                <Button
                  type="submit"
                  data-tour="auth-submit"
                  className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-medium text-sm shadow-sm transition-colors flex items-center justify-center gap-2">
                  <span>{translationMemo.btnLogin}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </Form>

            <div className="pt-6 md:pt-8 text-center">
              {isPublicRegistrationEnabled() ? (
                <p className="text-xs md:text-sm text-muted-foreground/70">
                  {translationMemo.noAccount}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-foreground font-semibold hover:underline ml-1">
                    {translationMemo.registerNow}
                  </button>
                </p>
              ) : (
                // D-08: accounts come from the store owner, not self sign-up.
                <p className="text-xs md:text-sm text-muted-foreground/70">
                  {t("page.login.accountFromOwner")}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Support */}
      <div className="fixed bottom-4 md:bottom-lg right-4 md:right-lg z-50">
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="flex items-center gap-1.5 md:gap-sm px-3.5 py-2.5 md:px-5 md:py-3 bg-white/80 dark:bg-foreground/10 backdrop-blur-md rounded-full shadow-lg border border-border/20 text-muted-foreground hover:text-foreground transition-all group">
          <HelpCircle className="w-4 h-4 md:w-[18px] md:h-[18px] group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] md:text-xs font-medium tracking-wide">
            {translationMemo.help}
          </span>
        </button>
      </div>
      <AuthGuideModal open={guideOpen} onOpenChange={setGuideOpen} context="login" />

      {isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}
    </div>
  );
};

export default LoginPage;

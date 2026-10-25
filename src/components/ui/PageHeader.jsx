import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Briefcase, CalendarDays, Store, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserSession } from "@/hooks/useUserSession";
import { useStore } from "@/contexts/StoreContext";
import { getDashboardHref } from "@/utils/role";

const PageHeader = ({
  breadcrumbs = [],
  title,
  description,
  children,
  backLink,
  onBack,
  dynamicInfo = true
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useUserSession();

  let store;
  try {
    store = useStore();
  } catch {
    store = null;
  }

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    if (backLink) navigate(resolveHref(backLink));
  };

  const resolveHref = (href) => (href === "/dashboard-super-admin" ? getDashboardHref(user) : href);

  const fullName = user?.fullName || user?.userName || "";
  const roleName = user?.roleName || user?.roleType || "";
  const positionName = user?.positionName || "";
  const storeName = store?.activeStoreName || user?.storeName || "";

  const dynamicDescription =
    fullName || roleName
      ? [t("pageHeader.greeting", { defaultValue: "Selamat datang" }), fullName, roleName]
          .filter(Boolean)
          .join(", ")
      : "";

  const todayLabel = new Date().toLocaleDateString(user?.locale || "id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const showMeta = dynamicInfo;

  return (
    <header className="space-y-4">
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={(crumb.i18nKey || crumb.label) + i}>
              {i > 0 && <span className="text-xs">/</span>}
              {crumb.href ? (
                <button
                  onClick={() => navigate(resolveHref(crumb.href))}
                  className="hover:text-foreground transition-colors whitespace-nowrap">
                  {crumb.i18nKey ? t(crumb.i18nKey) : crumb.label}
                </button>
              ) : (
                <span
                  aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}
                  className={
                    i === breadcrumbs.length - 1
                      ? "text-primary font-semibold whitespace-nowrap"
                      : "whitespace-nowrap"
                  }>
                  {crumb.i18nKey ? t(crumb.i18nKey) : crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* ponytail: tampil bila salah satu ada — halaman form sering hanya
              mengoper onBack (modal konfirmasi batal) tanpa backLink */}
          {(backLink || onBack) && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label={t("common.back", { defaultValue: "Kembali" })}
              title={t("common.back", { defaultValue: "Kembali" })}
              onClick={handleBack}>
              <ArrowLeft size={16} aria-hidden="true" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            ) : dynamicDescription ? (
              <p className="text-sm text-muted-foreground mt-1">{dynamicDescription}</p>
            ) : null}
            {showMeta && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {roleName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium capitalize">
                    <Tag size={11} />
                    {roleName}
                  </span>
                )}
                {positionName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                    <Briefcase size={11} />
                    {positionName}
                  </span>
                )}
                {storeName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                    <Store size={11} />
                    {storeName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground capitalize">
                  <CalendarDays size={11} />
                  {todayLabel}
                </span>
              </div>
            )}
          </div>
        </div>
        {children && (
          // Actions wrap onto another row instead of scrolling behind a hidden
          // scrollbar: on a tablet the clipped last button (often "Tambah …")
          // was unreachable unless the user guessed to swipe the header.
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">{children}</div>
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;

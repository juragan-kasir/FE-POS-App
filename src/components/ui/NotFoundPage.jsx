import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { StatusScreen } from "@/components/ui/status-screen";
import { LANDING_PATH } from "@/constants/routes";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { readActiveSessionRole } from "@/lib/active-session";
import { isLocaleLoaded } from "@/lib/locale-loaded";
import { getRoleDashboard } from "@/utils/role";

const INITIAL_LOCATION_KEY = "default";

const NotFoundPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [cookies] = useCookies();
  const role = readActiveSessionRole(cookies.user);
  const canGoBack = location.key !== INITIAL_LOCATION_KEY;
  useDocumentMeta({
    title: t("component.notFoundPage.ui.metaTitle"),
    description: t("component.notFoundPage.ui.description"),
    language: i18n.language
  });

  if (!isLocaleLoaded(i18n.language)) return <PageLoader isFullScreen />;

  return (
    <StatusScreen
      isFullScreen
      mark={<p className="text-7xl font-bold text-muted-foreground/30">404</p>}
      title={t("component.notFoundPage.ui.pageNotFound")}
      description={t("component.notFoundPage.ui.description")}>
      {canGoBack && (
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-1.5" /> {t("common.back")}
        </Button>
      )}
      <Link to={role ? getRoleDashboard(role) : LANDING_PATH} className={buttonVariants()}>
        {t(role ? "component.requireRole.ui.goToMyDashboard" : "page.login.backToHome")}
      </Link>
    </StatusScreen>
  );
};

export default NotFoundPage;

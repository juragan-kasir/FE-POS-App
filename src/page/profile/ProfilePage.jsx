import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Shield,
  Store,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/PageHeader";
import EditProfileModal from "@/components/organism/edit-profile-modal";
import { dateLocale } from "@/lib/locale";
import { readRememberedUser } from "@/lib/remembered-session";

const readStoredUser = () => {
  let session = null;
  try {
    const stored = sessionStorage.getItem("user");
    session = stored ? JSON.parse(stored) : null;
  } catch {
    session = null;
  }
  return session || readRememberedUser();
};

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const initialUser = useMemo(() => readStoredUser(), []);
  const [user, setUser] = useState(initialUser);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/home")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  // AUTH-1: separate account enablement (disabledAt) from presence (status)
  const isAccountEnabled = !user.disabledAt && !user.deletedAt;
  const isPresenceActive = user.status === "active";
  const statusActive = isPresenceActive;
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(dateLocale(), {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { i18nKey: "page.profile.title" }
        ]}
        title={t("page.profile.title")}
      />

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32" />
        <div className="relative">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-muted">
            {user.image ? (
              <img src={user.image} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-4xl font-bold">
                {(user.fullName || user.userName || "?").charAt(0)}
              </div>
            )}
          </div>
          <div
            className={`absolute -bottom-2 -right-2 p-1 rounded-full border-2 border-background ${
              !isAccountEnabled
                ? "bg-red-500"
                : statusActive
                  ? "bg-green-500"
                  : "bg-muted-foreground"
            }`}>
            {isAccountEnabled && statusActive ? (
              <CheckCircle2 size={14} className="text-white" />
            ) : (
              <XCircle size={14} className="text-white" />
            )}
          </div>
        </div>
        <div className="flex-1 space-y-1 relative">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-bold text-foreground">{user.fullName || user.userName}</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                !isAccountEnabled
                  ? "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                  : statusActive
                    ? "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                    : "bg-muted text-muted-foreground border border-border"
              }`}>
              {!isAccountEnabled
                ? t("common.disabled") || "Disabled"
                : statusActive
                  ? t("common.active")
                  : t("common.inactive")}
            </span>
          </div>
          <p className="text-muted-foreground">
            {user.positionName || user.position || "-"}
            <span className="mx-2">&bull;</span>
            {t("page.profile.ui.id")} {user.employeeID || user.id || "-"}
          </p>
          <div className="flex gap-4 pt-2 flex-wrap">
            {user.storeName && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Store size={14} />
                <span>{user.storeName}</span>
              </div>
            )}
            {user.startDate && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar size={14} />
                <span>
                  {t("page.profile.joined")} {formatDate(user.startDate)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto relative">
          <Button variant="outline" className="gap-2" onClick={() => setEditModalOpen(true)}>
            <User size={16} />
            {t("page.profile.editProfile")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold">{t("page.profile.basicInfo")}</h4>
              <User size={16} className="text-muted-foreground" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.email")}
                </p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Mail size={14} className="text-muted-foreground shrink-0" />
                  {user.email || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.phone")}
                </p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground shrink-0" />
                  {user.phoneNumber || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.address")}
                </p>
                <p className="text-sm text-foreground flex items-start gap-2">
                  <MapPin size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  {user.address || "-"}
                </p>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.department")}
                </p>
                <p className="text-sm text-foreground">{user.department || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.gender")}
                </p>
                <p className="text-sm text-foreground">{user.gender || "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold">{t("page.profile.account")}</h4>
              <Shield size={16} className="text-muted-foreground" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.username")}
                </p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <User size={14} className="text-muted-foreground shrink-0" />
                  {user.userName || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.role")}
                </p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Shield size={14} className="text-muted-foreground shrink-0" />
                  {user.roleName || user.roleType || "user"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.type")}
                </p>
                <p className="text-sm text-foreground">{user.userType || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <h4 className="text-base font-semibold mb-4">{t("page.profile.jobInfo")}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.employeeId")}
                </p>
                <p className="text-sm font-mono font-bold text-primary">{user.employeeID || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.position")}
                </p>
                <p className="text-sm text-foreground">
                  {user.positionName || user.position || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.store")}
                </p>
                <p className="text-sm text-foreground">{user.storeName || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.employmentType")}
                </p>
                <p className="text-sm text-foreground">{user.employmentType || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.shift")}
                </p>
                <p className="text-sm text-foreground">{user.shift || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("page.profile.startDate")}
                </p>
                <p className="text-sm text-foreground">{formatDate(user.startDate)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {t("page.profile.placeOfBirth")}
                </p>
                <p className="text-lg font-bold text-foreground">{user.placeOfBirth || "-"}</p>
              </div>
              <MapPin className="absolute -right-4 -bottom-4 text-5xl text-primary/5" />
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {t("page.profile.dateOfBirth")}
                </p>
                <p className="text-lg font-bold text-foreground">{formatDate(user.dateOfBirth)}</p>
              </div>
              <Calendar className="absolute -right-4 -bottom-4 text-5xl text-primary/5" />
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {t("page.profile.status")}
                </p>
                <p
                  className={`text-lg font-bold flex items-center gap-1 ${!isAccountEnabled ? "text-red-600" : statusActive ? "text-green-600" : "text-red-600"}`}>
                  {!isAccountEnabled ? (
                    <XCircle size={18} />
                  ) : statusActive ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                  {!isAccountEnabled
                    ? t("common.disabled") || "Disabled"
                    : statusActive
                      ? t("common.active")
                      : t("common.inactive")}
                </p>
                {!isAccountEnabled && (
                  <p className="text-xs text-red-600 mt-1">
                    {t("page.profile.ui.accountDeactivated")}
                  </p>
                )}
              </div>
              <Shield className="absolute -right-4 -bottom-4 text-5xl text-primary/5" />
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={user}
        onSuccess={setUser}
      />
    </div>
  );
};

export default ProfilePage;

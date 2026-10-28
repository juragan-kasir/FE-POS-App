// ponytail: CSS peta jadi konstanta modul — hindari heuristik XSS "HTML di dalam fungsi"
const LEAFLET_Z_STYLES = `
  .leaflet-pane { z-index: 1; }
  .leaflet-top, .leaflet-bottom { z-index: 2; }
`;
/* eslint-disable no-constant-binary-expression */
import React from "react";
import { useQuery } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  Globe,
  Edit3,
  Building2,
  Hash,
  CheckCircle2,
  XCircle,
  Image,
  Navigation,
  User,
  Layers,
  Map,
  Info,
  ShieldCheck,
  History,
  Smartphone
} from "lucide-react";
import { getLocationDetail } from "@/services/location";
import {
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
  getPostalCode
} from "@/services/general";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import { dateLocale } from "@/lib/locale";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const dayLabels = {
  monday: "Senin",
  tuesday: "Selasa",
  wednesday: "Rabu",
  thursday: "Kamis",
  friday: "Jumat",
  saturday: "Sabtu",
  sunday: "Minggu"
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={18} className="text-muted-foreground" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5 break-words">{value || "-"}</p>
    </div>
  </div>
);

const StatusBadge = ({ isActive, t }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${
      isActive
        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
    }`}>
    {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
    {isActive ? t("page.location.detail.active") : t("page.location.detail.inactive")}
  </span>
);

const FormattedOpeningHours = ({ openingHours, t }) => {
  if (!openingHours || openingHours.length === 0) {
    return (
      <p className="text-sm text-foreground italic">
        {t("page.location.detail.noOperationalHours")}
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {openingHours.map((oh) => (
        <div key={oh.day} className="flex items-center justify-between py-1.5">
          <span className="text-sm font-medium text-foreground w-24">
            {dayLabels[oh.day] || oh.day}
          </span>
          {oh.is24Hours ? (
            <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1 rounded-lg">
              {t("page.location.detail.is24Hours")}
            </span>
          ) : oh.open && oh.close ? (
            <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1 rounded-lg">
              {oh.open} - {oh.close}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60 italic bg-muted/50 px-3 py-1 rounded-lg">
              {t("page.location.detail.closed")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between pb-3 border-b border-border">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
        <Icon size={18} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
    {action}
  </div>
);

const LocationDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useQuery(
    ["location-detail", id],
    () => getLocationDetail({ id }),
    {
      enabled: !!id
    }
  );

  const location = data?.data || data?.location || data;

  const { data: provinces } = useQuery(["provinces"], getProvinces, {
    enabled: !!location
  });

  const { data: cities } = useQuery(
    ["cities", location?.province],
    () => getCities(location.province),
    { enabled: !!location?.province }
  );

  const { data: districts } = useQuery(
    ["districts", location?.city],
    () => getDistricts(location.city),
    { enabled: !!location?.city }
  );

  const { data: villages } = useQuery(
    ["villages", location?.district],
    () => getVillages(location.district),
    { enabled: !!location?.district }
  );

  const { data: postalCodes } = useQuery(
    ["postal-codes", location?.village],
    () => getPostalCode(location.village),
    { enabled: !!location?.village }
  );

  const provinceName =
    provinces?.find((p) => p.kode_prov === location?.province)?.nama_provinsi || location?.province;
  const cityName =
    cities?.find((c) => c.kode_kab === location?.city)?.nama_kabupaten || location?.city;
  const districtName =
    districts?.find((d) => d.kode_kec === location?.district)?.nama_kecamatan || location?.district;
  const villageName =
    villages?.find((v) => v.kode_desa === location?.village)?.nama_desa || location?.village;
  const postalCodeValue = postalCodes?.[0]?.kode_pos || location?.postalCode;

  const isActive = location?.isActive ?? location?.status === "active" ?? true;

  const lat = location?.latitude ?? location?.coordinates?.lat ?? null;
  const lng = location?.longitude ?? location?.coordinates?.lng ?? null;
  const hasCoordinates = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : null;

  if (isError) return <AbortController refetch={refetch} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {[...Array(4)].map((_, s) => (
                  <div key={s} className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-border">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-5 w-36" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      {[...Array(s === 1 ? 2 : 4)].map((_, r) => (
                        <div key={r} className="flex items-start gap-3 py-3 border-b border-border">
                          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                        </div>
                      ))}
                    </div>
                    {s === 2 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        {[...Array(5)].map((_, r) => (
                          <div
                            key={r}
                            className="flex items-start gap-3 py-3 border-b border-border">
                            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-4 w-36" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {s === 3 && (
                      <div className="bg-muted/20 rounded-lg p-4 border border-border space-y-2">
                        {[...Array(7)].map((_, d) => (
                          <div key={d} className="flex items-center justify-between py-1.5">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-24 rounded" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                  <Skeleton className="h-80 w-full rounded-lg" />
                </div>
              </div>
              <div className="lg:col-span-1 space-y-6">
                <Skeleton className="h-20 w-full rounded-lg" />
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, r) => (
                        <div
                          key={r}
                          className="flex items-center justify-between py-2 border-b border-border">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-muted/50 p-4 rounded-xl flex items-start gap-3 border border-border">
                    <Skeleton className="h-5 w-5 shrink-0 mt-0.5 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <Store size={40} />
        <p>{t("page.location.detail.locationNotFound")}</p>
        <Button variant="danger" onClick={() => navigate("/location-list")}>
          {t("breadcrumb.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("page.location.list.title"),
            href: "/location-list",
            i18nKey: "page.location.list.title"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={location?.name || "-"}
        description={t("page.location.detail.description")}
        backLink="/location-list"
        dynamicInfo={false}>
        <Button variant="outline" onClick={() => navigate(`/edit-location?id=${id}`)}>
          <Edit3 size={14} className="mr-1.5" />
          {t("common.edit")}
        </Button>
      </PageHeader>

      {/* Main Card */}
      <div className="bg-card rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden">
        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ===== LEFT COLUMN (2/3) ===== */}
            <div className="lg:col-span-2 space-y-8">
              {/* Informasi Toko */}
              <div className="space-y-4">
                <SectionHeader icon={Building2} title={t("page.location.detail.informasiToko")} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <DetailRow
                    icon={Store}
                    label={t("page.location.detail.storeName")}
                    value={location.name}
                  />
                  <DetailRow
                    icon={Hash}
                    label={t("page.location.detail.storeId")}
                    value={location.id}
                  />
                  <DetailRow
                    icon={Layers}
                    label={t("page.location.detail.category")}
                    value={location.category}
                  />
                  <DetailRow
                    icon={User}
                    label={t("page.location.detail.manager")}
                    value={location.managerName}
                  />
                </div>
              </div>

              {/* Kontak */}
              <div className="space-y-4">
                <SectionHeader icon={Smartphone} title={t("page.location.detail.kontak")} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <DetailRow
                    icon={Phone}
                    label={t("page.location.detail.phoneNumber")}
                    value={location.phoneNumber}
                  />
                  <DetailRow
                    icon={Mail}
                    label={t("page.location.detail.email")}
                    value={location.email}
                  />
                </div>
              </div>

              {/* Alamat & Wilayah */}
              <div className="space-y-4">
                <SectionHeader icon={MapPin} title={t("page.location.detail.alamatWilayah")} />
                <div className="space-y-0">
                  <DetailRow
                    icon={MapPin}
                    label={t("page.location.detail.fullAddress")}
                    value={location.address}
                  />
                  <DetailRow
                    icon={Globe}
                    label={t("page.location.detail.detailLocation")}
                    value={location.detailLocation}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <DetailRow
                    icon={Building2}
                    label={t("page.location.detail.province")}
                    value={provinceName}
                  />
                  <DetailRow
                    icon={Building2}
                    label={t("page.location.detail.city")}
                    value={cityName}
                  />
                  <DetailRow
                    icon={Building2}
                    label={t("page.location.detail.district")}
                    value={districtName}
                  />
                  <DetailRow
                    icon={Building2}
                    label={t("page.location.detail.village")}
                    value={villageName}
                  />
                  <DetailRow
                    icon={Hash}
                    label={t("page.location.detail.postalCode")}
                    value={postalCodeValue}
                  />
                </div>
              </div>

              {/* Jam Operasional */}
              <div className="space-y-4">
                <SectionHeader icon={Clock} title={t("page.location.detail.operationalHours")} />
                <div className="bg-muted/20 rounded-lg p-4 border border-border">
                  <FormattedOpeningHours openingHours={location.openingHours} t={t} />
                </div>
              </div>

              {/* Lokasi Peta */}
              <div className="space-y-4">
                <SectionHeader
                  icon={Map}
                  title={t("page.location.detail.mapLocation")}
                  action={
                    hasCoordinates &&
                    googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                        <Navigation size={13} />
                        {t("page.location.detail.openRoute")}
                      </a>
                    )
                  }
                />
                {hasCoordinates ? (
                  <div className="relative z-0 rounded-lg overflow-hidden border border-border">
                    <style>{LEAFLET_Z_STYLES}</style>
                    <MapContainer
                      center={[lat, lng]}
                      zoom={15}
                      style={{ height: "320px", width: "100%" }}
                      scrollWheelZoom={false}
                      dragging={false}
                      touchZoom={false}
                      doubleClickZoom={false}
                      zoomControl={false}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[lat, lng]}>
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">{location.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {location.address}
                            </p>
                            <p className="text-xs mt-1">
                              {lat.toFixed(6)}, {lng.toFixed(6)}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-t border-border text-xs text-muted-foreground">
                      <span>
                        <span className="font-medium">{t("page.location.detail.lat")}:</span>{" "}
                        {lat.toFixed(6)}
                      </span>
                      <span>
                        <span className="font-medium">{t("page.location.detail.lng")}:</span>{" "}
                        {lng.toFixed(6)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 bg-muted/30 rounded-lg border border-dashed border-border">
                    <MapPin size={32} />
                    <p className="text-sm">{t("page.location.detail.noCoordinates")}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/edit-location?id=${id}`)}>
                      {t("page.location.detail.setLocation")}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* ===== RIGHT COLUMN (1/3) ===== */}
            <div className="lg:col-span-1 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive
                        ? "bg-green-600 dark:bg-green-700 text-white"
                        : "bg-red-600 dark:bg-red-900 text-white"
                    }`}>
                    {isActive ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {isActive
                        ? t("page.location.detail.active")
                        : t("page.location.detail.nonActive")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("page.location.detail.operationalStatus")}
                    </p>
                  </div>
                </div>
                <StatusBadge isActive={isActive} t={t} />
              </div>

              {/* Foto Toko */}
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <Image size={18} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.location.detail.storePhoto")}
                  </h3>
                </div>
                {location.image ? (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={location.image}
                      alt={location.name}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/30 p-8 min-h-[200px]">
                    <Image size={48} className="text-muted-foreground mb-3" />
                    <span className="text-sm text-muted-foreground">
                      {t("page.location.detail.noImage")}
                    </span>
                  </div>
                )}
              </div>

              {/* Informasi Tambahan */}
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <Hash size={18} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.location.detail.otherDetails")}
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("page.location.detail.mainBranch")}
                    </span>
                    <span
                      className={`text-xs font-bold ${location.mainBranch ? "text-green-600" : "text-muted-foreground"}`}>
                      {location.mainBranch ? t("common.yes") : t("common.no")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("page.location.detail.dailyTarget")}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {location.dailyTarget
                        ? `Rp ${Number(location.dailyTarget).toLocaleString("id-ID")}`
                        : "-"}
                    </span>
                  </div>
                  {location.managerName && (
                    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("page.location.detail.manager")}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {location.managerName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <Globe size={18} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.location.detail.socialMedia")}
                  </h3>
                </div>
                {location.socialMedia && location.socialMedia.length > 0 ? (
                  <div className="space-y-2">
                    {location.socialMedia.map((sm, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                        <span className="text-sm font-medium text-foreground">{sm.platform}</span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {sm.account}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">-</p>
                )}
              </div>

              {/* Informasi Sistem */}
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <Info size={18} className="text-base" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t("page.location.detail.systemInfo")}
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("page.location.detail.createdAt")}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {location.createdAt
                        ? new Date(location.createdAt).toLocaleDateString(dateLocale(), {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("page.location.detail.updatedAt")}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {location.updatedAt
                        ? new Date(location.updatedAt).toLocaleDateString(dateLocale(), {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("page.location.detail.createdBy")}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {location.createdByUser?.fullName || location.createdByUser?.userName || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("page.location.detail.modifiedBy")}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {location.modifiedByUser?.fullName ||
                        location.modifiedByUser?.userName ||
                        "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Help Cards */}
              <div className="space-y-3">
                <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-3 border border-border">
                  <Info size={18} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {t("page.location.form.validationTitle")}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.location.ui.keepStoreDataUpTo")}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-3 border border-border">
                  <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {t("page.location.form.securityTitle")}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.location.form.securityDesc")}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-3 border border-border">
                  <History size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {t("page.location.form.auditTitle")}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("page.location.form.auditDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetail;

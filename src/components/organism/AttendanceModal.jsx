import React, { useEffect, useState, useCallback } from "react";
import { useMutation } from "react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BadgeCheck, MapPin, Satellite, Lock, Clock3, Loader2, RefreshCcw } from "lucide-react";
import { getTrustedLocation, getAccuracyLevel } from "@/utils/geo";
import { clockAttendance } from "@/services/attendance";
import { cn } from "@/lib/utils";
import { safeGet } from "@/lib/safe-lookup";
import i18next from "i18next";
import { useTranslation } from "react-i18next";

// matrix CSS peta agar konten tetap di atas tile
const LEAFLET_Z_STYLES = `
  .leaflet-pane { z-index: 1; }
  .leaflet-top, .leaflet-bottom { z-index: 2; }
`;

// Fix default marker icon react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const ERROR_MESSAGE = {
  denied:
    "Izin lokasi ditolak. Aktifkan GPS/lokasi di perangkat lalu izinkan akses lokasi, kemudian coba lagi.",
  unavailable: "GPS tidak tersedia di perangkat/browser ini.",
  timeout: "Waktu mendapatkan lokasi habis. Berada di area terbuka lalu tekan Coba Lagi.",
  unreliable:
    "Lokasi tidak dapat dipercaya — kemungkinan GPS simulasi / Fake GPS aktif. Nonaktifkan aplikasi mock location lalu gunakan GPS asli."
};

const LEVEL_LABEL = {
  good: {
    get label() {
      return i18next.t("component.attendanceModal.ui.accurate");
    },
    cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  },
  ok: {
    get label() {
      return i18next.t("component.attendanceModal.ui.fairlyAccurate");
    },
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  },
  poor: {
    get label() {
      return i18next.t("component.attendanceModal.ui.lowAccuracy");
    },
    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  }
};

const zoomForAccuracy = (accuracy) => {
  const a = Math.max(Number(accuracy) || 8, 8);
  const z = Math.round(Math.log2((156543.03 * 60) / a));
  return Math.min(19, Math.max(14, z));
};

const MapController = ({ lat, lng, accuracy }) => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    map.setView([lat, lng], zoomForAccuracy(accuracy), { animate: true });
    return () => clearTimeout(t);
  }, [lat, lng, accuracy, map]);
  return null;
};

const AttendanceModal = ({
  open,
  onOpenChange,
  type = "check-in",
  storeId,
  storeName,
  shiftId,
  shiftName,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState("idle");
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [runKey, setRunKey] = useState(0);

  const isCheckIn = type === "check-in";

  const run = useCallback(async () => {
    setPhase("locating");
    setError(null);
    try {
      const loc = await getTrustedLocation();
      setLocation(loc);
      setPhase("ready");
    } catch (e) {
      setLocation(null);
      setError(e?.code || "unreliable");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLocation(null);
      setError(null);
      run();
    }
  }, [open, runKey]);

  const { mutate, isLoading } = useMutation(
    () =>
      clockAttendance({
        type,
        storeId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        shiftId
      }),
    {
      onSuccess: (data) => {
        toast.success(
          data?.message || (isCheckIn ? "Absen masuk berhasil" : "Absen pulang berhasil")
        );
        onOpenChange(false);
        onSuccess?.(data);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || err?.message || "Gagal melakukan absensi");
      }
    }
  );

  const level = location ? getAccuracyLevel(location.accuracy) : null;
  const levelInfo = level ? safeGet(LEVEL_LABEL, level, null) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        withX
        className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] sm:max-w-none p-0 gap-0 flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold">
              {isCheckIn ? "Absen Masuk" : "Absen Pulang"}
            </DialogTitle>
            <DialogDescription>
              {t("component.attendanceModal.ui.verifyYourLocationWithGps")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-4 px-5 pb-5 overflow-y-auto">
          <div className="relative w-full lg:flex-1 min-h-[45vh] lg:min-h-0 rounded-2xl overflow-hidden border border-border/70 bg-muted/20">
            <style>{LEAFLET_Z_STYLES}</style>
            {phase === "ready" && location ? (
              <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={zoomForAccuracy(location.accuracy)}
                className="h-full w-full z-0"
                scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController
                  lat={location.latitude}
                  lng={location.longitude}
                  accuracy={location.accuracy}
                />
                <Circle
                  center={[location.latitude, location.longitude]}
                  radius={Math.max(location.accuracy, 8)}
                  pathOptions={{
                    color: "#22c55e",
                    fillColor: "#22c55e",
                    fillOpacity: 0.15,
                    weight: 1.5
                  }}
                />
                <Marker position={[location.latitude, location.longitude]}>
                  <Popup>{isCheckIn ? "Titik absen masuk" : "Titik absen pulang"}</Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-muted/20">
                {phase === "locating" && (
                  <>
                    <Loader2 size={28} className="animate-spin text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      {t("component.attendanceModal.ui.gettingGpsLocation")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("component.attendanceModal.ui.severalSamplesAreTakenTo")}
                    </p>
                    <div className="w-full max-w-[260px] space-y-2">
                      <Skeleton className="h-3 w-full rounded-full" />
                      <Skeleton className="h-3 w-2/3 rounded-full" />
                      <Skeleton className="h-3 w-1/2 rounded-full" />
                    </div>
                  </>
                )}
                {phase === "error" && (
                  <>
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Satellite size={24} className="text-destructive/80" />
                    </div>
                    <p className="text-sm font-semibold text-destructive">
                      {t("component.attendanceModal.ui.invalidLocation")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {safeGet(ERROR_MESSAGE, error, ERROR_MESSAGE.unreliable)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock3 size={12} />
                      {t("component.attendanceModal.ui.noAttendanceTimeIsRecorded")}
                    </p>
                    <div className="flex gap-3 pt-1">
                      <Button type="button" variant="danger" onClick={() => onOpenChange(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button type="button" onClick={() => setRunKey((k) => k + 1)}>
                        <RefreshCcw size={14} className="mr-1.5" />
                        {t("common.retry")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-3">
            {(storeName || shiftName) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin size={14} className="shrink-0 text-primary/70" />
                <span className="font-medium text-foreground/90">
                  {storeName || "Kasir"}
                  {shiftName ? ` • ${shiftName}` : ""}
                </span>
              </div>
            )}

            {phase === "ready" && location && (
              <>
                <div className="rounded-2xl border border-border/70 bg-muted/30 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-primary/5">
                    <BadgeCheck size={18} className="text-green-600 shrink-0" />
                    <p className="text-sm font-semibold text-foreground">
                      {t("component.attendanceModal.ui.locationVerified")}
                    </p>
                    <span
                      className={cn(
                        "ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        levelInfo?.cls
                      )}>
                      {levelInfo?.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border/50">
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("component.attendanceModal.ui.latLong")}
                      </p>
                      <p className="mt-0.5 text-[13px] font-mono font-medium text-foreground">
                        {location.latitude.toFixed(6)}
                        <br />
                        {location.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("component.attendanceModal.ui.gpsAccuracy")}
                      </p>
                      <p className="mt-0.5 text-[13px] font-mono font-medium text-foreground">
                        ± {Math.round(location.accuracy)} m
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {location.samples} {t("component.attendanceModal.ui.samplesNoCache")}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock size={12} className="shrink-0 text-green-600" />
                  {t("component.attendanceModal.ui.theLocationIsReadDirectly")}
                </p>

                <div className="mt-auto flex flex-col-reverse sm:flex-row lg:flex-col gap-3 pt-2">
                  <Button type="button" variant="danger" onClick={() => onOpenChange(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    disabled={isLoading}
                    onClick={() => mutate()}
                    className={cn(
                      "w-full lg:w-auto",
                      !isCheckIn && "bg-amber-600 hover:bg-amber-700"
                    )}>
                    {isLoading && <Loader2 size={15} className="mr-1.5 animate-spin" />}
                    {isCheckIn ? "Konfirmasi Absen Masuk" : "Konfirmasi Absen Pulang"}
                  </Button>
                </div>
              </>
            )}

            {phase === "idle" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 size={14} />
                {t("component.attendanceModal.ui.waitingForLocationVerification")}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceModal;

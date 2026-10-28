import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import {
  Printer,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  TestTube,
  Save,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { testPrint, getPrinterStatus, configurePrinter } from "@/services/thermalPrinter";
import PageHeader from "@/components/ui/PageHeader";

const printerTypes = [
  { value: "auto", label: "Otomatis (Disarankan)", icon: "🔍" },
  { value: "network", label: "Jaringan (LAN/WiFi)", icon: "🌐" },
  { value: "usb", label: "USB (Thermal Printer)", icon: "🔌" },
  { value: "bluetooth", label: "Bluetooth (macOS)", icon: "📱" },
  { value: "file", label: "File (Testing)", icon: "📄" }
];

const ThermalPrinterSettings = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const isSuperAdmin = cookie?.user?.roleType === "super_admin";

  const [printerConfig, setPrinterConfig] = useState({
    type: "auto",
    devicePath: "/dev/usb/lp0",
    ipAddress: "",
    port: 9100,
    macAddress: "",
    columns: 32
  });
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastTest, setLastTest] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getPrinterStatus();
      setStatus(data.data);
    } catch (error) {
      console.error("Failed to get printer status:", error);
      setStatus({ connected: false, error: error.message });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      const result = await testPrint(printerConfig);
      setLastTest({ success: true, message: result.message, timestamp: new Date() });
      toast.success(t("page.thermalPrinter.testSuccess"), {
        description: result.message
      });
    } catch (error) {
      setLastTest({ success: false, message: error.message, timestamp: new Date() });
      toast.error(t("page.thermalPrinter.testFailed"), {
        description: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await configurePrinter(printerConfig);
      await fetchStatus();
      toast.success(t("page.thermalPrinter.saved"));
    } catch (error) {
      toast.error(t("page.thermalPrinter.saveFailed"), {
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="p-6 text-center">
        <Printer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("page.thermalPrinter.adminOnly")}</h3>
        <p className="text-muted-foreground">{t("page.thermalPrinter.adminOnlyDesc")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumb.home"), href: "/dashboard-super-admin" },
          { label: t("sidebar.thermalPrinter") }
        ]}
        title={t("sidebar.thermalPrinter")}
        description={t("page.thermalPrinter.description")}
      />

      {/* Status Card */}
      <Card>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("page.thermalPrinter.status")}
          </h2>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={testing}>
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("page.thermalPrinter.connection")}</span>
            <div className="flex items-center gap-2">
              {status?.connected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">
                    {t("page.thermalPrinter.connected")}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600 font-medium">
                    {t("page.thermalPrinter.disconnected")}
                  </span>
                </>
              )}
            </div>
          </div>
          {status?.type && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("page.thermalPrinter.type")}</span>
              <span className="font-medium capitalize">{status.type}</span>
            </div>
          )}
          {status?.devicePath && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("page.thermalPrinter.devicePath")}</span>
              <span className="font-mono text-sm text-muted-foreground">{status.devicePath}</span>
            </div>
          )}
          {status?.ipAddress && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("page.thermalPrinter.ipAddress")}</span>
              <span className="font-mono text-sm text-muted-foreground">
                {status.ipAddress}:{status.port || 9100}
              </span>
            </div>
          )}
          {status?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{status.error}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Configuration Card */}
      <Card>
        <h2 className="font-semibold p-4 border-b">{t("page.thermalPrinter.configuration")}</h2>
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="thermal-printer-settings-type">{t("page.thermalPrinter.type")}</Label>
            <Combobox
              id="thermal-printer-settings-type"
              value={printerConfig.type}
              onChange={(v) => setPrinterConfig({ ...printerConfig, type: v })}
              options={printerTypes.map((t) => ({ value: t.value, label: `${t.icon} ${t.label}` }))}
              className="w-full sm:w-64"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("page.thermalPrinter.typeDesc")}
            </p>
          </div>

          {printerConfig.type === "network" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ipAddress">{t("page.thermalPrinter.ipAddress")}</Label>
                <Input
                  id="ipAddress"
                  type="text"
                  placeholder="192.168.1.100"
                  value={printerConfig.ipAddress}
                  onChange={(e) =>
                    setPrinterConfig({ ...printerConfig, ipAddress: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="port">{t("page.thermalPrinter.port")}</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="9100"
                  value={printerConfig.port}
                  onChange={(e) =>
                    setPrinterConfig({ ...printerConfig, port: parseInt(e.target.value) || 9100 })
                  }
                />
              </div>
            </div>
          )}

          {printerConfig.type === "usb" && (
            <div>
              <Label htmlFor="devicePath">{t("page.thermalPrinter.devicePath")}</Label>
              <Input
                id="devicePath"
                type="text"
                placeholder="/dev/usb/lp0"
                value={printerConfig.devicePath}
                onChange={(e) => setPrinterConfig({ ...printerConfig, devicePath: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("page.thermalPrinter.devicePathDesc")}
              </p>
            </div>
          )}

          {printerConfig.type === "bluetooth" && (
            <div>
              <Label htmlFor="macAddress">{t("page.thermalPrinter.macAddress")}</Label>
              <Input
                id="macAddress"
                type="text"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={printerConfig.macAddress}
                onChange={(e) =>
                  setPrinterConfig({ ...printerConfig, macAddress: e.target.value.toUpperCase() })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("page.thermalPrinter.macAddressDesc")}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="columns">{t("page.thermalPrinter.columns")}</Label>
            <Combobox
              value={String(printerConfig.columns)}
              onChange={(v) => setPrinterConfig({ ...printerConfig, columns: parseInt(v) })}
              options={[
                { value: "32", label: "32 kolom (58mm)" },
                { value: "48", label: "48 kolom (80mm)" }
              ]}
              className="w-full sm:w-48"
            />
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="success"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t("page.thermalPrinter.save")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Test Print Card */}
      <Card>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            {t("page.thermalPrinter.testPrint")}
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <Button
            onClick={handleTestPrint}
            disabled={testing || !status?.connected}
            className="w-full sm:w-auto flex items-center gap-2"
            size="lg">
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {testing ? t("page.thermalPrinter.printing") : t("page.thermalPrinter.testPrintBtn")}
          </Button>

          {lastTest && (
            <div
              className={`p-3 rounded-lg ${lastTest.success ? "bg-green-50 dark:bg-green-900/20 border border-green-200" : "bg-red-50 dark:bg-red-900/20 border border-red-200"}`}>
              <div className="flex items-center gap-2">
                {lastTest.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    {lastTest.success
                      ? t("page.thermalPrinter.testSuccess")
                      : t("page.thermalPrinter.testFailed")}
                  </p>
                  <p className="text-sm text-muted-foreground">{lastTest.message}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {lastTest.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Receipt Preview Card */}
      <Card>
        <h2 className="font-semibold p-4 border-b">{t("page.thermalPrinter.preview")}</h2>
        <div className="p-4">
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4 font-mono text-sm max-w-xs mx-auto"
            style={{ width: "200px", fontSize: "11px", lineHeight: "1.4" }}>
            <pre className="text-left whitespace-pre-wrap" style={{ fontSize: "10px" }}>
              {`TOKO CONTOH
Jl. Raya No. 123
Telp: 021-1234567
==============================
No: INV-2024001
Tgl: 15/01/2024 14:30
Kasir: Budi
------------------------------
Item              Qty  Harga   Total
Nasi Goreng       2x   25.000  50.000
Es Teh            1x    5.000   5.000
------------------------------
Subtotal          55.000
Diskon               -0
Pajak (10%)        5.500
==============================
TOTAL             60.500
------------------------------
Tunai            100.000
Kembalian         39.500
----------------------------==
Terima kasih telah berbelanja!

       [QR CODE AREA]       
`}
            </pre>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {t("page.thermalPrinter.previewDesc")}
          </p>
        </div>
      </Card>

      {/* Supported Printers Info */}
      <Card>
        <h2 className="font-semibold p-4 border-b">{t("page.thermalPrinter.supportedPrinters")}</h2>
        <div className="p-4 space-y-3">
          {[
            {
              name: "Epson TM-T20/T20II/T88",
              interface: "USB / Ethernet / Bluetooth",
              note: "Fully supported"
            },
            {
              name: "Star Micronics TSP100/TSP143",
              interface: "USB / Ethernet / Bluetooth",
              note: "Fully supported"
            },
            {
              name: "Bixolon SRP-350/350plus",
              interface: "USB / Ethernet / Bluetooth",
              note: "Fully supported"
            },
            {
              name: "Citizen CT-S310/CT-S400",
              interface: "USB / Ethernet",
              note: "Fully supported"
            },
            { name: "Generic 58mm/80mm Thermal", interface: "USB / Serial", note: "Basic support" },
            {
              name: "RPP02N / RPP300 (Bluetooth)",
              interface: "Bluetooth (macOS)",
              note: "Via thermal-bt.py"
            }
          ].map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.interface}</p>
              </div>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                {p.note}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ThermalPrinterSettings;

import React from "react";
import { Route } from "react-router-dom";

import { RequireRole, RequireMenuAccess } from "@/components/ui/RequireRole";

// Location
const LocationList = React.lazy(() => import("@/page/location/LocationList"));
const AddLocation = React.lazy(() => import("@/page/location/AddLocation"));
const EditLocation = React.lazy(() => import("@/page/location/EditLocation"));
const LocationDetail = React.lazy(() => import("@/page/location/LocationDetail"));
const StoreGeospatial = React.lazy(() => import("@/page/location/StoreGeospatial"));

// Store Configuration (W3) — gated in the pages by the canonical
// store.manage permission, not by RequireRole.
const StoreConfigurationList = React.lazy(
  () => import("@/page/store-configuration/StoreConfigurationList")
);
const StoreConfigurationDetail = React.lazy(
  () => import("@/page/store-configuration/StoreConfigurationDetail")
);

// Tenant administration — gated in the page by the canonical tenant.manage
// permission (platform only), not by RequireRole.
const TenantList = React.lazy(() => import("@/page/tenant/TenantList"));

// Table
const TableList = React.lazy(() => import("@/page/table/TableList"));
const DetailTable = React.lazy(() => import("@/page/table/DetailTable"));

// Price Store
const PriceStoreList = React.lazy(() => import("@/page/price-store/PriceStoreList"));

// Backup
const BackupPage = React.lazy(() => import("@/page/backup/BackupPage"));

// Audit Log
const AuditLogList = React.lazy(() => import("@/page/audit-log/AuditLogList"));

// Thermal Printer
const ThermalPrinterSettings = React.lazy(
  () => import("@/page/thermal-printer/ThermalPrinterSettings")
);

export const settingsRoutes = (
  <>
    <Route
      path="/location-list"
      element={
        <RequireMenuAccess href="/location-list">
          <LocationList />
        </RequireMenuAccess>
      }
    />
    <Route
      path="/add-location"
      element={
        <RequireRole roles={["super_admin"]}>
          <AddLocation />
        </RequireRole>
      }
    />
    <Route
      path="/edit-location"
      element={
        <RequireRole roles={["super_admin"]}>
          <EditLocation />
        </RequireRole>
      }
    />
    <Route
      path="/detail-location"
      element={
        <RequireRole roles={["super_admin"]}>
          <LocationDetail />
        </RequireRole>
      }
    />
    <Route
      path="/store-geospatial"
      element={
        <RequireRole roles={["super_admin"]}>
          <StoreGeospatial />
        </RequireRole>
      }
    />

    <Route path="/store-configuration" element={<StoreConfigurationList />} />
    <Route path="/store-configuration/:id" element={<StoreConfigurationDetail />} />

    <Route path="/tenant" element={<TenantList />} />

    <Route path="/table-list" element={<TableList />} />
    <Route path="/detail-table" element={<DetailTable />} />

    <Route path="/price-list-template" element={<PriceStoreList />} />

    <Route path="/backup" element={<BackupPage />} />

    <Route
      path="/audit-log"
      element={
        <RequireRole roles={["super_admin"]}>
          <AuditLogList />
        </RequireRole>
      }
    />
    <Route path="/thermal-printer" element={<ThermalPrinterSettings />} />
  </>
);

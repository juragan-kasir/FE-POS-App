import React, { useEffect, useState, Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  Route,
  RouterProvider
} from "react-router-dom";
import RouteProgress from "@/components/ui/route-progress";
import { useTranslation } from "react-i18next";
import { translationSelect } from "@/state/translation";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";

// Offline
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";

// Layout
const DashboardLayout = React.lazy(() => import("./components/layout/DashboardLayout"));

import ErrorBoundary from "@/components/ErrorBoundary";

// Route groups — lazy-loaded per domain
import {
  authRoutes,
  cashierRoutes,
  productRoutes,
  inventoryRoutes,
  purchasingRoutes,
  hrRoutes,
  financeRoutes,
  crmRoutes,
  reportRoutes,
  settingsRoutes,
  miscRoutes,
  deliveryRoutes,
  queueRoutes,
  waiterRoutes,
  supplierPerformanceRoutes,
  promoRoutes,
  bundleRoutes,
  businessTripRoutes
} from "@/routes";
import RegisterRequiredDialog from "@/components/organism/RegisterRequiredDialog";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";

// Global lazy components
const SupportComponent = React.lazy(() => import("@/components/organism/Support"));
const SentryInitializer = React.lazy(() => import("./components/organism/SentryInitializer"));

const ShortcutHandler = () => {
  useKeyboardShortcuts();
  return null;
};

// ponytail: Sentry (chunk 92KB) jangan bersaing di critical path —
// baru dimuat setelah halaman idle, error awal tetap ter-queue oleh browser? Tidak:
// error sebelum init memang tidak terekam; trade-off disengaja demi LCP.
const DeferredSentry = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const start = () => setReady(true);
    // ponytail: minimum 1.5s — rIC saja bisa fire di t=200ms saat browser
    // menganggap idle sebelum puncak beban render
    const t = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(start, { timeout: 3000 });
        return () => window.cancelIdleCallback(id);
      }
      start();
    }, 1500);
    return () => clearTimeout(t);
  }, []);
  return ready ? <SentryInitializer /> : null;
};

const RootLayout = () => (
  <React.Fragment>
    <OfflineIndicator />
    <Suspense>
      <SupportComponent />
      <RouteProgress />
      <ShortcutHandler />
      <RegisterRequiredDialog />
      <DeferredSentry />
      <UnsavedChangesProvider>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </UnsavedChangesProvider>
    </Suspense>
  </React.Fragment>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {/* Standalone routes (no layout) */}
      {authRoutes}
      {cashierRoutes}

      {/* Dashboard layout: sidebar & header persist across route changes */}
      <Route element={<DashboardLayout />}>
        {productRoutes}
        {inventoryRoutes}
        {purchasingRoutes}
        {hrRoutes}
        {financeRoutes}
        {crmRoutes}
        {reportRoutes}
        {settingsRoutes}
        {miscRoutes}
        {deliveryRoutes}
        {queueRoutes}
        {waiterRoutes}
        {supplierPerformanceRoutes}
        {promoRoutes}
        {bundleRoutes}
        {businessTripRoutes}
      </Route>
    </Route>
  )
);

function App() {
  const { i18n } = useTranslation();
  const { translation } = translationSelect();

  useEffect(() => {
    if (translation) {
      i18n.changeLanguage(translation);
    }
  }, [translation]);

  return <RouterProvider router={router} />;
}

export default App;

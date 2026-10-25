import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MutationCache, QueryClient, QueryClientProvider } from "react-query";
// import { LoadingProvider } from "./components/organism/loading";
// ponytail: Inter self-host — hapus rantai render-blocking ke fonts.googleapis.com
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./index.css";
import { Toaster } from "@/components/ui/sonner";
import { I18nextProvider } from "react-i18next";
import { CookiesProvider } from "react-cookie";
import i18n from "./i18n";
import { SocketProvider } from "@/services/socket";
import { StoreProvider } from "@/contexts/StoreContext";
import { shouldRetryQuery } from "@/lib/query-retry";
import { markAllClean } from "@/lib/unsaved-changes-store";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => markAllClean()
  }),
  defaultOptions: {
    queries: {
      staleTime: 30000,
      // cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: shouldRetryQuery,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // ponytail: masuk/ganti halaman langsung fetch ulang — cache fresh
      // tidak lagi diserve tanpa refetch saat komponen list remount.
      refetchOnMount: "always"
    }
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <CookiesProvider defaultSetOptions={{ path: "/" }}>
      <QueryClientProvider client={queryClient}>
        <StoreProvider>
          <I18nextProvider i18n={i18n}>
            <Toaster position="top-center" expand={false} />
            <SocketProvider>
              {/* <LoadingProvider> */}
              <App />
              {/* </LoadingProvider> */}
            </SocketProvider>
          </I18nextProvider>
        </StoreProvider>
      </QueryClientProvider>
    </CookiesProvider>
  </React.StrictMode>
);

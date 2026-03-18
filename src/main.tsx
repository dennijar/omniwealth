import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import AppRouter from "./App";



// In dev, a previously registered Workbox SW can serve stale bundles and hide new code.
// Clear SW registrations once per session to avoid reload loops.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {

    const already = sessionStorage.getItem('ow-dev-sw-cleared') === '1';
    if (regs.length > 0 && !already) {
      sessionStorage.setItem('ow-dev-sw-cleared', '1');
      regs.forEach((r) => r.unregister());
    }
  }).catch(()=>{});
}

// ── Dark Mode: apply class before React mounts to prevent flash ─
// Reads the persisted Zustand value directly from localStorage.
try {
  const raw = localStorage.getItem('omniwealth-app-store');
  if (raw) {
    const parsed = JSON.parse(raw) as { state?: { darkMode?: boolean } };
    if (parsed?.state?.darkMode) {
      document.documentElement.classList.add('dark');
    }
  }
} catch { /* ignore parse errors on fresh installs */ }

const updateSW = import.meta.env.PROD ? registerSW({
  onNeedRefresh() {
    console.info("[PWA] New content available — updating…");
    updateSW(true);
  },
  onOfflineReady() {
    console.info("[PWA] App is ready to work offline.");
  },
  onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
    console.info(`[PWA] Service Worker registered at: ${swUrl}`, registration);
  },
  onRegisterError(error: unknown) {
    console.error("[PWA] Service Worker registration failed:", error);
  },
}) : (() => () => {})();



createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
);

// trigger vercel redeploy for env variables


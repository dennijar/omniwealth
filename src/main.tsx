import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import { App } from "./App";

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

const updateSW = registerSW({
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
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// trigger vercel redeploy for env variables


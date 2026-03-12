import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      /**
       * autoUpdate: the new SW activates in the background and takes over
       * on the next page load — no "please refresh" prompts needed.
       */
      registerType: "autoUpdate",

      /**
       * Assets Vite will precache. These must exist in /public.
       * Required icon sizes are listed in the manifest.icons below.
       */
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon.png",      // 180×180
        "robots.txt",
      ],

      manifest: {
        name: "OmniWealth - Smart Tracker",
        short_name: "OmniWealth",
        description: "Local-first wealth management and financial intelligence.",
        theme_color: "#060D1F",
        background_color: "#060D1F",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            // Maskable variant — ensures no white border on Android adaptive icons
            src: "/icons/pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        /**
         * PRECACHE STRATEGY — App Shell (HTML / JS / CSS)
         * Everything Vite emits is fingerprinted; precache them all so the
         * app loads instantly with zero network dependency.
         */
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        /**
         * RUNTIME CACHING — extend to API calls / fonts / images loaded lazily.
         */
        runtimeCaching: [
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts woff2 files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            /**
             * Local API routes (adjust the regex to match your actual API base).
             * NetworkFirst means: try live data, fall back to cache if offline.
             */
            urlPattern: /^\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 h
              },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },

      /**
       * Enables Workbox's injectManifest or generateSW logs during `vite build`.
       * Set to false for CI to reduce noise.
       */
      devOptions: {
        enabled: true,          // register SW in dev so you can test via DevTools
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

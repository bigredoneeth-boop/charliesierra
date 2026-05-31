import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";
import { VitePWA } from "vite-plugin-pwa";

const ii_url =
  process.env.DFX_NETWORK === "local"
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8081/`
    : `https://identity.internetcomputer.org/`;

process.env.II_URL = process.env.II_URL || ii_url;
process.env.STORAGE_GATEWAY_URL =
  process.env.STORAGE_GATEWAY_URL || "https://blob.caffeine.ai";

export default defineConfig({
  logLevel: "error",
  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment(["II_URL"]),
    environment(["STORAGE_GATEWAY_URL"]),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // scope: '/' ensures the SW controls the entire origin
      // updateViaCache: 'none' forces Android Chrome to always check for a
      // fresh SW from the network — never served from HTTP cache.
      // Without these, Android may silently use a stale SW that lacks the
      // push event handler, causing push notifications to go undelivered.
      scope: '/',
      // Forces Android Chrome to always fetch the SW from the network,
      // never from HTTP cache, so push handler updates are never missed.
      updateViaCache: 'none',
      includeAssets: ['favicon.ico', 'assets/*.png'],
      manifest: {
        name: 'CharlieSierra',
        short_name: 'CS',
        description: 'Secure encrypted messaging',
        theme_color: '#1F2937',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Only match hashed build output — never glob .png/.svg/.ico from public/
        // to avoid duplicate manifest entries that trigger Workbox's
        // "add-to-cache-list-conflicting-entries" warning.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        // Exclude sw-custom.ts and any map/node_modules files from precache
        globIgnores: ['**/*.map', '**/node_modules/**', '**/sw-custom*'],
        // Skip adding Workbox's own revision hash to files that already
        // contain a content hash in their name (e.g. index-abc12345.js).
        dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/blob\.caffeine\.ai\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'blob-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 } }
          }
        ]
      },
      devOptions: {
        enabled: false,
      }
    }),
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(new URL("../declarations", import.meta.url)),
      },
      // More-specific alias must come before the generic "@" catch-all.
      // This redirects all `import ... from "@/backend"` through the wrapper
      // which strips agentOptions when agent is already provided, preventing
      // the "Detected both agent and agentOptions" console warning.
      {
        find: "@/backend",
        replacement: fileURLToPath(new URL("./src/lib/actor-factory", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ["@dfinity/agent"]
  },
});

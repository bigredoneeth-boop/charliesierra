// Push notification handler module — registered separately from the generated SW.
// This file is intentionally minimal: push event handling is done via
// the Notifications API in usePushNotifications.ts (polling-based approach).
// No workbox injection needed here since vite-plugin-pwa uses generateSW strategy.

// Bump this version to force browsers with stale cached bundles (e.g. after a
// PWA install with old crypto code) to fetch the new bundle on next load.
const SW_VERSION = "2.0.0";
console.log("[SW] CharlieSierra Service Worker version", SW_VERSION);

export {};

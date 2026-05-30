// Push notification handler module — registered separately from the generated SW.
// This file is intentionally minimal: push event handling is done via
// the Notifications API in usePushNotifications.ts (polling-based approach).
// No workbox injection needed here since vite-plugin-pwa uses generateSW strategy.
export {};

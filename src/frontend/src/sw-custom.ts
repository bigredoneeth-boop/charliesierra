/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const SW_VERSION = "cs-sw-v7";
console.log(`[CharlieSierra SW] ${SW_VERSION} loading`);

// Detect Android at SW scope — navigator is available in modern SW context
const isAndroid =
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

// Auth state received from the main page via postMessage
let swCanisterId: string | null = null;
let _swDelegationChain: string | null = null;

self.addEventListener("install", (event) => {
  console.log("[CS SW] Installing service worker version:", SW_VERSION);
  // skipWaiting ensures new SW takes control immediately on Android
  // without requiring the user to close and reopen the tab/PWA
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("[CS SW] Activating service worker, claiming clients");
  if (isAndroid) {
    console.log("[CS SW] Activating on Android");
  }
  // clients.claim() ensures the SW controls all open tabs immediately
  // — critical for Android Chrome so push events are handled straight away
  event.waitUntil(self.clients.claim());
});

// Receive auth info, notification relay, and control messages from the main page
self.addEventListener("message", (event) => {
  if (!event.data) return;
  const { type } = event.data as { type: string; [key: string]: unknown };

  // ── Version check / lifecycle control ──────────────────────────────────────
  if (type === "SKIP_WAITING") {
    console.log("[CS SW] SKIP_WAITING received — activating new SW");
    self.skipWaiting();
    return;
  }

  if (type === "PING") {
    // Reply to the main thread with PONG + current version for health checks
    if (event.source && "postMessage" in event.source) {
      (event.source as Client).postMessage({
        type: "PONG",
        version: SW_VERSION,
      });
    }
    return;
  }

  // ── Auth relay ─────────────────────────────────────────────────────────────
  if (type === "CS_SET_AUTH") {
    const {
      canisterId,
      icHost: _icHost,
      delegationChain,
      pushActive,
    } = event.data as {
      canisterId?: string;
      icHost?: string;
      delegationChain?: string;
      pushActive?: boolean;
    };
    swCanisterId = canisterId || "wqf45-4qaaa-aaaau-agubq-cai";
    _swDelegationChain = delegationChain || null;
    console.log(
      "[CS SW] Auth received, canisterId:",
      swCanisterId,
      "pushActive:",
      pushActive,
    );
  } else if (type === "CS_CLEAR_AUTH") {
    swCanisterId = null;
    _swDelegationChain = null;
  } else if (type === "CS_SHOW_NOTIFICATION") {
    // Foreground relay: only show if no visible client
    const { title, body, tag, data } = event.data as {
      title?: string;
      body?: string;
      tag?: string;
      data?: { url?: string; convId?: string };
    };
    self.clients
      .matchAll({ type: "window" })
      .then((clients) => {
        const hasVisible = clients.some(
          (c) => (c as WindowClient).visibilityState === "visible",
        );
        if (hasVisible) return;
        const notifTag = tag || `charliesierra-msg-${Date.now()}`;
        // Cast to include renotify + vibrate which are valid Chrome/Android options
        // but absent from the narrow TypeScript NotificationOptions type definition.
        const opts = {
          body: body || "New message",
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          tag: notifTag,
          renotify: true,
          requireInteraction: false,
          silent: false,
          data: {
            ...(data || {}),
            url: data?.url || "/",
            timestamp: Date.now(),
          },
          vibrate: [200, 100, 200],
        } as NotificationOptions;
        return self.registration.showNotification(
          title || "CharlieSierra",
          opts,
        );
      })
      .catch(() => {});
  }
});

// ── Real Web Push event handler ──────────────────────────────────────────────
// This fires when the browser delivers a push message, even when the app
// is fully closed. event.waitUntil() is MANDATORY — Android kills the
// notification if the promise chain is not held open for showNotification().
self.addEventListener("push", (event) => {
  console.log(
    "[CS SW] Push event received",
    isAndroid ? "(Android)" : "(desktop)",
  );

  interface PushPayload {
    title?: string;
    body?: string;
    convId?: string;
  }

  // ── Parse payload with robust fallback ─────────────────────────────────────
  // If the push payload is missing or malformed, we MUST still show a
  // notification with our own title/body/icon. If we don't, Chrome on Android
  // falls back to "CS — Tap to copy the URL for this app" which is unprofessional.
  let payload: PushPayload = {};
  if (event.data) {
    try {
      payload = event.data.json() as PushPayload;
    } catch {
      try {
        payload = { title: event.data.text() };
      } catch {
        /* ignore — use defaults below */
      }
    }
  }

  const title = payload.title || "CharlieSierra";
  const body = payload.body || "New message";
  const convId = payload.convId || "";
  // Unique tag prevents notification stacking — each push gets its own entry
  const tag = `charliesierra-msg-${Date.now()}`;

  // Cast to include renotify + vibrate which are valid Chrome/Android options
  // but absent from the narrow TypeScript NotificationOptions type definition.
  const notificationOptions = {
    body,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: { convId, url: "/", timestamp: Date.now() },
    vibrate: [200, 100, 200],
  } as NotificationOptions;

  // Helper: attempt showNotification with one automatic retry on failure
  const showWithRetry = async (): Promise<void> => {
    try {
      await self.registration.showNotification(title, notificationOptions);
      console.log("[CS SW] Push notification shown:", title, body);
    } catch (err: unknown) {
      console.error("[CS SW] Push notification failed (attempt 1):", err);
      // Retry once after 500ms
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      try {
        await self.registration.showNotification(title, notificationOptions);
        console.log("[CS SW] Push notification shown (retry):", title, body);
      } catch (retryErr: unknown) {
        console.error(
          "[CS SW] Push notification failed (attempt 2):",
          retryErr,
        );
      }
    }
  };

  event.waitUntil(showWithRetry());
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  console.log("[CS SW] Notification clicked, opening app");
  event.notification.close();

  const notifData = event.notification.data as
    | { convId?: string; url?: string }
    | undefined;
  const convId = notifData?.convId || "";
  const targetUrl = notifData?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        // Find an existing CharlieSierra window and focus it
        for (const client of windowClients) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            const wc = client as WindowClient;
            const focusedClient = await wc.focus();
            // Tell the focused page to navigate to the conversation
            if (convId) {
              focusedClient.postMessage({
                type: "CS_OPEN_CONVERSATION",
                convId,
              });
            }
            return focusedClient;
          }
        }
        // No existing window — open a new one pointing to the app
        if (self.clients.openWindow) {
          console.log("[CS SW] No existing window found, opening:", targetUrl);
          await self.clients.openWindow(targetUrl);
        }
      }),
  );
});

// ── Fetch event handler ───────────────────────────────────────────────────────
// Network-first for ICP backend calls; cache-first for static assets.
// This supplements the Workbox precache strategy configured in vite.config.js.
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // ICP backend calls: network-first with 10s timeout, then cache fallback
  if (url.includes("icp0.io") || url.includes("ic0.app")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open("cs-icp-cache-v1");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);
        try {
          const networkResponse = await fetch(event.request, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch {
          clearTimeout(timeoutId);
          const cached = await cache.match(event.request);
          if (cached) return cached;
          // No cache entry — let browser handle the error naturally
          return fetch(event.request);
        }
      })(),
    );
    return;
  }

  // All other requests: fall through to Workbox precache strategy
  // (Workbox is injected by vite-plugin-pwa via importScripts in the generated SW)
});

export {};

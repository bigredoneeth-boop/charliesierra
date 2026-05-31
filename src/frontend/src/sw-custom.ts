/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const SW_VERSION = "cs-sw-v6";
console.log(`[CharlieSierra SW] ${SW_VERSION} loading`);

// Detect Android at SW scope — navigator is available in modern SW context
const isAndroid =
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

// Auth state received from the main page via postMessage
let swCanisterId: string | null = null;
let _swDelegationChain: string | null = null;

self.addEventListener("install", (_event) => {
  console.log("[CharlieSierra SW] Installing...");
  // skipWaiting ensures new SW takes control immediately on Android
  // without requiring the user to close and reopen the tab/PWA
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[CharlieSierra SW] Activated");
  if (isAndroid) {
    console.log("[SW] Service worker activated on Android");
  }
  // clients.claim() ensures the SW controls all open tabs immediately
  // — critical for Android Chrome so push events are handled straight away
  event.waitUntil(self.clients.claim());
});

// Receive auth info and notification relay from the main page
self.addEventListener("message", (event) => {
  if (!event.data) return;
  const { type } = event.data as { type: string; [key: string]: unknown };

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
      "[CharlieSierra SW] Auth received, canisterId:",
      swCanisterId,
      "pushActive:",
      pushActive,
    );
  } else if (type === "CS_CLEAR_AUTH") {
    swCanisterId = null;
    _swDelegationChain = null;
  } else if (type === "CS_SHOW_NOTIFICATION") {
    const { title, body, tag, data } = event.data as {
      title?: string;
      body?: string;
      tag?: string;
      data?: { url?: string; convId?: string };
    };
    // Only show if no visible client (page handles foreground case)
    self.clients
      .matchAll({ type: "window" })
      .then((clients) => {
        const hasVisible = clients.some(
          (c) => (c as WindowClient).visibilityState === "visible",
        );
        if (hasVisible) return;
        self.registration
          .showNotification(title || "New message", {
            body: body || "New message",
            icon: "/icon-192x192.png",
            badge: "/icon-192x192.png",
            tag: tag || "cs-notification",
            requireInteraction: false,
            data: data || { url: "/" },
          })
          .catch(() => {});
      })
      .catch(() => {});
  }
});

// ── Real Web Push event handler ──────────────────────────────────────────────
// This fires when the browser delivers a push message, even when the app
// is fully closed. The payload must include: title, body, convId (optional).
// event.waitUntil() is MANDATORY — Android kills the notification if the
// promise chain is not held open for the full showNotification() call.
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received");
  if (isAndroid) {
    console.log("[SW] Push event received on Android");
  }

  interface PushPayload {
    title?: string;
    body?: string;
    convId?: string;
  }

  let payload: PushPayload = {};
  if (event.data) {
    try {
      payload = event.data.json() as PushPayload;
    } catch {
      try {
        // Fallback: treat as plain text title
        payload = { title: event.data.text() };
      } catch {
        /* ignore */
      }
    }
  }

  const title = payload.title || "CharlieSierra";
  const body = payload.body || "New message";
  const convId = payload.convId || "";
  // Use convId as the tag so duplicate notifications for the same
  // conversation are replaced rather than stacked.
  const tag = convId ? `cs-conv-${convId}` : "cs-push";

  // Android-compatible notification options.
  // vibration: pulse pattern (ms on, ms off, ms on) — Android only, ignored on desktop.
  // requireInteraction: false so Android doesn't pin the notification persistently.
  // badge: small monochrome icon shown in Android status bar.
  const notificationOptions: NotificationOptions = {
    body,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag,
    requireInteraction: false,
    data: { convId, url: "/" },
    // @ts-expect-error — vibration is a valid Web Notification option on Android Chrome
    // but not yet in all TypeScript lib definitions
    vibration: [200, 100, 200],
  };

  // Always wrap in event.waitUntil() — Android will kill the notification
  // before showNotification() resolves if there is no open promise.
  event.waitUntil(
    self.registration
      .showNotification(title, notificationOptions)
      .then(() => {
        console.log("[SW] showNotification called");
        if (isAndroid) {
          console.log("[SW] showNotification called on Android");
        }
      })
      .catch((err: unknown) => {
        console.error("[SW] showNotification failed:", err);
      }),
  );
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
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
        // Find an existing app window to focus
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
            return;
          }
        }
        // No existing window — open a new one
        if (self.clients.openWindow) {
          await self.clients.openWindow(targetUrl);
        }
      }),
  );
});

export {};

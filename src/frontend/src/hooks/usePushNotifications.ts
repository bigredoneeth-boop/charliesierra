import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationPermission =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export interface PushPreferences {
  directEnabled: boolean;
  groupEnabled: boolean;
}

export interface UsePushNotificationsResult {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  /** true when a real Web Push subscription is active with the browser */
  pushSubscriptionActive: boolean;
  preferences: PushPreferences;
  loading: boolean;
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  updatePreferences: (dm: boolean, group: boolean) => Promise<void>;
}

// ── IndexedDB helpers for subscription persistence ───────────────────────────
const IDB_NAME = "cs_push";
const IDB_STORE = "subscription";
const IDB_KEY = "active";

interface StoredSubscription {
  endpoint: string;
  storedAt: number;
}

function openPushDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSubscriptionToIdb(endpoint: string): Promise<void> {
  try {
    const db = await openPushDb();
    const tx = db.transaction(IDB_STORE, "readwrite");
    const stored: StoredSubscription = { endpoint, storedAt: Date.now() };
    tx.objectStore(IDB_STORE).put(stored, IDB_KEY);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch {
    /* non-critical */
  }
}

async function loadSubscriptionFromIdb(): Promise<StoredSubscription | null> {
  try {
    const db = await openPushDb();
    const tx = db.transaction(IDB_STORE, "readonly");
    const result = await new Promise<StoredSubscription | null>((res, rej) => {
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () =>
        res((req.result as StoredSubscription | undefined) ?? null);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

async function clearSubscriptionFromIdb(): Promise<void> {
  try {
    const db = await openPushDb();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch {
    /* non-critical */
  }
}

// Android Chrome requires correct base64url → Uint8Array conversion.
// The padding calculation must handle strings whose length % 4 == 0
// (no padding needed) as well as 2 or 3 remainder cases.
// An incorrect conversion silently produces a wrong applicationServerKey
// that Android rejects without a useful error message.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Strip any existing padding first so we don't double-pad
  const stripped = base64String.replace(/=+$/, "");
  const padding = "=".repeat((4 - (stripped.length % 4)) % 4);
  const base64 = (stripped + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Returns true when running on an Android device
function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent);
}

// Delay helper for retry logic
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { actor } = useActor(createActor);

  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (!supported) return "unsupported";
    return (window.Notification?.permission ??
      "default") as NotificationPermission;
  });

  const [subscribed, setSubscribed] = useState(false);
  // True when a real browser PushSubscription is registered
  const [pushSubscriptionActive, setPushSubscriptionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PushPreferences>({
    directEnabled: true,
    groupEnabled: true,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Boot: load VAPID key, preferences, and check existing subscription ──────
  useEffect(() => {
    if (!actor || !supported) return;
    let cancelled = false;

    (async () => {
      try {
        const key = await actor.getVAPIDPublicKey();
        if (!cancelled) setVapidKey(key);
      } catch {
        /* VAPID key unavailable — push won't work, graceful degradation */
      }

      try {
        const result = await actor.getNotificationPreferences();
        if (!cancelled) {
          setPreferences({
            directEnabled: result.directMessagesEnabled,
            groupEnabled: result.groupMessagesEnabled,
          });
          setSubscribed(
            result.directMessagesEnabled || result.groupMessagesEnabled,
          );
        }
      } catch {
        /* Preferences unavailable — use defaults */
      }

      // Check if a push subscription is already registered in the browser
      try {
        const reg = await navigator.serviceWorker.ready;
        let existingSub = await reg.pushManager.getSubscription();

        if (existingSub) {
          // Check expiration
          const expired =
            existingSub.expirationTime != null &&
            existingSub.expirationTime < Date.now();
          if (expired) {
            console.log(
              "[CS Push] Subscription expired — unsubscribing and re-registering",
            );
            await existingSub.unsubscribe();
            existingSub = null;
          }
        }

        if (existingSub && !cancelled) {
          // Verify the stored IDB endpoint matches the live subscription
          const stored = await loadSubscriptionFromIdb();
          if (!stored || stored.endpoint !== existingSub.endpoint) {
            // Re-register with backend to keep server-side record in sync
            const json = existingSub.toJSON();
            const endpoint = json.endpoint ?? "";
            const auth = json.keys?.auth ?? "";
            const p256dh = json.keys?.p256dh ?? "";
            try {
              await actor.subscribeToPush(endpoint, auth, p256dh);
              await saveSubscriptionToIdb(endpoint);
            } catch {
              /* Re-register failed — push may still work */
            }
          }
          if (!cancelled) {
            setPushSubscriptionActive(true);
            setSubscribed(true);
          }
        }
      } catch {
        /* SW not ready yet — non-fatal */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [actor, supported]);

  // ── Send auth + push status to SW whenever state changes ──────────────────
  useEffect(() => {
    if (!actor || !supported) return;

    const sendAuth = (pushActive: boolean) => {
      if (!navigator.serviceWorker.controller) return;
      navigator.serviceWorker.controller.postMessage({
        type: "CS_SET_AUTH",
        canisterId:
          (import.meta.env.CANISTER_ID_BACKEND as string | undefined) ||
          "wqf45-4qaaa-aaaau-agubq-cai",
        icHost: "https://icp0.io",
        pushActive,
      });
    };

    sendAuth(pushSubscriptionActive);

    const onControllerChange = () => {
      sendAuth(pushSubscriptionActive);
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );
    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, [actor, supported, pushSubscriptionActive]);

  // ── Fallback polling — only active when push subscription is NOT available ─
  // On Android, prefer real push. Only start polling if push subscription
  // failed on Android (20-second interval); non-Android uses 15 seconds.
  useEffect(() => {
    // Skip polling entirely when a real push subscription is active
    if (
      !actor ||
      !supported ||
      permission !== "granted" ||
      pushSubscriptionActive
    ) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // Use a longer interval on Android since real push is strongly preferred
    // and polling is only a last-resort fallback there.
    const pollInterval = isAndroidDevice() ? 20_000 : 15_000;
    if (isAndroidDevice()) {
      console.log(
        "[CS Push] Android push unavailable — starting fallback polling every 20s",
      );
    }

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const result = await actor.getPendingNotifications();
        for (const n of result) {
          // Metadata-only: never include message body content (E2EE)
          const notificationTitle =
            n.notifType === "DirectMessage"
              ? `New message from ${n.senderDisplayName}`
              : `New message in ${n.groupName ?? "a group"}`;
          const notifBody = "New message";
          const notifTag = `cs-conv-${n.id}`;

          // Relay to SW for background delivery
          if (
            navigator.serviceWorker.controller &&
            Notification.permission === "granted"
          ) {
            navigator.serviceWorker.controller.postMessage({
              type: "CS_SHOW_NOTIFICATION",
              title: notificationTitle,
              body: notifBody,
              tag: notifTag,
              data: { url: "/", convId: n.id },
            });
          }

          // Also show inline when page is visible
          if (
            document.visibilityState === "visible" &&
            Notification.permission === "granted"
          ) {
            new window.Notification(notificationTitle, {
              body: notifBody,
              tag: notifTag,
              icon: "/icon-192x192.png",
            });
          }
        }
        if (retryTimeout) {
          clearTimeout(retryTimeout);
          retryTimeout = null;
        }
      } catch {
        if (!retryTimeout) {
          retryTimeout = setTimeout(() => {
            retryTimeout = null;
            poll().catch(() => {});
          }, 5_000);
        }
      }
    };

    pollRef.current = setInterval(poll, pollInterval);
    poll().catch(() => {});

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [actor, supported, permission, pushSubscriptionActive]);

  const requestPermission = useCallback(async () => {
    if (!supported || permission !== "default") return;
    const result = await window.Notification.requestPermission();
    setPermission(result as NotificationPermission);
  }, [supported, permission]);

  const subscribe = useCallback(async () => {
    if (!supported || !actor || !vapidKey) return;
    setLoading(true);

    const onAndroid = isAndroidDevice();

    // Log permission status on Android for debugging
    if (onAndroid) {
      console.log(
        `Push permission status on Android: ${Notification.permission}`,
      );
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    let lastError: unknown = null;

    try {
      const reg = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(
        vapidKey,
      ) as BufferSource;

      let sub: PushSubscription | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Unsubscribe any stale subscription before retrying.
          // A stale sub on Android causes subscribe() to fail with
          // "Registration failed - no sender id" or DOMException.
          const existing = await reg.pushManager.getSubscription();
          if (existing) {
            console.log(
              `[CS Push] Clearing stale subscription before attempt ${attempt}`,
            );
            await existing.unsubscribe();
          }

          // Subscribe via the browser's PushManager (real Web Push)
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });

          // Success — break out of retry loop
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          console.error(
            `[CS Push] Subscribe attempt ${attempt}/${MAX_RETRIES} failed:`,
            err,
          );
          if (onAndroid) {
            console.error(
              `[CS Push] Android subscribe attempt ${attempt} failed:`,
              err,
            );
          }
          if (attempt < MAX_RETRIES) {
            console.log(
              `[CS Push] Retrying in ${RETRY_DELAY_MS}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`,
            );
            await delay(RETRY_DELAY_MS);
          }
        }
      }

      if (!sub) {
        console.error("[CS Push] All subscribe attempts failed:", lastError);
        if (onAndroid) {
          console.error(
            "[CS Push] Android push subscription failed after all retries:",
            lastError,
          );
        }
        // Fall through — pushSubscriptionActive stays false, polling will handle it
        return;
      }

      const json = sub.toJSON();
      const endpoint = json.endpoint ?? "";
      const auth = json.keys?.auth ?? "";
      const p256dh = json.keys?.p256dh ?? "";

      // Register with backend
      await actor.subscribeToPush(endpoint, auth, p256dh);
      // Persist locally for expiration checks on next load
      await saveSubscriptionToIdb(endpoint);

      if (onAndroid) {
        console.log("Push subscription successful on Android");
      } else {
        console.log("[CS Push] Push subscription successful");
      }

      setPushSubscriptionActive(true);
      setSubscribed(true);
    } catch (err) {
      console.error("[CS Push] Subscribe failed (outer):", err);
    } finally {
      setLoading(false);
    }
  }, [supported, actor, vapidKey]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !actor) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      // Unsubscribe from the browser's push service
      if (sub) await sub.unsubscribe();
      // Unregister from backend
      await actor.unsubscribeFromPush();
      // Clear local IDB record
      await clearSubscriptionFromIdb();

      setPushSubscriptionActive(false);
      setSubscribed(false);
    } catch (err) {
      console.error("[CS Push] Unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supported, actor]);

  const updatePreferences = useCallback(
    async (dm: boolean, group: boolean) => {
      if (!actor) return;
      setLoading(true);
      try {
        await actor.updateNotificationPreferences(dm, group);
        setPreferences({ directEnabled: dm, groupEnabled: group });
        if (!dm && !group) {
          // Both types disabled — treat as full unsubscribe
          await unsubscribe();
          return;
        }
      } catch {
        /* Preference update failed — ignore silently */
      } finally {
        setLoading(false);
      }
    },
    [actor, unsubscribe],
  );

  return {
    supported,
    permission,
    subscribed,
    pushSubscriptionActive,
    preferences,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
  };
}

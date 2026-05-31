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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
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

    pollRef.current = setInterval(poll, 15_000);
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
    try {
      const reg = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(
        vapidKey,
      ) as BufferSource;

      // Subscribe via the browser's PushManager (real Web Push)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const json = sub.toJSON();
      const endpoint = json.endpoint ?? "";
      const auth = json.keys?.auth ?? "";
      const p256dh = json.keys?.p256dh ?? "";

      // Register with backend
      await actor.subscribeToPush(endpoint, auth, p256dh);
      // Persist locally for expiration checks on next load
      await saveSubscriptionToIdb(endpoint);

      setPushSubscriptionActive(true);
      setSubscribed(true);
    } catch (err) {
      console.error("[CS Push] Subscribe failed:", err);
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

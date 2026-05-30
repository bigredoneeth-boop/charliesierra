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
  preferences: PushPreferences;
  loading: boolean;
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  updatePreferences: (dm: boolean, group: boolean) => Promise<void>;
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
    "serviceWorker" in navigator;

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (!supported) return "unsupported";
    return (window.Notification?.permission ??
      "default") as NotificationPermission;
  });

  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PushPreferences>({
    directEnabled: true,
    groupEnabled: true,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load VAPID key + preferences on mount
  useEffect(() => {
    if (!actor || !supported) return;
    let cancelled = false;

    (async () => {
      try {
        const key = await actor.getVAPIDPublicKey();
        if (!cancelled) setVapidKey(key);
      } catch {
        // VAPID key unavailable — push won't work but graceful
      }

      try {
        const result = await actor.getNotificationPreferences();
        if (!cancelled && "ok" in result) {
          setPreferences({
            directEnabled: result.ok.directMessagesEnabled,
            groupEnabled: result.ok.groupMessagesEnabled,
          });
          setSubscribed(
            result.ok.directMessagesEnabled || result.ok.groupMessagesEnabled,
          );
        }
      } catch {
        // Preferences unavailable — use defaults
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [actor, supported]);

  // Background polling: show Notification API notifications when hidden
  useEffect(() => {
    if (!actor || !supported || permission !== "granted") return;

    const poll = async () => {
      if (document.visibilityState !== "hidden") return;
      try {
        const result = await actor.getPendingNotifications();
        if ("ok" in result) {
          for (const n of result.ok) {
            // Metadata-only: never include message body content
            const title =
              n.notifType === "DirectMessage"
                ? `New message from ${n.senderDisplayName}`
                : `New message in ${n.groupName ?? "a group"}`;
            const body = "Tap to view";
            new window.Notification(title, {
              body,
              tag: n.id,
              icon: "/icons/icon-192.png",
            });
          }
        }
      } catch {
        // Polling failed — ignore silently
      }
    };

    pollRef.current = setInterval(poll, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [actor, supported, permission]);

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
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      const json = sub.toJSON();
      const endpoint = json.endpoint ?? "";
      const auth = json.keys?.auth ?? "";
      const p256dh = json.keys?.p256dh ?? "";
      await actor.subscribeToPush(endpoint, auth, p256dh);
      setSubscribed(true);
    } catch {
      // Subscribe failed — ignore silently
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
      await sub?.unsubscribe();
      await actor.unsubscribeFromPush();
      setSubscribed(false);
    } catch {
      // Unsubscribe failed — ignore silently
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
      } catch {
        // Preference update failed — ignore silently
      } finally {
        setLoading(false);
      }
    },
    [actor],
  );

  return {
    supported,
    permission,
    subscribed,
    preferences,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
  };
}

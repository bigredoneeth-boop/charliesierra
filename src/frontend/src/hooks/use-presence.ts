import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useEffect } from "react";

const PRESENCE_INTERVAL_MS = 30_000;
const ONLINE_THRESHOLD_MS = 120_000; // 2 minutes

/**
 * Call touchPresence() on mount and every 30 seconds while the app is active.
 * Guards against a null actor.
 */
export function usePresence(): void {
  const { actor, isFetching } = useActor(createActor);

  useEffect(() => {
    if (!actor || isFetching) return;

    // Touch immediately on mount
    actor.touchPresence().catch(() => {
      /* fire-and-forget */
    });

    const id = setInterval(() => {
      actor.touchPresence().catch(() => {
        /* fire-and-forget */
      });
    }, PRESENCE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [actor, isFetching]);
}

/**
 * Returns true when lastSeen is within the last 2 minutes.
 * lastSeen is a bigint in nanoseconds (IC Timestamp).
 */
export function isOnline(lastSeen: bigint): boolean {
  const lastSeenMs = Number(lastSeen / 1_000_000n);
  return Date.now() - lastSeenMs < ONLINE_THRESHOLD_MS;
}

/**
 * Human-readable tooltip text for the online dot.
 * Returns "Online" when within 2 minutes, otherwise "Last seen X minutes/hours ago".
 */
export function formatLastSeen(lastSeen: bigint): string {
  const lastSeenMs = Number(lastSeen / 1_000_000n);
  const diffMs = Date.now() - lastSeenMs;

  if (diffMs < ONLINE_THRESHOLD_MS) return "Online";

  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60)
    return `Last seen ${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24)
    return `Last seen ${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `Last seen ${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

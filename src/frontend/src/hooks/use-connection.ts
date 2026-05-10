import { connectionMonitor } from "@/lib/connection-monitor";
import type { ConnectionState } from "@/lib/connection-monitor";
import { useCallback, useEffect, useState } from "react";

export interface UseConnectionResult {
  isOnline: boolean;
  isReconnecting: boolean;
  isPaused: boolean;
  consecutiveFailures: number;
  reconnect: () => void;
  lastConnectedAt: number | null;
  connectionState: ConnectionState;
}

export function useConnection(): UseConnectionResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    connectionMonitor.currentState,
  );
  const [consecutiveFailures, setConsecutiveFailures] = useState(
    connectionMonitor.failures,
  );
  const [lastConnectedAt, setLastConnectedAt] = useState<number | null>(
    connectionMonitor.lastConnected,
  );

  useEffect(() => {
    const sync = () => {
      setConnectionState(connectionMonitor.currentState);
      setConsecutiveFailures(connectionMonitor.failures);
    };

    const offOnline = connectionMonitor.on("online", () => {
      setConnectionState("online");
      setLastConnectedAt(Date.now());
      setConsecutiveFailures(0);
    });
    const offOffline = connectionMonitor.on("offline", sync);
    const offReconnecting = connectionMonitor.on("reconnecting", sync);
    const offPaused = connectionMonitor.on("paused", sync);
    const offFailed = connectionMonitor.on("failed", sync);

    return () => {
      offOnline();
      offOffline();
      offReconnecting();
      offPaused();
      offFailed();
    };
  }, []);

  const reconnect = useCallback(() => {
    connectionMonitor.reconnect();
  }, []);

  return {
    isOnline: connectionState === "online",
    isReconnecting: connectionState === "reconnecting",
    isPaused: connectionState === "paused",
    consecutiveFailures,
    reconnect,
    lastConnectedAt,
    connectionState,
  };
}

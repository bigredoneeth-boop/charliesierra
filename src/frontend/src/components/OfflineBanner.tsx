import { Button } from "@/components/ui/button";
import type { UseConnectionResult } from "@/hooks/use-connection";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface OfflineBannerProps {
  connection: UseConnectionResult;
  queueDepth: number;
  isDraining?: boolean;
}

export function OfflineBanner({
  connection,
  queueDepth,
  isDraining,
}: OfflineBannerProps) {
  const { isOnline, isReconnecting, isPaused, reconnect, consecutiveFailures } =
    connection;
  const [countdown, setCountdown] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Show banner when offline or reconnecting
  const shouldShow = !isOnline || isReconnecting || isPaused || isDraining;

  // Reset dismiss when going offline again
  useEffect(() => {
    if (!isOnline) setDismissed(false);
  }, [isOnline]);

  // Countdown for reconnection backoff
  useEffect(() => {
    if (!isReconnecting && !isPaused) {
      setCountdown(0);
      return;
    }
    const steps = [0, 2, 4, 8, 16, 32, 60];
    const step = Math.min(consecutiveFailures, steps.length - 1);
    setCountdown(steps[step]);
    if (steps[step] === 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isReconnecting, isPaused, consecutiveFailures]);

  if (!shouldShow || dismissed) return null;

  const canDismiss = !isDraining && !isReconnecting;

  return (
    <output
      aria-live="polite"
      className="flex items-center gap-2.5 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-xs flex-shrink-0"
      data-ocid="offline.banner"
    >
      {/* Icon */}
      {isPaused ? (
        <AlertTriangle
          size={13}
          className="text-amber-600 dark:text-amber-400 flex-shrink-0"
        />
      ) : isReconnecting || isDraining ? (
        <RefreshCw
          size={13}
          className="text-amber-500 flex-shrink-0 animate-spin"
        />
      ) : (
        <WifiOff
          size={13}
          className="text-amber-600 dark:text-amber-400 flex-shrink-0"
        />
      )}

      {/* Message */}
      <span className="text-amber-800 dark:text-amber-300 flex-1 leading-relaxed">
        {isDraining && isOnline ? (
          <>
            Sending {queueDepth} queued message{queueDepth !== 1 ? "s" : ""}…
          </>
        ) : isPaused ? (
          <>Reconnection paused — too many failures. </>
        ) : isReconnecting ? (
          <>
            Reconnecting{countdown > 0 ? ` in ${countdown}s` : "…"}
            {consecutiveFailures > 0 && (
              <span className="opacity-70">
                {" "}
                (attempt {consecutiveFailures + 1})
              </span>
            )}
          </>
        ) : (
          <>
            You're offline.{" "}
            {queueDepth > 0 && (
              <span className="font-medium">
                {queueDepth} message{queueDepth !== 1 ? "s" : ""} queued.
              </span>
            )}
          </>
        )}
      </span>

      {/* Reconnect button when paused */}
      {isPaused && (
        <Button
          variant="outline"
          size="sm"
          onClick={reconnect}
          className="h-6 px-2 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex-shrink-0"
          data-ocid="offline.reconnect_button"
        >
          <RefreshCw size={10} className="mr-1" />
          Reconnect
        </Button>
      )}

      {/* Dismiss when just offline */}
      {canDismiss && (
        <button
          type="button"
          className="flex-shrink-0 text-amber-700 dark:text-amber-400 hover:text-amber-900 opacity-60 hover:opacity-100 transition-opacity text-xs"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss offline notice"
          data-ocid="offline.dismiss_button"
        >
          ✕
        </button>
      )}
    </output>
  );
}

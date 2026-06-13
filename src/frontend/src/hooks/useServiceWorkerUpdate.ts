import { useEffect, useRef, useState } from "react";

interface UseServiceWorkerUpdateResult {
  needsUpdate: boolean;
  applyUpdate: () => void;
}

export function useServiceWorkerUpdate(): UseServiceWorkerUpdateResult {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const updateFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(
    null,
  );
  const needsUpdateRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cleanupFns: Array<() => void> = [];

    async function init() {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        function bindUpdateFn(worker: ServiceWorker) {
          updateFnRef.current = async (reload = true) => {
            worker.postMessage({ type: "SKIP_WAITING" });
            if (reload) {
              await new Promise<void>((resolve) => setTimeout(resolve, 250));
              window.location.reload();
            }
          };
        }

        // Already a waiting worker when the hook mounts
        if (registration.waiting) {
          needsUpdateRef.current = true;
          setNeedsUpdate(true);
          bindUpdateFn(registration.waiting);
        }

        // New SW installs after mount
        const onUpdateFound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          const onStateChange = () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              needsUpdateRef.current = true;
              setNeedsUpdate(true);
              bindUpdateFn(newWorker);
            }
          };

          newWorker.addEventListener("statechange", onStateChange);
          cleanupFns.push(() =>
            newWorker.removeEventListener("statechange", onStateChange),
          );
        };

        registration.addEventListener("updatefound", onUpdateFound);
        cleanupFns.push(() =>
          registration.removeEventListener("updatefound", onUpdateFound),
        );

        // When the new SW takes control, reload (only if we triggered the update)
        const onControllerChange = () => {
          if (needsUpdateRef.current) {
            window.location.reload();
          }
        };
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          onControllerChange,
        );
        cleanupFns.push(() =>
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            onControllerChange,
          ),
        );
      } catch (err) {
        console.warn("[SW Update] Failed to set up update detection:", err);
      }
    }

    init();

    return () => {
      for (const fn of cleanupFns) fn();
    };
  }, []);

  const applyUpdate = () => {
    if (updateFnRef.current) {
      updateFnRef.current(true);
    } else {
      window.location.reload();
    }
  };

  return { needsUpdate, applyUpdate };
}

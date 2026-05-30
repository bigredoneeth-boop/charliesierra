import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UsePWAInstallResult {
  isInstallable: boolean;
  isInstalled: boolean;
  canAutoPrompt: boolean;
  promptInstall: () => Promise<void>;
  dismissInstall: () => void;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default function usePWAInstall(): UsePWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true),
  );

  // Browsers that support PWA install but don't fire beforeinstallprompt
  // (e.g. Safari on iOS, some Chromium builds)
  const isManuallyInstallable =
    !isInstalled &&
    "serviceWorker" in navigator &&
    (navigator as { standalone?: boolean }).standalone === undefined &&
    !window.matchMedia("(display-mode: standalone)").matches;

  const canAutoPrompt = deferredPrompt !== null;

  // isInstallable: show the button if any install path is available
  const isInstallable =
    !isInstalled && (canAutoPrompt || isManuallyInstallable);

  useEffect(() => {
    if (isInstalled) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (
      dismissedAt &&
      Date.now() - Number.parseInt(dismissedAt, 10) < DISMISS_TTL_MS
    ) {
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [isInstalled]);

  const promptInstall = async (): Promise<void> => {
    if (deferredPrompt) {
      // Chrome/Edge: use the native prompt
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    // Manual install path (Safari iOS, some Chromium builds)
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;
    if (isIOS) {
      alert(
        "To install CharlieSierra:\n\n" +
          "1. Tap the Share button (\u{1F4E4}) at the bottom of the screen.\n" +
          '2. Scroll down and tap "Add to Home Screen".\n' +
          '3. Tap "Add" to confirm.',
      );
    } else {
      alert(
        "To install CharlieSierra:\n\n" +
          "Open your browser menu (⋮ or ☰) and select\n" +
          '"Install app" or "Add to Home Screen".',
      );
    }
  };

  const dismissInstall = (): void => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferredPrompt(null);
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    dismissInstall,
    canAutoPrompt,
  };
}

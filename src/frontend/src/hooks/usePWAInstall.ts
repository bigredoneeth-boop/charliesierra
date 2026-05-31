import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type BrowserInstallType =
  | "auto"
  | "edge"
  | "chrome"
  | "ios"
  | "android"
  | "generic";

interface UsePWAInstallResult {
  isInstallable: boolean;
  isInstalled: boolean;
  canAutoPrompt: boolean;
  browserInstallType: BrowserInstallType;
  showInstructionModal: boolean;
  promptInstall: () => Promise<void>;
  dismissInstall: () => void;
  closeInstructionModal: () => void;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function detectBrowserInstallType(): BrowserInstallType {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as Window & { MSStream?: unknown }).MSStream;
  const isAndroid = /Android/.test(ua);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  if (/Edg\//.test(ua)) return "edge";
  if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) return "chrome";
  return "generic";
}

function isDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  return !!(
    dismissedAt &&
    Date.now() - Number.parseInt(dismissedAt, 10) < DISMISS_TTL_MS
  );
}

export default function usePWAInstall(): UsePWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true),
  );

  const browserInstallType = detectBrowserInstallType();
  const canAutoPrompt = deferredPrompt !== null;

  // On desktop (Edge/Chrome/generic desktop) always show the install button
  // so users can access manual install instructions even when beforeinstallprompt
  // hasn't fired yet. On mobile the existing behavior is preserved.
  const isDesktop =
    browserInstallType === "edge" ||
    browserInstallType === "chrome" ||
    browserInstallType === "generic";

  const isInstallable =
    !isInstalled &&
    !dismissed &&
    (canAutoPrompt ||
      isDesktop ||
      // iOS / Android — only show when service worker available
      ("serviceWorker" in navigator &&
        (navigator as { standalone?: boolean }).standalone === undefined));

  useEffect(() => {
    if (isInstalled) return;

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

  const promptInstall = useCallback(async (): Promise<void> => {
    if (deferredPrompt) {
      // Native install dialog (Chrome/Edge when criteria are met)
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    // No native prompt — show browser-specific instruction modal
    setShowInstructionModal(true);
  }, [deferredPrompt]);

  const dismissInstall = useCallback((): void => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setDeferredPrompt(null);
  }, []);

  const closeInstructionModal = useCallback((): void => {
    setShowInstructionModal(false);
  }, []);

  return {
    isInstallable,
    isInstalled,
    canAutoPrompt,
    browserInstallType,
    showInstructionModal,
    promptInstall,
    dismissInstall,
    closeInstructionModal,
  };
}

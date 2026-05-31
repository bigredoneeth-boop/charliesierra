import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BrowserInstallType } from "@/hooks/usePWAInstall";
import { Chrome, Globe, Monitor, MoreHorizontal, Share2 } from "lucide-react";

interface PWAInstallModalProps {
  open: boolean;
  onClose: () => void;
  browserInstallType: BrowserInstallType;
}

interface InstallStep {
  icon: React.ReactNode;
  text: string;
}

function EdgeInstructions() {
  return (
    <ol className="space-y-4 mt-4">
      {(
        [
          {
            icon: <MoreHorizontal size={16} className="text-primary" />,
            text: "Click the \u22ef (Settings and more) button in the top-right corner of Edge.",
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: 'Hover over "Apps" in the dropdown menu.',
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: '"Install this site as an app" — click it to install CharlieSierra.',
          },
        ] as InstallStep[]
      ).map((step, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex items-start gap-2 pt-0.5">
            <span className="flex-shrink-0 mt-0.5">{step.icon}</span>
            <p className="text-sm text-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ChromeInstructions() {
  return (
    <ol className="space-y-4 mt-4">
      {(
        [
          {
            icon: <Chrome size={16} className="text-primary" />,
            text: "Look for the install icon (\u229e) in the address bar — click it to install immediately.",
          },
          {
            icon: <MoreHorizontal size={16} className="text-primary" />,
            text: "Alternatively, click the \u22ee menu in the top-right corner.",
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: '"Save and share" → "Install page as app" → confirm to install CharlieSierra.',
          },
        ] as InstallStep[]
      ).map((step, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex items-start gap-2 pt-0.5">
            <span className="flex-shrink-0 mt-0.5">{step.icon}</span>
            <p className="text-sm text-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function IOSInstructions() {
  return (
    <ol className="space-y-4 mt-4">
      {(
        [
          {
            icon: <Share2 size={16} className="text-primary" />,
            text: "Tap the Share button (\u{1F4E4}) at the bottom of Safari.",
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: '"Add to Home Screen" — scroll down if you don\'t see it.',
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: 'Tap "Add" in the top-right corner to confirm.',
          },
        ] as InstallStep[]
      ).map((step, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex items-start gap-2 pt-0.5">
            <span className="flex-shrink-0 mt-0.5">{step.icon}</span>
            <p className="text-sm text-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function AndroidInstructions() {
  return (
    <ol className="space-y-4 mt-4">
      {(
        [
          {
            icon: <MoreHorizontal size={16} className="text-primary" />,
            text: "Tap the \u22ee menu in the top-right corner of Chrome.",
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: '"Add to Home Screen" or "Install App" — tap it.',
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: 'Tap "Add" or "Install" to confirm and find CharlieSierra on your home screen.',
          },
        ] as InstallStep[]
      ).map((step, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex items-start gap-2 pt-0.5">
            <span className="flex-shrink-0 mt-0.5">{step.icon}</span>
            <p className="text-sm text-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function GenericInstructions() {
  return (
    <ol className="space-y-4 mt-4">
      {(
        [
          {
            icon: <Globe size={16} className="text-primary" />,
            text: "Open your browser menu (\u22ee or \u2630 button).",
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: 'Look for "Install app", "Install this site as an app", or "Add to Home Screen".',
          },
          {
            icon: <Monitor size={16} className="text-primary" />,
            text: "Confirm the installation to get CharlieSierra as a standalone app.",
          },
        ] as InstallStep[]
      ).map((step, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex items-start gap-2 pt-0.5">
            <span className="flex-shrink-0 mt-0.5">{step.icon}</span>
            <p className="text-sm text-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const BROWSER_TITLES: Record<BrowserInstallType, string> = {
  edge: "Install in Microsoft Edge",
  chrome: "Install in Chrome",
  ios: "Install on iOS",
  android: "Install on Android",
  generic: "Install CharlieSierra",
  auto: "Install CharlieSierra",
};

export function PWAInstallModal({
  open,
  onClose,
  browserInstallType,
}: PWAInstallModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-ocid="pwa.install_modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Monitor size={18} className="text-primary" aria-hidden="true" />
            {BROWSER_TITLES[browserInstallType]}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Follow these steps to install CharlieSierra as a standalone app on
            your device.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {browserInstallType === "edge" && <EdgeInstructions />}
          {browserInstallType === "chrome" && <ChromeInstructions />}
          {browserInstallType === "ios" && <IOSInstructions />}
          {browserInstallType === "android" && <AndroidInstructions />}
          {(browserInstallType === "generic" ||
            browserInstallType === "auto") && <GenericInstructions />}
        </div>

        <p className="text-[11px] text-muted-foreground border-t border-border pt-3 mt-1">
          Once installed, CharlieSierra runs in its own window with offline
          support and faster load times.
        </p>
      </DialogContent>
    </Dialog>
  );
}

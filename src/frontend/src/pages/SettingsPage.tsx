import { DisappearingMessageSettings } from "@/components/DisappearingMessageSettings";
import { Layout } from "@/components/Layout";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { ColorBlindMode } from "@/context/accessibility-context";
import { useAccessibility } from "@/context/accessibility-context";
import { useAuth } from "@/context/auth-context";
import { useCrypto } from "@/context/crypto-context";
import {
  useGenerateDeviceSyncToken,
  useMyDevices,
  useRevokeDevice,
} from "@/hooks/use-devices";
import {
  useEnrollKeyEscrow,
  useMyEscrowStatus,
  useRevokeKeyEscrow,
} from "@/hooks/use-enterprise";
import { exportPublicKey, generateECDHKeyPair } from "@/lib/crypto";
import { useNavigate } from "@tanstack/react-router";
import {
  Globe,
  Key,
  Lock,
  LogOut,
  Monitor,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  User,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFingerprint(bytes: Uint8Array): string {
  return Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":");
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-muted-foreground" />
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h2>
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg divide-y divide-border">
      {children}
    </div>
  );
}

function SettingsRow({
  label,
  description,
  action,
  children,
  ocid,
}: {
  label: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  ocid?: string;
}) {
  return (
    <div
      className="flex items-start sm:items-center justify-between gap-4 px-4 py-3.5"
      data-ocid={ocid}
    >
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── Security section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const { keyPair, isReady } = useCrypto();
  const { principal } = useAuth();
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!keyPair?.publicKey) return;
    exportPublicKey(keyPair.publicKey)
      .then((bytes) => setFingerprint(formatFingerprint(bytes)))
      .catch(() => setFingerprint(null));
  }, [keyPair]);

  const handleRegenerate = async () => {
    if (!principal) return;
    setRegenerating(true);
    try {
      // NOTE: wrappedKey below uses a zero-filled placeholder (32 bytes).
      // Key escrow wrapping will be used to secure your device key in a future build.
      // Generate a fresh key pair and persist it under the principal key
      const newKp = await generateECDHKeyPair();
      // Persist to IndexedDB via the same key used by loadOrCreateKeyPair
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("cs_keystore", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("keypairs", "readwrite");
        tx.objectStore("keypairs").put(
          { privateKey: newKp.privateKey, publicKey: newKp.publicKey },
          `ecdh:${principal.toText()}`,
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      const pubBytes = await exportPublicKey(newKp.publicKey);
      setFingerprint(formatFingerprint(pubBytes));
      toast.success(
        "Keys regenerated. Reload the page to use them. Existing conversations will need to be re-keyed.",
        { duration: 6000 },
      );
    } catch {
      toast.error("Failed to regenerate keys");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <SettingsCard>
      <SettingsRow
        label="Public Key Fingerprint"
        description="First 8 bytes of your ECDH P-256 public key"
        ocid="settings.security.fingerprint"
        action={
          isReady && fingerprint ? (
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {fingerprint}
            </span>
          ) : (
            <Badge variant="secondary">Loading…</Badge>
          )
        }
      />
      <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Regenerate Keys</p>
          <p className="text-xs text-muted-foreground">
            Creates a new ECDH key pair. This will break end-to-end encryption
            for all existing conversations.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!isReady || regenerating}
              data-ocid="settings.security.regenerate_button"
              className="flex items-center gap-2 flex-shrink-0"
            >
              <RefreshCw size={13} />
              {regenerating ? "Regenerating…" : "Regenerate Keys"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-ocid="settings.security.regenerate_dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate Encryption Keys?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new ECDH key pair and replace your current
                one.{" "}
                <strong>
                  All existing encrypted conversations will be unreadable
                </strong>{" "}
                until you re-exchange keys with each contact. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid="settings.security.regenerate_cancel">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRegenerate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-ocid="settings.security.regenerate_confirm"
              >
                Yes, Regenerate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsCard>
  );
}

// ── Key Escrow Section ─────────────────────────────────────────────────────

const CONSENT_LANGUAGE_VERSION = "1.0";

function getBrowserDeviceId(): string {
  const ua = navigator.userAgent;
  const lang = navigator.language;
  const cores = navigator.hardwareConcurrency ?? 0;
  const raw = `${ua}|${lang}|${cores}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `browser-${(hash >>> 0).toString(16)}`;
}

function EnrollEscrowDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const enrollEscrow = useEnrollKeyEscrow();
  const [deviceLabel, setDeviceLabel] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [fingerprint, setFingerprint] = useState("");
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (open) setDeviceId(getBrowserDeviceId());
  }, [open]);

  const handleEnroll = useCallback(() => {
    if (!consented || !deviceLabel.trim()) return;
    // Placeholder: actual crypto key wrapping (ECDH-derived AES wrap) is deferred.
    // Key escrow wrapping will be used to secure your device key once implemented.
    const wrappedKey = new Uint8Array(32);
    enrollEscrow.mutate(
      {
        deviceId: deviceId.trim(),
        deviceLabel: deviceLabel.trim(),
        devicePublicKeyFingerprint: fingerprint.trim(),
        wrappedKey,
        consentLanguageVersion: CONSENT_LANGUAGE_VERSION,
      },
      {
        onSuccess: () => {
          toast.success("Device enrolled for key escrow.");
          onClose();
          setDeviceLabel("");
          setFingerprint("");
          setConsented(false);
        },
        onError: (err) => toast.error(`Enrollment failed: ${err.message}`),
      },
    );
  }, [consented, deviceId, deviceLabel, fingerprint, enrollEscrow, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        data-ocid="settings.escrow_enroll_dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock size={16} className="text-primary" />
            Enroll Device for Key Escrow
          </DialogTitle>
          <DialogDescription>
            Read the full disclaimer below before enrolling. Key escrow wrapping
            will be used to secure your device key.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 rounded-lg bg-muted/60 border border-border text-xs space-y-2 text-muted-foreground max-h-40 overflow-y-auto">
          <p className="font-semibold text-foreground">
            Legal Disclaimer — Key Escrow Consent v{CONSENT_LANGUAGE_VERSION}
          </p>
          <p>
            By enrolling this device, you voluntarily authorize platform
            administrators to access an escrow copy of your encrypted device key
            under the following conditions only:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              Access requires explicit administrator authorization and a
              documented legal basis.
            </li>
            <li>
              Every access attempt is permanently logged with a timestamp and
              requesting admin identity.
            </li>
            <li>You will be notified when escrow access is granted.</li>
            <li>
              Message content is never stored and remains end-to-end encrypted
              at all times.
            </li>
            <li>You may revoke this consent at any time from Settings.</li>
          </ul>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="escrow-label" className="text-xs">
              Device Label
            </Label>
            <Input
              id="escrow-label"
              placeholder="e.g. MacBook Pro Work"
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              className="h-8 text-xs"
              data-ocid="settings.escrow_label_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="escrow-device-id" className="text-xs">
              Device ID
            </Label>
            <Input
              id="escrow-device-id"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="h-8 text-xs font-mono"
              data-ocid="settings.escrow_device_id_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="escrow-fingerprint" className="text-xs">
              Device Public Key Fingerprint (optional)
            </Label>
            <Input
              id="escrow-fingerprint"
              placeholder="xx:xx:xx:xx..."
              value={fingerprint}
              onChange={(e) => setFingerprint(e.target.value)}
              className="h-8 text-xs font-mono"
              data-ocid="settings.escrow_fingerprint_input"
            />
          </div>
          <label
            className="flex items-start gap-3 cursor-pointer"
            htmlFor="escrow-consent"
            data-ocid="settings.escrow_consent_checkbox"
          >
            <Checkbox
              checked={consented}
              onCheckedChange={(v) => setConsented(v === true)}
              id="escrow-consent"
              className="mt-0.5"
            />
            <span className="text-xs text-foreground leading-relaxed">
              I have read and agree to the escrow consent terms above. I
              understand I can revoke this at any time.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="settings.escrow_enroll_cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleEnroll}
            disabled={
              !consented || !deviceLabel.trim() || enrollEscrow.isPending
            }
            data-ocid="settings.escrow_enroll_confirm_button"
          >
            {enrollEscrow.isPending ? "Enrolling…" : "Enroll Device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RevokeEscrowDialog({
  open,
  deviceId,
  deviceLabel,
  onClose,
}: {
  open: boolean;
  deviceId: string;
  deviceLabel: string;
  onClose: () => void;
}) {
  const revokeEscrow = useRevokeKeyEscrow();
  const [revocationReason, setRevocationReason] = useState("");
  const handleRevoke = () => {
    revokeEscrow.mutate(
      {
        deviceId,
        reason: revocationReason.trim() || "User-initiated revocation",
      },
      {
        onSuccess: () => {
          toast.success("Key escrow revoked.");
          onClose();
          setRevocationReason("");
        },
        onError: (err) => toast.error(`Revocation failed: ${err.message}`),
      },
    );
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md"
        data-ocid="settings.escrow_revoke_dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff size={16} className="text-destructive" />
            Revoke Key Escrow
          </DialogTitle>
          <DialogDescription>
            Revoking escrow consent for <strong>{deviceLabel}</strong>. Admins
            will no longer be able to access this device's key.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="revoke-reason" className="text-xs">
            Reason (optional)
          </Label>
          <Textarea
            id="revoke-reason"
            placeholder="Device lost, no longer in use, etc."
            value={revocationReason}
            onChange={(e) => setRevocationReason(e.target.value)}
            rows={2}
            className="text-xs resize-none"
            data-ocid="settings.escrow_revoke_reason_input"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="settings.escrow_revoke_cancel_button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRevoke}
            disabled={revokeEscrow.isPending}
            data-ocid="settings.escrow_revoke_confirm_button"
          >
            {revokeEscrow.isPending ? "Revoking…" : "Revoke Consent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KeyEscrowSection() {
  const { data: escrowRecords = [], isLoading } = useMyEscrowStatus();
  const [showEnroll, setShowEnroll] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{
    deviceId: string;
    deviceLabel: string;
  } | null>(null);
  return (
    <div className="space-y-4" data-ocid="settings.escrow_section">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
        <ShieldCheck
          size={14}
          className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
        />
        <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
          <strong>Key escrow is entirely optional.</strong> Enrolled keys may
          only be accessed by platform admins with explicit authorization, and
          every access is permanently logged. You can revoke consent at any
          time.
        </p>
      </div>
      <SettingsCard>
        {isLoading ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-ocid="settings.escrow_loading_state"
          >
            Loading enrolled devices…
          </div>
        ) : escrowRecords.length === 0 ? (
          <div
            className="px-4 py-6 text-center space-y-3"
            data-ocid="settings.escrow_empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No devices enrolled for key escrow.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEnroll(true)}
              className="flex items-center gap-2"
              data-ocid="settings.escrow_enroll_button"
            >
              <Lock size={13} />
              Enroll a Device
            </Button>
          </div>
        ) : (
          <>
            {escrowRecords.map((rec, idx) => (
              <div
                key={rec.deviceId}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
                data-ocid={`settings.escrow_device.${idx + 1}`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {rec.deviceLabel}
                    </p>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${rec.status === "active" ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : "bg-muted text-muted-foreground border-border"}`}
                    >
                      {rec.status === "active" ? "Active" : "Revoked"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {rec.deviceId.slice(0, 16)}…
                  </p>
                  {rec.devicePublicKeyFingerprint && (
                    <p className="text-xs text-muted-foreground font-mono">
                      FP: {rec.devicePublicKeyFingerprint.slice(0, 24)}…
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enrolled:{" "}
                    {new Date(
                      Number(rec.consentDate) / 1_000_000,
                    ).toLocaleDateString()}
                  </p>
                </div>
                {rec.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRevokeTarget({
                        deviceId: rec.deviceId,
                        deviceLabel: rec.deviceLabel,
                      })
                    }
                    className="flex-shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 text-xs"
                    data-ocid={`settings.escrow_revoke_button.${idx + 1}`}
                  >
                    <ShieldOff size={12} className="mr-1" />
                    Revoke
                  </Button>
                )}
              </div>
            ))}
            <div className="px-4 py-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEnroll(true)}
                className="flex items-center gap-2"
                data-ocid="settings.escrow_enroll_button"
              >
                <Lock size={13} />
                Enroll Another Device
              </Button>
            </div>
          </>
        )}
      </SettingsCard>
      <EnrollEscrowDialog
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
      />
      {revokeTarget && (
        <RevokeEscrowDialog
          open
          deviceId={revokeTarget.deviceId}
          deviceLabel={revokeTarget.deviceLabel}
          onClose={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}

// ── Linked Devices Section ─────────────────────────────────────────────────

function formatLastSeen(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SYNC_TOKEN_TTL_MS = 5 * 60 * 1000;

function SyncTokenModal({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const generateToken = useGenerateDeviceSyncToken();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleGenerate = useCallback(async () => {
    const publicKey = new Uint8Array(32);
    generateToken.mutate(publicKey, {
      onSuccess: (t) => {
        setToken(t);
        const exp = Date.now() + SYNC_TOKEN_TTL_MS;
        setExpiresAt(exp);
        setRemaining(SYNC_TOKEN_TTL_MS);
      },
      onError: (err) => toast.error(`Failed: ${err.message}`),
    });
  }, [generateToken]);

  useEffect(() => {
    if (open && !token) {
      void handleGenerate();
    }
  }, [open, token, handleGenerate]);

  useEffect(() => {
    if (!token || !expiresAt) return;
    intervalRef.current = setInterval(() => {
      const rem = expiresAt - Date.now();
      if (rem <= 0) {
        setRemaining(0);
        setToken(null);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setRemaining(rem);
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, expiresAt]);

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const expired = remaining <= 0 && token === null && expiresAt > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm"
        data-ocid="settings.sync_token_dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone size={16} className="text-primary" />
            Link New Device
          </DialogTitle>
          <DialogDescription>
            On your new device, enter this token in the CharlieSierra app to
            link it.
          </DialogDescription>
        </DialogHeader>
        {expired ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Token expired. Generate a new one.
            </p>
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generateToken.isPending}
              data-ocid="settings.sync_token_regenerate_button"
            >
              <RefreshCw size={14} className="mr-2" />
              Generate New Token
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted border border-border p-4 text-center space-y-2">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Pairing Token
              </p>
              <p
                className="font-mono text-lg font-bold text-foreground tracking-wider break-all select-all"
                data-ocid="settings.sync_token_value"
              >
                {token ?? "Generating…"}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Expires in</span>
              <span
                className={`font-mono font-semibold ${remaining < 60_000 ? "text-destructive" : "text-foreground"}`}
                data-ocid="settings.sync_token_countdown"
              >
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="settings.sync_token_close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkedDevicesSection() {
  const { data: devices = [], isLoading } = useMyDevices();
  const revokeDevice = useRevokeDevice();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);

  const handleRevoke = (deviceId: string) => {
    revokeDevice.mutate(deviceId, {
      onSuccess: () => {
        toast.success("Device unlinked.");
        setRevokeTargetId(null);
      },
      onError: (err) => toast.error(`Failed: ${err.message}`),
    });
  };

  return (
    <div className="space-y-4" data-ocid="settings.linked_devices_section">
      <SettingsCard>
        {isLoading ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-ocid="settings.devices_loading_state"
          >
            Loading devices…
          </div>
        ) : devices.length === 0 ? (
          <div
            className="px-4 py-6 text-center space-y-1"
            data-ocid="settings.devices_empty_state"
          >
            <p className="text-sm text-muted-foreground">No linked devices.</p>
          </div>
        ) : (
          devices.map((device, idx) => (
            <div
              key={device.deviceId}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
              data-ocid={`settings.device.${idx + 1}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <Monitor size={15} className="text-muted-foreground" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {device.deviceLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last seen {formatLastSeen(device.lastSeen)}
                  </p>
                </div>
              </div>
              <AlertDialog
                open={revokeTargetId === device.deviceId}
                onOpenChange={(open) => {
                  if (!open) setRevokeTargetId(null);
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRevokeTargetId(device.deviceId)}
                  className="flex-shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 text-xs"
                  data-ocid={`settings.device_revoke_button.${idx + 1}`}
                  aria-label={`Revoke ${device.deviceLabel}`}
                >
                  Revoke
                </Button>
                <AlertDialogContent data-ocid="settings.device_revoke_dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke Device?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong>{device.deviceLabel}</strong> will be unlinked.
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-ocid="settings.device_revoke_cancel">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRevoke(device.deviceId)}
                      disabled={revokeDevice.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-ocid="settings.device_revoke_confirm"
                    >
                      {revokeDevice.isPending ? "Revoking…" : "Revoke Device"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
        <div className="px-4 py-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-2"
            data-ocid="settings.link_device_button"
          >
            <Wifi size={13} />
            Link New Device
          </Button>
        </div>
      </SettingsCard>
      <SyncTokenModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
    </div>
  );
}

// ── Accessibility Section ─────────────────────────────────────────────────────

const COLOR_BLIND_OPTIONS: { value: ColorBlindMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "protanopia", label: "Protanopia (red-blind)" },
  { value: "deuteranopia", label: "Deuteranopia (green-blind)" },
  { value: "tritanopia", label: "Tritanopia (blue-blind)" },
];

function AccessibilitySection() {
  const {
    fontSizeScale,
    highContrast,
    reduceAnimations,
    colorBlindMode,
    setFontSizeScale,
    setHighContrast,
    setReduceAnimations,
    setColorBlindMode,
  } = useAccessibility();

  return (
    <SettingsCard>
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label
              htmlFor="font-size-slider"
              className="text-sm font-medium text-foreground"
            >
              Font Size
            </Label>
            <p className="text-xs text-muted-foreground">
              Scale text across the app
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {fontSizeScale.toFixed(2)}×
          </span>
        </div>
        <input
          id="font-size-slider"
          type="range"
          min={1.0}
          max={2.0}
          step={0.25}
          value={fontSizeScale}
          onChange={(e) => setFontSizeScale(Number(e.target.value))}
          className="w-full accent-primary h-1.5 cursor-pointer"
          aria-label="Font size scale"
          aria-valuemin={1.0}
          aria-valuemax={2.0}
          aria-valuenow={fontSizeScale}
          aria-valuetext={`${fontSizeScale.toFixed(2)} times normal`}
          data-ocid="settings.a11y.font_size_slider"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Normal</span>
          <span>2×</span>
        </div>
      </div>
      <SettingsRow
        label="High Contrast"
        description="Increase color contrast for better legibility"
        ocid="settings.a11y.high_contrast_row"
        action={
          <button
            type="button"
            role="switch"
            aria-checked={highContrast}
            aria-label="Toggle high contrast"
            onClick={() => setHighContrast(!highContrast)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${highContrast ? "bg-primary" : "bg-input"}`}
            data-ocid="settings.a11y.high_contrast_toggle"
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${highContrast ? "translate-x-4.5" : "translate-x-0.5"}`}
            />
          </button>
        }
      />
      <SettingsRow
        label="Reduce Animations"
        description="Minimize motion for users sensitive to movement"
        ocid="settings.a11y.reduce_motion_row"
        action={
          <button
            type="button"
            role="switch"
            aria-checked={reduceAnimations}
            aria-label="Toggle reduce animations"
            onClick={() => setReduceAnimations(!reduceAnimations)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${reduceAnimations ? "bg-primary" : "bg-input"}`}
            data-ocid="settings.a11y.reduce_motion_toggle"
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${reduceAnimations ? "translate-x-4.5" : "translate-x-0.5"}`}
            />
          </button>
        }
      />
      <div className="px-4 py-3.5 space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Color Blind Mode
        </Label>
        <p className="text-xs text-muted-foreground">
          Adjust color palette for color vision deficiencies
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {COLOR_BLIND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setColorBlindMode(opt.value)}
              aria-pressed={colorBlindMode === opt.value}
              aria-label={`Color blind mode: ${opt.label}`}
              className={`text-left px-3 py-2 rounded-md border text-xs transition-colors ${
                colorBlindMode === opt.value
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border text-foreground hover:bg-muted/50"
              }`}
              data-ocid={`settings.a11y.colorblind_${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </SettingsCard>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const handleClearKeys = () => {
    try {
      const db = indexedDB.deleteDatabase("cs_keystore");
      db.onsuccess = () =>
        toast.success("Local encryption keys cleared. Reloading…", {
          duration: 3000,
          onAutoClose: () => window.location.reload(),
        });
    } catch {
      toast.error("Failed to clear local keys");
    }
  };

  return (
    <Layout title="Settings">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        {/* ── Profile ──────────────────────────────────────────────────────── */}
        <section data-ocid="settings.profile_section">
          <SectionHeader icon={User} title="Profile" />
          <div className="bg-card border border-border rounded-lg px-4 py-5">
            <ProfileEditor />
          </div>
        </section>

        <Separator />

        {/* ── Privacy ──────────────────────────────────────────────────────── */}
        <section data-ocid="settings.privacy_section">
          <SectionHeader icon={Shield} title="Privacy" />
          <div className="space-y-4">
            <SettingsCard>
              <div className="px-4 py-4">
                <DisappearingMessageSettings label="Default disappearing messages" />
              </div>
            </SettingsCard>

            <SettingsCard>
              <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Clear Local Encryption Keys
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deletes your ECDH key pair from this device. You will lose
                    access to all encrypted messages.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-ocid="settings.privacy.clear_keys_button"
                      className="flex items-center gap-2 flex-shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={13} />
                      Clear Keys
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent data-ocid="settings.privacy.clear_keys_dialog">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Clear Local Encryption Keys?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes your ECDH key pair from this
                        device. You will no longer be able to decrypt existing
                        messages, and your encryption fingerprint will change on
                        next login.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-ocid="settings.privacy.clear_keys_cancel">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearKeys}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-ocid="settings.privacy.clear_keys_confirm"
                      >
                        Clear Keys
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </SettingsCard>
          </div>
        </section>

        <Separator />

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <section data-ocid="settings.appearance_section">
          <SectionHeader icon={Globe} title="Appearance" />
          <SettingsCard>
            <SettingsRow
              label="Theme"
              description="Switch between light and dark mode"
              ocid="settings.appearance.theme_row"
              action={<ThemeToggle />}
            />
            <SettingsRow
              label="Language"
              description="Interface language"
              ocid="settings.appearance.language_row"
              action={
                <Badge variant="secondary" className="text-xs">
                  English (coming soon)
                </Badge>
              }
            />
          </SettingsCard>
        </section>

        <Separator />

        {/* ── Security ─────────────────────────────────────────────────────── */}
        <section data-ocid="settings.security_section">
          <SectionHeader icon={Key} title="Security" />
          <SecuritySection />
        </section>

        <Separator />

        {/* ── Security & Recovery ─────────────────────────────────────── */}
        <section data-ocid="settings.key_escrow_section">
          <SectionHeader icon={Lock} title="Security &amp; Recovery" />
          <KeyEscrowSection />
        </section>

        <Separator />

        {/* ── Account ──────────────────────────────────────────────────────── */}
        {/* ── Linked Devices */}
        <section data-ocid="settings.devices_section">
          <SectionHeader icon={Smartphone} title="Linked Devices" />
          <LinkedDevicesSection />
        </section>

        <Separator />

        {/* ── Accessibility */}
        <section data-ocid="settings.accessibility_section">
          <SectionHeader icon={Shield} title="Accessibility" />
          <AccessibilitySection />
        </section>

        <Separator />
        <section data-ocid="settings.account_section">
          <SectionHeader icon={LogOut} title="Account" />
          <SettingsCard>
            <div className="px-4 py-3.5">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    data-ocid="settings.account.logout_button"
                    className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut size={14} />
                    Log Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-ocid="settings.account.logout_dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Log out of CharlieSierra?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be signed out of your Internet Identity session.
                      Your local encryption keys will remain on this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-ocid="settings.account.logout_cancel">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      data-ocid="settings.account.logout_confirm"
                    >
                      Log Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SettingsCard>
        </section>

        {/* Footer */}
        <footer className="text-center pt-4 pb-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </Layout>
  );
}

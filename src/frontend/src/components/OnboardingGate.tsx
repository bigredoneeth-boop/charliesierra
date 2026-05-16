import { LoadingSpinner } from "@/components/LoadingSpinner";
/**
 * OnboardingGate
 *
 * Wraps authenticated routes and enforces that the user has set a display
 * name before they can access the app. Shows a full-screen prompt if no
 * display name has been set yet.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { useCrypto } from "@/context/crypto-context";
import {
  setLocalDisplayName,
  useHasDisplayName,
  useUpdateProfile,
  useUserProfile,
} from "@/hooks/use-profiles";
import {
  deriveDisplayNameKey,
  encryptMessage,
  exportPublicKey,
} from "@/lib/crypto";
import { ShieldCheck } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface OnboardingGateProps {
  children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { principal } = useAuth();
  const { keyPair, isReady, isNewKeyPair } = useCrypto();
  const hasDisplayName = useHasDisplayName();
  const updateProfile = useUpdateProfile();
  const { data: profile } = useUserProfile(principal ?? null);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Show "Still loading…" hint after 2s; treat null as false (new user) after 6s
  useEffect(() => {
    if (hasDisplayName !== null) return;
    const hintTimer = setTimeout(() => setLoadingTooLong(true), 2_000);
    const giveUpTimer = setTimeout(() => setTimedOut(true), 6_000);
    return () => {
      clearTimeout(hintTimer);
      clearTimeout(giveUpTimer);
    };
  }, [hasDisplayName]);

  // Auto-publish ECDH public key to backend profile whenever a brand-new key pair is generated.
  // This ensures the backend profile always has the current public key so peers can derive the shared secret.
  // IMPORTANT: preserve any existing encryptedDisplayName — only overwrite ecdhPublicKey.
  useEffect(() => {
    if (!isNewKeyPair || !keyPair || !isReady || !principal) return;
    console.log(
      "[E2EE KEYSYNC] New key pair detected, publishing public key to backend profile",
    );
    (async () => {
      try {
        const pubBytes = await exportPublicKey(keyPair.publicKey);
        const fp = Array.from(pubBytes.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.log(
          `[E2EE KEYSYNC] Exporting public key fingerprint=${fp}, publishing to profile`,
        );
        // Preserve existing encryptedDisplayName bytes — never replace them with an empty array.
        // If the profile has not loaded yet, pass empty bytes as a safe default for a brand-new account.
        const existingDisplayName =
          profile?.encryptedDisplayName &&
          profile.encryptedDisplayName.length > 0
            ? new Uint8Array(
                profile.encryptedDisplayName as unknown as ArrayBuffer,
              )
            : new Uint8Array(0);
        await updateProfile.mutateAsync({
          encryptedDisplayName: existingDisplayName,
          ecdhPublicKey: pubBytes,
        });
        console.log(
          "[E2EE KEYSYNC] Public key published to backend profile successfully",
        );
      } catch (err) {
        console.warn(
          "[E2EE KEYSYNC] Failed to publish public key to profile:",
          err,
        );
      }
    })();
  }, [isNewKeyPair, keyPair, isReady, principal, profile, updateProfile]);

  // Decrypt and cache own display name once profile + keyPair are ready
  const { decryptOwnDisplayName } = useCrypto();
  useEffect(() => {
    if (!principal || !isReady || !keyPair || !profile) return;
    if (profile.encryptedDisplayName.length === 0) return;
    const principalText = principal.toText();
    // Only decrypt if not already cached
    const cached = localStorage.getItem(`cs_name:${principalText}`);
    if (cached?.trim()) return;
    decryptOwnDisplayName(
      new Uint8Array(profile.encryptedDisplayName as unknown as ArrayBuffer),
    )
      .then((decrypted) => {
        if (decrypted?.trim()) {
          setLocalDisplayName(principalText, decrypted.trim());
          setLocalReady((prev) => !prev); // trigger re-check
        }
      })
      .catch(() => {});
  }, [principal, isReady, keyPair, profile, decryptOwnDisplayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) return;
    if (!keyPair || !isReady || !principal) return;

    setSaving(true);
    try {
      const pubBytes = await exportPublicKey(keyPair.publicKey);
      const aesKey = await deriveDisplayNameKey(principal);
      const encryptedDisplayName = await encryptMessage(aesKey, trimmed);

      await updateProfile.mutateAsync({
        encryptedDisplayName,
        ecdhPublicKey: pubBytes,
      });

      // Cache plaintext locally so we can display it everywhere
      setLocalDisplayName(principal.toText(), trimmed);
      toast.success(`Welcome, ${trimmed}!`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not save your name. Please try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    name.trim().length >= 2 && name.trim().length <= 50 && isReady && !!keyPair;

  // Wait until we know definitively whether the user has a display name.
  // - After 6s timeout, treat as new user (timedOut=true) and show setup form.
  // - Show a hint after 2s so users know it's still working.
  if (hasDisplayName === null && !timedOut) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
        data-ocid="onboarding.loading_state"
      >
        <LoadingSpinner size={36} label="Securing your session…" />
        {loadingTooLong && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Still setting up… this usually takes a few seconds.
          </p>
        )}
      </div>
    );
  }
  if (hasDisplayName) return <>{children}</>;

  // localReady is just used to trigger re-evaluation — suppress lint warning
  void localReady;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      data-ocid="onboarding.page"
    >
      <div className="w-full max-w-md px-6 py-10 flex flex-col items-center gap-8">
        {/* Logo / brand mark */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/assets/newshieldlogo.png"
            alt="CharlieSierra"
            className="h-16 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome to CharlieSierra
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Before you start, choose a display name others will see.
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full space-y-5"
          data-ocid="onboarding.form"
        >
          <div className="space-y-2">
            <Label htmlFor="onboarding-name" className="text-sm font-medium">
              Display Name
            </Label>
            <Input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex, Commander J, Sierra-7"
              minLength={2}
              maxLength={50}
              autoFocus
              disabled={saving || !isReady}
              data-ocid="onboarding.name_input"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              2–50 characters. Your name is encrypted before leaving this
              device.
            </p>
          </div>

          {/* Validation hint */}
          {name.trim().length > 0 && name.trim().length < 2 && (
            <p
              className="text-xs text-destructive"
              data-ocid="onboarding.name_field_error"
            >
              Name must be at least 2 characters.
            </p>
          )}

          {!isReady && (
            <p
              className="text-xs text-muted-foreground text-center"
              data-ocid="onboarding.loading_state"
            >
              Initialising secure keys…
            </p>
          )}

          <Button
            type="submit"
            disabled={!isValid || saving || !isReady}
            data-ocid="onboarding.submit_button"
            className="w-full"
          >
            {saving ? "Saving…" : !isReady ? "Please wait…" : "Continue"}
          </Button>
        </form>

        {/* Trust badge */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck size={13} className="text-primary" />
          <span>Authenticated via Internet Identity · E2EE secured</span>
        </div>
      </div>
    </div>
  );
}

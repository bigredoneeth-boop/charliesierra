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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface OnboardingGateProps {
  children: React.ReactNode;
}

// Module-level cooldown timestamp — persists across re-renders and prevents
// publishing more than once every 5 seconds regardless of React re-render cycles.
let lastPublishTime = 0;

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { principal } = useAuth();
  const { keyPair, isReady, isNewKeyPair, setIsNewKeyPair } = useCrypto();
  // Session-scoped guard: once we publish the key once, never publish again this session.
  const hasPublishedRef = useRef(false);
  const hasDisplayName = useHasDisplayName();
  const updateProfile = useUpdateProfile();
  const { data: profile } = useUserProfile(principal ?? null);

  // Stable refs holding the latest profile + mutateAsync so the key-sync effect
  // can read them without listing them as reactive deps (which caused the loop).
  const profileRef = useRef(profile);
  const mutateAsyncRef = useRef(updateProfile.mutateAsync);
  useEffect(() => {
    profileRef.current = profile;
  });
  useEffect(() => {
    mutateAsyncRef.current = updateProfile.mutateAsync;
  });

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
  //
  // Loop-breaker guards (applied in order):
  //   1. hasPublishedRef  — session-scoped ref; skips if we already published this session.
  //   2. cooldown         — module-level timestamp; skips if < 5 s since last publish.
  //   3. fingerprint      — byte-level comparison; skips if profile already has this public key.
  // After a successful publish, setIsNewKeyPair(false) prevents this effect from re-running.
  // `profile` and `updateProfile` are intentionally NOT in the dependency array — they change
  // after every successful publish (query invalidation) which is exactly what caused the loop.
  useEffect(() => {
    if (!isNewKeyPair || !keyPair || !isReady || !principal) return;

    // Guard 1: already published this session
    if (hasPublishedRef.current) {
      console.log(
        "[E2EE KEYSYNC] Skipping publish - already published this session",
      );
      return;
    }

    // Guard 2: cooldown — don't publish more than once every 5 seconds
    const now = Date.now();
    if (now - lastPublishTime < 5_000) {
      console.log("[E2EE KEYSYNC] Skipping publish - cooldown active");
      return;
    }

    console.log(
      "[E2EE KEYSYNC] New key pair detected, publishing public key to backend profile",
    );

    (async () => {
      try {
        const pubBytes = await exportPublicKey(keyPair.publicKey);
        const fp = Array.from(pubBytes.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Guard 3: fingerprint comparison — skip if the profile already stores this exact key.
        // Read from ref so this comparison uses the latest loaded profile without
        // making profile a reactive dep (adding profile would re-trigger the effect
        // every time the query re-fetches after the publish, causing the loop).
        const latestProfile = profileRef.current;
        const storedKey = latestProfile?.ecdhPublicKey;
        if (storedKey && storedKey.length === pubBytes.length) {
          const storedBytes = new Uint8Array(
            storedKey instanceof Uint8Array
              ? storedKey.buffer.slice(
                  storedKey.byteOffset,
                  storedKey.byteOffset + storedKey.byteLength,
                )
              : (storedKey as unknown as ArrayBuffer),
          );
          const identical = pubBytes.every((b, i) => b === storedBytes[i]);
          if (identical) {
            console.log(
              "[E2EE KEYSYNC] Public key unchanged - skipping publish",
            );
            hasPublishedRef.current = true;
            setIsNewKeyPair(false);
            return;
          }
        }

        // Mark as published BEFORE the async call so concurrent effect invocations
        // (e.g. StrictMode double-invoke) don't slip through the guard.
        hasPublishedRef.current = true;
        lastPublishTime = Date.now();

        // Preserve existing encryptedDisplayName bytes — never replace them with an empty array.
        // Read via ref — not a reactive dep to avoid re-triggering after publish.
        const existingDisplayName =
          latestProfile?.encryptedDisplayName &&
          latestProfile.encryptedDisplayName.length > 0
            ? new Uint8Array(
                latestProfile.encryptedDisplayName instanceof Uint8Array
                  ? latestProfile.encryptedDisplayName.buffer.slice(
                      latestProfile.encryptedDisplayName.byteOffset,
                      latestProfile.encryptedDisplayName.byteOffset +
                        latestProfile.encryptedDisplayName.byteLength,
                    )
                  : (latestProfile.encryptedDisplayName as unknown as ArrayBuffer),
              )
            : new Uint8Array(0);

        await mutateAsyncRef.current({
          encryptedDisplayName: existingDisplayName,
          ecdhPublicKey: pubBytes,
        });

        // Reset the flag AFTER successful publish so this effect never re-triggers.
        setIsNewKeyPair(false);
        console.log(
          `[E2EE KEYSYNC] Published new public key (fingerprint=${fp})`,
        );
      } catch (err) {
        // On failure, reset hasPublishedRef so a manual retry is possible on next login.
        hasPublishedRef.current = false;
        console.warn(
          "[E2EE KEYSYNC] Failed to publish public key to profile:",
          err,
        );
      }
    })();
  }, [isNewKeyPair, keyPair, isReady, principal, setIsNewKeyPair]);

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

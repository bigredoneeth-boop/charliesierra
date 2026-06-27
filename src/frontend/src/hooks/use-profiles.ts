import { createActor } from "@/backend";
import type { UserId, UserProfilePublic } from "@/backend";
import { useAuth } from "@/context/auth-context";
import { extractErrText } from "@/lib/error-utils";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useUserProfile(userId: UserId | null) {
  const { actor } = useActor(createActor);
  return useQuery<UserProfilePublic | null>({
    queryKey: ["profile", userId?.toText()],
    queryFn: async () => {
      if (!actor || !userId) return null;
      return actor.getUserProfile(userId);
    },
    enabled: !!actor && !!userId,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useUserProfiles(userIds: UserId[]) {
  const { actor } = useActor(createActor);
  return useQuery<UserProfilePublic[]>({
    queryKey: ["profiles", userIds.map((u) => u.toText()).join(",")],
    queryFn: async () => {
      if (!actor || userIds.length === 0) return [];
      return actor.getUserProfiles(userIds);
    },
    enabled: !!actor && userIds.length > 0,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useUpdateProfile() {
  const { actor } = useActor(createActor);
  const { principal } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      encryptedDisplayName,
      ecdhPublicKey,
      encryptedAvatarKey,
    }: {
      encryptedDisplayName?: Uint8Array;
      ecdhPublicKey?: Uint8Array;
      encryptedAvatarKey?: string;
    }) => {
      if (!actor) throw new Error("Not connected");

      // CRITICAL: Backend rejects undefined fields with invalidInput.
      // Always send all three fields as valid values.
      const safeEncryptedDisplayName =
        encryptedDisplayName instanceof Uint8Array
          ? encryptedDisplayName
          : new Uint8Array(0);
      const safeEcdhPublicKey =
        ecdhPublicKey instanceof Uint8Array ? ecdhPublicKey : new Uint8Array(0);
      const safeEncryptedAvatarKey = encryptedAvatarKey ?? "";

      console.log(
        "[useUpdateProfile] Sending update with:",
        "encryptedDisplayName.length=",
        safeEncryptedDisplayName.length,
        "ecdhPublicKey.length=",
        safeEcdhPublicKey.length,
        "encryptedAvatarKey.length=",
        safeEncryptedAvatarKey.length,
      );

      // Attempt the update; if the user isn't registered yet, auto-register first.
      let result = await actor.updateUserProfile({
        encryptedDisplayName: safeEncryptedDisplayName,
        ecdhPublicKey: safeEcdhPublicKey,
        encryptedAvatarKey: safeEncryptedAvatarKey,
      });

      // Log the EXACT raw result for debugging before any parsing.
      console.log(
        "[useUpdateProfile] Raw result from updateUserProfile:",
        result,
      );

      // Backend.ts bug: Error enum values deserialize to `undefined` instead of
      // the correct Error_ string. Detect this by checking for an err result
      // where err is falsy (undefined) — treat it the same as a real notFound.
      const isNotFound =
        result.__kind__ === "err" &&
        (!result.err || extractErrText(result) === "notFound");

      if (isNotFound) {
        // User not registered yet — auto-register with the provided credentials.
        // Use safe values (already computed above)
        if (
          safeEncryptedDisplayName.length === 0 ||
          safeEcdhPublicKey.length === 0
        ) {
          throw new Error(
            "Profile not found on server. Please reload and try again.",
          );
        }
        const regResult = await actor.registerUser({
          encryptedDisplayName: safeEncryptedDisplayName,
          ecdhPublicKey: safeEcdhPublicKey,
          encryptedAvatarKey: safeEncryptedAvatarKey,
        });
        // Log the EXACT raw registration result for debugging.
        console.log(
          "[useUpdateProfile] Raw result from registerUser:",
          regResult,
        );
        // If registration also fails, surface the error clearly.
        if (regResult.__kind__ === "err") {
          // alreadyExists means someone else registered while we were trying —
          // retry the update once more.
          result = await actor.updateUserProfile({
            encryptedDisplayName: safeEncryptedDisplayName,
            ecdhPublicKey: safeEcdhPublicKey,
            encryptedAvatarKey: safeEncryptedAvatarKey,
          });
          console.log(
            "[useUpdateProfile] Retry updateUserProfile raw result:",
            result,
          );
        } else {
          return regResult.ok;
        }
      }

      if (result.__kind__ === "err") {
        const errText = extractErrText(result);
        console.warn("[useUpdateProfile] Extracted error text:", errText);
        throw new Error(`Update failed: ${errText}`);
      }

      return result.ok;
    },
    onSuccess: (updatedProfile) => {
      // Scope invalidation to ONLY the calling user's profile — never the broad ['profile'] prefix.
      const userId = principal?.toText();
      if (!userId) return;
      if (updatedProfile) {
        queryClient.setQueryData<UserProfilePublic | null>(
          ["profile", userId],
          updatedProfile,
        );
      }
      queryClient.invalidateQueries({
        queryKey: ["profile", userId],
        exact: true,
      });
    },
  });
}

/**
 * Avatar local storage utilities.
 * Avatars are stored as data URLs keyed by principal in localStorage.
 * The localStorage key is also written to the backend as encryptedAvatarKey
 * so other code can distinguish "has avatar" vs "no avatar" cross-device.
 */
export const AVATAR_STORAGE_PREFIX = "cs_avatar:";

export function getLocalAvatarKey(principal: string): string {
  return `${AVATAR_STORAGE_PREFIX}${principal}`;
}

export function getLocalAvatarDataUrl(principal: string): string | null {
  try {
    return localStorage.getItem(getLocalAvatarKey(principal));
  } catch {
    return null;
  }
}

export function setLocalAvatarDataUrl(
  principal: string,
  dataUrl: string,
): void {
  try {
    localStorage.setItem(getLocalAvatarKey(principal), dataUrl);
  } catch {
    // Ignore storage quota errors
  }
}

export function removeLocalAvatar(principal: string): void {
  try {
    localStorage.removeItem(getLocalAvatarKey(principal));
  } catch {
    // Ignore
  }
}

export type { UserProfilePublic, UserId };

// ── Display name local cache ─────────────────────────────────────────────────
// Display names encrypted with owner's own key cannot be decrypted by others.
// We cache plaintext names in localStorage (keyed by principal) so that:
//   - Your own name is always stored when you set it.
//   - Others' names are cached if we ever receive them (e.g. from a shared
//     name announcement) or fall back to a shortened principal.

export const DISPLAY_NAME_PREFIX = "cs_name:";

export function getLocalDisplayName(principal: string): string | null {
  try {
    return localStorage.getItem(`${DISPLAY_NAME_PREFIX}${principal}`);
  } catch {
    return null;
  }
}

export function setLocalDisplayName(principal: string, name: string): void {
  try {
    if (name.trim()) {
      localStorage.setItem(`${DISPLAY_NAME_PREFIX}${principal}`, name.trim());
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function removeLocalDisplayName(principal: string): void {
  try {
    localStorage.removeItem(`${DISPLAY_NAME_PREFIX}${principal}`);
  } catch {
    // Ignore
  }
}

/** Shorten a principal ID for display when no name is available. */
export function shortPrincipal(principal: string): string {
  if (principal.length <= 16) return principal;
  return `${principal.slice(0, 10)}\u2026${principal.slice(-4)}`;
}

/**
 * Returns the best available display name for a principal:
 * 1. Cached plaintext name from localStorage
 * 2. Shortened principal as fallback
 */
export function getDisplayName(principal: string): string {
  return getLocalDisplayName(principal) ?? shortPrincipal(principal);
}

/**
 * React hook — reactively returns the display name for any principal.
 * Re-renders when the localStorage cache changes (via storage events or
 * manual polling). For own principal, also accepts an optional decryptedName
 * override that will also be written to the cache.
 */
export function useDisplayName(principal: string | null | undefined): string {
  const [name, setName] = useState<string>(
    principal ? getDisplayName(principal) : "",
  );

  useEffect(() => {
    if (!principal) return;
    // Re-read immediately
    setName(getDisplayName(principal));

    // Listen for updates from other tabs
    const handler = (e: StorageEvent) => {
      if (e.key === `${DISPLAY_NAME_PREFIX}${principal}`) {
        setName(e.newValue?.trim() || shortPrincipal(principal));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [principal]);

  return name || (principal ? shortPrincipal(principal) : "");
}

/**
 * Hook to check if the current user has set a display name.
 * Returns null while loading, true/false once resolved.
 */
export function useHasDisplayName(): boolean | null {
  const { principal } = useAuth();
  const principalText = principal?.toText() ?? null;
  const {
    data: profile,
    isLoading,
    isFetched,
  } = useUserProfile(principal ?? null);

  if (!principalText) return null;
  // Only hold null while a real in-flight request is pending.
  // Once the query settles (success or error), return a definitive answer.
  if (isLoading && !isFetched) return null;

  // Check localStorage cache first (fastest)
  const cached = getLocalDisplayName(principalText);
  if (cached && cached.trim().length >= 2) return true;

  // Check if backend profile has a non-empty encryptedDisplayName
  if (profile && profile.encryptedDisplayName.length > 0) return true;

  return false;
}

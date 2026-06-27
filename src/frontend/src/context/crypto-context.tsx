import { useUpdateProfile } from "@/hooks/use-profiles";
import {
  CONV_KEY_PREFIX,
  dbGet,
  dbGetKeysWithPrefix,
  dbSet,
  decryptBlob,
  decryptMessage,
  deriveDisplayNameKey,
  deriveSharedSecret,
  deriveStorageWrapKey,
  encryptMessage,
  exportKey,
  exportPublicKey,
  getKeyFingerprint,
  importAESKey,
  importPublicKey,
  loadOrCreateKeyPair,
  toCleanUint8Array,
  unwrapKeyBytes,
  wrapKeyBytes,
} from "@/lib/crypto";
import {
  clearAllCache,
  clearAllFileCache,
  clearConversationCache,
  clearFileCacheForConversation,
  getDecryptedFile,
  getDecryptedMessage,
  getDecryptionAttempts,
  getDecryptionStatus,
  hashCiphertext,
  setDecryptedFile,
  setDecryptedMessage,
  setDecryptionStatus,
} from "@/lib/decryption-cache";
import { extractErrText } from "@/lib/error-utils";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth-context";

interface CryptoContextValue {
  keyPair: CryptoKeyPair | null;
  isReady: boolean;
  /** True while the startup effect is still loading keys from IndexedDB. */
  isRestoringKeys: boolean;
  /** True if the key pair was freshly generated this session (not loaded from IndexedDB). */
  isNewKeyPair: boolean;
  /** Reset isNewKeyPair to false after the public key has been published to the backend. */
  setIsNewKeyPair: (value: boolean) => void;
  /** Set of convIds whose key could not be found/unwrapped — ChatPage watches this to trigger re-derivation. */
  missingKeyConvIds: Set<string>;
  /** Remove a convId from missingKeyConvIds after re-derivation succeeds. */
  clearMissingKeyConvId: (convId: string) => void;
  getConversationKey: (convId: string) => CryptoKey | undefined;
  setConversationKey: (convId: string, key: CryptoKey) => void;
  /**
   * Store a group conversation key together with its member fingerprint.
   * The fingerprint is persisted to IndexedDB alongside the raw key bytes so
   * that after a page reload the stale-member-list detection still works.
   */
  setGroupConversationKey: (
    convId: string,
    key: CryptoKey,
    memberFingerprint: string,
  ) => void;
  /** Remove a cached conversation key so it will be re-derived on next use. */
  clearConversationKey: (convId: string) => void;
  /**
   * Return the persisted member fingerprint for a group conversation key.
   * Returns undefined if no fingerprint was stored (key not yet derived or
   * was set without a fingerprint).
   */
  getGroupKeyFingerprint: (convId: string) => string | undefined;
  deriveAndStoreKey: (
    convId: string,
    theirPublicKeyBytes: Uint8Array,
  ) => Promise<CryptoKey | null>;
  encryptForConv: (convId: string, text: string) => Promise<Uint8Array | null>;
  decryptFromConv: (
    convId: string,
    blob: Uint8Array,
    msgId?: string,
  ) => Promise<string | null>;
  /** Decrypt the current user's own display name from their encryptedDisplayName blob. */
  decryptOwnDisplayName: (encryptedBlob: Uint8Array) => Promise<string | null>;
  /** Returns true while ECDH key derivation is in-flight for a conversation. */
  isDerivingKey: (convId: string) => boolean;
  /** Returns true once a conversation key has been derived and stored. */
  isKeyReady: (convId: string) => boolean;
  /**
   * Forcefully clear a conversation key from both memory and IndexedDB,
   * then mark it as missing so ChatPage triggers fresh re-derivation.
   * Use this when decryption fails repeatedly and you need a clean slate.
   */
  forceReDeriveKey: (convId: string) => Promise<void>;
  /**
   * Force a full key re-exchange for a conversation: clear the old key,
   * publish a fresh ECDH public key to the backend, and trigger re-derivation.
   * Use this when a stale key is detected or as a manual "Rekey" action.
   */
  rekeyConversation: (
    convId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  getDecryptedFileWithCache: (
    storageKey: string,
    encryptedBlob: Uint8Array,
    mimeType: string,
    conversationId: string,
    key: CryptoKey,
    originalFileName: string,
  ) => Promise<Blob | null>;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const { principal } = useAuth();
  const updateProfile = useUpdateProfile();
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRestoringKeys, setIsRestoringKeys] = useState(true);
  const [isNewKeyPair, setIsNewKeyPair] = useState(false);
  const convKeys = useRef<Map<string, CryptoKey>>(new Map());
  // convKeys.current is the stable Map instance used by all key read/write helpers
  // across renders.  This prevents stale references and race conditions where a key
  // is stored in one render's Map but read from a different render's Map, triggering
  // re-derivation and producing different keys.
  // Stores member fingerprints for group keys so stale-member detection survives page reloads.
  const groupKeyFingerprints = useRef<Map<string, string>>(new Map());
  // Tracks convIds whose key is missing/corrupted so ChatPage can trigger re-derivation.
  const [missingKeyConvIds, setMissingKeyConvIds] = useState<Set<string>>(
    new Set(),
  );
  // Tracks in-flight ECDH derivations and derived-ready convIds.
  const derivingConvIds = useRef<Set<string>>(new Set());
  const [keyReadyConvIds, setKeyReadyConvIds] = useState<Set<string>>(
    new Set(),
  );
  // Tracks convIds currently undergoing a rekey to prevent duplicate rekey loops.
  // Uses a Map with timeout info so stale locks auto-clear after 30s.
  const rekeyLocks = useRef<
    Map<string, { timeoutId: ReturnType<typeof setTimeout>; startTime: number }>
  >(new Map());
  const keyLoadingPromises = useRef<Map<string, Promise<CryptoKey | null>>>(
    new Map(),
  );

  const isRekeyInProgress = useCallback((convId: string): boolean => {
    const lock = rekeyLocks.current.get(convId);
    if (!lock) return false;
    // Auto-clear stale locks older than 30 seconds
    if (Date.now() - lock.startTime > 30000) {
      clearTimeout(lock.timeoutId);
      rekeyLocks.current.delete(convId);
      console.log(`[E2EE REKEY] Auto-cleared stale lock for convId=${convId}`);
      return false;
    }
    return true;
  }, []);

  const _acquireRekeyLock = useCallback(
    (convId: string): boolean => {
      if (isRekeyInProgress(convId)) {
        console.log(
          `[E2EE REKEY] Skipping rekey for convId=${convId} — already in progress`,
        );
        return false;
      }
      const timeoutId = setTimeout(() => {
        rekeyLocks.current.delete(convId);
        console.log(`[E2EE REKEY] Lock timed out for convId=${convId}`);
      }, 30000);
      rekeyLocks.current.set(convId, { timeoutId, startTime: Date.now() });
      return true;
    },
    [isRekeyInProgress],
  );

  const _releaseRekeyLock = useCallback((convId: string) => {
    const lock = rekeyLocks.current.get(convId);
    if (lock) {
      clearTimeout(lock.timeoutId);
      rekeyLocks.current.delete(convId);
      console.log(`[E2EE REKEY] Guard released for convId=${convId}`);
    }
  }, []);

  const clearMissingKeyConvId = useCallback((convId: string) => {
    setMissingKeyConvIds((prev) => {
      const next = new Set(prev);
      next.delete(convId);
      return next;
    });
  }, []);

  // ── helpers to persist / restore individual keys ─────────────────────────

  const persistConvKey = useCallback(
    async (
      principalText: string,
      convId: string,
      key: CryptoKey,
      fingerprint?: string,
    ) => {
      try {
        const rawBytes = await exportKey(key);
        const wrapKey = await deriveStorageWrapKey(principalText);
        const wrapped = await wrapKeyBytes(wrapKey, rawBytes);
        const dbKey = `${CONV_KEY_PREFIX}${principalText}:${convId}`;
        await dbSet(dbKey, {
          wrapped: Array.from(wrapped),
          fingerprint: fingerprint || "",
        });
        console.log(`[E2EE KEYSTORE] Persisted key for convId=${convId}`);
      } catch (err) {
        console.warn(
          `[E2EE KEYSTORE] Failed to persist key for convId=${convId}:`,
          err,
        );
      }
    },
    [],
  );

  // Load ECDH keypair + restore all persisted conversation keys from IndexedDB
  useEffect(() => {
    if (!principal) {
      setKeyPair(null);
      setIsReady(false);
      setIsNewKeyPair(false);
      convKeys.current.clear();
      groupKeyFingerprints.current.clear();
      return;
    }
    const principalText = principal.toText();

    setIsRestoringKeys(true);
    (async () => {
      try {
        const { keyPair: kp, isNew } = await loadOrCreateKeyPair(principalText);
        setKeyPair(kp);
        setIsNewKeyPair(isNew);
        if (isNew) {
          exportPublicKey(kp.publicKey)
            .then((pubBytes) => {
              const fp = Array.from(pubBytes.slice(0, 8))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
              console.log(
                `[E2EE KEYS] NEW key pair generated for ${principalText}. Public key fingerprint (first 8 bytes): ${fp}. Profile MUST be updated to publish this key before encrypted messages will work.`,
              );
            })
            .catch(() => {
              /* best effort */
            });
        }

        // ── Log PWA vs browser context for diagnostics ────────────────────
        const isPWA = window.matchMedia("(display-mode: standalone)").matches;
        const kp2 = await exportPublicKey(kp.publicKey);
        const fp2 = Array.from(kp2.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.log(
          `[E2EE INIT] Principal: ${principalText}, keyFp: ${fp2}, context: ${isPWA ? "PWA" : "browser"}`,
        );

        // ── Restore ALL persisted conversation keys from IndexedDB ──────────
        let restoredCount = 0;
        try {
          const prefix = `${CONV_KEY_PREFIX}${principalText}:`;
          const allEntries = await dbGetKeysWithPrefix(prefix);
          console.log(
            `[E2EE RESTORE] Restoring ${allEntries.length} conversation keys from IndexedDB`,
          );
          // After each key is restored, log full fingerprint:
          // (add inside the loop that restores keys)

          // Derive the wrap key ONCE for the entire batch — fail fast and visibly
          let wrapKey: CryptoKey | null = null;
          if (allEntries.length > 0) {
            try {
              wrapKey = await deriveStorageWrapKey(principalText);
            } catch (wkErr) {
              // deriveStorageWrapKey already logs; re-log here for startup context
              console.error(
                "[E2EE KEYSTORE] Cannot restore keys — wrap key derivation failed:",
                wkErr,
              );
              // Fall through: wrapKey stays null, wrapped entries will be skipped
            }
          }

          await Promise.all(
            allEntries.map(async (entry) => {
              // entry.key is the full DB key, e.g. "convkey_{principal}:{convId}"
              const convId = entry.key.slice(prefix.length);
              try {
                const stored = entry.value as
                  | { wrapped: number[]; fingerprint?: string }
                  | Uint8Array
                  | { raw: Uint8Array; fingerprint?: string }
                  | null;
                if (!stored) return;

                let rawBytes: Uint8Array | null = null;
                let fingerprint: string | undefined;

                if (stored instanceof Uint8Array) {
                  // Legacy format: unencrypted raw bytes
                  rawBytes = toCleanUint8Array(stored);
                } else if (
                  Array.isArray((stored as { wrapped?: number[] }).wrapped)
                ) {
                  // Current format: wrapped bytes stored as number array.
                  // toCleanUint8Array handles number[] → Uint8Array.from() and
                  // also Uint8Array with non-zero byteOffset → slice(0).
                  const wrappedArr = toCleanUint8Array(
                    (stored as { wrapped: number[]; fingerprint?: string })
                      .wrapped,
                  );
                  if (wrapKey) {
                    // Pass storage key name so failures are identifiable in logs
                    rawBytes = await unwrapKeyBytes(
                      wrapKey,
                      wrappedArr,
                      entry.key,
                    );
                  } else {
                    console.warn(
                      `[E2EE KEYSTORE] Skipping wrapped key for convId=${convId} — wrap key unavailable`,
                    );
                    return;
                  }
                  fingerprint = (
                    stored as { wrapped: number[]; fingerprint?: string }
                  ).fingerprint;
                } else if ((stored as { raw?: Uint8Array }).raw) {
                  // Legacy format: { raw: Uint8Array, fingerprint? }
                  const legacy = stored as {
                    raw: Uint8Array;
                    fingerprint?: string;
                  };
                  rawBytes = toCleanUint8Array(legacy.raw);
                  fingerprint = legacy.fingerprint;
                }

                if (!rawBytes || rawBytes.length === 0) return;

                const cryptoKey = await importAESKey(rawBytes);
                convKeys.current.set(convId, cryptoKey);
                if (fingerprint) {
                  groupKeyFingerprints.current.set(convId, fingerprint);
                }
                setKeyReadyConvIds((prev) => new Set([...prev, convId]));
                restoredCount++;
                const fpLog = fingerprint || "none";
                console.log(
                  `[E2EE RESTORE] Key for convId=${convId} restored successfully (fingerprint=${fpLog})`,
                );
              } catch (err) {
                console.error(
                  `[E2EE RESTORE] Key for convId=${convId} failed: ${err instanceof Error ? err.message : String(err)}`,
                );
                // Remove corrupted entry so the app re-derives on next open
                // rather than retrying a permanently broken blob.
                try {
                  await dbSet(entry.key, null);
                  console.log(
                    `[E2EE KEYSTORE] Removed corrupted key for ${entry.key} — will re-derive`,
                  );
                } catch (delErr) {
                  console.warn(
                    "[E2EE KEYSTORE] Failed to remove corrupted key:",
                    delErr,
                  );
                }
              }
            }),
          );
          console.log(
            `[E2EE RESTORE] Restoring ${restoredCount} conversation keys from IndexedDB — complete`,
          );
        } catch (err) {
          console.error("[E2EE KEYSTORE] Startup restoration failed:", err);
        }
      } catch (err) {
        console.error("[E2EE KEYSTORE] Startup restoration failed:", err);
      } finally {
        // CRITICAL: always mark ready so the app never hangs on partial failure
        setIsRestoringKeys(false);
        setIsReady(true);
      }
    })();
  }, [principal]);

  const getConversationKey = useCallback((convId: string) => {
    return convKeys.current.get(convId);
  }, []);

  const setConversationKey = useCallback(
    (convId: string, key: CryptoKey) => {
      convKeys.current.set(convId, key);
      if (principal) {
        persistConvKey(principal.toText(), convId, key)
          .then(() => {
            console.log(`[E2EE KEYSTORE] Persisted key for convId=${convId}`);
          })
          .catch((e) => {
            console.error(
              `[E2EE KEYSTORE] Failed to persist key for convId=${convId}:`,
              e,
            );
          });
      }
    },
    [principal, persistConvKey],
  );

  const setGroupConversationKey = useCallback(
    (convId: string, key: CryptoKey, memberFingerprint: string) => {
      convKeys.current.set(convId, key);
      groupKeyFingerprints.current.set(convId, memberFingerprint);
      setKeyReadyConvIds((prev) => new Set([...prev, convId]));
      if (principal) {
        persistConvKey(principal.toText(), convId, key, memberFingerprint)
          .then(() => {
            console.log(
              `[E2EE KEYSTORE] Persisted group key for convId=${convId}`,
            );
          })
          .catch((e) => {
            console.error(
              `[E2EE KEYSTORE] Failed to persist group key for convId=${convId}:`,
              e,
            );
          });
      }
    },
    [principal, persistConvKey],
  );

  const getGroupKeyFingerprint = useCallback(
    (convId: string) => groupKeyFingerprints.current.get(convId),
    [],
  );

  const clearConversationKey = useCallback(
    (convId: string) => {
      convKeys.current.delete(convId);
      groupKeyFingerprints.current.delete(convId);
      if (principal) {
        const dbKey = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
        dbSet(dbKey, null).catch(() => {
          /* best effort */
        });
      }
    },
    [principal],
  );

  const deriveAndStoreKey = useCallback(
    async (
      convId: string,
      theirPublicKeyBytes: Uint8Array,
    ): Promise<CryptoKey | null> => {
      const freshKeyBytes = toCleanUint8Array(theirPublicKeyBytes);
      const peerPubFp = Array.from(freshKeyBytes.slice(0, 8))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      console.log(
        `[E2EE] deriveAndStoreKey START for convId=${convId}, peerKey first8=${peerPubFp}`,
      );

      // CRITICAL: Always delete any old/stale key before deriving a new one.
      // This prevents stale keys from being reused after peer key rotation.
      // Also clear from IndexedDB so a stale persisted key can't shadow the new one.
      if (convKeys.current.has(convId)) {
        console.log(
          `[E2EE] deriveAndStoreKey: clearing old key for convId=${convId} before re-derivation`,
        );
        convKeys.current.delete(convId);
      }
      if (principal) {
        const dbKeyClear = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
        try {
          await dbSet(dbKeyClear, null);
          console.log(
            `[E2EE] deriveAndStoreKey: cleared IndexedDB key for convId=${convId}`,
          );
        } catch {
          /* best effort */
        }
      }
      // Also clear from ready state so isKeyReady returns false until re-derivation completes
      setKeyReadyConvIds((prev) => {
        if (!prev.has(convId)) return prev;
        const next = new Set(prev);
        next.delete(convId);
        return next;
      });

      // Self-keying guard: abort if peer is the current user
      if (principal && convId.includes(principal.toText())) {
        console.warn(
          `[E2EE] Self-keying detected, aborting for convId=${convId}`,
        );
        derivingConvIds.current.delete(convId);
        return null;
      }

      derivingConvIds.current.add(convId);
      if (!keyPair?.privateKey) {
        console.log(
          `[E2EE] deriveAndStoreKey: own keyPair not ready for convId=${convId} — will not derive`,
        );
        derivingConvIds.current.delete(convId);
        return null;
      }
      try {
        console.log(
          `[E2EE] deriveAndStoreKey: importing peer public key, byteLength=${freshKeyBytes.byteLength}, fingerprint(first8)=${peerPubFp}, convId=${convId}`,
        );
        const theirKey = await importPublicKey(freshKeyBytes);
        if (
          theirKey.type !== "public" ||
          (theirKey.algorithm as { name: string }).name !== "ECDH"
        ) {
          console.error(
            "[E2EE] deriveAndStoreKey: imported peer key has unexpected type/algorithm",
            `type=${theirKey.type}`,
            `algorithm=${JSON.stringify(theirKey.algorithm)}`,
            `convId=${convId}`,
          );
          return null;
        }
        const myPubBytes = await exportPublicKey(keyPair.publicKey);
        const myPubFp = Array.from(myPubBytes.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.log(
          `[E2EE] deriveAndStoreKey: my public key fingerprint(first8)=${myPubFp}, peer fingerprint(first8)=${peerPubFp}, convId=${convId}`,
        );
        const sharedKey = await deriveSharedSecret(
          keyPair.privateKey,
          theirKey,
        );
        const sharedFp = await getKeyFingerprint(sharedKey);
        console.log(
          `[E2EE] NEW SHARED KEY fingerprint=${sharedFp} for convId=${convId}`,
        );
        convKeys.current.set(convId, sharedKey);
        console.log(
          `[E2EE] deriveAndStoreKey: key stored in memory for convId=${convId}`,
        );
        setKeyReadyConvIds((prev) => new Set([...prev, convId]));
        // Notify all message bubbles that the key is ready so they retry decryption
        window.dispatchEvent(
          new CustomEvent("keyReady", { detail: { conversationId: convId } }),
        );
        console.log(
          `[E2EE] Derived and stored shared key for convId=${convId}`,
        );
        // Persist to IndexedDB immediately
        if (principal) {
          try {
            await persistConvKey(principal.toText(), convId, sharedKey);
            const fullFp = await getKeyFingerprint(sharedKey);
            console.log(
              `[E2EE KEYSTORE] Persisted key for convId=${convId}, fullFp=${fullFp}`,
            );
          } catch (e) {
            console.error(
              `[E2EE KEYSTORE] Failed to persist key for convId=${convId}:`,
              e,
            );
          }
        }

        // ── ROUNDTRIP SMOKE TEST ─────────────────────────────────────────────
        // Immediately verify the newly derived key can encrypt AND decrypt a
        // known plaintext. This catches key derivation mismatches early.
        // Made more resilient: only evict on clear failure, log warnings on mismatch.
        try {
          const testPlaintext = "__roundtrip_test__";
          const testBytes = new TextEncoder().encode(testPlaintext);
          const encryptedBlob = await encryptMessage(sharedKey, testBytes);
          // Force a fresh contiguous copy exactly like encryptForConv does
          const fullBlob = new Uint8Array(encryptedBlob);
          const decryptedText = await decryptMessage(sharedKey, fullBlob);
          if (decryptedText === testPlaintext) {
            console.log(`[E2EE ROUNDTRIP] convId=${convId}: PASS`);
          } else {
            console.warn(
              `[E2EE ROUNDTRIP] convId=${convId}: MISMATCH — got "${decryptedText}", expected "${testPlaintext}". Key may still be valid for peer messages.`,
            );
            // Don't evict on roundtrip mismatch — the key may still work for
            // actual peer-encrypted messages. Only evict if encrypt/decrypt throws.
          }
        } catch (rtErr) {
          console.error(
            `[E2EE ROUNDTRIP] convId=${convId}: FAIL (encrypt/decrypt threw) — evicting key`,
            rtErr,
          );
          // Key is bad — evict immediately so re-derivation can try again.
          convKeys.current.delete(convId);
          setKeyReadyConvIds((prev) => {
            const next = new Set(prev);
            next.delete(convId);
            return next;
          });
          if (principal) {
            const dbKeyRt = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
            dbSet(dbKeyRt, null).catch(() => {
              /* best effort */
            });
          }
          setMissingKeyConvIds((prev) => {
            const next = new Set(prev);
            next.add(convId);
            return next;
          });
          return null;
        }

        return sharedKey;
      } catch (err) {
        console.error(
          `[E2EE] deriveAndStoreKey FAILED for convId=${convId}:`,
          `theirPublicKeyBytes.length=${theirPublicKeyBytes.length}`,
          `privateKey exists=${!!keyPair?.privateKey}`,
          err,
        );
        return null;
      } finally {
        derivingConvIds.current.delete(convId);
      }
    },
    [keyPair, principal, persistConvKey],
  );

  const encryptForConv = useCallback(
    async (convId: string, text: string): Promise<Uint8Array | null> => {
      // ALWAYS read the latest key from the ref Map — never capture a stale
      // closure variable.  This guarantees we encrypt with the most recently
      // derived key even if a rekey happened after the component rendered.
      const key = convKeys.current.get(convId);
      const keyFp = key
        ? await getKeyFingerprint(key).catch(() => "unknown")
        : "none";
      console.log(
        `[E2EE SEND] Using key fingerprint=${keyFp} for convId=${convId}`,
      );
      if (!key) {
        console.error(
          `[E2EE SEND] No key available for convId=${convId} — cannot encrypt`,
        );
        return null;
      }
      try {
        // Encode plaintext to bytes, then delegate to encryptMessage.
        const plaintextBytes = new TextEncoder().encode(text);
        if (plaintextBytes.length === 0) {
          console.error(
            `[E2EE ENCRYPT] Refusing to encrypt empty plaintext for convId=${convId}`,
          );
          return null;
        }
        const cipherBuf = await encryptMessage(key, plaintextBytes);
        // encryptMessage already returns a fresh contiguous Uint8Array with
        // byteOffset === 0.  We force one more copy here to be absolutely
        // certain the buffer that goes into Candid serialization is pristine.
        const full = new Uint8Array(cipherBuf);
        if (full.length === 0) {
          console.error(
            `[E2EE ENCRYPT] encryptMessage returned empty buffer for convId=${convId}`,
          );
          return null;
        }
        console.log(
          `[E2EE SEND] Using key fingerprint=${keyFp} for convId=${convId}, blob len=${full.length}`,
        );
        console.log(
          `[E2EE ENCRYPT direct] total=${full.length}, iv=12, ct+tag=${full.length - 12}, byteOffset=${full.byteOffset}, keyFp=${keyFp}, convId=${convId}`,
        );
        return full; // byteOffset guaranteed = 0
      } catch (err) {
        console.error(
          `[E2EE ENCRYPT] encryptForConv FAILED for convId=${convId}:`,
          err,
        );
        return null;
      }
    },
    [],
  );

  async function getDecryptedFileWithCache(
    storageKey: string,
    encryptedBlob: Uint8Array,
    mimeType: string,
    conversationId: string,
    key: CryptoKey,
    originalFileName: string,
  ): Promise<Blob | null> {
    try {
      const ciphertextHash = hashCiphertext(encryptedBlob);
      const cached = await getDecryptedFile(storageKey, ciphertextHash);
      if (cached) {
        console.log("[FILE CACHE] Hit for storageKey=", storageKey);
        return cached;
      }
      const decrypted = await decryptBlob(key, encryptedBlob);
      if (!decrypted) {
        console.log("[FILE CACHE] Decrypt failed for storageKey=", storageKey);
        return null;
      }
      const blob = new Blob([decrypted], { type: mimeType });
      await setDecryptedFile(storageKey, blob, {
        mimeType,
        originalFileName,
        size: blob.size,
        ciphertextHash,
        conversationId,
      });
      console.log("[FILE CACHE] Stored for storageKey=", storageKey);
      return blob;
    } catch (err) {
      console.error("[FILE CACHE] Error for storageKey=", storageKey, err);
      return null;
    }
  }

  const decryptFromConv = useCallback(
    async (
      conversationId: string,
      blob: Uint8Array,
      msgId?: string,
    ): Promise<string | null> => {
      // ── 0. Normalise incoming blob immediately ─────────────────────────────
      // toCleanUint8Array handles Uint8Array with non-zero byteOffset,
      // ArrayBuffer, and plain number[] from IndexedDB JSON deserialization.
      // We then force a brand-new contiguous copy so every cache operation
      // (get AND set) uses the exact same buffer.  This prevents hash
      // mismatches where the cache was written with a sliced copy but read
      // back with the original (or vice-versa).
      let clean = toCleanUint8Array(blob);
      // Force a fresh copy regardless of byteOffset — belt and suspenders.
      clean = new Uint8Array(clean);

      // Check local plaintext cache first if msgId is provided
      if (msgId) {
        const cached = await getDecryptedMessage(conversationId, msgId, clean);
        if (cached) {
          console.log(
            `[E2EE DECRYPT] Cache hit for convId=${conversationId} msgId=${msgId}`,
          );
          console.log(
            `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId}`,
          );
          return cached;
        }
      }

      // ── STEP 0: Clear any stale status before attempting decryption ──
      // If a rekey happened since the last failure, we MUST allow this decrypt to
      // proceed rather than being blocked by a stale status from an old key.
      // We also clear permanently-unreadable here because the key may have been
      // re-derived or rotated since the message was marked unreadable.
      if (msgId) {
        const currentStatus = await getDecryptionStatus(conversationId, msgId);
        if (
          currentStatus === "permanently-unreadable" ||
          currentStatus === "failed-retryable"
        ) {
          console.log(
            `[E2EE DECRYPT] Clearing stale status '${currentStatus}' for msgId=${msgId} before fresh attempt`,
          );
          await setDecryptionStatus(conversationId, msgId, clean, "pending");
        }
      }

      const key = convKeys.current.get(conversationId);
      if (!key) {
        console.log(
          `[E2EE] decryptFromConv: no key in memory for convId=${conversationId}`,
        );
        return null;
      }

      const keyFp = await getKeyFingerprint(key);
      console.log(
        `[E2EE] decryptFromConv START for convId=${conversationId}: blob=${clean.length} bytes, keyFp=${keyFp}`,
      );

      console.log(
        `[E2EE DECRYPT final buffer] length=${clean.length}, byteOffset=${clean.byteOffset}, bufferSize=${clean.buffer.byteLength}, keyFp=${keyFp}`,
      );

      // ── Small-blob guard ───────────────────────────────────────────────────
      // AES-GCM needs at least 12-byte IV + 16-byte ciphertext+tag = 28 bytes.
      // Anything shorter cannot possibly be valid — skip all decryption attempts
      // and fail fast so we don't increment attempt counters on garbage data.
      if (clean.length < 28) {
        console.log(
          `[E2EE] blob too small: ${clean.length} bytes (need >= 28 for AES-GCM)`,
        );
        return null;
      }

      // Hex dump for diagnosis (first 64 bytes)
      if (clean.length < 100) {
        const hexPrefix = Array.from(clean.slice(0, Math.min(clean.length, 64)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        console.log(`[E2EE HEX BLOB] ${hexPrefix}`);
      }

      // ── STEP 1: Try Candid prefix-skip logic (0-16 bytes) matching decryptMessage() ──
      // Candid may prepend 1-byte tag, 2-byte length, 4-byte length, 8-byte length,
      // or other variant prefixes. We try a wider range (0-16) to be robust.
      for (let skip = 0; skip <= 16; skip++) {
        if (clean.length - skip < 28) continue;

        const blobSlice = clean.slice(skip);
        const iv = blobSlice.slice(0, 12);
        const ciphertext = blobSlice.slice(12);

        try {
          const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext,
          );
          const text = new TextDecoder().decode(decrypted);
          console.log(
            `[E2EE DECRYPT] SUCCESS with prefix skip=${skip} for convId=${conversationId}`,
          );
          // Cache the plaintext if msgId is provided — use the same `clean` buffer
          // for both operations so the ciphertext hashes are guaranteed to match.
          // CRITICAL: await cache writes before returning so callers immediately
          // see the cached plaintext on re-check.
          if (msgId) {
            try {
              await setDecryptedMessage(conversationId, msgId, clean, text);
              await setDecryptionStatus(
                conversationId,
                msgId,
                clean,
                "decrypted",
              );
              console.log(
                `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId} (prefix skip=${skip})`,
              );
              // Emit a window event so MessageBubble can immediately update UI
              // without waiting for the next poll/render cycle.
              window.dispatchEvent(
                new CustomEvent("decryptionSuccess", {
                  detail: { conversationId, msgId, plaintext: text },
                }),
              );
            } catch (cacheErr) {
              // Cache write failed (e.g. quota exceeded) — still return the
              // plaintext so the UI renders it.  The next render will re-attempt
              // decryption and can cache again.
              console.warn(
                `[E2EE DECRYPT] Cache write failed for msgId=${msgId} — returning plaintext anyway:`,
                cacheErr,
              );
              console.log(
                `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId}`,
              );
              // Update status so UI doesn't show pending/unreadable
              if (msgId) {
                await setDecryptionStatus(
                  conversationId,
                  msgId,
                  clean,
                  "decrypted",
                );
              }
              // Still emit the event so UI updates even if cache write failed
              window.dispatchEvent(
                new CustomEvent("decryptionSuccess", {
                  detail: { conversationId, msgId, plaintext: text },
                }),
              );
            }
          } else {
            console.log(
              `[E2EE DECRYPT SUCCESS] displaying messageId=unknown convId=${conversationId}`,
            );
          }
          return text;
        } catch (_e) {
          // Continue trying next skip offset
        }
      }

      // ── STEP 2: Diagnostic brute-force possible IV positions (for small blobs) ──
      // If the blob is exactly 32 bytes (or otherwise small) and standard prefix
      // skips failed, the IV may be misaligned due to a prefix/alignment edge case.
      // We log a specific diagnostic and try every possible IV start position.
      if (clean.length <= 100) {
        console.log(
          `[E2EE DECRYPT DIAGNOSTIC] Standard prefix-skip failed for small blob len=${clean.length}. Brute-forcing IV positions (0-${clean.length - 28}).`,
        );
        for (let ivStart = 0; ivStart <= clean.length - 28; ivStart++) {
          const iv = clean.slice(ivStart, ivStart + 12);
          const ciphertext = clean.slice(ivStart + 12);
          if (ciphertext.length < 16) continue;

          try {
            const decrypted = await crypto.subtle.decrypt(
              { name: "AES-GCM", iv },
              key,
              ciphertext,
            );
            const text = new TextDecoder().decode(decrypted);
            console.log(
              `[E2EE DECRYPT SUCCESS via brute-force] IV start=${ivStart}, len=${clean.length}`,
            );
            if (msgId) {
              try {
                await setDecryptedMessage(conversationId, msgId, clean, text);
                await setDecryptionStatus(
                  conversationId,
                  msgId,
                  clean,
                  "decrypted",
                );
                console.log(
                  `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId} (brute-force)`,
                );
                // Emit a window event so MessageBubble can immediately update UI
                window.dispatchEvent(
                  new CustomEvent("decryptionSuccess", {
                    detail: { conversationId, msgId, plaintext: text },
                  }),
                );
              } catch (cacheErr) {
                console.warn(
                  `[E2EE DECRYPT] Cache write failed for msgId=${msgId} — returning plaintext anyway:`,
                  cacheErr,
                );
                console.log(
                  `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId}`,
                );
                // Still emit the event so UI updates even if cache write failed
                window.dispatchEvent(
                  new CustomEvent("decryptionSuccess", {
                    detail: { conversationId, msgId, plaintext: text },
                  }),
                );
              }
            } else {
              console.log(
                `[E2EE DECRYPT SUCCESS] displaying messageId=unknown convId=${conversationId}`,
              );
            }
            return text;
          } catch (_e) {
            // continue trying next IV position
          }
        }
      }

      // ── STEP 3: All attempts with current key failed ──
      console.error(
        `[E2EE DECRYPT] All prefix-skip attempts failed for convId=${conversationId}. Key fingerprint=${keyFp}. This message may be encrypted under a different key.`,
      );

      // ── STEP 4: Legacy key fallback ──
      // Check if we have any older stored keys for this convId in IndexedDB
      if (principal) {
        try {
          const prefix = `${CONV_KEY_PREFIX}${principal.toText()}:${conversationId}`;
          const allEntries = await dbGetKeysWithPrefix(prefix);
          if (allEntries.length > 1) {
            console.log(
              `[E2EE DECRYPT] Found ${allEntries.length} stored key entries for convId=${conversationId}, trying legacy keys...`,
            );
            const wrapKey = await deriveStorageWrapKey(principal.toText());
            for (const entry of allEntries) {
              try {
                const stored = entry.value as {
                  wrapped: number[];
                  fingerprint?: string;
                } | null;
                if (!stored || !Array.isArray(stored.wrapped)) continue;
                const wrappedArr = toCleanUint8Array(stored.wrapped);
                const rawBytes = await unwrapKeyBytes(
                  wrapKey,
                  wrappedArr,
                  entry.key,
                );
                if (!rawBytes || rawBytes.length === 0) continue;
                const legacyKey = await importAESKey(rawBytes);
                const legacyFp = await getKeyFingerprint(legacyKey);
                console.log(
                  `[E2EE DECRYPT] Trying legacy key fingerprint=${legacyFp} for convId=${conversationId}`,
                );

                // Try the same prefix-skip logic with the legacy key
                for (let skip = 0; skip <= 16; skip++) {
                  if (clean.length - skip < 28) continue;
                  const blobSlice = clean.slice(skip);
                  const iv = blobSlice.slice(0, 12);
                  const ciphertext = blobSlice.slice(12);
                  try {
                    const decrypted = await crypto.subtle.decrypt(
                      { name: "AES-GCM", iv },
                      legacyKey,
                      ciphertext,
                    );
                    const text = new TextDecoder().decode(decrypted);
                    console.log(
                      `[E2EE DECRYPT] SUCCESS with legacy key (fp=${legacyFp}, skip=${skip}) for convId=${conversationId}`,
                    );
                    if (msgId) {
                      try {
                        await setDecryptedMessage(
                          conversationId,
                          msgId,
                          clean,
                          text,
                        );
                        await setDecryptionStatus(
                          conversationId,
                          msgId,
                          clean,
                          "decrypted",
                        );
                        console.log(
                          `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId} (legacy key)`,
                        );
                        // Emit a window event so MessageBubble can immediately update UI
                        window.dispatchEvent(
                          new CustomEvent("decryptionSuccess", {
                            detail: { conversationId, msgId, plaintext: text },
                          }),
                        );
                      } catch (cacheErr) {
                        console.warn(
                          `[E2EE DECRYPT] Cache write failed for msgId=${msgId} — returning plaintext anyway:`,
                          cacheErr,
                        );
                        console.log(
                          `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId}`,
                        );
                        // Still emit the event so UI updates even if cache write failed
                        window.dispatchEvent(
                          new CustomEvent("decryptionSuccess", {
                            detail: { conversationId, msgId, plaintext: text },
                          }),
                        );
                      }
                    } else {
                      console.log(
                        `[E2EE DECRYPT SUCCESS] displaying messageId=unknown convId=${conversationId}`,
                      );
                    }
                    return text;
                  } catch (_e) {
                    // continue with next skip
                  }
                }
              } catch (_e) {
                // continue to next legacy entry
              }
            }
          }
        } catch (err) {
          console.warn(
            `[E2EE DECRYPT] Legacy key fallback failed for convId=${conversationId}:`,
            err,
          );
        }
      }

      // ── STEP 5: Handle persistent failure with per-message status tracking ──
      // After every decrypt path (current key + legacy keys) has been exhausted,
      // do one final cache check in case a concurrent call succeeded and cached
      // the plaintext while we were busy decrypting.
      if (msgId) {
        const finalCacheCheck = await getDecryptedMessage(
          conversationId,
          msgId,
          clean,
        );
        if (finalCacheCheck) {
          console.log(
            `[E2EE DECRYPT] Final cache hit (concurrent write) for msgId=${msgId}`,
          );
          console.log(
            `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId}`,
          );
          return finalCacheCheck;
        }

        const attempts = await getDecryptionAttempts(conversationId, msgId);

        // Only escalate to permanently-unreadable after repeated failures.
        // failed-retryable keeps the door open for a future re-derivation / rekey.
        const nextStatus: "failed-retryable" | "permanently-unreadable" =
          attempts >= 2 ? "permanently-unreadable" : "failed-retryable";

        await setDecryptionStatus(conversationId, msgId, clean, nextStatus);
        console.error(
          `[E2EE DECRYPT] Decryption failed for convId=${conversationId} msgId=${msgId}. Key fingerprint=${keyFp}. Marking as ${nextStatus}.`,
        );
        // Mark as missing key to trigger ChatPage re-derivation
        setMissingKeyConvIds((prev) => {
          const next = new Set(prev);
          next.add(conversationId);
          return next;
        });
      } else {
        // No msgId available — fall back to old behavior
        console.error(
          `[E2EE DECRYPT] Decryption failed for convId=${conversationId}. Key fingerprint=${keyFp}. Triggering auto-rekey...`,
        );
        setMissingKeyConvIds((prev) => {
          const next = new Set(prev);
          next.add(conversationId);
          return next;
        });
      }

      return null;
    },
    [principal],
  );

  const forceReDeriveKey = useCallback(
    async (convId: string) => {
      console.log(
        `[E2EE FORCE-REDERIVE] Clearing key for convId=${convId} from memory + IndexedDB — will re-derive on next peer key arrival`,
      );
      await clearConversationCache(convId);
      await clearFileCacheForConversation(convId);
      // Clear from memory
      convKeys.current.delete(convId);
      groupKeyFingerprints.current.delete(convId);
      keyLoadingPromises.current.delete(convId);
      // Remove from ready state
      setKeyReadyConvIds((prev) => {
        const next = new Set(prev);
        next.delete(convId);
        return next;
      });
      // Clear from IndexedDB
      if (principal) {
        const dbKey = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
        try {
          await dbSet(dbKey, null);
          console.log(
            `[E2EE FORCE-REDERIVE] Removed key from IndexedDB for convId=${convId}`,
          );
        } catch {
          /* best effort */
        }
      }
      // Mark as missing to trigger ChatPage re-derivation
      setMissingKeyConvIds((prev) => {
        const next = new Set(prev);
        next.add(convId);
        return next;
      });
    },
    [principal],
  );

  /**
   * rekeyConversation — force a full ECDH key re-exchange for a conversation.
   * 1. Acquire a per-conversation lock (with 30s auto-timeout).
   * 2. Clear the old conversation key from memory + IndexedDB.
   * 3. Generate a fresh ECDH key pair if needed.
   * 4. Export the current ECDH public key and publish it to the backend profile.
   * 5. Mark the conversation as missing so ChatPage triggers fresh re-derivation.
   * 6. Emit a window event so MessageBubble can retry decryption.
   * Returns { success, error? } for UI feedback.
   */
  /**
   * rekeyConversation — force a full ECDH key re-exchange for a conversation.
   * 1. Acquire a per-conversation lock (with 30s auto-timeout).
   * 2. Clear the old conversation key from memory + IndexedDB.
   * 3. Generate a fresh ECDH key pair if needed.
   * 4. Export the current ECDH public key and publish it to the backend profile.
   * 5. Mark the conversation as missing so ChatPage triggers fresh re-derivation.
   * 6. Emit a window event so MessageBubble can retry decryption.
   * Returns { success, error? } for UI feedback.
   */
  const rekeyConversation = async (
    conversationId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    await clearFileCacheForConversation(conversationId);
    console.log(`[E2EE REKEY] Starting rekey for convId=${conversationId}`);

    // Prevent concurrent rekeys for the same conversation
    if (rekeyLocks.current.has(conversationId)) {
      const lock = rekeyLocks.current.get(conversationId)!;
      const elapsed = Date.now() - lock.startTime;
      if (elapsed < 30000) {
        console.log(
          `[E2EE REKEY] Rekey already in progress for convId=${conversationId} (elapsed=${elapsed}ms)`,
        );
        return { success: false, error: "Rekey already in progress" };
      }
      // Stale lock, clear it
      clearTimeout(lock.timeoutId);
      rekeyLocks.current.delete(conversationId);
    }

    // Set lock with auto-clear after 30s
    const timeoutId = setTimeout(() => {
      console.log(
        `[E2EE REKEY] Auto-clearing stale lock for convId=${conversationId}`,
      );
      rekeyLocks.current.delete(conversationId);
    }, 30000);
    rekeyLocks.current.set(conversationId, {
      timeoutId,
      startTime: Date.now(),
    });

    try {
      // 1. Clear old keys from memory AND IndexedDB AND plaintext cache
      console.log(
        `[E2EE REKEY] Clearing old keys and plaintext cache for convId=${conversationId}`,
      );
      await clearConversationCache(conversationId);
      await clearFileCacheForConversation(conversationId);
      convKeys.current.delete(conversationId);
      setKeyReadyConvIds((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
      setMissingKeyConvIds((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
      if (principal) {
        const dbKey = `${CONV_KEY_PREFIX}${principal.toText()}:${conversationId}`;
        await dbSet(dbKey, null);
      }

      // 2. Ensure we have a key pair
      if (!keyPair) {
        console.log("[E2EE REKEY] No keyPair, generating fresh pair");
        const newPair = await loadOrCreateKeyPair(
          principal ? principal.toText() : "",
        );
        setKeyPair(newPair.keyPair);
      }

      // 3. Publish new public key to backend profile
      if (!principal) {
        console.error(
          "[E2EE REKEY] Cannot publish public key — principal missing",
        );
        return { success: false, error: "Principal not available" };
      }

      if (!keyPair) {
        return { success: false, error: "Key pair not ready" };
      }
      const pubKeyBytes = await exportPublicKey(keyPair.publicKey);
      const newPubFp = Array.from(pubKeyBytes.slice(0, 8))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      console.log(
        `[E2EE REKEY] Publishing new public key, length=${pubKeyBytes.length}, fingerprint(first8)=${newPubFp}`,
      );

      const updateResult = await updateProfile.mutateAsync({
        ecdhPublicKey: new Uint8Array(pubKeyBytes),
      });

      if (
        updateResult &&
        typeof updateResult === "object" &&
        "err" in updateResult &&
        updateResult.err
      ) {
        const errText = extractErrText(updateResult);
        console.error(`[E2EE REKEY] Failed to publish public key: ${errText}`);
        return {
          success: false,
          error: `Failed to publish public key: ${errText}`,
        };
      }

      console.log(
        `[E2EE REKEY] Public key published successfully. New fingerprint(first8)=${newPubFp}. Both sides must now re-derive with the new key.`,
      );

      // 4. Trigger re-derivation by adding to missing keys
      // This will cause ChatPage to fetch peer key and derive new shared key
      setMissingKeyConvIds((prev) => {
        const next = new Set(prev);
        next.add(conversationId);
        return next;
      });

      // 5. Emit event so UI can retry decryption
      window.dispatchEvent(
        new CustomEvent("rekey:complete", { detail: { conversationId } }),
      );

      return { success: true };
    } catch (err) {
      console.error(`[E2EE REKEY] Error for convId=${conversationId}:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Rekey failed",
      };
    } finally {
      // Clear lock
      const lock = rekeyLocks.current.get(conversationId);
      if (lock) {
        clearTimeout(lock.timeoutId);
        rekeyLocks.current.delete(conversationId);
      }
    }
  };

  const decryptOwnDisplayName = useCallback(
    async (encryptedBlob: Uint8Array): Promise<string | null> => {
      if (!principal) return null;
      try {
        const aesKey = await deriveDisplayNameKey(principal);
        return await decryptMessage(aesKey, encryptedBlob);
      } catch {
        return null;
      }
    },
    [principal],
  );

  return (
    <CryptoContext.Provider
      value={{
        keyPair,
        isReady,
        isRestoringKeys,
        isNewKeyPair,
        setIsNewKeyPair,
        missingKeyConvIds,
        clearMissingKeyConvId,
        getConversationKey,
        setConversationKey,
        setGroupConversationKey,
        clearConversationKey,
        getGroupKeyFingerprint,
        deriveAndStoreKey,
        encryptForConv,
        decryptFromConv,
        decryptOwnDisplayName,
        isDerivingKey: (convId: string) => derivingConvIds.current.has(convId),
        isKeyReady: (convId: string) => keyReadyConvIds.has(convId),
        forceReDeriveKey,
        rekeyConversation,
        getDecryptedFileWithCache,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error("useCrypto must be used within CryptoProvider");
  return ctx;
}

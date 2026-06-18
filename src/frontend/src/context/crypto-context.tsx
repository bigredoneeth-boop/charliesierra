import { useUpdateProfile } from "@/hooks/use-profiles";
import {
  CONV_KEY_PREFIX,
  dbGet,
  dbGetKeysWithPrefix,
  dbSet,
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
  decryptFromConv: (convId: string, blob: Uint8Array) => Promise<string | null>;
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
  rekeyConversation: (convId: string) => Promise<void>;
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
  const rekeyInProgress = useRef<Set<string>>(new Set());
  const keyLoadingPromises = useRef<Map<string, Promise<CryptoKey | null>>>(
    new Map(),
  );

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
      // Self-keying guard: abort if peer is the current user
      if (principal && convId.includes(principal.toText())) {
        console.warn(
          `[E2EE] Self-keying detected, aborting for convId=${convId}`,
        );
        derivingConvIds.current.delete(convId);
        return null;
      }
      // Also clear from ready state so isKeyReady returns false until re-derivation completes
      setKeyReadyConvIds((prev) => {
        if (!prev.has(convId)) return prev;
        const next = new Set(prev);
        next.delete(convId);
        return next;
      });

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
        // known plaintext. This catches key derivation mismatches early (e.g.
        // wrong peer key used) before the first real message arrives.
        // We mirror the EXACT buffer construction used in encryptForConv so
        // the roundtrip validates the real send-path format.
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
            throw new Error(`roundtrip mismatch: got "${decryptedText}"`);
          }
        } catch (rtErr) {
          console.error(
            `[E2EE ROUNDTRIP] convId=${convId}: FAIL — evicting key`,
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
      const key = convKeys.current.get(convId);
      const keyFp = key
        ? await getKeyFingerprint(key).catch(() => "unknown")
        : "none";
      console.log(
        `[E2EE SEND] Using key fingerprint=${keyFp} for convId=${convId}`,
      );
      if (!key) return null;
      try {
        // Encode plaintext to bytes, then delegate to encryptMessage.
        const plaintextBytes = new TextEncoder().encode(text);
        const cipherBuf = await encryptMessage(key, plaintextBytes);
        // encryptMessage already returns a fresh contiguous Uint8Array with
        // byteOffset === 0.  We force one more copy here to be absolutely
        // certain the buffer that goes into Candid serialization is pristine.
        const full = new Uint8Array(cipherBuf);
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

  const decryptFromConv = useCallback(
    async (convId: string, blob: Uint8Array): Promise<string | null> => {
      // ── STEP 1: Force a contiguous clean copy BEFORE any slicing ─────────────
      // toCleanUint8Array handles Candid/IDB non-zero byteOffset, but V8 can
      // still share a backing buffer.  We force a fresh copy so every slice
      // below is unambiguous.
      let clean = toCleanUint8Array(blob);
      if (clean.byteOffset !== 0 || clean.length !== clean.buffer.byteLength) {
        console.log(
          `[E2EE DECRYPT buffer fix] copying non-contiguous view, old byteOffset=${clean.byteOffset}, old length=${clean.length}, old bufferSize=${clean.buffer.byteLength}`,
        );
        clean = new Uint8Array(clean); // force fresh contiguous copy
      }
      console.log(
        `[E2EE DECRYPT final buffer] length=${clean.length}, byteOffset=${clean.byteOffset}, bufferSize=${clean.buffer.byteLength}, convId=${convId}`,
      );

      // ── STEP 2: Minimum size validation ──────────────────────────────────
      if (clean.length < 28) {
        console.warn(
          `[E2EE DECRYPT] blob too short: ${clean.length} bytes (need >=28), convId=${convId}`,
        );
        return null;
      }

      // ── STEP 3: Resolve the conversation key ─────────────────────────────
      let key = convKeys.current.get(convId);

      // If not in memory, attempt lazy load from IndexedDB before giving up.
      if (!key && principal) {
        const principalText = principal.toText();
        const dbKey = `${CONV_KEY_PREFIX}${principalText}:${convId}`;
        // lazy load from IndexedDB (shared promise)
        const loadPromise = (async () => {
          try {
            const stored = await dbGet<
              | { wrapped: number[]; fingerprint?: string }
              | Uint8Array
              | { raw: Uint8Array; fingerprint?: string }
              | null
            >(dbKey);
            if (stored) {
              let rawBytes: Uint8Array | null = null;
              let fingerprint: string | undefined;

              if (stored instanceof Uint8Array) {
                rawBytes = toCleanUint8Array(stored);
              } else if (
                Array.isArray((stored as { wrapped?: number[] }).wrapped)
              ) {
                const wrapKey = await deriveStorageWrapKey(principalText);
                const wrappedArr = toCleanUint8Array(
                  (stored as { wrapped: number[]; fingerprint?: string })
                    .wrapped,
                );
                rawBytes = await unwrapKeyBytes(wrapKey, wrappedArr, dbKey);
                fingerprint = (
                  stored as { wrapped: number[]; fingerprint?: string }
                ).fingerprint;
              } else if ((stored as { raw?: Uint8Array }).raw) {
                const legacy = stored as {
                  raw: Uint8Array;
                  fingerprint?: string;
                };
                rawBytes = toCleanUint8Array(legacy.raw);
                fingerprint = legacy.fingerprint;
              }

              if (rawBytes && rawBytes.length > 0) {
                const loadedKey = await importAESKey(rawBytes);
                convKeys.current.set(convId, loadedKey);
                if (fingerprint) {
                  groupKeyFingerprints.current.set(convId, fingerprint);
                }
                const fpLog = fingerprint || "none";
                console.log(
                  `[E2EE KEYSTORE] Lazy-loaded key for convId=${convId} (fingerprint=${fpLog})`,
                );
                return loadedKey;
              }
            }
            return null;
          } catch (err) {
            console.warn(
              `[E2EE KEYSTORE] Lazy load failed for convId=${convId}:`,
              err,
            );
            if (principal) {
              const principalText2 = principal.toText();
              const dbKeyToRemove = `${CONV_KEY_PREFIX}${principalText2}:${convId}`;
              try {
                await dbSet(dbKeyToRemove, null);
                console.log(
                  `[E2EE KEYSTORE] Removed corrupted lazy key for ${dbKeyToRemove} — will re-derive`,
                );
              } catch {
                /* best effort */
              }
            }
            setMissingKeyConvIds((prev) => {
              const next = new Set(prev);
              next.add(convId);
              return next;
            });
            return null;
          }
        })();
        keyLoadingPromises.current.set(convId, loadPromise);
        key = (await loadPromise) ?? undefined;
        keyLoadingPromises.current.delete(convId);
      }

      if (!key) {
        // Check if a load is already in flight for this convId
        const existingLoad = keyLoadingPromises.current.get(convId);
        if (existingLoad) {
          console.log(
            `[E2EE] Waiting for in-flight key load for convId=${convId}`,
          );
          const loadedKey = await existingLoad;
          if (loadedKey) {
            console.log(`[E2EE] In-flight load succeeded for convId=${convId}`);
            return decryptMessage(loadedKey, blob);
          }
        }
        console.log(
          `[E2EE KEYSTORE] No stored key for convId=${convId} — performing exchange`,
        );
        // Prevent re-triggering exchange if key already exists or is being derived
        if (convKeys.current.has(convId)) {
          console.log(
            `[E2EE] Key already in memory for convId=${convId}, skipping exchange trigger`,
          );
          return null;
        }
        if (
          derivingConvIds.current.has(convId) ||
          rekeyInProgress.current.has(convId)
        ) {
          console.log(
            `[E2EE] Key derivation/rekey already in progress for convId=${convId}, skipping exchange trigger`,
          );
          return null;
        }
        setMissingKeyConvIds((prev) => {
          const next = new Set(prev);
          next.add(convId);
          return next;
        });
        return null;
      }

      const keyFpPre = await getKeyFingerprint(key).catch(() => "unknown");
      console.log(
        `[E2EE RECV] Attempting decrypt with key fingerprint=${keyFpPre} for blob len=${clean.length}, convId=${convId}`,
      );

      // ── STEP 4: Attempt decryption (max 3 tries, 100 ms apart) ────────────
      // decryptMessage now handles prefix-skipping internally for Candid blobs.
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const keyFp = await getKeyFingerprint(key).catch(() => "unknown");
          console.log(
            `[E2EE DECRYPT] decryptFromConv attempt=${attempt}/3: total=${clean.length}, keyFp=${keyFp}, convId=${convId}`,
          );
          const result = await decryptMessage(key, clean);
          if (result !== null) {
            if (attempt > 1) {
              console.log(
                `[E2EE DECRYPT] decryptFromConv succeeded on attempt ${attempt} for convId=${convId}`,
              );
            }
            return result;
          }
          // decryptMessage returned null — all prefix skips and brute-force failed
          console.warn(
            `[E2EE DECRYPT] decryptFromConv attempt ${attempt}/3 returned null (all prefix skips 0-16 and brute-force attempted) for convId=${convId}`,
          );
        } catch (err) {
          const keyFp = await getKeyFingerprint(key).catch(() => "unknown");
          console.warn(
            `[E2EE DECRYPT] decryptFromConv FAILED (attempt ${attempt}/3) for convId=${convId}: blob=${clean.length} bytes, keyFp=${keyFp}`,
            err,
          );
        }
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      // Log hex prefix of the blob for diagnosis when all attempts fail
      const hexPrefix = Array.from(clean.slice(0, Math.min(clean.length, 64)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      console.error(
        `[E2EE DECRYPT] All 3 attempts failed for convId=${convId}. Blob len=${clean.length}, hexPrefix(64)=${hexPrefix}`,
      );

      // ── STEP 5a: Trigger rekey if not already in progress ────────────────
      // After all decryption attempts fail, automatically initiate a full
      // key re-exchange so both sides derive a fresh shared secret.
      if (!rekeyInProgress.current.has(convId)) {
        console.log(
          `[E2EE DECRYPT] Triggering automatic rekey for convId=${convId} after decrypt failure`,
        );
        // Fire-and-forget: rekeyConversation handles its own guard
        rekeyConversation(convId).catch(() => {
          /* best effort */
        });
      }

      // ── STEP 5: All 3 attempts failed — manual roundtrip test with stored key ──
      // Try encrypting a known plaintext with the SAME stored key and decrypting
      // it.  If this roundtrip also fails, the key itself is corrupt.
      const keyFpFinal = await getKeyFingerprint(key).catch(() => "unknown");
      let roundtripPassed = false;
      try {
        const testPlaintext = "__roundtrip_test__";
        const testBytes = new TextEncoder().encode(testPlaintext);
        const testBlob = await encryptMessage(key, testBytes);
        const testResult = await decryptMessage(key, testBlob);
        roundtripPassed = testResult === testPlaintext;
        console.log(
          `[E2EE DECRYPT] Manual roundtrip with stored key ${roundtripPassed ? "PASSED" : "FAILED"} for convId=${convId}, keyFp=${keyFpFinal}`,
        );
      } catch (rtErr) {
        console.error(
          `[E2EE DECRYPT] Manual roundtrip with stored key FAILED for convId=${convId}, keyFp=${keyFpFinal}:`,
          rtErr,
        );
      }

      // ── STEP 6: Distinguish bad blob vs corrupt key ──────────────────────
      // CRITICAL RULE: Only evict the key if exportKey FAILS (corrupt CryptoKey)
      // OR the manual roundtrip above also fails.
      // AES-GCM OperationError with a passing exportKey = bad blob format, NOT
      // a corrupt key. Evicting on OperationError causes endless re-derivation
      // loops because the NEXT message will fail the same way.
      let keyExportFailed = false;
      try {
        await crypto.subtle.exportKey("raw", key);
      } catch (exportErr) {
        keyExportFailed = true;
        console.error(
          `[E2EE DECRYPT] Key export test FAILED (keyFp=${keyFpFinal}, convId=${convId}) — CryptoKey is CORRUPT. Evicting and triggering re-derivation.`,
          exportErr,
        );
      }

      if (!keyExportFailed && roundtripPassed) {
        // exportKey PASSED and roundtrip PASSED → key object is valid;
        // the blob is unreadable (bad format, wrong sender key at time of
        // encryption, or network corruption).
        // Retain the key — do NOT evict from memory or IndexedDB.
        console.warn(
          `[E2EE DECRYPT] All prefix variants failed but key is healthy — marking message as unreadable. keyFp=${keyFpFinal}, convId=${convId}`,
        );
        // Do NOT clear the key. Do NOT mark convId as missing.
        // Return null so the UI shows "Decryption failed" for this message only.
        return null;
      }

      // exportKey FAILED or roundtrip FAILED → the CryptoKey itself is bad → full eviction.
      console.log(
        `[E2EE DECRYPT] Evicting corrupt key for convId=${convId} (exportTest=${keyExportFailed ? "FAILED" : "PASSED"}, roundtrip=${roundtripPassed ? "PASSED" : "FAILED"})`,
      );
      // Clear from memory
      convKeys.current.delete(convId);
      // Clear from ready state
      setKeyReadyConvIds((prev) => {
        const next = new Set(prev);
        next.delete(convId);
        return next;
      });
      // Clear from IndexedDB
      if (principal) {
        const dbKeyEvict = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
        dbSet(dbKeyEvict, null).catch(() => {
          /* best effort */
        });
      }
      // Mark as missing so ChatPage triggers re-derivation
      setMissingKeyConvIds((prev) => {
        const next = new Set(prev);
        next.add(convId);
        return next;
      });

      return null;
    },
    [principal],
  );

  const forceReDeriveKey = useCallback(
    async (convId: string) => {
      console.log(
        `[E2EE FORCE-REDERIVE] Clearing key for convId=${convId} from memory + IndexedDB — will re-derive on next peer key arrival`,
      );
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
   * 1. Clear the old conversation key from memory + IndexedDB.
   * 2. Export the current ECDH public key and publish it to the backend profile.
   * 3. Mark the conversation as missing so ChatPage triggers fresh re-derivation.
   * A rekeyInProgress guard prevents duplicate loops.
   */
  const rekeyConversation = useCallback(
    async (convId: string) => {
      if (!keyPair) {
        console.warn("[E2EE REKEY] keyPair not ready, waiting...");
        setTimeout(() => rekeyConversation(convId), 500);
        return;
      }
      if (!principal) {
        console.warn("[E2EE REKEY] principal not ready, waiting...");
        setTimeout(() => rekeyConversation(convId), 500);
        return;
      }
      if (rekeyInProgress.current.has(convId)) {
        console.log(
          `[E2EE REKEY] Skipping rekey for convId=${convId} — already in progress`,
        );
        return;
      }
      rekeyInProgress.current.add(convId);
      console.log(
        `[E2EE] Stale key detected — initiating rekey for convId=${convId}`,
      );

      try {
        // Step 1: forcefully clear the old key
        await forceReDeriveKey(convId);

        // Step 2: publish a fresh ECDH public key to the backend profile
        if (keyPair && principal) {
          try {
            const pubBytes = await exportPublicKey(keyPair.publicKey);
            const fp = Array.from(pubBytes.slice(0, 8))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            console.log(
              `[E2EE REKEY] Publishing fresh public key (fingerprint=${fp}) for convId=${convId}`,
            );
            await updateProfile.mutateAsync({
              ecdhPublicKey: pubBytes,
            });
            console.log(
              `[E2EE REKEY] Fresh public key published successfully for convId=${convId}`,
            );
          } catch (pubErr) {
            console.error(
              `[E2EE REKEY] Failed to publish fresh public key for convId=${convId}:`,
              pubErr,
            );
          }
        } else {
          console.warn(
            `[E2EE REKEY] Cannot publish public key — keyPair or principal missing for convId=${convId}`,
          );
        }
      } finally {
        rekeyInProgress.current.delete(convId);
      }
    },
    [forceReDeriveKey, keyPair, principal, updateProfile],
  );

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

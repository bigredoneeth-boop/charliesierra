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
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const { principal } = useAuth();
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
        persistConvKey(principal.toText(), convId, key).catch(() => {
          /* best effort */
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
        persistConvKey(
          principal.toText(),
          convId,
          key,
          memberFingerprint,
        ).catch(() => {
          /* best effort */
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
      console.log(
        `[E2EE] deriveAndStoreKey called for convId=${convId}, ownKey ready: ${!!keyPair?.privateKey}`,
      );
      derivingConvIds.current.add(convId);
      if (!keyPair?.privateKey) {
        console.log(
          `[E2EE] deriveAndStoreKey: own keyPair not ready for convId=${convId} — will not derive`,
        );
        derivingConvIds.current.delete(convId);
        return null;
      }
      try {
        const freshKeyBytes = toCleanUint8Array(theirPublicKeyBytes);
        const peerPubFp = Array.from(freshKeyBytes.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
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
          `[E2EE] deriveAndStoreKey: ECDH shared key derived, fingerprint=${sharedFp}, convId=${convId}`,
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
          persistConvKey(principal.toText(), convId, sharedKey).catch(() => {
            /* best effort */
          });
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
      console.log(`[E2EE ENCRYPT] convId=${convId} key present: ${!!key}`);
      if (!key) return null;
      try {
        // Encode plaintext to bytes, then delegate entirely to encryptMessage
        const plaintextBytes = new TextEncoder().encode(text);
        const blob = await encryptMessage(key, plaintextBytes);
        console.log(
          `[E2EE SEND] encryptForConv: full blob size = ${blob.length} bytes (byteOffset=${blob.byteOffset}), convId=${convId}`,
        );
        return blob;
      } catch {
        return null;
      }
    },
    [],
  );

  const decryptFromConv = useCallback(
    async (convId: string, blob: Uint8Array): Promise<string | null> => {
      let key = convKeys.current.get(convId);

      // If not in memory, try to load from IndexedDB before giving up
      if (!key && principal) {
        const principalText = principal.toText();
        const dbKey = `${CONV_KEY_PREFIX}${principalText}:${convId}`;
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
              // toCleanUint8Array handles number[] (IDB deserialization) and
              // any Uint8Array with non-zero byteOffset safely.
              const wrappedArr = toCleanUint8Array(
                (stored as { wrapped: number[]; fingerprint?: string }).wrapped,
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
              key = await importAESKey(rawBytes);
              convKeys.current.set(convId, key);
              if (fingerprint) {
                groupKeyFingerprints.current.set(convId, fingerprint);
              }
              const fpLog = fingerprint || "none";
              console.log(
                `[E2EE KEYSTORE] Loaded key for convId=${convId} (fingerprint=${fpLog})`,
              );
            }
          }
        } catch (err) {
          console.warn(
            `[E2EE KEYSTORE] Lazy load failed for convId=${convId}:`,
            err,
          );
          // Remove corrupted lazy-load entry so next load starts fresh
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
          // Signal missing key so ChatPage can trigger re-derivation
          setMissingKeyConvIds((prev) => {
            const next = new Set(prev);
            next.add(convId);
            return next;
          });
          return null;
        }
      }

      if (!key) {
        console.log(
          `[E2EE KEYSTORE] No stored key for convId=${convId} - performing exchange`,
        );
        // Signal missing key so ChatPage can trigger re-derivation
        setMissingKeyConvIds((prev) => {
          const next = new Set(prev);
          next.add(convId);
          return next;
        });
        return null;
      }

      // Delegate entirely to decryptMessage — it handles the fresh-copy internally
      console.log(
        `[E2EE RECV] decryptFromConv: blob=${blob.length} bytes (original byteOffset=${(blob as Uint8Array & { byteOffset?: number }).byteOffset ?? 0}), convId=${convId}`,
      );
      try {
        return await decryptMessage(key, blob);
      } catch (err) {
        const keyFp = await getKeyFingerprint(key).catch(() => "unknown");
        console.error(
          `[E2EE] decryptFromConv FAILED for convId=${convId}: blob=${blob.length} bytes, keyFp=${keyFp}`,
          err,
        );
        console.warn(
          `[E2EE KEYSTORE] Key fingerprint ${keyFp} does not match stored key — triggering re-exchange for convId=${convId}`,
        );
        // Smart eviction: test if the key object itself is valid before deleting
        // from IndexedDB. If the key can be exported successfully, the OperationError
        // was caused by a wrong payload (IV/ciphertext mismatch), NOT a corrupt key.
        // In that case we skip the IndexedDB delete but still trigger re-derivation
        // so ChatPage can re-exchange keys with the peer.
        let keyIsValid = false;
        try {
          await crypto.subtle.exportKey("raw", key);
          keyIsValid = true;
        } catch {
          // exportKey failed → CryptoKey object itself is corrupt → delete from IDB
        }

        if (keyIsValid) {
          console.log(
            `[E2EE EVICT] convId=${convId} — key export test passed (skipping IndexedDB delete, keeping key)`,
          );
          // Key object is still valid — the OperationError was caused by a
          // wrong payload (IV/ciphertext mismatch), NOT a corrupt key.
          // Do NOT delete from convKeys.current — that would break future sends.
          // Only clear the ready-state so ChatPage can trigger a re-exchange.
          console.log(
            `[E2EE] Key eviction triggered for convId=${convId} — keeping in-memory key, clearing ready state only`,
          );
          setKeyReadyConvIds((prev) => {
            const next = new Set(prev);
            next.delete(convId);
            return next;
          });
        } else {
          console.log(
            `[E2EE EVICT] convId=${convId} — key export test failed, evicting from IndexedDB`,
          );
          console.log(
            `[E2EE] Key eviction triggered for convId=${convId} — keeping in-memory key, clearing ready state only`,
          );
          // Key object is corrupt — evict from IndexedDB so it gets re-derived.
          // Still do NOT delete from convKeys.current so in-flight encrypts keep working.
          if (principal) {
            const dbKeyEvict = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
            dbSet(dbKeyEvict, null).catch(() => {
              /* best effort */
            });
          }
          setKeyReadyConvIds((prev) => {
            const next = new Set(prev);
            next.delete(convId);
            return next;
          });
        }
        setMissingKeyConvIds((prev) => {
          const next = new Set(prev);
          next.add(convId);
          return next;
        });
        return null;
      }
    },
    [principal],
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
        isKeyReady: (convId: string) =>
          keyReadyConvIds.has(convId) || convKeys.current.has(convId),
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

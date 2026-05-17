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
  /** True if the key pair was freshly generated this session (not loaded from IndexedDB). */
  isNewKeyPair: boolean;
  /** Reset isNewKeyPair to false after the public key has been published to the backend. */
  setIsNewKeyPair: (value: boolean) => void;
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
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const { principal } = useAuth();
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isNewKeyPair, setIsNewKeyPair] = useState(false);
  const convKeys = useRef<Map<string, CryptoKey>>(new Map());
  // Stores member fingerprints for group keys so stale-member detection survives page reloads.
  const groupKeyFingerprints = useRef<Map<string, string>>(new Map());

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
        if (fingerprint !== undefined) {
          // Store group key with fingerprint: wrap the raw bytes, store as { wrapped, fingerprint }
          await dbSet(dbKey, { wrapped: Array.from(wrapped), fingerprint });
        } else {
          // Store direct key: just the wrapped bytes array
          await dbSet(dbKey, { wrapped: Array.from(wrapped) });
        }
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
    loadOrCreateKeyPair(principalText)
      .then(async ({ keyPair: kp, isNew }) => {
        setKeyPair(kp);
        setIsNewKeyPair(isNew);
        if (isNew) {
          exportPublicKey(kp.publicKey).then((pubBytes) => {
            const fp = Array.from(pubBytes.slice(0, 8))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            console.log(
              `[E2EE KEYS] NEW key pair generated for ${principalText}. Public key fingerprint (first 8 bytes): ${fp}. Profile MUST be updated to publish this key before encrypted messages will work.`,
            );
          });
        }

        // ── Restore ALL persisted conversation keys from IndexedDB ──────────
        let restoredCount = 0;
        try {
          const prefix = `${CONV_KEY_PREFIX}${principalText}:`;
          const allDbKeys = await dbGetKeysWithPrefix(prefix);
          const wrapKey =
            allDbKeys.length > 0
              ? await deriveStorageWrapKey(principalText)
              : null;

          await Promise.all(
            allDbKeys.map(async (dbKey) => {
              const convId = dbKey.slice(prefix.length);
              try {
                const stored = await dbGet<
                  | { wrapped: number[]; fingerprint?: string }
                  | Uint8Array
                  | { raw: Uint8Array; fingerprint?: string }
                  | null
                >(dbKey);
                if (!stored) return;

                let rawBytes: Uint8Array | null = null;
                let fingerprint: string | undefined;

                if (stored instanceof Uint8Array) {
                  // Legacy format: unencrypted raw bytes
                  rawBytes = stored.slice(0);
                } else if (
                  Array.isArray((stored as { wrapped?: number[] }).wrapped)
                ) {
                  // New format: wrapped bytes stored as number array
                  const wrappedArr = new Uint8Array(
                    (stored as { wrapped: number[]; fingerprint?: string })
                      .wrapped,
                  );
                  if (wrapKey) {
                    rawBytes = await unwrapKeyBytes(wrapKey, wrappedArr);
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
                  rawBytes =
                    legacy.raw instanceof Uint8Array
                      ? legacy.raw.slice(0)
                      : new Uint8Array(
                          Object.values(
                            legacy.raw as unknown as Record<string, number>,
                          ),
                        );
                  fingerprint = legacy.fingerprint;
                }

                if (!rawBytes || rawBytes.length === 0) return;

                const cryptoKey = await importAESKey(rawBytes);
                convKeys.current.set(convId, cryptoKey);
                if (fingerprint) {
                  groupKeyFingerprints.current.set(convId, fingerprint);
                }
                restoredCount++;
                console.log(
                  `[E2EE KEYSTORE] Restored key for convId=${convId}`,
                );
              } catch (err) {
                console.warn(
                  `[E2EE KEYSTORE] Failed to restore key for convId=${convId}:`,
                  err,
                );
              }
            }),
          );
          console.log(
            `[E2EE KEYSTORE] Loaded ${restoredCount} conversation keys from storage`,
          );
        } catch (err) {
          console.warn("[E2EE KEYSTORE] Error during key restore:", err);
        }

        setIsReady(true);
      })
      .catch(() => {
        setIsReady(true);
      });
  }, [principal]);

  const getConversationKey = useCallback(
    (convId: string) => convKeys.current.get(convId),
    [],
  );

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
      if (!keyPair?.privateKey) {
        console.error(
          `[E2EE] deriveAndStoreKey: no local privateKey for convId=${convId}`,
        );
        return null;
      }
      try {
        const freshKeyBytes = new Uint8Array(theirPublicKeyBytes.length);
        for (let i = 0; i < theirPublicKeyBytes.length; i++) {
          freshKeyBytes[i] = theirPublicKeyBytes[i];
        }
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
      }
    },
    [keyPair, principal, persistConvKey],
  );

  const encryptForConv = useCallback(
    async (convId: string, text: string): Promise<Uint8Array | null> => {
      const key = convKeys.current.get(convId);
      if (!key) return null;
      try {
        return await encryptMessage(key, text);
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
            if (stored instanceof Uint8Array) {
              rawBytes = stored.slice(0);
            } else if (
              Array.isArray((stored as { wrapped?: number[] }).wrapped)
            ) {
              const wrapKey = await deriveStorageWrapKey(principalText);
              const wrappedArr = new Uint8Array(
                (stored as { wrapped: number[]; fingerprint?: string }).wrapped,
              );
              rawBytes = await unwrapKeyBytes(wrapKey, wrappedArr);
            } else if ((stored as { raw?: Uint8Array }).raw) {
              const legacy = stored as { raw: Uint8Array };
              rawBytes =
                legacy.raw instanceof Uint8Array
                  ? legacy.raw.slice(0)
                  : new Uint8Array(
                      Object.values(
                        legacy.raw as unknown as Record<string, number>,
                      ),
                    );
            }
            if (rawBytes && rawBytes.length > 0) {
              key = await importAESKey(rawBytes);
              convKeys.current.set(convId, key);
              console.log(
                `[E2EE KEYSTORE] Restored key for convId=${convId} (lazy load)`,
              );
            }
          }
        } catch (err) {
          console.warn(
            `[E2EE KEYSTORE] Lazy load failed for convId=${convId}:`,
            err,
          );
        }
      }

      if (!key) {
        console.error(
          `[E2EE KEYSTORE] Key missing for convId=${convId}, falling back to key exchange`,
        );
        return null;
      }

      const fresh = new Uint8Array(blob.length);
      for (let i = 0; i < blob.length; i++) fresh[i] = blob[i];
      console.log(
        `[E2EE RECV] Received blob length=${fresh.length} bytes (original byteOffset=${(blob as Uint8Array & { byteOffset?: number }).byteOffset ?? 0}), copied to fresh buffer, convId=${convId}`,
      );
      try {
        return await decryptMessage(key, fresh);
      } catch (err) {
        const keyFp = await getKeyFingerprint(key).catch(() => "unknown");
        console.error(
          `[E2EE] decryptFromConv FAILED for convId=${convId}: blob=${fresh.length} bytes, keyFp=${keyFp}`,
          err,
        );
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
        isNewKeyPair,
        setIsNewKeyPair,
        getConversationKey,
        setConversationKey,
        setGroupConversationKey,
        clearConversationKey,
        getGroupKeyFingerprint,
        deriveAndStoreKey,
        encryptForConv,
        decryptFromConv,
        decryptOwnDisplayName,
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

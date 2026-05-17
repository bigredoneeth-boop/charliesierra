import {
  CONV_KEY_PREFIX,
  dbGet,
  dbGetKeysWithPrefix,
  dbSet,
  decryptMessage,
  deriveDisplayNameKey,
  deriveSharedSecret,
  encryptMessage,
  exportKey,
  exportPublicKey,
  getKeyFingerprint,
  importAESKey,
  importPublicKey,
  loadOrCreateKeyPair,
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

  // Load ECDH keypair + restore any persisted conversation keys from IndexedDB
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
          // A brand-new key pair was generated. Log a fingerprint so we can
          // verify the profile update went through with the matching public key.
          exportPublicKey(kp.publicKey).then((pubBytes) => {
            const fp = Array.from(pubBytes.slice(0, 8))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            console.log(
              `[E2EE KEYS] NEW key pair generated for ${principalText}. Public key fingerprint (first 8 bytes): ${fp}. Profile MUST be updated to publish this key before encrypted messages will work.`,
            );
          });
        }
        // Restore persisted group conversation keys from IndexedDB.
        // NOTE: ECDH-derived direct-chat keys are non-extractable and cannot be
        // persisted — they are always re-derived from the peer's profile on load.
        // Only group keys (AES, extractable) are persisted here.
        try {
          const prefix = `${CONV_KEY_PREFIX}${principalText}:`;
          const allKeys = await dbGetKeysWithPrefix(prefix);
          await Promise.all(
            allKeys.map(async (dbKey) => {
              const convId = dbKey.slice(prefix.length);
              const stored = await dbGet<
                Uint8Array | { raw: Uint8Array; fingerprint: string } | null
              >(dbKey);
              if (!stored) return;
              const rawBytes =
                stored instanceof Uint8Array
                  ? stored
                  : (stored as { raw: Uint8Array }).raw;
              if (!rawBytes) return;
              const cryptoKey = await importAESKey(rawBytes);
              convKeys.current.set(convId, cryptoKey);
              // Restore group key fingerprint if present
              if (
                !(stored instanceof Uint8Array) &&
                (stored as { fingerprint?: string }).fingerprint
              ) {
                groupKeyFingerprints.current.set(
                  convId,
                  (stored as { raw: Uint8Array; fingerprint: string })
                    .fingerprint,
                );
              }
            }),
          );
        } catch {
          // Best-effort — missing persisted keys will be re-derived when chat is opened
        }
        setIsReady(true);
      })
      .catch(() => {
        // Key load failed — still mark ready so the app isn't stuck forever.
        // The keypair will be null, which crypto operations gracefully handle.
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
      // Persist the key to IndexedDB so it survives page reloads
      if (principal) {
        const dbKey = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
        exportKey(key)
          .then((raw) => dbSet(dbKey, raw))
          .catch(() => {
            /* best effort */
          });
      }
    },
    [principal],
  );

  const setGroupConversationKey = useCallback(
    (convId: string, key: CryptoKey, memberFingerprint: string) => {
      convKeys.current.set(convId, key);
      groupKeyFingerprints.current.set(convId, memberFingerprint);
      if (principal) {
        const dbKey = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
        exportKey(key)
          .then((raw) => dbSet(dbKey, { raw, fingerprint: memberFingerprint }))
          .catch(() => {
            /* best effort */
          });
      }
    },
    [principal],
  );

  const getGroupKeyFingerprint = useCallback(
    (convId: string) => groupKeyFingerprints.current.get(convId),
    [],
  );

  const clearConversationKey = useCallback(
    (convId: string) => {
      convKeys.current.delete(convId);
      groupKeyFingerprints.current.delete(convId);
      // Also evict from IndexedDB so a page reload doesn't restore the stale key
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
        // CRITICAL FIX: element-by-element copy is the ONLY guaranteed way to
        // produce a Uint8Array with byteOffset===0. ArrayBuffer.slice() (even when
        // called with correct start/end offsets) can still return a view backed by
        // the original Candid transport buffer in some V8 builds, causing WebCrypto
        // to import bytes starting at the wrong position and derive a completely
        // different ECDH shared secret on sender vs receiver.
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
        // Validate the imported key is an ECDH P-256 public key before deriving.
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
        // Log our own public key fingerprint so we can compare with what's in the profile
        const myPubBytes = await exportPublicKey(keyPair.publicKey);
        const myPubFp = Array.from(myPubBytes.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.log(
          `[E2EE] deriveAndStoreKey: my public key fingerprint(first8)=${myPubFp}, peer fingerprint(first8)=${peerPubFp}, convId=${convId}`,
        );
        // deriveSharedSecret now uses deriveBits(32 bytes) → importAESKey so
        // both sides produce the same extractable AES-GCM key.
        const sharedKey = await deriveSharedSecret(
          keyPair.privateKey,
          theirKey,
        );
        const sharedFp = await getKeyFingerprint(sharedKey);
        console.log(
          `[E2EE] deriveAndStoreKey: ECDH shared key derived, fingerprint=${sharedFp}, convId=${convId}`,
        );
        convKeys.current.set(convId, sharedKey);
        // Persist the shared key to IndexedDB so it survives page reloads.
        // The key is now extractable (importAESKey uses extractable:false by default
        // but we need extractable:true for persistence — update importAESKey).
        if (principal) {
          const dbKey = `${CONV_KEY_PREFIX}${principal.toText()}:${convId}`;
          exportKey(sharedKey)
            .then((raw) => dbSet(dbKey, raw))
            .catch(() => {
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
    [keyPair, principal],
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
      const key = convKeys.current.get(convId);
      if (!key) {
        console.error(
          `[E2EE] decryptFromConv: no conversation key in cache for convId=${convId}`,
        );
        return null;
      }
      // CRITICAL: copy ALL bytes element-by-element into a fully-owned fresh
      // Uint8Array. This is the ONLY safe pattern — .buffer.slice() can still
      // produce a view with a non-zero byteOffset in some JS engines.
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
    [],
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

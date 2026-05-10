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
  const convKeys = useRef<Map<string, CryptoKey>>(new Map());
  // Stores member fingerprints for group keys so stale-member detection survives page reloads.
  const groupKeyFingerprints = useRef<Map<string, string>>(new Map());

  // Load ECDH keypair + restore any persisted conversation keys from IndexedDB
  useEffect(() => {
    if (!principal) {
      setKeyPair(null);
      setIsReady(false);
      convKeys.current.clear();
      groupKeyFingerprints.current.clear();
      return;
    }
    const principalText = principal.toText();
    loadOrCreateKeyPair(principalText)
      .then(async (kp) => {
        setKeyPair(kp);
        // Restore all persisted conversation keys for this principal.
        // Each entry is stored as either a raw Uint8Array (direct-chat ECDH key
        // exported bytes) or an object { raw: Uint8Array, fingerprint: string }
        // (group key with member fingerprint).
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
      .catch(() => setIsReady(false));
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
      if (!keyPair?.privateKey) return null;
      try {
        const theirKey = await importPublicKey(theirPublicKeyBytes);
        const sharedKey = await deriveSharedSecret(
          keyPair.privateKey,
          theirKey,
        );
        convKeys.current.set(convId, sharedKey);
        // NOTE: ECDH-derived keys are non-extractable (exportable: false) so we
        // cannot persist them directly. They are cheap to re-derive on reload
        // from the peer profile, so we skip persisting them here.
        return sharedKey;
      } catch {
        return null;
      }
    },
    [keyPair],
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
      if (!key) return null;
      try {
        return await decryptMessage(key, blob);
      } catch {
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
